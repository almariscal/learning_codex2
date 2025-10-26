terraform {
  required_version = ">= 1.5.0"

  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.aws_region

  dynamic "assume_role" {
    for_each = var.aws_infra_role_arn == "" ? [] : [var.aws_infra_role_arn]
    content {
      role_arn = assume_role.value
    }
  }

  default_tags {
    tags = local.default_tags
  }
}
