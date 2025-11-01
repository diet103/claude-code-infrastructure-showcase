# Build Optimization

Build caching, parallel builds, incremental builds, Docker layer caching, and build performance optimization.

## Docker Layer Caching

**Multi-stage Build:**
```dockerfile
# Cache dependencies layer
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build layer
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production layer
FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
```

**GitHub Actions Cache:**
```yaml
- name: Cache Docker layers
  uses: actions/cache@v3
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-buildx-

- name: Build
  uses: docker/build-push-action@v4
  with:
    cache-from: type=local,src=/tmp/.buildx-cache
    cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max
```

## Parallel Builds

**GitHub Actions Matrix:**
```yaml
jobs:
  build:
    strategy:
      matrix:
        platform: [linux/amd64, linux/arm64]
    steps:
      - uses: docker/build-push-action@v4
        with:
          platforms: ${{ matrix.platform }}
```

## Incremental Builds

**Turborepo:**
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "cache": true
    }
  }
}
```

---

**Related Resources:**
- [ci-cd-pipelines.md](ci-cd-pipelines.md)
