#!/bin/bash

sudo tee -a /etc/google-cloud-ops-agent/config.yaml << EOF
logging:
  receivers:
    my-app-receiver:
      type: files
      include_paths:
        - /var/log/webapp/events.log
      record_log_file_path: true
  processors:
    my-app-processor:
      type: parse_json
      time_key: timestamp
      time_format: "%Y-%m-%dT%H:%M:%S.%LZ"
    add-severity:
      type: modify_fields
      fields:
        severity:
          copy_from: jsonPayload.level
  service:
    pipelines:
      default_pipeline:
        receivers: [my-app-receiver]
        processors: [my-app-processor, add-severity]
EOF

sudo systemctl restart google-cloud-ops-agent
