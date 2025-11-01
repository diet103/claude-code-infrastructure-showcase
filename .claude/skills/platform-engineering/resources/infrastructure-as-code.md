# Infrastructure as Code (IaC)

Managing infrastructure through version-controlled, declarative code rather than manual processes. This guide covers Terraform, Pulumi, CloudFormation, state management, module design, and testing strategies.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Tool Selection](#tool-selection)
- [Terraform Patterns](#terraform-patterns)
- [Pulumi Patterns](#pulumi-patterns)
- [CloudFormation Patterns](#cloudformation-patterns)
- [State Management](#state-management)
- [Module Design](#module-design)
- [Testing Strategies](#testing-strategies)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## Core Concepts

### Declarative vs Imperative

**Declarative (Preferred):**
```hcl
# Terraform - Describe desired state
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}
```

**Imperative:**
```python
# Scripting - Describe steps to achieve state
ec2 = boto3.resource('ec2')
instance = ec2.create_instances(
    ImageId='ami-0c55b159cbfafe1f0',
    InstanceType='t3.micro',
    MinCount=1,
    MaxCount=1
)
```

### Idempotency

**Principle:** Running the same IaC code multiple times produces the same result.

```hcl
# Safe to run multiple times
resource "aws_s3_bucket" "data" {
  bucket = "my-unique-bucket-name"

  # First run: Creates bucket
  # Second run: No changes (idempotent)
  # Third run: No changes (idempotent)
}
```

### State Management

**State File:** Tracks actual infrastructure state vs desired state.

```hcl
# Terraform compares:
# 1. State file (actual infrastructure)
# 2. Configuration files (desired state)
# 3. Computes diff and applies changes
```

## Tool Selection

### Terraform

**Best For:**
- Multi-cloud deployments
- Mature ecosystem with thousands of providers
- HCL (HashiCorp Configuration Language)
- Strong community and modules

**Example:**
```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
      Project     = var.project_name
    }
  }
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}
```

### Pulumi

**Best For:**
- Using programming languages (TypeScript, Python, Go, C#)
- Complex logic and control flow
- Type safety and IDE support
- Familiar testing frameworks

**Example:**
```typescript
// Pulumi with TypeScript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const environment = pulumi.getStack();

// Use real programming constructs
const vpc = new aws.ec2.Vpc("main", {
    cidrBlock: config.require("vpcCidr"),
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: {
        Name: `${environment}-vpc`,
        Environment: environment,
        ManagedBy: "pulumi"
    }
});

// Export outputs
export const vpcId = vpc.id;
export const vpcCidr = vpc.cidrBlock;
```

### CloudFormation

**Best For:**
- AWS-native deployments
- Deep AWS integration
- AWS support included
- No additional tooling needed

**Example:**
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'VPC Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-vpc'
        - Key: Environment
          Value: !Ref Environment

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub '${Environment}-VPC-ID'
```

## Terraform Patterns

### Project Structure

```
terraform/
├── modules/                    # Reusable modules
│   ├── vpc/
│   │   ├── main.tf            # Resources
│   │   ├── variables.tf       # Input variables
│   │   ├── outputs.tf         # Output values
│   │   ├── versions.tf        # Provider versions
│   │   └── README.md          # Module documentation
│   ├── eks-cluster/
│   │   └── ...
│   └── rds-postgres/
│       └── ...
├── environments/               # Environment-specific
│   ├── dev/
│   │   ├── main.tf            # Module usage
│   │   ├── backend.tf         # State backend
│   │   ├── variables.tf       # Env variables
│   │   ├── terraform.tfvars   # Variable values
│   │   └── versions.tf        # Terraform version
│   ├── staging/
│   │   └── ...
│   └── prod/
│       └── ...
└── global/                     # Shared resources
    ├── iam/
    │   └── ...
    └── route53/
        └── ...
```

### Module Pattern

**Module Definition (`modules/vpc/main.tf`):**
```hcl
# modules/vpc/main.tf
resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )
}

resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.this.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-private-${count.index + 1}"
      Type = "private"
    }
  )
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-public-${count.index + 1}"
      Type = "public"
    }
  )
}
```

**Module Variables (`modules/vpc/variables.tf`):**
```hcl
variable "name" {
  description = "Name prefix for VPC resources"
  type        = string
}

variable "cidr_block" {
  description = "CIDR block for VPC"
  type        = string
  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "Must be valid IPv4 CIDR block."
  }
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = []
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = []
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in VPC"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support in VPC"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
```

**Module Outputs (`modules/vpc/outputs.tf`):**
```hcl
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.this.cidr_block
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}
```

**Module Usage (`environments/prod/main.tf`):**
```hcl
module "vpc" {
  source = "../../modules/vpc"

  name               = "${var.project_name}-${var.environment}"
  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  private_subnet_cidrs = [
    "10.0.1.0/24",
    "10.0.2.0/24",
    "10.0.3.0/24"
  ]

