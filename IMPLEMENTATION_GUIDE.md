# Platform Engineering Extension - Implementation Guide

This document provides a comprehensive guide for completing the Claude Code Infrastructure Showcase extension for platform engineering, DevSecOps, SRE, release engineering, cloud engineering, and systems engineering.

## Overview

This extension adds six new production-ready skills to make the Claude Code Infrastructure Showcase a complete reference library for infrastructure and platform engineering teams.

## Completed Work

### ✅ Platform Engineering Skill (FULLY COMPLETE)
- **Location:** `.claude/skills/platform-engineering/`
- **Status:** Production-ready with all 11 resource files
- **Resources:**
  - architecture-overview.md
  - infrastructure-as-code.md (Terraform, Pulumi, CloudFormation)
  - container-orchestration.md (Kubernetes deep dive)
  - developer-platforms.md (Backstage, self-service)
  - gitops-automation.md (ArgoCD, Flux)
  - service-mesh.md (Istio, Linkerd)
  - multi-tenancy.md (Isolation, quotas, RBAC)
  - resource-management.md (Autoscaling, HPA, VPA)
  - cost-optimization.md (FinOps practices)
  - infrastructure-standards.md (Naming, tagging, governance)
  - platform-security.md (Pod security, policies)

### ✅ DevSecOps Skill (SKILL.md COMPLETE)
- **Location:** `.claude/skills/devsecops/`
- **Status:** Main file complete, resources needed
- **Main Topics:** Security scanning, container security, secrets management, policy enforcement, compliance

## Remaining Skills to Create

### 1. SRE (Site Reliability Engineering)
**Location:** `.claude/skills/sre/`

**SKILL.md Structure:**
```markdown
# SRE - Site Reliability Engineering

## Purpose
Production reliability, incident management, SLO/SLI/SLA, error budgets, observability

## Core Concepts
- Service Level Indicators (SLI)
- Service Level Objectives (SLO)
- Service Level Agreements (SLA)
- Error Budgets
- Toil Reduction
- Incident Management
- On-Call Practices
- Chaos Engineering
```

**Resource Files Needed:**
1. sli-slo-sla.md - Service level definitions, measurement, implementation
2. error-budgets.md - Error budget policies, tracking, enforcement
3. observability.md - Metrics, logs, traces (Prometheus, Grafana, Jaeger)
4. incident-management.md - Incident response, runbooks, post-mortems
5. on-call-practices.md - On-call rotations, escalation, burnout prevention
6. monitoring-alerting.md - Alert design, notification strategies
7. capacity-planning.md - Load testing, capacity modeling, forecasting
8. chaos-engineering.md - Fault injection, resilience testing
9. performance-optimization.md - Profiling, tuning, optimization
10. disaster-recovery.md - Backup strategies, RPO/RTO, DR testing
11. reliability-patterns.md - Circuit breakers, retries, timeouts, bulkheads

### 2. Release Engineering
**Location:** `.claude/skills/release-engineering/`

**SKILL.md Structure:**
```markdown
# Release Engineering

## Purpose
CI/CD pipelines, deployment strategies, release automation, versioning

## Core Concepts
- Continuous Integration
- Continuous Delivery/Deployment
- Deployment Strategies (blue-green, canary, rolling)
- Feature Flags
- Release Automation
- Artifact Management
```

**Resource Files Needed:**
1. cicd-pipelines.md - GitHub Actions, GitLab CI, Jenkins patterns
2. deployment-strategies.md - Blue-green, canary, progressive delivery
3. artifact-management.md - Container registries, artifact repositories
4. versioning-strategies.md - Semantic versioning, release tagging
5. release-automation.md - Automated releases, changelog generation
6. rollback-strategies.md - Safe rollbacks, automated rollback
7. feature-flags.md - Feature flag systems, gradual rollouts
8. testing-strategies.md - Unit, integration, E2E, smoke tests
9. build-optimization.md - Cache strategies, parallel builds
10. pipeline-security.md - Secure pipelines, signed artifacts
11. deployment-validation.md - Health checks, smoke tests, validation

### 3. Cloud Engineering
**Location:** `.claude/skills/cloud-engineering/`

