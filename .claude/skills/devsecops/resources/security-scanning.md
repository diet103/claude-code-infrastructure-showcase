# Security Scanning - SAST, DAST, and SCA

Comprehensive guide to implementing security scanning throughout the development lifecycle using Static Application Security Testing (SAST), Dynamic Application Security Testing (DAST), and Software Composition Analysis (SCA).

## Table of Contents

- [Overview](#overview)
- [SAST - Static Application Security Testing](#sast---static-application-security-testing)
- [DAST - Dynamic Application Security Testing](#dast---dynamic-application-security-testing)
- [SCA - Software Composition Analysis](#sca---software-composition-analysis)
- [Tool Comparison](#tool-comparison)
- [CI/CD Integration](#cicd-integration)
- [Scan Result Management](#scan-result-management)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## Overview

**Security Scanning Types:**

```
┌─────────────────────────────────────────────────────┐
│                 Security Scanning                    │
├─────────────────┬──────────────────┬────────────────┤
│      SAST       │       DAST       │      SCA       │
│  Source Code    │  Running App     │  Dependencies  │
│   Analysis      │    Testing       │   Scanning     │
├─────────────────┼──────────────────┼────────────────┤
│ • Semgrep       │ • OWASP ZAP      │ • Snyk         │
│ • SonarQube     │ • Burp Suite     │ • Trivy        │
│ • CodeQL        │ • Nuclei         │ • Dependabot   │
│ • Checkmarx     │ • Arachni        │ • FOSSA        │
└─────────────────┴──────────────────┴────────────────┘
```

**When to Use Each:**
- **SAST**: During development and build phases (pre-commit, CI)
- **DAST**: After deployment to test environment
- **SCA**: Continuously (dependencies change frequently)

## SAST - Static Application Security Testing

### What is SAST?

Analyzes source code to find security vulnerabilities without executing the program.

**Strengths:**
- Early detection (shift-left)
- Full code coverage
- No running application needed
- Finds coding mistakes

**Limitations:**
- False positives
- No runtime context
- Configuration-dependent vulnerabilities missed

### Semgrep Implementation

**Installation:**
```bash
# Install via pip
pip install semgrep

# Or via Homebrew
brew install semgrep
```

**Basic Usage:**
```bash
# Scan current directory with security rules
semgrep --config=auto .

# Use specific rulesets
semgrep --config="p/security-audit" \
        --config="p/owasp-top-ten" \
        --config="p/secrets" .

# JSON output for automation
semgrep --config=auto --json -o results.json .

# Only show high/critical findings
semgrep --config=auto --severity=ERROR .
```

**Custom Rules:**
```yaml
# .semgrep/rules/sql-injection.yaml
rules:
  - id: sql-injection-risk
    patterns:
      - pattern: |
          db.query($SQL + $INPUT)
      - pattern-not: |
          db.query($SQL, [...])
    message: |
      Potential SQL injection vulnerability.
      Use parameterized queries instead.
    languages: [javascript, typescript]
    severity: ERROR
    metadata:
      cwe: "CWE-89: SQL Injection"
      owasp: "A03:2021 - Injection"
```

**CI Integration (GitHub Actions):**
```yaml
# .github/workflows/semgrep.yml
name: Semgrep SAST

on:
  pull_request: {}
  push:
    branches: [main, develop]

jobs:
  semgrep:
    name: Scan with Semgrep
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
            p/nodejs
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: semgrep.sarif
```

### SonarQube Implementation

**Docker Setup:**
```yaml
# docker-compose.yml
version: '3'
services:
  sonarqube:
    image: sonarqube:community
    ports:
      - "9000:9000"
    environment:
      - SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs

volumes:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:
```

**Project Configuration:**
```properties
# sonar-project.properties
sonar.projectKey=my-project
sonar.projectName=My Project
sonar.projectVersion=1.0

sonar.sources=src
sonar.tests=tests
sonar.exclusions=**/node_modules/**,**/*.test.ts

# Language-specific
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.lcov.reportPaths=coverage/lcov.info

# Quality gates
sonar.qualitygate.wait=true
```

**Scan Execution:**
```bash
# Install scanner
npm install -g sonarqube-scanner

# Run scan
sonar-scanner \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=$SONAR_TOKEN

# Or using Docker
docker run --rm \
  -e SONAR_HOST_URL=http://sonarqube:9000 \
  -e SONAR_LOGIN=$SONAR_TOKEN \
  -v "$PWD:/usr/src" \
  sonarsource/sonar-scanner-cli
```

### GitHub CodeQL

```yaml
# .github/workflows/codeql.yml
name: "CodeQL"

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
      contents: read

    strategy:
      matrix:
        language: [ 'javascript', 'typescript', 'python' ]

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: ${{ matrix.language }}
          queries: security-extended,security-and-quality

      - name: Autobuild
        uses: github/codeql-action/autobuild@v2

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          category: "/language:${{ matrix.language }}"
```

## DAST - Dynamic Application Security Testing

### OWASP ZAP

**Docker Run:**
```bash
# Baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://example.com \
  -r zap-report.html

# Full scan
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t https://example.com \
  -r zap-full-report.html

# API scan
docker run -t owasp/zap2docker-stable zap-api-scan.py \
  -t https://api.example.com/openapi.json \
  -f openapi \
  -r zap-api-report.html
```

**CI Integration:**
```yaml
# .github/workflows/dast.yml
name: DAST Scan

on:
  schedule:
    - cron: '0 2 * * *'  # Nightly
  workflow_dispatch:

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - name: ZAP Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'https://staging.example.com'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: zap-report
          path: report_html.html
```

**ZAP Rules Configuration:**
```tsv
# .zap/rules.tsv
# Format: rule-id  WARN|FAIL|IGNORE  description
10038	WARN	Content-Type header missing
10055	FAIL	CSP header missing
10096	WARN	Timestamp disclosure
40012	FAIL	Cross-Site Scripting
40014	FAIL	Cross-Site Request Forgery
90022	FAIL	SQL Injection
```

### Nuclei

**Installation:**
```bash
go install -v github.com/projectdiscovery/nuclei/v2/cmd/nuclei@latest
```

**Usage:**
```bash
# Update templates
nuclei -update-templates

# Scan single target
nuclei -u https://example.com

# Scan with specific severity
nuclei -u https://example.com -severity critical,high

# Use specific templates
nuclei -u https://example.com -t cves/ -t vulnerabilities/

# Output to file
nuclei -u https://example.com -json -o results.json
```

**Custom Template:**
```yaml
# custom-check.yaml
id: api-key-exposure

info:
  name: API Key Exposure
  severity: high
  description: Checks for exposed API keys

http:
  - method: GET
    path:
      - "{{BaseURL}}/config.json"
      - "{{BaseURL}}/.env"

    matchers-condition: or
    matchers:
      - type: regex
        regex:
          - "api[_-]?key['\"]?\\s*[:=]\\s*['\"]?[a-zA-Z0-9]{32,}"
          - "secret[_-]?key['\"]?\\s*[:=]\\s*['\"]?[a-zA-Z0-9]{32,}"
        part: body
```

## SCA - Software Composition Analysis

### Snyk

**Installation:**
```bash
npm install -g snyk

# Authenticate
snyk auth
```

**Scanning:**
```bash
# Scan project dependencies
snyk test

# Test with severity threshold
snyk test --severity-threshold=high

# Monitor project (continuous monitoring)
snyk monitor

# Test container images
snyk container test nginx:latest

# Test IaC
snyk iac test ./terraform/
```

**GitHub Integration:**
```yaml
# .github/workflows/snyk.yml
name: Snyk Security

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Upload results to GitHub
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: snyk.sarif
```

**Snyk Policy File:**
```yaml
# .snyk
version: v1.19.0

# Ignore specific vulnerabilities
ignore:
  SNYK-JS-AXIOS-6032459:
    - '*':
        reason: Fix not available, mitigation in place
        expires: 2024-12-31

# Patch rules
patch:
  'npm:qs:20140806':
    - express > qs:
        patched: '2023-01-15T00:00:00.000Z'
```

### Trivy

**Installation:**
```bash
# Linux
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy

# macOS
brew install trivy
```

**Usage:**
```bash
# Scan filesystem
trivy fs .

# Scan container image
trivy image nginx:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL nginx:latest

# Scan IaC
trivy config ./terraform/

# Kubernetes manifest scan
trivy k8s --report summary cluster

# Output formats
trivy image --format json nginx:latest
trivy image --format sarif nginx:latest
```

**CI Integration:**
```yaml
# .github/workflows/trivy.yml
name: Trivy Security Scan

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Trivy vulnerability scanner in fs mode
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy results to GitHub
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

## Tool Comparison

### Feature Matrix

| Tool | Type | Languages | CI Integration | Cost | Best For |
|------|------|-----------|----------------|------|----------|
| Semgrep | SAST | 30+ | Excellent | Free/Paid | Fast, customizable rules |
| SonarQube | SAST | 25+ | Good | Free/Paid | Code quality + security |
| CodeQL | SAST | 10+ | GitHub | Free (public) | Deep analysis |
| ZAP | DAST | All | Good | Free | Web app testing |
| Nuclei | DAST | All | Excellent | Free | Fast, template-based |
| Snyk | SCA | All | Excellent | Free/Paid | Developer-friendly |
| Trivy | SCA | All | Excellent | Free | Containers, IaC |

### Selection Guide

**For Small Teams:**
```
SAST:  Semgrep (free, fast)
DAST:  ZAP baseline scans
SCA:   Trivy (comprehensive, free)
```

**For Enterprise:**
```
SAST:  SonarQube + CodeQL
DAST:  ZAP full scan + Burp Suite Pro
SCA:   Snyk (with monitoring)
```

**For Startups:**
```
SAST:  GitHub CodeQL (built-in)
DAST:  Nuclei (fast, automated)
SCA:   Dependabot + Trivy
```

## CI/CD Integration

### Complete Security Pipeline

```yaml
# .github/workflows/security-pipeline.yml
name: Security Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  secret-scan:
    name: Secret Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

  sast:
    name: SAST Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: p/security-audit

      - name: CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript,typescript

      - uses: github/codeql-action/autobuild@v2
      - uses: github/codeql-action/analyze@v2

  sca:
    name: Dependency Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'

  container-scan:
    name: Container Scanning
    runs-on: ubuntu-latest
    needs: [sast, sca]
    steps:
      - uses: actions/checkout@v3

      - name: Build image
        run: docker build -t ${{ github.repository }}:${{ github.sha }} .

      - name: Trivy Image Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ github.repository }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-image.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

  security-gate:
    name: Security Gate
    runs-on: ubuntu-latest
    needs: [secret-scan, sast, sca, container-scan]
    steps:
      - name: All security checks passed
        run: echo "✅ Security gate passed"
```

### GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - security-scan
  - security-gate

include:
  - template: Security/SAST.gitlab-ci.yml
  - template: Security/Dependency-Scanning.gitlab-ci.yml
  - template: Security/Container-Scanning.gitlab-ci.yml

semgrep-sast:
  stage: security-scan
  image: returntocorp/semgrep
  script:
    - semgrep --config=auto --json -o semgrep-results.json .
  artifacts:
    reports:
      sast: semgrep-results.json

trivy-scan:
  stage: security-scan
  image: aquasec/trivy:latest
  script:
    - trivy fs --format json -o trivy-results.json .
  artifacts:
    reports:
      dependency_scanning: trivy-results.json

security-gate:
  stage: security-gate
  script:
    - echo "Checking security scan results..."
    - exit 0
  when: on_success
```

## Scan Result Management

### Vulnerability Prioritization

**Severity Scoring:**
```
CRITICAL: CVSS 9.0-10.0
  ↓ Fix immediately (< 24 hours)

HIGH:     CVSS 7.0-8.9
  ↓ Fix within 7 days

MEDIUM:   CVSS 4.0-6.9
  ↓ Fix within 30 days

LOW:      CVSS 0.1-3.9
  ↓ Fix when convenient
```

**Context Factors:**
```yaml
# vulnerability-context.yaml
vulnerability_assessment:
  - id: CVE-2023-12345
    severity: HIGH

    # Risk factors
    exploitability: PUBLIC_EXPLOIT_AVAILABLE
    exposure: INTERNET_FACING
    data_sensitivity: PII

    # Adjusted priority: CRITICAL
    adjusted_severity: CRITICAL
    sla: 24_hours
```

### False Positive Management

**Suppression File:**
```yaml
# .security-suppressions.yaml
suppressions:
  - tool: semgrep
    rule_id: javascript.express.security.audit.xss.mustache.var-in-href
    paths:
      - src/components/SafeLink.tsx
    reason: "Using safe URL validation library"
    expires: 2024-12-31
    approved_by: security-team

  - tool: trivy
    cve: CVE-2023-12345
    package: lodash
    version: "4.17.20"
    reason: "No fix available, not exploitable in our context"
    mitigation: "Input validation in place"
```

### Reporting Dashboard

**Metrics to Track:**
```javascript
// security-metrics.js
const securityMetrics = {
  // Scan coverage
  scanCoverage: {
    repositories: { total: 50, scanned: 48 },
    codeLines: { total: 500000, scanned: 475000 }
  },

  // Vulnerability trends
  vulnerabilities: {
    critical: { open: 2, closed_this_month: 5 },
    high: { open: 8, closed_this_month: 12 },
    medium: { open: 25, closed_this_month: 30 },
    low: { open: 45, closed_this_month: 20 }
  },

  // SLA compliance
  sla: {
    critical: { sla: '24h', compliance: 0.95 },
    high: { sla: '7d', compliance: 0.88 },
    medium: { sla: '30d', compliance: 0.92 }
  },

  // Mean time to remediate
  mttr: {
    critical: '18 hours',
    high: '5 days',
    medium: '22 days'
  }
};
```

## Best Practices

### 1. Scan Early and Often

```yaml
# Multiple scan triggers
triggers:
  - Pre-commit hook (secrets, basic SAST)
  - Pull request (full SAST, SCA)
  - Merge to main (SAST, SCA, container scan)
  - Nightly (DAST, full analysis)
  - Weekly (comprehensive audit)
```

### 2. Fail Fast on Critical Issues

```yaml
# security-gates.yml
gates:
  pr_merge:
    block_on:
      - critical_vulnerabilities
      - secrets_detected
      - high_severity_sast

  production_deploy:
    block_on:
      - any_critical
      - high_without_exception
      - failed_dast_scan
```

### 3. Automate Remediation

```yaml
# auto-remediation.yml
automation:
  - Dependabot auto-merge (patch versions)
  - Automated security PRs (Snyk, Renovate)
  - Auto-suppress false positives (with approval)
  - Automated ticket creation (Jira/Linear)
```

### 4. Developer-Friendly Feedback

```
❌ Bad: "CWE-89 violation in line 42"

✅ Good:
"SQL Injection vulnerability (line 42)

 Risk: User input directly concatenated into SQL query

 Fix: Use parameterized queries:
   - db.query('SELECT * FROM users WHERE id = ?', [userId])

 References:
   - OWASP SQL Injection: https://...
   - Fix example: https://..."
```

### 5. Continuous Monitoring

```typescript
// Integrate with APM
import * as Sentry from '@sentry/node';

// Tag security-relevant events
Sentry.captureMessage('Security scan completed', {
  level: 'info',
  tags: {
    scan_type: 'sca',
    vulnerabilities_found: results.length,
    severity: 'high'
  }
});
```

## Anti-Patterns

❌ **Scanning only on release** - Too late, expensive to fix

❌ **Ignoring scan results** - Scans without action waste resources

❌ **No severity thresholds** - Alert fatigue, everything is critical

❌ **Blocking all findings** - Slows development, false positives

❌ **Manual scan execution** - Inconsistent, forgettable

❌ **No ownership** - Vulnerabilities never get fixed

❌ **Scan-and-forget** - Continuous monitoring needed

❌ **All tools, no strategy** - Tool sprawl, redundant scanning

❌ **No developer training** - Same issues repeat

❌ **Treating security as QA step** - Should be integrated throughout

---

**Next Steps:**
1. Choose scanning tools appropriate for your stack
2. Integrate into CI/CD pipeline
3. Set severity thresholds and SLAs
4. Establish vulnerability management process
5. Train developers on common vulnerabilities
6. Monitor metrics and improve over time

**Related Resources:**
- [container-security.md](container-security.md) - Image and runtime scanning
- [ci-cd-security.md](ci-cd-security.md) - Secure pipeline implementation
- [vulnerability-management.md](vulnerability-management.md) - Remediation workflows
