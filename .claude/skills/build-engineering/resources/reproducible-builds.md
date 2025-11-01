# Reproducible Builds

Guide to deterministic and hermetic builds using SLSA framework principles.

## Overview

Reproducible builds ensure identical outputs from identical inputs, critical for security and debugging.

## Deterministic Builds

### Remove Timestamps
```dockerfile
# Bad - includes timestamp
FROM node:18
RUN date > build-time.txt
COPY . .
RUN npm run build

# Good - reproducible
FROM node:18
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

### Sort File Lists
```makefile
FILES := $(sort $(wildcard src/*.c))
```

## Hermetic Builds

### Bazel
```python
# BUILD file
java_binary(
    name = "app",
    srcs = ["Main.java"],
    deps = ["@maven//:com_google_guava_guava"],
)
```

### Docker
```dockerfile
# Pin base image
FROM node:18.17.0-alpine3.18

# Pin package versions
RUN npm ci --production
```

## SLSA Framework

### Level 1: Documented
- Build process documented
- Provenance exists

### Level 2: Hosted
- Version control
- Hosted build service

### Level 3: Hardened
- Hardened build platform
- Provenance verification

### Level 4: Two-party review
- Code review required
- Multiple approvers

## Best Practices

1. **Pin all versions** - Tools and dependencies
2. **Avoid timestamps** - Use git commit hash
3. **Use hermetic builds** - Isolated build environment
4. **Document environment** - OS, tool versions
5. **Verify reproducibility** - Regular verification
6. **Generate provenance** - Build metadata
7. **Sign artifacts** - Cryptographic signatures
8. **Audit build process** - Security reviews
9. **Use containers** - Consistent environment
10. **Test reproducibility** - Automated verification