  public_subnet_cidrs = [
    "10.0.101.0/24",
    "10.0.102.0/24",
    "10.0.103.0/24"
  ]

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}
```

### Data Sources

```hcl
# Reference existing resources
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Use in resources
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = "t3.micro"
}
```

## State Management

### Remote State Backend

**AWS S3 + DynamoDB:**
```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "prod/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"

    # Additional security
    kms_key_id = "arn:aws:kms:us-east-1:123456789:key/abc-def"
  }
}
```

**Setup Script:**
```bash
#!/bin/bash
# setup-backend.sh

BUCKET_NAME="company-terraform-state"
REGION="us-east-1"

# Create S3 bucket
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$REGION"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION"
```

### State File Isolation

**Separate State Per Environment:**
```
terraform-state/
├── dev/
│   ├── vpc/terraform.tfstate
│   ├── eks/terraform.tfstate
│   └── rds/terraform.tfstate
├── staging/
│   └── ...
└── prod/
    └── ...
```

**Remote State Data Source:**
```hcl
# Reference outputs from another state file
data "terraform_remote_state" "vpc" {
  backend = "s3"

  config = {
    bucket = "company-terraform-state"
    key    = "${var.environment}/vpc/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use outputs
resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.vpc.outputs.private_subnet_ids[0]
}
```

## Module Design

### Module Composition

```hcl
# High-level module that composes lower-level modules
module "application_stack" {
  source = "./modules/application-stack"

  # Network configuration
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  # Application configuration
  app_name    = "my-app"
  environment = "prod"

  # Database configuration
  db_instance_class = "db.t3.medium"
  db_allocated_storage = 100
}

# modules/application-stack/main.tf
module "vpc" {
  source = "../vpc"
  # VPC configuration
}

module "eks" {
  source = "../eks-cluster"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}

module "rds" {
  source = "../rds-postgres"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}
```

## Testing Strategies

### Validation

```bash
# Format check
terraform fmt -check -recursive

# Validate configuration
terraform validate

# Plan review
terraform plan -out=plan.tfplan

# Show plan in JSON
terraform show -json plan.tfplan | jq
```

### TFLint

```bash
# Install TFLint
curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash

# .tflint.hcl
plugin "aws" {
  enabled = true
  version = "0.27.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

rule "terraform_deprecated_index" {
  enabled = true
}

rule "terraform_unused_declarations" {
  enabled = true
}

# Run TFLint
tflint --init
tflint
```

### Terratest (Go-based testing)

```go
// test/vpc_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVPCCreation(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../modules/vpc",
        Vars: map[string]interface{}{
            "name": "test-vpc",
            "cidr_block": "10.0.0.0/16",
            "availability_zones": []string{"us-east-1a", "us-east-1b"},
            "private_subnet_cidrs": []string{"10.0.1.0/24", "10.0.2.0/24"},
            "public_subnet_cidrs": []string{"10.0.101.0/24", "10.0.102.0/24"},
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)
}
```

## Best Practices

### 1. Version Pinning

```hcl
terraform {
  required_version = "~> 1.6.0"  # Allow patch versions

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Allow minor versions
    }
  }
}
```

### 2. Variable Validation

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_count" {
  type = number

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}
```

### 3. Sensitive Values

```hcl
variable "db_password" {
  type      = string
  sensitive = true
}

output "db_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = false
}

output "db_password" {
  value     = aws_db_instance.main.password
  sensitive = true  # Won't show in plan/apply output
}
```

### 4. Dependencies

```hcl
resource "aws_instance" "app" {
  # Implicit dependency (automatic)
  subnet_id = aws_subnet.private.id

  # Explicit dependency (when needed)
  depends_on = [
    aws_iam_role_policy_attachment.app_policy
  ]
}
```

### 5. Lifecycle Rules

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.latest.id
  instance_type = "t3.micro"

  lifecycle {
    create_before_destroy = true    # Create new before destroying old
    prevent_destroy       = false   # Prevent accidental destruction
    ignore_changes        = [tags]  # Ignore changes to specific attributes
  }
}
```

## Anti-Patterns

### ❌ Hardcoded Values

```hcl
# BAD
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"  # Hardcoded AMI
  instance_type = "t3.micro"
  subnet_id     = "subnet-12345"            # Hardcoded subnet
}

# GOOD
data "aws_ami" "latest" {
  # Dynamic AMI lookup
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.latest.id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id
}
```

### ❌ No State Locking

```hcl
# BAD - No locking, concurrent runs can corrupt state
terraform {
  backend "s3" {
    bucket = "state-bucket"
    key    = "terraform.tfstate"
  }
}

# GOOD - State locking with DynamoDB
terraform {
  backend "s3" {
    bucket         = "state-bucket"
    key            = "terraform.tfstate"
    dynamodb_table = "terraform-locks"
  }
}
```

### ❌ Monolithic Configuration

```hcl
# BAD - Everything in one file
# main.tf (5000 lines)

# GOOD - Organized structure
# vpc.tf
# eks.tf
# rds.tf
# iam.tf
```

---

**Related Resources:**
- [architecture-overview.md](architecture-overview.md) - Platform architecture patterns
- [container-orchestration.md](container-orchestration.md) - Kubernetes patterns
- [gitops-automation.md](gitops-automation.md) - ArgoCD and Flux patterns
