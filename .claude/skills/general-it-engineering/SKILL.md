---
description: General IT engineering covering ITIL framework, service management, change management, asset management, incident/problem management, business continuity, IT governance, help desk operations, enterprise monitoring, and automation orchestration. Use when managing IT services, implementing ITSM processes, or establishing IT governance. (project)
---

# General IT Engineering

Comprehensive guide for general IT engineering covering IT service management (ITSM), ITIL frameworks, change management, asset lifecycle, incident management, business continuity, IT governance, and enterprise IT operations.

## Overview

**Purpose:** Enable teams to establish, manage, and optimize IT services and operations using industry-standard frameworks and best practices for delivering reliable, efficient, and secure IT services.

**Scope:**
- ITIL 4 framework and service value system
- Service management and service catalog
- Change management and CAB processes
- IT asset management and CMDB
- Incident and problem management
- Business continuity and disaster recovery
- IT governance (COBIT, policies, compliance)
- Help desk and service desk operations
- Enterprise monitoring and capacity management
- Workflow automation and orchestration

**This skill is for:**
- IT managers implementing ITSM processes
- Service desk teams managing incidents
- IT operations managing infrastructure
- IT governance establishing policies
- Business continuity planners
- Enterprise architects

## Quick Start Checklist

When starting an IT engineering task:

- [ ] Identify service management framework (ITIL, COBIT)
- [ ] Define service catalog and SLAs
- [ ] Establish change management process
- [ ] Implement asset tracking (CMDB)
- [ ] Set up incident management workflow
- [ ] Define escalation procedures
- [ ] Create knowledge base articles
- [ ] Implement monitoring and alerting
- [ ] Document IT policies and procedures
- [ ] Plan business continuity and DR

## Core Concepts

### 1. ITIL 4 Service Value System

```
┌────────────────────────────────────────────┐
│           Guiding Principles               │
├────────────────────────────────────────────┤
│                                             │
│  Governance ─────────────────► Value       │
│       │                            ▲       │
│       │        Service             │       │
│       │         Value              │       │
│       ▼         Chain              │       │
│                                     │       │
│  Practices ──────────────────────────      │
│       │                                     │
│       ▼                                     │
│  Continual Improvement ───────────────     │
│                                             │
└────────────────────────────────────────────┘
```

### 2. Service Management Practices

**General Management:**
- Strategy management
- Portfolio management
- Architecture management
- Relationship management
- Supplier management
- Workforce management
- Measurement and reporting

**Service Management:**
- Service desk
- Incident management
- Problem management
- Change enablement
- Service catalog
- SLA management
- Availability management
- Capacity management

**Technical Management:**
- Deployment management
- Infrastructure management
- Software development
- Platform management

### 3. Change Management Process

```
Request → Assessment → Approval → Implementation → Review
   │           │            │             │            │
   ▼           ▼            ▼             ▼            ▼
 RFC       Impact       CAB          Scheduled    Post-Impl
Created   Analysis    Meeting        Change      Review
```

### 4. Incident Management Lifecycle

```
Detection → Logging → Categorization → Prioritization
     │          │            │                │
     ▼          ▼            ▼                ▼
Investigation → Diagnosis → Resolution → Closure
```

### 5. Service Levels

**SLA Tiers:**
```
Priority 1 (Critical):  Response: 15min, Resolution: 4hr
Priority 2 (High):      Response: 1hr,   Resolution: 8hr
Priority 3 (Medium):    Response: 4hr,   Resolution: 24hr
Priority 4 (Low):       Response: 8hr,   Resolution: 48hr
```

## Common Patterns

### Pattern 1: Service Catalog Structure

```yaml
Service Catalog:
  Business Services:
    - Email Service
      - SLA: 99.9% uptime
      - Support: 24/7
      - Cost: $10/user/month

    - File Storage
      - SLA: 99.95% uptime
      - Capacity: 1TB/user
      - Backup: Daily

  Technical Services:
    - Virtual Machines
    - Database Hosting
    - Load Balancers
```

### Pattern 2: Change Management Workflow

```
Standard Change:     Pre-approved, low risk
Normal Change:       Requires CAB approval
Emergency Change:    Expedited approval process

Example Standard Change:
- Password reset
- User account creation
- Software installation (approved list)

Example Normal Change:
- Server upgrades
- Network changes
- Application deployment

Example Emergency Change:
- Security patch (critical)
- Service restoration
- Production hotfix
```

### Pattern 3: CMDB Structure

```
Configuration Items (CIs):
├── Hardware
│   ├── Servers
│   ├── Network Devices
│   └── End-User Devices
├── Software
│   ├── Applications
│   ├── Databases
│   └── Licenses
└── Services
    ├── Business Services
    └── Technical Services

Relationships:
- Server → Hosts → Application
- Application → Depends on → Database
- Business Service → Uses → Technical Service
```

## Resource Files

For detailed guidance on specific topics, see:

### ITSM Framework
- **[itil-framework.md](resources/itil-framework.md)** - ITIL 4 practices, service value system, guiding principles
- **[service-management.md](resources/service-management.md)** - Service catalog, SLA management, service desk operations

