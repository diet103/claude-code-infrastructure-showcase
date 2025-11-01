---
description: Create comprehensive infrastructure implementation plan
argument-hint: Describe infrastructure to implement (e.g., "multi-region Kubernetes cluster with DR", "serverless API platform")
---

Create a comprehensive infrastructure implementation plan for: $ARGUMENTS

## Instructions

1. **Analyze Requirements:**
   - Understand the infrastructure goals
   - Identify constraints (budget, timeline, compliance)
   - Determine scale and performance needs

2. **Design Architecture:**
   - High-level architecture diagram (text-based)
   - Component breakdown
   - Network topology
   - Data flow
   - Security boundaries

3. **Create Implementation Plan:**

   ### Phase 1: Foundation
   - Cloud provider setup
   - Networking (VPC, subnets, routing)
   - IAM and security policies
   - Logging and monitoring foundation

   ### Phase 2: Core Infrastructure
   - Compute resources (Kubernetes, VMs, serverless)
   - Data stores (databases, caches, object storage)
   - Load balancers and ingress
   - Service mesh (if applicable)

   ### Phase 3: Platform Services
   - CI/CD pipelines
   - Secret management
   - Certificate management
   - Backup and DR

   ### Phase 4: Observability & Operations
   - Monitoring and alerting
   - Log aggregation
   - Tracing
   - Dashboards

   ### Phase 5: Security & Compliance
   - Security scanning
   - Policy enforcement
   - Compliance automation
   - Audit logging

4. **Provide Detailed Tasks:**
   Each phase should include:
   - Specific tasks with acceptance criteria
   - Estimated effort
   - Dependencies
   - Risk assessment
   - Rollback procedures

5. **Include:**
   - Cost estimates
   - Timeline
   - Required skills/team
   - Testing strategy
   - Migration plan (if replacing existing)
   - Documentation requirements

## Output Format

Provide a structured markdown document with:
- Executive summary
- Architecture diagrams (ASCII/text)
- Phased implementation plan
- Task breakdown with estimates
- Risk mitigation strategies
- Success metrics
- References to relevant documentation

Be specific and actionable. Include actual commands, configurations, and code examples where helpful.
