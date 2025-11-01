---
description: Security review of infrastructure code
argument-hint: Path to infrastructure code or description of what to review
---

Perform a comprehensive security review of infrastructure code: $ARGUMENTS

## Review Checklist

### 1. Authentication & Authorization
- [ ] IAM policies follow least privilege
- [ ] Service accounts properly scoped
- [ ] No hardcoded credentials
- [ ] RBAC configured correctly
- [ ] MFA enabled for sensitive operations

### 2. Network Security
- [ ] Private subnets for sensitive resources
- [ ] Security groups/network policies restrictive
- [ ] No unnecessary public exposure
- [ ] Network segmentation implemented
- [ ] TLS/encryption in transit

### 3. Data Security
- [ ] Encryption at rest enabled
- [ ] Encryption keys properly managed
- [ ] Backup encryption configured
- [ ] Secrets management implemented
- [ ] No sensitive data in logs

### 4. Container Security
- [ ] Images from trusted registries
- [ ] Image scanning enabled
- [ ] No root containers
- [ ] Resource limits set
- [ ] Security contexts configured
- [ ] Read-only root filesystem

### 5. Compliance
- [ ] CIS benchmarks followed
- [ ] Regulatory requirements met (GDPR, HIPAA, etc.)
- [ ] Audit logging enabled
- [ ] Compliance policies as code

### 6. Supply Chain
- [ ] Dependencies scanned
- [ ] Artifacts signed
- [ ] SBOM generated
- [ ] Provenance tracking

## Output Format

Provide:
1. **Critical Issues** (must fix before deployment)
2. **High Priority** (fix within 1 week)
3. **Medium Priority** (fix within 1 month)
4. **Recommendations** (best practices)
5. **Code Examples** showing fixes
6. **Compliance Status** (which standards met/not met)

For each issue, include:
- Severity
- Description
- Impact
- Remediation steps
- Code example of fix
