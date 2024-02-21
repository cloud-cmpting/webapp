#!/bin/bash

sudo dnf -y install mysql-server
sudo systemctl start mysqld.service
sudo systemctl enable mysqld

mysql -u root <<-EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';
FLUSH PRIVILEGES;
CREATE DATABASE $MYSQL_DATABASE;
exit;
EOF