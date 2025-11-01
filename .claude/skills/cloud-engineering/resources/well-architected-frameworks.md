# Well-Architected Frameworks

Comprehensive guide to AWS Well-Architected Framework, Azure Well-Architected Framework, and Google Cloud Architecture Framework.

## AWS Well-Architected Framework

### The Five Pillars

```
┌─────────────────────────────────────────────────────────────┐
│            AWS Well-Architected Framework                    │
├──────────────────┬──────────────────┬───────────────────────┤
│  Operational     │    Security      │    Reliability        │
│  Excellence      │                  │                       │
│                  │                  │                       │
│  • Automate ops  │  • Identity      │  • Test recovery      │
│  • Make changes  │  • Traceability  │  • Auto-recovery      │
│  • Learn & share │  • Defense depth │  • Scale horizontal   │
├──────────────────┼──────────────────┼───────────────────────┤
│  Performance     │  Cost            │                       │
│  Efficiency      │  Optimization    │                       │
│                  │                  │                       │
│  • Serverless    │  • Consumption   │                       │
│  • Experiment    │  • Measure       │                       │
│  • Go global     │  • Attribute     │                       │
└──────────────────┴──────────────────┴───────────────────────┘
```

### Pillar 1: Operational Excellence

**Design Principles:**
1. Perform operations as code
2. Make frequent, small, reversible changes
3. Refine operations procedures frequently
4. Anticipate failure
5. Learn from all operational failures

**Implementation Example:**
```hcl
# Infrastructure as Code
resource "aws_ecs_cluster" "main" {
  name = "production-cluster"

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"

      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs.name
      }
    }
  }

  # Enable Container Insights for observability
  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# CloudWatch Dashboards for operations
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "operations-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            [".", "MemoryUtilization", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          title  = "ECS Cluster Metrics"
        }
      },
      {
        type = "log"
        properties = {
          query   = "SOURCE '/aws/ecs/production-cluster' | fields @timestamp, @message | sort @timestamp desc | limit 20"
          region  = "us-east-1"
          title   = "Recent Logs"
        }
      }
    ]
  })
}

# Automated remediation
resource "aws_cloudwatch_event_rule" "instance_unhealthy" {
  name        = "ecs-instance-unhealthy"
  description = "Trigger when ECS instance becomes unhealthy"

  event_pattern = jsonencode({
    source      = ["aws.ecs"]
    detail-type = ["ECS Container Instance State Change"]
    detail = {
      status = ["DRAINING"]
    }
  })
}

resource "aws_cloudwatch_event_target" "remediate" {
  rule      = aws_cloudwatch_event_rule.instance_unhealthy.name
  target_id = "RemediateLambda"
  arn       = aws_lambda_function.remediate_instance.arn
}

# Runbook automation
resource "aws_ssm_document" "deploy_app" {
  name          = "DeployApplication"
  document_type = "Automation"

  content = jsonencode({
    schemaVersion = "0.3"
    description   = "Deploys application with rollback capability"
    parameters = {
      ImageTag = {
        type        = "String"
        description = "Docker image tag to deploy"
      }
    }
    mainSteps = [
      {
        name   = "UpdateService"
        action = "aws:executeAwsApi"
        inputs = {
          Service = "ecs"
          Api     = "UpdateService"
          cluster = "production-cluster"
          service = "app-service"
          forceNewDeployment = true
          taskDefinition = "app-task:{{ ImageTag }}"
        }
      },
      {
        name   = "WaitForDeployment"
        action = "aws:waitForAwsResourceProperty"
        inputs = {
          Service              = "ecs"
          Api                  = "DescribeServices"
          cluster              = "production-cluster"
          services             = ["app-service"]
          PropertySelector     = "$.services[0].deployments[0].rolloutState"
          DesiredValues        = ["COMPLETED"]
        }
        timeoutSeconds = 600
      }
    ]
  })
}
```

### Pillar 2: Security

