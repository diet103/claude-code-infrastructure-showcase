# Compilation Optimization

Guide to optimizing compilation including compiler flags, incremental compilation, distributed builds, ccache, and parallel compilation strategies.

## Table of Contents

- [Overview](#overview)
- [Compiler Flags](#compiler-flags)
- [Incremental Compilation](#incremental-compilation)
- [Distributed Builds](#distributed-builds)
- [ccache](#ccache)
- [Parallel Compilation](#parallel-compilation)
- [Best Practices](#best-practices)

## Overview

Compilation optimization reduces build times through intelligent caching, parallelization, and compiler settings.

**Key Techniques:**
- Compiler optimization flags
- Incremental compilation
- Distributed compilation
- Compilation caching
- Parallel execution
- Precompiled headers

## Compiler Flags

### GCC/Clang Optimization Levels

```bash
# No optimization (fast compile, slow runtime)
gcc -O0 source.c -o app

# Basic optimization
gcc -O1 source.c -o app

# Recommended for production
gcc -O2 source.c -o app

# Aggressive optimization (larger binaries)
gcc -O3 source.c -o app

# Size optimization
gcc -Os source.c -o app
```

### Debug vs Release Flags

```makefile
# Debug build
CFLAGS_DEBUG = -g -O0 -DDEBUG -Wall -Wextra

# Release build
CFLAGS_RELEASE = -O2 -DNDEBUG -march=native
```

### Link-Time Optimization (LTO)

```bash
# GCC LTO
gcc -flto -O2 source.c -o app

# Clang LTO
clang -flto -O2 source.c -o app
```

## Incremental Compilation

### Java Incremental Compilation

```kotlin
// build.gradle.kts
tasks.withType<JavaCompile> {
    options.isIncremental = true
}
```

### TypeScript Incremental

```json
{
  "compilerOptions": {
    "incremental": true,
    "composite": true,
    "tsBuildInfoFile": "./.tsbuildinfo"
  }
}
```

### Rust Incremental

```bash
# Enable incremental compilation
export CARGO_INCREMENTAL=1

# Or in Cargo.toml
[profile.dev]
incremental = true
```

## Distributed Builds

### distcc (C/C++)

```bash
# Setup distcc hosts
export DISTCC_HOSTS="localhost/8 server1/4 server2/4"

# Use with Make
make -j16 CC="distcc gcc" CXX="distcc g++"

# Monitoring
distccmon-text 1
```

### Bazel Remote Execution

```python
# .bazelrc
build --remote_executor=grpc://build-server:8980
build --remote_cache=grpc://cache-server:8980
```

## ccache

### Setup and Configuration

```bash
# Install
sudo apt-get install ccache

# Configure
export CC="ccache gcc"
export CXX="ccache g++"

# Set cache size
ccache -M 10G

# Statistics
ccache -s

# Clear cache
ccache -C
```

### CMake Integration

```cmake
find_program(CCACHE_FOUND ccache)
if(CCACHE_FOUND)
    set_property(GLOBAL PROPERTY RULE_LAUNCH_COMPILE ccache)
    set_property(GLOBAL PROPERTY RULE_LAUNCH_LINK ccache)
endif()
```

## Parallel Compilation

### Make Parallel Builds

```bash
# Use all CPU cores
make -j$(nproc)

# Specific number of jobs
make -j8
```

### Gradle Parallel

```kotlin
// gradle.properties
org.gradle.parallel=true
org.gradle.workers.max=8
org.gradle.caching=true
```

### npm Parallel

```json
{
  "scripts": {
    "build": "npm-run-all --parallel build:*",
    "build:client": "webpack",
    "build:server": "tsc"
  }
}
```

## Best Practices

1. **Use incremental compilation** - Only rebuild changed files
2. **Enable caching** - ccache, sccache for native, gradle cache
3. **Parallelize** - Use -j flag, parallel build options
4. **Optimize flags** - -O2 for production, -O0 for debug
5. **Use LTO** - Better optimization, smaller binaries
6. **Distribute builds** - For large codebases
7. **Monitor metrics** - Track compilation times
8. **Precompiled headers** - For C++ projects
9. **Clean periodically** - Remove stale artifacts
10. **Profile builds** - Identify bottlenecks
