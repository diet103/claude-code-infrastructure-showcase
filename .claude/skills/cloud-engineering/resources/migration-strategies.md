# Cloud Migration Strategies

Comprehensive guide to cloud migration approaches, patterns, and best practices for moving workloads to AWS, Azure, and GCP.

## The 6 R's of Migration

```
┌─────────────────────────────────────────────────────────────┐
│                  Migration Strategies                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Rehost     │  Replatform  │   Refactor   │   Repurchase   │
│ "Lift & Shift"│ "Lift, Tinker│  "Re-architect│ "Drop & Shop"  │
│              │   & Shift"   │              │                │
│  Fastest     │   Balanced   │  Most Value  │   Strategic    │
│  Least Cost  │   Moderate   │  Highest Cost│   Vendor Lock  │
├──────────────┼──────────────┼──────────────┼────────────────┤
│   Retire     │   Retain     │              │                │
│ "Decommission"│ "Keep as-is" │              │                │
│              │              │              │                │
│ Cost Savings │  No Change   │              │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### 1. Rehost (Lift and Shift)

**When to Use:**
- Quick migration needed
- Minimal application changes
- Legacy applications
- Limited cloud expertise
- Tight timeline

**AWS Migration:**
```hcl
# AWS Application Migration Service (MGN)
resource "aws_mgn_replication_configuration_template" "default" {
  associate_default_security_group = false
  bandwidth_throttling             = 0
  create_public_ip                 = false
  data_plane_routing               = "PRIVATE_IP"
  default_large_staging_disk_type  = "GP3"
  ebs_encryption                   = "DEFAULT"
  replication_server_instance_type = "t3.small"
  replication_servers_security_groups_ids = [aws_security_group.replication.id]
  staging_area_subnet_id           = aws_subnet.private[0].id
  staging_area_tags = {
    Environment = "migration"
  }
  use_dedicated_replication_server = false
}

# Launch template for migrated instances
resource "aws_launch_template" "migrated_app" {
  name = "migrated-app-template"

  block_device_mappings {
    device_name = "/dev/sda1"

    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      encrypted             = true
      kms_key_id            = aws_kms_key.main.arn
      delete_on_termination = true
    }
  }

  iam_instance_profile {
    arn = aws_iam_instance_profile.app.arn
  }

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.app.id]
    subnet_id                   = aws_subnet.private_app[0].id
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "migrated-app"
      Environment = "production"
      Migration   = "rehost"
    }
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    # Post-migration configuration
    systemctl enable cloudwatch-agent
    systemctl start cloudwatch-agent
  EOF
  )
}
```

**Azure Migrate:**
```hcl
resource "azurerm_site_recovery_replication_policy" "main" {
  name                                                 = "migration-policy"
  resource_group_name                                  = azurerm_resource_group.recovery.name
  recovery_vault_name                                  = azurerm_recovery_services_vault.main.name
  recovery_point_retention_in_minutes                  = 24 * 60
  application_consistent_snapshot_frequency_in_minutes = 4 * 60
}

resource "azurerm_site_recovery_protection_container_mapping" "main" {
  name                                      = "migration-mapping"
  resource_group_name                       = azurerm_resource_group.recovery.name
  recovery_vault_name                       = azurerm_recovery_services_vault.main.name
  recovery_fabric_name                      = azurerm_site_recovery_fabric.primary.name
  recovery_source_protection_container_name = azurerm_site_recovery_protection_container.primary.name
  recovery_target_protection_container_id   = azurerm_site_recovery_protection_container.secondary.id
  recovery_replication_policy_id            = azurerm_site_recovery_replication_policy.main.id
}
```

### 2. Replatform (Lift, Tinker, and Shift)

**When to Use:**
- Want cloud benefits without full refactoring
- Database migrations to managed services
- Minor optimizations acceptable
- Balance between speed and benefit

**Database Migration Example:**
```hcl
# AWS Database Migration Service
resource "aws_dms_replication_instance" "main" {
  replication_instance_id   = "db-migration-instance"
  replication_instance_class = "dms.c5.xlarge"
  allocated_storage         = 100
  vpc_security_group_ids    = [aws_security_group.dms.id]
  replication_subnet_group_id = aws_dms_replication_subnet_group.main.id
  publicly_accessible       = false
  multi_az                  = true

  tags = {
    Name = "database-migration"
  }
}

