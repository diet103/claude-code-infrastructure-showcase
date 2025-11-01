# Artifact Management

Container registries, package management, versioning, retention policies, and artifact security.

## Container Registries

**Docker Hub:**
```bash
docker login
docker tag myapp:latest myuser/myapp:v1.0.0
docker push myuser/myapp:v1.0.0
```

**GitHub Container Registry (ghcr.io):**
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker tag myapp:latest ghcr.io/myorg/myapp:v1.0.0
docker push ghcr.io/myorg/myapp:v1.0.0
```

**AWS ECR:**
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker tag myapp:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0
```

## Versioning Strategy

**Semantic Versioning:**
```
v1.0.0 - Initial release
v1.1.0 - New features (backward compatible)
v1.1.1 - Bug fixes
v2.0.0 - Breaking changes
```

**Tags:**
```bash
# Immutable version tag
docker tag myapp:latest myapp:v1.2.3

# Mutable tags (for convenience)
docker tag myapp:v1.2.3 myapp:1.2
docker tag myapp:v1.2.3 myapp:1
docker tag myapp:v1.2.3 myapp:latest

# Environment tags
docker tag myapp:v1.2.3 myapp:production
docker tag myapp:v1.2.3 myapp:staging
```

## Retention Policies

**Keep Recent and Important:**
```yaml
retention_policy:
  keep:
    - All tagged releases (v*)
    - Last 10 untagged builds
    - Production/staging tags
  delete:
    - Untagged images older than 30 days
    - Development tags older than 7 days
```

**GitHub Package Retention:**
```yaml
# .github/workflows/cleanup.yml
name: Cleanup Old Images

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/delete-package-versions@v4
        with:
          package-name: 'myapp'
          min-versions-to-keep: 10
          delete-only-untagged-versions: true
```

## Package Management

**npm Registry:**
```bash
npm publish --access public
npm unpublish mypackage@1.0.0
```

**Private Registry (Verdaccio):**
```yaml
# .npmrc
registry=http://verdaccio.example.com/
//verdaccio.example.com/:_authToken=${NPM_TOKEN}
```

---

**Related Resources:**
- [versioning-strategies.md](versioning-strategies.md)
- [ci-cd-pipelines.md](ci-cd-pipelines.md)
