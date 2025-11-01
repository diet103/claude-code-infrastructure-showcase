# CI/CD Pipelines

Pipeline design, GitHub Actions, GitLab CI, Jenkins, Azure DevOps, and CI/CD best practices.

## Table of Contents

- [Pipeline Design](#pipeline-design)
- [GitHub Actions](#github-actions)
- [GitLab CI](#gitlab-ci)
- [Jenkins](#jenkins)
- [Best Practices](#best-practices)

## Pipeline Design

**Standard Pipeline Stages:**
```
Source → Build → Test → Package → Deploy → Verify
```

**Detailed Flow:**
```yaml
stages:
  checkout:
    - Clone repository
    - Checkout branch
    - Fetch dependencies metadata

  build:
    - Install dependencies
    - Compile code
    - Run linters
    - Static analysis

  test:
    - Unit tests
    - Integration tests
    - Coverage report
    - Security scan

  package:
    - Build artifacts
    - Create container image
    - Scan image
    - Sign artifacts

  deploy:
    - Deploy to staging
    - Run smoke tests
    - Deploy to production (manual approval)

  verify:
    - Health checks
    - Integration tests in prod
    - Monitor metrics
```

## GitHub Actions

**Complete Workflow:**
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build-push:
    needs: test
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      version: ${{ steps.meta.outputs.version }}
      tags: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v3

      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-

      - name: Login to registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build-push
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          kubectl set image deployment/myapp \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ needs.build-push.outputs.version }} \
            --namespace=staging

      - name: Verify deployment
        run: |
          kubectl rollout status deployment/myapp -n staging
          kubectl wait --for=condition=available --timeout=5m deployment/myapp -n staging

  deploy-production:
    needs: build-push
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: |
          kubectl set image deployment/myapp \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ needs.build-push.outputs.version }} \
            --namespace=production

      - name: Verify deployment
        run: kubectl rollout status deployment/myapp -n production

      - name: Create GitHub release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
```

## GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - package
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""

before_script:
  - echo "Pipeline starting"

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour
  cache:
    paths:
      - node_modules/

test:unit:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm test
  coverage: '/Coverage: \d+\.\d+%/'

test:lint:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm run lint

package:
  stage: package
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main
    - develop

deploy:staging:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context $KUBE_CONTEXT
    - kubectl set image deployment/myapp app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -n staging
    - kubectl rollout status deployment/myapp -n staging
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop

deploy:production:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context $KUBE_CONTEXT
    - kubectl set image deployment/myapp app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -n production
    - kubectl rollout status deployment/myapp -n production
  environment:
    name: production
    url: https://example.com
  when: manual
  only:
    - main
    - tags
```

## Jenkins

**Jenkinsfile (Declarative):**
```groovy
pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'registry.example.com'
        IMAGE_NAME = 'myapp'
        KUBECONFIG = credentials('kubeconfig')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                sh 'npm ci'
                sh 'npm run build'
            }
        }

        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'npm test'
                    }
                }
                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
            }
        }

        stage('Package') {
            steps {
                script {
                    docker.build("${DOCKER_REGISTRY}/${IMAGE_NAME}:${env.BUILD_NUMBER}")
                }
            }
        }

        stage('Push') {
            steps {
                script {
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-credentials') {
                        docker.image("${DOCKER_REGISTRY}/${IMAGE_NAME}:${env.BUILD_NUMBER}").push()
                        docker.image("${DOCKER_REGISTRY}/${IMAGE_NAME}:${env.BUILD_NUMBER}").push('latest')
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh """
                    kubectl set image deployment/myapp \
                        app=${DOCKER_REGISTRY}/${IMAGE_NAME}:${env.BUILD_NUMBER} \
                        --namespace=staging
                    kubectl rollout status deployment/myapp -n staging
                """
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                sh """
                    kubectl set image deployment/myapp \
                        app=${DOCKER_REGISTRY}/${IMAGE_NAME}:${env.BUILD_NUMBER} \
                        --namespace=production
                    kubectl rollout status deployment/myapp -n production
                """
            }
        }
    }

    post {
        success {
            slackSend color: 'good', message: "Deployment successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
        failure {
            slackSend color: 'danger', message: "Deployment failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
    }
}
```

## Best Practices

### 1. Fast Pipelines

```yaml
# Run tests in parallel
jobs:
  test:
    strategy:
      matrix:
        node: [18, 20]
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
```

### 2. Caching

```yaml
# Cache dependencies
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 3. Secrets Management

```yaml
# Never hardcode secrets
env:
  API_KEY: ${{ secrets.API_KEY }}
```

### 4. Artifact Management

```yaml
# Upload build artifacts
- uses: actions/upload-artifact@v3
  with:
    name: dist
    path: dist/
```

---

**Related Resources:**
- [build-optimization.md](build-optimization.md)
- [pipeline-security.md](pipeline-security.md)
