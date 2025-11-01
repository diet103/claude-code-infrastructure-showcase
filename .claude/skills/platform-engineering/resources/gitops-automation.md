# GitOps Automation

GitOps principles, ArgoCD, Flux CD, continuous deployment, progressive delivery, and automated rollbacks for Kubernetes deployments.

## Table of Contents

- [GitOps Principles](#gitops-principles)
- [ArgoCD](#argocd)
- [Flux CD](#flux-cd)
- [Application Patterns](#application-patterns)
- [Progressive Delivery](#progressive-delivery)
- [Multi-Environment Strategy](#multi-environment-strategy)
- [Best Practices](#best-practices)

## GitOps Principles

### Core Tenets

```
1. Declarative       Git contains desired state, not imperative scripts
2. Versioned         All changes tracked in Git history
3. Pulled           Cluster pulls changes (not pushed from CI)
4. Reconciled       Continuous sync between Git and cluster
```

### GitOps Workflow

```
Developer         CI/CD Pipeline        Git Repository        GitOps Controller         Kubernetes Cluster
────────          ──────────────        ──────────────        ─────────────────         ──────────────────
git push    →     Build & Test    →     Update manifests      Detect drift        →     Apply changes
                  Container image       in Git repo           Pull latest              Reconcile state
                                                              Compare desired
                                                              vs actual state
```

## ArgoCD

### Installation

```yaml
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Expose ArgoCD server
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Get initial password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### Application Definition

```yaml
# apps/production/api-service.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-service
  namespace: argocd
  # Finalizer ensures cascade delete
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  # Project for RBAC and restrictions
  project: production

  # Source: Git repository
  source:
    repoURL: https://github.com/company/k8s-manifests
    targetRevision: main
    path: applications/api-service/overlays/production

    # Kustomize build options
    kustomize:
      namePrefix: prod-
      commonLabels:
        environment: production
      images:
        - api-service=company/api-service:v1.2.3

  # Destination: Kubernetes cluster
  destination:
    server: https://kubernetes.default.svc
    namespace: production

  # Sync policy
  syncPolicy:
    automated:
      prune: true        # Delete resources not in Git
      selfHeal: true     # Auto-fix drift
      allowEmpty: false  # Don't delete all on empty dir

    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - PruneLast=true

    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m

  # Ignore differences in specific fields
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas  # Ignore HPA-managed replicas

  # Health assessment
  health:
    checkInterval: 30s
    timeout: 5m
```

### AppProject (Multi-Tenancy)

```yaml
# projects/team-platform.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-platform
  namespace: argocd
spec:
  description: Platform team applications

  # Allowed source repositories
  sourceRepos:
    - https://github.com/company/platform-*
    - https://github.com/company/k8s-manifests

  # Allowed destinations
  destinations:
    - namespace: 'platform-*'
      server: https://kubernetes.default.svc
    - namespace: production
      server: https://kubernetes.default.svc

  # Cluster resource whitelist (what can be deployed)
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
    - group: rbac.authorization.k8s.io
      kind: ClusterRole
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding

  # Namespace resource whitelist
  namespaceResourceWhitelist:
    - group: apps
      kind: Deployment
    - group: apps
      kind: StatefulSet
    - group: ''
      kind: Service
    - group: ''
      kind: ConfigMap
    - group: ''
      kind: Secret

  # Roles for RBAC
  roles:
    - name: developer
      description: Developer access
      policies:
        - p, proj:team-platform:developer, applications, get, team-platform/*, allow
        - p, proj:team-platform:developer, applications, sync, team-platform/*, allow
      groups:
        - platform-developers

    - name: admin
      description: Admin access
      policies:
        - p, proj:team-platform:admin, applications, *, team-platform/*, allow
      groups:
        - platform-admins
```

### App of Apps Pattern

```yaml
# apps/root-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  project: default

  source:
    repoURL: https://github.com/company/k8s-manifests
    targetRevision: main
    path: apps/production  # Directory containing other Application manifests

  destination:
    server: https://kubernetes.default.svc
    namespace: argocd

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### ApplicationSet

```yaml
# applicationsets/microservices.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  # Generator: Create app per directory
  generators:
    - git:
        repoURL: https://github.com/company/k8s-manifests
        revision: main
        directories:
          - path: applications/*/overlays/production

  template:
    metadata:
      name: '{{path.basename}}'
      labels:
        environment: production
    spec:
      project: production
      source:
        repoURL: https://github.com/company/k8s-manifests
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Flux CD

### Installation

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Bootstrap Flux on cluster
flux bootstrap github \
  --owner=company \
  --repository=k8s-cluster \
  --branch=main \
  --path=clusters/production \
  --personal=false \
  --token-auth
```

### GitRepository Source

```yaml
# flux-system/sources/k8s-manifests.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: k8s-manifests
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/company/k8s-manifests
  ref:
    branch: main
  secretRef:
    name: github-credentials
```

### Kustomization

```yaml
# flux-system/kustomizations/api-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-service
  namespace: flux-system
spec:
  interval: 5m
  path: ./applications/api-service/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: k8s-manifests
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: api-service
      namespace: production
  timeout: 5m
  wait: true
```

### HelmRelease

```yaml
# flux-system/helm/nginx-ingress.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: '4.7.x'
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  values:
    controller:
      service:
        type: LoadBalancer
      metrics:
        enabled: true
      replicaCount: 3
```

## Application Patterns

### Kustomize Structure

```
k8s-manifests/
├── base/                           # Base manifests
│   └── api-service/
│       ├── kustomization.yaml
│       ├── deployment.yaml
│       ├── service.yaml
│       └── configmap.yaml
├── overlays/                       # Environment-specific
│   ├── dev/
│   │   └── api-service/
│   │       ├── kustomization.yaml
│   │       └── patches/
│   ├── staging/
│   │   └── api-service/
│   │       └── kustomization.yaml
│   └── production/
│       └── api-service/
│           ├── kustomization.yaml
│           ├── patches/
│           └── sealed-secrets.yaml
└── apps/                           # ArgoCD Applications
    ├── dev/
    ├── staging/
    └── production/
        └── api-service.yaml
```

**Base Kustomization:**
```yaml
# base/api-service/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml

commonLabels:
  app: api-service

images:
  - name: api-service
    newName: company/api-service
    newTag: latest
```

**Production Overlay:**
```yaml
# overlays/production/api-service/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../../base/api-service

namespace: production

commonLabels:
  environment: production

images:
  - name: api-service
    newTag: v1.2.3

replicas:
  - name: api-service
    count: 5

patches:
  - path: patches/resources.yaml
  - path: patches/hpa.yaml
```

## Progressive Delivery

### Canary Deployment (Argo Rollouts)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 10
  strategy:
    canary:
      # Canary steps
      steps:
        - setWeight: 10      # Route 10% traffic to canary
        - pause: {duration: 5m}
        - setWeight: 20
        - pause: {duration: 5m}
        - setWeight: 40
        - pause: {duration: 10m}
        - setWeight: 60
        - pause: {duration: 10m}
        - setWeight: 80
        - pause: {duration: 10m}

      # Traffic routing
      trafficRouting:
        istio:
          virtualService:
            name: api-service
            routes:
              - primary

      # Analysis during canary
      analysis:
        templates:
          - templateName: success-rate
        startingStep: 2
        args:
          - name: service-name
            value: api-service

  # Pod template
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
      - name: api
        image: company/api-service:v1.3.0
        # ... container spec
```

**Analysis Template:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
    - name: prometheus-server
      value: http://prometheus.monitoring:9090

  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result >= 0.95
      failureLimit: 3
      provider:
        prometheus:
          address: "{{args.prometheus-server}}"
          query: |
            sum(rate(
              http_requests_total{
                service="{{args.service-name}}",
                status!~"5.."
              }[5m]
            )) /
            sum(rate(
              http_requests_total{
                service="{{args.service-name}}"
              }[5m]
            ))
```

### Blue/Green Deployment

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-service
spec:
  replicas: 10
  strategy:
    blueGreen:
      # Active service
      activeService: api-service

      # Preview service
      previewService: api-service-preview

      # Auto promotion
      autoPromotionEnabled: false

      # Post-promotion analysis
      postPromotionAnalysis:
        templates:
          - templateName: smoke-tests

      # Rollback window
      scaleDownDelaySeconds: 600  # Keep old version for 10 minutes

  template:
    # ... pod spec
```

## Multi-Environment Strategy

### Environment Promotion

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│   Dev    │  →   │ Staging  │  →   │   Prod   │
│          │      │          │      │          │
│ Auto     │      │ Auto     │      │ Manual   │
│ Deploy   │      │ Deploy   │      │ Approval │
└──────────┘      └──────────┘      └──────────┘
```

**Image Promotion Strategy:**
```bash
#!/bin/bash
# promote-image.sh

ENV=$1
IMAGE_TAG=$2

case "$ENV" in
  staging)
    # Update staging kustomization
    cd overlays/staging
    kustomize edit set image api-service=company/api-service:${IMAGE_TAG}
    ;;

  production)
    # Require approval
    echo "Promoting to production requires approval"
    echo "Creating PR..."
    cd overlays/production
    git checkout -b promote-${IMAGE_TAG}
    kustomize edit set image api-service=company/api-service:${IMAGE_TAG}
    git commit -am "Promote api-service to ${IMAGE_TAG}"
    git push origin promote-${IMAGE_TAG}
    gh pr create --title "Promote api-service to ${IMAGE_TAG}" --body "Production deployment"
    ;;
esac
```

## Best Practices

### 1. Separate App Code and Manifests

```
Repositories:
- api-service (application code)
- k8s-manifests (Kubernetes manifests)

Workflow:
1. CI builds image → company/api-service:abc123
2. CI updates k8s-manifests with new tag
3. GitOps pulls and deploys
```

### 2. Sealed Secrets

```bash
# Encrypt secret
echo -n 'super-secret' | kubectl create secret generic db-password \
  --dry-run=client \
  --from-file=password=/dev/stdin \
  -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# Commit encrypted secret
git add sealed-secret.yaml
git commit -m "Add database password"
```

### 3. Progressive Rollouts

Use canary or blue/green for production, with automated analysis.

### 4. Environment Parity

Keep environments as similar as possible, differ only in scale and data.

### 5. GitOps Notifications

```yaml
# ArgoCD notification
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
data:
  service.slack: |
    token: $slack-token
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-deployed]
  template.app-deployed: |
    message: |
      Application {{.app.metadata.name}} deployed to {{.app.spec.destination.namespace}}
    slack:
      attachments: |
        [{
          "title": "{{.app.metadata.name}}",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "color": "good"
        }]
```

---

**Related Resources:**
- [infrastructure-as-code.md](infrastructure-as-code.md) - IaC patterns
- [developer-platforms.md](developer-platforms.md) - Self-service platforms
- [container-orchestration.md](container-orchestration.md) - Kubernetes
