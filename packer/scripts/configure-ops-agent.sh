#!/bin/bash

sudo tee -a /etc/google-cloud-ops-agent/config.yaml << EOF
logging:
    receivers:
        webapp-log-receiver:
        type: files
        include_paths:
            - /var/log/webapp/*.log
        record_log_file_path: true
    processors:
        webapp-log-processor:
        type: parse_json
        time_key: time
        time_format: "%Y-%m-%dT%H:%M:%S.%L%Z"
    service:
        pipelines:
        default_pipeline:
            receivers: [webapp-log-receiver]
            processors: [webapp-log-processor]
EOF

sudo systemctl restart google-cloud-ops-agent
