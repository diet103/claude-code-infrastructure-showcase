# Cloud Security

Comprehensive guide to cloud security across AWS, Azure, and GCP. Covers IAM, encryption, compliance, identity federation, and zero-trust architecture.

## Identity and Access Management

### AWS IAM Best Practices

**Principle of Least Privilege:**
```hcl
# IAM policy for S3 bucket access
resource "aws_iam_policy" "s3_read" {
  name        = "s3-app-bucket-read"
  description = "Read access to application S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.app.arn}",
          "${aws_s3_bucket.app.arn}/*"
        ]
      }
    ]
  })
}

# IAM role for EC2 instances
resource "aws_iam_role" "app" {
  name = "app-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "app_s3" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.s3_read.arn
}

# Instance profile for EC2
resource "aws_iam_instance_profile" "app" {
  name = "app-instance-profile"
  role = aws_iam_role.app.name
}
```

**Cross-Account Access:**
```hcl
# Trust policy for cross-account access
resource "aws_iam_role" "cross_account" {
  name = "cross-account-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:root"
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
}

# Policy for the cross-account role
resource "aws_iam_role_policy" "cross_account" {
  name = "cross-account-policy"
  role = aws_iam_role.cross_account.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.shared.arn}/*"
      }
    ]
  })
}
```

**Service Control Policies (SCPs):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "ec2:RunInstances"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "ec2:Region": [
            "us-east-1",
            "us-west-2"
          ]
        }
      }
    },
    {
      "Effect": "Deny",
      "Action": [
        "s3:PutBucketPublicAccessBlock"
      ],
      "Resource": "*"
    }
  ]
}
```

### Azure Active Directory

**Role-Based Access Control (RBAC):**
```hcl
# Custom role definition
resource "azurerm_role_definition" "app_deployer" {
  name  = "Application Deployer"
  scope = azurerm_resource_group.main.id

  permissions {
    actions = [
      "Microsoft.Web/sites/read",
      "Microsoft.Web/sites/write",
      "Microsoft.Web/sites/restart/action",
      "Microsoft.Storage/storageAccounts/read",
      "Microsoft.Storage/storageAccounts/listKeys/action"
    ]
    not_actions = []
  }

  assignable_scopes = [
    azurerm_resource_group.main.id
  ]
}

# Role assignment
resource "azurerm_role_assignment" "app_deployer" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = azurerm_role_definition.app_deployer.name
  principal_id         = data.azuread_group.devops.object_id
}

# Built-in role assignment
resource "azurerm_role_assignment" "reader" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Reader"
  principal_id         = data.azuread_group.developers.object_id
}
```

**Managed Identity:**
```hcl
# User-assigned managed identity
resource "azurerm_user_assigned_identity" "app" {
  name                = "app-identity"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
}

# Assign identity to VM
resource "azurerm_linux_virtual_machine" "app" {
  name                = "app-vm"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  size                = "Standard_D2s_v3"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  # ... other configuration
}

# Grant permissions to managed identity
resource "azurerm_role_assignment" "identity_storage" {
  scope                = azurerm_storage_account.main.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
```

### GCP IAM

**Service Account with Workload Identity:**
```hcl
# GCP service account
resource "google_service_account" "app" {
  account_id   = "app-service-account"
  display_name = "Application Service Account"
}

# IAM binding for service account
resource "google_project_iam_member" "app_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.app.email}"
}

# Workload Identity binding for GKE
resource "google_service_account_iam_binding" "workload_identity" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[${var.namespace}/${var.k8s_sa_name}]"
  ]
}

# Custom role
resource "google_project_iam_custom_role" "app_deployer" {
  role_id     = "appDeployer"
  title       = "Application Deployer"
  description = "Custom role for application deployment"

  permissions = [
    "compute.instances.get",
    "compute.instances.start",
    "compute.instances.stop",
    "storage.buckets.get",
    "storage.objects.create",
    "storage.objects.delete"
  ]
}
```

## Encryption

### Encryption at Rest

**AWS KMS:**
```hcl
# Customer-managed KMS key
resource "aws_kms_key" "app" {
  description             = "Application encryption key"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow services to use the key"
        Effect = "Allow"
        Principal = {
          Service = [
            "s3.amazonaws.com",
            "rds.amazonaws.com",
            "dynamodb.amazonaws.com"
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "app-encryption-key"
  }
}

resource "aws_kms_alias" "app" {
  name          = "alias/app-key"
  target_key_id = aws_kms_key.app.key_id
}

# S3 bucket with KMS encryption
resource "aws_s3_bucket" "app" {
  bucket = "app-data-bucket"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.app.arn
    }
    bucket_key_enabled = true
  }
}

