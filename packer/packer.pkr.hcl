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
    inline = [
      "sudo groupadd csye6225",
      "sudo useradd -g csye6225 -s /usr/sbin/nologin csye6225"
      "sudo mkdir -p /opt/app/",
      "sudo chown -R csye6225:csye6225 /opt/app/",
      "sudo chmod -R 755 /opt/app/"
    ]

    // scripts = [
    //   "packer/scripts/mysql-install.sh",
    //   "packer/scripts/node-install.sh",
    //   "packer/scripts/unzip-install.sh",
    // ]
  }

  provisioner "file" {
    source      = "webapp-artifact.zip"
    destination = "/opt/app/webapp-artifact.zip"
  }

  // provisioner "shell" {
  //   inline = [
  //     "sudo unzip /opt/app/webapp-artifact.zip -d /opt/app/",
  //     "sudo chown -R csye6225:csye6225 /opt/app/webapp-artifact"
  //   ]
  // }
}