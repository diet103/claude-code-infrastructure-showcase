# Compliance Automation

Automated compliance monitoring, audit automation, and adherence to frameworks including CIS Benchmarks, SOC 2, PCI-DSS, HIPAA, and GDPR.

## Table of Contents

- [Overview](#overview)
- [CIS Benchmarks](#cis-benchmarks)
- [SOC 2 Compliance](#soc-2-compliance)
- [PCI-DSS](#pci-dss)
- [HIPAA](#hipaa)
- [Compliance Tools](#compliance-tools)
- [Automated Auditing](#automated-auditing)
- [Best Practices](#best-practices)

## Overview

**Compliance Frameworks:**

```
┌──────────────────────────────────────────────────┐
│               Compliance Pyramid                 │
├──────────────────────────────────────────────────┤
│  Frameworks: SOC 2, PCI-DSS, HIPAA, GDPR        │
├──────────────────────────────────────────────────┤
│  Standards: CIS Benchmarks, NIST, ISO 27001     │
├──────────────────────────────────────────────────┤
│  Controls: Technical, Administrative, Physical   │
├──────────────────────────────────────────────────┤
│  Evidence: Logs, Scans, Tests, Documentation    │
└──────────────────────────────────────────────────┘
```

## CIS Benchmarks

### Docker CIS Benchmark

**Scan with Docker Bench:**
```bash
docker run --rm --net host --pid host --userns host --cap-add audit_control \
  -v /etc:/etc:ro \
  -v /usr/bin/containerd:/usr/bin/containerd:ro \
  -v /usr/bin/runc:/usr/bin/runc:ro \
  -v /usr/lib/systemd:/usr/lib/systemd:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  docker/docker-bench-security
```

### Kubernetes CIS Benchmark

**Using kube-bench:**
```bash
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml

# View results
kubectl logs job/kube-bench
```

**Sample Report:**
```
[INFO] 1 Master Node Security Configuration
[PASS] 1.1.1 Ensure that the API server pod specification file permissions are set to 644 or more restrictive
[PASS] 1.1.2 Ensure that the API server pod specification file ownership is set to root:root
[FAIL] 1.2.1 Ensure that the --anonymous-auth argument is set to false
[WARN] 1.2.5 Ensure that the --kubelet-certificate-authority argument is set as appropriate
```

**Remediation Script:**
```bash
#!/bin/bash
# Fix CIS benchmark failures

# 1.2.1 Disable anonymous auth
sed -i 's/--anonymous-auth=true/--anonymous-auth=false/' /etc/kubernetes/manifests/kube-apiserver.yaml

# 1.2.5 Set certificate authority
echo "    - --kubelet-certificate-authority=/etc/kubernetes/pki/ca.crt" >> /etc/kubernetes/manifests/kube-apiserver.yaml

systemctl restart kubelet
```

## SOC 2 Compliance

### Type I vs Type II

**Type I:** Point-in-time assessment
**Type II:** Controls over period (typically 3-12 months)

### Trust Service Criteria

1. **Security:** Protection against unauthorized access
2. **Availability:** System available for operation and use
3. **Processing Integrity:** System processing is complete, valid, accurate, timely
4. **Confidentiality:** Information designated as confidential is protected
5. **Privacy:** Personal information is collected, used, retained, disclosed, and disposed properly

### Implementation Example

**Access Control Policy:**
```yaml
# Kyverno policy for SOC 2 access control
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: soc2-access-control
  annotations:
    compliance: SOC2
    control: CC6.1
spec:
  validationFailureAction: enforce
  rules:
  - name: require-rbac
    match:
      any:
      - resources:
          kinds: [ServiceAccount]
    validate:
      message: "SOC 2 requires RBAC for all service accounts"
      pattern:
        metadata:
          annotations:
            rbac-configured: "true"
```

**Audit Logging:**
```yaml
# Enable Kubernetes audit logging (SOC 2 requirement)
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
spec:
  containers:
  - command:
    - kube-apiserver
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    - --audit-log-path=/var/log/kubernetes/audit.log
    - --audit-log-maxage=30
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=100
```

**Audit Policy:**
```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets", "configmaps"]

- level: RequestResponse
  verbs: ["create", "update", "patch", "delete"]

- level: Metadata
  omitStages: ["RequestReceived"]
```

## PCI-DSS

### Requirements

**PCI-DSS 12 Requirements:**
1. Install and maintain firewall configuration
2. Do not use vendor-supplied defaults
3. Protect stored cardholder data
4. Encrypt transmission of cardholder data
5. Protect all systems against malware
6. Develop and maintain secure systems
7. Restrict access to cardholder data
8. Identify and authenticate access
9. Restrict physical access
10. Track and monitor all access
11. Regularly test security systems
12. Maintain information security policy

### Network Segmentation

```yaml
# Isolate PCI environment with NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: pci-isolation
  namespace: payment-processing
spec:
  podSelector:
    matchLabels:
      pci-scope: in-scope
  policyTypes:
  - Ingress
  - Egress

  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          pci-zone: trusted
    ports:
    - protocol: TCP
      port: 443

  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          pci-zone: database
    ports:
    - protocol: TCP
      port: 5432
```

### Encryption

```yaml
# Require TLS for PCI workloads
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pci-require-tls
spec:
  validationFailureAction: enforce
  rules:
  - name: ingress-must-use-tls
    match:
      any:
      - resources:
          kinds: [Ingress]
          namespaces: [payment-processing]
    validate:
      message: "PCI-DSS requires TLS encryption"
      pattern:
        spec:
          tls:
          - hosts:
            - "?*"
```

### Access Logging

```yaml
# Falco rule for PCI access monitoring
- rule: Unauthorized Access to Cardholder Data
  desc: Detect unauthorized access to PCI data
  condition: >
    open_read and
    fd.name startswith "/data/cardholder/" and
    not proc.name in (authorized_processes)
  output: >
    Unauthorized access to cardholder data
    (user=%user.name process=%proc.name file=%fd.name)
  priority: CRITICAL
  tags: [pci-dss, requirement-10]
```

## HIPAA

### Technical Safeguards

**Access Control (164.312(a)(1)):**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: hipaa-access-control
spec:
  validationFailureAction: enforce
  rules:
  - name: require-unique-user-id
    match:
      any:
      - resources:
          kinds: [ServiceAccount]
          namespaces: [healthcare]
    validate:
      message: "HIPAA requires unique user identification"
      pattern:
        metadata:
          annotations:
            hipaa-uid: "?*"
```

**Audit Controls (164.312(b)):**
```yaml
# Audit all access to PHI
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: RequestResponse
  namespaces: [healthcare]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
  resources:
  - group: ""
    resources: ["secrets"]
    resourceNames: ["phi-*"]
```

**Integrity (164.312(c)(1)):**
```yaml
# Ensure data integrity with admission control
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: hipaa-data-integrity
spec:
  rules:
  - name: require-checksums
    match:
      any:
      - resources:
          kinds: [ConfigMap]
          selector:
            matchLabels:
              data-type: phi
    validate:
      message: "HIPAA requires data integrity controls"
      pattern:
        metadata:
          annotations:
            checksum: "?*"
```

**Encryption (164.312(a)(2)(iv)):**
```yaml
# Require encryption at rest
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: hipaa-encryption-at-rest
spec:
  validationFailureAction: enforce
  rules:
  - name: pvc-must-be-encrypted
    match:
      any:
      - resources:
          kinds: [PersistentVolumeClaim]
          namespaces: [healthcare]
    validate:
      message: "HIPAA requires encryption at rest for PHI"
      pattern:
        metadata:
          annotations:
            encrypted: "true"
```

## Compliance Tools

### Prowler (AWS)

```bash
# Install
pip install prowler

# Run full scan
prowler -M csv json html

# Specific compliance
prowler -c cis_1.5_aws
prowler -c hipaa
prowler -c pci_3.2.1_aws

# Custom checks
prowler -f us-east-1 -c check11,check12
```

### Prowler Kubernetes

```bash
prowler kubernetes --kubeconfig ~/.kube/config

# CIS Kubernetes Benchmark
prowler kubernetes -c cis_eks
```

### CloudSploit (Multi-Cloud)

```bash
npm install -g cloudsploit-scanner

# Run scan
cloudsploit scan --cloud aws \
  --compliance pci \
  --format json
```

### Chef InSpec

```ruby
# CIS Docker benchmark profile
describe docker_container('myapp') do
  it { should exist }
  it { should be_running }
  its('image') { should_not match /latest/ }
  its('user') { should_not eq 'root' }
end

describe file('/var/lib/docker') do
  it { should be_directory }
  its('mode') { should cmp '0700' }
  its('owner') { should eq 'root' }
end
```

```bash
# Run InSpec profile
inspec exec https://github.com/dev-sec/cis-docker-benchmark
```

## Automated Auditing

### Continuous Compliance Monitoring

**GitHub Actions:**
```yaml
name: Compliance Audit

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  compliance-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: CIS Docker Benchmark
        run: |
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            docker/docker-bench-security > docker-cis.txt

      - name: Kubernetes CIS Benchmark
        run: |
          kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml
          sleep 30
          kubectl logs job/kube-bench > k8s-cis.txt

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: compliance-reports
          path: |
            docker-cis.txt
            k8s-cis.txt

      - name: Check for Failures
        run: |
          if grep -q "\[FAIL\]" docker-cis.txt k8s-cis.txt; then
            echo "Compliance failures detected"
            exit 1
          fi
```

### Policy-as-Code Testing

```yaml
# test-policies.yaml
name: Policy Tests

on: [push, pull_request]

jobs:
  test-policies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Test OPA Policies
        run: |
          opa test policies/ -v

      - name: Test Kyverno Policies
        uses: kyverno/action-cli@v0.1.0
        with:
          command: test policies/

      - name: Validate Against Resources
        run: |
          kyverno apply policies/ --resource test-resources/
```

## Best Practices

### 1. Compliance as Code

Store all compliance policies in version control.

### 2. Continuous Monitoring

```yaml
# Daily compliance checks
schedule:
  - cron: '0 0 * * *'
```

### 3. Evidence Collection

```bash
# Automated evidence gathering
collect-evidence.sh:
  - Audit logs
  - Policy violations
  - Scan results
  - Configuration state
```

### 4. Remediation Tracking

```yaml
# Track remediation in issue tracker
- Issue: CIS-1.2.1-failure
  Control: Disable anonymous auth
  Status: In Progress
  DueDate: 2024-02-15
```

### 5. Regular Training

Document compliance requirements for developers.

---

**Related Resources:**
- [policy-enforcement.md](policy-enforcement.md) - OPA, Gatekeeper, Kyverno
- [security-monitoring.md](security-monitoring.md) - SIEM and detection