# RDS with KMS encryption
resource "aws_db_instance" "app" {
  identifier     = "app-database"
  engine         = "postgres"
  instance_class = "db.t3.medium"

  storage_encrypted = true
  kms_key_id        = aws_kms_key.app.arn

  # ... other configuration
}

# EBS volume encryption
resource "aws_ebs_volume" "app" {
  availability_zone = "us-east-1a"
  size              = 100
  encrypted         = true
  kms_key_id        = aws_kms_key.app.arn

  tags = {
    Name = "app-data-volume"
  }
}
```

**Azure Key Vault:**
```hcl
# Key Vault
resource "azurerm_key_vault" "main" {
  name                       = "app-key-vault"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium"
  soft_delete_retention_days = 7
  purge_protection_enabled   = true

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = var.allowed_ips
  }
}

# Key for encryption
resource "azurerm_key_vault_key" "encryption" {
  name         = "encryption-key"
  key_vault_id = azurerm_key_vault.main.id
  key_type     = "RSA"
  key_size     = 2048

  key_opts = [
    "decrypt",
    "encrypt",
    "sign",
    "unwrapKey",
    "verify",
    "wrapKey"
  ]
}

# Disk encryption set
resource "azurerm_disk_encryption_set" "main" {
  name                = "app-disk-encryption"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  key_vault_key_id    = azurerm_key_vault_key.encryption.id

  identity {
    type = "SystemAssigned"
  }
}

# Storage account with customer-managed key
resource "azurerm_storage_account" "app" {
  name                     = "appstorageaccount"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  customer_managed_key {
    key_vault_key_id          = azurerm_key_vault_key.encryption.id
    user_assigned_identity_id = azurerm_user_assigned_identity.storage.id
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.storage.id]
  }
}
```

**GCP Cloud KMS:**
```hcl
# KMS keyring
resource "google_kms_key_ring" "main" {
  name     = "app-keyring"
  location = var.region
}

# Encryption key
resource "google_kms_crypto_key" "encryption" {
  name     = "encryption-key"
  key_ring = google_kms_key_ring.main.id

  rotation_period = "7776000s" # 90 days

  lifecycle {
    prevent_destroy = true
  }
}

# IAM binding for key usage
resource "google_kms_crypto_key_iam_binding" "crypto_key" {
  crypto_key_id = google_kms_crypto_key.encryption.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"

  members = [
    "serviceAccount:${google_service_account.app.email}"
  ]
}

# Cloud Storage bucket with CMEK
resource "google_storage_bucket" "app" {
  name     = "app-data-bucket"
  location = var.region

  encryption {
    default_kms_key_name = google_kms_crypto_key.encryption.id
  }
}

# Compute disk with CMEK
resource "google_compute_disk" "app" {
  name  = "app-data-disk"
  type  = "pd-ssd"
  zone  = var.zone
  size  = 100

  disk_encryption_key {
    kms_key_self_link = google_kms_crypto_key.encryption.id
  }
}
```

### Encryption in Transit

**AWS Certificate Manager (ACM):**
```hcl
# Request SSL certificate
resource "aws_acm_certificate" "main" {
  domain_name               = "example.com"
  subject_alternative_names = ["*.example.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "example.com-certificate"
  }
}

# DNS validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# Wait for validation
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

## Secrets Management

### AWS Secrets Manager

```hcl
# Secret
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "production/database/password"
  description             = "Database password"
  recovery_window_in_days = 7

  tags = {
    Environment = "production"
  }
}

# Secret version
resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.db.result
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = "appdb"
  })
}

# Rotation Lambda
resource "aws_secretsmanager_secret_rotation" "db_password" {
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_lambda_arn = aws_lambda_function.rotate_secret.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

# IAM policy for secret access
resource "aws_iam_policy" "read_db_secret" {
  name = "read-db-secret"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.db_password.arn
      }
    ]
  })
}
```

### HashiCorp Vault on Kubernetes

```yaml
# Vault deployment
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: vault
  namespace: vault
spec:
  serviceName: vault
  replicas: 3
  selector:
    matchLabels:
      app: vault
  template:
    metadata:
      labels:
        app: vault
    spec:
      serviceAccountName: vault
      containers:
      - name: vault
        image: hashicorp/vault:1.15
        ports:
        - containerPort: 8200
          name: api
        - containerPort: 8201
          name: cluster
        env:
        - name: VAULT_ADDR
          value: "http://127.0.0.1:8200"
        - name: VAULT_API_ADDR
          value: "http://$(POD_IP):8200"
        - name: VAULT_CLUSTER_ADDR
          value: "https://$(POD_IP):8201"
        volumeMounts:
        - name: vault-config
          mountPath: /vault/config
        - name: vault-data
          mountPath: /vault/data
      volumes:
      - name: vault-config
        configMap:
          name: vault-config
  volumeClaimTemplates:
  - metadata:
      name: vault-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi

---
# Vault configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-config
  namespace: vault
data:
  vault.hcl: |
    ui = true

    listener "tcp" {
      address = "0.0.0.0:8200"
      tls_disable = 0
      tls_cert_file = "/vault/tls/tls.crt"
      tls_key_file = "/vault/tls/tls.key"
    }

    storage "raft" {
      path = "/vault/data"
    }

    service_registration "kubernetes" {}
```

