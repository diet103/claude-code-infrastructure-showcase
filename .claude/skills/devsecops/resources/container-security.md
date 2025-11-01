# Container Security

Comprehensive guide to securing container images and runtime environments, covering image scanning, base image selection, vulnerability remediation, distroless images, runtime security, and container best practices.

## Table of Contents

- [Overview](#overview)
- [Image Scanning](#image-scanning)
- [Base Image Selection](#base-image-selection)
- [Distroless Images](#distroless-images)
- [Runtime Security](#runtime-security)
- [Pod Security Standards](#pod-security-standards)
- [Image Signing and Verification](#image-signing-and-verification)
- [Container Hardening](#container-hardening)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## Overview

**Container Security Layers:**

```
┌────────────────────────────────────────────────┐
│          Supply Chain Security                 │
│   (Image signing, SBOM, provenance)           │
├────────────────────────────────────────────────┤
│          Build-Time Security                   │
│   (Base image, dependencies, scanning)        │
├────────────────────────────────────────────────┤
│          Registry Security                     │
│   (Access control, encryption, scanning)      │
├────────────────────────────────────────────────┤
│          Runtime Security                      │
│   (Falco, AppArmor, Seccomp, monitoring)     │
└────────────────────────────────────────────────┘
```

## Image Scanning

### Trivy Image Scanning

**Basic Scanning:**
```bash
# Scan image
trivy image nginx:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL nginx:latest

# Scan local Dockerfile
trivy config Dockerfile

# Scan and fail on vulnerabilities
trivy image --exit-code 1 --severity CRITICAL nginx:latest

# Generate SBOM
trivy image --format cyclonedx nginx:latest
```

**CI Integration:**
```yaml
# .github/workflows/container-scan.yml
name: Container Security Scan

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build image
        run: |
          docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Generate SBOM
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'cyclonedx'
          output: 'sbom.json'

      - name: Upload SBOM
        uses: actions/upload-artifact@v3
        with:
          name: sbom
          path: sbom.json
```

**Trivy Configuration:**
```yaml
# trivy.yaml
scan:
  security-checks:
    - vuln
    - config
    - secret

  severity:
    - CRITICAL
    - HIGH

vulnerability:
  type:
    - os
    - library

  ignore-unfixed: true

secret:
  config: .trivyignore-secrets
```

**Ignore File:**
```
# .trivyignore
# Temporary ignore for CVE with no fix available
CVE-2023-12345

# Ignore low severity in dev dependencies
CVE-2023-67890 npm:dev-dependency
```

### Grype Scanning

```bash
# Install Grype
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh

# Scan image
grype nginx:latest

# Only high/critical
grype nginx:latest --fail-on high

# Output formats
grype nginx:latest -o json > results.json
grype nginx:latest -o sarif > results.sarif
grype nginx:latest -o template -t grype-report.tmpl
```

### Snyk Container

```bash
# Authenticate
snyk auth

# Scan image
snyk container test nginx:latest

# Monitor image
snyk container monitor nginx:latest --project-name=nginx-prod

# Test Dockerfile
snyk container test nginx:latest --file=Dockerfile

# Get remediation advice
snyk container test nginx:latest --json | jq '.vulnerabilities[].remediation'
```

**GitHub Action:**
```yaml
- name: Snyk Container Scan
  uses: snyk/actions/docker@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    image: myapp:latest
    args: --severity-threshold=high --file=Dockerfile
```

## Base Image Selection

### Official vs Custom Images

**Official Images (Recommended):**
```dockerfile
# ✅ Good: Official images, well-maintained
FROM node:20-alpine
FROM python:3.11-slim
FROM nginx:1.25-alpine
FROM postgres:15-alpine
```

**Avoid:**
```dockerfile
# ❌ Bad: Unknown source, no security updates
FROM someuser/custom-node:latest
FROM random-image:v1
```

### Choosing the Right Variant

**Variants Comparison:**

| Variant | Size | Use Case | Security |
|---------|------|----------|----------|
| `alpine` | ~5MB | Production, minimal | Excellent |
| `slim` | ~50MB | Good balance | Very Good |
| `standard` | ~200MB | Dev, all tools | Good |
| `distroless` | ~20MB | Production, secure | Excellent |

**Examples:**

```dockerfile
# Alpine (smallest)
FROM node:20-alpine
# Size: ~50MB, Good for production

# Slim (balanced)
FROM python:3.11-slim
# Size: ~150MB, Common packages included

# Distroless (most secure)
FROM gcr.io/distroless/nodejs20-debian11
# Size: ~70MB, No shell, minimal attack surface
```

### Multi-Stage Builds

**Security Benefits:**
- Remove build tools from final image
- Smaller attack surface
- Reduced vulnerability count

```dockerfile
# Multi-stage build for security
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

COPY . .
RUN npm run build

# Final production image
FROM gcr.io/distroless/nodejs20-debian11
WORKDIR /app

# Copy only necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Non-root user (distroless default)
USER nonroot:nonroot

# Start app
CMD ["dist/index.js"]
```

**Comparison:**

```bash
# Standard build
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "index.js"]
# Result: 900MB, 200+ vulnerabilities

# Multi-stage + distroless
FROM node:20-alpine AS builder
# ... build steps
FROM gcr.io/distroless/nodejs20-debian11
# ... minimal copy
# Result: 150MB, 5 vulnerabilities
```

## Distroless Images

### What are Distroless Images?

**Traditional Image:**
```
Application
Node.js Runtime
Shell, Package Manager, Utils
Base OS (Debian/Alpine)
────────────────────
Size: 200MB
Attack Surface: Large
CVEs: 100+
```

**Distroless Image:**
```
Application
Node.js Runtime
Base OS (minimal)
────────────────────
Size: 70MB
Attack Surface: Minimal
CVEs: 5-10
```

### Using Distroless

**Node.js Example:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs20-debian11
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
USER nonroot:nonroot
CMD ["dist/index.js"]
```

**Python Example:**
```dockerfile
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt
COPY . .

FROM gcr.io/distroless/python3-debian11
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY --from=builder /app .
ENV PATH=/root/.local/bin:$PATH
USER nonroot:nonroot
CMD ["app.py"]
```

**Java Example:**
```dockerfile
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

FROM gcr.io/distroless/java17-debian11
WORKDIR /app
COPY --from=builder /app/target/app.jar .
USER nonroot:nonroot
CMD ["app.jar"]
```

### Debugging Distroless Images

**Problem:** No shell for debugging

**Solution 1: Debug Variant**
```dockerfile
# Use debug variant for troubleshooting
FROM gcr.io/distroless/nodejs20-debian11:debug
# Includes busybox shell
```

```bash
# Debug with docker exec
docker run -it --entrypoint=/busybox/sh myapp:debug
```

**Solution 2: Ephemeral Debug Container**
```bash
# Kubernetes ephemeral container
kubectl debug pod/myapp -it --image=busybox --target=myapp
```

## Runtime Security

### Falco Implementation

**Installation (Kubernetes):**
```yaml
# falco-helm-values.yaml
falco:
  rules_file:
    - /etc/falco/falco_rules.yaml
    - /etc/falco/falco_rules.local.yaml
    - /etc/falco/k8s_audit_rules.yaml

  json_output: true
  json_include_output_property: true

  priority: warning

falcosidekick:
  enabled: true
  webui:
    enabled: true
```

```bash
# Install via Helm
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

helm install falco falcosecurity/falco \
  --namespace falco --create-namespace \
  -f falco-helm-values.yaml
```

**Custom Falco Rules:**
```yaml
# custom-rules.yaml
- rule: Unauthorized Process in Container
  desc: Detect unauthorized processes running in containers
  condition: >
    spawned_process and
    container and
    not proc.name in (node, npm, python, java)
  output: >
    Unauthorized process started in container
    (user=%user.name process=%proc.name
    container=%container.name image=%container.image)
  priority: WARNING

- rule: Container Drift Detected
  desc: Detect file modifications in container
  condition: >
    evt.type = open and
    evt.dir = < and
    container and
    fd.name startswith /app/ and
    not proc.name in (node, npm)
  output: >
    File modified in running container
    (file=%fd.name process=%proc.name
    container=%container.name)
  priority: ERROR

- rule: Sensitive File Access
  desc: Detect access to sensitive files
  condition: >
    open_read and
    sensitive_files and
    not trusted_process
  output: >
    Sensitive file accessed
    (file=%fd.name process=%proc.name user=%user.name)
  priority: CRITICAL
```

### AppArmor Profiles

**Kubernetes with AppArmor:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secured-app
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: localhost/k8s-apparmor-example
spec:
  containers:
  - name: app
    image: nginx:alpine
    securityContext:
      allowPrivilegeEscalation: false
```

**AppArmor Profile:**
```
#include <tunables/global>

profile k8s-apparmor-example flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>

  # Allow network
  network inet tcp,
  network inet udp,

  # Deny all file writes except in specific directories
  deny /** w,
  /app/** rw,
  /tmp/** rw,

  # Deny process execution except allowed binaries
  deny /bin/** x,
  deny /usr/bin/** x,
  /usr/bin/node ix,

  # Deny capability
  deny capability sys_admin,
  deny capability net_admin,
}
```

### Seccomp Profiles

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": [
    "SCMP_ARCH_X86_64",
    "SCMP_ARCH_X86",
    "SCMP_ARCH_ARM64"
  ],
  "syscalls": [
    {
      "names": [
        "accept4", "bind", "listen", "connect", "socket",
        "read", "write", "open", "close", "stat",
        "fstat", "lstat", "poll", "epoll_wait",
        "rt_sigaction", "rt_sigprocmask", "clone",
        "execve", "wait4", "exit", "exit_group"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

**Using in Kubernetes:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secured-pod
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/restricted.json
  containers:
  - name: app
    image: myapp:latest
```

## Pod Security Standards

### Pod Security Levels

**Privileged (Unrestricted):**
```yaml
# No restrictions - avoid in production
```

**Baseline (Minimally Restrictive):**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: baseline-pod
spec:
  containers:
  - name: app
    image: nginx:alpine
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
      runAsNonRoot: true
```

**Restricted (Highly Restrictive - Recommended):**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: restricted-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault

  containers:
  - name: app
    image: nginx:alpine
    securityContext:
      allowPrivilegeEscalation: false
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop: ["ALL"]
      readOnlyRootFilesystem: true

    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /var/cache/nginx

  volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}
```

### Namespace-Level Enforcement

```yaml
# Enforce restricted standard for namespace
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Image Signing and Verification

### Cosign (Sigstore)

**Install Cosign:**
```bash
# Linux
wget https://github.com/sigstore/cosign/releases/download/v2.0.0/cosign-linux-amd64
chmod +x cosign-linux-amd64
mv cosign-linux-amd64 /usr/local/bin/cosign

# macOS
brew install cosign
```

**Generate Keys:**
```bash
# Generate key pair
cosign generate-key-pair

# Outputs:
# - cosign.key (private key - keep secure!)
# - cosign.pub (public key - distribute)
```

**Sign Image:**
```bash
# Sign image
cosign sign --key cosign.key myregistry.com/myapp:v1.0.0

# Keyless signing (OIDC)
cosign sign myregistry.com/myapp:v1.0.0

# Sign with annotations
cosign sign --key cosign.key \
  -a git_commit=$(git rev-parse HEAD) \
  -a build_date=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  myregistry.com/myapp:v1.0.0
```

**Verify Image:**
```bash
# Verify signature
cosign verify --key cosign.pub myregistry.com/myapp:v1.0.0

# Keyless verification
cosign verify \
  --certificate-identity=user@example.com \
  --certificate-oidc-issuer=https://github.com/login/oauth \
  myregistry.com/myapp:v1.0.0
```

**CI Integration:**
```yaml
# .github/workflows/sign-image.yml
name: Build and Sign Container

on:
  push:
    tags: [ 'v*' ]

jobs:
  build-sign:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write  # For keyless signing

    steps:
      - uses: actions/checkout@v3

      - name: Login to registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.ref_name }}

      - name: Install Cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign image
        run: |
          cosign sign --yes \
            ghcr.io/${{ github.repository }}:${{ github.ref_name }}
```

### Admission Controller Verification

**Kyverno Policy:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: enforce
  background: false
  rules:
  - name: verify-signature
    match:
      any:
      - resources:
          kinds:
          - Pod
    verifyImages:
    - imageReferences:
      - "myregistry.com/*"
      attestors:
      - entries:
        - keys:
            publicKeys: |-
              -----BEGIN PUBLIC KEY-----
              MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
              -----END PUBLIC KEY-----
```

## Container Hardening

### Minimal Dockerfile

```dockerfile
# ✅ Secure Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependency files
COPY --chown=nodejs:nodejs package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application
COPY --chown=nodejs:nodejs . .

# Build application
RUN npm run build

# Production image
FROM gcr.io/distroless/nodejs20-debian11
WORKDIR /app

# Copy from builder
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./

# Use non-root user
USER nonroot:nonroot

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://localhost:3000/health')"]

# Expose port
EXPOSE 3000

# Start application
CMD ["dist/index.js"]
```

### Security Best Practices

```dockerfile
# ❌ Bad practices
FROM ubuntu:latest  # Don't use 'latest'
RUN apt-get update  # Don't run as root
ADD http://example.com/file.tar.gz /  # Unsafe ADD
COPY secrets.env .  # Never copy secrets
RUN chmod 777 /app  # Overly permissive

# ✅ Good practices
FROM ubuntu:22.04  # Use specific versions
RUN apt-get update && apt-get install -y package \
    && rm -rf /var/lib/apt/lists/*  # Clean up
COPY --chown=user:user file.tar.gz /  # Use COPY, set ownership
# Use secret management, not files
RUN chmod 755 /app  # Minimal permissions
USER nonroot  # Run as non-root
```

## Best Practices

### 1. Use Minimal Base Images

```dockerfile
# Size and security comparison
alpine:       5 MB,  ~5 CVEs
distroless:   20 MB, ~3 CVEs
slim:         50 MB, ~15 CVEs
standard:     200 MB, ~50 CVEs
```

### 2. Multi-Stage Builds

Keep build tools out of production images.

### 3. Scan Images Regularly

```bash
# Scan on build
# Scan on schedule (weekly)
# Scan on new vulnerabilities
```

### 4. Sign Images

Verify image authenticity and integrity.

### 5. Run as Non-Root

```dockerfile
USER nonroot:nonroot
```

### 6. Drop Capabilities

```yaml
securityContext:
  capabilities:
    drop: ["ALL"]
```

### 7. Read-Only Root Filesystem

```yaml
securityContext:
  readOnlyRootFilesystem: true
```

### 8. Network Policies

Restrict container network access.

### 9. Resource Limits

Prevent resource exhaustion.

### 10. Runtime Monitoring

Use Falco or similar tools.

## Anti-Patterns

❌ **Using `latest` tag** - Unpredictable, not reproducible

❌ **Running as root** - Unnecessary privilege

❌ **Including secrets in image** - Exposed in layers

❌ **Not scanning images** - Unknown vulnerabilities

❌ **Privileged containers** - Full host access

❌ **No resource limits** - Resource exhaustion risk

❌ **Mutable containers** - Configuration drift

❌ **Ignoring CVEs** - "Won't fix" attitude

❌ **No signature verification** - Supply chain risk

❌ **Large images** - More vulnerabilities, slow deployments

---

**Related Resources:**
- [security-scanning.md](security-scanning.md) - Vulnerability scanning tools
- [supply-chain-security.md](supply-chain-security.md) - SBOM, provenance
- [policy-enforcement.md](policy-enforcement.md) - OPA, Kyverno policies
