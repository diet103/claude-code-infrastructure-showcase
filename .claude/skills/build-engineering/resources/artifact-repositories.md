# Artifact Repositories

Guide to artifact repositories including Artifactory, Nexus, container registries, and retention policies.

## Overview

Artifact repositories store binary artifacts, providing versioning, access control, and efficient distribution.

## Artifactory

### Setup
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: artifactory
spec:
  serviceName: artifactory
  replicas: 1
  template:
    spec:
      containers:
      - name: artifactory
        image: docker.bintray.io/jfrog/artifactory-oss:latest
        ports:
        - containerPort: 8081
        volumeMounts:
        - name: data
          mountPath: /var/opt/jfrog/artifactory
```

### Configuration
```bash
# Upload artifact
curl -u user:password -T artifact.jar \
  "http://artifactory:8081/artifactory/libs-release/com/example/artifact/1.0.0/artifact-1.0.0.jar"
```

## Nexus

### Docker Registry
```bash
# Login
docker login nexus.example.com

# Push
docker tag myapp:1.0 nexus.example.com/myapp:1.0
docker push nexus.example.com/myapp:1.0
```

## Retention Policies

### Time-based
- Delete artifacts older than 90 days
- Keep last N versions

### Space-based
- Delete when storage exceeds threshold
- Keep minimum N versions

## Best Practices

1. **Implement retention** - Automatic cleanup
2. **Use access control** - Role-based permissions
3. **Enable replication** - Multi-region availability
4. **Scan artifacts** - Vulnerability scanning
5. **Version everything** - No overwrites
6. **Use staging** - Promote through environments
7. **Monitor usage** - Storage and bandwidth
8. **Backup regularly** - Disaster recovery
9. **Use CDN** - For public artifacts
10. **Document policies** - Clear retention rules
