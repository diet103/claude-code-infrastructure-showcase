# Monorepo Builds

Guide to monorepo build strategies including affected detection, Nx, Turborepo, and Bazel.

## Overview

Monorepos house multiple projects in single repository, requiring sophisticated build strategies.

## Affected Detection

### Nx
```json
{
  "affected": {
    "defaultBase": "main"
  }
}
```

```bash
# Build only affected projects
nx affected:build

# Test affected
nx affected:test

# Lint affected
nx affected:lint
```

### Turborepo
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    }
  }
}
```

```bash
# Build with caching
turbo run build

# Build only changed
turbo run build --filter="...[HEAD^]"
```

## Workspace Management

### npm Workspaces
```json
{
  "name": "monorepo",
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

### pnpm Workspaces
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - '!**/test/**'
```

### Yarn Workspaces
```json
{
  "private": true,
  "workspaces": {
    "packages": ["packages/*"],
    "nohoist": ["**/react-native", "**/react-native/**"]
  }
}
```

## Dependency Graph

### Visualize
```bash
# Nx dependency graph
nx graph

# Show affected
nx affected:graph
```

## Best Practices

1. **Use affected builds** - Only build changed projects
2. **Shared dependencies** - Hoist common packages
3. **Consistent tooling** - Same versions across projects
4. **Dependency graph** - Understand project relationships
5. **Incremental builds** - Cache across projects
6. **Parallel execution** - Build independent projects
7. **Versioning strategy** - Sync or independent
8. **Clear ownership** - CODEOWNERS for each project
9. **Documentation** - Project relationships
10. **Testing strategy** - Unit + integration
