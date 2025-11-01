# SRE - Site Reliability Engineering

Comprehensive guide for implementing SRE practices: SLI/SLO/SLA definitions, error budgets, incident management, on-call best practices, chaos engineering, observability, and reliability patterns for production systems.

## Purpose

Enable teams to build and operate reliable, scalable systems by applying software engineering principles to infrastructure and operations challenges.

## When to Use This Skill

Automatically activates when working on:
- Defining SLIs, SLOs, and SLAs
- Managing error budgets
- Incident response and management
- On-call rotation and procedures
- Observability and monitoring
- Chaos engineering and resilience testing
- Capacity planning and performance
- Disaster recovery planning

## Quick Start Checklist

When implementing SRE practices:

- [ ] Define Service Level Indicators (SLIs)
- [ ] Set Service Level Objectives (SLOs) with stakeholders
- [ ] Implement error budget tracking
- [ ] Set up comprehensive monitoring and alerting
- [ ] Create incident response runbooks
- [ ] Establish on-call rotation
- [ ] Implement automated remediation
- [ ] Conduct post-incident reviews
- [ ] Perform chaos engineering experiments
- [ ] Document capacity planning process
- [ ] Set up disaster recovery procedures

## Core Concepts

### SLI / SLO / SLA Hierarchy

```
SLA (Service Level Agreement)
  ↓ Commits to customers
  ↓
SLO (Service Level Objective)
  ↓ Internal target (stricter than SLA)
  ↓
SLI (Service Level Indicator)
  ↓ Measurement that shows if you're meeting SLO
  ↓
Metrics (actual measurements)
```

**Example:**
```
SLA:  99.9% uptime guaranteed (3 customers)
SLO:  99.95% uptime target (internal)
SLI:  Percentage of successful HTTP requests
      (2xx, 3xx responses / total requests)
```

### Error Budgets

```
Error Budget = 1 - SLO

Example:
SLO: 99.9% → Error Budget: 0.1%

Monthly calculations (30 days):
- Total time: 43,200 minutes
- Allowed downtime: 43.2 minutes

If error budget is:
- Available → Can take risks, deploy features
- Depleted → Focus on reliability, freeze features
```

### The Four Golden Signals

```yaml
1. Latency: How long requests take
   - Good: p50, p95, p99 latencies
   - Bad: Average latency (hides outliers)

2. Traffic: Demand on your system
   - Requests per second
   - Transactions per second
   - Bandwidth usage

3. Errors: Rate of failed requests
   - HTTP 5xx errors
   - Failed operations
   - Wrong results

4. Saturation: How "full" your service is
   - CPU usage
   - Memory usage
   - Disk I/O
   - Queue depth
```

## Common Patterns

### Pattern 1: SLO Definition

```yaml
# slos/api-service.yaml
apiVersion: v1
kind: SLO
metadata:
  name: api-service-availability
  service: api-service
spec:
  description: "API service availability for customer requests"

  # SLI definition
  sli:
    name: availability
    description: "Percentage of successful requests"
    query: |
      sum(rate(http_requests_total{job="api-service",code=~"2.."}[5m]))
      /
      sum(rate(http_requests_total{job="api-service"}[5m]))

  # SLO target
  objectives:
  - target: 0.999  # 99.9%
    window: 30d    # Rolling 30 days

  # Alert thresholds
  alerting:
    - burn_rate: 14.4   # Alert if burning budget 14.4x faster
      short_window: 1h
      long_window: 5m
      severity: critical

    - burn_rate: 6
      short_window: 6h
      long_window: 30m
      severity: warning
```

**Latency SLO:**
```yaml
apiVersion: v1
kind: SLO
metadata:
  name: api-service-latency
spec:
  sli:
    name: latency
    description: "95th percentile latency under 200ms"
    query: |
      histogram_quantile(0.95,
        sum(rate(http_request_duration_seconds_bucket{job="api-service"}[5m])) by (le)
      )

  objectives:
  - target: 0.200  # 200ms
    window: 7d
```

### Pattern 2: Incident Response

**Incident Severity Levels:**
```yaml
Severity 1 (Critical):
  - Complete service outage
  - Security breach
  - Data loss
  Response: Immediate, all hands
  Escalation: 15 minutes

Severity 2 (High):
  - Partial outage
  - Degraded performance
  - Feature broken
  Response: Within 30 minutes
  Escalation: 1 hour

Severity 3 (Medium):
  - Minor issues
  - Non-critical features affected
  Response: Within 4 hours
  Escalation: Next business day

Severity 4 (Low):
  - Cosmetic issues
  - Questions
  Response: Best effort
```

**Incident Runbook Template:**
```markdown
# Incident: API Service High Latency

## Symptoms
- API p95 latency > 500ms
- Users reporting slow responses
- Alert: "api-service-latency-high" firing

## Impact
- Degraded user experience
- Potential timeout errors

## Investigation Steps

1. Check service status:
   \`\`\`bash
   kubectl get pods -n production -l app=api-service
   kubectl top pods -n production -l app=api-service
   \`\`\`

2. Check recent deployments:
   \`\`\`bash
   kubectl rollout history deployment/api-service -n production
   \`\`\`

3. Check database performance:
   - Query: `rate(pg_stat_database_tup_fetched[5m])`
   - Check slow query log

4. Check downstream dependencies:
   - External API status
   - Cache hit rate

## Mitigation

### Quick Fixes
- Scale up: `kubectl scale deployment api-service --replicas=10`
- Rollback: `kubectl rollout undo deployment/api-service`

### Root Cause Fixes
- Optimize slow queries
- Add caching layer
- Increase resource limits

## Communication

- Slack: #incidents channel
- Status page: Update customer-facing status
- Stakeholders: Notify via PagerDuty

## Post-Incident

- Create post-incident review
- Update runbook with learnings
- File tickets for improvements
```

