# Build Systems

Comprehensive comparison and guide for modern build systems including Make, Gradle, Maven, Bazel, npm/yarn/pnpm, and tool selection criteria.

## Table of Contents

- [Overview](#overview)
- [Make](#make)
- [Gradle](#gradle)
- [Maven](#maven)
- [Bazel](#bazel)
- [npm/yarn/pnpm](#npmyarnpnpm)
- [Comparison](#comparison)
- [Tool Selection](#tool-selection)
- [Best Practices](#best-practices)

## Overview

Build systems automate the process of converting source code into executable artifacts. Choosing the right build tool depends on language ecosystem, project size, team expertise, and build requirements.

**Key Capabilities:**
- Dependency management
- Incremental compilation
- Parallel execution
- Build caching
- Multi-platform support
- Plugin ecosystem

## Make

Classic build tool based on file dependencies and timestamps.

**Makefile:**
```makefile
CC = gcc
CFLAGS = -Wall -O2
TARGET = myapp
SOURCES = main.c utils.c
OBJECTS = $(SOURCES:.c=.o)

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJECTS)
	$(CC) $(CFLAGS) -o $@ $^

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJECTS) $(TARGET)

install: $(TARGET)
	install -m 755 $(TARGET) /usr/local/bin
```

**Pros:**
- Universal, installed everywhere
- Simple for small projects
- Fast dependency checking
- Language agnostic

**Cons:**
- Complex syntax for large projects
- No built-in dependency management
- Platform-specific makefiles
- No standardized project structure

## Gradle

Flexible JVM build tool with Groovy/Kotlin DSL.

**build.gradle.kts:**
```kotlin
plugins {
    kotlin("jvm") version "1.9.0"
    application
}

group = "com.example"
version = "1.0.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web:3.1.0")
    testImplementation("org.junit.jupiter:junit-jupiter:5.9.3")
}

tasks.test {
    useJUnitPlatform()
}

application {
    mainClass.set("com.example.MainKt")
}

// Custom task
tasks.register("hello") {
    doLast {
        println("Hello from Gradle!")
    }
}

// Parallel compilation
tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions {
        jvmTarget = "17"
    }
}
```

**Multi-Module Project:**
```kotlin
// settings.gradle.kts
rootProject.name = "myapp"
include("api", "core", "web")

// api/build.gradle.kts
dependencies {
    implementation(project(":core"))
}
```

**Pros:**
- Flexible and powerful
- Excellent for multi-module projects
- Strong caching support
- Large plugin ecosystem

**Cons:**
- Steep learning curve
- Build scripts can become complex
- Slower than some alternatives

## Maven

Convention-over-configuration JVM build tool.

**pom.xml:**
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.example</groupId>
    <artifactId>myapp</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <properties>
        <java.version>17</java.version>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>3.1.0</version>
        </dependency>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.9.3</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

**Multi-Module:**
```xml
<!-- Parent pom.xml -->
<modules>
    <module>api</module>
    <module>core</module>
    <module>web</module>
</modules>

<!-- Child module -->
<parent>
    <groupId>com.example</groupId>
    <artifactId>parent</artifactId>
    <version>1.0.0</version>
</parent>
```

**Pros:**
- Strong conventions
- Standardized structure
- Mature ecosystem
- Great for Java projects

**Cons:**
- XML verbose
- Less flexible than Gradle
- Slower build times

## Bazel

Hermetic, reproducible build system for monorepos.

**WORKSPACE:**
```python
workspace(name = "myapp")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "rules_jvm_external",
    sha256 = "...",
    url = "https://github.com/bazelbuild/rules_jvm_external/releases/download/4.5/rules_jvm_external-4.5.tar.gz",
)

load("@rules_jvm_external//:defs.bzl", "maven_install")

maven_install(
    artifacts = [
        "com.google.guava:guava:31.1-jre",
        "org.junit.jupiter:junit-jupiter:5.9.3",
    ],
    repositories = [
        "https://repo1.maven.org/maven2",
    ],
)
```

**BUILD:**
```python
java_library(
    name = "core",
    srcs = glob(["src/main/java/**/*.java"]),
    deps = [
        "@maven//:com_google_guava_guava",
    ],
    visibility = ["//visibility:public"],
)

java_binary(
    name = "app",
    srcs = ["Main.java"],
    deps = [":core"],
    main_class = "com.example.Main",
)

java_test(
    name = "core_test",
    srcs = glob(["src/test/java/**/*.java"]),
    deps = [
        ":core",
        "@maven//:org_junit_jupiter_junit_jupiter",
    ],
)
```

**Pros:**
- Truly reproducible builds
- Excellent for monorepos
- Multi-language support
- Powerful caching

**Cons:**
- Steep learning curve
- Complex configuration
- Requires infrastructure investment

## npm/yarn/pnpm

JavaScript/TypeScript package managers and build tools.

**package.json:**
```json
{
  "name": "myapp",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "typescript": "^5.1.6",
    "jest": "^29.6.1"
  }
}
```

**pnpm Workspace:**
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**Comparison:**

| Feature | npm | yarn | pnpm |
|---------|-----|------|------|
| Speed | Slow | Fast | Fastest |
| Disk Usage | High | High | Low (hard links) |
| Workspaces | Yes | Yes | Yes |
| Offline | No | Yes | Yes |

**Pros:**
- Native JavaScript ecosystem
- Large package registry
- Simple configuration
- Fast iteration

**Cons:**
- Dependency hell without lock files
- Security concerns
- No type safety in package.json

## Comparison

| Feature | Make | Gradle | Maven | Bazel | npm |
|---------|------|--------|-------|-------|-----|
| Learning Curve | Low | High | Medium | Very High | Low |
| Build Speed | Fast | Medium | Slow | Very Fast | Medium |
| Caching | Manual | Good | Limited | Excellent | Good |
| Incremental | Manual | Yes | Limited | Yes | Yes |
| Multi-language | Yes | Limited | No | Yes | No |
| Reproducibility | No | Medium | Medium | Excellent | Medium |
| Best For | C/C++ | JVM | Java | Monorepo | JS/TS |

## Tool Selection

**Choose Make when:**
- Building C/C++ projects
- Simple build requirements
- System-level projects
- Maximum portability needed

**Choose Gradle when:**
- JVM projects (Java, Kotlin, Scala)
- Need flexibility and customization
- Multi-module projects
- Android development

**Choose Maven when:**
- Standard Java projects
- Prefer convention over configuration
- Enterprise Java development
- Team familiar with Maven

**Choose Bazel when:**
- Large monorepo
- Need reproducible builds
- Multi-language projects
- Have infrastructure resources

**Choose npm/yarn/pnpm when:**
- JavaScript/TypeScript projects
- Frontend development
- Node.js applications
- Need quick iteration

## Best Practices

1. **Use dependency locking** - Lock files for reproducibility
2. **Enable caching** - Local and remote caching
3. **Parallelize builds** - Use tool's parallel features
4. **Version build tools** - Lock build tool versions
5. **Clean separation** - Separate build from runtime
6. **Monitor build times** - Track and optimize
7. **Use incremental builds** - Don't rebuild unnecessarily
8. **Document builds** - README with build instructions
9. **Automate in CI** - Same commands local and CI
10. **Keep it simple** - Don't over-engineer build scripts
