# AWS Patterns

Comprehensive guide to Amazon Web Services (AWS) covering core services, architectural patterns, Well-Architected Framework, and best practices for building scalable, reliable, and secure cloud infrastructure.

## Table of Contents

- [AWS Service Overview](#aws-service-overview)
- [Compute Services](#compute-services)
- [Storage Services](#storage-services)
- [Database Services](#database-services)
- [Networking Services](#networking-services)
- [Container Services](#container-services)
- [Serverless Services](#serverless-services)
- [Well-Architected Framework](#well-architected-framework)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## AWS Service Overview

### Service Categories

```
Compute:         EC2, Lambda, ECS, EKS, Fargate, Batch
Storage:         S3, EBS, EFS, Glacier, Storage Gateway
Database:        RDS, DynamoDB, Aurora, ElastiCache, Neptune
Networking:      VPC, Route 53, CloudFront, Direct Connect, API Gateway
Security:        IAM, KMS, Secrets Manager, WAF, Shield
Monitoring:      CloudWatch, X-Ray, CloudTrail
DevOps:          CodePipeline, CodeBuild, CodeDeploy
Analytics:       Athena, EMR, Kinesis, Redshift, QuickSight
```

## Compute Services

### EC2 (Elastic Compute Cloud)

**Instance Types:**
```
General Purpose (T3, M5):     Balanced CPU/memory
Compute Optimized (C5):       CPU-intensive workloads
Memory Optimized (R5, X1):    In-memory databases, caching
Storage Optimized (I3, D2):   High disk throughput
GPU Instances (P3, G4):       ML training, graphics
```

**Example: Auto Scaling Group with Launch Template:**
```hcl
# launch_template.tf
resource "aws_launch_template" "app" {
  name_prefix   = "app-server-"
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = "t3.medium"

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    region = var.region
  }))

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 125
      encrypted             = true
      delete_on_termination = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2
    http_put_response_hop_limit = 1
  }

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name        = "app-server"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# auto_scaling.tf
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = 2
  max_size         = 10
  desired_capacity = 3

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Scaling policies
  dynamic "tag" {
    for_each = {
      Name        = "app-server"
      Environment = var.environment
    }
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}

# Target tracking scaling policy
resource "aws_autoscaling_policy" "cpu" {
  name                   = "cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

### Lambda (Serverless Compute)

**Example: Lambda Function with Layers:**
```hcl
# lambda_function.tf
resource "aws_lambda_function" "api_handler" {
  filename         = "lambda.zip"
  function_name    = "api-handler"
  role            = aws_iam_role.lambda.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("lambda.zip")
  runtime         = "nodejs18.x"

  memory_size = 256
  timeout     = 30

  # Environment variables
  environment {
    variables = {
      TABLE_NAME   = aws_dynamodb_table.main.name
      REGION       = var.region
      STAGE        = var.environment
      LOG_LEVEL    = "info"
    }
  }

  # VPC configuration for private resources
  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  # Shared libraries
  layers = [
    aws_lambda_layer_version.dependencies.arn,
    "arn:aws:lambda:${var.region}:580247275435:layer:LambdaInsightsExtension:14"
  ]

  # Tracing
  tracing_config {
    mode = "Active"
  }

  # Reserved concurrency
  reserved_concurrent_executions = 10

  tags = {
    Environment = var.environment
  }
}

# Lambda layer for dependencies
resource "aws_lambda_layer_version" "dependencies" {
  filename   = "layer.zip"
  layer_name = "api-dependencies"

  compatible_runtimes = ["nodejs18.x"]

  description = "Shared dependencies for API functions"
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.api_handler.function_name}"
  retention_in_days = 14

  tags = {
    Environment = var.environment
  }
}
```

## Storage Services

### S3 (Simple Storage Service)

**Example: S3 Bucket with Best Practices:**
```hcl
resource "aws_s3_bucket" "data" {
  bucket = "company-data-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = var.environment
    Purpose     = "application-data"
  }
}

# Versioning for data protection
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Encryption at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy
resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 180
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# Replication for DR
resource "aws_s3_bucket_replication_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-to-dr"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.data_replica.arn
      storage_class = "STANDARD_IA"

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }
  }
}
```

## Database Services

### RDS (Relational Database Service)

**Example: RDS PostgreSQL with Multi-AZ:**
```hcl
resource "aws_db_instance" "postgres" {
  identifier = "app-db-${var.environment}"

  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.r6g.large"
  allocated_storage    = 100
  max_allocated_storage = 1000
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.rds.arn

  db_name  = "appdb"
  username = "admin"
  password = random_password.db_password.result

  # High availability
  multi_az               = true
  availability_zone      = var.environment == "production" ? null : var.az

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  skip_final_snapshot    = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.identifier}-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Performance
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Deletion protection for production
  deletion_protection = var.environment == "production" ? true : false

  tags = {
    Environment = var.environment
  }
}

# Read replica for scaling reads
resource "aws_db_instance" "postgres_replica" {
  count = var.environment == "production" ? 1 : 0

  identifier          = "app-db-${var.environment}-replica"
  replicate_source_db = aws_db_instance.postgres.identifier

  instance_class = "db.r6g.large"

  # Can be in different AZ
  availability_zone = var.replica_az

  # Replica-specific settings
  auto_minor_version_upgrade = true
  publicly_accessible        = false

  tags = {
    Environment = var.environment
    Role        = "read-replica"
  }
}
```

### DynamoDB (NoSQL Database)

**Example: DynamoDB with GSI and Auto-Scaling:**
```hcl
resource "aws_dynamodb_table" "users" {
  name           = "users-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"  # Or "PROVISIONED"
  hash_key       = "userId"
  range_key      = "timestamp"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # Global Secondary Index
  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    range_key       = "timestamp"
    projection_type = "INCLUDE"
    non_key_attributes = ["userId", "email"]
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb.arn
  }

  # TTL for auto-expiration
  ttl {
    attribute_name = "expiryTime"
    enabled        = true
  }

  # Stream for change data capture
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = {
    Environment = var.environment
  }
}

# Auto-scaling for provisioned capacity
resource "aws_appautoscaling_target" "dynamodb_table_read" {
  count = var.billing_mode == "PROVISIONED" ? 1 : 0

  max_capacity       = 100
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.users.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "dynamodb_table_read" {
  count = var.billing_mode == "PROVISIONED" ? 1 : 0

  name               = "DynamoDBReadCapacityUtilization:${aws_appautoscaling_target.dynamodb_table_read[0].resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dynamodb_table_read[0].resource_id
  scalable_dimension = aws_appautoscaling_target.dynamodb_table_read[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.dynamodb_table_read[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = 70.0
  }
}
```

## Container Services

### EKS (Elastic Kubernetes Service)

**Example: EKS Cluster with Node Groups:**
```hcl
resource "aws_eks_cluster" "main" {
  name     = "app-cluster-${var.environment}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = concat(var.private_subnet_ids, var.public_subnet_ids)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.allowed_cidr_blocks

    security_group_ids = [aws_security_group.eks_cluster.id]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  tags = {
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_vpc_resource_controller,
  ]
}

# Managed node group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "main-node-group"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = var.private_subnet_ids

  instance_types = ["t3.large"]
  capacity_type  = "ON_DEMAND"

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 2
  }

  update_config {
    max_unavailable = 1
  }

  launch_template {
    id      = aws_launch_template.eks_node.id
    version = "$Latest"
  }

  tags = {
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_registry_policy,
  ]
}

# Fargate profile for serverless pods
resource "aws_eks_fargate_profile" "serverless" {
  cluster_name           = aws_eks_cluster.main.name
  fargate_profile_name   = "serverless-profile"
  pod_execution_role_arn = aws_iam_role.fargate_pod_execution.arn
  subnet_ids             = var.private_subnet_ids

  selector {
    namespace = "serverless"
  }

  selector {
    namespace = "kube-system"
    labels = {
      k8s-app = "kube-dns"
    }
  }
}
```

## Well-Architected Framework

### Five Pillars

**1. Operational Excellence:**
```yaml
Principles:
  - Perform operations as code
  - Make frequent, small, reversible changes
  - Refine operations procedures frequently
  - Anticipate failure
  - Learn from operational failures

AWS Services:
  - CloudFormation (IaC)
  - Systems Manager (automation)
  - CloudWatch (monitoring)
  - X-Ray (tracing)
```

**2. Security:**
```yaml
Principles:
  - Implement strong identity foundation
  - Enable traceability
  - Apply security at all layers
  - Automate security best practices
  - Protect data in transit and at rest
  - Keep people away from data
  - Prepare for security events

AWS Services:
  - IAM (identity)
  - CloudTrail (audit)
  - GuardDuty (threat detection)
  - KMS (encryption)
  - WAF (web firewall)
```

**3. Reliability:**
```yaml
Principles:
  - Automatically recover from failure
  - Test recovery procedures
  - Scale horizontally
  - Stop guessing capacity
  - Manage change through automation

AWS Services:
  - Auto Scaling
  - RDS Multi-AZ
  - Route 53 (DNS failover)
  - S3 (11 9s durability)
```

**4. Performance Efficiency:**
```yaml
Principles:
  - Democratize advanced technologies
  - Go global in minutes
  - Use serverless architectures
  - Experiment more often
  - Consider mechanical sympathy

AWS Services:
  - Lambda (serverless)
  - CloudFront (CDN)
  - ElastiCache (caching)
  - RDS (managed databases)
```

**5. Cost Optimization:**
```yaml
Principles:
  - Implement cloud financial management
  - Adopt consumption model
  - Measure overall efficiency
  - Stop spending on undifferentiated work
  - Analyze and attribute expenditure

AWS Services:
  - Cost Explorer
  - Budgets
  - Compute Optimizer
  - Trusted Advisor
```

## Common Patterns

### Three-Tier Architecture

```
                    ┌─────────────┐
                    │  Route 53   │
                    │    (DNS)    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ CloudFront  │
                    │    (CDN)    │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │   ALB       │ │   ALB       │ │   ALB       │
    │   (AZ-1)    │ │   (AZ-2)    │ │   (AZ-3)    │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  App Tier   │ │  App Tier   │ │  App Tier   │
    │   (EC2)     │ │   (EC2)     │ │   (EC2)     │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ┌──────▼──────┐
                    │     RDS     │
                    │  Multi-AZ   │
                    └─────────────┘
```

## Best Practices

1. **Always use IAM roles**, never embed credentials
2. **Enable MFA** for root and privileged accounts
3. **Use VPC** for network isolation
4. **Enable CloudTrail** for audit logging
5. **Implement least privilege** access
6. **Tag everything** for cost allocation
7. **Use multiple AZs** for high availability
8. **Enable encryption** at rest and in transit
9. **Implement backup** and disaster recovery
10. **Monitor with CloudWatch** and set alarms

## Anti-Patterns

❌ Using root account for daily operations
❌ Hardcoding credentials in code
❌ Single AZ deployments for production
❌ No tagging strategy
❌ Over-provisioning without auto-scaling
❌ Public S3 buckets
❌ No VPC or default VPC usage
❌ No monitoring or alarms
❌ Manual deployments
❌ Ignoring cost optimization
