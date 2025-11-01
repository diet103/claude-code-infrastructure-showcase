# Supply Chain Security

SBOM generation, dependency scanning, image signing with Cosign/Sigstore, artifact attestation, and software supply chain protection.

## Table of Contents

- [Overview](#overview)
- [SBOM Generation](#sbom-generation)
- [Dependency Scanning](#dependency-scanning)
- [Image Signing](#image-signing)
- [Artifact Attestation](#artifact-attestation)
- [Supply Chain Levels for Software Artifacts (SLSA)](#slsa)
- [Best Practices](#best-practices)

## Overview

**Supply Chain Attack Vectors:**

```
┌──────────────────────────────────────────────┐
│         Supply Chain Threats                 │
├──────────────────────────────────────────────┤
│ • Compromised dependencies                   │
│ • Malicious packages                         │
│ • Build environment tampering                │
│ • Registry/repository attacks                │
│ • Unsigned/unverified artifacts              │
│ • Lack of provenance                         │
└──────────────────────────────────────────────┘
```

## SBOM Generation

### What is an SBOM?

Software Bill of Materials: Complete inventory of components in software.

### Formats

- **SPDX:** ISO/IEC standard
- **CycloneDX:** OWASP project
- **SWID:** ISO/IEC 19770-2

### Syft (SBOM Generator)

**Installation:**
```bash
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh
```

**Generate SBOM:**
```bash
# From container image
syft nginx:latest -o spdx-json > nginx-sbom.json
syft nginx:latest -o cyclonedx-json > nginx-sbom-cdx.json

# From directory
syft dir:. -o spdx-json > app-sbom.json

# From archive
syft file:app.tar.gz -o spdx-json

# Multiple formats
syft nginx:latest -o json,cyclonedx-json,spdx-json
```

**CI Integration:**
```yaml
# .github/workflows/sbom.yml
name: Generate SBOM

on:
  push:
    tags: ['v*']

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build container
        run: docker build -t myapp:${{ github.ref_name }} .

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: myapp:${{ github.ref_name }}
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Upload SBOM
        uses: actions/upload-artifact@v3
        with:
          name: sbom
          path: sbom.spdx.json

      - name: Attach SBOM to release
        uses: softprops/action-gh-release@v1
        with:
          files: sbom.spdx.json
```

### SBOM Analysis

```bash
# Install grype for vulnerability scanning
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh

# Scan SBOM for vulnerabilities
grype sbom:sbom.spdx.json

# Output formats
grype sbom:sbom.spdx.json -o json
grype sbom:sbom.spdx.json -o sarif
```

## Dependency Scanning

### Dependency Confusion Attacks

**Prevention:**
```json
// package.json - use scoped packages
{
  "name": "@myorg/mypackage",
  "dependencies": {
    "@myorg/internal-lib": "^1.0.0"
  }
}
```

```yaml
# .npmrc - configure private registry
@myorg:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

### Lock Files

**Commit lock files:**
```bash
# npm
package-lock.json  ✅

# yarn
yarn.lock  ✅

# pnpm
pnpm-lock.yaml  ✅

# pip
requirements.txt  ✅
Pipfile.lock  ✅

# go
go.sum  ✅
```

### Dependency Review

```yaml
# .github/workflows/dependency-review.yml
name: Dependency Review

on: [pull_request]

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/dependency-review-action@v3
        with:
          fail-on-severity: moderate
          deny-licenses: GPL-3.0, AGPL-3.0
```

## Image Signing

### Cosign

**Installation:**
```bash
# Linux
wget https://github.com/sigstore/cosign/releases/download/v2.0.0/cosign-linux-amd64
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign

# macOS
brew install cosign
```

**Generate Keys:**
```bash
# Generate key pair
cosign generate-key-pair

# Outputs:
# - cosign.key (private - store securely!)
# - cosign.pub (public - distribute)
```

**Sign Image:**
```bash
# Sign with key
cosign sign --key cosign.key ghcr.io/myorg/myapp:v1.0.0

# Keyless signing (OIDC)
cosign sign ghcr.io/myorg/myapp:v1.0.0

# Sign with annotations
cosign sign --key cosign.key \
  -a git_sha=$(git rev-parse HEAD) \
  -a build_date=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  -a author=$GITHUB_ACTOR \
  ghcr.io/myorg/myapp:v1.0.0
```

**Verify Signature:**
```bash
# Verify with public key
cosign verify --key cosign.pub ghcr.io/myorg/myapp:v1.0.0

# Keyless verification
cosign verify \
  --certificate-identity=user@example.com \
  --certificate-oidc-issuer=https://github.com/login/oauth \
  ghcr.io/myorg/myapp:v1.0.0

# Verify annotations
cosign verify --key cosign.pub \
  -a git_sha=abc123 \
  ghcr.io/myorg/myapp:v1.0.0
```

**CI/CD Integration:**
```yaml
# .github/workflows/sign-publish.yml
name: Build, Sign, and Publish

on:
  push:
    tags: ['v*']

permissions:
  contents: read
  packages: write
  id-token: write  # For keyless signing

jobs:
  build-sign-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Login to GHCR
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
            -a git_sha=${{ github.sha }} \
            -a tag=${{ github.ref_name }} \
            ghcr.io/${{ github.repository }}:${{ github.ref_name }}
```

### Policy Enforcement

**Kyverno Image Verification:**
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
      - "ghcr.io/myorg/*"
      attestors:
      - count: 1
        entries:
        - keys:
            publicKeys: |-
              -----BEGIN PUBLIC KEY-----
              MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
              -----END PUBLIC KEY-----
```

## Artifact Attestation

### in-toto Attestations

**Generate Attestation:**
```bash
# Create provenance attestation
cosign attest --key cosign.key \
  --predicate provenance.json \
  ghcr.io/myorg/myapp:v1.0.0
```

**Provenance Format:**
```json
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "subject": [{
    "name": "ghcr.io/myorg/myapp",
    "digest": {
      "sha256": "abc123..."
    }
  }],
  "predicateType": "https://slsa.dev/provenance/v0.2",
  "predicate": {
    "builder": {
      "id": "https://github.com/myorg/myrepo/actions/runs/12345"
    },
    "buildType": "https://github.com/Attestations/GitHubActionsWorkflow@v1",
    "invocation": {
      "configSource": {
        "uri": "git+https://github.com/myorg/myrepo",
        "digest": {"sha1": "abc123"},
        "entryPoint": ".github/workflows/build.yml"
      }
    },
    "metadata": {
      "buildStartedOn": "2023-01-15T10:00:00Z",
      "buildFinishedOn": "2023-01-15T10:05:00Z",
      "completeness": {
        "parameters": true,
        "environment": true,
        "materials": true
      },
      "reproducible": false
    },
    "materials": [
      {
        "uri": "git+https://github.com/myorg/myrepo",
        "digest": {"sha1": "abc123"}
      }
    ]
  }
}
```

**Verify Attestation:**
```bash
cosign verify-attestation --key cosign.pub \
  ghcr.io/myorg/myapp:v1.0.0
```

### SLSA Provenance

```yaml
# .github/workflows/slsa-provenance.yml
name: SLSA Provenance

on:
  push:
    tags: ['v*']

permissions:
  contents: read
  packages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v3

      - name: Build
        id: build
        run: |
          docker build -t myapp:latest .
          digest=$(docker inspect --format='{{index .RepoDigests 0}}' myapp:latest | cut -d'@' -f2)
          echo "digest=$digest" >> $GITHUB_OUTPUT

  provenance:
    needs: [build]
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v1.5.0
    with:
      image: ghcr.io/${{ github.repository }}
      digest: ${{ needs.build.outputs.digest }}
    secrets:
      registry-username: ${{ github.actor }}
      registry-password: ${{ secrets.GITHUB_TOKEN }}
```

## SLSA

### SLSA Levels

**SLSA 1:** Documentation of build process
**SLSA 2:** Tamper-proof provenance
**SLSA 3:** Source and build platforms hardened
**SLSA 4:** Highest level, two-person review

### Implementation

```yaml
# slsa-framework requirements
requirements:
  slsa_1:
    - Build process documented
    - Provenance generated

  slsa_2:
    - Authenticated provenance
    - Service-generated (not user)
    - Tamper-proof

  slsa_3:
    - Source and build platform security
    - Hardened build environment
    - Build as code

  slsa_4:
    - Two-person review
    - Hermetic builds
    - Reproducible builds
```

## Best Practices

### 1. Generate and Publish SBOMs

```bash
# Include with every release
syft myapp:v1.0.0 -o spdx-json > sbom.json
```

### 2. Sign All Artifacts

```bash
# Images, binaries, packages
cosign sign --key cosign.key artifact
```

### 3. Verify Before Use

```bash
# Verify signatures in deployment pipeline
cosign verify --key cosign.pub image
```

### 4. Use Private Registries

```yaml
# Control your supply chain
registry: private-registry.example.com
```

### 5. Pin Dependencies

```json
{
  "dependencies": {
    "express": "4.18.2",  // ✅ Exact version
    "lodash": "^4.17.21"  // ❌ Range
  }
}
```

### 6. Automated Scanning

```yaml
# Scan dependencies daily
schedule:
  - cron: '0 0 * * *'
```

### 7. Provenance Verification

```bash
# Verify build provenance
cosign verify-attestation image
```

### 8. Reproducible Builds

```dockerfile
# Use specific base image digests
FROM node:20-alpine@sha256:abc123...
```

---

**Related Resources:**
- [container-security.md](container-security.md) - Image security
- [ci-cd-security.md](ci-cd-security.md) - Pipeline security
