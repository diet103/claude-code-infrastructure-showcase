# Pipeline Security

Securing CI/CD pipelines, secrets management, artifact signing, supply chain security, and pipeline hardening.

## Pipeline Hardening

**Minimal Permissions:**
```yaml
permissions:
  contents: read      # Read code
  packages: write     # Push containers
  id-token: write     # OIDC for signing
  # Don't grant more than needed
```

**Pin Actions:**
```yaml
# ❌ Bad - mutable tag
- uses: actions/checkout@v3

# ✅ Good - pinned SHA
- uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab  # v3.5.2
```

## Secrets Management

**GitHub Secrets:**
```yaml
- name: Deploy
  env:
    API_KEY: ${{ secrets.API_KEY }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  run: ./deploy.sh
```

**Vault Integration:**
```yaml
- uses: hashicorp/vault-action@v2
  with:
    url: https://vault.example.com
    token: ${{ secrets.VAULT_TOKEN }}
    secrets: |
      secret/data/production api_key | API_KEY ;
      secret/data/production db_pass | DB_PASSWORD
```

## Artifact Signing

**Cosign:**
```yaml
- name: Sign image
  run: |
    cosign sign --yes \
      -a git_sha=${{ github.sha }} \
      myregistry.com/myapp:${{ github.sha }}
```

---

**Related Resources:**
- [ci-cd-pipelines.md](ci-cd-pipelines.md)
- [../devsecops/resources/ci-cd-security.md](../../devsecops/resources/ci-cd-security.md)
