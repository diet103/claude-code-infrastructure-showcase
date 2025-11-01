# Azure Patterns

Comprehensive guide to Microsoft Azure covering core services, architectural patterns, Azure Well-Architected Framework, and best practices for building enterprise-grade cloud infrastructure.

## Table of Contents

- [Azure Service Overview](#azure-service-overview)
- [Compute Services](#compute-services)
- [Storage Services](#storage-services)
- [Database Services](#database-services)
- [Networking Services](#networking-services)
- [Container Services](#container-services)
- [Azure Functions](#azure-functions)
- [Azure Well-Architected Framework](#azure-well-architected-framework)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)

## Azure Service Overview

### Service Categories

```
Compute:         Virtual Machines, App Service, Functions, Container Instances
Storage:         Blob Storage, Files, Queue, Table, Disk Storage
Database:        SQL Database, Cosmos DB, Database for PostgreSQL/MySQL
Networking:      Virtual Network, Load Balancer, Application Gateway, Front Door
Security:        Active Directory, Key Vault, Security Center, Sentinel
Monitoring:      Monitor, Application Insights, Log Analytics
DevOps:          DevOps, Pipelines, Repos, Artifacts
Analytics:       Synapse, Data Factory, HDInsight, Databricks
```

## Compute Services

### Virtual Machines

**Example: VM with Availability Set (Terraform):**
```hcl
# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project}-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Availability Set for high availability
resource "azurerm_availability_set" "app" {
  name                         = "avset-app"
  location                     = azurerm_resource_group.main.location
  resource_group_name          = azurerm_resource_group.main.name
  platform_fault_domain_count  = 2
  platform_update_domain_count = 5
  managed                      = true

  tags = {
    Environment = var.environment
  }
}

# Network Interface
resource "azurerm_network_interface" "app" {
  count               = var.vm_count
  name                = "nic-app-${count.index + 1}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.app.id
    private_ip_address_allocation = "Dynamic"
  }
}

# Virtual Machine
resource "azurerm_linux_virtual_machine" "app" {
  count               = var.vm_count
  name                = "vm-app-${count.index + 1}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = "Standard_D2s_v3"
  availability_set_id = azurerm_availability_set.app.id

  admin_username = "azureuser"

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  network_interface_ids = [
    azurerm_network_interface.app[count.index].id,
  ]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 128
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-focal"
    sku       = "20_04-lts-gen2"
    version   = "latest"
  }

  boot_diagnostics {
    storage_account_uri = azurerm_storage_account.diagnostics.primary_blob_endpoint
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = var.environment
    Role        = "application"
  }
}

# Virtual Machine Scale Set (VMSS)
resource "azurerm_linux_virtual_machine_scale_set" "app" {
  name                = "vmss-app"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard_D2s_v3"
  instances           = 3

  admin_username = "azureuser"

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-focal"
    sku       = "20_04-lts-gen2"
    version   = "latest"
  }

  os_disk {
    storage_account_type = "Premium_LRS"
    caching              = "ReadWrite"
  }

  network_interface {
    name    = "nic"
    primary = true

    ip_configuration {
      name      = "internal"
      primary   = true
      subnet_id = azurerm_subnet.app.id

      load_balancer_backend_address_pool_ids = [
        azurerm_lb_backend_address_pool.app.id
      ]
    }
  }

  # Auto-scaling configuration
  automatic_instance_repair {
    enabled      = true
    grace_period = "PT30M"
  }

  upgrade_mode = "Automatic"

  automatic_os_upgrade_policy {
    disable_automatic_rollback  = false
    enable_automatic_os_upgrade = true
  }

  identity {
    type = "SystemAssigned"
  }
}

# Auto-scale settings
resource "azurerm_monitor_autoscale_setting" "app" {
  name                = "autoscale-app"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  target_resource_id  = azurerm_linux_virtual_machine_scale_set.app.id

  profile {
    name = "default"

    capacity {
      default = 3
      minimum = 2
      maximum = 10
    }

    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.app.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 75
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }

    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.app.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 25
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }
  }
}
```

## Storage Services

### Blob Storage

**Example: Storage Account with Lifecycle Management:**
```hcl
resource "azurerm_storage_account" "data" {
  name                     = "st${var.project}${var.environment}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant
  account_kind             = "StorageV2"

  # Security
  min_tls_version                = "TLS1_2"
  enable_https_traffic_only      = true
  allow_nested_items_to_be_public = false

  # Advanced threat protection
  blob_properties {
    versioning_enabled  = true
    change_feed_enabled = true

    delete_retention_policy {
      days = 7
    }

    container_delete_retention_policy {
      days = 7
    }
  }

  # Network rules
  network_rules {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    virtual_network_subnet_ids = [azurerm_subnet.app.id]
    ip_rules                   = var.allowed_ip_addresses
  }

  # Identity for managed access
  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = var.environment
  }
}

# Container (blob)
resource "azurerm_storage_container" "data" {
  name                  = "application-data"
  storage_account_name  = azurerm_storage_account.data.name
  container_access_type = "private"
}

# Lifecycle management
resource "azurerm_storage_management_policy" "data" {
  storage_account_id = azurerm_storage_account.data.id

  rule {
    name    = "move-to-cool-tier"
    enabled = true

    filters {
      prefix_match = ["data/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than = 30
        tier_to_archive_after_days_since_modification_greater_than = 90
        delete_after_days_since_modification_greater_than = 365
      }

      snapshot {
        delete_after_days_since_creation_greater_than = 90
      }

      version {
        delete_after_days_since_creation = 90
      }
    }
  }
}
```

## Database Services

### Azure SQL Database

**Example: SQL Database with Elastic Pool:**
```hcl
# SQL Server
resource "azurerm_mssql_server" "main" {
  name                         = "sql-${var.project}-${var.environment}"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = random_password.sql_admin.result

  minimum_tls_version = "1.2"

  azuread_administrator {
    login_username = var.sql_aad_admin_login
    object_id      = var.sql_aad_admin_object_id
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = var.environment
  }
}

# Elastic Pool for cost optimization
resource "azurerm_mssql_elasticpool" "main" {
  name                = "pool-${var.project}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  server_name         = azurerm_mssql_server.main.name
  max_size_gb         = 500

  sku {
    name     = "StandardPool"
    tier     = "Standard"
    capacity = 100
  }

  per_database_settings {
    min_capacity = 10
    max_capacity = 100
  }
}

# SQL Database
resource "azurerm_mssql_database" "app" {
  name           = "db-app"
  server_id      = azurerm_mssql_server.main.id
  elastic_pool_id = azurerm_mssql_elasticpool.main.id
  collation      = "SQL_Latin1_General_CP1_CI_AS"

  # Backup
  short_term_retention_policy {
    retention_days = 7
  }

  long_term_retention_policy {
    weekly_retention  = "P1W"
    monthly_retention = "P1M"
    yearly_retention  = "P1Y"
    week_of_year      = 1
  }

  # Threat detection
  threat_detection_policy {
    state                      = "Enabled"
    email_account_admins       = "Enabled"
    email_addresses            = ["security@example.com"]
    retention_days             = 30
    storage_account_access_key = azurerm_storage_account.security.primary_access_key
    storage_endpoint           = azurerm_storage_account.security.primary_blob_endpoint
  }

  tags = {
    Environment = var.environment
  }
}

# Firewall rules
resource "azurerm_mssql_firewall_rule" "allow_azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
```

### Cosmos DB

**Example: Cosmos DB with Multi-Region:**
```hcl
resource "azurerm_cosmosdb_account" "main" {
  name                = "cosmos-${var.project}-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  # Multi-region
  geo_location {
    location          = var.primary_region
    failover_priority = 0
  }

  geo_location {
    location          = var.secondary_region
    failover_priority = 1
  }

  # Consistency
  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  # Backup
  backup {
    type                = "Continuous"
    interval_in_minutes = 240
    retention_in_hours  = 8
  }

  # Network
  is_virtual_network_filter_enabled = true
  virtual_network_rule {
    id = azurerm_subnet.app.id
  }

  # Advanced features
  enable_automatic_failover = true
  enable_multiple_write_locations = false

  capabilities {
    name = "EnableServerless"
  }

  tags = {
    Environment = var.environment
  }
}

# SQL API Database
resource "azurerm_cosmosdb_sql_database" "main" {
  name                = "appdb"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  throughput          = 400
}

# Container with partition key
resource "azurerm_cosmosdb_sql_container" "users" {
  name                = "users"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.main.name
  partition_key_path  = "/userId"
  throughput          = 400

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }

  unique_key {
    paths = ["/email"]
  }
}
```

## Container Services

### AKS (Azure Kubernetes Service)

**Example: AKS Cluster with Best Practices:**
```hcl
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-${var.project}-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "${var.project}-${var.environment}"
  kubernetes_version  = "1.28.0"

  # Default node pool
  default_node_pool {
    name                = "system"
    node_count          = 3
    vm_size             = "Standard_D2s_v3"
    type                = "VirtualMachineScaleSets"
    availability_zones  = ["1", "2", "3"]
    enable_auto_scaling = true
    min_count           = 3
    max_count           = 10
    max_pods            = 30

    vnet_subnet_id = azurerm_subnet.aks.id

    upgrade_settings {
      max_surge = "33%"
    }

    node_labels = {
      "nodepool-type" = "system"
      "environment"   = var.environment
    }

    tags = {
      Environment = var.environment
    }
  }

  # Identity
  identity {
    type = "SystemAssigned"
  }

  # Network profile
  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"

    service_cidr   = "10.0.0.0/16"
    dns_service_ip = "10.0.0.10"
  }

  # Add-ons
  azure_policy_enabled = true

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  key_vault_secrets_provider {
    secret_rotation_enabled = true
  }

  # RBAC
  role_based_access_control_enabled = true

  azure_active_directory_role_based_access_control {
    managed                = true
    admin_group_object_ids = [var.aks_admin_group_object_id]
    azure_rbac_enabled     = true
  }

  # Monitoring
  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [0, 1, 2]
    }
  }

  tags = {
    Environment = var.environment
  }
}

# Additional node pool for workloads
resource "azurerm_kubernetes_cluster_node_pool" "workload" {
  name                  = "workload"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_D4s_v3"
  node_count            = 3
  enable_auto_scaling   = true
  min_count             = 2
  max_count             = 20
  availability_zones    = ["1", "2", "3"]

  vnet_subnet_id = azurerm_subnet.aks.id

  node_labels = {
    "nodepool-type" = "workload"
  }

  node_taints = [
    "workload=true:NoSchedule"
  ]

  tags = {
    Environment = var.environment
  }
}
```

## Azure Well-Architected Framework

### Five Pillars

**1. Cost Optimization:**
- Use Reserved Instances for predictable workloads
- Implement auto-scaling
- Choose right-sized VMs
- Use Azure Cost Management

**2. Operational Excellence:**
- Infrastructure as Code (ARM, Bicep, Terraform)
- Azure DevOps pipelines
- Monitoring with Azure Monitor
- Automation with Azure Automation

**3. Performance Efficiency:**
- CDN for global content delivery
- Caching with Azure Cache for Redis
- Managed services (App Service, SQL Database)
- Scale sets for horizontal scaling

**4. Reliability:**
- Availability Zones
- Geo-redundant storage
- Azure Site Recovery
- Load balancing

**5. Security:**
- Azure AD for identity
- Key Vault for secrets
- Network Security Groups
- Azure Security Center

## Common Patterns

### Hub-and-Spoke Network Topology

```
                  ┌─────────────────┐
                  │   Hub VNet      │
                  │                 │
                  │  - Firewall     │
                  │  - VPN Gateway  │
                  │  - Shared Svcs  │
                  └────────┬────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
         │ Spoke 1 │  │ Spoke 2 │  │ Spoke 3 │
         │  Prod   │  │  Dev    │  │  Test   │
         └─────────┘  └─────────┘  └─────────┘
```

## Best Practices

1. **Use Managed Identities** for Azure resource authentication
2. **Enable Azure AD** for RBAC
3. **Implement Network Security Groups** for traffic control
4. **Use Key Vault** for secrets and certificates
5. **Enable diagnostics** and logging
6. **Tag resources** for cost tracking
7. **Use Availability Zones** for high availability
8. **Implement backup** and disaster recovery
9. **Follow least privilege** principle
10. **Use Azure Policy** for governance

## Anti-Patterns

❌ Using storage account keys instead of Managed Identity
❌ Not using Availability Zones for critical workloads
❌ Ignoring Azure Security Center recommendations
❌ No resource tagging
❌ Over-provisioning without auto-scaling
❌ Not using ARM templates or Terraform
❌ Exposing databases publicly
❌ No monitoring or alerts
❌ Not implementing backup strategy
❌ Using outdated VM sizes
