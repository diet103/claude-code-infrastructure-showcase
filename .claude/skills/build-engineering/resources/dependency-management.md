# Dependency Management

Guide to dependency management including version pinning, lock files, conflict resolution, and vulnerability scanning.

## Overview

Proper dependency management ensures reproducible builds, security, and maintainability.

## Version Pinning

### npm/yarn
```json
{
  "dependencies": {
    "express": "4.18.2"
  }
}
```

### Maven
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <version>3.1.0</version>
</dependency>
```

### Gradle
```kotlin
dependencies {
    implementation("com.google.guava:guava:31.1-jre")
}
```

## Lock Files

### package-lock.json
Ensures exact dependency versions across environments.

### Gemfile.lock (Ruby)
Locks Ruby gem versions.

### go.sum (Go)
Cryptographic checksums of dependencies.

## Vulnerability Scanning

```bash
# npm audit
npm audit
npm audit fix

# Snyk
snyk test
snyk monitor

# OWASP Dependency Check
dependency-check --project myapp --scan ./
```

## Best Practices

1. **Use lock files** - Commit to version control
2. **Pin versions** - Avoid floating versions in production
3. **Regular updates** - Keep dependencies current
4. **Scan for vulnerabilities** - Automated scanning
5. **Review licenses** - Ensure compliance
6. **Minimize dependencies** - Less is more
7. **Use private registries** - For internal packages
8. **Audit regularly** - Monthly dependency reviews
9. **Document dependencies** - Why each is needed
10. **Test updates** - Before merging
