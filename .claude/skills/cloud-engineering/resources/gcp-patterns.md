# GCP Patterns

Comprehensive guide to Google Cloud Platform (GCP) covering core services, architectural patterns, best practices for building scalable, data-driven cloud infrastructure leveraging Google's innovation.

## Table of Contents

- [GCP Service Overview](#gcp-service-overview)
- [Compute Services](#compute-services)
- [Storage Services](#storage-services)
- [Database Services](#database-services)
- [Container Services](#container-services)
- [Serverless Services](#serverless-services)
- [Networking Services](#networking-services)
- [Data Analytics](#data-analytics)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)

## GCP Service Overview

### Service Categories

```
Compute:         Compute Engine, Cloud Run, Cloud Functions, App Engine
Storage:         Cloud Storage, Persistent Disk, Filestore
Database:        Cloud SQL, Firestore, Bigtable, Spanner
Networking:      VPC, Cloud Load Balancing, Cloud CDN, Cloud DNS
Containers:      GKE (Kubernetes Engine), Cloud Run, Artifact Registry
Security:        IAM, Cloud KMS, Secret Manager, Security Command Center
Monitoring:      Cloud Monitoring, Cloud Logging, Cloud Trace
Data:            BigQuery, Dataflow, Pub/Sub, Dataproc
AI/ML:           Vertex AI, AutoML, AI Platform
```

## Compute Services

### Compute Engine (VMs)

**Example: Instance Template and Managed Instance Group:**
```hcl
# Instance template for consistent VM configuration
resource "google_compute_instance_template" "app" {
  name_prefix  = "app-template-"
  machine_type = "e2-standard-2"
  region       = var.region

  disk {
    source_image = "debian-cloud/debian-11"
    auto_delete  = true
    boot         = true
    disk_size_gb = 50
    disk_type    = "pd-ssd"
  }

  network_interface {
    network    = google_compute_network.vpc.id
    subnetwork = google_compute_subnetwork.private.id

    # No external IP (NAT gateway for egress)
    access_config {
      # Ephemeral external IP
    }
  }

  # Startup script
  metadata_startup_script = templatefile("${path.module}/startup.sh", {
    region      = var.region
    environment = var.environment
  })

  # Service account with minimal permissions
  service_account {
    email  = google_service_account.app.email
    scopes = ["cloud-platform"]
  }

  # Shielded VM for security
  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Managed Instance Group with auto-scaling
resource "google_compute_region_instance_group_manager" "app" {
  name   = "app-mig"
  region = var.region

  base_instance_name = "app"
  target_size        = 3

  version {
    instance_template = google_compute_instance_template.app.id
  }

  # Auto-healing
  auto_healing_policies {
    health_check      = google_compute_health_check.app.id
    initial_delay_sec = 300
  }

  # Update policy
  update_policy {
    type                         = "PROACTIVE"
    minimal_action               = "REPLACE"
    max_surge_fixed              = 3
    max_unavailable_fixed        = 0
    instance_redistribution_type = "PROACTIVE"
  }

  named_port {
    name = "http"
    port = 8080
  }
}

# Auto-scaler
resource "google_compute_region_autoscaler" "app" {
  name   = "app-autoscaler"
  region = var.region
  target = google_compute_region_instance_group_manager.app.id

  autoscaling_policy {
    max_replicas    = 10
    min_replicas    = 2
    cooldown_period = 60

    cpu_utilization {
      target = 0.7
    }

    metric {
      name   = "pubsub.googleapis.com/subscription/num_undelivered_messages"
      target = 100
      type   = "GAUGE"
    }
  }
}

# Health check
resource "google_compute_health_check" "app" {
  name                = "app-health-check"
  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    port         = 8080
    request_path = "/health"
  }
}
```

## Storage Services

### Cloud Storage (Object Storage)

**Example: Cloud Storage Bucket with Lifecycle:**
```hcl
resource "google_storage_bucket" "data" {
  name          = "${var.project_id}-data-${var.environment}"
  location      = var.region
  storage_class = "STANDARD"

  # Versioning for data protection
  versioning {
    enabled = true
  }

  # Encryption
  encryption {
    default_kms_key_name = google_kms_crypto_key.storage.id
  }

  # Uniform bucket-level access (recommended)
  uniform_bucket_level_access = true

  # Lifecycle rules
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age                   = 365
      with_state            = "ANY"
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 3
    }
    action {
      type = "Delete"
    }
  }

  # CORS for web applications
  cors {
    origin          = ["https://example.com"]
    method          = ["GET", "HEAD", "PUT", "POST"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# IAM binding for service account
resource "google_storage_bucket_iam_member" "app_reader" {
  bucket = google_storage_bucket.data.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.app.email}"
}
```

## Database Services

### Cloud SQL (Managed PostgreSQL)

**Example: Cloud SQL with High Availability:**
```hcl
resource "google_sql_database_instance" "postgres" {
  name             = "postgres-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = "db-custom-2-7680"
    availability_type = "REGIONAL"  # High availability
    disk_type         = "PD_SSD"
    disk_size         = 100
    disk_autoresize   = true

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    # Maintenance window
    maintenance_window {
      day          = 7  # Sunday
      hour         = 4
      update_track = "stable"
    }

    # IP configuration
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = true

      # No public IP
      authorized_networks {
        name  = "office"
        value = var.office_cidr
      }
    }

    # Insights
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }
  }

  # Deletion protection for production
  deletion_protection = var.environment == "production" ? true : false
}

# Read replica for scaling
resource "google_sql_database_instance" "postgres_replica" {
  count = var.environment == "production" ? 1 : 0

  name                 = "postgres-${var.environment}-replica"
  master_instance_name = google_sql_database_instance.postgres.name
  region               = var.replica_region
  database_version     = "POSTGRES_15"

  replica_configuration {
    failover_target = false
  }

  settings {
    tier              = "db-custom-2-7680"
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }
  }
}

# Database
resource "google_sql_database" "app" {
  name     = "appdb"
  instance = google_sql_database_instance.postgres.name
}

# Database user
resource "google_sql_user" "app" {
  name     = "appuser"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}
```

### Cloud Spanner (Globally Distributed Database)

**Example: Cloud Spanner for Global Applications:**
```hcl
resource "google_spanner_instance" "main" {
  name             = "spanner-${var.environment}"
  config           = "regional-${var.region}"
  display_name     = "Main Spanner Instance"
  processing_units = 100  # Or num_nodes = 1

  labels = {
    environment = var.environment
  }
}

resource "google_spanner_database" "app" {
  instance = google_spanner_instance.main.name
  name     = "appdb"

  deletion_protection = var.environment == "production" ? true : false

  ddl = [
    "CREATE TABLE Users (UserId STRING(36) NOT NULL, Email STRING(255), CreatedAt TIMESTAMP, ) PRIMARY KEY (UserId)",
    "CREATE INDEX UsersByEmail ON Users(Email)",
  ]
}
```

## Container Services

### GKE (Google Kubernetes Engine)

**Example: GKE Autopilot Cluster:**
```hcl
# GKE Autopilot - Google-managed Kubernetes
resource "google_container_cluster" "autopilot" {
  name     = "gke-${var.environment}-autopilot"
  location = var.region

  # Autopilot mode
  enable_autopilot = true

  # Network configuration
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.gke.name

  # IP allocation policy
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Security
  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  # Private cluster
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Logging and monitoring
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]

    managed_prometheus {
      enabled = true
    }
  }

  # Release channel
  release_channel {
    channel = "REGULAR"
  }

  # Addons
  addons_config {
    http_load_balancing {
      disabled = false
    }

    horizontal_pod_autoscaling {
      disabled = false
    }

    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
  }
}

# Standard GKE cluster with node pools
resource "google_container_cluster" "standard" {
  name     = "gke-${var.environment}"
  location = var.region

  # Remove default node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.gke.name

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Similar configuration as autopilot...
}

# Node pool
resource "google_container_node_pool" "primary" {
  name       = "primary-pool"
  location   = var.region
  cluster    = google_container_cluster.standard.name
  node_count = 1

  autoscaling {
    min_node_count = 1
    max_node_count = 10
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    preemptible  = false
    machine_type = "e2-medium"

    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      environment = var.environment
    }

    # Shielded nodes
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}
```

## Serverless Services

### Cloud Run

**Example: Cloud Run Service:**
```hcl
resource "google_cloud_run_service" "api" {
  name     = "api-service"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/api:latest"

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }

        env {
          name  = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_url.secret_id
              key  = "latest"
            }
          }
        }

        ports {
          container_port = 8080
        }
      }

      service_account_name = google_service_account.cloud_run.email

      # Autoscaling
      container_concurrency = 80
      timeout_seconds       = 300
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "1"
        "autoscaling.knative.dev/maxScale" = "100"
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.name
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# IAM for public access
resource "google_cloud_run_service_iam_member" "public" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

### Cloud Functions

**Example: Cloud Function with Pub/Sub Trigger:**
```hcl
# Storage bucket for function code
resource "google_storage_bucket" "functions" {
  name     = "${var.project_id}-functions"
  location = var.region
}

resource "google_storage_bucket_object" "function_code" {
  name   = "function-${data.archive_file.function.output_md5}.zip"
  bucket = google_storage_bucket.functions.name
  source = data.archive_file.function.output_path
}

# Cloud Function
resource "google_cloudfunctions_function" "processor" {
  name        = "event-processor"
  runtime     = "nodejs18"
  region      = var.region

  available_memory_mb   = 256
  source_archive_bucket = google_storage_bucket.functions.name
  source_archive_object = google_storage_bucket_object.function_code.name
  entry_point          = "processEvent"

  event_trigger {
    event_type = "google.pubsub.topic.publish"
    resource   = google_pubsub_topic.events.name
  }

  environment_variables = {
    PROJECT_ID = var.project_id
  }

  service_account_email = google_service_account.functions.email

  # VPC connector for private resources
  vpc_connector = google_vpc_access_connector.connector.name

  max_instances = 100
  timeout       = 60
}
```

## Data Analytics

### BigQuery

**Example: BigQuery Dataset and Table:**
```hcl
resource "google_bigquery_dataset" "analytics" {
  dataset_id  = "analytics_${var.environment}"
  location    = var.region
  description = "Analytics data warehouse"

  default_table_expiration_ms = 3600000  # 1 hour default

  access {
    role          = "OWNER"
    user_by_email = google_service_account.bigquery.email
  }

  access {
    role          = "READER"
    special_group = "projectReaders"
  }

  labels = {
    environment = var.environment
  }
}

resource "google_bigquery_table" "events" {
  dataset_id = google_bigquery_dataset.analytics.dataset_id
  table_id   = "events"

  # Partitioning by date
  time_partitioning {
    type  = "DAY"
    field = "event_timestamp"
  }

  # Clustering for query optimization
  clustering = ["user_id", "event_type"]

  schema = jsonencode([
    {
      name = "event_id"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "user_id"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "event_type"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "event_timestamp"
      type = "TIMESTAMP"
      mode = "REQUIRED"
    },
    {
      name = "properties"
      type = "JSON"
      mode = "NULLABLE"
    }
  ])
}
```

## Common Patterns

### Multi-Region Architecture

```
Global Load Balancer (Cloud Load Balancing)
           │
    ┌──────┼──────┐
    │             │
Region 1      Region 2
  │               │
GKE + CloudSQL  GKE + CloudSQL
  │               │
  └───────┬───────┘
          │
    Cloud Spanner
   (Global Database)
```

## Best Practices

1. **Use Service Accounts** instead of user credentials
2. **Enable VPC Service Controls** for data protection
3. **Implement Organization Policies** for governance
4. **Use Cloud KMS** for encryption key management
5. **Enable Cloud Audit Logs** for compliance
6. **Tag resources** with labels for cost tracking
7. **Use GKE Autopilot** for managed Kubernetes
8. **Leverage Cloud Run** for serverless containers
9. **Use BigQuery** for analytics workloads
10. **Implement least privilege** IAM policies

## Anti-Patterns

❌ Using user credentials instead of service accounts
❌ Not using VPC for network isolation
❌ Ignoring Cloud Security Command Center recommendations
❌ No resource labeling
❌ Over-provisioning Compute Engine instances
❌ Not using managed services
❌ Public IP addresses on instances
❌ No monitoring or logging
❌ Manual deployments
❌ Ignoring cost optimization
