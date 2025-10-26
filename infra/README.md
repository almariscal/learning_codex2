# AWS Infrastructure

This directory contains Terraform code that provisions the AWS infrastructure required to host the Parking Allocator application. It builds:

- A VPC with public subnets, routing and security groups.
- An EC2 instance running the backend container image.
- A PostgreSQL RDS instance consumed by the backend service.
- An S3 bucket fronted by CloudFront for the static frontend with SPA-friendly error handling.
- An Amazon Cognito User Pool with a hosted UI domain and web client configuration.

## Prerequisites

1. Terraform >= 1.5.0 installed locally or available in your CI runners.
2. AWS credentials that can assume the infrastructure role exported as environment variables. The repository expects:

   ```bash
   export AWS_REGION=<region>
   export AWS_INFRA_ROLE_ARN=<role used by Terraform>
   export AWS_BUILD_ROLE_ARN=<role used by CI builds>
   export DB_PASSWORD=<database password>
   export TF_STATE_BUCKET=<remote state bucket>
   export TF_LOCK_TABLE=<dynamodb lock table>
   export TF_STATE_KEY=<remote state key>
   ```

3. A container image for the backend stored in a registry reachable from AWS (e.g. Amazon ECR). Note the full image URI as it is required when applying the stack.

The `AWS_BUILD_ROLE_ARN` secret is used by CI pipelines to build and push container artefacts and is documented here for completeness.

## Remote state

The `terraform` block declares an S3 backend but does not pin configuration. Initialise the project by providing backend settings via CLI flags or environment variables, for example:

```bash
terraform init \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="dynamodb_table=${TF_LOCK_TABLE}" \
  -backend-config="key=${TF_STATE_KEY}" \
  -backend-config="region=${AWS_REGION}"
```

When the GitHub Actions workflow runs, the value supplied through the `TF_STATE_KEY` secret is automatically expanded with the current Terraform environment name unless it already contains one of the placeholders `{env}`, `{ENV}` or `{environment}`. This keeps the remote state objects isolated per environment without hard-coding multiple secrets.

## Configuration

The most important variables are listed below. Override them using a `.tfvars` file or `-var` CLI flags.

| Variable | Description |
| --- | --- |
| `aws_region` | AWS region for all resources. |
| `aws_infra_role_arn` | Role assumed by Terraform when applying (leave empty to use the caller credentials). |
| `environment` | Environment identifier (e.g. `dev`, `staging`, `prod`). |
| `allowed_ssh_cidr` | CIDR allowed to connect to the EC2 instance over SSH (empty to disable). |
| `backend_container_image` | Container image URI for the backend API. |
| `backend_environment` | Extra environment variables for the backend container. |
| `backend_instance_type` | EC2 instance type used for the backend server. |
| `db_password` | Master password for the PostgreSQL database. |
| `db_username` | Master username for the PostgreSQL database. |
| `db_instance_class` | Instance class for the PostgreSQL database. |
| `db_skip_final_snapshot` | Skip the final snapshot when the database is destroyed. |
| `cognito_domain_prefix` | Unique prefix for the Cognito hosted UI. |
| `cognito_callback_urls` | Allowed OAuth redirect URIs for the frontend application. |
| `cognito_logout_urls` | Allowed logout URLs for the frontend application. |

Create a file such as `dev.tfvars`:

```hcl
aws_region              = "eu-west-1"
environment             = "dev"
aws_infra_role_arn      = "arn:aws:iam::123456789012:role/parking-infra"
backend_container_image = "123456789012.dkr.ecr.eu-west-1.amazonaws.com/parking-backend:latest"
db_password             = "super-secret-password"
cognito_domain_prefix   = "parking-dev-demo"
cognito_callback_urls   = ["https://your-frontend-domain.example.com/callback"]
cognito_logout_urls     = ["https://your-frontend-domain.example.com/logout"]
backend_environment = {
  RUN_MIGRATIONS = "true"
  SEED_DATA      = "false"
}
```

> **Note:** Replace the placeholder values with the actual secrets or reference them from your secret manager/CI system.

## Applying the stack

```bash
terraform init
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```

You can keep secrets out of version control by exporting them before running Terraform and referencing them with `-var` flags, e.g. `terraform apply -var-file=dev.tfvars -var db_password=$DB_PASSWORD`.

After the apply completes, Terraform will output the CloudFront domain for the frontend, the backend public endpoint and Cognito identifiers.

## Deploying application artefacts

1. **Frontend** – Build the Vite application and upload the artefacts to the provisioned S3 bucket:

   ```bash
   npm install
   npm run build
   aws s3 sync frontend/dist s3://$(terraform output -raw frontend_bucket) --delete
   ```

