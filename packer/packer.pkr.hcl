packer {
  required_plugins {
    googlecompute = {
      source  = "github.com/hashicorp/googlecompute"
      version = "~> 1"
    }
  }
}

variable "credentials_file" {}

source "googlecompute" "packer-image" {
  project_id       = "cloud--dev"
  source_image     = "centos-stream-8-v20240110"
  zone             = "us-east1-b"
  ssh_username     = "packer-image"
  image_name       = "packer-centos-8-2"
  credentials_file = var.credentials_file
}

build {
  sources = ["source.googlecompute.packer-image"]

  provisioner "shell" {
    scripts = [
      "packer/scripts/mysql-install.sh",
      "packer/scripts/node-install.sh"
    ]
  }
}