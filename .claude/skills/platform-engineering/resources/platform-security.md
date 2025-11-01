# Platform Security

Pod security standards, network policies, secrets management, vulnerability scanning, runtime security, and security best practices for Kubernetes platforms.

## Table of Contents

- [Pod Security Standards](#pod-security-standards)
- [Network Security](#network-security)
- [Secrets Management](#secrets-management)
- [Image Security](#image-security)
- [Runtime Security](#runtime-security)
- [Access Control](#access-control)
- [Security Monitoring](#security-monitoring)
- [Best Practices](#best-practices)

## Pod Security Standards

### Privileged Policy (Least Restrictive)

```yaml
# Allow all - NOT RECOMMENDED for production
apiVersion: v1
kind: Namespace
metadata:
  name: system
  labels:
    pod-security.kubernetes.io/enforce: privileged
```

### Baseline Policy (Minimally Restrictive)

```yaml
# Prevent known privilege escalations
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Restricted Policy (Most Secure - Production)

```yaml
# Enforce hardening best practices
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**Compliant Pod:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: production
spec:
  # Pod-level security
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
    supplementalGroups: [1000]

  # Service account (not default)
  serviceAccountName: app-service-account
  automountServiceAccountToken: false

  containers:
  - name: app
    image: app:1.0
    imagePullPolicy: Always

    # Container-level security
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
        - ALL

    # Resource limits (required)
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "256Mi"
        cpu: "500m"

    # Writable volumes
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /app/cache

  volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}
```

## Network Security

### Default Deny All Traffic

```yaml
# Block all ingress and egress by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### Allow DNS Only

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-access
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  # Allow DNS queries
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

### Microsegmentation

```yaml
# API service can only talk to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-to-database
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-service
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

  # Allow database access
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432

  # Allow external HTTPS (if needed)
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
```

### Ingress Controls

```yaml
# Only allow traffic from ingress controller
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
```

## Secrets Management

### Kubernetes Secrets (Encrypted at Rest)

```yaml
# Enable encryption at rest (kube-apiserver flag)
--encryption-provider-config=/etc/kubernetes/encryption-config.yaml

# encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
    - secrets
    providers:
    - aescbc:
        keys:
        - name: key1
          secret: <base64-encoded-32-byte-key>
    - identity: {}  # Fallback to plaintext
```

**Create Secret:**
```bash
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password='super-secret-password' \
  --namespace=production
```

### External Secrets Operator

**Install:**
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

**AWS Secrets Manager Integration:**
```yaml
# SecretStore for AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa

---
# External Secret
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
  - secretKey: username
    remoteRef:
      key: prod/database/username

  - secretKey: password
    remoteRef:
      key: prod/database/password

  - secretKey: connection-string
    remoteRef:
      key: prod/database/connection-string
```

**HashiCorp Vault Integration:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.company.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets-sa
```

### Sealed Secrets

```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Install kubeseal CLI
brew install kubeseal

# Create sealed secret
echo -n 'super-secret' | kubectl create secret generic db-password \
  --dry-run=client \
  --from-file=password=/dev/stdin \
  -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# Commit sealed secret to Git (safe to do)
git add sealed-secret.yaml
git commit -m "Add database password"
```

## Image Security

### Image Scanning with Trivy

```yaml
# Scan image before deployment
apiVersion: batch/v1
kind: Job
metadata:
  name: trivy-scan
spec:
  template:
    spec:
      containers:
      - name: trivy
        image: aquasec/trivy:latest
        command:
        - trivy
        - image
        - --exit-code
        - "1"  # Fail on vulnerabilities
        - --severity
        - CRITICAL,HIGH
        - --no-progress
        - company/api-service:v1.2.3
      restartPolicy: Never
```

**CI/CD Integration:**
```yaml
# .github/workflows/security-scan.yaml
name: Security Scan

on: [push]

jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Build image
      run: docker build -t ${{ github.repository }}:${{ github.sha }} .

    - name: Run Trivy scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: ${{ github.repository }}:${{ github.sha }}
        format: 'sarif'
        output: 'trivy-results.sarif'
        severity: 'CRITICAL,HIGH'

    - name: Upload results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
```

### Image Policy (Kyverno)

```yaml
# Only allow images from trusted registries
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  validationFailureAction: enforce
  background: false
  rules:
  - name: validate-registries
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Images must be from approved registries"
      pattern:
        spec:
          containers:
          - image: "registry.company.com/* | ghcr.io/company/*"

---
# Require image digest (not tags)
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-digest
spec:
  validationFailureAction: enforce
  rules:
  - name: check-image-digest
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Images must use digest (not tags)"
      pattern:
        spec:
          containers:
          - image: "*@sha256:*"
```

### Vulnerability Admission Controller

```yaml
# ImagePolicyWebhook admission controller
apiVersion: imagepolicy.k8s.io/v1alpha1
kind: ImageReview
spec:
  containers:
  - image: company/api-service:v1.2.3
  annotations:
    imagepolicy.k8s.io/policy: restricted
  namespace: production
```

## Runtime Security

### Falco Rules

```yaml
# Install Falco
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco \
  --namespace falco-system \
  --create-namespace \
  --set driver.kind=ebpf

# Custom rules
# /etc/falco/falco_rules.local.yaml
- rule: Unauthorized Process in Container
  desc: Detect unexpected process spawned in container
  condition: >
    spawned_process and
    container and
    not proc.name in (node, npm, python, java)
  output: >
    Unexpected process spawned in container
    (user=%user.name command=%proc.cmdline container=%container.name)
  priority: WARNING
  tags: [container, process]

- rule: Write to Non-Temp Directory
  desc: Detect writes to non-temporary directories
  condition: >
    open_write and
    container and
    not fd.name pmatch (/tmp/*, /var/tmp/*)
  output: >
    Write to non-temp directory in container
    (user=%user.name file=%fd.name container=%container.name)
  priority: WARNING
```

### AppArmor

```yaml
# Load AppArmor profile
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: localhost/k8s-apparmor-example
spec:
  containers:
  - name: app
    image: app:1.0
```

**AppArmor Profile:**
```
#include <tunables/global>

profile k8s-apparmor-example flags=(attach_disconnected) {
  #include <abstractions/base>

  # Allow network access
  network,

  # Allow reading from /tmp
  /tmp/** r,

  # Deny everything else by default
  deny /** w,
}
```

## Access Control

### RBAC Least Privilege

```yaml
# Read-only access to pods
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]

---
# Deploy-only access
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
  namespace: production
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "update", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]

---
# Bind to service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deployer
  namespace: production
subjects:
- kind: ServiceAccount
  name: github-actions
  namespace: production
roleRef:
  kind: Role
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io
```

### Audit Logging

```yaml
# Audit policy
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all requests at RequestResponse level
- level: RequestResponse
  omitStages:
  - RequestReceived
  verbs: ["create", "update", "patch", "delete"]

# Log metadata for reads
- level: Metadata
  verbs: ["get", "list", "watch"]

# Don't log these
- level: None
  users: ["system:kube-proxy"]
  verbs: ["watch"]
  resources:
  - group: ""
    resources: ["endpoints", "services"]
```

## Security Monitoring

### Prometheus Alerts

```yaml
# alerts.yaml
groups:
- name: security
  interval: 30s
  rules:
  # Alert on privileged pods
  - alert: PrivilegedPodDetected
    expr: |
      kube_pod_container_status_running == 1
      and
      kube_pod_security_context_privileged == 1
    for: 5m
    annotations:
      summary: "Privileged pod detected: {{ $labels.pod }}"

  # Alert on excessive RBAC permissions
  - alert: ExcessiveRBACPermissions
    expr: |
      kube_role_rules{verb="*"} > 0
    annotations:
      summary: "Role with wildcard permissions: {{ $labels.role }}"

  # Alert on failed auth attempts
  - alert: AuthenticationFailures
    expr: |
      rate(apiserver_audit_event_total{verb="create",objectRef_resource="serviceaccounts/token",responseStatus_code="401"}[5m]) > 5
    annotations:
      summary: "High rate of authentication failures"
```

## Best Practices

### 1. Defense in Depth

Implement multiple layers of security controls.

### 2. Least Privilege

Grant minimum necessary permissions.

### 3. Network Segmentation

Use network policies to restrict traffic.

### 4. Secrets Management

Never commit secrets to Git, use external secrets.

### 5. Image Security

Scan images, use trusted registries, require digests.

### 6. Runtime Protection

Monitor and detect anomalous behavior.

### 7. Regular Updates

Keep Kubernetes and all components updated.

### 8. Audit Everything

Enable comprehensive audit logging.

### 9. Immutable Infrastructure

Use read-only root filesystems.

### 10. Security as Code

Automate security testing in CI/CD.

---

**Related Resources:**
- [infrastructure-standards.md](infrastructure-standards.md) - Security baselines
- [container-orchestration.md](container-orchestration.md) - Pod security
- [multi-tenancy.md](multi-tenancy.md) - Isolation and RBAC
