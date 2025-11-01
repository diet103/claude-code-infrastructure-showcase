---
description: Platform engineering and architecture guide covering Infrastructure as Code, container orchestration (Kubernetes/Docker), service mesh, developer platforms, internal developer portals, platform automation, multi-tenancy, resource management, and infrastructure standards. Use when designing platform architecture, implementing IaC, managing Kubernetes clusters, building developer platforms, or establishing infrastructure standards. (project)
---

# Platform Engineering & Architecture

Comprehensive guide for building and managing modern platform engineering infrastructure. This skill provides production-tested patterns for Infrastructure as Code, container orchestration, developer platforms, and platform automation.

## Overview

**Purpose:** Enable teams to build robust, scalable platform infrastructure that empowers developers with self-service capabilities while maintaining security, reliability, and cost efficiency.

**Scope:**
- Infrastructure as Code (Terraform, Pulumi, CloudFormation, Ansible)
- Container orchestration (Kubernetes, Docker, ECS, AKS, GKE, EKS)
- Service mesh and networking (Istio, Linkerd, Envoy)
- Developer platforms and internal portals (Backstage, Port, Humanitec)
- Platform automation and GitOps (ArgoCD, Flux, Jenkins, GitHub Actions)
- Multi-tenancy and resource isolation
- Cost optimization and FinOps
- Infrastructure standards and governance

**This skill is for:**
- Platform engineers building internal developer platforms
- Infrastructure architects designing scalable systems
- Teams migrating to cloud-native architectures
- Organizations implementing platform engineering practices

## Quick Start Checklist

When starting a platform engineering task:

- [ ] Identify the infrastructure layer (compute, networking, storage, orchestration)
- [ ] Choose appropriate IaC tool (Terraform for multi-cloud, native tools for single cloud)
- [ ] Define resource hierarchy and naming conventions
- [ ] Implement state management and backend configuration
- [ ] Design for multi-environment support (dev, staging, prod)
- [ ] Plan security controls and access management
- [ ] Define monitoring and observability strategy
- [ ] Document platform architecture and runbooks
- [ ] Implement cost tracking and tagging strategy
- [ ] Set up automated testing for infrastructure changes

## Core Concepts

### 1. Infrastructure as Code (IaC)

**Definition:** Managing infrastructure through version-controlled code rather than manual processes.

**Key Principles:**
- **Declarative over imperative:** Define desired state, not steps
- **Idempotency:** Same input produces same output
- **Version control:** All infrastructure in Git
- **Immutable infrastructure:** Replace rather than modify
- **State management:** Track current infrastructure state
- **Modularity:** Reusable components and modules

**Tool Selection:**
```
Terraform:     Multi-cloud, largest ecosystem, HCL language
Pulumi:        Programming languages (Python/TypeScript/Go), cloud-native
CloudFormation: AWS-native, tight AWS integration
ARM/Bicep:     Azure-native, JSON/domain-specific language
Ansible:       Configuration management + provisioning
CDK:           Cloud-native using programming languages
```

### 2. Container Orchestration

**Kubernetes Architecture:**
```
┌─────────────────────────────────────────────────┐
│                Control Plane                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   API    │  │   etcd   │  │  Scheduler   │  │
│  │  Server  │  │          │  │              │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│  ┌─────────────────────────────────────────┐   │
│  │      Controller Manager                  │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │  Node 1 │   │  Node 2 │   │  Node 3 │
   │         │   │         │   │         │
   │ Kubelet │   │ Kubelet │   │ Kubelet │
   │ Pods    │   │ Pods    │   │ Pods    │
   └─────────┘   └─────────┘   └─────────┘
```

**Core Resources:**
- **Pods:** Smallest deployable units (containers)
- **Deployments:** Manage replica sets and rolling updates
- **Services:** Stable networking and load balancing
- **ConfigMaps/Secrets:** Configuration and sensitive data
- **Namespaces:** Resource isolation and multi-tenancy
- **Ingress:** External access and routing rules
- **PersistentVolumes:** Storage abstraction

### 3. Platform Layers

```
┌────────────────────────────────────────────────┐
│         Developer Experience Layer             │
│   (Portals, CLIs, APIs, Documentation)        │
└────────────────────────────────────────────────┘
                      │
┌────────────────────────────────────────────────┐
│         Platform Services Layer                │
│  (CI/CD, Observability, Secrets, Service Mesh)│
└────────────────────────────────────────────────┘
                      │
┌────────────────────────────────────────────────┐
│         Orchestration Layer                    │
│        (Kubernetes, ECS, Nomad)               │
└────────────────────────────────────────────────┘
                      │
┌────────────────────────────────────────────────┐
│         Infrastructure Layer                   │
│    (Compute, Network, Storage, Security)      │
└────────────────────────────────────────────────┘
```

