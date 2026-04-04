variable "aws_region" {
  default = "ap-south-1"
}

variable "project_name" {
  default = "pagepilot"
}

variable "environment" {
  default = "prod"
}

variable "db_username" {
  default   = "pagepilot"
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "openai_api_key" {
  type      = string
  sensitive = true
}

variable "db_instance_class" {
  default = "db.t3.micro"
}

variable "api_cpu" {
  default = 2048
}

variable "api_memory" {
  default = 8192
}

variable "api_desired_count" {
  default = 1
}
