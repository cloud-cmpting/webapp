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
variable "MYSQL_DATABASE" {}
variable "MYSQL_PASSWORD" {}

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
    inline = [
      "sudo mkdir -p /opt/app/",
      "sudo chown -R packer-image:packer-image /opt/app",
      "sudo chmod -R 755 /opt/app",
    ]
  }

  provisioner "shell" {
    script = "packer/scripts/mysql-install.sh"
    environment_vars = [
      "MYSQL_DATABASE=${var.MYSQL_DATABASE}",
      "MYSQL_PASSWORD=${var.MYSQL_PASSWORD}"
    ]
  }

  provisioner "shell" {
    scripts = [
      "packer/scripts/node-install.sh",
      "packer/scripts/unzip-install.sh",
    ]
  }

  provisioner "file" {
    source      = "webapp-artifact.zip"
    destination = "/opt/app/webapp-artifact.zip"
  }

  provisioner "file" {
    source      = ".env"
    destination = "/opt/app/.env"
  }

  provisioner "shell" {
    inline = [
      "sudo groupadd csye6225",
      "sudo useradd -g csye6225 -s /usr/sbin/nologin csye6225",
      "sudo chown -R csye6225:csye6225 /opt/app",
      "sudo -u csye6225 unzip /opt/app/webapp-artifact.zip -d /opt/app/",
      "cd /opt/app/",
      "sudo -u csye6225 npm install"
    ]
  }

  provisioner "shell" {
    script = "packer/scripts/create-service-file.sh"
  }
}