packer {
  required_plugins {
    googlecompute = {
      source  = "github.com/hashicorp/googlecompute"
      version = "~> 1"
    }
  }
}

variable "credentials_file" {}
variable "project_id" {}

source "googlecompute" "packer-image" {
  project_id       = var.project_id
  source_image     = "centos-stream-8-v20240110"
  zone             = "us-east1-b"
  ssh_username     = "packer-image"
  image_name       = "packer-image-centos-8"
  credentials_file = var.credentials_file
  network          = "default"
}

build {
  sources = ["source.googlecompute.packer-image"]

  provisioner "shell" {
    scripts = [
      "packer/scripts/mysql-install.sh",
      "packer/scripts/node-install.sh"
    ]
  }

  provisioner "file" {
    source      = "webapp-artifact.zip"
    destination = "/opt/app/webapp-artifact.zip"
  }
}