**SKILL.md Structure:**
```markdown
# Cloud Engineering

## Purpose
AWS/Azure/GCP patterns, cloud-native services, multi-cloud, well-architected

## Core Concepts
- Cloud Service Models (IaaS, PaaS, SaaS)
- Well-Architected Frameworks
- Cloud Cost Management
- Cloud Security
- Cloud Networking
```

**Resource Files Needed:**
1. aws-patterns.md - AWS services, best practices, architectures
2. azure-patterns.md - Azure services, ARM templates, best practices
3. gcp-patterns.md - GCP services, best practices
4. multi-cloud-strategies.md - Multi-cloud architectures, abstractions
5. cloud-networking.md - VPC, subnets, security groups, transit gateways
6. cloud-security.md - IAM, encryption, compliance
7. cloud-databases.md - RDS, DynamoDB, Cosmos DB, Cloud SQL
8. serverless-patterns.md - Lambda, Cloud Functions, serverless architectures
9. cloud-storage.md - S3, Blob Storage, Cloud Storage patterns
10. migration-strategies.md - Cloud migration patterns, lift-and-shift, refactoring
11. well-architected.md - AWS/Azure/GCP well-architected frameworks

### 4. Systems Engineering
**Location:** `.claude/skills/systems-engineering/`

**SKILL.md Structure:**
```markdown
# Systems Engineering

## Purpose
Linux administration, networking, performance tuning, troubleshooting

## Core Concepts
- Linux System Administration
- Networking Fundamentals
- Performance Analysis
- Configuration Management
- System Monitoring
```

**Resource Files Needed:**
1. linux-administration.md - User management, file systems, services
2. networking-fundamentals.md - TCP/IP, DNS, load balancing
3. performance-tuning.md - CPU, memory, disk, network optimization
4. system-monitoring.md - Monitoring tools, metrics collection
5. configuration-management.md - Ansible, Chef, Puppet
6. package-management.md - APT, YUM, containerized packages
7. systemd-services.md - Service management, unit files
8. shell-scripting.md - Bash scripting best practices
9. troubleshooting-guide.md - Debugging techniques, common issues
10. security-hardening.md - OS hardening, security best practices
11. backup-recovery.md - Backup strategies, disaster recovery

## Agents to Create

**Location:** `.claude/agents/`

### 1. infrastructure-architect.md
```markdown
---
name: infrastructure-architect
description: Design and review infrastructure architecture, suggest improvements, validate designs against best practices
model: sonnet
color: purple
---

You are an expert infrastructure architect specializing in cloud-native architectures,
Kubernetes, and platform engineering...
```

### 2. iac-code-generator.md
Generate Terraform/Pulumi code from requirements, follow module patterns

### 3. kubernetes-specialist.md
Kubernetes troubleshooting, manifest generation, CRDs, operators

### 4. security-scanner.md
Analyze infrastructure code for security issues, suggest remediations

### 5. incident-responder.md
Guide through incident response, debugging, root cause analysis

### 6. deployment-orchestrator.md
Design deployment pipelines, progressive delivery strategies

### 7. cost-optimizer.md
Analyze infrastructure for cost savings, FinOps recommendations

### 8. migration-planner.md
Plan cloud migrations, modernization, step-by-step migration plans

## Slash Commands to Create

**Location:** `.claude/commands/`

### 1. infra-plan.md
```markdown
---
description: Create comprehensive infrastructure implementation plan
argument-hint: Describe infrastructure to plan (e.g., "Kubernetes cluster on AWS")
---

You are an elite infrastructure planning specialist...
```

### 2. security-review.md
Run security review of infrastructure code

### 3. incident-debug.md
Guide through incident debugging with structured approach

### 4. cost-analysis.md
Analyze infrastructure costs and suggest optimizations

### 5. migration-plan.md
Create cloud migration or modernization plan

## Hooks to Create

**Location:** `.claude/hooks/`

### 1. terraform-validator.sh
```bash
#!/bin/bash
# Validate Terraform code before commits

if [ -n "$SKIP_TF_VALIDATION" ]; then
    exit 0
fi

# Run terraform fmt check
terraform fmt -check -recursive

# Run terraform validate
terraform validate

# Run tflint
tflint --init
tflint
```

### 2. k8s-manifest-validator.sh
Validate Kubernetes manifests with kubectl dry-run and kubeval

