# Performance Optimization

Guide to build performance optimization including profiling, parallelization, and bottleneck analysis.

## Overview

Optimizing build performance improves developer productivity and reduces costs.

## Build Profiling

### Gradle
```bash
# Profile build
./gradlew build --profile

# Scan build
./gradlew build --scan
```

### Maven
```bash
# Profile
mvn clean install -Dprofile

# Debug
mvn clean install -X
```

### npm
```bash
# Time tasks
npm run build --timing

# Verbose
npm run build --verbose
```

## Bottleneck Analysis

### Identify Slow Tasks
```bash
# Gradle task breakdown
./gradlew build --profile

# Check time in report
cat build/reports/profile/*.html
```

### Dependency Resolution
```bash
# Gradle dependency insight
./gradlew dependencies --configuration compileClasspath

# Maven dependency tree
mvn dependency:tree
```

## Optimization Strategies

### Parallel Execution
```kotlin
// gradle.properties
org.gradle.parallel=true
org.gradle.workers.max=8
```

### Incremental Builds
```kotlin
tasks.withType<JavaCompile> {
    options.isIncremental = true
}
```

### Skip Unnecessary Tasks
```bash
# Skip tests
./gradlew build -x test

# Skip specific tasks
npm run build --ignore-scripts
```

## Metrics

### Track Build Times
```yaml
# GitHub Actions
- name: Build
  run: |
    start=$SECONDS
    npm run build
    duration=$(( SECONDS - start ))
    echo "Build time: $duration seconds"
```

### Monitor Trends
- Average build time
- P95/P99 build times
- Cache hit rates
- Dependency resolution time

## Best Practices

1. **Profile regularly** - Weekly build profiles
2. **Enable caching** - Local and remote
3. **Parallelize** - Independent tasks
4. **Incremental builds** - Only rebuild changed
5. **Optimize dependencies** - Remove unused
6. **Monitor metrics** - Track over time
7. **Use build scans** - Gradle/Maven scans
8. **Upgrade tools** - Latest build tool versions
9. **Review regularly** - Monthly optimization review
10. **Document findings** - Share learnings