### 4. GitOps Principles

**Core Tenets:**
1. **Git as single source of truth:** All desired state in Git
2. **Declarative desired state:** What, not how
3. **Automated synchronization:** Continuous reconciliation
4. **Pull-based deployment:** Cluster pulls changes from Git

**GitOps Workflow:**
```
Developer → Git Push → CI Pipeline → Update Manifest Repo
                                              ↓
                              GitOps Controller monitors repo
                                              ↓
                              Detects drift, applies changes
                                              ↓
                              Cluster state matches Git
```

### 5. Multi-Tenancy Patterns

**Namespace-based Tenancy:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-acme
  labels:
    tenant: acme
    environment: production
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-acme-quota
  namespace: tenant-acme
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 100Gi
    persistentvolumeclaims: "10"
```

**Cluster-based Tenancy:**
- Dedicated clusters per tenant/environment
- Stronger isolation, higher cost
- Simplified RBAC and networking

**Virtual Clusters:**
- vCluster, Loft, Capsule
- Lightweight isolation within shared cluster
- Balance between namespace and cluster tenancy

## Common Patterns

### Pattern 1: Terraform Module Structure

```
terraform/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── versions.tf
│   ├── eks-cluster/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── security.tf
│   └── rds-postgres/
│       └── ...
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── backend.tf
│   │   ├── terraform.tfvars
│   │   └── versions.tf
│   ├── staging/
│   │   └── ...
│   └── prod/
│       └── ...
└── shared/
    └── networking/
        └── ...
```

**Key Practices:**
- Separate modules from environments
- Use remote state for cross-stack references
- Implement state locking (S3 + DynamoDB for AWS)
- Version modules with Git tags
- Use workspaces sparingly (prefer separate state files)

### Pattern 2: Kubernetes Application Deployment

```yaml
# Standard three-resource pattern
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
        version: v1.2.3
    spec:
      containers:
      - name: api
        image: registry.example.com/api-service:v1.2.3
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
spec:
  selector:
    app: api-service
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-service
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: api-service-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

### Pattern 3: Platform Service Catalog

**Developer Portal (Backstage) Structure:**
```yaml
# catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: api-service
  description: Customer API microservice
  annotations:
    github.com/project-slug: company/api-service
    backstage.io/techdocs-ref: dir:.
  tags:
    - api
    - microservice
    - production
spec:
  type: service
  lifecycle: production
  owner: platform-team
  system: customer-platform
  providesApis:
    - customer-api
  consumesApis:
    - auth-api
    - notification-api
  dependsOn:
    - resource:postgres-db
    - resource:redis-cache
```

### Pattern 4: Infrastructure State Management

