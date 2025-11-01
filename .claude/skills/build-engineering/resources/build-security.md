# Build Security

Guide to supply chain security including SBOM generation, signed artifacts, and dependency attestation.

## Overview

Build security protects against supply chain attacks and ensures artifact integrity.

## SBOM Generation

### CycloneDX
```bash
# Generate SBOM
cyclonedx-cli generate -i . -o sbom.json

# Validate
cyclonedx-cli validate --input-file sbom.json
```

### Syft
```bash
# Generate from image
syft packages myapp:latest -o cyclonedx-json > sbom.json

# Multiple formats
syft packages . -o table,json,cyclonedx
```

## Artifact Signing

### GPG Signing
```bash
# Sign artifact
gpg --armor --detach-sign artifact.jar

# Verify
gpg --verify artifact.jar.asc artifact.jar
```

### Cosign (Container)
```bash
# Sign image
cosign sign registry.io/myapp:v1.0

# Verify
cosign verify registry.io/myapp:v1.0
```

## Dependency Attestation

### SLSA Provenance
```yaml
# GitHub Actions
- name: Generate provenance
  uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.2.0
```

## Vulnerability Scanning

### Trivy
```bash
# Scan image
trivy image myapp:latest

# Scan filesystem
trivy fs .

# Generate report
trivy image --format json -o results.json myapp:latest
```

### Snyk
```bash
# Test dependencies
snyk test

# Monitor project
snyk monitor

# Test container
snyk container test myapp:latest
```

## Best Practices

1. **Generate SBOM** - For every release
2. **Sign artifacts** - Cryptographic signatures
3. **Scan dependencies** - Automated vulnerability scanning
4. **Pin versions** - Exact dependency versions
5. **Verify signatures** - Before deployment
6. **Audit build process** - Regular security reviews
7. **Least privilege** - Minimal build permissions
8. **Secure secrets** - Never commit secrets
9. **Provenance tracking** - Build metadata
10. **Regular updates** - Keep dependencies current
