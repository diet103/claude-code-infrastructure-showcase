# On-Call Runbooks

Runbook structure, common scenarios, debugging procedures, escalation paths, and incident response playbooks.

## Runbook Template

```markdown
# Runbook: [Service Name] - [Issue Type]

## Overview
**Service:** api-service
**On-Call:** platform-team
**Severity:** SEV2
**Last Updated:** 2024-01-15

## Symptoms
- High API error rate (> 1%)
- Increased p95 latency (> 1s)
- Customer reports of failures

## Impact
- API requests failing
- Users unable to complete actions
- Revenue impact: $X/hour

## Diagnosis

### 1. Check Service Health
\`\`\`bash
# Check pod status
kubectl get pods -n production -l app=api-service

# Check recent logs
kubectl logs -n production -l app=api-service --tail=100

# Check metrics
curl https://grafana.example.com/d/api-health
\`\`\`

### 2. Check Dependencies
\`\`\`bash
# Database connectivity
psql -h db.example.com -U api -c "SELECT 1"

# Redis connectivity
redis-cli -h cache.example.com ping

# External API
curl https://external-api.example.com/health
\`\`\`

### 3. Check Recent Changes
\`\`\`bash
# Recent deployments
kubectl rollout history deployment/api-service -n production

# Recent config changes
git log --since="2 hours ago" -- config/
\`\`\`

## Common Causes

### Database Connection Pool Exhausted
**Symptoms:** Connection timeout errors
**Fix:**
\`\`\`bash
# Scale connection pool
kubectl set env deployment/api-service DB_POOL_SIZE=100

# Or restart pods to reset connections
kubectl rollout restart deployment/api-service
\`\`\`

### High Traffic Spike
**Symptoms:** All resources at capacity
**Fix:**
\`\`\`bash
# Scale up replicas
kubectl scale deployment/api-service --replicas=20

# Enable rate limiting
kubectl apply -f rate-limit-config.yaml
\`\`\`

### Downstream Service Failure
**Symptoms:** Timeouts to specific service
**Fix:**
\`\`\`bash
# Enable circuit breaker
kubectl apply -f circuit-breaker.yaml

# Or disable affected feature
kubectl set env deployment/api-service FEATURE_X_ENABLED=false
\`\`\`

## Mitigation Steps

1. **Immediate (< 5 minutes)**
   - Roll back recent deployment if applicable
   - Scale resources if needed
   - Enable circuit breakers

2. **Short-term (< 30 minutes)**
   - Identify root cause
   - Apply targeted fix
   - Monitor recovery

3. **Long-term (follow-up)**
   - Schedule postmortem
   - Implement preventive measures
   - Update runbook

## Escalation

- **L1 (Primary):** platform-team on-call
- **L2 (Secondary):** platform-team-lead
- **L3 (Manager):** Engineering Manager
- **External:** DBA team (for database issues)

## Related Runbooks
- [Database Connection Issues](runbook-db-connections.md)
- [High Traffic Handling](runbook-traffic-spike.md)
- [Deployment Rollback](runbook-rollback.md)

## Validation
After mitigation:
- [ ] Error rate < 0.1%
- [ ] Latency back to normal (< 200ms p95)
- [ ] All pods healthy
- [ ] No active alerts
- [ ] Customer impact resolved
\`\`\`

## Common Runbooks

**High Memory Usage:**
```markdown
# Diagnosis
kubectl top pods -n production
kubectl describe pod <pod-name>

# Check for memory leaks
curl http://pod-ip:9090/debug/pprof/heap

# Mitigation
kubectl set resources deployment/api-service --limits=memory=2Gi
kubectl rollout restart deployment/api-service
```

**Disk Space Full:**
```markdown
# Check disk usage
df -h

# Find large files
du -sh /* | sort -hr | head -10

# Clean up
docker system prune -a --volumes -f
kubectl delete pods --field-selector status.phase=Failed
```

---

**Related Resources:**
- [incident-management.md](incident-management.md)
- [observability-stack.md](observability-stack.md)