**Terraform Backend Configuration:**
```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "prod/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"

    # Enable versioning on the bucket for rollback
    # Enable MFA delete for production
  }
}

# Workspace-based alternative (use sparingly)
terraform {
  backend "s3" {
    bucket = "company-terraform-state"
    key    = "env:/${terraform.workspace}/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Resource Files

For detailed guidance on specific topics, see:

### Core Infrastructure
- **[architecture-overview.md](resources/architecture-overview.md)** - Platform architecture patterns, layering strategies, reference architectures, and decision frameworks
- **[infrastructure-as-code.md](resources/infrastructure-as-code.md)** - Terraform, Pulumi, CloudFormation patterns, module design, state management, testing strategies
- **[container-orchestration.md](resources/container-orchestration.md)** - Kubernetes architecture, workload patterns, networking, storage, security best practices

### Platform Services
- **[developer-platforms.md](resources/developer-platforms.md)** - Internal developer portals (Backstage, Port), self-service platforms, service catalogs, developer experience
- **[gitops-automation.md](resources/gitops-automation.md)** - ArgoCD, Flux CD, continuous deployment, progressive delivery, automated rollbacks
- **[service-mesh.md](resources/service-mesh.md)** - Istio, Linkerd implementation, traffic management, security policies, observability

### Operations & Management
- **[multi-tenancy.md](resources/multi-tenancy.md)** - Namespace isolation, resource quotas, RBAC patterns, network policies, cost allocation
- **[resource-management.md](resources/resource-management.md)** - Resource requests/limits, autoscaling (HPA, VPA, KEDA), cluster autoscaling, capacity planning
- **[cost-optimization.md](resources/cost-optimization.md)** - FinOps practices, cost allocation, right-sizing, spot instances, reserved capacity

### Standards & Governance
- **[infrastructure-standards.md](resources/infrastructure-standards.md)** - Naming conventions, tagging strategies, security baselines, compliance frameworks
- **[platform-security.md](resources/platform-security.md)** - Pod security standards, network policies, secrets management, vulnerability scanning, runtime security

## Best Practices

### Infrastructure as Code

1. **State Management:**
   - Always use remote state with locking
   - Never commit state files to version control
   - Use separate state files per environment
   - Enable state file versioning for rollback

2. **Module Design:**
   - Keep modules focused and reusable
   - Version modules with semantic versioning
   - Document inputs, outputs, and examples
   - Test modules independently

3. **Security:**
   - Never commit secrets to version control
   - Use secret management tools (Vault, AWS Secrets Manager)
   - Implement least-privilege IAM policies
   - Enable encryption at rest and in transit

### Kubernetes

1. **Resource Management:**
   - Always set resource requests and limits
   - Use namespaces for logical separation
   - Implement resource quotas per namespace
   - Enable horizontal pod autoscaling

2. **Security:**
   - Use Pod Security Standards
   - Implement network policies for pod isolation
   - Run containers as non-root users
   - Scan images for vulnerabilities
   - Use secrets for sensitive data (never ConfigMaps)

3. **Reliability:**
   - Implement health checks (liveness, readiness, startup)
   - Use multiple replicas for critical services
   - Configure pod disruption budgets
   - Implement proper graceful shutdown

### Platform Engineering

1. **Developer Experience:**
   - Provide self-service capabilities
   - Automate common tasks
   - Document platform usage with examples
   - Measure and improve developer productivity

2. **Observability:**
   - Implement structured logging
   - Set up metrics collection (Prometheus)
   - Configure distributed tracing
   - Create meaningful dashboards and alerts

3. **Cost Management:**
   - Tag all resources for cost allocation
   - Implement resource quotas
   - Monitor and optimize resource usage
   - Use spot/preemptible instances where appropriate

## Anti-Patterns to Avoid

❌ **Manual infrastructure changes** - Always use IaC
❌ **Shared state files** - Separate state per environment/component
❌ **No resource limits** - Can cause resource exhaustion
❌ **Running as root** - Security vulnerability
❌ **Ignoring health checks** - Leads to cascading failures
❌ **No pod disruption budgets** - Maintenance causes outages
❌ **Untagged resources** - Impossible to track costs
❌ **No backup strategy** - Data loss risk
❌ **Overprovisioning by default** - Wastes money
❌ **No monitoring/alerting** - Flying blind

## Common Tasks

### Task: Create New Kubernetes Cluster

1. Define cluster specification (node count, size, region, version)
2. Write Terraform module for cluster provisioning
3. Configure RBAC and service accounts
4. Set up networking (VPC, subnets, security groups)
5. Install core platform services (ingress, cert-manager, monitoring)
6. Configure GitOps controller (ArgoCD/Flux)
7. Implement backup and disaster recovery
8. Document cluster architecture and runbooks

### Task: Onboard New Service to Platform

1. Create namespace with resource quotas
2. Set up RBAC for team access
3. Configure network policies
4. Provision required resources (databases, caches, queues)
5. Create CI/CD pipeline
6. Configure monitoring and alerting
7. Set up logging and tracing
8. Register in service catalog
9. Document service dependencies and runbooks

### Task: Implement Infrastructure Change

1. Create feature branch in IaC repository
2. Make changes in development environment first
3. Run terraform plan and review changes
4. Apply changes to dev environment
5. Test and validate functionality
6. Create pull request with plan output
7. Peer review and approval
8. Apply to staging, then production
9. Monitor for issues and rollback if needed

## Integration Points

This skill integrates with:
- **devsecops**: Security scanning, policy enforcement, compliance
- **sre**: Incident response, reliability engineering, SLO/SLI management
- **release-engineering**: Deployment automation, progressive delivery, rollback strategies
- **cloud-engineering**: Cloud-specific implementations (AWS/Azure/GCP)
- **systems-engineering**: OS-level configuration, networking, performance tuning

## Triggers and Activation

This skill activates when you:
- Work with Infrastructure as Code files (*.tf, *.yaml in k8s/, helm/, infra/)
- Mention platform engineering topics (Kubernetes, Terraform, IaC)
- Design platform architecture or developer platforms
- Implement GitOps or container orchestration
- Configure multi-tenancy or resource management

## Next Steps

For your specific task:
1. Identify which resource file addresses your needs
2. Review the relevant patterns and examples
3. Adapt to your infrastructure and requirements
4. Implement with testing in dev environment first
5. Follow promotion process through environments

---

**Total Resources:** 11 detailed guides covering all aspects of platform engineering
**Pattern Library:** 50+ production-tested infrastructure patterns
**Maintained by:** Platform Engineering team based on real-world production experience
