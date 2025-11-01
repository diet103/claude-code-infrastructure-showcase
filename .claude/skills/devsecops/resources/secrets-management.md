# Secrets Management

Comprehensive guide to managing secrets, credentials, and sensitive data using HashiCorp Vault, Sealed Secrets, External Secrets Operator, AWS Secrets Manager, and secret rotation strategies.

## Table of Contents

- [Overview](#overview)
- [HashiCorp Vault](#hashicorp-vault)
- [Sealed Secrets](#sealed-secrets)
- [External Secrets Operator](#external-secrets-operator)
- [Cloud Provider Solutions](#cloud-provider-solutions)
- [Secret Rotation](#secret-rotation)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## Overview

**Secrets Management Lifecycle:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Generate   │────▶│    Store     │────▶│   Rotate     │
│   (Create)   │     │  (Encrypt)   │     │  (Update)    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐     ┌──────────────┐
                     │    Access    │────▶│    Audit     │
                     │  (Control)   │     │    (Log)     │
                     └──────────────┘     └──────────────┘
```

**Never:**
- ❌ Commit secrets to Git
- ❌ Hardcode in source code
- ❌ Store in ConfigMaps
- ❌ Pass in environment variables (visible in process list)
- ❌ Store unencrypted

**Always:**
- ✅ Use dedicated secrets management
- ✅ Encrypt at rest and in transit
- ✅ Implement access controls
- ✅ Rotate regularly
- ✅ Audit access

## HashiCorp Vault

### Installation

**Docker:**
```bash
docker run -d --name=vault \
  --cap-add=IPC_LOCK \
  -p 8200:8200 \
  vault server -dev
```

**Kubernetes (Helm):**
```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

helm install vault hashicorp/vault \
  --namespace vault --create-namespace \
  --set server.ha.enabled=true \
  --set server.ha.replicas=3
```

### Basic Operations

**Initialize and Unseal:**
```bash
# Initialize Vault
vault operator init -key-shares=5 -key-threshold=3

# Save unseal keys and root token securely!

# Unseal (requires 3 keys)
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>

# Login
vault login <root_token>
```

**Storing Secrets:**
```bash
# Enable KV secrets engine
vault secrets enable -path=secret kv-v2

# Write secret
vault kv put secret/myapp/config \
  api_key=abc123 \
  db_password=secret123

# Read secret
vault kv get secret/myapp/config

# Get specific field
vault kv get -field=api_key secret/myapp/config

# List secrets
vault kv list secret/myapp
```

### Access Control (Policies)

```hcl
# policies/app-policy.hcl
path "secret/data/myapp/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/myapp/*" {
  capabilities = ["list"]
}

path "database/creds/myapp-role" {
  capabilities = ["read"]
}
```

```bash
# Create policy
vault policy write app-policy policies/app-policy.hcl

# Create token with policy
vault token create -policy=app-policy
```

### Kubernetes Integration

**Enable Kubernetes Auth:**
```bash
vault auth enable kubernetes

vault write auth/kubernetes/config \
  kubernetes_host="https://$KUBERNETES_HOST:443" \
  token_reviewer_jwt="$SA_JWT_TOKEN" \
  kubernetes_ca_cert=@ca.crt
```

**Create Role:**
```bash
vault write auth/kubernetes/role/myapp \
  bound_service_account_names=myapp \
  bound_service_account_namespaces=production \
  policies=app-policy \
  ttl=24h
```

**Injector Pattern:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "myapp"
    vault.hashicorp.com/agent-inject-secret-config: "secret/data/myapp/config"
    vault.hashicorp.com/agent-inject-template-config: |
      {{- with secret "secret/data/myapp/config" -}}
      export API_KEY="{{ .Data.data.api_key }}"
      export DB_PASSWORD="{{ .Data.data.db_password }}"
      {{- end }}
spec:
  serviceAccountName: myapp
  containers:
  - name: app
    image: myapp:latest
    command:
      - sh
      - -c
      - source /vault/secrets/config && ./start.sh
```

### Dynamic Secrets

**Database Credentials:**
```bash
# Enable database engine
vault secrets enable database

# Configure PostgreSQL
vault write database/config/postgresql \
  plugin_name=postgresql-database-plugin \
  allowed_roles="myapp-role" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/mydb" \
  username="vault" \
  password="vaultpass"

# Create role
vault write database/roles/myapp-role \
  db_name=postgresql \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Generate credentials
vault read database/creds/myapp-role
# Returns: username, password (temporary, auto-rotated)
```

**AWS Credentials:**
```bash
vault secrets enable aws

vault write aws/config/root \
  access_key=$AWS_ACCESS_KEY \
  secret_key=$AWS_SECRET_KEY \
  region=us-east-1

vault write aws/roles/myapp-role \
  credential_type=iam_user \
  policy_document=-<<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::mybucket/*"]
    }
  ]
}
EOF

# Generate temporary AWS credentials
vault read aws/creds/myapp-role
```

## Sealed Secrets

### Installation

```bash
# Install controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Install kubeseal CLI
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-linux-amd64
chmod +x kubeseal-linux-amd64
sudo mv kubeseal-linux-amd64 /usr/local/bin/kubeseal
```

### Usage

**Create Secret:**
```bash
# Create regular secret (don't apply!)
kubectl create secret generic mysecret \
  --from-literal=api-key=abc123 \
  --from-literal=db-password=secret123 \
  --dry-run=client -o yaml > secret.yaml

# Seal it
kubeseal -f secret.yaml -w sealed-secret.yaml

# Now safe to commit sealed-secret.yaml
git add sealed-secret.yaml
git commit -m "Add sealed secret"
```

**Sealed Secret Manifest:**
```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: mysecret
  namespace: production
spec:
  encryptedData:
    api-key: AgBP8F3F5...encrypted...
    db-password: AgCY9j2K...encrypted...
  template:
    metadata:
      name: mysecret
      namespace: production
```

**Use in Pod:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: API_KEY
      valueFrom:
        secretKeyRef:
          name: mysecret  # Created from SealedSecret
          key: api-key
```

**Scope Options:**
```bash
# Cluster-wide (any namespace)
kubeseal --scope cluster-wide -f secret.yaml

# Namespace-wide (any name in namespace)
kubeseal --scope namespace-wide -f secret.yaml

# Strict (specific name and namespace)
kubeseal --scope strict -f secret.yaml
```

## External Secrets Operator

### Installation

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace
```

### AWS Secrets Manager Backend

**SecretStore:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
```

**ExternalSecret:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore

  target:
    name: app-secrets
    creationPolicy: Owner

  data:
  - secretKey: api-key
    remoteRef:
      key: prod/myapp/api-key

  - secretKey: db-password
    remoteRef:
      key: prod/myapp/database
      property: password
```

### Vault Backend

**SecretStore:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "http://vault.vault:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "myapp"
          serviceAccountRef:
            name: myapp
```

**ExternalSecret:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vault-secrets
  namespace: production
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore

  target:
    name: vault-secrets

  dataFrom:
  - extract:
      key: myapp/config
```

### GCP Secret Manager

**SecretStore:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcp-secret-manager
spec:
  provider:
    gcpsm:
      projectID: "my-project"
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: my-cluster
          serviceAccountRef:
            name: external-secrets-sa
```

## Cloud Provider Solutions

### AWS Secrets Manager

**Create Secret:**
```bash
aws secretsmanager create-secret \
  --name prod/myapp/api-key \
  --description "API key for myapp" \
  --secret-string "abc123xyz"

# Store JSON
aws secretsmanager create-secret \
  --name prod/myapp/database \
  --secret-string '{"username":"dbuser","password":"dbpass123"}'
```

**Retrieve Secret:**
```bash
# Get full secret
aws secretsmanager get-secret-value \
  --secret-id prod/myapp/api-key \
  --query SecretString --output text

# Parse JSON secret
aws secretsmanager get-secret-value \
  --secret-id prod/myapp/database \
  --query SecretString --output text | jq -r .password
```

**Application Code:**
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretName: string): Promise<any> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  return JSON.parse(response.SecretString!);
}

// Usage
const dbConfig = await getSecret('prod/myapp/database');
console.log(dbConfig.password);
```

### Google Cloud Secret Manager

**Create Secret:**
```bash
echo -n "abc123xyz" | gcloud secrets create myapp-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Add version
echo -n "new-secret-value" | gcloud secrets versions add myapp-api-key \
  --data-file=-
```

**Access Secret:**
```bash
gcloud secrets versions access latest \
  --secret="myapp-api-key"
```

**Application Code:**
```python
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()
name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
response = client.access_secret_version(request={"name": name})
secret_value = response.payload.data.decode("UTF-8")
```

### Azure Key Vault

**Create Secret:**
```bash
az keyvault secret set \
  --vault-name mykeyvault \
  --name myapp-api-key \
  --value "abc123xyz"
```

**Retrieve Secret:**
```bash
az keyvault secret show \
  --vault-name mykeyvault \
  --name myapp-api-key \
  --query value -o tsv
```

**Application Code:**
```csharp
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

var client = new SecretClient(
    new Uri("https://mykeyvault.vault.azure.net/"),
    new DefaultAzureCredential()
);

KeyVaultSecret secret = await client.GetSecretAsync("myapp-api-key");
string value = secret.Value;
```

## Secret Rotation

### Automated Rotation Strategy

**Vault Automatic Rotation:**
```hcl
# Database credentials rotate automatically
vault write database/config/postgresql \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/" \
  rotation_period="24h"
```

**AWS Secrets Manager Rotation:**
```bash
aws secretsmanager rotate-secret \
  --secret-id prod/myapp/database \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789:function:SecretsManagerRotation \
  --rotation-rules AutomaticallyAfterDays=30
```

**Lambda Rotation Function:**
```python
import boto3
import json

def lambda_handler(event, context):
    secret_id = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']

    client = boto3.client('secretsmanager')

    if step == "createSecret":
        # Generate new password
        new_password = generate_password()
        client.put_secret_value(
            SecretId=secret_id,
            ClientRequestToken=token,
            SecretString=json.dumps({"password": new_password}),
            VersionStages=['AWSPENDING']
        )

    elif step == "setSecret":
        # Update database with new password
        update_database_password(new_password)

    elif step == "testSecret":
        # Test new credentials
        test_database_connection(new_password)

    elif step == "finishSecret":
        # Mark new version as current
        client.update_secret_version_stage(
            SecretId=secret_id,
            VersionStage='AWSCURRENT',
            MoveToVersionId=token
        )
```

### Manual Rotation Process

```bash
# 1. Generate new secret
NEW_API_KEY=$(openssl rand -hex 32)

# 2. Update secret
vault kv put secret/myapp/config api_key=$NEW_API_KEY

# 3. Restart applications to pick up new secret
kubectl rollout restart deployment/myapp

# 4. Verify new secret is working
kubectl logs -l app=myapp | grep "API connection successful"

# 5. Update external systems if needed
curl -X POST https://api.provider.com/keys \
  -H "Authorization: Bearer $OLD_KEY" \
  -d "new_key=$NEW_API_KEY"
```

### Zero-Downtime Rotation

```yaml
# Support both old and new secrets during rotation
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    env:
    - name: API_KEY_PRIMARY
      valueFrom:
        secretKeyRef:
          name: app-secrets-new
          key: api-key
    - name: API_KEY_FALLBACK
      valueFrom:
        secretKeyRef:
          name: app-secrets-old
          key: api-key
```

```typescript
// Application tries primary, falls back to old
const apiKey = process.env.API_KEY_PRIMARY || process.env.API_KEY_FALLBACK;
```

## Best Practices

### 1. Never Commit Secrets

```bash
# Pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
if git diff --cached | grep -iE '(password|api_key|secret|token).*=.*[a-zA-Z0-9]{16,}'; then
  echo "ERROR: Possible secret detected!"
  exit 1
fi
EOF
chmod +x .git/hooks/pre-commit
```

### 2. Encrypt at Rest

All secret backends should encrypt data.

### 3. Rotate Regularly

```
Critical: Every 30 days
High: Every 90 days
Medium: Every 180 days
```

### 4. Least Privilege Access

```hcl
# Minimal permissions
path "secret/data/myapp/readonly/*" {
  capabilities = ["read"]
}
```

### 5. Audit Access

```bash
# Enable audit logging
vault audit enable file file_path=/var/log/vault-audit.log
```

### 6. Use Short-Lived Credentials

```bash
# TTL example
vault write database/creds/myapp-role ttl=1h
```

### 7. Separate Secrets by Environment

```
secret/
  dev/
    myapp/
  staging/
    myapp/
  prod/
    myapp/
```

### 8. Emergency Break-Glass Process

```
1. Document emergency access procedure
2. Store root credentials securely (offline)
3. Require multiple approvers for access
4. Audit all emergency access
5. Rotate secrets after emergency access
```

## Anti-Patterns

❌ **Secrets in Git** - Exposed in history forever

❌ **Secrets in ConfigMaps** - Not encrypted

❌ **Hardcoded secrets** - Can't rotate

❌ **Secrets in environment variables** - Visible in process list

❌ **Shared secrets** - Can't track who accessed

❌ **No rotation** - Compromised secrets stay valid

❌ **Overly permissive access** - Least privilege violation

❌ **No audit trail** - Can't detect breaches

❌ **Secrets in logs** - Exposed to log aggregation

❌ **Long-lived credentials** - Higher risk if compromised

---

**Related Resources:**
- [encryption.md](encryption.md) - Encryption patterns
- [policy-enforcement.md](policy-enforcement.md) - Access control policies
- [compliance-automation.md](compliance-automation.md) - Compliance requirements