# Source endpoint (on-premises PostgreSQL)
resource "aws_dms_endpoint" "source" {
  endpoint_id   = "source-postgres"
  endpoint_type = "source"
  engine_name   = "postgres"
  server_name   = var.onprem_db_host
  port          = 5432
  database_name = "production"
  username      = var.db_username
  password      = var.db_password
  ssl_mode      = "require"

  tags = {
    Name = "source-database"
  }
}

# Target endpoint (RDS)
resource "aws_dms_endpoint" "target" {
  endpoint_id   = "target-rds"
  endpoint_type = "target"
  engine_name   = "postgres"
  server_name   = aws_db_instance.main.address
  port          = 5432
  database_name = "production"
  username      = var.rds_username
  password      = var.rds_password
  ssl_mode      = "require"

  tags = {
    Name = "target-database"
  }
}

# Migration task
resource "aws_dms_replication_task" "main" {
  migration_type            = "full-load-and-cdc"
  replication_instance_arn  = aws_dms_replication_instance.main.replication_instance_arn
  replication_task_id       = "postgres-migration"
  source_endpoint_arn       = aws_dms_endpoint.source.endpoint_arn
  target_endpoint_arn       = aws_dms_endpoint.target.endpoint_arn
  table_mappings            = jsonencode({
    rules = [
      {
        rule-type = "selection"
        rule-id   = "1"
        rule-name = "1"
        object-locator = {
          schema-name = "public"
          table-name  = "%"
        }
        rule-action = "include"
      }
    ]
  })

  tags = {
    Name = "postgres-migration-task"
  }
}

# Target RDS instance
resource "aws_db_instance" "main" {
  identifier     = "migrated-database"
  engine         = "postgres"
  engine_version = "14.7"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  db_name  = "production"
  username = var.rds_username
  password = var.rds_password

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name        = "migrated-database"
    Migration   = "replatform"
  }
}
```

### 3. Refactor (Re-architect)

**When to Use:**
- Modernize applications
- Need cloud-native features
- Improve scalability and resilience
- Long-term investment

**Monolith to Microservices:**
```hcl
# ECS Cluster for microservices
resource "aws_ecs_cluster" "main" {
  name = "microservices-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"

      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
}

# Service Discovery
resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "services.local"
  vpc  = aws_vpc.main.id
}

# Microservice: User Service
module "user_service" {
  source = "./modules/microservice"

  name          = "user-service"
  cluster_id    = aws_ecs_cluster.main.id
  image         = "user-service:latest"
  cpu           = 512
  memory        = 1024
  desired_count = 3

  environment = [
    {
      name  = "DB_HOST"
      value = aws_db_instance.users.endpoint
    }
  ]

  secrets = [
    {
      name      = "DB_PASSWORD"
      valueFrom = aws_secretsmanager_secret.user_db_password.arn
    }
  ]

  service_discovery_namespace_id = aws_service_discovery_private_dns_namespace.main.id
  vpc_id                         = aws_vpc.main.id
  subnet_ids                     = aws_subnet.private_app[*].id
  security_group_ids             = [aws_security_group.user_service.id]
}

