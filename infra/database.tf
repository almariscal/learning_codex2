resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db"
  subnet_ids = [for subnet in aws_subnet.public : subnet.id]
}

resource "aws_db_instance" "postgres" {
  identifier              = "${local.name_prefix}-pg"
  engine                  = "postgres"
  engine_version          = "15.4"
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  db_name                 = replace(var.project_slug, "-", "")
  username                = var.db_username
  password                = var.db_password
  publicly_accessible     = true
  storage_encrypted       = true
  vpc_security_group_ids  = [aws_security_group.database.id]
  db_subnet_group_name    = aws_db_subnet_group.main.name
  backup_retention_period = 7
  copy_tags_to_snapshot   = true
  deletion_protection     = false
  skip_final_snapshot     = var.db_skip_final_snapshot
  auto_minor_version_upgrade = true
  apply_immediately          = true
}
