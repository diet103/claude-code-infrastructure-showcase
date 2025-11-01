# Chaos Engineering

Chaos Monkey, fault injection, failure mode testing, Chaos Toolkit, Litmus Chaos, and resilience testing practices.

## Table of Contents

- [Principles](#principles)
- [Tools](#tools)
- [Experiments](#experiments)
- [Best Practices](#best-practices)

## Principles

**Chaos Engineering Principles:**
1. Build a hypothesis around steady state
2. Vary real-world events
3. Run experiments in production
4. Automate experiments
5. Minimize blast radius

## Tools

**Chaos Mesh (Kubernetes):**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-failure-example
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
    cron: "@every 2h"
```

**Network Chaos:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - production
    labelSelectors:
      app: api-service
  delay:
    latency: "100ms"
    correlation: "25"
    jitter: "10ms"
  duration: "5m"
```

**Litmus Chaos:**
```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: nginx-chaos
spec:
  appinfo:
    appns: 'default'
    applabel: 'app=nginx'
    appkind: 'deployment'
  chaosServiceAccount: litmus-admin
  experiments:
  - name: pod-delete
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: '30'
        - name: CHAOS_INTERVAL
          value: '10'
        - name: FORCE
          value: 'false'
```

## Experiments

**Pod Deletion Test:**
```bash
# Verify system handles pod failures
kubectl delete pod -l app=api-service --grace-period=0

# Expected outcome:
# - New pod starts automatically
# - No service interruption
# - Requests handled by other pods
```

**Database Failure Simulation:**
```yaml
# Simulate database connection issues
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: db-partition
spec:
  action: partition
  mode: all
  selector:
    namespaces:
      - production
    labelSelectors:
      app: api-service
  direction: to
  target:
    selector:
      namespaces:
        - production
      labelSelectors:
        app: postgres
  duration: "2m"
```

**CPU Stress Test:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress
spec:
  mode: one
  selector:
    namespaces:
      - production
    labelSelectors:
      app: api-service
  stressors:
    cpu:
      workers: 4
      load: 80
  duration: "5m"
```

## Best Practices

### 1. Start Small

```
Begin in dev/staging
Small blast radius
Short duration
Gradually increase scope
```

### 2. Define Success Criteria

```yaml
experiment:
  hypothesis: "API continues serving traffic during pod failure"
  success_criteria:
    - Error rate < 0.1%
    - P95 latency < 500ms
    - No customer impact
  failure_action: Rollback immediately
```

### 3. Automate Chaos

```yaml
# Regular chaos experiments
schedule:
  daily: Pod deletion
  weekly: Network latency
  monthly: Region failure simulation
```

### 4. Monitor During Experiments

```yaml
observability:
  - Real-time dashboards
  - Alert on anomalies
  - Correlate with experiment timeline
  - Document unexpected behavior
```

---

**Related Resources:**
- [reliability-patterns.md](reliability-patterns.md)
- [incident-management.md](incident-management.md)
