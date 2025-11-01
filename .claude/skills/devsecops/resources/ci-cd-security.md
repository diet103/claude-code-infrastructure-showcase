# CI/CD Security

Securing pipelines, artifact validation, signing workflows, secure deployment practices, and CI/CD hardening.

## Table of Contents

- [Pipeline Security](#pipeline-security)
- [Secrets in CI/CD](#secrets-in-cicd)
- [Artifact Validation](#artifact-validation)
- [Secure Workflows](#secure-workflows)
- [Best Practices](#best-practices)

## Pipeline Security

### GitHub Actions Security

**Workflow Permissions:**
```yaml
name: Secure Workflow

on: [push]

permissions:
  contents: read  # Minimal permissions
  packages: write # Only what's needed

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          persist-credentials: false  # Don't persist token
```

**Pin Actions:**
```yaml
# ❌ Bad: Using tags
- uses: actions/checkout@v3

# ✅ Good: Using commit SHAs
- uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab  # v3.5.2
```

### Secrets in CI/CD

**GitHub Secrets:**
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
        run: ./deploy.sh
```

**Vault in CI/CD:**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: hashicorp/vault-action@v2
        with:
          url: https://vault.example.com
          token: ${{ secrets.VAULT_TOKEN }}
          secrets: |
            secret/data/production api_key | API_KEY ;
            secret/data/production db_pass | DB_PASSWORD
```

## Artifact Validation

**Checksum Verification:**
```yaml
- name: Download artifact
  run: curl -O https://example.com/app.tar.gz

- name: Verify checksum
  run: |
    echo "${{ secrets.ARTIFACT_SHA256 }} app.tar.gz" | sha256sum -c -
```

**Signature Verification:**
```yaml
- name: Verify artifact signature
  run: |
    cosign verify --key cosign.pub artifact.tar.gz
```

## Secure Workflows

**Complete Secure Pipeline:**
```yaml
name: Secure Build and Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write
  id-token: write
  security-events: write

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab

      - name: Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD

      - name: SAST Scan
        uses: returntocorp/semgrep-action@v1
        with:
          config: p/security-audit

  build:
    needs: security-scan
    runs-on: ubuntu-latest
    outputs:
      digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab

      - name: Build image
        id: build
        run: |
          docker build -t myapp:${{ github.sha }} .
          digest=$(docker inspect --format='{{index .RepoDigests 0}}' | cut -d@ -f2)
          echo "digest=$digest" >> $GITHUB_OUTPUT

      - name: Scan image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: 1

      - name: Sign image
        run: |
          cosign sign --yes myapp:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Verify signature
        run: |
          cosign verify --key cosign.pub myapp:${{ github.sha }}

      - name: Deploy
        run: kubectl set image deployment/myapp app=myapp:${{ github.sha }}
```

## Best Practices

### 1. Minimal Permissions

```yaml
permissions:
  contents: read  # Only what's needed
```

### 2. Pin Dependencies

```yaml
- uses: actions/checkout@8e5e7e5  # Pin to SHA
```

### 3. No Secrets in Logs

```bash
echo "::add-mask::$SECRET_VALUE"
```

### 4. Separate Environments

```yaml
environment: production  # Requires approval
```

### 5. Sign Artifacts

```bash
cosign sign --key cosign.key artifact
```

---

**Related Resources:**
- [secrets-management.md](secrets-management.md)
- [supply-chain-security.md](supply-chain-security.md)
