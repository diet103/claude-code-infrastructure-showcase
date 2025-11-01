# Observability Stack

Prometheus + Grafana setup, Loki for logs, Jaeger/Tempo for distributed tracing, and comprehensive observability implementation.

## Table of Contents

- [Overview](#overview)
- [Metrics - Prometheus + Grafana](#metrics---prometheus--grafana)
- [Logs - Loki](#logs---loki)
- [Traces - Jaeger/Tempo](#traces---jaegertempo)
- [Integration](#integration)

## Overview

**Three Pillars of Observability:**
```
Metrics → What is happening (aggregated numbers)
Logs    → Detailed event records
Traces  → Request flow through system
```

## Metrics - Prometheus + Grafana

**Prometheus Setup:**
```yaml
# prometheus-values.yaml
prometheus:
  prometheusSpec:
    retention: 15d
    retentionSize: "50GB"
    storageSpec:
      volumeClaimTemplate:
        spec:
          resources:
            requests:
              storage: 100Gi

    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false

    additionalScrapeConfigs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
```

**ServiceMonitor:**
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-service
spec:
  selector:
    matchLabels:
      app: api
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

**Grafana Dashboard:**
```json
{
  "dashboard": {
    "title": "Service Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "rate(http_requests_total[5m])"
        }]
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])"
        }]
      },
      {
        "title": "Latency p95",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
        }]
      }
    ]
  }
}
```

## Logs - Loki

**Loki Setup:**
```yaml
# loki-values.yaml
loki:
  auth_enabled: false

  ingester:
    chunk_idle_period: 3m
    chunk_retain_period: 1m
    max_chunk_age: 1h

  limits_config:
    enforce_metric_name: false
    reject_old_samples: true
    reject_old_samples_max_age: 168h
    ingestion_rate_mb: 10
    ingestion_burst_size_mb: 20

  schema_config:
    configs:
      - from: 2024-01-01
        store: boltdb-shipper
        object_store: s3
        schema: v11
        index:
          prefix: loki_index_
          period: 24h

promtail:
  config:
    clients:
      - url: http://loki:3100/loki/api/v1/push
```

**Promtail Config:**
```yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - docker: {}
      - json:
          expressions:
            level: level
            timestamp: timestamp
            message: message
      - labels:
          level:
          app:
```

**LogQL Queries:**
```
# Recent errors
{app="api"} |= "error" | json

# Rate of errors
rate({app="api"} |= "error" [5m])

# Latency > 1s
{app="api"} | json | duration > 1s
```

## Traces - Jaeger/Tempo

**Tempo Setup:**
```yaml
tempo:
  storage:
    trace:
      backend: s3
      s3:
        bucket: traces
        endpoint: s3.amazonaws.com

  receivers:
    jaeger:
      protocols:
        grpc:
        thrift_http:
    otlp:
      protocols:
        grpc:
        http:
```

**Application Instrumentation (OpenTelemetry):**
```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const provider = new NodeTracerProvider();
provider.addSpanProcessor(
  new BatchSpanProcessor(
    new JaegerExporter({
      endpoint: 'http://tempo:14268/api/traces'
    })
  )
);

provider.register();

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation()
  ]
});
```

## Integration

**Grafana Unified View:**
```json
{
  "panels": [
    {
      "title": "Metrics",
      "datasource": "Prometheus",
      "targets": [{"expr": "rate(http_requests_total[5m])"}]
    },
    {
      "title": "Logs",
      "datasource": "Loki",
      "targets": [{"expr": "{app=\"api\"}"}]
    },
    {
      "title": "Traces",
      "datasource": "Tempo",
      "targets": [{"query": "service.name=\"api\""}]
    }
  ]
}
```

---

**Related Resources:**
- [alerting-best-practices.md](alerting-best-practices.md)
- [slo-sli-sla.md](slo-sli-sla.md)
