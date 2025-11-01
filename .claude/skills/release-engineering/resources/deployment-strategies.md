# Deployment Strategies

Blue-green deployment, canary releases, rolling updates, recreate strategy, and progressive deployment patterns.

## Blue-Green Deployment

**Concept:** Two identical environments, switch traffic instantly.

**Kubernetes Implementation:**
```yaml
# Blue deployment (current production)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-blue
  labels:
    version: blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
      - name: app
        image: myapp:v1.0.0

---
# Green deployment (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-green
  labels:
    version: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
      - name: app
        image: myapp:v2.0.0

---
# Service switches between blue and green
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
    version: blue  # Change to 'green' to switch
  ports:
  - port: 80
    targetPort: 8080
```

**Switch Script:**
```bash
# Deploy green
kubectl apply -f myapp-green.yaml

# Wait for green to be ready
kubectl wait --for=condition=available deployment/myapp-green

# Run smoke tests
./smoke-tests.sh http://myapp-green

# Switch traffic
kubectl patch service myapp -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor for 10 minutes
sleep 600

# If issues, rollback
# kubectl patch service myapp -p '{"spec":{"selector":{"version":"blue"}}}'

# Clean up old blue deployment
kubectl delete deployment myapp-blue
```

## Canary Deployment

**Concept:** Gradually shift traffic from old to new version.

**Flagger Configuration:**
```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
    - name: request-duration
      thresholdRange:
        max: 500
```

**Traffic Split Progression:**
```
Step 1: 10% canary, 90% primary
Step 2: 20% canary, 80% primary
Step 3: 30% canary, 70% primary
...
Final:  100% canary, 0% primary
```

## Rolling Update

**Kubernetes Native:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # Max 2 extra pods during update
      maxUnavailable: 1  # Max 1 pod down during update
  template:
    spec:
      containers:
      - name: app
        image: myapp:v2.0.0
```

**Update Process:**
```
Current:  [V1] [V1] [V1] [V1] [V1] [V1]
          [V1] [V1] [V1] [V1] [V1] [V2] [V2]  ← 2 new, 1 old terminating
          [V1] [V1] [V1] [V1] [V2] [V2]
          [V1] [V1] [V1] [V2] [V2] [V2]
          [V1] [V1] [V2] [V2] [V2] [V2]
          [V1] [V2] [V2] [V2] [V2] [V2]
New:      [V2] [V2] [V2] [V2] [V2] [V2]
```

## Recreate Strategy

**Use Case:** Database schema changes requiring downtime.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  strategy:
    type: Recreate  # Kill all old pods before creating new
```

## Strategy Comparison

| Strategy | Downtime | Rollback Speed | Resource Cost | Complexity |
|----------|----------|----------------|---------------|------------|
| Blue-Green | None | Instant | 2x (temporary) | Low |
| Canary | None | Gradual | 1.1-1.5x | Medium |
| Rolling | None | Medium | 1.1-1.5x | Low |
| Recreate | Yes | Fast | 1x | Very Low |

---

**Related Resources:**
- [progressive-delivery.md](progressive-delivery.md)
- [rollback-strategies.md](rollback-strategies.md)
