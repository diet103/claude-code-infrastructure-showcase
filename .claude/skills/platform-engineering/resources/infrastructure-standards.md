# Infrastructure Standards & Governance

Naming conventions, tagging strategies, security baselines, compliance frameworks, and governance policies for platform engineering.

## Table of Contents

- [Naming Conventions](#naming-conventions)
- [Tagging Strategy](#tagging-strategy)
- [Security Baselines](#security-baselines)
- [Compliance Frameworks](#compliance-frameworks)
- [Governance Policies](#governance-policies)
- [Documentation Standards](#documentation-standards)

## Naming Conventions

### General Principles

```
1. Lowercase with hyphens (kebab-case)
2. Descriptive and consistent
3. Include environment/context
4. Maximum length limits
5. No special characters (except hyphens)
```

### Kubernetes Resources

**Namespaces:**
```
Format: {team}-{environment}
Examples:
  - platform-production
  - platform-staging
  - platform-development
  - data-science-prod
```

**Deployments:**
```
Format: {service-name}
Examples:
  - api-service
  - frontend
  - background-worker
  - cache-server
```

**Services:**
```
Format: {service-name}
Same as deployment name
Examples:
  - api-service
  - frontend
```

**ConfigMaps/Secrets:**
```
Format: {service-name}-{type}
Examples:
  - api-service-config
  - api-service-secrets
  - database-credentials
  - tls-certificates
```

**Ingress:**
```
Format: {service-name}-ingress
Examples:
  - api-service-ingress
  - frontend-ingress
```

### AWS Resources

**VPC:**
```
Format: {project}-{environment}-vpc
Examples:
  - company-prod-vpc
  - company-staging-vpc
```

**Subnets:**
```
Format: {project}-{environment}-{type}-{az}
Examples:
  - company-prod-private-1a
  - company-prod-public-1b
  - company-staging-private-1c
```

**EC2 Instances:**
```
Format: {project}-{environment}-{role}-{number}
Examples:
  - company-prod-web-01
  - company-prod-worker-03
  - company-staging-bastion-01
```

**RDS:**
```
Format: {project}-{environment}-{engine}-{purpose}
Examples:
  - company-prod-postgres-primary
  - company-prod-mysql-replica
  - company-staging-postgres-main
```

**S3 Buckets:**
```
Format: {company}-{project}-{environment}-{purpose}
Examples:
  - acme-platform-prod-data
  - acme-platform-prod-backups
  - acme-platform-staging-uploads

Note: S3 buckets are globally unique
```

**Load Balancers:**
```
Format: {project}-{environment}-{type}-lb
Examples:
  - company-prod-public-lb
  - company-prod-internal-lb
```

**Security Groups:**
```
Format: {project}-{environment}-{purpose}-sg
Examples:
  - company-prod-web-sg
  - company-prod-database-sg
  - company-staging-bastion-sg
```

## Tagging Strategy

### Mandatory Tags

```yaml
# All resources must have these tags
tags:
  Name: "resource-name"              # Human-readable name
  Environment: "production"          # production, staging, development
  Project: "customer-platform"       # Project/product name
  Owner: "team-platform"             # Owning team
  CostCenter: "12345"               # Billing code
  ManagedBy: "terraform"            # How resource is managed
  CreatedDate: "2024-01-15"         # When created (ISO 8601)
```

### Optional Tags

```yaml
tags:
  # Business context
  Department: "engineering"
  BusinessUnit: "platform"
  Application: "api-service"
  ServiceTier: "critical"           # critical, important, standard

  # Technical context
  Version: "v1.2.3"
  GitRepo: "company/api-service"
  Component: "backend"
  DataClassification: "confidential" # public, internal, confidential, restricted

  # Operational
  Backup: "daily"                    # Backup schedule
  MaintenanceWindow: "sun-02:00"    # Preferred maintenance time
  AutoShutdown: "true"              # Can be shut down to save costs
  Compliance: "pci-dss,hipaa"       # Compliance requirements
```

### Terraform Implementation

```hcl
# variables.tf
variable "mandatory_tags" {
  type = map(string)
  default = {
    Project     = "customer-platform"
    Owner       = "team-platform"
    ManagedBy   = "terraform"
    Environment = "production"
  }
}

# main.tf
locals {
  common_tags = merge(
    var.mandatory_tags,
    {
      CostCenter  = "12345"
      CreatedDate = formatdate("YYYY-MM-DD", timestamp())
    }
  )
}

# Provider-level default tags
provider "aws" {
  default_tags {
    tags = local.common_tags
  }
}

# Resource-specific tags
resource "aws_instance" "web" {
  # ... instance config

  tags = merge(
    local.common_tags,
    {
      Name           = "web-server-01"
      ServiceTier    = "critical"
      Application    = "frontend"
      Backup         = "daily"
    }
  )
}
```

### Tag Validation

```python
# validate-tags.py
import boto3

REQUIRED_TAGS = ['Name', 'Environment', 'Project', 'Owner', 'CostCenter', 'ManagedBy']
VALID_ENVIRONMENTS = ['production', 'staging', 'development']

def validate_resource_tags(resource):
    tags = {tag['Key']: tag['Value'] for tag in resource.get('Tags', [])}

    # Check required tags exist
    missing_tags = [tag for tag in REQUIRED_TAGS if tag not in tags]
    if missing_tags:
        return False, f"Missing tags: {missing_tags}"

    # Validate environment value
    if tags.get('Environment') not in VALID_ENVIRONMENTS:
        return False, f"Invalid environment: {tags.get('Environment')}"

    return True, "Valid"

# Scan all EC2 instances
ec2 = boto3.client('ec2')
instances = ec2.describe_instances()

for reservation in instances['Reservations']:
    for instance in reservation['Instances']:
        valid, message = validate_resource_tags(instance)
        if not valid:
            print(f"Instance {instance['InstanceId']}: {message}")
```

## Security Baselines

### Kubernetes Pod Security Standards

```yaml
# Enforce restricted policy for production
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**Restricted Pod Requirements:**
```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault

  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL

    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "256Mi"
        cpu: "500m"
```

### AWS Security Baseline

**IAM Policies:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

**S3 Bucket Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::bucket-name/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::bucket-name",
        "arn:aws:s3:::bucket-name/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

**VPC Baseline:**
```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Enable VPC flow logs
  enable_flow_logs = true
}

resource "aws_flow_log" "main" {
  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_log.arn
  log_destination = aws_cloudwatch_log_group.flow_log.arn
}
```

## Compliance Frameworks

### CIS Kubernetes Benchmark

**Key Requirements:**
```yaml
# 1. RBAC enabled (default in modern K8s)
# 2. Pod Security Standards enforced
# 3. Network policies implemented
# 4. Audit logging enabled
# 5. Secrets encrypted at rest
# 6. TLS for all communications

# Enable audit logging
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    - --audit-log-path=/var/log/kubernetes/audit.log
    - --audit-log-maxage=30
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=100
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
```

### PCI-DSS Requirements

```yaml
# Network segmentation
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: pci-segmentation
spec:
  podSelector:
    matchLabels:
      pci-scope: "true"
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          pci-scope: "true"
  egress:
  - to:
    - podSelector:
        matchLabels:
          pci-scope: "true"
```

### SOC 2 Controls

```yaml
# Access controls and audit trails
apiVersion: v1
kind: ConfigMap
metadata:
  name: audit-policy
data:
  policy.yaml: |
    apiVersion: audit.k8s.io/v1
    kind: Policy
    rules:
    # Log all requests at RequestResponse level
    - level: RequestResponse
      omitStages:
      - RequestReceived
```

## Governance Policies

### Open Policy Agent (OPA/Gatekeeper)

**Installation:**
```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml
```

**Require Labels:**
```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package k8srequiredlabels

      violation[{"msg": msg, "details": {"missing_labels": missing}}] {
        provided := {label | input.review.object.metadata.labels[label]}
        required := {label | label := input.parameters.labels[_]}
        missing := required - provided
        count(missing) > 0
        msg := sprintf("Missing required labels: %v", [missing])
      }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-app-labels
spec:
  match:
    kinds:
    - apiGroups: ["apps"]
      kinds: ["Deployment"]
    namespaces:
    - production
  parameters:
    labels:
    - app
    - environment
    - owner
    - cost-center
```

**Enforce Resource Limits:**
```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8scontainerlimits
spec:
  crd:
    spec:
      names:
        kind: K8sContainerLimits
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package k8scontainerlimits

      violation[{"msg": msg}] {
        container := input.review.object.spec.containers[_]
        not container.resources.limits
        msg := sprintf("Container %v must have resource limits", [container.name])
      }

      violation[{"msg": msg}] {
        container := input.review.object.spec.containers[_]
        not container.resources.requests
        msg := sprintf("Container %v must have resource requests", [container.name])
      }
```

**Block Privileged Containers:**
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sPSPPrivilegedContainer
metadata:
  name: block-privileged-containers
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    namespaces:
    - production
```

### Kyverno Policies

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
spec:
  validationFailureAction: enforce
  background: false
  rules:
  - name: check-for-labels
    match:
      any:
      - resources:
          kinds:
          - Pod
          - Deployment
    validate:
      message: "Labels 'app' and 'owner' are required"
      pattern:
        metadata:
          labels:
            app: "?*"
            owner: "?*"

---
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-resources
spec:
  rules:
  - name: add-default-requests
    match:
      any:
      - resources:
          kinds:
          - Pod
    mutate:
      patchStrategicMerge:
        spec:
          containers:
          - (name): "*"
            resources:
              requests:
                memory: "128Mi"
                cpu: "100m"
              limits:
                memory: "256Mi"
                cpu: "500m"
```

## Documentation Standards

### README Template

```markdown
# Service Name

Brief description of what this service does.

## Architecture

High-level architecture diagram and explanation.

## Prerequisites

- Kubernetes 1.27+
- Helm 3.12+
- Required secrets in Vault

## Deployment

\`\`\`bash
# Development
kubectl apply -k overlays/development

# Production
kubectl apply -k overlays/production
\`\`\`

## Configuration

Environment variables and configuration options.

## Monitoring

- Metrics: http://grafana/d/service-name
- Logs: http://kibana/app/service-name
- Alerts: http://alertmanager

## Runbooks

Links to operational runbooks.

## Ownership

- Team: Platform Team
- Contact: platform-team@company.com
- On-call: PagerDuty rotation
```

### Architecture Decision Records (ADRs)

```markdown
# ADR-001: Use PostgreSQL for API Service Database

## Status

Accepted

## Context

We need to choose a database for the API service.

## Decision

We will use PostgreSQL 15 for the following reasons:
- ACID compliance required
- Complex queries needed
- Team expertise in PostgreSQL
- Excellent Kubernetes operator support

## Consequences

Positive:
- Strong consistency guarantees
- Rich query capabilities
- Mature ecosystem

Negative:
- Horizontal scaling more complex than NoSQL
- Higher resource requirements than simpler databases

## Alternatives Considered

- MySQL: Less feature-rich
- MongoDB: Not ACID compliant
- DynamoDB: Vendor lock-in
```

---

**Related Resources:**
- [platform-security.md](platform-security.md) - Security implementation
- [multi-tenancy.md](multi-tenancy.md) - Namespace standards
- [cost-optimization.md](cost-optimization.md) - Tagging for cost allocation