### 3. security-policy-check.sh
Check for security issues (hardcoded secrets, insecure configurations)

## skill-rules.json Updates

Add entries for all 6 new skills with comprehensive trigger patterns:

```json
{
  "devsecops": {
    "type": "domain",
    "enforcement": "suggest",
    "priority": "high",
    "description": "DevSecOps practices and security integration",
    "promptTriggers": {
      "keywords": [
        "security",
        "security scan",
        "vulnerability",
        "SAST",
        "DAST",
        "SCA",
        "secrets management",
        "security policy",
        "compliance",
        "container security"
      ],
      "intentPatterns": [
        "(scan|check|find).*?(vulnerability|security|secret)",
        "(implement|add|setup).*?(security|scanning|secrets)",
        "(policy|compliance|audit).*?(security|enforce)"
      ]
    },
    "fileTriggers": {
      "pathPatterns": [
        "**/.trivyignore",
        "**/security/**/*.yaml",
        "**/policies/**/*.rego",
        "**/vault/**/*"
      ],
      "contentPatterns": [
        "trivy",
        "semgrep",
        "snyk",
        "opa",
        "gatekeeper",
        "kyverno"
      ]
    }
  },
  "sre": {
    "type": "domain",
    "enforcement": "suggest",
    "priority": "high",
    "description": "Site Reliability Engineering practices",
    "promptTriggers": {
      "keywords": [
        "SLO",
        "SLI",
        "SLA",
        "error budget",
        "incident",
        "on-call",
        "observability",
        "monitoring",
        "alerting",
        "chaos engineering"
      ],
      "intentPatterns": [
        "(define|create|implement).*?(SLO|SLI|SLA)",
        "(incident|outage|postmortem)",
        "(monitor|alert|observe).*?(service|system)"
      ]
    },
    "fileTriggers": {
      "pathPatterns": [
        "**/monitoring/**/*.yaml",
        "**/alerts/**/*.yaml",
        "**/runbooks/**/*.md"
      ]
    }
  }
  // ... similar entries for release-engineering, cloud-engineering, systems-engineering
}
```

## Implementation Strategy

### Phase 1: Complete Core Skills (Recommended)
1. Finish devsecops resource files
2. Create sre skill completely
3. Create release-engineering skill completely

### Phase 2: Cloud and Systems
4. Create cloud-engineering skill
5. Create systems-engineering skill

### Phase 3: Automation Layer
6. Create all 8 agents
7. Create all 5 slash commands
8. Create all 3 hooks

### Phase 4: Integration
9. Update skill-rules.json with all triggers
10. Test all skills activate properly
11. Document in main README

## Quality Standards

For each file:
- ✅ Under 500 lines for main SKILL.md
- ✅ Comprehensive examples with real code
- ✅ Production-tested patterns
- ✅ Clear anti-patterns section
- ✅ Cross-references to related skills
- ✅ Table of contents for files >100 lines
- ✅ Consistent formatting and tone

## Testing Checklist

- [ ] All skills have proper YAML frontmatter
- [ ] Resource files are properly linked
- [ ] Examples are complete and functional
- [ ] skill-rules.json is valid JSON
- [ ] Triggers activate skills appropriately
- [ ] No broken cross-references
- [ ] Agents have proper frontmatter
- [ ] Commands have argument hints
- [ ] Hooks are executable

## Next Steps

1. **Review this implementation guide**
2. **Create remaining skills systematically** - Follow the structure outlined above
3. **Test each skill** - Ensure it activates properly
4. **Create agents** - Follow existing agent patterns
5. **Create commands** - Follow existing command patterns
6. **Create hooks** - Follow existing hook patterns
7. **Update skill-rules.json** - Add comprehensive triggers
8. **Document** - Update main README with new skills

## File Templates

Refer to:
- `.claude/skills/platform-engineering/SKILL.md` - Main skill structure
- `.claude/skills/platform-engineering/resources/` - Resource file patterns
- `.claude/agents/code-architecture-reviewer.md` - Agent structure
- `.claude/commands/dev-docs.md` - Command structure
- `.claude/hooks/error-handling-reminder.sh` - Hook structure

---

**This is a comprehensive reference library that will serve as the foundation for platform engineering teams.**
**Quality over quantity - each file should be production-ready and valuable.**