## Compliance Frameworks

### HIPAA Compliance (AWS)

```hcl
# CloudTrail for audit logging
resource "aws_cloudtrail" "main" {
  name                          = "hipaa-audit-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.phi.arn}/"]
    }
  }

  insight_selector {
    insight_type = "ApiCallRateInsight"
  }
}

# Config for compliance monitoring
resource "aws_config_configuration_recorder" "main" {
  name     = "hipaa-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

# Config rules for HIPAA
resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "rds_encryption_enabled" {
  name = "rds-encryption-enabled"

  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# GuardDuty for threat detection
resource "aws_guardduty_detector" "main" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"

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
```

### PCI-DSS Compliance

**Network Segmentation:**
```hcl
# Cardholder Data Environment (CDE) VPC
resource "aws_vpc" "cde" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name        = "cde-vpc"
    Compliance  = "PCI-DSS"
    Environment = "production"
  }
}

# Isolated subnets for CDE
resource "aws_subnet" "cde_private" {
  count             = 3
  vpc_id            = aws_vpc.cde.id
  cidr_block        = "10.1.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name       = "cde-private-${count.index + 1}"
    Compliance = "PCI-DSS"
  }
}

# Strict security group for CDE
resource "aws_security_group" "cde" {
  name        = "cde-sg"
  description = "Security group for Cardholder Data Environment"
  vpc_id      = aws_vpc.cde.id

  # No inbound from internet
  # Only specific application subnets allowed

  ingress {
    description = "HTTPS from payment gateway"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_subnet.payment_gateway.cidr_block]
  }

  egress {
    description = "HTTPS to payment processor"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.payment_processor_cidr]
  }

  tags = {
    Name       = "cde-security-group"
    Compliance = "PCI-DSS"
  }
}

# WAF for PCI-DSS
resource "aws_wafv2_web_acl" "pci" {
  name  = "pci-dss-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLi"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "PCICompliance"
    sampled_requests_enabled   = true
  }
}
```

### SOC 2 Compliance

```hcl
# Security Hub for centralized security
resource "aws_securityhub_account" "main" {}

resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0"
}

# CloudWatch Logs encryption
resource "aws_cloudwatch_log_group" "application" {
  name              = "/application/logs"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.logs.arn

  tags = {
    Compliance = "SOC2"
  }
}

# S3 bucket with versioning and logging
resource "aws_s3_bucket" "audit_logs" {
  bucket = "audit-logs-bucket"

  tags = {
    Compliance = "SOC2"
  }
}

resource "aws_s3_bucket_versioning" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_logging" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "audit-logs/"
}

resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    id     = "archive-old-logs"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555 # 7 years for SOC2
    }
  }
}
```

## Zero-Trust Architecture

**Network Micro-Segmentation:**
```yaml
# Kubernetes Network Policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector: {}
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
```

## Best Practices

1. **IAM:**
   - Use roles instead of users where possible
   - Enable MFA for privileged accounts
   - Rotate credentials regularly
   - Use temporary credentials (STS)
   - Implement least privilege

2. **Encryption:**
   - Encrypt data at rest and in transit
   - Use customer-managed keys for sensitive data
   - Enable key rotation
   - Protect encryption keys with proper IAM policies
   - Use TLS 1.2 or higher

3. **Secrets:**
   - Never hardcode secrets in code
   - Use secrets management services
   - Rotate secrets regularly
   - Audit secret access
   - Limit secret scope

4. **Compliance:**
   - Enable audit logging (CloudTrail, Activity Log)
   - Implement compliance monitoring (Config, Policy)
   - Regular security assessments
   - Document security controls
   - Automated compliance checks

5. **Network Security:**
   - Implement defense in depth
   - Use security groups and NACLs
   - Enable VPC Flow Logs
   - Deploy WAF for web applications
   - Regular vulnerability scanning

## Anti-Patterns

- Using root account for daily operations
- Hardcoding credentials in code
- Overly permissive IAM policies
- No encryption at rest
- Weak or no encryption in transit
- Secrets in version control
- No audit logging
- Public S3 buckets with sensitive data
- No MFA for privileged accounts
- Ignoring security advisories
