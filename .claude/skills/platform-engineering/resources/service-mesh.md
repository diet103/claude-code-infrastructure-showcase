# Service Mesh

Advanced service-to-service communication with Istio and Linkerd, including traffic management, security policies, and observability.

## Table of Contents

- [Overview](#overview)
- [Istio Architecture](#istio-architecture)
- [Traffic Management](#traffic-management)
- [Security](#security)
- [Observability](#observability)
- [Linkerd](#linkerd)
- [Best Practices](#best-practices)

## Overview

### What is a Service Mesh?

```
Without Service Mesh         With Service Mesh
──────────────────           ─────────────────
Service A → Service B        Service A → Sidecar Proxy → Sidecar Proxy → Service B
                                        ↓                        ↓
                                   Control Plane          Control Plane
                                   (Policy, Telemetry, Config)
```

### Benefits

- **Traffic Management**: Advanced routing, load balancing, retries
- **Security**: mTLS, authorization policies
- **Observability**: Metrics, traces, logs
- **Resilience**: Circuit breaking, timeouts, retries

## Istio Architecture

### Components

```
┌─────────────────── Control Plane ───────────────────┐
│                                                      │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐          │
│  │  Pilot  │   │ Citadel │   │ Galley  │          │
│  │ (Config)│   │  (Cert) │   │ (Config)│          │
│  └─────────┘   └─────────┘   └─────────┘          │
│                                                      │
└──────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │ Pod     │   │ Pod     │   │ Pod     │
   │ ┌─────┐ │   │ ┌─────┐ │   │ ┌─────┐ │
   │ │ App │ │   │ │ App │ │   │ │ App │ │
   │ └─────┘ │   │ └─────┘ │   │ └─────┘ │
   │ ┌─────┐ │   │ ┌─────┐ │   │ ┌─────┐ │
   │ │Envoy│ │   │ │Envoy│ │   │ │Envoy│ │
   │ │Proxy│ │   │ │Proxy│ │   │ │Proxy│ │
   │ └─────┘ │   │ └─────┘ │   │ └─────┘ │
   └─────────┘   └─────────┘   └─────────┘
```

### Installation

```bash
# Download Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-*

# Install with demo profile
istioctl install --set profile=demo -y

# Enable sidecar injection for namespace
kubectl label namespace production istio-injection=enabled
```

**Production Installation:**
```yaml
# istio-operator.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-production
spec:
  profile: default

  # Control plane resources
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        replicaCount: 2

    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 1000m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 2Gi
          replicaCount: 3
          service:
            type: LoadBalancer

  # Mesh configuration
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0

  # Values override
  values:
    global:
      mtls:
        enabled: true
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 2000m
            memory: 1Gi
```

```bash
istioctl install -f istio-operator.yaml
```

## Traffic Management

### Virtual Service

**Basic Routing:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
  namespace: production
spec:
  hosts:
    - api-service
  http:
    - route:
        - destination:
            host: api-service
            subset: v1
```

**Weighted Routing (Canary):**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
    - api-service
  http:
    - route:
        # 90% to stable version
        - destination:
            host: api-service
            subset: v1
          weight: 90

        # 10% to canary version
        - destination:
            host: api-service
            subset: v2
          weight: 10
```

**Header-based Routing:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
    - api-service
  http:
    # Route beta users to v2
    - match:
        - headers:
            x-user-type:
              exact: beta
      route:
        - destination:
            host: api-service
            subset: v2

    # Everyone else to v1
    - route:
        - destination:
            host: api-service
            subset: v1
```

**URL Rewriting:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
    - api.example.com
  http:
    - match:
        - uri:
            prefix: /v1/
      rewrite:
        uri: /api/
      route:
        - destination:
            host: api-service
```

### Destination Rule

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service
  namespace: production
spec:
  host: api-service

  # Traffic policy
  trafficPolicy:
    # Load balancing
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id

    # Connection pool
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 2

    # Outlier detection (circuit breaker)
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 50

  # Subsets (versions)
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
      trafficPolicy:
        loadBalancer:
          simple: ROUND_ROBIN
```

### Gateway

**Ingress Gateway:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: public-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway

  servers:
    # HTTPS
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: api-tls-cert
      hosts:
        - api.example.com

    # HTTP redirect
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - api.example.com
      tls:
        httpsRedirect: true
```

**Virtual Service with Gateway:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-external
  namespace: production
spec:
  hosts:
    - api.example.com
  gateways:
    - istio-system/public-gateway
  http:
    - match:
        - uri:
            prefix: /api/
      route:
        - destination:
            host: api-service
            port:
              number: 8080
```

### Retries and Timeouts

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
    - api-service
  http:
    - route:
        - destination:
            host: api-service
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: 5xx,reset,connect-failure,refused-stream
```

## Security

### Mutual TLS

**Enable mTLS for namespace:**
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT  # STRICT, PERMISSIVE, or DISABLE
```

**Service-specific mTLS:**
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: api-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: DISABLE  # Disable mTLS for specific port
```

### Authorization Policies

**Deny All by Default:**
```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}
```

**Allow Specific Services:**
```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    # Allow from frontend service
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/frontend
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
```

**JWT Authentication:**
```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - api.example.com

---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
```

## Observability

### Metrics

**Prometheus Metrics:**
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-mesh
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: mixer
  endpoints:
    - port: prometheus
      interval: 15s
```

**Custom Metrics:**
```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      dimensions:
        request_path:
          value: request.path
        response_code:
          value: response.code
```

### Distributed Tracing

**Enable Tracing:**
```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 100.0
      customTags:
        environment:
          literal:
            value: production
```

### Access Logs

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: access-logs
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: response.code >= 400
```

## Linkerd

### Installation

```bash
# Install CLI
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh

# Verify cluster
linkerd check --pre

# Install Linkerd
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -

# Verify installation
linkerd check

# Enable viz extension
linkerd viz install | kubectl apply -f -
```

### Inject Linkerd Proxy

**Automatic injection:**
```bash
kubectl annotate namespace production linkerd.io/inject=enabled
```

**Manual injection:**
```bash
kubectl get deploy api-service -o yaml | linkerd inject - | kubectl apply -f -
```

### Traffic Split

```yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: api-service-split
  namespace: production
spec:
  service: api-service
  backends:
    - service: api-service-v1
      weight: 90
    - service: api-service-v2
      weight: 10
```

## Best Practices

### 1. Start Simple

Begin with automatic sidecar injection, add policies as needed.

### 2. Use Circuit Breakers

```yaml
outlierDetection:
  consecutiveErrors: 5
  interval: 30s
  baseEjectionTime: 30s
```

### 3. Enable mTLS Incrementally

Start with PERMISSIVE mode, move to STRICT after testing.

### 4. Monitor Resource Usage

Service mesh adds overhead. Monitor proxy CPU/memory usage.

### 5. Use Observability

Leverage built-in metrics, traces, and logs for debugging.

### 6. Implement Gradual Rollouts

Use weighted routing for canary deployments.

---

**Related Resources:**
- [container-orchestration.md](container-orchestration.md) - Kubernetes networking
- [platform-security.md](platform-security.md) - Security best practices
- [gitops-automation.md](gitops-automation.md) - Progressive delivery
