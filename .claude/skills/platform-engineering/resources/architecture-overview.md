# Platform Architecture Overview

Comprehensive guide to platform architecture patterns, layering strategies, and decision frameworks for building scalable infrastructure.

## Table of Contents
- [Architecture Patterns](#architecture-patterns)
- [Platform Layers](#platform-layers)
- [Reference Architectures](#reference-architectures)
- [Decision Frameworks](#decision-frameworks)
- [Design Principles](#design-principles)

## Architecture Patterns

### 1. Three-Tier Platform Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    PRESENTATION TIER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Web Apps   │  │  Mobile Apps │  │     APIs     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────────────────────────────────────┐
│                     APPLICATION TIER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Services   │  │  Business    │  │  API Gateway │     │
│  │              │  │  Logic       │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────────────────────────────────────┐
│                       DATA TIER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Databases   │  │    Caches    │  │    Queues    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────────────────────────────┘
```

**When to Use:**
- Traditional web applications
- Monolithic architecture migrations
- Clear separation of concerns needed
- Team boundaries align with tiers

### 2. Microservices Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway / Ingress                   │
└─────────────────────────────────────────────────────────────┘
           │              │              │              │
    ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
    │   Service   │ │  Service  │ │  Service  │ │  Service  │
    │      A      │ │     B     │ │     C     │ │     D     │
    └─────┬───────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
          │               │               │               │
    ┌─────▼──────┐  ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │  Database  │  │ Database│    │ Database│    │ Database│
    │     A      │  │    B    │    │    C    │    │    D    │
    └────────────┘  └─────────┘    └─────────┘    └─────────┘

    Service Mesh (Optional): Istio, Linkerd for service-to-service communication
```

**Characteristics:**
- Services own their data
- Independent deployment lifecycles
- Bounded contexts per domain
- Decentralized governance

**Trade-offs:**
- **Pros:** Scalability, team autonomy, technology diversity
- **Cons:** Complexity, distributed systems challenges, operational overhead

### 3. Platform Engineering Layered Model

```
┌────────────────────────────────────────────────────────────┐
│                  Developer Interface Layer                  │
│                                                             │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │  Developer   │  │   Portal/UI   │  │  CLI Tools     │  │
│  │  Portal      │  │   (Backstage) │  │  (kubectl,etc) │  │
│  └──────────────┘  └───────────────┘  └────────────────┘  │
└────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────────────────────────────────────┐
│                 Platform Capabilities Layer                 │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  CI/CD   │ │  Secrets │ │  Observ. │ │   Service    │  │
│  │          │ │  Mgmt    │ │          │ │   Mesh       │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────────────────────────────────────┐
│                   Orchestration Layer                       │
│                                                             │
│         ┌────────────────────────────────────┐             │
│         │         Kubernetes Cluster         │             │
│         │    (or ECS, Nomad, Cloud Run)     │             │
│         └────────────────────────────────────┘             │
└────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                     │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Compute  │ │  Network │ │  Storage │ │   Security   │  │
│  │ (VMs,    │ │  (VPC,   │ │  (EBS,   │ │   (IAM,      │  │
│  │  Nodes)  │ │  LB,SG)  │ │  PV)     │ │   KMS)       │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Layer Responsibilities:**

**Developer Interface:**
- Self-service portals and APIs
- Documentation and discovery
- Templates and scaffolding
- Developer workflows

**Platform Capabilities:**
- Shared services used by applications
- Policy enforcement
- Security and compliance
- Observability and monitoring

**Orchestration:**
- Container/workload scheduling
- Service discovery
- Load balancing
- Auto-scaling

**Infrastructure:**
- Compute resources (VMs, bare metal)
- Networking (VPC, subnets, routing)
- Storage (block, object, file)
- Security (identity, encryption, firewalls)

### 4. Hub and Spoke Network Architecture

```
                    ┌──────────────────┐
                    │   Hub Network    │
                    │                  │
                    │  ┌────────────┐  │
                    │  │  Firewall  │  │
                    │  │   / VPN    │  │
                    │  └────────────┘  │
                    │                  │
                    │  ┌────────────┐  │
                    │  │  Shared    │  │
                    │  │  Services  │  │
                    │  └────────────┘  │
                    └────┬────┬────┬───┘
                         │    │    │
           ┌─────────────┘    │    └─────────────┐
           │                  │                   │
    ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
    │   Spoke 1   │    │   Spoke 2   │    │   Spoke 3   │
    │             │    │             │    │             │
    │  Production │    │   Staging   │    │     Dev     │
    │  Workloads  │    │  Workloads  │    │  Workloads  │
    └─────────────┘    └─────────────┘    └─────────────┘
```

**Benefits:**
- Centralized security controls
- Simplified network management
- Cost-effective (shared egress)
- Environment isolation

### 5. Multi-Region Active-Active Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Global Load Balancer                      │
│               (Route 53, Cloud DNS, Traffic Mgr)            │
└──────────────────────┬──────────────────┬───────────────────┘
                       │                  │
        ┌──────────────▼────────┐  ┌──────▼──────────────────┐
        │     Region A (US)     │  │   Region B (EU)         │
        │                       │  │                         │
        │  ┌─────────────────┐  │  │  ┌─────────────────┐   │
        │  │  Application    │  │  │  │  Application    │   │
        │  │  Tier           │  │  │  │  Tier           │   │
        │  └─────────────────┘  │  │  └─────────────────┘   │
        │                       │  │                         │
        │  ┌─────────────────┐  │  │  ┌─────────────────┐   │
        │  │  Database       │◄─┼──┼─►│  Database       │   │
        │  │  (Primary)      │  │  │  │  (Replica)      │   │
        │  └─────────────────┘  │  │  └─────────────────┘   │
        └───────────────────────┘  └─────────────────────────┘
                  │                            │
                  └──────────┬─────────────────┘
                             │
                    Global Data Sync
```

**Considerations:**
- Data consistency (eventual vs strong)
- Conflict resolution strategies
- Latency optimization
- Disaster recovery

## Platform Layers

### Layer 1: Infrastructure (Foundation)

**Components:**
- Compute: EC2, Azure VMs, GCE, bare metal
- Network: VPC, subnets, security groups, load balancers
- Storage: EBS, S3, Azure Blob, Google Cloud Storage
- Identity: IAM, Azure AD, Google Cloud IAM

**IaC Example (Terraform):**
```hcl
# VPC Module
module "vpc" {
  source = "../modules/vpc"

  cidr_block           = "10.0.0.0/16"
  availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets      = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets       = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  enable_dns_hostnames = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

### Layer 2: Orchestration (Kubernetes)

**Cluster Architecture:**
```
┌────────────────────────────────────────────────────────┐
│                   Control Plane                         │
│  (Managed: EKS, GKE, AKS OR Self-managed)              │
└────────────────────────────────────────────────────────┘
                        │
┌────────────────────────────────────────────────────────┐
│                   Node Groups                           │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   System     │  │  Application │  │   Stateful   │ │
│  │   Nodes      │  │    Nodes     │  │    Nodes     │ │
│  │              │  │              │  │              │ │
│  │ (Monitoring, │  │  (Services)  │  │ (Databases)  │ │
│  │  Ingress)    │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────────────────────────────────────────────────┘
```

**Node Group Strategy:**
- **System nodes:** Platform components (monitoring, ingress, DNS)
- **Application nodes:** User workloads with autoscaling
- **Stateful nodes:** Databases, queues (often separate clusters)

### Layer 3: Platform Services

**Core Services:**

1. **CI/CD Pipeline:**
   - GitHub Actions, GitLab CI, Jenkins, CircleCI
   - ArgoCD/Flux for GitOps deployment
   - Image registry (ECR, Docker Hub, Harbor)

2. **Observability Stack:**
   - Metrics: Prometheus + Thanos (long-term storage)
   - Logs: Loki, ELK stack, Cloud Logging
   - Tracing: Jaeger, Zipkin, Tempo
   - Dashboards: Grafana

3. **Security Services:**
   - Secrets: Vault, AWS Secrets Manager, Sealed Secrets
   - Certificate management: cert-manager + Let's Encrypt
   - Policy enforcement: OPA, Kyverno, Pod Security Standards
   - Vulnerability scanning: Trivy, Snyk, Aqua

4. **Service Mesh (Optional):**
   - Istio, Linkerd, Consul
   - mTLS between services
   - Traffic management and canary deployments
   - Observability and tracing

### Layer 4: Developer Experience

**Self-Service Portal Features:**
```yaml
# Backstage software catalog example
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-service
  description: Payment processing microservice
  annotations:
    github.com/project-slug: company/payment-service
    pagerduty.com/integration-key: abc123
spec:
  type: service
  lifecycle: production
  owner: payments-team
  system: payment-platform

  # Self-service actions
  providesApis:
    - payment-api-v1
  consumesApis:
    - fraud-detection-api
  dependsOn:
    - resource:postgres-payment-db
    - resource:redis-cache
```

**Developer Portal Capabilities:**
- Service catalog and documentation
- Software templates for scaffolding
- CI/CD pipeline triggers
- Environment provisioning
- Cost visibility per service
- On-call schedules and runbooks

## Reference Architectures

### AWS EKS Platform

```
┌────────────────────────────────────────────────────────────┐
│                        AWS Cloud                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                Route 53 (DNS)                        │  │
│  └─────────────────────┬────────────────────────────────┘  │
│                        │                                    │
│  ┌─────────────────────▼────────────────────────────────┐  │
│  │        Application Load Balancer (ALB)              │  │
│  └─────────────────────┬────────────────────────────────┘  │
│                        │                                    │
│  ┌─────────────────────▼────────────────────────────────┐  │
│  │              EKS Cluster (Control Plane)            │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  VPC (10.0.0.0/16)                             │ │  │
│  │  │                                                 │ │  │
│  │  │  ┌──────────────┐  ┌──────────────┐           │ │  │
│  │  │  │  Private     │  │   Private    │           │ │  │
│  │  │  │  Subnet AZ1  │  │  Subnet AZ2  │           │ │  │
│  │  │  │              │  │              │           │ │  │
│  │  │  │ ┌──────────┐ │  │ ┌──────────┐ │           │ │  │
│  │  │  │ │ EKS Node │ │  │ │ EKS Node │ │           │ │  │
│  │  │  │ │  Group   │ │  │ │  Group   │ │           │ │  │
│  │  │  │ └──────────┘ │  │ └──────────┘ │           │ │  │
│  │  │  └──────────────┘  └──────────────┘           │ │  │
│  │  │                                                 │ │  │
│  │  │  ┌──────────────┐  ┌──────────────┐           │ │  │
│  │  │  │   Public     │  │    Public    │           │ │  │
│  │  │  │  Subnet AZ1  │  │  Subnet AZ2  │           │ │  │
│  │  │  │ (NAT Gateway)│  │ (NAT Gateway)│           │ │  │
│  │  │  └──────────────┘  └──────────────┘           │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Supporting Services                                 │  │
│  │  - RDS (Postgres/MySQL)                             │  │
│  │  - ElastiCache (Redis)                              │  │
│  │  - S3 (Object Storage)                              │  │
│  │  - ECR (Container Registry)                         │  │
│  │  - Secrets Manager                                   │  │
│  │  - CloudWatch (Monitoring)                          │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Google Cloud GKE Platform

```
┌────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                    │
│                                                             │
│  Cloud DNS → Cloud Load Balancer → GKE Cluster            │
│                                                             │
│  Services:                                                  │
│  - Cloud SQL (PostgreSQL)                                  │
│  - Memorystore (Redis)                                     │
│  - Cloud Storage (Objects)                                 │
│  - Artifact Registry (Containers)                          │
│  - Secret Manager                                           │
│  - Cloud Operations (Monitoring/Logging)                   │
│                                                             │
│  Networking:                                                │
│  - VPC with private Google access                          │
│  - Cloud NAT for egress                                    │
│  - Private GKE cluster                                     │
└────────────────────────────────────────────────────────────┘
```

## Decision Frameworks

### When to Use Kubernetes vs. Serverless

**Use Kubernetes when:**
- ✅ Running microservices architecture
- ✅ Need container portability across clouds
- ✅ Require fine-grained resource control
- ✅ Have stateful workloads (databases, caches)
- ✅ Long-running processes
- ✅ Batch processing jobs
- ✅ WebSocket or streaming connections

**Use Serverless when:**
- ✅ Event-driven architectures
- ✅ Variable/unpredictable traffic
- ✅ Simple stateless functions
- ✅ Want minimal operational overhead
- ✅ Short-lived request-response patterns
- ✅ Integrating with cloud-native services

**Hybrid Approach:**
- Kubernetes for core services
- Serverless for event processing, API transformations
- Example: API Gateway → Lambda → EKS services

### Multi-Cloud vs. Single Cloud

**Single Cloud (Recommended for most):**
- **Pros:** Deeper integration, simpler operations, lower cost
- **Cons:** Vendor lock-in, regional limitations
- **Use when:** Team expertise in one cloud, cost-sensitive, fast iteration

**Multi-Cloud:**
- **Pros:** Vendor independence, geographic coverage, risk mitigation
- **Cons:** Complexity, higher costs, split expertise
- **Use when:** Regulatory requirements, M&A integrations, true failover needs

**Abstraction Strategy:**
- Use Kubernetes for workload portability
- Terraform for infrastructure
- Avoid cloud-specific services in application code

### Build vs. Buy for Platform Services

| Service | Build | Buy |
|---------|-------|-----|
| CI/CD | GitHub Actions, GitLab CI | CircleCI, Jenkins X |
| Secrets | Vault (self-hosted) | AWS Secrets Manager, 1Password |
| Monitoring | Prometheus + Grafana | Datadog, New Relic |
| Service Mesh | Istio, Linkerd | AWS App Mesh, Google Traffic Director |
| Developer Portal | Backstage (self-hosted) | Port, Humanitec |

**Decision Criteria:**
1. **Team size:** <50 engineers → buy, >100 → consider build
2. **Customization needs:** High → build, Low → buy
3. **Operational capacity:** Limited → buy, Strong → build
4. **Budget:** Tight → open source + build, Flexible → buy

## Design Principles

### 1. Self-Service First

**Principle:** Developers should provision resources without filing tickets.

**Implementation:**
```yaml
# Example: Platform API for database provisioning
apiVersion: database.platform.company.com/v1
kind: PostgresDatabase
metadata:
  name: payment-db
  namespace: payments-team
spec:
  size: small  # Predefined t-shirt sizes
  backup: enabled
  highAvailability: true
  version: "14"
```

**Benefits:**
- Faster developer velocity
- Reduced operational toil
- Standardized configurations

### 2. Everything as Code

**Scope:**
- Infrastructure (Terraform, Pulumi)
- Configuration (Kubernetes YAML, Helm)
- Policies (OPA Rego, Sentinel)
- Documentation (Markdown in Git)
- Runbooks (code + automation)

**Why:**
- Version control and audit trail
- Reproducibility
- Testability
- Automation-friendly

### 3. Progressive Delivery

**Deployment Strategy:**
```
Code Merge → CI Build → Deploy to Dev → Automated Tests
                                  ↓
                         Deploy to Staging (10% traffic)
                                  ↓
                         Monitor metrics for 1 hour
                                  ↓
                         Deploy to Prod (10% → 50% → 100%)
                                  ↓
                         Auto-rollback if error rate > 1%
```

**Techniques:**
- Blue-green deployments
- Canary releases
- Feature flags
- Automated rollbacks

### 4. Defense in Depth

**Security Layers:**
```
┌──────────────────────────────────────┐
│ 1. Perimeter: Firewall, WAF, DDoS   │
├──────────────────────────────────────┤
│ 2. Network: VPC, Security Groups     │
├──────────────────────────────────────┤
│ 3. Cluster: RBAC, Pod Security       │
├──────────────────────────────────────┤
│ 4. Application: Input validation     │
├──────────────────────────────────────┤
│ 5. Data: Encryption at rest/transit │
└──────────────────────────────────────┘
```

**No single layer failure compromises entire system.**

### 5. Observability Over Monitoring

**Three Pillars:**
1. **Metrics:** System health (CPU, memory, latency, errors)
2. **Logs:** Event streams for debugging
3. **Traces:** Request flow across services

**OpenTelemetry Standard:**
```yaml
# Instrument services with OTEL
instrumentation:
  metrics: true
  logs: true
  traces: true

exporters:
  - prometheus  # Metrics
  - loki        # Logs
  - tempo       # Traces
```

### 6. Cost Awareness

**FinOps Practices:**
- Tag all resources (team, environment, service, cost-center)
- Set up billing alerts
- Right-size resources (don't over-provision)
- Use spot/preemptible instances for non-critical workloads
- Implement auto-scaling
- Review and cleanup unused resources monthly

**Example Tagging Strategy:**
```hcl
tags = {
  Environment  = "production"
  Team         = "payments"
  Service      = "payment-api"
  CostCenter   = "engineering"
  ManagedBy    = "terraform"
  Owner        = "payments-team@company.com"
}
```

## Summary

Platform architecture is about creating the foundation that enables teams to build, deploy, and operate services efficiently. Key takeaways:

1. **Layer appropriately:** Infrastructure → Orchestration → Platform Services → Developer Experience
2. **Choose patterns that match your scale:** Don't over-engineer for current needs, but plan for growth
3. **Prioritize developer experience:** Self-service, documentation, and automation
4. **Embrace IaC and GitOps:** Everything version controlled, automated, and reproducible
5. **Design for failure:** Multi-AZ, auto-scaling, automated recovery
6. **Make cost a first-class concern:** Tag, monitor, optimize continuously

For detailed implementation guidance, see the other resource files in this skill.
