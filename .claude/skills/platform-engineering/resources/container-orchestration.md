# Container Orchestration with Kubernetes

Deep dive into Kubernetes architecture, workload patterns, networking, storage, and security best practices for production container orchestration.

## Table of Contents

- [Architecture](#architecture)
- [Workload Resources](#workload-resources)
- [Networking](#networking)
- [Storage](#storage)
- [Configuration Management](#configuration-management)
- [Security](#security)
- [Scaling](#scaling)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## Architecture

### Control Plane Components

**API Server:**
```yaml
# All cluster interactions go through API server
kubectl get pods          # → API Server
kubectl create -f app.yaml  # → API Server
kubectl delete deployment  # → API Server
```

**etcd:**
```
# Distributed key-value store for cluster state
/registry/pods/default/nginx-pod
/registry/deployments/production/api-service
/registry/services/default/frontend
```

**Scheduler:**
```
1. Watch for new pods with no assigned node
2. Evaluate constraints (resources, affinity, taints)
3. Score nodes for best fit
4. Bind pod to selected node
```

**Controller Manager:**
```
Node Controller:        Monitor node health
Replication Controller: Maintain desired replica count
Endpoint Controller:    Populate endpoint objects
Service Account Controller: Create default service accounts
```

### Node Components

**Kubelet:**
```
- Runs on each node
- Manages pod lifecycle
- Reports node and pod status
- Executes health checks
```

**Kube-proxy:**
```
- Maintains network rules
- Handles service networking
- Implements service load balancing
```

**Container Runtime:**
```
- containerd (most common)
- CRI-O
- Docker (deprecated, use containerd)
```

## Workload Resources

### Pods

**Simple Pod:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: nginx
    environment: production
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 80
      name: http
      protocol: TCP
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "500m"
    livenessProbe:
      httpGet:
        path: /healthz
        port: 80
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /ready
        port: 80
      initialDelaySeconds: 5
      periodSeconds: 5
```

**Multi-container Pod (Sidecar Pattern):**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-logging
spec:
  containers:
  # Main application
  - name: app
    image: myapp:1.0
    volumeMounts:
    - name: logs
      mountPath: /var/log/app

  # Logging sidecar
  - name: log-shipper
    image: fluent/fluent-bit:2.0
    volumeMounts:
    - name: logs
      mountPath: /var/log/app
      readOnly: true

  volumes:
  - name: logs
    emptyDir: {}
```

### Deployments

**Production Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
  labels:
    app: api-service
    team: platform
spec:
  replicas: 3
  revisionHistoryLimit: 10

  # Pod selection
  selector:
    matchLabels:
      app: api-service

  # Update strategy
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Allow 1 extra pod during update
      maxUnavailable: 0  # No downtime

  # Pod template
  template:
    metadata:
      labels:
        app: api-service
        version: v1.2.3
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      # Security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000

      # Service account
      serviceAccountName: api-service

      # Init containers
      initContainers:
      - name: migration
        image: api-service:v1.2.3
        command: ['npm', 'run', 'migrate']
        envFrom:
        - secretRef:
            name: database-credentials

      # Main containers
      containers:
      - name: api
        image: api-service:v1.2.3
        imagePullPolicy: IfNotPresent

        ports:
        - name: http
          containerPort: 8080
          protocol: TCP

        # Environment variables
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "8080"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url

        # Resource management
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "1000m"

        # Health checks
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

        # Startup probe (for slow-starting apps)
        startupProbe:
          httpGet:
            path: /health
            port: 8080
          failureThreshold: 30
          periodSeconds: 10

        # Volume mounts
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
        - name: cache
          mountPath: /app/cache

      # Volumes
      volumes:
      - name: config
        configMap:
          name: api-config
      - name: cache
        emptyDir:
          sizeLimit: 1Gi

      # Affinity rules
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api-service
              topologyKey: kubernetes.io/hostname
```

### StatefulSets

**Database StatefulSet:**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres

  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
          name: postgres

        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata

        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data

        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"

  # Volume claim templates (creates PVC per pod)
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

### DaemonSets

**Monitoring Agent:**
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter

  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true

      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.6.0
        args:
        - --path.procfs=/host/proc
        - --path.sysfs=/host/sys

        ports:
        - containerPort: 9100
          hostPort: 9100
          name: metrics

        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true

        resources:
          requests:
            memory: "50Mi"
            cpu: "50m"
          limits:
            memory: "100Mi"
            cpu: "200m"

      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys

      tolerations:
      - effect: NoSchedule
        operator: Exists
```

## Networking

### Services

**ClusterIP (Internal):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api-service
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
```

**LoadBalancer (External):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: production
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
```

**Headless Service (StatefulSet):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: databases
spec:
  clusterIP: None  # Headless
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### Ingress

**NGINX Ingress with TLS:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx

  tls:
  - hosts:
    - api.example.com
    - app.example.com
    secretName: app-tls-cert

  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80

  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

### Network Policies

**Restrict Pod Communication:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-service

  policyTypes:
  - Ingress
  - Egress

  # Ingress rules
  ingress:
  - from:
    # Allow from frontend pods
    - podSelector:
        matchLabels:
          app: frontend
    # Allow from ingress controller
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080

  # Egress rules
  egress:
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53

  # Allow database access
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

## Storage

### PersistentVolume and PersistentVolumeClaim

**PersistentVolume:**
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: data-pv-001
spec:
  capacity:
    storage: 100Gi
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: fast-ssd

  # AWS EBS
  awsElasticBlockStore:
    volumeID: vol-0123456789abcdef
    fsType: ext4
```

**PersistentVolumeClaim:**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: production
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
```

**Usage in Pod:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: myapp:1.0
    volumeMounts:
    - mountPath: /data
      name: app-data

  volumes:
  - name: app-data
    persistentVolumeClaim:
      claimName: app-data
```

### StorageClass

**Dynamic Provisioning:**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

## Configuration Management

### ConfigMaps

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  # Simple key-value
  LOG_LEVEL: "info"
  ENABLE_FEATURE_X: "true"

  # Configuration file
  nginx.conf: |
    server {
      listen 80;
      server_name _;

      location / {
        proxy_pass http://backend:8080;
      }
    }

  # JSON configuration
  config.json: |
    {
      "database": {
        "pool": {
          "min": 5,
          "max": 20
        }
      }
    }
```

### Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  username: admin
  password: super-secret-password
  url: postgresql://admin:super-secret-password@db:5432/myapp
```

**External Secrets Operator:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore

  target:
    name: database-credentials
    creationPolicy: Owner

  data:
  - secretKey: password
    remoteRef:
      key: prod/database/password
  - secretKey: username
    remoteRef:
      key: prod/database/username
```

## Security

### Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**Secure Pod:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault

  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL

    volumeMounts:
    - name: tmp
      mountPath: /tmp

  volumes:
  - name: tmp
    emptyDir: {}
```

### RBAC

**Service Account:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-service
  namespace: production
```

**Role:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: configmap-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]
```

**RoleBinding:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: api-service-configmap-reader
  namespace: production
subjects:
- kind: ServiceAccount
  name: api-service
  namespace: production
roleRef:
  kind: Role
  name: configmap-reader
  apiGroup: rbac.authorization.k8s.io
```

## Scaling

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service

  minReplicas: 3
  maxReplicas: 100

  metrics:
  # CPU-based scaling
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Memory-based scaling
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

  # Custom metrics (requires metrics server)
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"

  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 50
        periodSeconds: 30
```

## Best Practices

1. **Always set resource requests and limits**
2. **Implement health checks (liveness, readiness, startup)**
3. **Use namespaces for isolation**
4. **Run containers as non-root**
5. **Use read-only root filesystems**
6. **Implement network policies**
7. **Use secrets for sensitive data**
8. **Enable pod disruption budgets**
9. **Use multiple replicas for HA**
10. **Tag everything with labels**

## Anti-Patterns

❌ No resource limits (causes node resource exhaustion)
❌ Running as root user (security vulnerability)
❌ No health checks (pods stay in service when unhealthy)
❌ Latest image tag (not reproducible)
❌ Storing secrets in ConfigMaps
❌ No pod disruption budgets (maintenance causes downtime)
❌ Single replica for critical services
❌ No network policies (unrestricted pod communication)
❌ Privileged containers (security risk)
❌ Host network mode (unless required)

---

**Related Resources:**
- [infrastructure-as-code.md](infrastructure-as-code.md) - IaC patterns
- [service-mesh.md](service-mesh.md) - Advanced networking with Istio
- [platform-security.md](platform-security.md) - Security best practices