# API Gateway for microservices
resource "aws_api_gateway_rest_api" "main" {
  name        = "microservices-api"
  description = "API Gateway for microservices"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# VPC Link for private integration
resource "aws_api_gateway_vpc_link" "main" {
  name        = "microservices-vpc-link"
  target_arns = [aws_lb.internal.arn]
}
```

**Serverless Refactor:**
```yaml
# AWS SAM template for serverless migration
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: python3.11
    Timeout: 30
    MemorySize: 256
    Environment:
      Variables:
        TABLE_NAME: !Ref DynamoDBTable
        QUEUE_URL: !Ref ProcessingQueue

Resources:
  # API Gateway
  ApiGateway:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt UserPool.Arn

  # Lambda: API Handler
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/api/
      Handler: app.handler
      Events:
        GetResource:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /resources/{id}
            Method: GET
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref DynamoDBTable

  # Lambda: Async Processing
  ProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/processor/
      Handler: app.handler
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt ProcessingQueue.Arn
            BatchSize: 10
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref DynamoDBTable
        - S3CrudPolicy:
            BucketName: !Ref DataBucket

  # DynamoDB Table
  DynamoDBTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES

  # SQS Queue
  ProcessingQueue:
    Type: AWS::SQS::Queue
    Properties:
      VisibilityTimeout: 180
      MessageRetentionPeriod: 1209600
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn
        maxReceiveCount: 3

  DeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      MessageRetentionPeriod: 1209600
```

### 4. Repurchase (Drop and Shop)

**When to Use:**
- Moving to SaaS solutions
- Legacy system replacement
- Cost-effective alternative exists
- Avoid maintaining custom software

**Migration to SaaS:**
```
On-Premises CRM → Salesforce
Self-hosted Email → Office 365 / Google Workspace
Custom HR System → Workday
On-prem Analytics → Snowflake / Databricks
```

### 5. Retire

**Decommission unused applications:**
```bash
#!/bin/bash
# Application retirement checklist

# 1. Identify unused applications
echo "Analyzing application usage..."
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=LoadBalancer,Value=app-alb \
  --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum

# 2. Archive data if needed
echo "Archiving application data..."
aws s3 sync s3://app-bucket/ s3://archive-bucket/app-$(date +%Y%m%d)/ \
  --storage-class GLACIER_DEEP_ARCHIVE

# 3. Document retirement
echo "Creating retirement documentation..."
cat > retirement-report.md <<EOF
# Application Retirement: Legacy App

**Date:** $(date)
**Reason:** No usage in 90 days
**Data Archived:** s3://archive-bucket/app-$(date +%Y%m%d)/
**Annual Savings:** \$50,000

## Decommissioned Resources:
- EC2 instances: 5
- RDS database: 1
- S3 buckets: 3
- Load balancer: 1
EOF

# 4. Shutdown resources
echo "Shutting down resources..."
# (Would use Terraform destroy in practice)
```

### 6. Retain

**Reasons to retain on-premises:**
- Regulatory requirements
- Data sovereignty
- Performance-sensitive applications
- Migration not yet justified

## Migration Assessment

### Discovery and Assessment

**AWS Migration Hub:**
```hcl
# Migration Hub configuration
resource "aws_migrationhub_home_region_control" "main" {
  home_region = "us-east-1"
}

# Discovery connector
data "aws_ssm_parameter" "discovery_agent" {
  name = "/aws/service/migration-hub/discovery-agent/latest/linux/amd64"
}

# Application groups
resource "aws_applicationinsights_application" "main" {
  resource_group_name = aws_resourcegroups_group.migration.name
  auto_config_enabled = true
}

resource "aws_resourcegroups_group" "migration" {
  name = "migration-wave-1"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::EC2::Instance", "AWS::RDS::DBInstance"]
      TagFilters = [
        {
          Key    = "MigrationWave"
          Values = ["1"]
        }
      ]
    })
  }
}
```

**Assessment Script:**
```python
#!/usr/bin/env python3
"""
Cloud migration assessment tool
Analyzes on-premises infrastructure for cloud readiness
"""

import json
from typing import Dict, List

class MigrationAssessment:
    def __init__(self):
        self.inventory = []
        self.recommendations = []

    def assess_application(self, app_config: Dict) -> Dict:
        """Assess application for migration strategy"""

        assessment = {
            'name': app_config['name'],
            'current_state': app_config['infrastructure'],
            'recommended_strategy': None,
            'target_services': [],
            'estimated_cost': 0,
            'complexity': 'medium',
            'migration_time': '3-6 months'
        }

        # Assess based on criteria
        if app_config.get('custom_code', False):
            if app_config.get('cloud_native_compatible', False):
                assessment['recommended_strategy'] = 'refactor'
                assessment['target_services'] = [
                    'ECS Fargate',
                    'RDS',
                    'ElastiCache'
                ]
                assessment['complexity'] = 'high'
            else:
                assessment['recommended_strategy'] = 'rehost'
                assessment['target_services'] = ['EC2', 'EBS']
                assessment['complexity'] = 'low'
        else:
            assessment['recommended_strategy'] = 'repurchase'
            assessment['target_services'] = ['SaaS alternative']

        # Calculate costs
        assessment['estimated_cost'] = self._estimate_cost(
            assessment['target_services'],
            app_config.get('usage_pattern', {})
        )

        return assessment

    def _estimate_cost(self, services: List[str], usage: Dict) -> float:
        """Estimate monthly cloud cost"""
        cost_map = {
            'EC2': 100,
            'ECS Fargate': 150,
            'RDS': 200,
            'ElastiCache': 50,
            'Lambda': 20
        }

        total = sum(cost_map.get(svc, 0) for svc in services)
        return total * usage.get('multiplier', 1.0)

    def generate_migration_plan(self) -> Dict:
        """Generate phased migration plan"""
        return {
            'phases': [
                {
                    'name': 'Wave 1: Low-risk Applications',
                    'strategy': 'rehost',
                    'duration': '1-2 months',
                    'applications': ['static-website', 'internal-tools']
                },
                {
                    'name': 'Wave 2: Databases',
                    'strategy': 'replatform',
                    'duration': '2-3 months',
                    'applications': ['customer-db', 'analytics-db']
                },
                {
                    'name': 'Wave 3: Core Applications',
                    'strategy': 'refactor',
                    'duration': '6-9 months',
                    'applications': ['api-service', 'web-app']
                }
            ],
            'total_duration': '9-14 months',
            'estimated_cost': 500000
        }

