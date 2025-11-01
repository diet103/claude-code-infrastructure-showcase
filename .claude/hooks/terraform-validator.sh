#!/bin/bash
#
# Terraform Validation Hook
# Validates Terraform files before applying changes
#

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if running in Terraform context
if [ ! -f "*.tf" ] && [ ! -d ".terraform" ]; then
    # Not a Terraform project, skip
    exit 0
fi

echo "🔍 Running Terraform validation..."

# Run terraform fmt check
if command -v terraform &> /dev/null; then
    terraform fmt -check -recursive || {
        echo "❌ Terraform formatting issues found. Run: terraform fmt -recursive"
        exit 1
    }

    # Run terraform validate
    terraform init -backend=false > /dev/null 2>&1
    terraform validate || {
        echo "❌ Terraform validation failed"
        exit 1
    }
fi

# Run tflint if available
if command -v tflint &> /dev/null; then
    tflint --init > /dev/null 2>&1
    tflint || {
        echo "❌ tflint found issues"
        exit 1
    }
fi

# Run checkov if available
if command -v checkov &> /dev/null; then
    checkov -d . --quiet --compact || {
        echo "⚠️  Checkov found security issues"
        # Don't fail, just warn
    }
fi

echo "✅ Terraform validation passed"
exit 0
