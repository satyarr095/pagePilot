resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.project_name}-app-secrets"
  recovery_window_in_days = 0
  tags                    = local.tags
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    OPENAI_API_KEY   = var.openai_api_key
    DATABASE_URL     = "postgresql+asyncpg://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/pagepilot"
    DATABASE_URL_SYNC = "postgresql+psycopg2://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/pagepilot"
  })
}
