output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "ALB DNS name (API endpoint)"
}

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.frontend.domain_name
  description = "CloudFront domain (frontend + API)"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.api.repository_url
  description = "ECR repository URL for API image"
}

output "rds_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "RDS PostgreSQL endpoint"
}

output "s3_uploads_bucket" {
  value       = aws_s3_bucket.uploads.id
  description = "S3 bucket for document uploads"
}

output "s3_frontend_bucket" {
  value       = aws_s3_bucket.frontend.id
  description = "S3 bucket for frontend assets"
}

output "efs_file_system_id" {
  value       = aws_efs_file_system.chroma.id
  description = "EFS filesystem ID for ChromaDB"
}

output "api_url" {
  value       = "http://${aws_lb.main.dns_name}"
  description = "API base URL via ALB"
}

output "frontend_url" {
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
  description = "Frontend URL via CloudFront"
}
