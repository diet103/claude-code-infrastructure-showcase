---
description: Build engineering covering build systems (Make, Gradle, Maven, Bazel), compilation optimization, dependency management, artifact repositories, build pipelines, reproducible builds, build caching, monorepo strategies, supply chain security, and performance optimization. Use when creating build processes, optimizing build times, managing dependencies, or implementing CI build pipelines. (project)
---

# Build Engineering

Comprehensive guide for build engineering covering build systems, compilation optimization, dependency management, artifact repositories, reproducible builds, and modern build practices for creating fast, reliable, and secure build pipelines.

## Overview

**Purpose:** Enable teams to create efficient, reliable, and secure build processes that scale from small projects to large monorepos while maintaining build reproducibility and optimizing developer productivity.

**Scope:**
- Build systems (Make, Gradle, Maven, Bazel, npm/yarn/pnpm)
- Compilation optimization and distributed builds
- Dependency management and version pinning
- Artifact repositories and binary management
- CI/CD build pipelines and automation
- Reproducible and hermetic builds
- Build caching strategies
- Monorepo build tools and strategies
- Supply chain security (SBOM, signed artifacts)
- Build performance optimization

**This skill is for:**
- Build engineers optimizing build performance
- DevOps engineers creating CI/CD pipelines
- Platform engineers managing build infrastructure
- Developers improving build times
- Security engineers implementing supply chain security

## Quick Start Checklist

When starting a build engineering task:

- [ ] Choose appropriate build tool for your language/ecosystem
- [ ] Implement dependency locking for reproducibility
- [ ] Set up artifact caching (local and remote)
- [ ] Configure incremental compilation
- [ ] Implement parallel build execution
- [ ] Set up artifact repository (Artifactory, Nexus, registry)
- [ ] Define clear build stages (compile, test, package)
- [ ] Implement build caching strategy
- [ ] Add dependency vulnerability scanning
- [ ] Monitor and optimize build performance

## Core Concepts

### 1. Build System Types

**Make-based:**
```
Traditional, file-based dependencies
Example: Make, CMake
Best for: C/C++, system-level builds
```

**JVM-based:**
```
Dependency resolution, artifact management
Example: Maven, Gradle
Best for: Java, Kotlin, Scala
```

**Task-based:**
```
Flexible task execution
Example: npm, Gulp, Rake
Best for: JavaScript, Ruby, general automation
```

**Hermetic:**
```
Fully reproducible, sandboxed builds
Example: Bazel, Buck, Pants
Best for: Large monorepos, multi-language projects
```

### 2. Build Pipeline Stages

```
┌─────────────────────────────────────────────────┐
│              Source Code                         │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │  Dependency Fetch  │
         │  (with caching)    │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │   Compilation      │
         │  (incremental)     │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │      Testing       │
         │   (unit, int)      │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │     Packaging      │
         │  (artifacts)       │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │  Artifact Upload   │
         │   (registry)       │
         └───────────────────┘
```

### 3. Dependency Resolution

**Semantic Versioning:**
```
MAJOR.MINOR.PATCH
1.2.3

Major: Breaking changes
Minor: New features, backward compatible
Patch: Bug fixes
```

**Version Constraints:**
```
Exact:       1.2.3
Range:       >=1.2.0 <2.0.0
Caret:       ^1.2.3  (>=1.2.3 <2.0.0)
Tilde:       ~1.2.3  (>=1.2.3 <1.3.0)
```

### 4. Build Caching

**Local Cache:**
```
┌──────────────┐
│  Developer   │
│   Machine    │
│              │
│ Local Cache  │
│ (~/.cache)   │
└──────────────┘
```

**Distributed Cache:**
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Dev 1      │     │   Dev 2      │     │  CI Server   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────┬───────┴────────────────────┘
                    │
            ┌───────▼────────┐
            │  Remote Cache  │
            │  (S3, Redis)   │
            └────────────────┘
```

### 5. Artifact Versioning

**Versioning Strategies:**
```
Semantic:       1.2.3
Build number:   1.2.3-build.456
Git commit:     1.2.3-a1b2c3d
Timestamp:      1.2.3-20240101123045
Snapshot:       1.2.3-SNAPSHOT
```

## Common Patterns

### Pattern 1: Multi-Stage Build

```dockerfile
# Multi-stage Docker build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Pattern 2: Dependency Locking

```json
// package.json
{
  "dependencies": {
    "express": "^4.18.0"
  }
}

// package-lock.json (exact versions)
{
  "dependencies": {
    "express": {
      "version": "4.18.2",
      "resolved": "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
      "integrity": "sha512-..."
    }
  }
}
```

### Pattern 3: Build Matrix

```yaml
# GitHub Actions build matrix
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [16, 18, 20]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

### Pattern 4: Incremental Builds

```groovy
// Gradle incremental compilation
tasks.withType(JavaCompile) {
    options.incremental = true
}

