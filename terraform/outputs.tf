output "app_server_ip" {
  value = "localhost"
}

output "app_url" {
  value = "http://localhost:3000/health"
}

output "env_file_path" {
  value = abspath("${path.module}/../.env.terraform")
}

output "ansible_inventory_path" {
  value = abspath("${path.module}/../ansible/inventory.ini")
}

output "summary" {
  value = <<-EOT
    ============================================
    Terraform apply complete!
    Environment : ${var.environment}
    App name    : ${var.app_name}
    DB name     : ${var.db_name}
    Region      : ${var.aws_region}
    ============================================
  EOT
}