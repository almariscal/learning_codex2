locals {
  name_prefix   = "${var.project_slug}-${var.environment}"
  default_tags = merge({
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }, var.tags)
}