### Change and Release
- **[change-management.md](resources/change-management.md)** - CAB processes, approval workflows, change types, rollback procedures
- **[asset-management.md](resources/asset-management.md)** - IT asset tracking, licensing, hardware lifecycle, CMDB

### Incident and Problem
- **[incident-service-management.md](resources/incident-service-management.md)** - Incident classification, escalation, problem management, root cause analysis

### Resilience
- **[business-continuity.md](resources/business-continuity.md)** - BCP/DR planning, RTO/RPO, disaster recovery testing, failover procedures

### Governance
- **[it-governance.md](resources/it-governance.md)** - COBIT framework, IT policies, compliance, risk management

### Operations
- **[help-desk-operations.md](resources/help-desk-operations.md)** - Ticketing systems, knowledge base, SLA tracking, customer service
- **[enterprise-monitoring.md](resources/enterprise-monitoring.md)** - Monitoring tools, dashboards, capacity management, performance

### Automation
- **[automation-orchestration.md](resources/automation-orchestration.md)** - Workflow automation, ServiceNow, self-service portals, ITSM automation

## Best Practices

### Service Management

1. **Define clear SLAs:**
   - Measurable metrics
   - Realistic targets
   - Regular reviews
   - Customer agreement

2. **Maintain service catalog:**
   - Up-to-date offerings
   - Clear descriptions
   - Pricing information
   - Request procedures

3. **Knowledge management:**
   - Searchable knowledge base
   - Regular updates
   - Version control
   - User feedback

### Change Management

1. **Structured process:**
   - RFC submission
   - Impact assessment
   - CAB review
   - Scheduled implementation
   - Post-implementation review

2. **Change categories:**
   - Standard (pre-approved)
   - Normal (requires approval)
   - Emergency (expedited)

3. **Risk assessment:**
   - Technical impact
   - Business impact
   - Rollback plan
   - Testing requirements

### Incident Management

1. **Rapid response:**
   - Clear escalation paths
   - Priority-based SLAs
   - Communication templates
   - Status updates

2. **Root cause analysis:**
   - Problem investigation
   - Permanent fixes
   - Documentation
   - Prevention measures

3. **Continuous improvement:**
   - Incident trends
   - Process optimization
   - Training needs
   - Tool enhancements

## Anti-Patterns to Avoid

❌ **No change management** - Changes without approval/tracking
❌ **Unclear SLAs** - Unmeasurable or unrealistic targets
❌ **Outdated CMDB** - Inaccurate asset information
❌ **Manual processes** - Not leveraging automation
❌ **No knowledge base** - Repeated resolution of same issues
❌ **Siloed teams** - Lack of communication and collaboration
❌ **Reactive only** - No proactive problem management
❌ **No metrics** - Can't measure service quality
❌ **Insufficient documentation** - Poor knowledge transfer
❌ **No business continuity plan** - Unprepared for disasters

## Common Tasks

### Task: Implement Change Management

1. Define change types (standard, normal, emergency)
2. Create RFC template
3. Establish CAB (Change Advisory Board)
4. Define approval workflows
5. Schedule change windows
6. Create rollback procedures
7. Implement change tracking system
8. Define metrics and reporting
9. Train stakeholders
10. Review and optimize process

### Task: Set Up Service Desk

1. Choose ticketing system
2. Define service catalog
3. Create SLA targets
4. Establish support tiers (L1, L2, L3)
5. Define escalation procedures
6. Create knowledge base
7. Implement self-service portal
8. Set up monitoring dashboards
9. Train support staff
10. Measure and improve

### Task: Build CMDB

1. Define CI types and attributes
2. Choose CMDB tool
3. Import existing assets
4. Define relationships
5. Establish update procedures
6. Integrate with discovery tools
7. Implement validation rules
8. Create reports and dashboards
9. Train administrators
10. Regular audits

## Integration Points

This skill integrates with:
- **sre**: Incident response, on-call, postmortems
- **devsecops**: Compliance, security policies, vulnerability management
- **platform-engineering**: Infrastructure management, service deployment
- **cloud-engineering**: Cloud asset management, cloud governance
- **systems-engineering**: System administration, infrastructure operations

## Triggers and Activation

This skill activates when you:
- Implement ITSM processes
- Manage IT services and operations
- Handle incidents and changes
- Track IT assets and configuration
- Establish IT governance
- Implement help desk operations
- Plan business continuity
- Automate IT workflows
- Manage service levels and SLAs

## Next Steps

For your specific IT engineering task:
1. Identify which ITSM process you're implementing
2. Review relevant ITIL practices and patterns
3. Select appropriate tools and technologies
4. Define processes and workflows
5. Train stakeholders
6. Implement with pilot
7. Measure and optimize

---

**Total Resources:** 10 detailed guides covering all aspects of general IT engineering
**Framework Coverage:** ITIL 4, COBIT, ISO 20000, best practices from enterprise IT
**Maintained by:** IT Service Management team based on real-world production experience
