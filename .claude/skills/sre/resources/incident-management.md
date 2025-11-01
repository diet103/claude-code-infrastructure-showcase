# Incident Management

Incident response procedures, severity levels, escalation paths, communication protocols, postmortems, and on-call processes.

## Table of Contents

- [Incident Lifecycle](#incident-lifecycle)
- [Severity Levels](#severity-levels)
- [Roles and Responsibilities](#roles-and-responsibilities)
- [Response Procedures](#response-procedures)
- [Communication](#communication)
- [Postmortems](#postmortems)
- [Best Practices](#best-practices)

## Incident Lifecycle

```
Detect → Respond → Mitigate → Resolve → Learn
   ↓        ↓         ↓          ↓         ↓
 Alert   Triage   Fix/Workaround Root   Postmortem
                                 Cause
```

## Severity Levels

```yaml
SEV1 - Critical:
  impact: Complete service outage or data loss
  response_time: Immediate (< 15 minutes)
  escalation: Page on-call + management
  examples:
    - Production database down
    - Payment processing failed
    - Security breach
    - Data loss

SEV2 - High:
  impact: Major functionality impaired
  response_time: 30 minutes
  escalation: Page on-call
  examples:
    - API latency severely degraded
    - Single region outage
    - Critical feature unavailable

SEV3 - Medium:
  impact: Minor functionality impaired
  response_time: 2 hours
  escalation: Notify on-call via Slack
  examples:
    - Non-critical feature degraded
    - Elevated error rates
    - Performance slowdown

SEV4 - Low:
  impact: Minimal user impact
  response_time: Next business day
  escalation: Create ticket
  examples:
    - UI cosmetic issues
    - Internal tool problems
    - Low-priority bugs
```

## Roles and Responsibilities

**Incident Commander:**
- Owns the incident response
- Makes decisions
- Coordinates team
- Manages communication

**Technical Lead:**
- Diagnoses root cause
- Implements fixes
- Validates resolution

**Communications Lead:**
- Updates status page
- Notifies stakeholders
- Manages customer communication

**Scribe:**
- Documents timeline
- Records decisions
- Tracks action items

## Response Procedures

### Detection and Triage

```yaml
# incident-response.yaml
1_detection:
  - Alert triggers
  - Customer report
  - Monitoring system
  - Team member notice

2_initial_triage:
  - Assess severity
  - Determine impact
  - Page appropriate team
  - Create incident channel

3_form_response_team:
  - Incident Commander
  - Technical Lead(s)
  - Communications Lead
  - Subject Matter Experts
```

### Incident Command Structure

```bash
# Create incident Slack channel
/incident create SEV1 "API Gateway Down"

# Auto-creates:
# - #incident-2024-001
# - Zoom bridge
# - Status page placeholder
# - Timeline doc
```

### Response Playbooks

**Database Outage:**
```yaml
playbook: database-outage
severity: SEV1

steps:
  1_immediate:
    - Check database health metrics
    - Verify connectivity
    - Check for locks/blocking queries
    - Review recent changes

  2_diagnosis:
    - Check replication lag
    - Review error logs
    - Verify disk space
    - Check connection pool

  3_mitigation:
    - Failover to replica
    - Kill blocking queries
    - Restart if necessary
    - Scale resources

  4_communication:
    - Update status page
    - Notify customers
    - Inform stakeholders
```

**API Latency Degradation:**
```yaml
playbook: api-latency
severity: SEV2

steps:
  1_gather_data:
    - Check p95/p99 latency
    - Review error rates
    - Examine slow query logs
    - Check downstream services

  2_common_causes:
    - Database slow queries
    - Increased traffic
    - Downstream dependency
    - Resource exhaustion
    - Code deployment

  3_quick_fixes:
    - Scale up instances
    - Enable/adjust caching
    - Rate limit traffic
    - Rollback deployment
```

## Communication

### Status Page Updates

```yaml
# Incident timeline
14:05: Investigating - We're investigating reports of API errors
14:15: Identified - Database connection issues identified
14:30: Monitoring - Failover completed, monitoring recovery
15:00: Resolved - All services restored, investigating root cause
```

### Customer Communication Template

```markdown
Subject: [RESOLVED] API Service Disruption - Jan 15, 2024

Dear Customers,

SUMMARY:
Between 14:00-15:00 UTC today, our API service experienced elevated
error rates affecting approximately 10% of requests.

IMPACT:
- API errors for 10% of requests
- Average latency increased from 200ms to 2s
- No data loss occurred

ROOT CAUSE:
Database connection pool exhaustion due to traffic spike

RESOLUTION:
- Scaled database connection pools
- Implemented better connection management
- Added auto-scaling triggers

PREVENTION:
- Enhanced monitoring and alerting
- Implemented circuit breakers
- Scheduled capacity review

We apologize for the disruption. Please contact support@example.com
with any questions.

Status page: https://status.example.com/incidents/2024-001
```

### Internal Communication

```markdown
# Incident Slack Update Template
:rotating_light: **SEV1 INCIDENT** :rotating_light:

**Status:** Investigating
**Impact:** API returning 500 errors
**Started:** 14:05 UTC
**Incident Commander:** @alice
**Bridge:** https://zoom.us/j/123456789
**Channel:** #incident-2024-001

**Timeline:**
14:05 - Alert triggered for high error rate
14:07 - Incident declared SEV1
14:10 - Team assembled
14:15 - Root cause identified

**Next Update:** 14:30 UTC or sooner if status changes
```

## Postmortems

### Blameless Postmortem Template

```markdown
# Postmortem: API Outage - January 15, 2024

## Incident Summary
**Date:** 2024-01-15
**Duration:** 55 minutes (14:05 - 15:00 UTC)
**Severity:** SEV1
**Impact:** 10% error rate, 500k affected requests
**Root Cause:** Database connection pool exhaustion

## Timeline (UTC)
- 14:00: Traffic begins increasing (2x normal)
- 14:05: Alert: High API error rate
- 14:07: Incident declared SEV1
- 14:10: Incident team assembled
- 14:15: Root cause identified (connection pool exhausted)
- 14:20: Mitigation started (scale connection pool)
- 14:30: Error rates declining
- 14:45: Monitoring recovery
- 15:00: Incident resolved

## Root Cause Analysis

### What Happened
A marketing campaign drove 2x normal traffic. Our database connection
pool had a static size of 100 connections, which was exhausted. API
servers could not acquire database connections, resulting in errors.

### Why It Happened
1. No auto-scaling for database connection pools
2. Connection pool size not sized for peak traffic
3. No circuit breaker to fail fast
4. Insufficient load testing

### Contributing Factors
- Marketing campaign not coordinated with engineering
- Connection pool metrics not monitored
- No alerts on connection pool saturation

## Impact
- 500,000 failed API requests
- 10% error rate for 55 minutes
- Estimated revenue impact: $5,000
- Customer complaints: 50

## What Went Well
- Fast detection (< 5 minutes)
- Clear escalation path
- Good team communication
- Status page updated regularly
- Fix deployed quickly

## What Went Wrong
- No advance warning of traffic spike
- Connection pool not monitored
- Manual scaling required
- Customer notification delayed 10 minutes

## Action Items

### Immediate (This Week)
- [ ] Implement connection pool auto-scaling (@alice, 2024-01-17)
- [ ] Add connection pool metrics to dashboards (@bob, 2024-01-18)
- [ ] Create alerts for pool saturation (@charlie, 2024-01-19)

### Short-term (This Month)
- [ ] Implement circuit breakers (@alice, 2024-01-25)
- [ ] Load test at 3x normal traffic (@bob, 2024-01-30)
- [ ] Create runbook for connection issues (@charlie, 2024-01-30)

### Long-term (This Quarter)
- [ ] Improve engineering/marketing coordination (@dave, 2024-03-31)
- [ ] Implement capacity planning process (@eve, 2024-03-31)
- [ ] Auto-notification system for incidents (@frank, 2024-03-31)

## Lessons Learned
1. Static resource limits are a failure point
2. Cross-team coordination essential for major campaigns
3. Observability gaps can hide brewing problems
4. Circuit breakers prevent cascading failures

## Related Incidents
- INC-2023-089: Similar connection pool issue (resolved)
- INC-2023-112: Traffic spike from campaign (different cause)

## Appendix
- [Grafana Dashboard](https://grafana.example.com/d/incident-2024-001)
- [Logs](https://logs.example.com/incident-2024-001)
- [Slack Channel](https://slack.com/archives/incident-2024-001)
```

### Postmortem Review Process

```yaml
postmortem_process:
  1_draft:
    owner: Incident Commander
    deadline: 2 business days
    content:
      - Timeline
      - Root cause
      - Impact
      - Action items

  2_review:
    participants:
      - Incident team
      - Engineering leadership
      - Related teams
    format: Meeting (30-60 min)
    goals:
      - Validate accuracy
      - Identify additional learnings
      - Prioritize action items

  3_publish:
    distribution:
      - All engineering
      - Product team
      - Customer support
      - Public (if appropriate)

  4_followup:
    - Track action items in project management tool
    - Review progress in weekly meetings
    - Update on completion
```

## Best Practices

### 1. Blameless Culture

```
Focus on systems and processes, not individuals
Ask "how" and "why", not "who"
Encourage sharing mistakes openly
```

### 2. Clear Severity Definitions

```yaml
# Document and communicate
# Train team on criteria
# Review severity in retrospective
```

### 3. Designated Roles

```
Never have incident response without clear roles
Incident Commander makes all decisions
Scribe documents everything
```

### 4. Practice Incidents

```yaml
# Run incident simulations quarterly
chaos_engineering:
  - Simulate database failure
  - Test failover procedures
  - Practice communication
  - Time the response
```

### 5. Action Item Follow-Through

```
Assign owners and deadlines
Track in project management
Report progress weekly
Review in postmortem review
```

---

**Related Resources:**
- [on-call-runbooks.md](on-call-runbooks.md) - Diagnostic procedures
- [observability-stack.md](observability-stack.md) - Monitoring and detection
- [alerting-best-practices.md](alerting-best-practices.md) - Alert configuration
