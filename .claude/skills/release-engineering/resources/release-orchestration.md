# Release Orchestration

Multi-service deployments, dependency management, coordinated releases, and release coordination strategies.

## Multi-Service Deployment

**Helm Umbrella Chart:**
```yaml
# umbrella-chart/Chart.yaml
apiVersion: v2
name: myapp
version: 1.0.0
dependencies:
  - name: api-service
    version: "1.2.0"
    repository: "file://../api-service"
  - name: worker-service
    version: "1.1.0"
    repository: "file://../worker-service"
  - name: frontend
    version: "2.0.0"
    repository: "file://../frontend"
```

**Deploy Order:**
```bash
# 1. Deploy dependencies first
helm upgrade database ./charts/database

# 2. Deploy backend services
helm upgrade api-service ./charts/api-service
helm upgrade worker-service ./charts/worker-service

# 3. Deploy frontend last
helm upgrade frontend ./charts/frontend
```

## Dependency Management

**Service Dependencies:**
```yaml
# api-service depends on database
deployment:
  init_containers:
    - name: wait-for-db
      image: busybox
      command: ['sh', '-c', 'until nc -z postgres 5432; do sleep 1; done']
```

**ArgoCD Sync Waves:**
```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # Deploy first
---
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "2"  # Deploy second
```

## Release Coordination

**Feature Toggles for Coordination:**
```typescript
// Release both services, enable feature after both deployed
if (featureFlags.isEnabled('new-api-integration')) {
  // Use new API
} else {
  // Use old API
}
```

---

**Related Resources:**
- [deployment-strategies.md](deployment-strategies.md)
- [progressive-delivery.md](progressive-delivery.md)
