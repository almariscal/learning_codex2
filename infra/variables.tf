variable "project_name" {
  description = "Human readable project name used for tagging."
  type        = string
  default     = "Parking Allocator"
}

variable "project_slug" {
  description = "Lowercase slug used to build resource names."
  type        = string
  default     = "parking-allocator"
}

variable "environment" {
  description = "Deployment environment identifier (e.g. dev, prod)."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region where the stack will be created."
  type        = string
  default     = "eu-west-1"
}

variable "aws_infra_role_arn" {
  description = "Role ARN that Terraform should assume when applying infrastructure changes."
  type        = string
  default     = ""
}

variable "vpc_cidr" {
  description = "CIDR block for the application VPC."
  type        = string
  default     = "10.10.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Map of availability zone suffix to CIDR for public subnets."
  type        = map(string)
  default = {
    a = "10.10.10.0/24"
    b = "10.10.20.0/24"
  }
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to access the EC2 instance over SSH. Leave empty string to disable SSH access."
  type        = string
  default     = ""
}

variable "backend_instance_type" {
  description = "EC2 instance type for the backend server."
  type        = string
  default     = "t3.micro"
}

variable "backend_container_image" {
  description = "Fully qualified container image URI for the backend API."
  type        = string
}

variable "backend_environment" {
  description = "Map of environment variables injected into the backend container."
  type        = map(string)
  default     = {}
}

variable "db_username" {
  description = "Database master username for the PostgreSQL instance."
  type        = string
  default     = "appuser"
}

variable "db_password" {
  description = "Database master password for the PostgreSQL instance."
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  description = "Allocated storage for the PostgreSQL database (GiB)."
  type        = number
  default     = 20
}

variable "db_instance_class" {
  description = "Instance class for the PostgreSQL database."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_skip_final_snapshot" {
  description = "Skip the final snapshot when destroying the database."
  type        = bool
  default     = false
}

variable "cognito_domain_prefix" {
  description = "Unique domain prefix for the Cognito Hosted UI."
  type        = string
}

variable "cognito_callback_urls" {
  description = "List of allowed OAuth callback URLs for the Cognito web client."
  type        = list(string)
  default     = ["http://localhost:5173/callback"]
}

variable "cognito_logout_urls" {
  description = "List of allowed logout URLs for the Cognito web client."
  type        = list(string)
  default     = ["http://localhost:5173/logout"]
}

variable "frontend_price_class" {
  description = "CloudFront price class to control edge locations used for the distribution."
  type        = string
  default     = "PriceClass_100"
}

variable "tags" {
  description = "Additional tags to apply to all resources."
  type        = map(string)
  default     = {}
}
