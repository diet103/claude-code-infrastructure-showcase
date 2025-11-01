#!/bin/bash
#
# Kubernetes Manifest Validation Hook
# Validates Kubernetes YAML files
#

set -e

echo "🔍 Validating Kubernetes manifests..."

# Find all Kubernetes manifest files
K8S_FILES=$(find . -name "*.yaml" -o -name "*.yml" | grep -E "(k8s/|kubernetes/|manifests/)" || true)

if [ -z "$K8S_FILES" ]; then
    echo "ℹ️  No Kubernetes manifests found"
    exit 0
fi

# Validate with kubectl dry-run if available
if command -v kubectl &> /dev/null; then
    for file in $K8S_FILES; do
        kubectl apply --dry-run=client -f "$file" > /dev/null 2>&1 || {
            echo "❌ Invalid Kubernetes manifest: $file"
            exit 1
        }
    done
fi

# Validate with kubeval if available
if command -v kubeval &> /dev/null; then
    kubeval $K8S_FILES || {
        echo "❌ Kubeval validation failed"
        exit 1
    }
fi

# Check for common security issues
for file in $K8S_FILES; do
    # Check for privileged containers
    if grep -q "privileged: true" "$file"; then
        echo "⚠️  Warning: Privileged container in $file"
    fi

    # Check for host network
    if grep -q "hostNetwork: true" "$file"; then
        echo "⚠️  Warning: hostNetwork enabled in $file"
    fi

    # Check for latest tag
    if grep -q "image:.*:latest" "$file"; then
        echo "⚠️  Warning: 'latest' tag used in $file"
    fi
done

echo "✅ Kubernetes manifest validation passed"
exit 0
