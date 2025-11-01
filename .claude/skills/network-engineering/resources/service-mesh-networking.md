# Service Mesh Networking

Comprehensive guide to service mesh networking covering Istio and Linkerd architecture, traffic management, mTLS security, observability, circuit breaking, and advanced networking patterns.

## Table of Contents

- [Overview](#overview)
- [Service Mesh Architecture](#service-mesh-architecture)
- [Istio](#istio)
- [Linkerd](#linkerd)
- [Traffic Management](#traffic-management)
- [mTLS Security](#mtls-security)
- [Observability](#observability)
- [Resilience Patterns](#resilience-patterns)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## Overview

A service mesh provides infrastructure layer for service-to-service communication with features like traffic management, security, and observability without changing application code.

**Key Capabilities:**
- Traffic management (routing, load balancing)
- Security (mTLS, authorization)
- Observability (metrics, traces, logs)
- Resilience (retries, circuit breaking, timeouts)
- Policy enforcement

## Service Mesh Architecture

### Components

```
┌────────────────────────────────────────────┐
│         Control Plane                       │
│  (Policy, Config, Certificates)            │
│                                             │
│  Istiod / Linkerd Controller               │
└──────────────────┬─────────────────────────┘
                   │ Configuration
         ┌─────────┴─────────┬─────────────┐
         │                   │             │
    ┌────▼────┐         ┌────▼────┐   ┌────▼────┐
    │  Pod    │         │  Pod    │   │  Pod    │
    │┌───────┐│         │┌───────┐│   │┌───────┐│
    ││ Envoy ││         ││ Envoy ││   ││ Envoy ││
    ││Sidecar││         ││Sidecar││   ││Sidecar││
    │└───┬───┘│         │└───┬───┘│   │└───┬───┘│
    │┌───▼───┐│         │┌───▼───┐│   │┌───▼───┐│
    ││  App  ││         ││  App  ││   ││  App  ││
    │└───────┘│         │└───────┘│   │└───────┘│
    └─────────┘         └─────────┘   └─────────┘
         Data Plane
```

### Traffic Flow

```
Client Pod              Service Mesh             Server Pod
┌─────────┐            ┌──────────┐             ┌─────────┐
│  App    │            │          │             │  App    │
└────┬────┘            │          │             └────▲────┘
     │                 │          │                  │
┌────▼────┐   1.Out    │          │   3.In      ┌────┴────┐
│ Envoy   ├────────────┤  Envoy   ├─────────────┤ Envoy   │
│ Sidecar │            │  Proxy   │             │ Sidecar │
└────┬────┘   2.mTLS   │  Mesh    │   4.mTLS    └────▲────┘
     │        Encrypt  │          │   Decrypt        │
     └─────────────────┴──────────┴──────────────────┘
```

## Istio

### Installation

```bash
# Download Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.19.0

# Install with istioctl
istioctl install --set profile=production -y

# Enable sidecar injection
kubectl label namespace default istio-injection=enabled
```

### Configuration Profiles

```yaml
# Minimal profile (development)
istioctl install --set profile=minimal

# Default profile (production)
istioctl install --set profile=default

# Custom profile
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
spec:
  profile: production
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: true
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2048Mi
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 1000m
            memory: 1024Mi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
```

### Virtual Service (Traffic Routing)

```yaml
# Canary deployment (90/10 split)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews-vs
spec:
  hosts:
  - reviews
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: reviews
        subset: v2
  - route:
    - destination:
        host: reviews
        subset: v1
      weight: 90
    - destination:
        host: reviews
        subset: v2
      weight: 10

---
# URL-based routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-vs
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /v1/
    route:
    - destination:
        host: api-v1
        port:
          number: 8080
  - match:
    - uri:
        prefix: /v2/
    route:
    - destination:
        host: api-v2
        port:
          number: 8080
  - route:  # Default route
    - destination:
        host: api-v1
        port:
          number: 8080
```

### Destination Rule (Load Balancing)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews-dr
spec:
  host: reviews
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
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

### Gateway (Ingress)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: api-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: api-cert
    hosts:
    - api.example.com
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - api.example.com
    tls:
      httpsRedirect: true
```

### Service Entry (External Services)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - api.external.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS

---
# Database service entry
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-database
spec:
  hosts:
  - postgres.rds.amazonaws.com
  ports:
  - number: 5432
    name: postgres
    protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

### Fault Injection

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews-fault
spec:
  hosts:
  - reviews
  http:
  - match:
    - headers:
        x-test-user:
          exact: "qa"
    fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 5s
      abort:
        percentage:
          value: 10
        httpStatus: 500
    route:
    - destination:
        host: reviews
        subset: v1
```

## Linkerd

### Installation

```bash
# Install Linkerd CLI
curl -fsL https://run.linkerd.io/install | sh
export PATH=$PATH:$HOME/.linkerd2/bin

# Validate cluster
linkerd check --pre

# Install Linkerd
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -

# Verify installation
linkerd check

# Install Viz extension (observability)
linkerd viz install | kubectl apply -f -
```

### Inject Sidecar

```bash
# Auto-inject with annotation
kubectl annotate namespace default linkerd.io/inject=enabled

# Manual injection
kubectl get deploy/webapp -o yaml | linkerd inject - | kubectl apply -f -
```

### Server Authorization

```yaml
# Require authentication for specific service
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: api-server
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  port: http
  proxyProtocol: HTTP/2

---
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: api-auth
  namespace: production
spec:
  server:
    name: api-server
  client:
    meshTLS:
      serviceAccounts:
      - name: frontend
        namespace: production
```

### HTTPRoute (Traffic Splitting)

```yaml
apiVersion: policy.linkerd.io/v1beta2
kind: HTTPRoute
metadata:
  name: api-route
  namespace: production
spec:
  parentRefs:
  - name: api
    kind: Service
  rules:
  - matches:
    - path:
        value: /api/v1
    backendRefs:
    - name: api-v1
      port: 8080
      weight: 90
    - name: api-v2
      port: 8080
      weight: 10
```

### Service Profile (Retries, Timeouts)

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: api.production.svc.cluster.local
  namespace: production
spec:
  routes:
  - condition:
      method: GET
      pathRegex: /api/users/[^/]*
    name: GET /api/users/{id}
    isRetryable: true
    timeout: 10s
  - condition:
      method: POST
      pathRegex: /api/users
    name: POST /api/users
    timeout: 30s
  retryBudget:
    retryRatio: 0.2
    minRetriesPerSecond: 10
    ttl: 10s
```

## Traffic Management

### A/B Testing

```yaml
# Istio A/B testing based on user header
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ab-test
spec:
  hosts:
  - webapp
  http:
  - match:
    - headers:
        user-group:
          exact: "beta-testers"
    route:
    - destination:
        host: webapp
        subset: v2
  - route:
    - destination:
        host: webapp
        subset: v1
```

### Blue-Green Deployment

```yaml
# Initially all traffic to blue
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: blue-green
spec:
  hosts:
  - webapp
  http:
  - route:
    - destination:
        host: webapp
        subset: blue
      weight: 100
    - destination:
        host: webapp
        subset: green
      weight: 0

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: webapp-subsets
spec:
  host: webapp
  subsets:
  - name: blue
    labels:
      version: blue
  - name: green
    labels:
      version: green
```

### Traffic Mirroring (Shadow Traffic)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: traffic-mirror
spec:
  hosts:
  - api
  http:
  - route:
    - destination:
        host: api
        subset: v1
      weight: 100
    mirror:
      host: api
      subset: v2
    mirrorPercentage:
      value: 100.0
```

## mTLS Security

### Istio mTLS Configuration

```yaml
# Strict mTLS for entire namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT

---
# Permissive mode (for migration)
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: PERMISSIVE

---
# Disable mTLS for specific port
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: metrics-port
  namespace: production
spec:
  selector:
    matchLabels:
      app: api
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:  # Metrics port
      mode: DISABLE
```

### Authorization Policies

```yaml
# Deny all by default
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}

---
# Allow frontend to access api
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  selector:
    matchLabels:
      app: api
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/frontend"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]

---
# Allow specific HTTP methods
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: httpbin-viewer
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - to:
    - operation:
        methods: ["GET"]
    when:
    - key: request.auth.claims[group]
      values: ["viewers"]
```

## Observability

### Istio Telemetry

```yaml
# Enable access logs
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: access-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy

---
# Custom metrics
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: production
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        response_code:
          value: "response.code"
```

### Linkerd Metrics

```bash
# Top routes by traffic
linkerd viz top deploy/webapp

# Live request metrics
linkerd viz stat deploy

# Route metrics
linkerd viz routes deploy/webapp

# Tap live traffic
linkerd viz tap deploy/webapp

# Service profile metrics
linkerd viz routes svc/api --to svc/database
```

## Resilience Patterns

### Circuit Breaking

```yaml
# Istio circuit breaker
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: circuit-breaker
spec:
  host: api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 100
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutiveGatewayErrors: 5
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 1m
      maxEjectionPercent: 50
      minHealthPercent: 40
```

### Retries

```yaml
# Istio automatic retries
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-retry
spec:
  hosts:
  - api
  http:
  - route:
    - destination:
        host: api
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure,refused-stream
```

### Timeouts

```yaml
# Request timeout
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-timeout
spec:
  hosts:
  - api
  http:
  - route:
    - destination:
        host: api
    timeout: 10s
```

## Best Practices

1. **Enable mTLS** - Encrypt all service-to-service traffic
2. **Use strict authorization** - Default deny, explicit allow
3. **Implement circuit breakers** - Prevent cascade failures
4. **Set appropriate timeouts** - Avoid resource exhaustion
5. **Enable observability** - Metrics, traces, logs
6. **Use traffic mirroring** - Test new versions safely
7. **Implement retries carefully** - Avoid retry storms
8. **Resource limits** - Set CPU/memory for sidecars
9. **Monitor mesh health** - Control plane and data plane
10. **Gradual rollout** - Test mesh features incrementally

## Anti-Patterns

- **No mTLS** - Unencrypted service traffic
- **Permissive authorization** - All services can talk to all
- **No circuit breakers** - Cascade failures
- **Ignoring sidecar overhead** - Resource consumption
- **Complex traffic rules** - Hard to debug
- **No monitoring** - Can't detect mesh issues
- **Too many retries** - Amplifies failures
- **Injecting everything** - Not all workloads need mesh
- **Ignoring upgrades** - Security vulnerabilities
- **No rollback plan** - Mesh failures can be catastrophic
