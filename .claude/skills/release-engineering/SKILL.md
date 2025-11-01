# Release Engineering

Comprehensive guide for CI/CD pipelines, deployment strategies, versioning, artifact management, progressive delivery, and release automation.

## Purpose

Enable teams to build robust, automated release pipelines that deliver software safely, quickly, and reliably from commit to production.

## When to Use This Skill

Automatically activates when working on:
- CI/CD pipeline configuration
- Deployment automation
- Release processes
- Artifact management
- Versioning strategies
- Progressive delivery
- Rollback procedures

## Quick Start Checklist

When implementing release engineering practices:

- [ ] Design CI/CD pipeline (build, test, deploy stages)
- [ ] Choose deployment strategy (blue-green, canary, rolling)
- [ ] Implement versioning scheme (semantic versioning, calendar versioning)
- [ ] Set up artifact repository (container registry, package registry)
- [ ] Configure automated testing gates
- [ ] Implement deployment safeguards (smoke tests, health checks)
- [ ] Define rollback procedures
- [ ] Set up deployment observability
- [ ] Document release process
- [ ] Establish release calendar/schedule

## Core Concepts

### CI/CD Pipeline Stages

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Build   │───▶│   Test   │───▶│  Stage   │───▶│  Deploy  │
│          │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │                │               │
     ▼               ▼                ▼               ▼
  Compile        Unit Tests      Integration     Production
  Package        Lint            UAT Testing      Release
  Scan           Security        Performance      Monitor
```

### Deployment Strategies

**Rolling Update:**
```
Old: [V1] [V1] [V1] [V1] [V1] [V1]
     [V2] [V1] [V1] [V1] [V1] [V1]  ← Replace one at a time
     [V2] [V2] [V1] [V1] [V1] [V1]
     [V2] [V2] [V2] [V1] [V1] [V1]
     [V2] [V2] [V2] [V2] [V1] [V1]
     [V2] [V2] [V2] [V2] [V2] [V1]
New: [V2] [V2] [V2] [V2] [V2] [V2]
```

**Blue-Green:**
```
Blue (V1):  [V1] [V1] [V1]  ← All traffic
Green (V2): [V2] [V2] [V2]  ← Idle

Switch traffic:
Blue (V1):  [V1] [V1] [V1]  ← Idle (ready for rollback)
Green (V2): [V2] [V2] [V2]  ← All traffic
```

**Canary:**
```
V1: [V1] [V1] [V1] [V1] [V1]  ← 100% traffic
V2: [V2]                       ← 10% traffic

Gradually increase:
V1: [V1] [V1] [V1] [V1]        ← 80% traffic
V2: [V2] [V2]                  ← 20% traffic

...eventually:
V1:                            ← 0% traffic (removed)
V2: [V2] [V2] [V2] [V2] [V2]  ← 100% traffic
```

### Semantic Versioning

```
MAJOR.MINOR.PATCH (e.g., 2.3.1)

MAJOR: Breaking changes (API incompatibility)
MINOR: New features (backward compatible)
PATCH: Bug fixes (backward compatible)

Examples:
1.0.0 → Initial release
1.1.0 → Added new feature
1.1.1 → Fixed bug
2.0.0 → Breaking API change
```

## Common Patterns

### Pattern 1: GitHub Actions CI/CD Pipeline

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Scan image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: 1

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          kubectl set image deployment/myapp \
            app=myapp:${{ github.sha }} \
            --namespace=staging

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: |
          kubectl set image deployment/myapp \
            app=myapp:${{ github.sha }} \
            --namespace=production

      - name: Verify deployment
        run: |
          kubectl rollout status deployment/myapp \
            --namespace=production
```

### Pattern 2: Canary Deployment with Flagger

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    webhooks:
    - name: load-test
      url: http://flagger-loadtester/
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://myapp-canary/"
```

### Pattern 3: Artifact Management

```yaml
# Publish to registry
docker build -t ghcr.io/myorg/myapp:v1.2.3 .
docker push ghcr.io/myorg/myapp:v1.2.3

# Tag as latest
docker tag ghcr.io/myorg/myapp:v1.2.3 ghcr.io/myorg/myapp:latest
docker push ghcr.io/myorg/myapp:latest

