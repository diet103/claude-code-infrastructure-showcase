# Build Caching

Guide to build caching strategies including layer caching, distributed caching, and cache invalidation.

## Overview

Build caching dramatically reduces build times by reusing previously built artifacts.

## Docker Layer Caching

```dockerfile
FROM node:18

# Cache dependencies separately
COPY package*.json ./
RUN npm ci

# Copy source (changes more frequently)
COPY . .
RUN npm run build
```

## Gradle Build Cache

```kotlin
// gradle.properties
org.gradle.caching=true
org.gradle.caching.debug=false

// settings.gradle.kts
buildCache {
    local {
        directory = File(rootDir, "build-cache")
        removeUnusedEntriesAfterDays = 30
    }
    
    remote<HttpBuildCache> {
        url = uri("https://cache.example.com/cache/")
        isPush = System.getenv("CI") != null
        credentials {
            username = "cache-user"
            password = System.getenv("CACHE_PASSWORD")
        }
    }
}
```

## npm/yarn Cache

```bash
# npm cache
npm ci --cache /tmp/npm-cache

# yarn cache
yarn install --cache-folder /tmp/yarn-cache

# pnpm store
pnpm install --store-dir /tmp/pnpm-store
```

## Bazel Remote Cache

```python
# .bazelrc
build --remote_cache=grpc://cache.example.com:8980
build --experimental_remote_downloader=grpc://cache.example.com:8980
```

## Cache Invalidation

### Content-Based
```bash
# Hash file contents
CACHE_KEY=$(sha256sum package-lock.json | cut -d' ' -f1)
```

### Time-Based
- Expire after N days
- Refresh on access

### Manual
- Clear on major changes
- Version-based invalidation

## Best Practices

1. **Layer wisely** - Dependencies before code
2. **Use remote cache** - Team-wide benefits
3. **Content-based keys** - Hash file contents
4. **Set size limits** - Prevent unlimited growth
5. **Monitor hit rate** - Track effectiveness
6. **Clean old entries** - Automatic cleanup
7. **Secure cache** - Access control
8. **Test without cache** - Verify correctness
9. **Document strategy** - Clear policies
10. **Measure impact** - Before/after metrics
