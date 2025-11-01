# Cost Optimization & FinOps

FinOps practices, cloud cost optimization, right-sizing resources, spot instances, reserved capacity, and cost allocation for platform engineering.

## Table of Contents

- [FinOps Principles](#finops-principles)
- [Cost Visibility](#cost-visibility)
- [Right-Sizing](#right-sizing)
- [Spot Instances](#spot-instances)
- [Reserved Capacity](#reserved-capacity)
- [Storage Optimization](#storage-optimization)
- [Network Cost Optimization](#network-cost-optimization)
- [Best Practices](#best-practices)

## FinOps Principles

### Three Phases

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Inform     │ →   │   Optimize   │ →   │   Operate    │
│              │     │              │     │              │
│ Visibility   │     │ Right-size   │     │ Continuous   │
│ Allocation   │     │ Commit       │     │ Improvement  │
│ Reporting    │     │ Efficiency   │     │ Governance   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Cost Categories

```
Infrastructure Costs:
├── Compute (40-50%)
├── Storage (20-30%)
├── Network (10-20%)
├── Databases (10-15%)
└── Other Services (5-10%)
```

## Cost Visibility

### Tagging Strategy

**Required Tags:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Cost allocation
    cost-center: "12345"
    department: "engineering"
    team: "platform"
    environment: "production"

    # Business context
    project: "customer-api"
    owner: "team-platform@company.com"

    # Technical context
    managed-by: "terraform"
    service-tier: "critical"
```

**Apply to All Resources:**
```hcl
# Terraform default tags
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      CostCenter  = "12345"
      Department  = "engineering"
      Team        = "platform"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

resource "aws_instance" "web" {
  # ... instance config

  tags = {
    Name        = "web-server"
    Application = "customer-api"
    ServiceTier = "critical"
  }
}
```

### Cost Dashboards

**Grafana Dashboard (Kubecost Integration):**
```yaml
# prometheus-queries.yaml

# Total cluster cost
sum(
  avg_over_time(node_cpu_hourly_cost[1h])
  * on(node) group_left()
  avg_over_time(node_total_hourly_cost[1h])
)

# Cost by namespace
sum(
  container_memory_allocation_bytes
  * on(namespace) group_left(label_cost_center)
  kube_namespace_labels
) by (label_cost_center, namespace)

# Cost by team
sum(
  avg_over_time(kubecost_cluster_costs[1d])
) by (team)

# Idle resource cost
sum(
  (
    kube_pod_container_resource_limits{resource="cpu"}
    -
    rate(container_cpu_usage_seconds_total[5m])
  )
  * on(node) group_left()
  avg_over_time(node_cpu_hourly_cost[1h])
)
```

### AWS Cost Explorer Tags

```bash
# AWS CLI cost query
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=TAG,Key=Team \
  --group-by Type=TAG,Key=Environment
```

## Right-Sizing

### Analysis Tools

**Vertical Pod Autoscaler Recommendations:**
```bash
# Get VPA recommendations
kubectl get vpa api-service-vpa -o jsonpath='{.status.recommendation}'

# Example output:
{
  "containerRecommendations": [{
    "containerName": "api",
    "lowerBound": {
      "cpu": "100m",
      "memory": "128Mi"
    },
    "target": {
      "cpu": "250m",
      "memory": "256Mi"
    },
    "uncappedTarget": {
      "cpu": "300m",
      "memory": "300Mi"
    },
    "upperBound": {
      "cpu": "500m",
      "memory": "512Mi"
    }
  }]
}
```

**Resource Waste Detection:**
```promql
# Over-provisioned CPU (using < 50% of request)
(
  sum by (pod, namespace) (
    rate(container_cpu_usage_seconds_total[5m])
  )
  /
  sum by (pod, namespace) (
    kube_pod_container_resource_requests{resource="cpu"}
  )
) < 0.5

# Over-provisioned memory (using < 50% of request)
(
  sum by (pod, namespace) (
    container_memory_working_set_bytes
  )
  /
  sum by (pod, namespace) (
    kube_pod_container_resource_requests{resource="memory"}
  )
) < 0.5
```

### Right-Sizing Actions

```yaml
# Before (over-provisioned)
resources:
  requests:
    memory: "2Gi"
    cpu: "2000m"
  limits:
    memory: "4Gi"
    cpu: "4000m"

# After (right-sized based on actual usage)
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"

# Potential savings: ~75% reduction
```

## Spot Instances

### Kubernetes with Spot Nodes

**AWS EKS Node Group:**
```hcl
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "spot-workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  capacity_type = "SPOT"

  scaling_config {
    desired_size = 5
    min_size     = 3
    max_size     = 20
  }

  instance_types = [
    "t3.large",
    "t3a.large",
    "t2.large"
  ]

  labels = {
    workload-type = "spot"
  }

  taint {
    key    = "workload-type"
    value  = "spot"
    effect = "NO_SCHEDULE"
  }
}
```

**Workload on Spot:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
spec:
  replicas: 10
  template:
    spec:
      nodeSelector:
        workload-type: spot

      tolerations:
      - key: workload-type
        operator: Equal
        value: spot
        effect: NoSchedule

      # Graceful shutdown for spot interruptions
      terminationGracePeriodSeconds: 120

      containers:
      - name: processor
        image: batch-processor:1.0
        # ... config
```

**AWS Node Termination Handler:**
```yaml
# Handles spot interruption notices
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: aws-node-termination-handler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: aws-node-termination-handler
  template:
    metadata:
      labels:
        app: aws-node-termination-handler
    spec:
      serviceAccountName: aws-node-termination-handler
      containers:
      - name: aws-node-termination-handler
        image: public.ecr.aws/aws-ec2/aws-node-termination-handler:v1.19.0
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: ENABLE_SPOT_INTERRUPTION_DRAINING
          value: "true"
        - name: ENABLE_SCHEDULED_EVENT_DRAINING
          value: "true"
```

### Spot Savings

```
On-Demand Cost:  $0.096/hour (t3.large)
Spot Cost:       $0.029/hour (70% savings)
Monthly Savings: $48 per instance
100 instances:   $4,800/month savings
```

## Reserved Capacity

### AWS Savings Plans

**Compute Savings Plan (Most Flexible):**
```
Commitment:      $500/month for 1 year
Discount:        up to 66% vs on-demand
Applies to:      EC2, Fargate, Lambda
Instance flex:   Any instance type/size/region
```

**EC2 Instance Savings Plan:**
```
Commitment:      $1,000/month for 3 years
Discount:        up to 72% vs on-demand
Applies to:      EC2 only
Instance flex:   Same family, any size
```

**Reserved Instances (Legacy):**
```
Less flexible than Savings Plans
Consider Savings Plans instead
```

### Right Commitment Level

**Analysis Script:**
```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client('ce')

# Get last 30 days usage
end = datetime.now()
start = end - timedelta(days=30)

response = ce.get_cost_and_usage(
    TimePeriod={
        'Start': start.strftime('%Y-%m-%d'),
        'End': end.strftime('%Y-%m-%d')
    },
    Granularity='DAILY',
    Metrics=['UnblendedCost'],
    Filter={
        'Dimensions': {
            'Key': 'SERVICE',
            'Values': ['Amazon Elastic Compute Cloud - Compute']
        }
    }
)

# Calculate baseline usage (minimum daily cost)
daily_costs = [float(day['Total']['UnblendedCost']['Amount'])
               for day in response['ResultsByTime']]
baseline = min(daily_costs)
monthly_commitment = baseline * 30

print(f"Recommended monthly commitment: ${monthly_commitment:.2f}")
print(f"Estimated annual savings: ${monthly_commitment * 12 * 0.3:.2f}")
```

## Storage Optimization

### S3 Lifecycle Policies

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "archive-old-data"
    status = "Enabled"

    # Transition to cheaper storage classes
    transition {
      days          = 30
      storage_class = "STANDARD_IA"  # Infrequent Access
    }

    transition {
      days          = 90
      storage_class = "GLACIER_IR"  # Instant Retrieval
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"  # Cheapest
    }

    # Delete after retention period
    expiration {
      days = 365
    }
  }

  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

**Savings:**
```
Standard:       $0.023/GB/month
Standard-IA:    $0.0125/GB/month (46% cheaper)
Glacier IR:     $0.004/GB/month (83% cheaper)
Deep Archive:   $0.00099/GB/month (96% cheaper)
```

### EBS Optimization

**Delete Unattached Volumes:**
```bash
#!/bin/bash
# find-unused-ebs.sh

aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].[VolumeId,Size,VolumeType,CreateTime]' \
  --output table

# Delete after verification
aws ec2 delete-volume --volume-id vol-xxxxx
```

**Snapshot Cleanup:**
```bash
# Delete snapshots older than 30 days
aws ec2 describe-snapshots --owner-ids self \
  --query 'Snapshots[?StartTime<=`'$(date -d '30 days ago' -Iseconds)'`].[SnapshotId]' \
  --output text | \
  xargs -I {} aws ec2 delete-snapshot --snapshot-id {}
```

### Persistent Volume Cleanup

```bash
# Find PVs not bound to PVC
kubectl get pv | grep Released

# Delete released PVs
kubectl delete pv <pv-name>
```

## Network Cost Optimization

### Data Transfer Costs

**AWS Inter-Region Costs:**
```
Same AZ:              Free
Same Region, diff AZ: $0.01/GB
Cross-Region:         $0.02/GB
Internet Egress:      $0.09/GB (first 10TB)
```

**Optimization Strategies:**
```yaml
# 1. Use VPC endpoints (avoid internet gateway)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.us-east-1.s3"
}

# 2. Use CloudFront for static assets
resource "aws_cloudfront_distribution" "cdn" {
  # CloudFront egress: $0.085/GB (cheaper than direct S3)
}

# 3. Enable S3 Transfer Acceleration (for uploads)
resource "aws_s3_bucket_accelerate_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  status = "Enabled"
}
```

### NAT Gateway Costs

```
NAT Gateway:     $0.045/hour + $0.045/GB processed
NAT Instance:    EC2 cost + $0.00/GB processed
VPC Endpoints:   $0.01/hour + $0.01/GB (S3/DynamoDB free)
```

**Cost Comparison (100GB/month):**
```
NAT Gateway:     $32.40 + $4.50 = $36.90/month
NAT Instance:    ~$8 + $0 = $8/month (75% cheaper)
VPC Endpoint:    $7.20 + $1.00 = $8.20/month (77% cheaper)
```

## Best Practices

### 1. Implement Cost Awareness

Make cost data visible to teams during development.

### 2. Set Budgets and Alerts

```yaml
# AWS Budget
resource "aws_budgets_budget" "team_platform" {
  name              = "team-platform-monthly"
  budget_type       = "COST"
  limit_amount      = "10000"
  limit_unit        = "USD"
  time_period_start = "2024-01-01_00:00"
  time_unit         = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["platform-team@company.com"]
  }

  cost_filters = {
    TagKeyValue = "user:Team$platform"
  }
}
```

### 3. Regular Right-Sizing Reviews

Schedule monthly reviews of resource utilization.

### 4. Automate Cleanup

```yaml
# CronJob to delete old resources
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-old-pvcs
spec:
  schedule: "0 2 * * 0"  # Weekly Sunday 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Delete PVCs older than 30 days with label cleanup=enabled
              kubectl get pvc -A \
                -l cleanup=enabled \
                -o json | \
                jq -r '.items[] |
                  select(
                    (.metadata.creationTimestamp | fromdateiso8601) <
                    (now - 30*24*60*60)
                  ) |
                  "\(.metadata.namespace) \(.metadata.name)"' | \
                while read ns name; do
                  kubectl delete pvc -n "$ns" "$name"
                done
          restartPolicy: OnFailure
```

### 5. Use Cost Allocation Tags

Mandatory tags for all resources.

### 6. Optimize Development Environments

```bash
# Stop dev/staging clusters overnight
0 19 * * * kubectl scale deployment --all --replicas=0 -n development
0 7 * * * kubectl scale deployment --all --replicas=1 -n development
```

### 7. Monitor Idle Resources

Alert on resources with <10% utilization for 7+ days.

---

**Related Resources:**
- [resource-management.md](resource-management.md) - Resource optimization
- [multi-tenancy.md](multi-tenancy.md) - Cost allocation
- [infrastructure-standards.md](infrastructure-standards.md) - Tagging standards
