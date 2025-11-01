# DevSecOps - Security Integration in Development

Comprehensive guide for integrating security throughout the software development lifecycle. Covers security scanning (SAST, DAST, SCA), container security, secrets management, compliance as code, policy enforcement, vulnerability management, and shift-left security practices.

## Purpose

Enable teams to build secure applications by integrating security practices into every phase of development, from code commit to production deployment.

## When to Use This Skill

Automatically activates when working on:
- Security scanning and vulnerability assessment
- Container and image security
- Secrets management and encryption
- Policy enforcement and compliance
- Security automation in CI/CD
- Threat modeling and security architecture
- Incident response and security monitoring

## Quick Start Checklist

When implementing DevSecOps practices:

- [ ] Integrate SAST/DAST scanning in CI/CD pipeline
- [ ] Implement container image scanning
- [ ] Set up secrets management (never commit secrets)
- [ ] Define security policies as code (OPA, Kyverno)
- [ ] Enable dependency scanning (SCA)
- [ ] Implement runtime security monitoring
- [ ] Configure security gates in deployment pipeline
- [ ] Document security requirements and controls
- [ ] Set up security alerting and incident response
- [ ] Conduct regular security reviews

## Core Concepts

### Shift-Left Security

**Traditional (Security at End):**
```
Develop → Build → Test → Security Review → Deploy
                              ↑
                       Found Issues Late!
```

**DevSecOps (Security Throughout):**
```
Develop (IDE security) →
Build (SAST, secrets scan) →
Test (DAST, dependency scan) →
Deploy (policy enforcement, runtime protection)
    ↓
Continuous Security Monitoring
```

### Security as Code

```yaml
# Security policies defined as code
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: security-baseline
spec:
  validationFailureAction: enforce
  rules:
  - name: no-privileged-containers
    match:
      resources:
        kinds:
        - Pod
    validate:
      message: "Privileged containers not allowed"
      pattern:
        spec:
          containers:
          - securityContext:
              privileged: false
```

### Security Scanning Types

```
SAST (Static Application Security Testing):
  - Analyzes source code
  - Finds coding vulnerabilities
  - Tools: SonarQube, Semgrep, CodeQL

DAST (Dynamic Application Security Testing):
  - Tests running application
  - Finds runtime vulnerabilities
  - Tools: OWASP ZAP, Burp Suite

SCA (Software Composition Analysis):
  - Scans dependencies
  - Finds known vulnerabilities
  - Tools: Snyk, Dependabot, Trivy

Container Security:
  - Scans container images
  - Base image vulnerabilities
  - Tools: Trivy, Grype, Clair

Secrets Scanning:
  - Detects hardcoded secrets
  - Prevents secret leaks
  - Tools: GitGuardian, TruffleHog
```

## Common Patterns

### Pattern 1: CI/CD Security Pipeline

```yaml
# .github/workflows/security.yaml
name: Security Scan

on: [push, pull_request]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0

    - name: TruffleHog Secret Scan
      uses: trufflesecurity/trufflehog@main
      with:
        path: ./
        base: main
        head: HEAD

  sast:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Run Semgrep
      uses: returntocorp/semgrep-action@v1
      with:
        config: >-
          p/security-audit
          p/secrets
          p/owasp-top-ten

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Run Snyk
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high

  container-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Build image
      run: docker build -t ${{ github.repository }}:${{ github.sha }} .

    - name: Run Trivy
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: ${{ github.repository }}:${{ github.sha }}
        format: 'sarif'
        severity: 'CRITICAL,HIGH'
        exit-code: '1'

  security-gate:
    needs: [secret-scan, sast, dependency-scan, container-scan]
    runs-on: ubuntu-latest
    steps:
    - name: Security gate passed
      run: echo "All security checks passed"
```

### Pattern 2: Policy as Code

```yaml
# OPA/Gatekeeper policy
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
```

### Pattern 3: Secrets Management

```yaml
# External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: app-secrets
  data:
  - secretKey: api-key
    remoteRef:
      key: secret/data/app
      property: api-key
  - secretKey: db-password
    remoteRef:
      key: secret/data/database
      property: password
```

## Resource Files

For detailed guidance on specific topics, see:

