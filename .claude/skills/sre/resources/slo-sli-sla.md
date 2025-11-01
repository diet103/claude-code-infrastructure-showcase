# SLO, SLI, and SLA - Service Level Objectives, Indicators, and Agreements

Defining SLIs/SLOs/SLAs, error budgets, measuring reliability, and example calculations for site reliability engineering.

## Table of Contents

- [Definitions](#definitions)
- [SLI - Service Level Indicators](#sli---service-level-indicators)
- [SLO - Service Level Objectives](#slo---service-level-objectives)
- [SLA - Service Level Agreements](#sla---service-level-agreements)
- [Error Budgets](#error-budgets)
- [Implementation](#implementation)
- [Monitoring and Measurement](#monitoring-and-measurement)
- [Best Practices](#best-practices)

## Definitions

**SLI (Service Level Indicator):** Quantitative measure of service quality
**SLO (Service Level Objective):** Target value for an SLI
**SLA (Service Level Agreement):** Business agreement with consequences

```
SLI: What we measure
 ↓
SLO: What we promise internally
 ↓
SLA: What we promise customers (with penalties)
```

## SLI - Service Level Indicators

### Common SLIs

**Availability:**
```
Availability = (Successful Requests / Total Requests) × 100%

Example:
999,000 successful / 1,000,000 total = 99.9% availability
```

**Latency:**
```
Latency SLI = % of requests faster than threshold

Example:
95% of requests complete within 200ms
99% of requests complete within 500ms
```

**Error Rate:**
```
Error Rate = (Failed Requests / Total Requests) × 100%

Example:
100 errors / 100,000 requests = 0.1% error rate
```

**Throughput:**
```
Throughput = Requests per second (RPS)

Example:
1,000 requests per second sustained
```

### Prometheus Queries for SLIs

**Availability SLI:**
```promql
# Success rate over 30 days
sum(rate(http_requests_total{status=~"2.."}[30d]))
/
sum(rate(http_requests_total[30d]))
```

**Latency SLI (p95):**
```promql
# 95th percentile latency
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)
```

**Error Rate SLI:**
```promql
# Error rate over 30 days
sum(rate(http_requests_total{status=~"5.."}[30d]))
/
sum(rate(http_requests_total[30d]))
```

## SLO - Service Level Objectives

### Defining SLOs

**Four Golden Signals:**
1. **Latency:** Request duration
2. **Traffic:** Request rate
3. **Errors:** Failed requests
4. **Saturation:** Resource utilization

**Example SLOs:**
```yaml
slos:
  availability:
    target: 99.9%
    window: 30d
    description: "Service is available and responding to requests"

  latency:
    target: 95%
    threshold: 200ms
    window: 30d
    description: "95% of requests complete within 200ms"

  error_rate:
    target: 99.9%
    window: 30d
    description: "99.9% of requests succeed (0.1% error budget)"
```

### Availability Tiers

```
99.9%   (three nines)  = 43.2 minutes downtime/month
99.95%  (three-five)   = 21.6 minutes downtime/month
99.99%  (four nines)   = 4.32 minutes downtime/month
99.999% (five nines)   = 26 seconds downtime/month
```

### SLO Document Example

```yaml
# api-service-slo.yaml
service: api-service
owner: platform-team
reviewed: 2024-01-15

slos:
  - name: availability
    description: API endpoint availability
    sli:
      query: |
        sum(rate(http_requests_total{job="api",status=~"2.."}[30d]))
        /
        sum(rate(http_requests_total{job="api"}[30d]))
    target: 0.999  # 99.9%
    window: 30d

  - name: latency-p95
    description: 95th percentile latency under 200ms
    sli:
      query: |
        histogram_quantile(0.95,
          sum(rate(http_request_duration_seconds_bucket{job="api"}[5m])) by (le)
        )
    target: 0.2  # 200ms
    window: 30d

  - name: error-rate
    description: Error rate below 0.1%
    sli:
      query: |
        sum(rate(http_requests_total{job="api",status=~"5.."}[30d]))
        /
        sum(rate(http_requests_total{job="api"}[30d]))
    target: 0.001  # 0.1% errors = 99.9% success
    window: 30d

dependencies:
  - database-service (99.95% SLO)
  - cache-service (99.9% SLO)

alerting:
  burn_rate_fast: 14.4  # 2% error budget in 1 hour
  burn_rate_slow: 6     # 5% error budget in 6 hours
```

## SLA - Service Level Agreements

### SLA vs SLO

**SLO (Internal):**
- Target: 99.9%
- No financial penalty
- Triggers internal response

**SLA (Customer-Facing):**
- Commitment: 99.5% (buffer below SLO)
- Financial penalty if missed
- Legal agreement

### SLA Example

```yaml
# customer-sla.yaml
service: api-platform
effective_date: 2024-01-01

commitments:
  availability:
    guarantee: 99.5%
    measurement_period: monthly
    exclusions:
      - Scheduled maintenance (with 48hr notice)
      - Customer-caused issues
      - Force majeure

    credits:
      99.0% - 99.5%: 10% monthly fee credit
      98.0% - 99.0%: 25% monthly fee credit
      < 98.0%:       50% monthly fee credit

  support:
    severity_1: 1 hour response time
    severity_2: 4 hours response time
    severity_3: 24 hours response time

  data_durability:
    guarantee: 99.999999999% (11 nines)
```

## Error Budgets

### Concept

```
Error Budget = 1 - SLO

99.9% SLO = 0.1% error budget
           = 43.2 minutes/month
           = 432 failed requests per million
```

### Error Budget Policy

```yaml
# error-budget-policy.yaml
error_budget_policy:
  # When error budget > 0: Normal operations
  when_budget_available:
    - Deploy during business hours
    - Accept reasonable risk
    - Focus on feature velocity
    - Continue experimentation

  # When error budget exhausted: Freeze changes
  when_budget_exhausted:
    - Halt all feature deployments
    - Focus on reliability improvements
    - Root cause analysis required
    - Only critical bug fixes allowed
    - Emergency change approval needed

  # When error budget critically low
  when_budget_critical:  # < 25% remaining
    - Heightened change review
    - Increased monitoring
    - Reduce deployment frequency
    - Prepare contingency plans
```

### Error Budget Calculation

```python
def calculate_error_budget(slo_target, total_requests, failed_requests):
    """
    Calculate error budget consumption

    Args:
        slo_target: Target SLO (e.g., 0.999 for 99.9%)
        total_requests: Total requests in period
        failed_requests: Failed requests in period

    Returns:
        dict with error budget metrics
    """
    allowed_failures = total_requests * (1 - slo_target)
    error_budget_consumed = failed_requests / allowed_failures

    return {
        'allowed_failures': allowed_failures,
        'actual_failures': failed_requests,
        'budget_consumed_pct': error_budget_consumed * 100,
        'budget_remaining_pct': (1 - error_budget_consumed) * 100,
        'is_exhausted': error_budget_consumed >= 1.0
    }

# Example
result = calculate_error_budget(
    slo_target=0.999,
    total_requests=10_000_000,
    failed_requests=5_000
)

print(f"Allowed failures: {result['allowed_failures']}")  # 10,000
print(f"Actual failures: {result['actual_failures']}")    # 5,000
print(f"Budget consumed: {result['budget_consumed_pct']:.1f}%")  # 50%
print(f"Budget remaining: {result['budget_remaining_pct']:.1f}%")  # 50%
```

## Implementation

### Prometheus Recording Rules

```yaml
# prometheus-slo-rules.yaml
groups:
  - name: slo_recording_rules
    interval: 30s
    rules:
      # Availability SLI
      - record: slo:availability:ratio_rate30d
        expr: |
          sum(rate(http_requests_total{job="api",status=~"2.."}[30d]))
          /
          sum(rate(http_requests_total{job="api"}[30d]))

      # Error budget remaining
      - record: slo:error_budget:ratio
        expr: |
          1 - (
            (1 - slo:availability:ratio_rate30d)
            /
            (1 - 0.999)
          )

      # Latency SLI
      - record: slo:latency:p95_30d
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket{job="api"}[30d])) by (le)
          )
```

### Alerting Rules

```yaml
# prometheus-slo-alerts.yaml
groups:
  - name: slo_alerts
    rules:
      # Fast burn: 2% budget in 1 hour
      - alert: ErrorBudgetBurnRateFast
        expr: |
          (
            sum(rate(http_requests_total{job="api",status=~"5.."}[1h]))
            /
            sum(rate(http_requests_total{job="api"}[1h]))
          ) > (14.4 * (1 - 0.999))
        labels:
          severity: critical
        annotations:
          summary: "Error budget burning too fast"
          description: "2% of monthly error budget consumed in 1 hour"

      # Slow burn: 5% budget in 6 hours
      - alert: ErrorBudgetBurnRateSlow
        expr: |
          (
            sum(rate(http_requests_total{job="api",status=~"5.."}[6h]))
            /
            sum(rate(http_requests_total{job="api"}[6h]))
          ) > (6 * (1 - 0.999))
        labels:
          severity: warning
        annotations:
          summary: "Error budget burning at elevated rate"

      # Budget exhausted
      - alert: ErrorBudgetExhausted
        expr: slo:error_budget:ratio <= 0
        labels:
          severity: critical
        annotations:
          summary: "Error budget fully consumed"
          description: "Halt feature deployments, focus on reliability"
```

## Monitoring and Measurement

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "SLO Dashboard",
    "panels": [
      {
        "title": "Error Budget Remaining",
        "type": "gauge",
        "targets": [{
          "expr": "slo:error_budget:ratio * 100"
        }],
        "thresholds": [
          { "value": 0, "color": "red" },
          { "value": 25, "color": "yellow" },
          { "value": 50, "color": "green" }
        ]
      },
      {
        "title": "Availability (30d)",
        "type": "stat",
        "targets": [{
          "expr": "slo:availability:ratio_rate30d * 100"
        }],
        "format": "percent"
      }
    ]
  }
}
```

## Best Practices

### 1. Start Simple

```yaml
# Begin with basic availability SLO
initial_slo:
  availability: 99.9%
  measurement: request_success_rate
```

### 2. User-Centric SLIs

```
✅ Good: "95% of page loads complete in < 2s"
❌ Bad: "CPU usage < 80%"
```

### 3. Realistic Targets

```
Don't aim for 100% - impossible and expensive
99.9% is often appropriate for most services
99.99% only if business truly requires it
```

### 4. Define Measurement Windows

```
Use 30-day rolling windows
Shorter windows (1d, 7d) for faster feedback
```

### 5. Document Everything

```yaml
# Include in SLO document:
- What is measured
- Why it matters
- How it's calculated
- Who owns it
- Review frequency
```

---

**Related Resources:**
- [incident-management.md](incident-management.md) - Responding to SLO violations
- [alerting-best-practices.md](alerting-best-practices.md) - SLO-based alerting
- [observability-stack.md](observability-stack.md) - Monitoring implementation