**Design Principles:**
1. Implement a strong identity foundation
2. Enable traceability
3. Apply security at all layers
4. Automate security best practices
5. Protect data in transit and at rest
6. Keep people away from data
7. Prepare for security events

**Implementation Example:**
```hcl
# Identity foundation
resource "aws_iam_role" "app" {
  name = "app-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = var.external_id
          }
        }
      }
    ]
  })

  # Restrict session duration
  max_session_duration = 3600

  tags = {
    Name = "app-execution-role"
  }
}

# Traceability - CloudTrail
resource "aws_cloudtrail" "main" {
  name                          = "organization-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::sensitive-data-bucket/"]
    }
  }

  insight_selector {
    insight_type = "ApiCallRateInsight"
  }

  tags = {
    Name = "security-audit-trail"
  }
}

# Defense in depth - WAF
resource "aws_wafv2_web_acl" "main" {
  name  = "production-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  # Managed rules
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ProductionWAF"
    sampled_requests_enabled   = true
  }
}

# Data protection
resource "aws_s3_bucket" "sensitive" {
  bucket = "sensitive-data-bucket"

  tags = {
    Classification = "confidential"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sensitive" {
  bucket = aws_s3_bucket.sensitive.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.sensitive.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "sensitive" {
  bucket = aws_s3_bucket.sensitive.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "sensitive" {
  bucket = aws_s3_bucket.sensitive.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Security event response
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
  }
}

resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  name        = "guardduty-findings"
  description = "Trigger on GuardDuty findings"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9]
    }
  })
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.guardduty_findings.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.security_alerts.arn
}
```

### Pillar 3: Reliability

**Design Principles:**
1. Automatically recover from failure
2. Test recovery procedures
3. Scale horizontally to increase aggregate workload availability
4. Stop guessing capacity
5. Manage change in automation

**Implementation Example:**
```hcl
# Auto Scaling for reliability
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  vpc_zone_identifier = aws_subnet.private_app[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = 3
  max_size         = 12
  desired_capacity = 6

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Ensure instances in multiple AZs
  enabled_metrics = [
    "GroupMinSize",
    "GroupMaxSize",
    "GroupDesiredCapacity",
    "GroupInServiceInstances",
    "GroupTotalInstances"
  ]

  tag {
    key                 = "Name"
    value               = "app-instance"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Target tracking scaling policy
resource "aws_autoscaling_policy" "target_tracking" {
  name                   = "target-tracking-policy"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Multi-AZ RDS for data reliability
resource "aws_db_instance" "main" {
  identifier     = "production-database"
  engine         = "postgres"
  instance_class = "db.r6g.xlarge"

  # High availability
  multi_az               = true
  availability_zone      = null  # Let AWS choose for Multi-AZ

  # Backup and recovery
  backup_retention_period = 14
  backup_window           = "03:00-04:00"
  copy_tags_to_snapshot   = true
  delete_automated_backups = false

  # Automated failover
  auto_minor_version_upgrade = true
  maintenance_window         = "sun:04:00-sun:05:00"

  # Point-in-time recovery
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "production-database"
  }
}

# Disaster recovery with cross-region replication
resource "aws_s3_bucket_replication_configuration" "main" {
  bucket = aws_s3_bucket.source.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "disaster-recovery"
    status = "Enabled"

    filter {
      prefix = ""
    }

    destination {
      bucket        = aws_s3_bucket.destination.arn
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

# Chaos engineering test
resource "aws_fis_experiment_template" "az_outage" {
  description = "Simulate AZ failure"
  role_arn    = aws_iam_role.fis.arn

  action {
    name      = "az-outage"
    action_id = "aws:ec2:stop-instances"

    target {
      key   = "Instances"
      value = "az-target"
    }

    parameter {
      key   = "durationMinutes"
      value = "5"
    }
  }

  target {
    name           = "az-target"
    resource_type  = "aws:ec2:instance"
    selection_mode = "COUNT(1)"

    resource_tag {
      key   = "AvailabilityZone"
      value = "us-east-1a"
    }

    resource_tag {
      key   = "Environment"
      value = "staging"
    }
  }

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = aws_cloudwatch_metric_alarm.critical.arn
  }

  tags = {
    Name = "az-failure-test"
  }
}
```

