# System Monitoring

Comprehensive guide to system monitoring covering log aggregation, metrics collection, APM integration, dashboards, and alerting for observability and reliability.

## Table of Contents

- [Monitoring Architecture](#monitoring-architecture)
- [Log Aggregation](#log-aggregation)
- [Metrics Collection](#metrics-collection)
- [APM Tools Integration](#apm-tools-integration)
- [Dashboard Creation](#dashboard-creation)
- [Alert Configuration](#alert-configuration)
- [Log Analysis](#log-analysis)
- [Best Practices](#best-practices)

## Monitoring Architecture

### Monitoring Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Visualization                         │
│                  (Grafana, Kibana)                      │
├─────────────────────────────────────────────────────────┤
│              Alerting & Analysis                        │
│         (Prometheus, Elasticsearch)                     │
├─────────────────────────────────────────────────────────┤
│              Data Collection                            │
│  (node_exporter, Filebeat, Telegraf)                   │
├─────────────────────────────────────────────────────────┤
│              Application Servers                        │
└─────────────────────────────────────────────────────────┘
```

## Log Aggregation

### rsyslog Configuration

```bash
# Install rsyslog
sudo apt install rsyslog

# /etc/rsyslog.d/50-default.conf

# Log levels: debug, info, notice, warn, error, crit, alert, emerg

# Separate logs by facility
auth,authpriv.*         /var/log/auth.log
*.*;auth,authpriv.none  -/var/log/syslog
kern.*                  -/var/log/kern.log
mail.*                  -/var/log/mail.log

# Remote logging to centralized server
*.* @@logserver.example.com:514  # TCP
# Or UDP
*.* @logserver.example.com:514   # UDP

# Filter specific logs
:programname, isequal, "myapp" /var/log/myapp.log
& stop  # Don't process further

# Restart rsyslog
sudo systemctl restart rsyslog
```

**Centralized Log Server:**
```bash
# /etc/rsyslog.conf on log server

# Enable UDP reception
module(load="imudp")
input(type="imudp" port="514")

# Enable TCP reception
module(load="imtcp")
input(type="imtcp" port="514")

# Template for organizing logs by hostname
$template RemoteLogs,"/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log"
*.* ?RemoteLogs
& stop
```

### journald Configuration

```bash
# /etc/systemd/journald.conf

[Journal]
# Persistent storage
Storage=persistent

# Max disk usage
SystemMaxUse=1G
RuntimeMaxUse=100M

# Keep logs for 30 days
MaxRetentionSec=2592000

# Forward to syslog
ForwardToSyslog=yes

# Restart journald
sudo systemctl restart systemd-journald
```

**Query journald:**
```bash
# View all logs
journalctl

# Follow logs
journalctl -f

# Specific service
journalctl -u nginx.service

# Since time
journalctl --since "2024-01-01 00:00:00"
journalctl --since "1 hour ago"

# Priority level
journalctl -p err    # Errors only
journalctl -p warning # Warnings and above

# Specific boot
journalctl -b        # Current boot
journalctl -b -1     # Previous boot

# Export to file
journalctl -u myapp --since today > /tmp/myapp-logs.txt

# JSON format
journalctl -u myapp -o json-pretty
```

### Loki (Grafana Loki)

**Install Loki:**
```bash
# Download Loki
wget https://github.com/grafana/loki/releases/download/v2.9.0/loki-linux-amd64.zip
unzip loki-linux-amd64.zip
sudo mv loki-linux-amd64 /usr/local/bin/loki
```

**Loki Configuration:**
```yaml
# /etc/loki/config.yml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /var/loki
  storage:
    filesystem:
      chunks_directory: /var/loki/chunks
      rules_directory: /var/loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2023-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 720h  # 30 days
```

**Systemd Service:**
```ini
# /etc/systemd/system/loki.service
[Unit]
Description=Loki Log Aggregation System
After=network.target

[Service]
Type=simple
User=loki
ExecStart=/usr/local/bin/loki -config.file=/etc/loki/config.yml
Restart=always

[Install]
WantedBy=multi-user.target
```

**Promtail (Log Shipper):**
```yaml
# /etc/promtail/config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /var/lib/promtail/positions.yaml

clients:
  - url: http://loki-server:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          host: ${HOSTNAME}
          __path__: /var/log/*log

  - job_name: nginx
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/*log

  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: myapp
          __path__: /var/log/myapp/*.log
```

## Metrics Collection

### Prometheus Node Exporter

**Install:**
```bash
# Download node_exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.7.0.linux-amd64.tar.gz
sudo cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
```

**Systemd Service:**
```ini
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
User=node_exporter
ExecStart=/usr/local/bin/node_exporter \
    --collector.filesystem.mount-points-exclude='^/(sys|proc|dev|run)($|/)' \
    --collector.netclass.ignored-devices='^(veth|docker|lo).*'
Restart=always

[Install]
WantedBy=multi-user.target
```

**Enable and Start:**
```bash
sudo useradd -rs /bin/false node_exporter
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter

# Verify
curl http://localhost:9100/metrics
```

### Prometheus Server

**Install Prometheus:**
```bash
wget https://github.com/prometheus/prometheus/releases/download/v2.47.0/prometheus-2.47.0.linux-amd64.tar.gz
tar xvfz prometheus-2.47.0.linux-amd64.tar.gz
sudo cp prometheus-2.47.0.linux-amd64/{prometheus,promtool} /usr/local/bin/
sudo mkdir -p /etc/prometheus /var/lib/prometheus
```

**Configuration:**
```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    region: 'us-east-1'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093

# Load rules
rule_files:
  - "alerts/*.yml"

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node exporters
  - job_name: 'node'
    static_configs:
      - targets:
          - 'web1:9100'
          - 'web2:9100'
          - 'db1:9100'
        labels:
          env: 'production'
          role: 'backend'

  # Application metrics
  - job_name: 'myapp'
    static_configs:
      - targets:
          - 'web1:8080'
          - 'web2:8080'
    metrics_path: '/metrics'
```

**Systemd Service:**
```ini
# /etc/systemd/system/prometheus.service
[Unit]
Description=Prometheus
After=network.target

[Service]
Type=simple
User=prometheus
ExecStart=/usr/local/bin/prometheus \
    --config.file=/etc/prometheus/prometheus.yml \
    --storage.tsdb.path=/var/lib/prometheus \
    --web.console.templates=/etc/prometheus/consoles \
    --web.console.libraries=/etc/prometheus/console_libraries \
    --storage.tsdb.retention.time=30d
Restart=always

[Install]
WantedBy=multi-user.target
```

### Telegraf

**Install:**
```bash
wget -q https://repos.influxdata.com/influxdata-archive_compat.key
echo '393e8779c89ac8d958f81f942f9ad7fb82a25e133faddaf92e15b16e6ac9ce4c influxdata-archive_compat.key' | sha256sum -c && cat influxdata-archive_compat.key | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg > /dev/null
echo 'deb [signed-by=/etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg] https://repos.influxdata.com/debian stable main' | sudo tee /etc/apt/sources.list.d/influxdata.list
sudo apt-get update && sudo apt-get install telegraf
```

**Configuration:**
```toml
# /etc/telegraf/telegraf.conf

[global_tags]
  env = "production"
  datacenter = "us-east-1"

[agent]
  interval = "10s"
  round_interval = true
  metric_batch_size = 1000
  metric_buffer_limit = 10000

# Output to InfluxDB
[[outputs.influxdb_v2]]
  urls = ["http://influxdb:8086"]
  token = "$INFLUX_TOKEN"
  organization = "myorg"
  bucket = "metrics"

# Output to Prometheus
[[outputs.prometheus_client]]
  listen = ":9273"

# Input plugins
[[inputs.cpu]]
  percpu = true
  totalcpu = true
  collect_cpu_time = false
  report_active = false

[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs", "devfs", "iso9660", "overlay", "aufs", "squashfs"]

[[inputs.diskio]]

[[inputs.mem]]

[[inputs.net]]

[[inputs.system]]

[[inputs.processes]]

[[inputs.nginx]]
  urls = ["http://localhost/nginx_status"]

[[inputs.postgresql]]
  address = "host=localhost user=telegraf database=postgres sslmode=disable"
```

## APM Tools Integration

### Application Metrics (Node.js Example)

```javascript
// Express.js with Prometheus metrics
const express = require('express');
const promClient = require('prom-client');

const app = express();

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);

// Middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
    httpRequestTotal.labels(req.method, route, res.statusCode).inc();
  });

  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3000);
```

## Dashboard Creation

### Grafana Installation

```bash
# Install Grafana
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# Access: http://localhost:3000
# Default credentials: admin/admin
```

### Grafana Dashboard JSON (Node Exporter)

```json
{
  "dashboard": {
    "title": "System Metrics",
    "panels": [
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "100 * (1 - ((node_memory_MemAvailable_bytes) / (node_memory_MemTotal_bytes)))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Disk Usage",
        "targets": [
          {
            "expr": "100 - ((node_filesystem_avail_bytes{mountpoint=\"/\"} * 100) / node_filesystem_size_bytes{mountpoint=\"/\"})"
          }
        ],
        "type": "gauge"
      }
    ]
  }
}
```

### Common PromQL Queries

```promql
# CPU usage per core
rate(node_cpu_seconds_total{mode!="idle"}[5m])

# Memory usage percentage
100 * (1 - ((node_memory_MemAvailable_bytes) / (node_memory_MemTotal_bytes)))

# Disk I/O
rate(node_disk_read_bytes_total[5m])
rate(node_disk_written_bytes_total[5m])

# Network traffic
rate(node_network_receive_bytes_total{device!~"lo|veth.*"}[5m])
rate(node_network_transmit_bytes_total{device!~"lo|veth.*"}[5m])

# HTTP request rate
rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m])
```

## Alert Configuration

### Prometheus Alert Rules

```yaml
# /etc/prometheus/alerts/system.yml
groups:
  - name: system_alerts
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 80% (current: {{ $value | humanize }}%)"

      # High memory usage
      - alert: HighMemoryUsage
        expr: 100 * (1 - ((node_memory_MemAvailable_bytes) / (node_memory_MemTotal_bytes))) > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 90% (current: {{ $value | humanize }}%)"

      # Disk space low
      - alert: DiskSpaceLow
        expr: 100 - ((node_filesystem_avail_bytes{mountpoint="/"} * 100) / node_filesystem_size_bytes{mountpoint="/"}) > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"
          description: "Disk usage is above 85% (current: {{ $value | humanize }}%)"

      # Instance down
      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
```

### Alertmanager Configuration

```yaml
# /etc/alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-notifications'

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'

    - match:
        severity: warning
      receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'

  - name: 'email-team'
    email_configs:
      - to: 'team@example.com'
        from: 'alerts@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alerts@example.com'
        auth_password: 'password'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

## Log Analysis

### Log Parsing with grep/awk

```bash
# Find errors in logs
grep -i error /var/log/myapp/app.log

# Count occurrences
grep -c "ERROR" /var/log/myapp/app.log

# Extract specific fields (Apache access log)
awk '{print $1, $7}' /var/log/apache2/access.log

# Top 10 IP addresses
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# HTTP status code summary
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c

# Response times over threshold
awk '$NF > 1.0 {print $0}' /var/log/app/access.log
```

### Log Analysis Scripts

```bash
#!/bin/bash
# analyze-logs.sh - Automated log analysis

LOG_FILE="/var/log/myapp/app.log"
REPORT_FILE="/var/log/myapp/daily-report-$(date +%Y%m%d).txt"

{
  echo "=== Log Analysis Report ==="
  echo "Date: $(date)"
  echo "Log file: $LOG_FILE"
  echo ""

  echo "=== Error Summary ==="
  echo "Total errors: $(grep -c ERROR $LOG_FILE)"
  echo "Total warnings: $(grep -c WARN $LOG_FILE)"
  echo ""

  echo "=== Top 10 Error Messages ==="
  grep ERROR $LOG_FILE | awk -F'ERROR' '{print $2}' | sort | uniq -c | sort -rn | head -10
  echo ""

  echo "=== Errors by Hour ==="
  grep ERROR $LOG_FILE | awk '{print $1, $2}' | cut -d: -f1 | uniq -c
  echo ""

  echo "=== Last 20 Errors ==="
  grep ERROR $LOG_FILE | tail -20

} > $REPORT_FILE

echo "Report saved to $REPORT_FILE"
```

## Best Practices

### 1. Monitoring Strategy

```
The Four Golden Signals:
1. Latency - Response time
2. Traffic - Request rate
3. Errors - Error rate
4. Saturation - Resource utilization
```

### 2. Alert Design

- **Alert on symptoms, not causes**
- **Make alerts actionable**
- **Include context in notifications**
- **Avoid alert fatigue**
- **Set appropriate thresholds**

### 3. Retention Policies

```bash
# Logs
- Application logs: 30 days
- System logs: 90 days
- Audit logs: 1 year

# Metrics
- Raw metrics: 15 days (15s interval)
- 5min aggregates: 90 days
- 1hour aggregates: 2 years
```

### 4. Security

```bash
# Secure metrics endpoints
# Use authentication
# Encrypt in transit (TLS)
# Limit access to monitoring systems
# Sanitize log data (no PII, no secrets)
```

### 5. Performance

```bash
# Optimize collection intervals
# Use log sampling for high-volume
# Aggregate metrics appropriately
# Archive old data
# Monitor the monitoring system
```

---

**Related Topics:**
- See [troubleshooting-guide.md](troubleshooting-guide.md) for debugging with logs
- See [performance-tuning.md](performance-tuning.md) for metrics interpretation
- See [security-hardening.md](security-hardening.md) for audit logging
