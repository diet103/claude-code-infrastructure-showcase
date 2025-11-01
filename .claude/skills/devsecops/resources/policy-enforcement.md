# Policy Enforcement - OPA, Gatekeeper, and Kyverno

Comprehensive guide to policy-as-code using Open Policy Agent (OPA), Gatekeeper, Kyverno, admission controllers, and compliance automation for Kubernetes and cloud infrastructure.

## Table of Contents

- [Overview](#overview)
- [Open Policy Agent (OPA)](#open-policy-agent-opa)
- [Gatekeeper](#gatekeeper)
- [Kyverno](#kyverno)
- [Admission Controllers](#admission-controllers)
- [Policy Testing](#policy-testing)
- [Common Policies](#common-policies)
- [Best Practices](#best-practices)

## Overview

**Policy as Code Benefits:**
- ✅ Automated enforcement
- ✅ Consistent across environments
- ✅ Version controlled
- ✅ Auditable and testable
- ✅ Shift-left security

## Open Policy Agent (OPA)

### Installation

```bash
# Linux/macOS
curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
chmod +x opa

# Docker
docker run -p 8181:8181 openpolicyagent/opa run --server
```

### Rego Language Basics

```rego
package example

# Simple rule
allow {
    input.user == "admin"
}

# Rule with conditions
allow {
    input.user.role == "developer"
    input.action == "read"
}

# Complex policy
deny[msg] {
    input.resource.type == "deployment"
    not input.resource.securityContext.runAsNonRoot
    msg := "Containers must run as non-root"
}
```

### Kubernetes Admission Control

```rego
# Policy: Block privileged containers
package kubernetes.admission

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    container.securityContext.privileged
    msg := sprintf("Privileged container not allowed: %v", [container.name])
}

# Policy: Require resource limits
deny[msg] {
    input.request.kind.kind == "Deployment"
    container := input.request.object.spec.template.spec.containers[_]
    not container.resources.limits.memory
    msg := sprintf("Container %v must have memory limits", [container.name])
}

# Policy: Enforce image registry
deny[msg] {
    input.request.kind.kind == "Pod"
    image := input.request.object.spec.containers[_].image
    not startswith(image, "myregistry.com/")
    msg := sprintf("Image must be from approved registry: %v", [image])
}
```

## Gatekeeper

### Installation

```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml
```

### Constraint Templates

**Block Privileged Containers:**
```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sblockprivileged
spec:
  crd:
    spec:
      names:
        kind: K8sBlockPrivileged
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sblockprivileged

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          container.securityContext.privileged
          msg := sprintf("Privileged container not allowed: %v", [container.name])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          container.securityContext.privileged
          msg := sprintf("Privileged init container not allowed: %v", [container.name])
        }
```

**Require Labels:**
```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels

        violation[{"msg": msg}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }
```

### Constraints

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sBlockPrivileged
metadata:
  name: block-privileged-containers
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces: ["kube-system"]
  enforcementAction: deny
```

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-standard-labels
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet"]
  parameters:
    labels:
      - "app"
      - "environment"
      - "owner"
```

### Mutation

```yaml
apiVersion: mutations.gatekeeper.sh/v1beta1
kind: Assign
metadata:
  name: add-default-labels
spec:
  applyTo:
    - groups: ["apps"]
      kinds: ["Deployment"]
      versions: ["v1"]
  location: "spec.template.metadata.labels.managed-by"
  parameters:
    assign:
      value: "gatekeeper"
```

## Kyverno

### Installation

```bash
kubectl create -f https://github.com/kyverno/kyverno/releases/download/v1.10.0/install.yaml
```

### Validation Policies

**Require Non-Root:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-non-root
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: validate-runAsNonRoot
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Containers must run as non-root user"
      pattern:
        spec:
          securityContext:
            runAsNonRoot: true
          containers:
          - securityContext:
              runAsNonRoot: true
```

**Block Latest Tag:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
spec:
  validationFailureAction: enforce
  rules:
  - name: require-image-tag
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Using 'latest' tag is not allowed"
      pattern:
        spec:
          containers:
          - image: "!*:latest"
```

**Require Resource Limits:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: enforce
  rules:
  - name: validate-resources
    match:
      any:
      - resources:
          kinds:
          - Deployment
    validate:
      message: "CPU and memory resources are required"
      pattern:
        spec:
          template:
            spec:
              containers:
              - resources:
                  requests:
                    memory: "?*"
                    cpu: "?*"
                  limits:
                    memory: "?*"
                    cpu: "?*"
```

### Mutation Policies

**Add Default Network Policy:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-networkpolicy
spec:
  rules:
  - name: default-deny-ingress
    match:
      any:
      - resources:
          kinds:
          - Namespace
    generate:
      kind: NetworkPolicy
      name: default-deny-ingress
      namespace: "{{request.object.metadata.name}}"
      data:
        spec:
          podSelector: {}
          policyTypes:
          - Ingress
```

**Inject Sidecar:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: inject-logging-sidecar
spec:
  rules:
  - name: add-fluentd-sidecar
    match:
      any:
      - resources:
          kinds:
          - Deployment
          selector:
            matchLabels:
              logging: enabled
    mutate:
      patchStrategicMerge:
        spec:
          template:
            spec:
              containers:
              - name: fluentd
                image: fluent/fluentd:v1.14
                volumeMounts:
                - name: logs
                  mountPath: /var/log
```

### Image Verification

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: enforce
  webhookTimeoutSeconds: 30
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
      - count: 1
        entries:
        - keys:
            publicKeys: |-
              -----BEGIN PUBLIC KEY-----
              MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
              -----END PUBLIC KEY-----
```

## Common Policies

### Security Policies

**Drop All Capabilities:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: drop-all-capabilities
spec:
  validationFailureAction: enforce
  rules:
  - name: drop-all
    match:
      any:
      - resources:
          kinds: [Pod]
    validate:
      message: "All capabilities must be dropped"
      pattern:
        spec:
          containers:
          - securityContext:
              capabilities:
                drop:
                - ALL
```

**Read-Only Root Filesystem:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: readonly-root-filesystem
spec:
  validationFailureAction: enforce
  rules:
  - name: validate-readOnlyRootFilesystem
    match:
      any:
      - resources:
          kinds: [Pod]
    validate:
      message: "Root filesystem must be read-only"
      pattern:
        spec:
          containers:
          - securityContext:
              readOnlyRootFilesystem: true
```

### Compliance Policies

**PCI-DSS Compliance:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pci-dss-compliance
  annotations:
    policies.kyverno.io/category: PCI-DSS
spec:
  validationFailureAction: enforce
  rules:
  - name: require-encryption-at-rest
    match:
      any:
      - resources:
          kinds: [PersistentVolumeClaim]
    validate:
      message: "PCI-DSS requires encryption at rest"
      pattern:
        metadata:
          annotations:
            encrypted: "true"

  - name: require-tls
    match:
      any:
      - resources:
          kinds: [Ingress]
    validate:
      message: "PCI-DSS requires TLS"
      pattern:
        spec:
          tls:
          - hosts:
            - "?*"
```

### Cost Optimization

**Limit Resource Usage:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: limit-resources
spec:
  validationFailureAction: enforce
  rules:
  - name: max-memory-limit
    match:
      any:
      - resources:
          kinds: [Deployment]
    validate:
      message: "Memory limit cannot exceed 8Gi"
      deny:
        conditions:
          any:
          - key: "{{request.object.spec.template.spec.containers[].resources.limits.memory}}"
            operator: GreaterThan
            value: 8Gi
```

## Policy Testing

### OPA Testing

```rego
# policy_test.rego
package kubernetes.admission

test_privileged_denied {
    deny["Privileged container not allowed: nginx"] with input as {
        "request": {
            "kind": {"kind": "Pod"},
            "object": {
                "spec": {
                    "containers": [{
                        "name": "nginx",
                        "securityContext": {"privileged": true}
                    }]
                }
            }
        }
    }
}

test_non_privileged_allowed {
    count(deny) == 0 with input as {
        "request": {
            "kind": {"kind": "Pod"},
            "object": {
                "spec": {
                    "containers": [{
                        "name": "nginx",
                        "securityContext": {"privileged": false}
                    }]
                }
            }
        }
    }
}
```

```bash
# Run tests
opa test policy.rego policy_test.rego -v
```

### Kyverno Testing

```bash
# Test policy against resource
kyverno apply policy.yaml --resource pod.yaml

# Test in cluster
kubectl create -f test-pod.yaml --dry-run=server
```

## Best Practices

### 1. Start with Audit Mode

```yaml
spec:
  validationFailureAction: audit  # Start here
  # After validation, change to: enforce
```

### 2. Exclude System Namespaces

```yaml
spec:
  match:
    any:
    - resources:
        kinds: [Pod]
    excludedNamespaces:
      - kube-system
      - kube-public
      - gatekeeper-system
```

### 3. Use Meaningful Messages

```yaml
validate:
  message: >
    Containers must run as non-root user for security.
    Set spec.securityContext.runAsNonRoot: true
```

### 4. Test Policies Before Enforcement

```bash
# Dry-run test
kubectl create -f resource.yaml --dry-run=server
```

### 5. Monitor Policy Violations

```bash
# Gatekeeper violations
kubectl get constraints -A

# Kyverno policy reports
kubectl get policyreport -A
```

---

**Related Resources:**
- [compliance-automation.md](compliance-automation.md) - Compliance frameworks
- [container-security.md](container-security.md) - Pod security standards