### Pillar 4: Performance Efficiency

**Design Principles:**
1. Democratize advanced technologies
2. Go global in minutes
3. Use serverless architectures
4. Experiment more often
5. Consider mechanical sympathy

**Implementation Example:**
```hcl
# CloudFront for global distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  price_class         = "PriceClass_All"

  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "S3-static"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  # Edge caching
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-static"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    cache_policy_id = aws_cloudfront_cache_policy.optimized.id

    # Lambda@Edge for personalization
    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = aws_lambda_function.edge.qualified_arn
      include_body = false
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# ElastiCache for performance
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "app-cache"
  replication_group_description = "Application cache cluster"
  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 3
  parameter_group_name       = "default.redis7"
  port                       = 6379

  # Multi-AZ
  automatic_failover_enabled = true
  multi_az_enabled          = true

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  # Backup
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"

  subnet_group_name = aws_elasticache_subnet_group.main.name

  tags = {
    Name = "app-cache-cluster"
  }
}

# DynamoDB with auto-scaling
resource "aws_dynamodb_table" "sessions" {
  name         = "user-sessions"
  billing_mode = "PAY_PER_REQUEST"  # Automatic scaling

  hash_key  = "sessionId"
  range_key = "timestamp"

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  # Global table for multi-region
  replica {
    region_name = "us-west-2"
  }

  replica {
    region_name = "eu-west-1"
  }

  # TTL for automatic cleanup
  ttl {
    attribute_name = "expirationTime"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "user-sessions"
  }
}
```

### Pillar 5: Cost Optimization

**Design Principles:**
1. Implement cloud financial management
2. Adopt a consumption model
3. Measure overall efficiency
4. Stop spending on undifferentiated heavy lifting
5. Analyze and attribute expenditure

**Implementation Example:**
```hcl
# Cost allocation tags
resource "aws_ec2_tag" "cost_center" {
  resource_id = aws_instance.app.id
  key         = "CostCenter"
  value       = "engineering"
}

# Savings Plans
resource "aws_savingsplans_plan" "compute" {
  savings_plan_type = "ComputeSavingsPlan"
  term              = "ONE_YEAR"
  payment_option    = "PARTIAL_UPFRONT"
  commitment        = "100.0"  # $100/hour commitment

  tags = {
    Name = "compute-savings-plan"
  }
}

# S3 Intelligent-Tiering
resource "aws_s3_bucket_intelligent_tiering_configuration" "main" {
  bucket = aws_s3_bucket.data.id
  name   = "EntireBucket"

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
}

# Spot instances for cost savings
resource "aws_autoscaling_group" "spot" {
  name                = "app-spot-asg"
  vpc_zone_identifier = aws_subnet.private_app[*].id

  min_size = 0
  max_size = 10

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 2
      on_demand_percentage_above_base_capacity = 20
      spot_allocation_strategy                 = "price-capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = "$Latest"
      }

      override {
        instance_type = "m5.large"
      }

      override {
        instance_type = "m5a.large"
      }

      override {
        instance_type = "m6i.large"
      }
    }
  }
}

# Budget alerts
resource "aws_budgets_budget" "monthly" {
  name              = "monthly-budget"
  budget_type       = "COST"
  limit_amount      = "10000"
  limit_unit        = "USD"
  time_period_start = "2024-01-01_00:00"
  time_unit         = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["finance@example.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finance@example.com", "engineering@example.com"]
  }
}
```

## Azure Well-Architected Framework

### The Five Pillars (Azure)

1. **Cost Optimization**
2. **Operational Excellence**
3. **Performance Efficiency**
4. **Reliability**
5. **Security**