// Only rebuild changed modules
gradle build --parallel --build-cache --configure-on-demand
```

## Resource Files

For detailed guidance on specific topics, see:

### Build Systems
- **[build-systems.md](resources/build-systems.md)** - Make, Gradle, Maven, Bazel, npm/yarn comparison, tool selection guide
- **[compilation-optimization.md](resources/compilation-optimization.md)** - Compiler flags, incremental compilation, distributed builds, ccache
- **[monorepo-builds.md](resources/monorepo-builds.md)** - Monorepo strategies, affected detection, Nx, Turborepo, Bazel

### Dependency Management
- **[dependency-management.md](resources/dependency-management.md)** - Version pinning, lock files, conflict resolution, vulnerability scanning
- **[artifact-repositories.md](resources/artifact-repositories.md)** - Artifactory, Nexus, container registries, retention policies, promotion

### Build Pipeline
- **[build-pipelines.md](resources/build-pipelines.md)** - CI build stages, parallel builds, matrix builds, pipeline optimization
- **[reproducible-builds.md](resources/reproducible-builds.md)** - Deterministic builds, hermetic builds, SLSA framework

### Optimization
- **[build-caching.md](resources/build-caching.md)** - Layer caching, distributed caching, cache invalidation strategies
- **[performance-optimization.md](resources/performance-optimization.md)** - Build profiling, parallelization, metrics, bottleneck analysis

### Security
- **[build-security.md](resources/build-security.md)** - Supply chain security, signed artifacts, SBOM generation, dependency attestation

## Best Practices

### Build Performance

1. **Enable caching:**
   - Use local and remote build caches
   - Cache dependencies separately from code
   - Implement layer caching in Docker builds
   - Use incremental compilation

2. **Parallelize builds:**
   - Build independent modules concurrently
   - Use build tool parallelization features
   - Distribute builds across multiple machines
   - Leverage build matrix for testing

3. **Optimize dependencies:**
   - Remove unused dependencies
   - Use exact versions in lock files
   - Implement dependency caching
   - Consider vendoring for critical dependencies

### Build Reliability

1. **Reproducible builds:**
   - Pin all dependency versions
   - Use deterministic build tools
   - Avoid timestamps in artifacts
   - Document build environment requirements

2. **Dependency management:**
   - Use lock files (package-lock.json, Gemfile.lock, go.sum)
   - Scan for vulnerabilities regularly
   - Update dependencies systematically
   - Test dependency updates before merging

3. **Artifact management:**
   - Version all artifacts
   - Store in artifact repository
   - Implement retention policies
   - Sign critical artifacts

### Build Security

1. **Supply chain security:**
   - Generate SBOM (Software Bill of Materials)
   - Sign build artifacts
   - Verify dependency signatures
   - Scan for vulnerabilities

2. **Build isolation:**
   - Use hermetic builds when possible
   - Sandbox build processes
   - Limit network access during builds
   - Verify build inputs

3. **Secret management:**
   - Never commit secrets to version control
   - Use secret management tools
   - Rotate build secrets regularly
   - Audit secret access

## Anti-Patterns to Avoid

❌ **Non-reproducible builds** - Different results from same source
❌ **No dependency locking** - Floating versions break builds
❌ **Rebuilding everything** - Wastes time and resources
❌ **No build caching** - Repeated work on every build
❌ **Ignored dependencies** - Outdated, vulnerable packages
❌ **No artifact versioning** - Can't track what was deployed
❌ **Serial builds** - Not leveraging parallelization
❌ **No build metrics** - Can't identify bottlenecks
❌ **Mixing build and runtime** - Bloated containers
❌ **No vulnerability scanning** - Security risks in dependencies

## Common Tasks

### Task: Optimize Slow Build

1. Profile build to identify bottlenecks
2. Enable build caching (local and remote)
3. Implement incremental compilation
4. Parallelize independent build tasks
5. Cache dependencies separately
6. Use build tool's parallel features
7. Consider distributed builds for large projects
8. Monitor build metrics over time

### Task: Set Up Artifact Repository

1. Choose repository (Artifactory, Nexus, registry)
2. Deploy and configure repository
3. Set up authentication and access control
4. Define retention policies
5. Configure build tools to publish artifacts
6. Implement versioning strategy
7. Set up vulnerability scanning
8. Document artifact promotion workflow

### Task: Implement Reproducible Builds

1. Pin all dependency versions
2. Use lock files for dependencies
3. Specify build tool versions
4. Document build environment
5. Remove non-deterministic elements (timestamps)
6. Use hermetic build tools if possible
7. Verify builds are reproducible
8. Automate verification in CI

## Integration Points

This skill integrates with:
- **release-engineering**: Deployment pipelines, versioning, artifact promotion
- **devsecops**: Vulnerability scanning, SBOM, supply chain security
- **platform-engineering**: Build infrastructure, container builds, Kubernetes
- **cloud-engineering**: Cloud build services, artifact storage
- **systems-engineering**: Compiler optimization, system dependencies

## Triggers and Activation

This skill activates when you:
- Work with build files (Makefile, build.gradle, pom.xml, package.json)
- Optimize build performance or reduce build times
- Implement CI/CD pipelines
- Manage dependencies or artifact repositories
- Configure build caching or distributed builds
- Set up monorepo build tooling
- Implement reproducible builds
- Address supply chain security

## Next Steps

For your specific build engineering task:
1. Identify build system and language ecosystem
2. Review relevant patterns and optimization strategies
3. Implement caching and parallelization
4. Set up artifact management
5. Monitor and optimize build performance
6. Implement security scanning and SBOM generation

---

**Total Resources:** 10 detailed guides covering all aspects of build engineering
**Pattern Library:** 100+ production-tested patterns for build optimization and reliability
**Maintained by:** Build Engineering team based on real-world production experience