2. **Backend** – Build and push the backend Docker image before applying Terraform so the EC2 user data can pull it:

   ```bash
   docker build -t parking-backend:latest backend
   aws ecr get-login-password | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
   docker tag parking-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/parking-backend:latest
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/parking-backend:latest
   ```

   The EC2 instance is created with an IAM role that grants read-only access to pull the image and automatically starts the container on port 80.
   If the image registry is Amazon ECR, the bootstrapping script logs in automatically before pulling the image.

3. **Database migrations** – Because the backend container receives the `DATABASE_URL` environment variable pointing to the RDS instance, enable automatic migrations by setting `RUN_MIGRATIONS="true"` in `backend_environment`.

## GitHub Actions deployment pipeline

The CI/CD setup is split across three workflows under `.github/workflows/` so each stage can run independently when needed:

1. **`plan.yml`** – Runs a Terraform plan against the requested environment. Triggered automatically on pushes to `dev` and available for manual runs with custom inputs.
2. **`deploy-backend.yml`** – Builds and pushes the backend Docker image, then applies the Terraform stack with the new image URI. It runs on pull requests targeting `main` (excluding drafts) and can also be launched manually for any environment.
3. **`deploy-frontend.yml`** – Builds the Vite application and uploads the artefacts to S3, issuing an optional CloudFront invalidation. It is invoked automatically after a successful backend deployment and exposed as a manual job for ad-hoc redeploys or cache refreshes.

Each workflow accepts the same environment naming conventions: the branch base (`dev`, `main`, etc.) is used by default, and the `environment` input lets you override it for manual runs.

### Triggers and manual runs

- Pushes to the `dev` branch execute the **Terraform Plan** workflow.
- Pull requests against `main` build the backend image, apply Terraform and, upon success, trigger the frontend deployment through a `workflow_run` event.
- Any of the three workflows can be launched manually from the Actions tab. Supply `environment` (for example `dev` or `main`) and, when relevant, overrides such as `backend-ecr-repository`, `image-tag` or custom CloudFront invalidation paths.

### Required GitHub secrets

Configure the following repository secrets so the workflows can authenticate and access remote state:

| Secret | Purpose |
| --- | --- |
| `AWS_REGION` | AWS region for both Terraform and SDK commands. |
| `AWS_BUILD_ROLE_ARN` | IAM role assumed to build/push artefacts and upload the frontend. |
| `AWS_INFRA_ROLE_ARN` | IAM role assumed by Terraform to apply infrastructure. |
| `DB_PASSWORD` | Injected as `TF_VAR_db_password`. |
| `TF_STATE_BUCKET` | Remote state S3 bucket name. |
| `TF_STATE_KEY` | Remote state object key. |
| `TF_LOCK_TABLE` | DynamoDB table used for state locking. |

### Optional repository variables and workflow inputs

| Name | Type | Consumed by | Description |
| --- | --- | --- | --- |
| `BACKEND_ECR_REPOSITORY` | Repository variable | Plan & Deploy Backend | Default ECR repository name (e.g. `parking-backend`). |
| `TF_VAR_COGNITO_DOMAIN_PREFIX` | Repository variable | Plan & Deploy Backend | Base domain prefix for Cognito. Fallback defaults to `parking-<environment>`. |
| `TF_VAR_BACKEND_ENVIRONMENT` | Repository variable | Plan & Deploy Backend | JSON map for extra backend environment variables. Supply via the `backend-environment-json` input for overrides. |
| `TF_VAR_ALLOWED_SSH_CIDR` | Repository variable | Plan & Deploy Backend | Optional CIDR opened for SSH into the EC2 instance. |
| `backend-ecr-repository` | Workflow input | Plan & Deploy Backend | Override of the ECR repository for a single run. |
| `image-tag` | Workflow input | Plan & Deploy Backend | Custom Docker tag (defaults to the commit SHA). |
| `backend-environment-json` | Workflow input | Plan & Deploy Backend | Per-run JSON map overriding `TF_VAR_BACKEND_ENVIRONMENT`. |
| `allow-ssh-cidr` | Workflow input | Plan & Deploy Backend | Per-run override for the SSH CIDR. |
| `cognito-domain-prefix` | Workflow input | Plan & Deploy Backend | Override the Cognito hosted UI domain prefix. |
| `cloudfront-invalidation-paths` | Workflow input | Deploy Frontend | Paths invalidated after uploading the frontend. Defaults to `/*`. |

The backend workflow publishes the full set of Terraform outputs as an artifact, while the frontend workflow reads the `frontend_bucket` and `cloudfront_distribution_id` values directly from remote state to target the correct distribution.

## Destroying the stack

Run `terraform destroy -var-file=dev.tfvars`. Be mindful of the `db_skip_final_snapshot` flag which defaults to `false` to keep your data safe. Set it to `true` if you prefer to skip the snapshot on destroy.

## Next steps

- Configure a custom domain and ACM certificate for the CloudFront distribution once you own a DNS zone.
- Tighten security groups when the traffic pattern is known (for example, allow the backend only from CloudFront or a load balancer).
- Integrate the Cognito hosted domain and client IDs into the frontend configuration.
