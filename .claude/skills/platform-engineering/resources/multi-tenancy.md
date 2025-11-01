# Multi-Tenancy in Kubernetes

Namespace isolation, resource quotas, RBAC patterns, network policies, and cost allocation strategies for multi-tenant Kubernetes clusters.

## Table of Contents

- [Tenancy Models](#tenancy-models)
- [Namespace Isolation](#namespace-isolation)
- [Resource Quotas](#resource-quotas)
- [RBAC Patterns](#rbac-patterns)
- [Network Policies](#network-policies)
- [Cost Allocation](#cost-allocation)
- [Best Practices](#best-practices)

## Tenancy Models

### Namespace-per-Tenant

```
Cluster
├── tenant-acme/
│   ├── ResourceQuota
│   ├── NetworkPolicy
│   └── Workloads
├── tenant-globex/
│   ├── ResourceQuota
│   ├── NetworkPolicy
│   └── Workloads
└── tenant-initech/
    └── ...
```

**Pros:** Cost-effective, shared resources, easier management
**Cons:** Less isolation, noisy neighbors possible

### Cluster-per-Tenant

```
Tenant A → Dedicated Cluster
Tenant B → Dedicated Cluster
Tenant C → Dedicated Cluster
```

**Pros:** Strong isolation, dedicated resources
**Cons:** Higher cost, more operational overhead

### Virtual Clusters

```
Physical Cluster
├── vcluster-tenant-a (virtual cluster)
├── vcluster-tenant-b (virtual cluster)
└── vcluster-tenant-c (virtual cluster)
```

**Pros:** Balance of isolation and cost
**Cons:** Additional complexity

## Namespace Isolation

### Namespace Template

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-acme
  labels:
    tenant: acme
    environment: production
    cost-center: "12345"
  annotations:
    owner: "team-acme@company.com"
    description: "ACME Corp production namespace"
```

### LimitRange (Per-Pod Defaults)

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: tenant-limits
  namespace: tenant-acme
spec:
  limits:
    # Container defaults
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: 2000m
        memory: 4Gi
      min:
        cpu: 50m
        memory: 64Mi

    # Pod limits
    - type: Pod
      max:
        cpu: 4000m
        memory: 8Gi

    # PVC limits
    - type: PersistentVolumeClaim
      max:
        storage: 100Gi
      min:
        storage: 1Gi
```

## Resource Quotas

### Comprehensive Quota

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-acme-quota
  namespace: tenant-acme
spec:
  hard:
    # Compute
    requests.cpu: "100"
    requests.memory: 100Gi
    limits.cpu: "200"
    limits.memory: 200Gi

    # Storage
    requests.storage: 1Ti
    persistentvolumeclaims: "50"

    # Objects
    pods: "100"
    services: "50"
    configmaps: "100"
    secrets: "100"
    replicationcontrollers: "20"
    resourcequotas: "1"
    services.loadbalancers: "5"
    services.nodeports: "10"

    # Specific storage classes
    requests.storage: 500Gi
    gold.storageclass.storage.k8s.io/requests.storage: 100Gi
    silver.storageclass.storage.k8s.io/requests.storage: 400Gi
```

### Priority Class Quotas

```yaml
# Define priority classes
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: tenant-high-priority
value: 1000
globalDefault: false
description: "High priority for critical tenant workloads"

---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: tenant-low-priority
value: 100
globalDefault: true
description: "Low priority for batch workloads"

---
# Quota per priority
apiVersion: v1
kind: ResourceQuota
metadata:
  name: high-priority-quota
  namespace: tenant-acme
spec:
  hard:
    pods: "20"
    requests.cpu: "50"
    requests.memory: 50Gi
  scopeSelector:
    matchExpressions:
      - operator: In
        scopeName: PriorityClass
        values: ["tenant-high-priority"]
```

## RBAC Patterns

### Tenant Admin Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-admin
  namespace: tenant-acme
rules:
  # Full access to most resources
  - apiGroups: ["", "apps", "batch"]
    resources:
      - pods
      - pods/log
      - pods/exec
      - services
      - configmaps
      - secrets
      - deployments
      - statefulsets
      - daemonsets
      - jobs
      - cronjobs
    verbs: ["*"]

  # Read-only access to resource quotas
  - apiGroups: [""]
    resources:
      - resourcequotas
      - limitranges
    verbs: ["get", "list"]

  # No access to namespace itself
  # No access to RBAC resources
```

### Tenant Developer Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-developer
  namespace: tenant-acme
rules:
  # Read-write pods
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch", "create", "delete"]

  # Read-only deployments, services
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["get", "list", "watch"]

  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "watch"]

  # No secrets access
```

### Tenant Viewer Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-viewer
  namespace: tenant-acme
rules:
  - apiGroups: ["", "apps", "batch"]
    resources:
      - pods
      - pods/log
      - services
      - deployments
      - statefulsets
      - jobs
    verbs: ["get", "list", "watch"]
```

### RoleBindings

```yaml
# Bind tenant admin to team leads
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-admin-binding
  namespace: tenant-acme
subjects:
  - kind: Group
    name: team-acme-leads
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: tenant-admin
  apiGroup: rbac.authorization.k8s.io

---
# Bind developer role to team members
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-developer-binding
  namespace: tenant-acme
subjects:
  - kind: Group
    name: team-acme-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: tenant-developer
  apiGroup: rbac.authorization.k8s.io
```

### Service Account for CI/CD

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-deployer
  namespace: tenant-acme

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ci-deployer
  namespace: tenant-acme
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "patch", "update"]

  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deployer-binding
  namespace: tenant-acme
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: tenant-acme
roleRef:
  kind: Role
  name: ci-deployer
  apiGroup: rbac.authorization.k8s.io
```

## Network Policies

### Default Deny All

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: tenant-acme
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

### Allow DNS

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: tenant-acme
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

### Allow Within Namespace

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: tenant-acme
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}
```

### Allow From Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: tenant-acme
spec:
  podSelector:
    matchLabels:
      expose: "true"
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
```

### Cross-Tenant Communication

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-tenant-globex
  namespace: tenant-acme
spec:
  podSelector:
    matchLabels:
      app: shared-api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              tenant: globex
        - podSelector:
            matchLabels:
              app: client-service
      ports:
        - protocol: TCP
          port: 8080
```

## Cost Allocation

### Labeling Strategy

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-acme
  labels:
    tenant: acme
    cost-center: "12345"
    department: "engineering"
    environment: "production"
    region: "us-east-1"
```

**Apply to all resources:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: tenant-acme
  labels:
    tenant: acme
    cost-center: "12345"
    department: "engineering"
    environment: "production"
    application: "api-service"
spec:
  template:
    metadata:
      labels:
        tenant: acme
        cost-center: "12345"
        department: "engineering"
```

### Cost Monitoring

**Prometheus Query:**
```promql
# CPU cost per tenant
sum(
  rate(container_cpu_usage_seconds_total[5m])
  * on(namespace) group_left(tenant)
  kube_namespace_labels
) by (tenant)

# Memory cost per tenant
sum(
  container_memory_working_set_bytes
  * on(namespace) group_left(tenant)
  kube_namespace_labels
) by (tenant)

# Storage cost per tenant
sum(
  kube_persistentvolumeclaim_resource_requests_storage_bytes
  * on(namespace) group_left(tenant)
  kube_namespace_labels
) by (tenant)
```

### Kubecost Integration

```yaml
# Install Kubecost
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set kubecostToken="YOUR_TOKEN"

# Query costs by tenant
# http://localhost:9090/model/allocation
# ?window=7d
# &aggregate=namespace
# &filterNamespaces=tenant-*
```

### Chargeback Report

```bash
#!/bin/bash
# generate-tenant-report.sh

TENANT=$1
MONTH=$(date +%Y-%m)

kubectl cost \
  --namespace "tenant-${TENANT}" \
  --window "month" \
  --show-cpu \
  --show-memory \
  --show-storage \
  --show-network \
  > "reports/${TENANT}-${MONTH}.csv"
```

## Best Practices

### 1. Always Set Resource Quotas

Prevent resource exhaustion and enable cost allocation.

### 2. Use LimitRanges

Ensure all pods have resource requests/limits.

### 3. Default Deny Network Policies

Start with deny-all, explicitly allow what's needed.

### 4. Consistent Labeling

Use labels for cost allocation and organization.

### 5. Separate Environments

Consider different clusters or strict namespace isolation for prod vs dev.

### 6. Regular Audits

Review RBAC, quotas, and network policies regularly.

### 7. Document Tenant Onboarding

Standardize tenant provisioning with automation.

### 8. Monitor Quota Usage

Alert when tenants approach quota limits.

---

**Related Resources:**
- [resource-management.md](resource-management.md) - Resource optimization
- [cost-optimization.md](cost-optimization.md) - FinOps practices
- [platform-security.md](platform-security.md) - Security best practices
- [infrastructure-standards.md](infrastructure-standards.md) - Naming and tagging