### Security Scanning
- **[security-scanning.md](resources/security-scanning.md)** - SAST, DAST, SCA implementation, tool comparisons, CI/CD integration
- **[container-security.md](resources/container-security.md)** - Image scanning, base image selection, vulnerability remediation, registry security
- **[dependency-management.md](resources/dependency-management.md)** - SCA tools, vulnerability tracking, automated updates, license compliance

### Access Control & Secrets
- **[secrets-management.md](resources/secrets-management.md)** - Vault, AWS Secrets Manager, External Secrets Operator, rotation strategies
- **[identity-access.md](resources/identity-access.md)** - IAM, RBAC, OIDC, service mesh authentication, zero trust
- **[encryption.md](resources/encryption.md)** - At-rest encryption, in-transit encryption, key management, certificate management

### Policy & Compliance
- **[policy-enforcement.md](resources/policy-enforcement.md)** - OPA, Gatekeeper, Kyverno, admission controllers, policy testing
- **[compliance-automation.md](resources/compliance-automation.md)** - Compliance frameworks (SOC2, PCI-DSS, HIPAA), automated audits
- **[security-standards.md](resources/security-standards.md)** - OWASP Top 10, CIS benchmarks, security baselines

### Monitoring & Response
- **[runtime-security.md](resources/runtime-security.md)** - Falco, runtime monitoring, anomaly detection, threat detection
- **[incident-response.md](resources/incident-response.md)** - Security incident playbooks, forensics, post-mortems

## Best Practices

### 1. Never Commit Secrets

```bash
# Use pre-commit hooks
# .pre-commit-config.yaml
repos:
- repo: https://github.com/trufflesecurity/trufflehog
  rev: v3.63.0
  hooks:
  - id: trufflehog
    name: TruffleHog
    entry: bash -c 'trufflehog git file://. --since-commit HEAD --only-verified --fail'
```

### 2. Scan Everything

- Source code (SAST)
- Dependencies (SCA)
- Container images
- Infrastructure as code
- Runtime behavior

### 3. Automate Security Testing

Integrate into CI/CD, fail fast on critical issues.

### 4. Least Privilege Access

Grant minimum necessary permissions.

### 5. Defense in Depth

Multiple layers of security controls.

### 6. Regular Updates

Keep dependencies and base images updated.

### 7. Security Monitoring

Continuous monitoring and alerting.

### 8. Incident Response Plan

Documented procedures for security incidents.

## Anti-Patterns to Avoid

❌ Security only at the end (too late, too expensive)
❌ Committing secrets to Git
❌ Ignoring vulnerability scan results
❌ Using outdated dependencies
❌ No runtime security monitoring
❌ Manual security processes
❌ Privileged containers in production
❌ Disabled security policies for convenience
❌ No security training for developers
❌ Security as blocker instead of enabler

## Common Tasks

### Task: Add Security Scanning to CI/CD

1. Choose scanning tools (SAST, SCA, container)
2. Add security jobs to CI/CD pipeline
3. Set severity thresholds
4. Configure notifications
5. Document remediation process

### Task: Implement Secrets Management

1. Choose secrets backend (Vault, AWS SM, etc.)
2. Migrate existing secrets
3. Implement External Secrets Operator
4. Set up rotation policies
5. Remove hardcoded secrets

### Task: Enforce Security Policies

1. Define security requirements
2. Write policies as code (OPA/Kyverno)
3. Test policies in non-production
4. Deploy to production clusters
5. Monitor policy violations

## Integration Points

This skill integrates with:
- **platform-engineering**: Infrastructure security, Kubernetes security
- **sre**: Incident response, monitoring, reliability
- **release-engineering**: Secure CI/CD pipelines, deployment gates
- **cloud-engineering**: Cloud security, IAM, encryption
- **systems-engineering**: OS hardening, network security

## Triggers and Activation

This skill activates when you:
- Work with security scanning tools
- Implement secrets management
- Define security policies
- Configure compliance frameworks
- Investigate security vulnerabilities
- Set up security monitoring

---

**Total Resources:** 11 detailed guides covering all aspects of DevSecOps
**Focus:** Shift-left security, automation, continuous improvement
**Maintained by:** Security team based on industry best practices and real-world implementations
