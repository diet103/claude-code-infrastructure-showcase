# Rollback Strategies

Automated rollback, manual rollback procedures, database rollback, and recovery strategies.

## Automated Rollback

**Kubernetes with Flagger:**
```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
spec:
  analysis:
    threshold: 5  # Rollback after 5 failed checks
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99  # Rollback if success rate < 99%
    - name: request-duration
      thresholdRange:
        max: 500  # Rollback if p95 > 500ms
```

## Manual Rollback

**Kubernetes:**
```bash
# Rollback to previous version
kubectl rollout undo deployment/myapp

# Rollback to specific revision
kubectl rollout history deployment/myapp
kubectl rollout undo deployment/myapp --to-revision=2

# Check rollback status
kubectl rollout status deployment/myapp
```

**Blue-Green Rollback:**
```bash
# Switch back to blue (old version)
kubectl patch service myapp -p '{"spec":{"selector":{"version":"blue"}}}'
```

## Database Rollback

**Backward Compatible Migrations:**
```sql
-- Step 1: Add new column (nullable)
ALTER TABLE users ADD COLUMN new_email VARCHAR(255);

-- Step 2: Backfill data
UPDATE users SET new_email = old_email;

-- Step 3: Make non-nullable (in next release)
-- ALTER TABLE users ALTER COLUMN new_email SET NOT NULL;

-- Step 4: Drop old column (in future release)
-- ALTER TABLE users DROP COLUMN old_email;
```

---

**Related Resources:**
- [deployment-strategies.md](deployment-strategies.md)
