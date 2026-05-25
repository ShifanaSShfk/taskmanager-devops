variable "aws_region" {
  description = "Target region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "dev, staging, or prod"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Must be dev, staging, or prod."
  }
}

variable "app_name" {
  type    = string
  default = "taskmanager"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "db_name" {
  type    = string
  default = "taskmanager"
}

variable "db_username" {
  type    = string
  default = "postgres"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "ssh_public_key" {
  type    = string
  default = "ssh-rsa placeholder"
}

variable "allowed_cidr" {
  type    = string
  default = "0.0.0.0/0"
}