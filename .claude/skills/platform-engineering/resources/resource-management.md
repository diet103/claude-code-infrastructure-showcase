# Resource Management & Autoscaling

Resource requests/limits, horizontal pod autoscaling (HPA), vertical pod autoscaling (VPA), cluster autoscaling, and capacity planning for Kubernetes.

## Table of Contents

- [Resource Requests and Limits](#resource-requests-and-limits)
- [Horizontal Pod Autoscaler (HPA)](#horizontal-pod-autoscaler-hpa)
- [Vertical Pod Autoscaler (VPA)](#vertical-pod-autoscaler-vpa)
- [Cluster Autoscaler](#cluster-autoscaler)
- [KEDA Event-Driven Autoscaling](#keda-event-driven-autoscaling)
- [Capacity Planning](#capacity-planning)
- [Best Practices](#best-practices)

## Resource Requests and Limits

### Concepts

```
Requests: Minimum guaranteed resources
Limits:   Maximum resources pod can use

┌─────────────────────────────────────┐
│         Limit (1000m CPU)           │ ← Hard cap
├─────────────────────────────────────┤
│                                     │
│         Burstable Zone              │ ← Can use if available
│                                     │
├─────────────────────────────────────┤
│       Request (500m CPU)            │ ← Guaranteed
└─────────────────────────────────────┘
```

### QoS Classes

**Guaranteed (Highest Priority):**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "500m"
  limits:
    memory: "256Mi"  # Same as request
    cpu: "500m"      # Same as request
```

**Burstable (Medium Priority):**
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"  # Higher than request
    cpu: "1000m"     # Higher than request
```

**BestEffort (Lowest Priority):**
```yaml
# No requests or limits specified
resources: {}
```

### Production Examples

**CPU-Intensive Application:**
```yaml
spec:
  containers:
  - name: data-processor
    image: data-processor:1.0
    resources:
      requests:
        memory: "1Gi"
        cpu: "1000m"
      limits:
        memory: "2Gi"
        cpu: "2000m"
```

**Memory-Intensive Application:**
```yaml
spec:
  containers:
  - name: cache-server
    image: redis:7
    resources:
      requests:
        memory: "2Gi"
        cpu: "500m"
      limits:
        memory: "4Gi"
        cpu: "1000m"
```

**Low-Resource Service:**
```yaml
spec:
  containers:
  - name: webhook-receiver
    image: webhook:1.0
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "128Mi"
        cpu: "200m"
```

## Horizontal Pod Autoscaler (HPA)

### CPU-based Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service

  minReplicas: 3
  maxReplicas: 50

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Target 70% CPU
```

### Memory-based Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cache-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cache-service

  minReplicas: 2
  maxReplicas: 20

  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80  # Target 80% memory
```

### Custom Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service

  minReplicas: 5
  maxReplicas: 100

  metrics:
  # CPU metric
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Custom metric from pods
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"

  # Custom metric from service
  - type: Object
    object:
      metric:
        name: requests_per_second
      describedObject:
        apiVersion: v1
        kind: Service
        name: api-service
      target:
        type: Value
        value: "10000"

  # External metric (e.g., from SQS)
  - type: External
    external:
      metric:
        name: sqs_queue_length
        selector:
          matchLabels:
            queue_name: "processing-queue"
      target:
        type: AverageValue
        averageValue: "30"

  # Scaling behavior
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 min cooldown
      policies:
      - type: Percent
        value: 10   # Scale down max 10% at a time
        periodSeconds: 60
      - type: Pods
        value: 5    # Scale down max 5 pods at a time
        periodSeconds: 60
      selectPolicy: Min  # Use most conservative

    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
      policies:
      - type: Percent
        value: 50   # Scale up max 50% at a time
        periodSeconds: 30
      - type: Pods
        value: 10   # Scale up max 10 pods at a time
        periodSeconds: 30
      selectPolicy: Max  # Use most aggressive
```

## Vertical Pod Autoscaler (VPA)

### Installation

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

### VPA Configuration

**Auto Mode (Updates pods automatically):**
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-service-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service

  updatePolicy:
    updateMode: "Auto"  # Auto, Recreate, Initial, or Off

  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
      controlledResources: ["cpu", "memory"]
```

**Recommendation Mode (Dry-run):**
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-service-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service

  updatePolicy:
    updateMode: "Off"  # Only provide recommendations

  resourcePolicy:
    containerPolicies:
    - containerName: "*"  # All containers
      minAllowed:
        cpu: 50m
        memory: 64Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
```

**Check Recommendations:**
```bash
kubectl describe vpa api-service-vpa

# Output shows:
# - Lower Bound (minimum safe values)
# - Target (recommended values)
# - Uncapped Target (without max constraints)
# - Upper Bound (maximum values)
```

## Cluster Autoscaler

### AWS EKS

```yaml
# cluster-autoscaler-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.27.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/my-cluster
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
        env:
        - name: AWS_REGION
          value: us-east-1
        resources:
          limits:
            cpu: 100m
            memory: 600Mi
          requests:
            cpu: 100m
            memory: 600Mi
```

### Node Pool Configuration

**Multiple node pools for different workloads:**
```yaml
# General workloads
nodeSelector:
  workload-type: general

---
# Memory-intensive workloads
nodeSelector:
  workload-type: memory-optimized

---
# GPU workloads
nodeSelector:
  workload-type: gpu

tolerations:
- key: nvidia.com/gpu
  operator: Exists
  effect: NoSchedule
```

## KEDA Event-Driven Autoscaling

### Installation

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm install keda kedacore/keda --namespace keda --create-namespace
```

### Kafka Scaler

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: kafka-consumer
  minReplicaCount: 1
  maxReplicaCount: 50
  pollingInterval: 30
  cooldownPeriod: 300

  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka.kafka:9092
      consumerGroup: my-consumer-group
      topic: events
      lagThreshold: "100"
      offsetResetPolicy: latest
```

### AWS SQS Scaler

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-processor-scaler
spec:
  scaleTargetRef:
    name: queue-processor
  minReplicaCount: 0  # Scale to zero
  maxReplicaCount: 100

  triggers:
  - type: aws-sqs-queue
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456/my-queue
      queueLength: "30"  # Messages per pod
      awsRegion: "us-east-1"
    authenticationRef:
      name: aws-credentials
```

### Cron Scaler

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: scheduled-job-scaler
spec:
  scaleTargetRef:
    name: batch-processor
  minReplicaCount: 0
  maxReplicaCount: 20

  triggers:
  # Scale up before business hours
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 8 * * *    # 8 AM
      end: 0 18 * * *     # 6 PM
      desiredReplicas: "10"
```

## Capacity Planning

### Resource Utilization Analysis

```bash
# Node resource usage
kubectl top nodes

# Pod resource usage
kubectl top pods -A

# Namespace resource usage
kubectl top pods -n production | awk '{sum+=$2} END {print sum "m total CPU"}'
```

### Prometheus Queries

```promql
# Cluster CPU usage
sum(rate(container_cpu_usage_seconds_total[5m]))
/
sum(kube_node_status_allocatable{resource="cpu"})

# Cluster memory usage
sum(container_memory_working_set_bytes)
/
sum(kube_node_status_allocatable{resource="memory"})

# Pod resource requests vs limits
sum(kube_pod_container_resource_requests{resource="cpu"})
/
sum(kube_pod_container_resource_limits{resource="cpu"})

# Node pressure
kube_node_status_condition{condition="MemoryPressure",status="true"}
kube_node_status_condition{condition="DiskPressure",status="true"}
```

### Sizing Guidelines

**Small Workload:**
```yaml
requests:
  memory: "64Mi"
  cpu: "50m"
limits:
  memory: "128Mi"
  cpu: "200m"
```

**Medium Workload:**
```yaml
requests:
  memory: "256Mi"
  cpu: "250m"
limits:
  memory: "512Mi"
  cpu: "1000m"
```

**Large Workload:**
```yaml
requests:
  memory: "1Gi"
  cpu: "1000m"
limits:
  memory: "4Gi"
  cpu: "4000m"
```

## Best Practices

### 1. Always Set Requests

Even if you don't set limits, always set requests for scheduling.

### 2. Right-size Resources

Use VPA recommendations to optimize resource allocation.

### 3. Use HPA for Stateless Apps

Autoscale based on actual load metrics.

### 4. Monitor and Adjust

Regularly review resource usage and adjust.

### 5. PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-service
```

### 6. Resource Quotas

Set namespace quotas to prevent resource exhaustion.

### 7. Limit Ranges

Set default requests/limits for namespace.

---

**Related Resources:**
- [multi-tenancy.md](multi-tenancy.md) - Resource quotas
- [cost-optimization.md](cost-optimization.md) - Cost-efficient sizing
- [container-orchestration.md](container-orchestration.md) - Kubernetes fundamentals
