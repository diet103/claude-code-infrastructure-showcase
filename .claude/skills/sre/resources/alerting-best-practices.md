# Alerting Best Practices

Alert design principles, notification routing (PagerDuty, OpsGenie), alert fatigue prevention, and effective on-call alerting strategies.

## Table of Contents

- [Alert Design Principles](#alert-design-principles)
- [Alert Rules](#alert-rules)
- [Notification Routing](#notification-routing)
- [Alert Fatigue Prevention](#alert-fatigue-prevention)
- [Best Practices](#best-practices)

## Alert Design Principles

**Good Alerts:**
```
✅ Actionable - Can be fixed immediately
✅ Specific - Clear what's wrong
✅ User-impacting - Affects customers
✅ Urgent - Requires immediate attention
✅ Novel - Not duplicate of existing alert
```

**Bad Alerts:**
```
❌ Noisy - Frequent false positives
❌ Vague - Unclear what to do
❌ Premature - Fires before issue impacts users
❌ Duplicate - Same as other alerts
❌ Low-priority - Can wait until business hours
```

## Alert Rules

**Prometheus Alerting:**
```yaml
groups:
  - name: slo_alerts
    rules:
      # Good: User-impacting, actionable
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Error rate above 5% for 5 minutes"
          description: "{{ $value | humanizePercentage }} of requests failing"
          runbook: "https://runbooks.example.com/high-error-rate"
          dashboard: "https://grafana.example.com/d/service-health"

      # Good: SLO-based, clear threshold
      - alert: LatencyP95High
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 0.5
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "P95 latency above 500ms"
          impact: "Users experiencing slow response times"
```

**Multi-Window Alerts:**
```yaml
# Fast burn + slow burn
- alert: ErrorBudgetBurn
  expr: |
    (
      sum(rate(http_requests_total{status=~"5.."}[1h]))
      /
      sum(rate(http_requests_total[1h]))
      > (14.4 * (1 - 0.999))
    )
    and
    (
      sum(rate(http_requests_total{status=~"5.."}[5m]))
      /
      sum(rate(http_requests_total[5m]))
      > (14.4 * (1 - 0.999))
    )
  labels:
    severity: critical
  annotations:
    summary: "Error budget burning at 14.4x rate"
```

## Notification Routing

**AlertManager Config:**
```yaml
route:
  receiver: default
  group_by: ['alertname', 'cluster']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h

  routes:
    # Critical: Page immediately
    - match:
        severity: critical
      receiver: pagerduty
      group_wait: 10s
      repeat_interval: 5m

    # Warning: Slack notification
    - match:
        severity: warning
      receiver: slack
      repeat_interval: 4h

    # Info: Email only
    - match:
        severity: info
      receiver: email
      repeat_interval: 24h

receivers:
  - name: pagerduty
    pagerduty_configs:
      - service_key: $PAGERDUTY_SERVICE_KEY
        description: "{{ .GroupLabels.alertname }}"

  - name: slack
    slack_configs:
      - api_url: $SLACK_WEBHOOK_URL
        channel: '#alerts'
        title: "{{ .GroupLabels.alertname }}"
        text: "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"

  - name: email
    email_configs:
      - to: 'team@example.com'
        from: 'alertmanager@example.com'
```

**PagerDuty Integration:**
```yaml
pagerduty_configs:
  - routing_key: $PAGERDUTY_ROUTING_KEY
    severity: "{{ .Labels.severity }}"
    client: "Alertmanager"
    client_url: "{{ .ExternalURL }}"
    description: "{{ .GroupLabels.alertname }}"
    details:
      firing: "{{ .Alerts.Firing | len }}"
      resolved: "{{ .Alerts.Resolved | len }}"
      summary: "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
```

## Alert Fatigue Prevention

**Strategies:**

1. **High Signal-to-Noise Ratio**
```
Target: < 5% false positive rate
If alert fires but no action taken → remove or adjust
```

2. **Appropriate Thresholds**
```yaml
# Too sensitive
expr: cpu_usage > 0.5  # Fires constantly

# Better
expr: cpu_usage > 0.9 for 10m  # Sustained high usage
```

3. **Group Similar Alerts**
```yaml
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s  # Wait to group
  group_interval: 5m  # Send grouped updates
```

4. **Escalation Policies**
```yaml
# PagerDuty escalation
escalation_policy:
  - level: 1
    targets: [on_call_primary]
    escalation_delay: 5m

  - level: 2
    targets: [on_call_secondary, team_lead]
    escalation_delay: 10m

  - level: 3
    targets: [engineering_manager]
    escalation_delay: 15m
```

5. **Alert Inhibition**
```yaml
inhibit_rules:
  # If service is down, don't alert on high latency
  - source_match:
      severity: critical
      alertname: ServiceDown
    target_match:
      severity: warning
      alertname: HighLatency
    equal: ['service']
```

## Best Practices

### 1. Include Runbook Links

```yaml
annotations:
  runbook: "https://runbooks.example.com/{{ $labels.alertname }}"
```

### 2. Add Context

```yaml
annotations:
  description: |
    Service {{ $labels.service }} error rate is {{ $value | humanizePercentage }}
    Dashboard: https://grafana.example.com/d/{{ $labels.service }}
    Logs: https://logs.example.com/?service={{ $labels.service }}
```

### 3. Test Alerts

```bash
# Send test alert
amtool alert add alertname=TestAlert severity=warning

# Check routing
amtool config routes test --config.file=alertmanager.yml \
  severity=critical team=platform
```

### 4. Review Alerts Regularly

```yaml
# Quarterly alert audit
review_process:
  - Check false positive rate
  - Verify runbooks are current
  - Update thresholds based on trends
  - Remove unused alerts
```

### 5. Time-Based Routing

```yaml
# Different routing for business hours vs off-hours
routes:
  - match:
      severity: warning
    receiver: slack
    active_time_intervals:
      - business_hours

  - match:
      severity: warning
    receiver: email
    active_time_intervals:
      - off_hours
```

---

**Related Resources:**
- [incident-management.md](incident-management.md)
- [on-call-runbooks.md](on-call-runbooks.md)
- [observability-stack.md](observability-stack.md)