# Promotion strategy
prod:  ghcr.io/myorg/myapp:v1.2.3  # Immutable tag
stage: ghcr.io/myorg/myapp:latest  # Latest validated build
dev:   ghcr.io/myorg/myapp:develop # Latest development build
```

## Resource Files

For detailed guidance on specific topics, see:

### Core CI/CD
- **[ci-cd-pipelines.md](resources/ci-cd-pipelines.md)** - Pipeline design, GitHub Actions, GitLab CI, Jenkins patterns
- **[build-optimization.md](resources/build-optimization.md)** - Build caching, parallel builds, incremental builds
- **[pipeline-security.md](resources/pipeline-security.md)** - Securing CI/CD, secrets management, artifact signing

### Deployment Strategies
- **[deployment-strategies.md](resources/deployment-strategies.md)** - Blue-green, canary, rolling updates, recreate strategies
- **[progressive-delivery.md](resources/progressive-delivery.md)** - Feature flags, traffic splitting, gradual rollout
- **[rollback-strategies.md](resources/rollback-strategies.md)** - Automated rollback, manual rollback, database rollback

### Artifacts & Versioning
- **[artifact-management.md](resources/artifact-management.md)** - Container registries, package management, retention policies
- **[versioning-strategies.md](resources/versioning-strategies.md)** - Semantic versioning, calendar versioning, Git-based versioning
- **[release-automation.md](resources/release-automation.md)** - Automated releases, changelog generation, release notes

### Orchestration
- **[release-orchestration.md](resources/release-orchestration.md)** - Multi-service deployments, dependency management, coordination

## Best Practices

### CI/CD Pipelines

1. **Fast Feedback:**
   - Run fastest tests first
   - Fail fast on errors
   - Parallel execution where possible
   - Target < 10 minute pipeline

2. **Immutable Artifacts:**
   - Build once, deploy many times
   - Never rebuild for different environments
   - Use configuration management for environment differences

3. **Automated Testing:**
   - Unit tests in CI
   - Integration tests in staging
   - Smoke tests in production
   - Automated rollback on failure

### Deployment

1. **Zero-Downtime:**
   - Use rolling updates or blue-green
   - Health checks before routing traffic
   - Graceful shutdown (SIGTERM handling)

2. **Observability:**
   - Monitor during deployment
   - Automated health checks
   - Track deployment metrics
   - Alert on deployment failures

3. **Rollback Ready:**
   - Keep previous version running (blue-green)
   - Automated rollback triggers
   - Database migrations backward-compatible
   - Test rollback procedures regularly

### Release Management

1. **Version Control:**
   - Semantic versioning for APIs
   - Tag releases in Git
   - Maintain changelog
   - Document breaking changes

2. **Release Notes:**
   - Automated generation from commits
   - Highlight breaking changes
   - Include upgrade instructions
   - Link to documentation

3. **Release Schedule:**
   - Regular release cadence (weekly, bi-weekly)
   - Hotfix process for critical issues
   - Freeze periods for high-traffic events

## Anti-Patterns to Avoid

❌ **Manual deployments** - Error-prone, not reproducible

❌ **Building in production** - Slow, risky, inconsistent

❌ **No rollback plan** - Cannot recover from bad deployments

❌ **Skipping tests in CI** - Broken code reaches production

❌ **Mutable tags (latest)** - Cannot reproduce deployments

❌ **No deployment verification** - Silent failures

❌ **Direct database changes** - Data loss risk

❌ **No deployment approvals** - Unreviewed changes to production

❌ **Ignoring deployment metrics** - Miss degradation

❌ **Complex manual steps** - Slows releases, causes errors

## Common Tasks

### Task: Set Up CI/CD Pipeline

1. Choose CI/CD platform (GitHub Actions, GitLab CI, Jenkins)
2. Define pipeline stages (build, test, deploy)
3. Configure triggers (push, PR, schedule)
4. Add automated tests
5. Implement deployment automation
6. Set up notifications
7. Document pipeline

### Task: Implement Canary Deployment

1. Install Flagger or similar tool
2. Define canary configuration
3. Set success metrics (error rate, latency)
4. Configure progressive rollout (10%, 25%, 50%, 100%)
5. Add automated rollback triggers
6. Test deployment process
7. Monitor first production canary

### Task: Automate Release Process

1. Implement semantic versioning
2. Automate changelog generation
3. Create Git tags automatically
4. Generate release notes
5. Publish artifacts to registries
6. Notify stakeholders
7. Update documentation

## Integration Points

This skill integrates with:
- **platform-engineering**: Infrastructure provisioning, Kubernetes deployments
- **devsecops**: Security scanning, policy enforcement, artifact signing
- **sre**: Monitoring deployments, SLO tracking, incident response
- **cloud-engineering**: Cloud-specific deployment services (ECS, Cloud Run, App Engine)

## Triggers and Activation

This skill activates when you:
- Work with CI/CD configuration files (.github/workflows/, .gitlab-ci.yml, Jenkinsfile)
- Implement deployment scripts or automation
- Configure container registries or artifact repositories
- Design release processes or strategies
- Set up deployment pipelines

---

**Total Resources:** 10 detailed guides covering all aspects of release engineering
**Focus:** Automation, safety, speed, reliability
**Maintained by:** Release Engineering team based on production experience
