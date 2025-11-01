# Cloud Cost Optimization

Comprehensive guide to optimizing cloud costs through FinOps practices, right-sizing, reserved capacity, spot instances, tagging strategies, and cost monitoring across AWS, Azure, and GCP.

## Table of Contents

- [FinOps Principles](#finops-principles)
- [Cost Visibility](#cost-visibility)
- [Right-Sizing Resources](#right-sizing-resources)
- [Reserved Capacity](#reserved-capacity)
- [Spot and Preemptible Instances](#spot-and-preemptible-instances)
- [Storage Optimization](#storage-optimization)
- [Networking Costs](#networking-costs)
- [Tagging Strategy](#tagging-strategy)
- [Cost Monitoring and Alerts](#cost-monitoring-and-alerts)
- [Best Practices](#best-practices)

## FinOps Principles

### Three Phases of FinOps

**1. Inform:**
- Visibility into cloud spending
- Allocation and showback
- Forecasting and budgeting

**2. Optimize:**
- Right-sizing resources
- Reserved capacity planning
- Waste elimination

**3. Operate:**
- Continuous optimization
- Automation
- Cultural adoption

### Cloud Cost Model

```
Total Cloud Cost =
  Compute Costs
  + Storage Costs
  + Network Costs (egress)
  + Data Transfer Costs
  + Managed Services Costs
  + Support Costs
  + Licensing Costs
```

## Cost Visibility

### AWS Cost Explorer

**Terraform: Enable Cost Allocation Tags:**
```hcl
resource "aws_ce_cost_category" "environment" {
  name         = "Environment"
  rule_version = "CostCategoryExpression.v1"

  rule {
    value = "Production"
    rule {
      tags {
        key    = "Environment"
        values = ["production", "prod"]
      }
    }
  }

  rule {
    value = "Development"
    rule {
      tags {
        key    = "Environment"
        values = ["development", "dev"]
      }
    }
  }
}

# Cost budget with alerts
resource "aws_budgets_budget" "monthly" {
  name              = "monthly-budget"
  budget_type       = "COST"
  limit_amount      = "10000"
  limit_unit        = "USD"
  time_period_start = "2024-01-01_00:00"
  time_unit         = "MONTHLY"

  cost_filter {
    name = "TagKeyValue"
    values = [
      "user:Environment$production",
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finance@example.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["cto@example.com"]
  }
}
```

### Azure Cost Management

**Example: Budget and Alerts:**
```hcl
resource "azurerm_consumption_budget_subscription" "monthly" {
  name            = "monthly-budget"
  subscription_id = data.azurerm_subscription.current.id

  amount     = 10000
  time_grain = "Monthly"

  time_period {
    start_date = "2024-01-01T00:00:00Z"
  }

  filter {
    tag {
      name = "Environment"
      values = [
        "Production",
      ]
    }
  }

  notification {
    enabled   = true
    threshold = 80.0
    operator  = "GreaterThan"

    contact_emails = [
      "finance@example.com",
    ]
  }

  notification {
    enabled   = true
    threshold = 100.0
    operator  = "GreaterThan"

    contact_emails = [
      "cto@example.com",
    ]
  }
}
```

### GCP Billing Budgets

**Example: Budget Alerts:**
```hcl
resource "google_billing_budget" "monthly" {
  billing_account = var.billing_account
  display_name    = "Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]

    labels = {
      environment = "production"
    }
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "10000"
    }
  }

  threshold_rules {
    threshold_percent = 0.5  # 50%
  }

  threshold_rules {
    threshold_percent = 0.8  # 80%
  }

  threshold_rules {
    threshold_percent = 1.0  # 100%
  }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.id,
    ]
  }
}
```

## Right-Sizing Resources

### AWS Compute Optimizer

**Example: Automated Right-Sizing Script:**
```python
import boto3
import json

ce = boto3.client('ce')
ec2 = boto3.client('ec2')
compute_optimizer = boto3.client('compute-optimizer')

def get_rightsizing_recommendations():
    """Get EC2 right-sizing recommendations"""
    response = compute_optimizer.get_ec2_instance_recommendations()

    recommendations = []
    for recommendation in response['instanceRecommendations']:
        instance_id = recommendation['instanceArn'].split('/')[-1]

        current = recommendation['currentInstanceType']
        options = recommendation['recommendationOptions']

        if options:
            best_option = options[0]  # Lowest cost option
            estimated_savings = recommendation.get('utilizationMetrics', {})

            recommendations.append({
                'instance_id': instance_id,
                'current_type': current,
                'recommended_type': best_option['instanceType'],
                'monthly_savings': best_option.get('estimatedMonthlySavings', {}).get('value', 0),
                'performance_risk': best_option.get('performanceRisk', 'Unknown')
            })

    return recommendations

def analyze_rds_utilization():
    """Analyze RDS utilization for right-sizing"""
    cloudwatch = boto3.client('cloudwatch')
    rds = boto3.client('rds')

    instances = rds.describe_db_instances()

    for instance in instances['DBInstances']:
        db_id = instance['DBInstanceIdentifier']

        # Get CPU utilization
        cpu_response = cloudwatch.get_metric_statistics(
            Namespace='AWS/RDS',
            MetricName='CPUUtilization',
            Dimensions=[{'Name': 'DBInstanceIdentifier', 'Value': db_id}],
            StartTime=datetime.utcnow() - timedelta(days=30),
            EndTime=datetime.utcnow(),
            Period=3600,
            Statistics=['Average', 'Maximum']
        )

        avg_cpu = sum([d['Average'] for d in cpu_response['Datapoints']]) / len(cpu_response['Datapoints'])

        if avg_cpu < 20:
            print(f"RDS {db_id} is underutilized (avg CPU: {avg_cpu:.2f}%)")
            print(f"  Current: {instance['DBInstanceClass']}")
            print(f"  Consider downsizing")

# Usage
recommendations = get_rightsizing_recommendations()
for rec in recommendations:
    print(f"Instance: {rec['instance_id']}")
    print(f"  Current: {rec['current_type']}")
    print(f"  Recommended: {rec['recommended_type']}")
    print(f"  Monthly Savings: ${rec['monthly_savings']}")
    print()
```

## Reserved Capacity

### AWS Reserved Instances and Savings Plans

**Example: Reserved Instance Analysis:**
```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client('ce')

def analyze_ri_opportunities():
    """Analyze RI coverage and recommendations"""

    # Get RI coverage
    response = ce.get_reservation_coverage(
        TimePeriod={
            'Start': (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
            'End': datetime.now().strftime('%Y-%m-%d')
        },
        Granularity='MONTHLY',
        GroupBy=[
            {'Type': 'DIMENSION', 'Key': 'INSTANCE_TYPE'},
        ]
    )

    print("RI Coverage Analysis:")
    for group in response['CoveragesByTime']:
        for coverage in group['Groups']:
            instance_type = coverage['Attributes']['INSTANCE_TYPE']
            coverage_hours = coverage['Coverage']['CoverageHours']

            on_demand_hours = float(coverage_hours['OnDemandHours'])
            reserved_hours = float(coverage_hours['ReservedHours'])
            total_hours = float(coverage_hours['TotalRunningHours'])

            coverage_pct = (reserved_hours / total_hours * 100) if total_hours > 0 else 0

            print(f"{instance_type}: {coverage_pct:.1f}% covered")
            if coverage_pct < 80:
                print(f"  → Consider purchasing RIs (On-Demand: {on_demand_hours:.0f}h/month)")

    # Get RI purchase recommendations
    rec_response = ce.get_reservation_purchase_recommendation(
        Service='Amazon Elastic Compute Cloud - Compute',
        LookbackPeriodInDays='THIRTY_DAYS',
        TermInYears='ONE_YEAR',
        PaymentOption='PARTIAL_UPFRONT'
    )

    print("\nRI Purchase Recommendations:")
    for rec in rec_response['Recommendations']:
        details = rec['RecommendationDetails']
        print(f"Instance: {details['InstanceDetails']['EC2InstanceDetails']['InstanceType']}")
        print(f"  Recommended Quantity: {rec['RecommendedNumberOfInstancesToPurchase']}")
        print(f"  Estimated Monthly Savings: ${rec['EstimatedMonthlySavingsAmount']}")
        print(f"  Estimated ROI: {rec['EstimatedBreakEvenInMonths']} months")
```

**Terraform: Purchase RIs:**
```hcl
# AWS Reserved Instance
resource "aws_ec2_capacity_reservation" "database" {
  instance_type     = "r5.2xlarge"
  instance_platform = "Linux/UNIX"
  availability_zone = "us-east-1a"
  instance_count    = 2

  # Reserved for 1 year
  end_date_type = "limited"
  end_date      = "2025-12-31T23:59:59Z"

  tags = {
    Name        = "database-reserved-capacity"
    Environment = "production"
  }
}
```

### Azure Reserved Instances

```hcl
# Azure Reserved VM Instance
resource "azurerm_reservation" "vm" {
  name                = "production-vm-reservation"
  resource_group_name = azurerm_resource_group.main.name

  reservation_order_id = var.reservation_order_id
  reserved_resource_type = "VirtualMachines"

  sku_name = "Standard_D4s_v3"
  quantity = 10
  term     = "P1Y"  # 1 year

  billing_plan = "Upfront"
  scope        = "Shared"

  tags = {
    Environment = "production"
  }
}
```

## Spot and Preemptible Instances

### AWS Spot Instances

**Example: Spot Fleet for Batch Processing:**
```hcl
resource "aws_spot_fleet_request" "batch" {
  iam_fleet_role      = aws_iam_role.spot_fleet.arn
  allocation_strategy = "lowestPrice"
  target_capacity     = 10
  valid_until         = "2025-12-31T23:59:59Z"

  # Multiple instance types for flexibility
  launch_specification {
    instance_type               = "c5.large"
    ami                         = data.aws_ami.amazon_linux_2.id
    spot_price                  = "0.05"
    subnet_id                   = aws_subnet.private[0].id
    vpc_security_group_ids      = [aws_security_group.batch.id]
    iam_instance_profile_arn    = aws_iam_instance_profile.batch.arn
    user_data                   = filebase64("${path.module}/userdata.sh")

    tags = {
      Name = "batch-processor-spot"
    }
  }

  launch_specification {
    instance_type            = "c5.xlarge"
    ami                      = data.aws_ami.amazon_linux_2.id
    spot_price               = "0.10"
    subnet_id                = aws_subnet.private[1].id
    vpc_security_group_ids   = [aws_security_group.batch.id]
    iam_instance_profile_arn = aws_iam_instance_profile.batch.arn
  }

  launch_specification {
    instance_type            = "c4.large"
    ami                      = data.aws_ami.amazon_linux_2.id
    spot_price               = "0.04"
    subnet_id                = aws_subnet.private[2].id
    vpc_security_group_ids   = [aws_security_group.batch.id]
    iam_instance_profile_arn = aws_iam_instance_profile.batch.arn
  }
}
```

### GCP Preemptible VMs

**Example: Preemptible Instance Group:**
```hcl
resource "google_compute_instance_template" "preemptible" {
  name_prefix  = "batch-preemptible-"
  machine_type = "n1-standard-4"

  disk {
    source_image = "debian-cloud/debian-11"
    auto_delete  = true
    boot         = true
  }

  scheduling {
    preemptible       = true
    automatic_restart = false
  }

  network_interface {
    network = google_compute_network.vpc.id
  }

  service_account {
    email  = google_service_account.batch.email
    scopes = ["cloud-platform"]
  }
}

resource "google_compute_instance_group_manager" "preemptible" {
  name               = "batch-preemptible-group"
  base_instance_name = "batch"
  zone               = var.zone
  target_size        = 10

  version {
    instance_template = google_compute_instance_template.preemptible.id
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.batch.id
    initial_delay_sec = 300
  }
}
```

## Storage Optimization

### S3 Intelligent Tiering

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "intelligent" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "intelligent-tiering"
    status = "Enabled"

    transition {
      days          = 0
      storage_class = "INTELLIGENT_TIERING"
    }
  }

  rule {
    id     = "glacier-archive"
    status = "Enabled"

    filter {
      prefix = "archive/"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 2555  # 7 years
    }
  }
}

# S3 Intelligent-Tiering configuration
resource "aws_s3_bucket_intelligent_tiering_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  name   = "EntireDataBucket"

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
}
```

## Networking Costs

### Minimize Data Transfer

**Pattern: Keep Data in Same Region:**
```hcl
# Bad: Cross-region data transfer (expensive)
resource "aws_s3_bucket" "data" {
  bucket = "app-data"
  region = "us-west-2"
}

resource "aws_instance" "app" {
  availability_zone = "us-east-1a"  # Different region!
}

# Good: Same region
resource "aws_s3_bucket" "data" {
  bucket = "app-data"
  region = "us-east-1"
}

resource "aws_instance" "app" {
  availability_zone = "us-east-1a"  # Same region
}
```

### VPC Endpoints for AWS Services

```hcl
# Avoid NAT Gateway charges for S3/DynamoDB access
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"

  route_table_ids = aws_route_table.private[*].id

  tags = {
    Name = "s3-endpoint"
  }
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.dynamodb"

  route_table_ids = aws_route_table.private[*].id
}

# Interface endpoint for other services
resource "aws_vpc_endpoint" "ec2" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.ec2"
  vpc_endpoint_type = "Interface"

  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  private_dns_enabled = true
}
```

## Tagging Strategy

### Comprehensive Tagging Policy

```hcl
# Enforce tagging policy
locals {
  common_tags = {
    Environment  = var.environment
    Project      = var.project_name
    ManagedBy    = "terraform"
    Owner        = var.owner
    CostCenter   = var.cost_center
    Application  = var.application_name
    Compliance   = var.compliance_level
    DataClass    = var.data_classification
  }
}

# Apply to all resources
resource "aws_instance" "app" {
  # ... configuration ...

  tags = merge(
    local.common_tags,
    {
      Name = "app-server-${var.environment}"
      Role = "application"
    }
  )
}

# AWS Organizations tag policy
resource "aws_organizations_policy" "tagging" {
  name        = "tagging-policy"
  description = "Required tags for all resources"
  type        = "TAG_POLICY"

  content = jsonencode({
    tags = {
      Environment = {
        tag_key = {
          "@@assign" = "Environment"
        }
        tag_value = {
          "@@assign" = ["production", "staging", "development"]
        }
        enforced_for = {
          "@@assign" = ["ec2:instance", "rds:db", "s3:bucket"]
        }
      }
      CostCenter = {
        tag_key = {
          "@@assign" = "CostCenter"
        }
        enforced_for = {
          "@@assign" = ["*"]
        }
      }
    }
  })
}
```

## Cost Monitoring and Alerts

### CloudWatch Billing Alarms

```hcl
resource "aws_cloudwatch_metric_alarm" "billing" {
  alarm_name          = "billing-alarm-${var.threshold}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "21600"  # 6 hours
  statistic           = "Maximum"
  threshold           = var.threshold
  alarm_description   = "Billing alarm for $${var.threshold}"
  alarm_actions       = [aws_sns_topic.billing_alerts.arn]

  dimensions = {
    Currency = "USD"
  }
}

resource "aws_sns_topic" "billing_alerts" {
  name = "billing-alerts"
}

resource "aws_sns_topic_subscription" "billing_email" {
  topic_arn = aws_sns_topic.billing_alerts.arn
  protocol  = "email"
  endpoint  = var.billing_alert_email
}
```

## Best Practices

### 1. Implement FinOps Culture
- Make cost everyone's responsibility
- Regular cost reviews with teams
- Celebrate cost optimization wins

### 2. Tag Everything
- Enforce tagging policies
- Use cost allocation tags
- Regular tag compliance audits

### 3. Right-Size Continuously
- Monitor utilization metrics
- Automated right-sizing recommendations
- Regular review and adjustment

### 4. Use Reserved Capacity Wisely
- Analyze usage patterns
- Start with 1-year terms
- Use Savings Plans for flexibility

### 5. Leverage Spot/Preemptible
- Fault-tolerant workloads
- Batch processing
- Development environments

### 6. Optimize Storage
- Lifecycle policies
- Intelligent tiering
- Delete unused data

### 7. Minimize Data Transfer
- Keep data and compute together
- Use CDN for content
- VPC endpoints for AWS services

### 8. Monitor and Alert
- Budget alerts
- Anomaly detection
- Regular cost reviews

### 9. Automation
- Auto-start/stop development resources
- Automated cleanup
- Policy enforcement

### 10. Education
- Train teams on cost awareness
- Share cost dashboards
- Regular cost optimization sessions

## Anti-Patterns

❌ **No tagging strategy** - Can't track or allocate costs
❌ **Always-on development environments** - Wasting money 24/7
❌ **Ignoring reserved capacity** - Paying on-demand premium
❌ **Over-provisioning** - "Better safe than sorry" mentality
❌ **No cost monitoring** - Surprise bills
❌ **Cross-region data transfer** - Expensive egress
❌ **Not using spot instances** - Missing 70-90% savings
❌ **Keeping old snapshots** - Storage costs add up
❌ **No lifecycle policies** - Data never expires
❌ **Manual cost optimization** - Not scalable
