# Security Monitoring

Runtime detection, anomaly detection, SIEM integration, security logging, and continuous security monitoring.

## Table of Contents

- [Runtime Detection](#runtime-detection)
- [Anomaly Detection](#anomaly-detection)
- [SIEM Integration](#siem-integration)
- [Security Logging](#security-logging)
- [Alerting](#alerting)

## Runtime Detection

### Falco

**Installation:**
```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco \
  --namespace falco --create-namespace
```

**Custom Rules:**
```yaml
- rule: Unexpected Network Connection
  desc: Detect unexpected outbound connections
  condition: >
    outbound and
    not fd.sip in (allowed_ips) and
    not proc.name in (allowed_processes)
  output: >
    Unexpected network connection
    (process=%proc.name dest=%fd.sip:%fd.sport)
  priority: WARNING

- rule: Sensitive File Access
  desc: Monitor access to sensitive files
  condition: >
    open_read and
    fd.name in (/etc/shadow, /etc/passwd) and
    not proc.name in (allowed_system_processes)
  output: >
    Sensitive file accessed
    (file=%fd.name process=%proc.name user=%user.name)
  priority: CRITICAL
```

## Anomaly Detection

### Machine Learning

```python
from sklearn.ensemble import IsolationForest
import numpy as np

# Train anomaly detector
def train_anomaly_detector(normal_traffic):
    detector = IsolationForest(contamination=0.1)
    detector.fit(normal_traffic)
    return detector

# Detect anomalies
def detect_anomalies(detector, new_data):
    predictions = detector.predict(new_data)
    anomalies = new_data[predictions == -1]
    return anomalies
```

## SIEM Integration

### Splunk

```yaml
# fluent-bit config for Splunk
outputs:
  - name: splunk
    match: '*'
    host: splunk.example.com
    port: 8088
    tls: on
    tls.verify: on
    splunk_token: ${SPLUNK_HEC_TOKEN}
```

### Elastic Stack

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    paths:
      - /var/log/audit/*.log
    fields:
      log_type: security_audit

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "security-logs-%{+yyyy.MM.dd}"
```

## Security Logging

**Audit Logging:**
```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: RequestResponse
  verbs: ["create", "update", "patch", "delete"]
  resources:
  - group: ""
    resources: ["secrets", "configmaps"]

- level: Metadata
  verbs: ["get", "list"]
  resources:
  - group: ""
    resources: ["pods"]
```

## Alerting

**PagerDuty Integration:**
```yaml
alertmanager:
  config:
    receivers:
    - name: pagerduty
      pagerduty_configs:
      - service_key: $PAGERDUTY_KEY
        description: "{{ .GroupLabels.alertname }}"

    route:
      receiver: pagerduty
      routes:
      - match:
          severity: critical
        receiver: pagerduty
```

---

**Related Resources:**
- [security-testing.md](security-testing.md)
- [policy-enforcement.md](policy-enforcement.md)
