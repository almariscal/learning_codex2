resource "aws_iam_role" "backend" {
  name = "${local.name_prefix}-backend"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ecr" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "backend" {
  name = "${local.name_prefix}-backend"
  role = aws_iam_role.backend.name
}

data "aws_ami" "amazon_linux" {
  most_recent = true

  owners = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

locals {
  backend_environment_vars = merge(
    {
      DATABASE_URL = "postgresql+asyncpg://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:5432/${aws_db_instance.postgres.db_name}"
      API_PREFIX   = "/api"
      ENVIRONMENT  = var.environment
      DB_ECHO      = "False"
    },
    var.backend_environment
  )
}

resource "aws_instance" "backend" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.backend_instance_type
  subnet_id                   = aws_subnet.public[sort(keys(aws_subnet.public))[0]].id
  vpc_security_group_ids      = [aws_security_group.backend.id]
  iam_instance_profile        = aws_iam_instance_profile.backend.name
  associate_public_ip_address = true

  user_data = templatefile("${path.module}/templates/backend-user-data.sh.tftpl", {
    backend_image        = var.backend_container_image
    backend_environment  = local.backend_environment_vars
    aws_region           = var.aws_region
  })

  lifecycle {
    ignore_changes = [user_data]
  }

  root_block_device {
    volume_size = 16
    volume_type = "gp3"
  }

  tags = {
    Name = "${local.name_prefix}-backend"
  }
}