### Pattern 3: Chaos Engineering

```yaml
# chaos-experiments/pod-failure.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: api-service-pod-failure
  namespace: chaos-testing
spec:
  action: pod-failure
  mode: one
  selector:
    namespaces:
      - production
    labelSelectors:
      app: api-service
  duration: "30s"
  scheduler:
    cron: "@every 2h"  # Run every 2 hours

---
# Network chaos
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: api-network-delay
spec:
  action: delay
  mode: one
  selector:
    namespaces:
      - production
    labelSelectors:
      app: api-service
  delay:
    latency: "100ms"
    correlation: "100"
    jitter: "0ms"
  duration: "5m"
```

## Resource Files

For detailed guidance on specific topics, see:

### Core SRE Practices
- **[sli-slo-sla.md](resources/sli-slo-sla.md)** - Service level definitions, SLO implementation, error budget tracking
- **[error-budgets.md](resources/error-budgets.md)** - Error budget policies, burn rate alerts, budget management
- **[incident-management.md](resources/incident-management.md)** - Incident response procedures, runbooks, post-mortems

### Observability
- **[observability.md](resources/observability.md)** - Metrics, logs, traces, Prometheus, Grafana, Jaeger, distributed tracing
- **[monitoring-alerting.md](resources/monitoring-alerting.md)** - Alert design, notification strategies, on-call alerting
- **[performance-optimization.md](resources/performance-optimization.md)** - Profiling, performance tuning, optimization techniques

### Operations
- **[on-call-practices.md](resources/on-call-practices.md)** - On-call rotations, escalation procedures, burnout prevention
- **[capacity-planning.md](resources/capacity-planning.md)** - Load testing, capacity modeling, growth forecasting
- **[disaster-recovery.md](resources/disaster-recovery.md)** - Backup strategies, RPO/RTO, DR testing, failover procedures

### Reliability Patterns
- **[reliability-patterns.md](resources/reliability-patterns.md)** - Circuit breakers, retries, timeouts, bulkheads, rate limiting
- **[chaos-engineering.md](resources/chaos-engineering.md)** - Fault injection, resilience testing, game days

## Best Practices

### 1. Start with User-Focused SLIs

Measure what matters to users, not infrastructure metrics.

```yaml
# Good SLIs
- Request success rate
- Request latency
- Data freshness

# Poor SLIs
- CPU usage
- Memory usage
- Pod count
```

### 2. Set Realistic SLOs

```
Don't aim for 100% - it's:
- Impossible to achieve
- Extremely expensive
- Prevents risk-taking

Typical SLOs:
- User-facing: 99.9% - 99.99%
- Internal services: 99% - 99.9%
- Batch jobs: 95% - 99%
```

### 3. Embrace Error Budgets

```
Error budget available:
✅ Deploy new features
✅ Experiment
✅ Take calculated risks

Error budget depleted:
❌ Feature freeze
✅ Focus on reliability
✅ Fix technical debt
```

### 4. Automate Toil

```
Toil = Manual, repetitive, automatable work

Track toil:
- Measure time spent on toil
- Target: <50% of SRE time on toil
- Automate high-frequency tasks
```

### 5. Blameless Post-Mortems

```markdown
# Post-Incident Review Template

## Incident Summary
- Date/Time
- Duration
- Severity
- Services affected

## Impact
- Users affected
- Revenue impact
- SLO impact

## Root Cause
Technical explanation (not who)

## Timeline
Detailed chronology

## Resolution
What fixed it

## Action Items
- [ ] Short-term fixes
- [ ] Long-term improvements
- [ ] Process changes

## Lessons Learned
What went well
What could be improved
```

### 6. Gradual Rollouts

```
Deployment stages:
1. Canary (1% traffic) - 15 mins
2. Small (10% traffic) - 30 mins
3. Medium (50% traffic) - 1 hour
4. Full (100% traffic)

Automated rollback on:
- Error rate increase >1%
- Latency increase >20%
- Failed health checks
```

## Anti-Patterns to Avoid

❌ 100% availability target (unrealistic, expensive)
❌ Ignoring error budgets (defeats the purpose)
❌ Alert fatigue (too many noisy alerts)
❌ Manual toil (should be automated)
❌ Blame culture (prevents learning)
❌ No runbooks (tribal knowledge)
❌ Reactive only (should be proactive)
❌ Monitoring without alerting (data without action)
❌ No capacity planning (surprise outages)
❌ Skipping post-mortems (missing learning opportunities)

## Integration Points

This skill integrates with:
- **platform-engineering**: Infrastructure reliability, Kubernetes operations
- **devsecops**: Security incident response, vulnerability management
- **release-engineering**: Safe deployments, rollback strategies
- **cloud-engineering**: Cloud monitoring, disaster recovery
- **systems-engineering**: Performance tuning, system monitoring

## Triggers and Activation

This skill activates when you:
- Define or modify SLOs/SLIs
- Respond to incidents
- Set up monitoring and alerting
- Plan capacity or performance optimization
- Conduct post-incident reviews
- Implement chaos engineering

---

**Focus:** Reliability through engineering discipline
**Key Principle:** Measure everything, improve continuously
**Maintained by:** SRE team based on Google SRE practices and industry standards
