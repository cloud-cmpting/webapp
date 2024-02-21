#!/bin/bash

sudo sh -c  'cat << EOF > /etc/systemd/system/webapp.service
[Unit]
After=network.target

[Service]
Environment=MYSQL_HOST='$MYSQL_HOST'
Environment=MYSQL_USER='$MYSQL_USER'
Environment=MYSQL_PASSWORD='$MYSQL_PASSWORD'
Environment=MYSQL_DATABASE='$MYSQL_DATABASE'
Type=simple
User=csye6225
Group=csye6225
ExecStart=/usr/bin/node /opt/app/app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF'

sudo systemctl daemon-reload
sudo systemctl start webapp
sudo systemctl enable webapp