# Example usage
if __name__ == '__main__':
    assessment = MigrationAssessment()

    app = {
        'name': 'Customer Portal',
        'infrastructure': {
            'servers': 5,
            'databases': 2,
            'storage_tb': 10
        },
        'custom_code': True,
        'cloud_native_compatible': True,
        'usage_pattern': {'multiplier': 1.5}
    }

    result = assessment.assess_application(app)
    print(json.dumps(result, indent=2))

    plan = assessment.generate_migration_plan()
    print(json.dumps(plan, indent=2))
```

## Cutover Planning

### Zero-Downtime Migration

**Blue-Green Deployment:**
```hcl
# Route 53 weighted routing for cutover
resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  weighted_routing_policy {
    weight = var.blue_weight  # Start: 100, End: 0
  }

  set_identifier = "blue-environment"

  alias {
    name                   = aws_lb.blue.dns_name
    zone_id                = aws_lb.blue.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "app_green" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  weighted_routing_policy {
    weight = var.green_weight  # Start: 0, End: 100
  }

  set_identifier = "green-environment"

  alias {
    name                   = aws_lb.green.dns_name
    zone_id                = aws_lb.green.zone_id
    evaluate_target_health = true
  }
}
```

**Database Cutover Script:**
```bash
#!/bin/bash
set -euo pipefail

echo "=== Database Migration Cutover ==="

# 1. Final sync
echo "Performing final replication sync..."
aws dms start-replication-task \
  --replication-task-arn "$TASK_ARN" \
  --start-replication-task-type reload-target

# 2. Monitor lag
echo "Monitoring replication lag..."
while true; do
  LAG=$(aws dms describe-replication-tasks \
    --filters Name=replication-task-arn,Values="$TASK_ARN" \
    --query 'ReplicationTasks[0].ReplicationTaskStats.ElapsedTimeMillis' \
    --output text)

  if [ "$LAG" -lt 1000 ]; then
    echo "Lag under 1 second, ready for cutover"
    break
  fi
  sleep 5
done

# 3. Maintenance mode
echo "Enabling maintenance mode..."
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets "Key=tag:App,Values=legacy" \
  --parameters 'commands=["systemctl stop application"]'

# 4. Final sync
sleep 10
echo "Final replication sync..."
# Wait for replication to catch up

# 5. Cutover DNS
echo "Updating DNS to point to new environment..."
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch file://dns-cutover.json

# 6. Verify
echo "Verifying new environment..."
for i in {1..10}; do
  if curl -f https://app.example.com/health; then
    echo "Health check passed"
    break
  fi
  sleep 5
done

echo "=== Cutover Complete ==="
```

## Post-Migration Optimization

```hcl
# Cost optimization - Reserved Instances
resource "aws_ec2_capacity_reservation" "main" {
  instance_type     = "m5.xlarge"
  instance_platform = "Linux/UNIX"
  availability_zone = "us-east-1a"
  instance_count    = 10

  tags = {
    Name = "app-capacity-reservation"
  }
}

# Right-sizing based on CloudWatch metrics
resource "aws_autoscaling_policy" "scale_down" {
  name                   = "scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "cpu-utilization-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "20"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_down.arn]
}
```

## Best Practices

1. **Assessment:**
   - Comprehensive discovery
   - Identify dependencies
   - Assess technical debt
   - Calculate TCO

2. **Planning:**
   - Phased approach (waves)
   - Pilot migrations first
   - Define success criteria
   - Plan rollback strategy

3. **Execution:**
   - Automate where possible
   - Test thoroughly
   - Monitor continuously
   - Document everything

4. **Optimization:**
   - Right-size resources
   - Leverage reserved capacity
   - Implement auto-scaling
   - Regular cost reviews

## Anti-Patterns

- Big-bang migrations
- No pilot testing
- Ignoring dependencies
- No rollback plan
- Insufficient testing
- Poor communication
- No post-migration optimization
- Recreating on-premises architecture in cloud
