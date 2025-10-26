output "frontend_bucket" {
  description = "Name of the S3 bucket hosting the frontend."
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "backend_public_dns" {
  description = "Public DNS name of the backend EC2 instance."
  value       = aws_instance.backend.public_dns
}

output "backend_public_ip" {
  description = "Public IP address of the backend EC2 instance."
  value       = aws_instance.backend.public_ip
}

output "database_endpoint" {
  description = "PostgreSQL database endpoint."
  value       = aws_db_instance.postgres.address
}

output "database_name" {
  description = "PostgreSQL database name."
  value       = aws_db_instance.postgres.db_name
}

output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito web client."
  value       = aws_cognito_user_pool_client.web.id
}

output "cognito_domain" {
  description = "Fully qualified Cognito Hosted UI domain."
  value       = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}
