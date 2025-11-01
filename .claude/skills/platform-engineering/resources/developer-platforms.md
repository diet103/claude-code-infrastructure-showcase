# Developer Platforms & Self-Service

Internal developer portals, self-service platforms, service catalogs, and developer experience optimization for platform engineering.

## Table of Contents

- [Overview](#overview)
- [Backstage Platform](#backstage-platform)
- [Service Catalogs](#service-catalogs)
- [Self-Service Workflows](#self-service-workflows)
- [Golden Paths](#golden-paths)
- [Developer Experience](#developer-experience)
- [Platform APIs](#platform-apis)
- [Best Practices](#best-practices)

## Overview

### Platform Engineering Goals

```
Traditional Ops          Platform Engineering
──────────────          ────────────────────
Ticket System     →     Self-Service Portal
Manual Processes  →     Automated Workflows
Tribal Knowledge  →     Documentation & Templates
Waiting Days      →     Minutes to Deploy
```

### Platform Layers

```
┌─────────────────────────────────────┐
│     Developer Portal (UI/CLI)       │  ← Self-service interface
├─────────────────────────────────────┤
│     Service Catalog                 │  ← Templates & Standards
├─────────────────────────────────────┤
│     Platform APIs                   │  ← Automation layer
├─────────────────────────────────────┤
│     Infrastructure & Services       │  ← Kubernetes, Cloud, etc.
└─────────────────────────────────────┘
```

## Backstage Platform

### Installation

```yaml
# kubernetes/backstage-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backstage
  namespace: platform
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backstage
  template:
    metadata:
      labels:
        app: backstage
    spec:
      containers:
      - name: backstage
        image: backstage:latest
        ports:
        - containerPort: 7007
        env:
        - name: POSTGRES_HOST
          value: postgres.platform.svc.cluster.local
        - name: POSTGRES_PORT
          value: "5432"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: backstage-db
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: backstage-db
              key: password
```

### App Configuration

```yaml
# app-config.yaml
app:
  title: Platform Portal
  baseUrl: https://platform.company.com

organization:
  name: ACME Corp

backend:
  baseUrl: https://platform.company.com
  listen:
    port: 7007
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: ${POSTGRES_PORT}
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}

catalog:
  import:
    entityFilename: catalog-info.yaml
  rules:
    - allow: [Component, System, API, Resource, Location]
  locations:
    # Register all catalog files
    - type: url
      target: https://github.com/company/platform/blob/main/catalog/*.yaml
      rules:
        - allow: [Location]

    # Auto-discover services
    - type: url
      target: https://github.com/company/services/blob/main/*/catalog-info.yaml
      rules:
        - allow: [Component, API]

techdocs:
  builder: 'local'
  generator:
    runIn: 'docker'
  publisher:
    type: 'awsS3'
    awsS3:
      bucketName: 'company-techdocs'
      region: 'us-east-1'
```

## Service Catalogs

### Component Definition

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
    pagerduty.com/integration-key: ${PAGERDUTY_KEY}
  tags:
    - api
    - nodejs
    - typescript
    - production
  links:
    - url: https://api.company.com
      title: Production API
      icon: web
    - url: https://grafana.company.com/d/api-service
      title: Metrics Dashboard
      icon: dashboard
spec:
  type: service
  lifecycle: production
  owner: team-platform
  system: customer-platform

  providesApis:
    - customer-api

  consumesApis:
    - auth-api
    - notification-api

  dependsOn:
    - resource:postgres-db
    - resource:redis-cache
    - component:auth-service
```

### API Definition

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: customer-api
  description: Customer management REST API
spec:
  type: openapi
  lifecycle: production
  owner: team-platform
  system: customer-platform
  definition: |
    openapi: 3.0.0
    info:
      title: Customer API
      version: 1.0.0
    paths:
      /customers:
        get:
          summary: List customers
          responses:
            '200':
              description: Success
```

### Resource Definition

```yaml
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: postgres-db
  description: PostgreSQL database for customer data
spec:
  type: database
  owner: team-platform
  system: customer-platform
  dependsOn:
    - component:postgres-operator
```

### System Definition

```yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: customer-platform
  description: Customer management platform
spec:
  owner: team-platform
```

## Self-Service Workflows

### Software Templates

```yaml
# templates/nodejs-service/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: nodejs-service
  title: Node.js Service
  description: Create a new Node.js microservice
  tags:
    - nodejs
    - typescript
    - recommended
spec:
  owner: team-platform
  type: service

  parameters:
    - title: Service Information
      required:
        - name
        - description
      properties:
        name:
          title: Name
          type: string
          description: Unique name for your service
          pattern: '^[a-z0-9-]+$'
        description:
          title: Description
          type: string
          description: What does this service do?
        owner:
          title: Owner
          type: string
          description: Team that owns this service
          ui:field: OwnerPicker
          ui:options:
            allowedKinds:
              - Group

    - title: Repository
      required:
        - repoUrl
      properties:
        repoUrl:
          title: Repository Location
          type: string
          ui:field: RepoUrlPicker
          ui:options:
            allowedHosts:
              - github.com

    - title: Infrastructure
      properties:
        database:
          title: Needs Database?
          type: boolean
          default: false
        cache:
          title: Needs Redis Cache?
          type: boolean
          default: false

  steps:
    - id: fetch-base
      name: Fetch Base Template
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}
          owner: ${{ parameters.owner }}
          destination: ${{ parameters.repoUrl | parseRepoUrl }}

    - id: create-repo
      name: Create GitHub Repository
      action: publish:github
      input:
        allowedHosts: ['github.com']
        description: ${{ parameters.description }}
        repoUrl: ${{ parameters.repoUrl }}
        defaultBranch: main

    - id: create-kubernetes-resources
      name: Create Kubernetes Resources
      action: kubernetes:create
      input:
        namespace: ${{ parameters.owner }}
        manifest: |
          apiVersion: v1
          kind: Namespace
          metadata:
            name: ${{ parameters.name }}
            labels:
              team: ${{ parameters.owner }}

    - id: create-database
      name: Provision Database
      if: ${{ parameters.database }}
      action: database:provision
      input:
        type: postgresql
        name: ${{ parameters.name }}-db
        team: ${{ parameters.owner }}

    - id: register-catalog
      name: Register in Service Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps['create-repo'].output.repoContentsUrl }}
        catalogInfoPath: '/catalog-info.yaml'

  output:
    links:
      - title: Repository
        url: ${{ steps['create-repo'].output.remoteUrl }}
      - title: Open in Catalog
        icon: catalog
        entityRef: ${{ steps['register-catalog'].output.entityRef }}
```

### Template Skeleton

```
templates/nodejs-service/skeleton/
├── catalog-info.yaml
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── app.ts
│   └── routes/
├── tests/
├── Dockerfile
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
└── .github/
    └── workflows/
        └── ci.yaml
```

## Golden Paths

### Golden Path Example: New Service

```
Step 1: Developer Portal
  ↓
Step 2: Choose Template (nodejs-service)
  ↓
Step 3: Fill Parameters
  - Service name
  - Description
  - Team owner
  - Infrastructure needs
  ↓
Step 4: Automated Actions
  ✓ Create Git repo
  ✓ Generate code from template
  ✓ Create namespace
  ✓ Provision database
  ✓ Setup CI/CD pipeline
  ✓ Create monitoring
  ✓ Register in catalog
  ↓
Step 5: Ready to Code!
  - Repo with best practices
  - Tests configured
  - CI/CD working
  - Infrastructure ready
```

### Score Card

```yaml
# .backstage/scorecard.yaml
apiVersion: backstage.io/v1alpha1
kind: Scorecard
metadata:
  name: production-readiness
spec:
  checks:
    - name: Has Documentation
      description: Service must have README and docs
      weight: 10
      check:
        type: file-exists
        files:
          - README.md
          - docs/

    - name: Has Tests
      description: Service must have automated tests
      weight: 20
      check:
        type: coverage
        minimum: 80

    - name: Has Monitoring
      description: Service exports metrics
      weight: 15
      check:
        type: annotation-exists
        annotation: prometheus.io/scrape

    - name: Has Health Checks
      description: Service has health endpoints
      weight: 15
      check:
        type: file-contains
        file: k8s/deployment.yaml
        pattern: livenessProbe

    - name: Has Owner
      description: Service has defined owner team
      weight: 10
      check:
        type: field-exists
        field: spec.owner

    - name: Security Scan
      description: No critical vulnerabilities
      weight: 30
      check:
        type: workflow-status
        workflow: security-scan
```

## Platform APIs

### Self-Service API

```typescript
// platform-api/src/routes/provision.ts
import express from 'express';

const router = express.Router();

/**
 * POST /api/provision/database
 * Provision a new database instance
 */
router.post('/database', async (req, res) => {
  const { name, type, team, environment } = req.body;

  // Validate request
  const schema = z.object({
    name: z.string().regex(/^[a-z0-9-]+$/),
    type: z.enum(['postgresql', 'mysql', 'mongodb']),
    team: z.string(),
    environment: z.enum(['dev', 'staging', 'prod'])
  });

  const validated = schema.parse(req.body);

  // Create Terraform workspace
  const workspace = `${validated.team}-${validated.name}-${validated.environment}`;

  // Apply infrastructure
  await terraformService.apply({
    workspace,
    module: `databases/${validated.type}`,
    variables: {
      name: validated.name,
      team: validated.team,
      environment: validated.environment
    }
  });

  // Get connection details
  const outputs = await terraformService.outputs(workspace);

  // Store credentials in Vault
  await vaultService.write(
    `${validated.team}/${validated.environment}/${validated.name}`,
    outputs.credentials
  );

  // Create Kubernetes secret
  await k8sService.createSecret({
    namespace: validated.team,
    name: `${validated.name}-db`,
    data: outputs.credentials
  });

  res.json({
    success: true,
    database: {
      name: validated.name,
      endpoint: outputs.endpoint,
      secretName: `${validated.name}-db`
    }
  });
});

/**
 * POST /api/provision/namespace
 * Create new namespace with quotas
 */
router.post('/namespace', async (req, res) => {
  const { name, team, quotas } = req.body;

  await k8sService.applyManifests([
    {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name,
        labels: {
          team,
          'managed-by': 'platform'
        }
      }
    },
    {
      apiVersion: 'v1',
      kind: 'ResourceQuota',
      metadata: {
        name: `${name}-quota`,
        namespace: name
      },
      spec: {
        hard: quotas || {
          'requests.cpu': '10',
          'requests.memory': '10Gi',
          'limits.cpu': '20',
          'limits.memory': '20Gi',
          'persistentvolumeclaims': '10'
        }
      }
    }
  ]);

  res.json({ success: true, namespace: name });
});

export default router;
```

## Developer Experience

### CLI Tool

```typescript
// platform-cli/src/commands/create.ts
import { Command } from 'commander';

const createCommand = new Command('create');

createCommand
  .command('service <name>')
  .description('Create a new service')
  .option('-t, --template <template>', 'Service template', 'nodejs-service')
  .option('-o, --owner <team>', 'Owning team')
  .option('--database', 'Include database')
  .action(async (name, options) => {
    console.log(`Creating service: ${name}`);

    // Call Backstage API
    const response = await fetch('https://platform.company.com/api/scaffolder/v2/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        templateRef: `template:default/${options.template}`,
        values: {
          name,
          owner: options.owner,
          database: options.database
        }
      })
    });

    const task = await response.json();
    console.log(`Task created: ${task.id}`);
    console.log(`View progress: https://platform.company.com/create/tasks/${task.id}`);
  });

export default createCommand;
```

## Best Practices

### 1. Golden Paths Over Freedom

Provide opinionated, well-tested templates rather than infinite customization.

### 2. Documentation as Code

Keep docs alongside code, auto-generate from templates.

### 3. Measure Developer Productivity

```yaml
# Metrics to track
metrics:
  - time_to_first_commit
  - time_to_production
  - lead_time_for_changes
  - deployment_frequency
  - change_failure_rate
  - mean_time_to_recovery
```

### 4. Progressive Disclosure

Start simple, reveal complexity as needed. Don't overwhelm with options.

### 5. Self-Service with Guardrails

Automate everything, but enforce standards and security.

---

**Related Resources:**
- [gitops-automation.md](gitops-automation.md) - Automated deployments
- [infrastructure-standards.md](infrastructure-standards.md) - Platform standards
- [service-mesh.md](service-mesh.md) - Service connectivity
