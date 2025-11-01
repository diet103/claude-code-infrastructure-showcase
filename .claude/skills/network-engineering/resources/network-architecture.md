# Network Architecture

Comprehensive guide to network architecture covering topologies, design patterns, network segmentation, capacity planning, and high availability for building robust network infrastructure.

## Table of Contents

- [Network Topologies](#network-topologies)
- [Design Patterns](#design-patterns)
- [Network Segmentation](#network-segmentation)
- [IP Address Planning](#ip-address-planning)
- [High Availability](#high-availability)
- [Capacity Planning](#capacity-planning)
- [Cloud Network Architecture](#cloud-network-architecture)
- [Best Practices](#best-practices)

## Network Topologies

### Hub-and-Spoke

**Characteristics:**
- Central hub connects to all spokes
- All inter-spoke traffic goes through hub
- Simple management and routing
- Single point of failure at hub

**Use Cases:**
- Branch office connectivity
- Multi-region cloud architectures
- Centralized services (firewall, VPN)

**Example Architecture:**
```
AWS Transit Gateway (Hub)
├── VPC A (us-east-1) - Production
├── VPC B (us-west-2) - DR Site
├── VPC C (eu-west-1) - European Region
└── On-Premises (VPN)

All traffic routes through Transit Gateway
```

**Terraform Example:**
```hcl
# Transit Gateway (Hub)
resource "aws_ec2_transit_gateway" "main" {
  description = "Main Transit Gateway"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  tags = {
    Name = "main-tgw"
  }
}

# VPC Attachment (Spoke)
resource "aws_ec2_transit_gateway_vpc_attachment" "vpc_a" {
  subnet_ids         = var.subnet_ids
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id            = var.vpc_id

  tags = {
    Name = "vpc-a-attachment"
  }
}

# Route to Transit Gateway
resource "aws_route" "to_tgw" {
  route_table_id         = var.route_table_id
  destination_cidr_block = "10.0.0.0/8"
  transit_gateway_id     = aws_ec2_transit_gateway.main.id
}
```

### Full Mesh

**Characteristics:**
- Every node connects to every other node
- No single point of failure
- Maximum redundancy
- Complex to manage (N*(N-1)/2 connections)

**Use Cases:**
- High-availability clusters
- Low-latency requirements
- Small number of nodes (< 10)

**Example:**
```
VPC Peering Mesh (4 VPCs)
VPC A ↔ VPC B
VPC A ↔ VPC C
VPC A ↔ VPC D
VPC B ↔ VPC C
VPC B ↔ VPC D
VPC C ↔ VPC D

Total: 6 peering connections
```

### Partial Mesh

**Characteristics:**
- Balance between hub-and-spoke and full mesh
- Critical paths have redundancy
- Less complex than full mesh

**Use Cases:**
- Regional network architecture
- Hybrid cloud connectivity
- Service provider networks

### Three-Tier Network

**Characteristics:**
```
┌───────────────────────────────────┐
│     Core Layer (Backbone)         │
│  - High-speed switching           │
│  - Minimal processing             │
└──────────┬────────────────────────┘
           │
┌──────────▼────────────────────────┐
│   Distribution Layer               │
│  - Routing between VLANs          │
│  - Policy enforcement             │
│  - Aggregation                    │
└──────────┬────────────────────────┘
           │
┌──────────▼────────────────────────┐
│     Access Layer                   │
│  - End device connectivity        │
│  - Port security                  │
│  - QoS marking                    │
└───────────────────────────────────┘
```

**Use Cases:**
- Enterprise campus networks
- Data center networks
- Large-scale deployments

## Design Patterns

### Multi-Region Architecture

**Active-Active Pattern:**
```
┌──────────────┐           ┌──────────────┐
│  us-east-1   │           │  us-west-2   │
│              │           │              │
│  ┌────────┐  │           │  ┌────────┐  │
│  │  App   │  │ ◄────────►│  │  App   │  │
│  └────────┘  │           │  └────────┘  │
│  ┌────────┐  │           │  ┌────────┐  │
│  │   DB   │  │ ◄────────►│  │   DB   │  │
│  │(Primary)│  │   Sync    │  │(Replica)│  │
│  └────────┘  │           │  └────────┘  │
└──────────────┘           └──────────────┘
        ▲                         ▲
        │                         │
    Route 53 Geolocation Routing
```

**Active-Passive Pattern:**
```
Primary Region (Active)     DR Region (Passive)
┌──────────────┐           ┌──────────────┐
│  us-east-1   │           │  us-west-2   │
│  ✓ Serving   │           │  ⌛ Standby  │
│  ✓ Full Load │           │  ✗ No Load   │
└──────────────┘           └──────────────┘

Failover triggered by health checks
```

### Hybrid Cloud Architecture

**Pattern: On-Premises + Cloud:**
```
┌────────────────────────────────────┐
│       On-Premises (10.0.0.0/8)     │
│  ┌──────────┐      ┌──────────┐   │
│  │ App Tier │      │ Database │   │
│  └──────────┘      └──────────┘   │
└────────┬───────────────────────────┘
         │
    VPN / Direct Connect
         │
┌────────▼───────────────────────────┐
│     AWS VPC (172.16.0.0/16)        │
│  ┌──────────┐      ┌──────────┐   │
│  │  Backup  │      │Analytics │   │
│  └──────────┘      └──────────┘   │
└────────────────────────────────────┘
```

### Microservices Network Pattern

**Service Mesh Architecture:**
```
┌─────────────────────────────────────────┐
│           Service Mesh (Istio)          │
│  ┌──────┐    ┌──────┐    ┌──────┐      │
│  │Sidecar│   │Sidecar│   │Sidecar│     │
│  │Envoy │   │Envoy │   │Envoy │      │
│  └───┬──┘    └───┬──┘    └───┬──┘      │
│      │           │           │          │
│  ┌───▼──┐    ┌───▼──┐    ┌───▼──┐      │
│  │Service│   │Service│   │Service│     │
│  │  A   │   │  B   │   │  C   │      │
│  └──────┘    └──────┘    └──────┘      │
└─────────────────────────────────────────┘

Features:
- mTLS encryption
- Traffic management
- Observability
- Circuit breaking
```

## Network Segmentation

### Security Zones

**DMZ Architecture:**
```
Internet
    │
┌───▼────────────────────────────┐
│    DMZ (Public Subnet)         │
│  - Web Servers                 │
│  - Load Balancers             │
│  - Bastion Hosts              │
└───┬────────────────────────────┘
    │ Firewall
┌───▼────────────────────────────┐
│  Application Zone (Private)    │
│  - App Servers                │
│  - API Gateways               │
│  - Internal Services          │
└───┬────────────────────────────┘
    │ Firewall
┌───▼────────────────────────────┐
│  Data Zone (Isolated)          │
│  - Databases                  │
│  - Storage                    │
│  - Sensitive Data             │
└────────────────────────────────┘
```

### VLANs

**VLAN Segmentation:**
```
VLAN 10: Management (10.1.10.0/24)
  - Network devices
  - Monitoring systems

VLAN 20: Servers (10.1.20.0/24)
  - Production servers
  - Application tier

VLAN 30: Databases (10.1.30.0/24)
  - Database servers
  - Storage systems

VLAN 40: Users (10.1.40.0/24)
  - Employee workstations
  - BYOD devices

VLAN 50: Guest (10.1.50.0/24)
  - Visitor access
  - Isolated from internal
```

### Kubernetes Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow only from app tier
    - from:
      - podSelector:
          matchLabels:
            tier: app
      ports:
        - protocol: TCP
          port: 5432
  egress:
    # Deny all egress (database shouldn't initiate connections)
    - to: []
```

## IP Address Planning

### CIDR Allocation

**AWS VPC Example:**
```
Organization: 10.0.0.0/8

Region us-east-1: 10.0.0.0/16
├── Prod VPC:     10.0.0.0/18  (16,384 IPs)
│   ├── Public:   10.0.0.0/20  (4,096 IPs)
│   │   ├── AZ-A: 10.0.0.0/22  (1,024 IPs)
│   │   └── AZ-B: 10.0.4.0/22  (1,024 IPs)
│   └── Private:  10.0.16.0/20 (4,096 IPs)
│       ├── AZ-A: 10.0.16.0/22 (1,024 IPs)
│       └── AZ-B: 10.0.20.0/22 (1,024 IPs)
│
└── Dev VPC:      10.0.64.0/18 (16,384 IPs)
    └── Similar structure

Region us-west-2: 10.1.0.0/16
└── Similar structure
```

### Subnetting Calculator

```bash
# Calculate subnet
# CIDR: 10.0.0.0/24
# Network:    10.0.0.0
# First IP:   10.0.0.1
# Last IP:    10.0.0.254
# Broadcast:  10.0.0.255
# Total IPs:  256 (254 usable)

# Subnet into /26 (4 subnets of 64 IPs each)
10.0.0.0/26   (10.0.0.1   - 10.0.0.62)
10.0.0.64/26  (10.0.0.65  - 10.0.0.126)
10.0.0.128/26 (10.0.0.129 - 10.0.0.190)
10.0.0.192/26 (10.0.0.193 - 10.0.0.254)
```

### Reserved IP Addresses (AWS)

```
VPC CIDR: 10.0.0.0/24

10.0.0.0   - Network address
10.0.0.1   - VPC router
10.0.0.2   - DNS server
10.0.0.3   - Reserved (future use)
10.0.0.255 - Broadcast

Usable: 10.0.0.4 - 10.0.0.254 (251 IPs)
```

## High Availability

### Multi-AZ Architecture

```
┌──────────────────────────────────────┐
│     Region: us-east-1                │
│                                      │
│  ┌─────────────┐  ┌─────────────┐  │
│  │   AZ-A      │  │   AZ-B      │  │
│  │             │  │             │  │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │
│  │ │   Web   │ │  │ │   Web   │ │  │
│  │ └────┬────┘ │  │ └────┬────┘ │  │
│  │      │      │  │      │      │  │
│  │ ┌────▼────┐ │  │ ┌────▼────┐ │  │
│  │ │   App   │ │  │ │   App   │ │  │
│  │ └────┬────┘ │  │ └────┬────┘ │  │
│  │      │      │  │      │      │  │
│  │ ┌────▼────┐ │  │ ┌────▼────┐ │  │
│  │ │DB Primary│ │  │ │DB Replica│ │  │
│  │ └─────────┘ │  │ └─────────┘ │  │
│  └─────────────┘  └─────────────┘  │
└──────────────────────────────────────┘
```

### Load Balancer Redundancy

```
           ┌─── DNS (Route 53) ───┐
           │   Health Checks       │
           └───────┬───────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐    ┌───────▼────────┐
│  Load Balancer │    │  Load Balancer │
│     (AZ-A)     │    │     (AZ-B)     │
└───────┬────────┘    └───────┬────────┘
        │                     │
    ┌───┴───┐             ┌───┴───┐
    │       │             │       │
  App-1  App-2         App-3  App-4
```

## Capacity Planning

### Bandwidth Calculation

```
Users: 10,000 concurrent
Avg request size: 100 KB
Requests per user per minute: 10

Bandwidth Required:
= 10,000 users × 100 KB × 10 req/min
= 10,000,000 KB/min
= 166,667 KB/sec
= ~1.3 Gbps

Add 50% overhead = ~2 Gbps
Provision: 2.5 Gbps for headroom
```

### Growth Planning

```
Current: 10.0.0.0/20 (4,096 IPs)
Usage: 2,500 IPs (61%)
Growth rate: 20% per year

Year 1: 3,000 IPs (73%)
Year 2: 3,600 IPs (88%)
Year 3: 4,320 IPs (OVERFLOW!)

Action: Plan migration to /19 (8,192 IPs)
```

## Cloud Network Architecture

### AWS VPC Best Practices

```hcl
# VPC with multiple subnets across AZs
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "production-vpc"
  }
}

# Public subnets
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-${count.index + 1}"
    Tier = "Public"
  }
}

# Private subnets
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 4, count.index + 2)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-${count.index + 1}"
    Tier = "Private"
  }
}

# NAT Gateways for HA
resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "nat-${count.index + 1}"
  }
}
```

## Best Practices

### 1. Design Principles

- **Scalability**: Plan for 3-5 year growth
- **Redundancy**: No single points of failure
- **Security**: Defense in depth
- **Simplicity**: Avoid unnecessary complexity
- **Observability**: Monitor everything

### 2. Documentation

- Network diagrams (logical and physical)
- IP address management (IPAM)
- Routing table documentation
- Firewall rules
- Change management process

### 3. Testing

- Failover testing
- Load testing
- Security testing
- Disaster recovery drills
- Chaos engineering

### 4. Security

- Network segmentation
- Least privilege access
- Encrypted traffic
- Regular audits
- Intrusion detection

### 5. Monitoring

- Bandwidth utilization
- Latency and packet loss
- Connection counts
- Error rates
- Capacity metrics

---

**Related Topics:**
- See [tcp-ip-protocols.md](tcp-ip-protocols.md) for protocol fundamentals
- See [routing-switching.md](routing-switching.md) for routing configuration
- See [network-security.md](network-security.md) for security architecture
- See [load-balancing.md](load-balancing.md) for load balancer design
