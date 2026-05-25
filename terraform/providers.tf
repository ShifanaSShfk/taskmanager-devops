# Uses only built-in providers — no cloud account needed.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    # null_resource — simulates resources with no real API
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    # local — creates real files on your machine
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}