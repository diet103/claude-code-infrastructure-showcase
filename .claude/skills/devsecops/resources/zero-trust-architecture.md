# Zero Trust Architecture

Service-to-service authentication with mTLS, network policies, identity-based access control, and zero-trust security model implementation.

## Table of Contents

- [Overview](#overview)
- [Service-to-Service Authentication](#service-to-service-authentication)
- [Network Policies](#network-policies)
- [Identity-Based Access](#identity-based-access)
- [Implementation](#implementation)

## Overview

**Zero Trust Principles:**

```
1. Never trust, always verify
2. Assume breach
3. Verify explicitly
4. Least privilege access
5. Microsegmentation
```

## Service-to-Service Authentication

### mTLS with Istio

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

### Certificate Management

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: service-cert
spec:
  secretName: service-tls
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
  dnsNames:
  - service.production.svc.cluster.local
```

## Network Policies

**Default Deny:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

**Allow Specific Traffic:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

## Identity-Based Access

### Workload Identity

**GKE:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  annotations:
    iam.gke.io/gcp-service-account: myapp@project.iam.gserviceaccount.com
```

**EKS:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/myapp
```

### SPIFFE/SPIRE

```bash
# Install SPIRE
kubectl apply -f https://spiffe.io/docs/latest/try/getting-started-k8s.yaml

# Create registration entry
spire-server entry create \
  -parentID spiffe://example.org/k8s-workload-registrar/node \
  -spiffeID spiffe://example.org/myapp \
  -selector k8s:ns:production \
  -selector k8s:pod-label:app:myapp
```

## Implementation

**Complete Zero Trust Setup:**
```yaml
# 1. Default deny network policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]

---
# 2. mTLS enforcement
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict-mtls
spec:
  mtls:
    mode: STRICT

---
# 3. Authorization policy
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
spec:
  selector:
    matchLabels:
      app: api
  rules:
  - from:
    - source:
        requestPrincipals: ["*"]
    when:
    - key: request.auth.claims[iss]
      values: ["https://auth.example.com"]
```

---

**Related Resources:**
- [container-security.md](container-security.md)
- [policy-enforcement.md](policy-enforcement.md)