**Example - Azure Cost Optimization:**
```hcl
# Azure Reserved Instances
resource "azurerm_reserved_capacity" "vm" {
  name                = "reserved-vms"
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "Standard_D2s_v3"
  term                = "P1Y"  # 1 year
  quantity            = 10
}

# Auto-shutdown for dev environments
resource "azurerm_dev_test_global_vm_shutdown_schedule" "main" {
  virtual_machine_id = azurerm_linux_virtual_machine.dev.id
  location           = var.location
  enabled            = true

  daily_recurrence_time = "1900"
  timezone              = "Pacific Standard Time"

  notification_settings {
    enabled = true
    email   = "devops@example.com"
  }
}

# Azure Advisor recommendations
resource "azurerm_monitor_action_group" "cost" {
  name                = "cost-optimization"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "costopt"

  email_receiver {
    name          = "finance"
    email_address = "finance@example.com"
  }
}
```

## Google Cloud Architecture Framework

### The Five Categories (GCP)

1. **Operational Excellence**
2. **Security, Privacy, and Compliance**
3. **Reliability**
4. **Cost Optimization**
5. **Performance Optimization**

**Example - GCP Performance:**
```hcl
# Cloud CDN
resource "google_compute_backend_bucket" "static" {
  name        = "static-backend"
  bucket_name = google_storage_bucket.static.name
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    default_ttl       = 3600
    max_ttl           = 86400
    client_ttl        = 7200
    negative_caching  = true

    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = true
    }
  }
}

# Memorystore for caching
resource "google_redis_instance" "cache" {
  name               = "app-cache"
  tier               = "STANDARD_HA"
  memory_size_gb     = 5
  region             = var.region
  redis_version      = "REDIS_7_0"
  display_name       = "Application Cache"

  authorized_network = google_compute_network.main.id

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }
}
```

## Well-Architected Review Process

**Assessment Checklist:**
```yaml
# well-architected-review.yaml
operational_excellence:
  - question: "How do you manage and deploy changes?"
    best_practice: "Infrastructure as Code with CI/CD"
    current_state: "terraform + GitHub Actions"
    risk_level: "low"

  - question: "How do you monitor your workload?"
    best_practice: "Comprehensive observability"
    current_state: "CloudWatch + Prometheus"
    risk_level: "medium"
    improvement: "Add distributed tracing"

security:
  - question: "How do you protect data at rest?"
    best_practice: "Encryption with customer-managed keys"
    current_state: "KMS encryption enabled"
    risk_level: "low"

  - question: "How do you manage identities?"
    best_practice: "Centralized identity with MFA"
    current_state: "IAM roles, MFA required"
    risk_level: "low"

reliability:
  - question: "How do you design for failure?"
    best_practice: "Multi-AZ deployment"
    current_state: "Single AZ"
    risk_level: "high"
    improvement: "Deploy across 3 AZs"

performance:
  - question: "How do you select your compute solution?"
    best_practice: "Right-sized for workload"
    current_state: "Over-provisioned"
    risk_level: "medium"
    improvement: "Implement auto-scaling"

cost_optimization:
  - question: "How do you monitor costs?"
    best_practice: "Cost allocation tags + budgets"
    current_state: "Basic tagging"
    risk_level: "medium"
    improvement: "Implement comprehensive tagging strategy"
```

## Best Practices

1. **Regular Reviews:**
   - Quarterly architecture reviews
   - Use framework assessment tools
   - Document decisions and trade-offs
   - Track improvements over time

2. **Multi-Pillar Optimization:**
   - Balance across all pillars
   - Avoid over-optimizing one area
   - Consider trade-offs
   - Align with business goals

3. **Continuous Improvement:**
   - Implement feedback loops
   - Learn from incidents
   - Stay current with best practices
   - Automate compliance checks

## Anti-Patterns

- Ignoring operational excellence for speed
- Security as an afterthought
- Single AZ deployments in production
- No cost monitoring or optimization
- Over-engineering for performance
- Skipping well-architected reviews
- Not documenting architectural decisions
