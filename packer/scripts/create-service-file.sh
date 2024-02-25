#!/bin/bash

sudo sh -c  'cat << EOF > /etc/systemd/system/webapp.service
[Unit]
After=network.target

[Service]
EnvironmentFile=/opt/app/.env
Type=simple
User=csye6225
Group=csye6225
ExecStart=/usr/bin/node /opt/app/app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF'

sudo systemctl daemon-reload
