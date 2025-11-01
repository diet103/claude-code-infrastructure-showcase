# Disaster Recovery

Backup strategies, RTO/RPO definitions, failover procedures, disaster recovery testing, and multi-region architectures.

## Table of Contents

- [RTO and RPO](#rto-and-rpo)
- [Backup Strategies](#backup-strategies)
- [Failover Procedures](#failover-procedures)
- [DR Testing](#dr-testing)
- [Multi-Region Architecture](#multi-region-architecture)

## RTO and RPO

**Definitions:**
```
RTO (Recovery Time Objective):
  Maximum acceptable downtime
  Example: 4 hours

RPO (Recovery Point Objective):
  Maximum acceptable data loss
  Example: 1 hour (last backup)
```

**RTO/RPO Tiers:**
```yaml
tier_1_critical:
  rto: 1 hour
  rpo: 15 minutes
  cost: High
  examples: [payment processing, critical APIs]

tier_2_important:
  rto: 4 hours
  rpo: 1 hour
  cost: Medium
  examples: [main application, databases]

tier_3_standard:
  rto: 24 hours
  rpo: 24 hours
  cost: Low
  examples: [internal tools, analytics]
```

## Backup Strategies

**3-2-1 Rule:**
```
3 copies of data
2 different media types
1 offsite backup
```

**Database Backups:**
```yaml
# PostgreSQL backup with WAL archiving
postgresql_backup:
  full_backup:
    frequency: daily
    retention: 30 days
    command: |
      pg_basebackup -h localhost -D /backup/$(date +%Y%m%d) -Ft -z -Xs

  wal_archiving:
    enabled: true
    archive_command: |
      aws s3 cp %p s3://backups/wal/%f
    restore_command: |
      aws s3 cp s3://backups/wal/%f %p

  point_in_time_recovery:
    enabled: true
    max_recovery_window: 7 days
```

**Automated Backups (Velero for Kubernetes):**
```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
spec:
  schedule: "0 1 * * *"  # 1 AM daily
  template:
    includedNamespaces:
      - production
    includedResources:
      - "*"
    snapshotVolumes: true
    ttl: 720h  # 30 days
```

## Failover Procedures

**Database Failover:**
```yaml
# Automated failover with Patroni
patroni:
  name: postgres01
  scope: postgres-cluster

  bootstrap:
    dcs:
      ttl: 30
      loop_wait: 10
      retry_timeout: 10
      maximum_lag_on_failover: 1048576

  postgresql:
    parameters:
      max_connections: 100
      shared_buffers: 256MB

# Failover process:
# 1. Patroni detects primary failure
# 2. Initiates leader election
# 3. Promotes replica to primary
# 4. Updates DNS/load balancer
# 5. Old primary rejoins as replica
```

**Application Failover:**
```yaml
# Multi-region with Route53 health checks
route53_failover:
  primary:
    region: us-east-1
    health_check:
      protocol: HTTPS
      path: /health
      interval: 30
      failure_threshold: 3

  secondary:
    region: us-west-2
    failover_mode: automatic
    activate_when: primary_unhealthy
```

## DR Testing

**DR Drill Schedule:**
```yaml
quarterly_dr_drill:
  week_1:
    - Review DR plan
    - Update runbooks
    - Verify backup integrity

  week_2:
    - Tabletop exercise
    - Walk through procedures
    - Identify gaps

  week_3:
    - Partial failover test
    - Test database recovery
    - Verify monitoring

  week_4:
    - Full DR drill
    - Complete failover
    - Document lessons learned
```

**DR Test Checklist:**
```markdown
- [ ] Backup restoration successful
- [ ] RTO met (< 4 hours)
- [ ] RPO met (< 1 hour data loss)
- [ ] All services operational
- [ ] Monitoring functional
- [ ] Logs accessible
- [ ] Team communication effective
- [ ] Runbooks accurate
- [ ] Action items documented
```

## Multi-Region Architecture

**Active-Passive:**
```
Primary Region (Active)  ─────┐
  - Handles all traffic       │
  - Database writes           │ Replication
                              │
Secondary Region (Passive)  ◄─┘
  - Standby for failover
  - Read replicas only
  - Activated manually
```

**Active-Active:**
```
Region 1 (Active)  ◄─────► Region 2 (Active)
  - 50% traffic              - 50% traffic
  - Full read/write          - Full read/write
  - Bi-directional sync      - Bi-directional sync
  - Auto-failover            - Auto-failover
```

**Implementation:**
```yaml
# Kubernetes multi-region with Cilium Cluster Mesh
clusters:
  us-east-1:
    role: primary
    services:
      - api-service
      - database (primary)
      - cache

  us-west-2:
    role: secondary
    services:
      - api-service (read-only)
      - database (replica)
      - cache

failover:
  automatic: true
  health_check_interval: 30s
  failover_threshold: 3
```

---

**Related Resources:**
- [incident-management.md](incident-management.md)
- [reliability-patterns.md](reliability-patterns.md)
