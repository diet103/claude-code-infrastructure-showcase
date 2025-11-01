# Build Pipelines

Guide to CI/CD build pipelines including stages, parallel builds, matrix builds, and optimization.

## Overview

Build pipelines automate the process from code commit to artifact creation.

## Pipeline Stages

```yaml
# GitHub Actions
name: Build Pipeline

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Upload Artifact
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
```

## Matrix Builds

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [16, 18, 20]
        include:
          - os: ubuntu-latest
            node: 20
            coverage: true
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
      - if: matrix.coverage
        run: npm run coverage
```

## Parallel Execution

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
  
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
  
  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
```

## Best Practices

1. **Fail fast** - Run quick tests first
2. **Parallel stages** - Independent steps in parallel
3. **Cache dependencies** - Reuse between builds
4. **Matrix builds** - Test multiple configurations
5. **Artifact management** - Upload build outputs
6. **Clear stages** - Logical separation
7. **Timeout limits** - Prevent hanging builds
8. **Retry failed steps** - Handle flaky tests
9. **Environment parity** - Match production
10. **Monitor metrics** - Track build times
