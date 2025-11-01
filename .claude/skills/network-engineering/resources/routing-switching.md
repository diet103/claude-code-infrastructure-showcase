# Routing and Switching

Comprehensive guide to routing and switching covering BGP, OSPF, EIGRP, VLANs, trunking, spanning tree, and route tables for enterprise and cloud networks.

## Routing Protocols

### BGP (Border Gateway Protocol)

**Characteristics:**
- Path vector protocol
- Autonomous System (AS) routing
- Policy-based routing
- Internet backbone protocol

**BGP Configuration Example:**
```
router bgp 65001
  bgp router-id 10.0.0.1
  neighbor 203.0.113.2 remote-as 65002
  neighbor 203.0.113.2 description ISP_Connection

  network 10.0.0.0 mask 255.255.255.0
  network 192.168.1.0

  address-family ipv4
    neighbor 203.0.113.2 activate
  exit-address-family
```

**BGP Attributes:**
```
Weight:           Cisco proprietary, highest wins
Local Preference: Within AS, highest wins
AS Path:          Shortest path
Origin:           IGP > EGP > Incomplete
MED:              Multi-Exit Discriminator
```

**AWS Transit Gateway BGP:**
```hcl
resource "aws_ec2_transit_gateway" "main" {
  amazon_side_asn = 64512
}

resource "aws_customer_gateway" "onprem" {
  bgp_asn    = 65000
  ip_address = "203.0.113.10"
  type       = "ipsec.1"
}

resource "aws_vpn_connection" "main" {
  customer_gateway_id = aws_customer_gateway.onprem.id
  transit_gateway_id  = aws_ec2_transit_gateway.main.id
  type                = "ipsec.1"

  tunnel1_inside_cidr = "169.254.10.0/30"
  tunnel2_inside_cidr = "169.254.11.0/30"
}
```

### OSPF (Open Shortest Path First)

**Areas:**
```
Area 0 (Backbone) - Required, all routers
Area 1 (Standard) - Normal area
Area 2 (Stub)     - No external routes
Area 3 (NSSA)     - Not-so-stubby area
```

**OSPF Configuration:**
```
router ospf 1
  router-id 1.1.1.1
  network 10.0.0.0 0.0.0.255 area 0
  network 10.0.1.0 0.0.0.255 area 1

  area 1 stub
  passive-interface GigabitEthernet0/0
```

**OSPF States:**
```
Down → Init → 2-Way → ExStart → Exchange → Loading → Full
```

**Metrics Calculation:**
```
Cost = Reference Bandwidth / Interface Bandwidth
Default Reference: 100 Mbps

10 Gbps   = 1
1 Gbps    = 1
100 Mbps  = 1
10 Mbps   = 10
1 Mbps    = 100
```

### EIGRP (Enhanced Interior Gateway Routing Protocol)

**Metric Calculation:**
```
Metric = [K1*Bandwidth + (K2*Bandwidth)/(256-Load) + K3*Delay] * [K5/(Reliability+K4)]

Default (K1=1, K2=0, K3=1, K4=0, K5=0):
Metric = Bandwidth + Delay
```

**Configuration:**
```
router eigrp 100
  network 10.0.0.0 0.0.0.255
  network 192.168.1.0
  passive-interface default
  no passive-interface GigabitEthernet0/1
  eigrp router-id 1.1.1.1
```

## Switching

### VLANs (Virtual LANs)

**VLAN Configuration:**
```
# Create VLAN
vlan 10
  name Engineering
vlan 20
  name Sales
vlan 30
  name Management

# Assign port to VLAN
interface FastEthernet0/1
  switchport mode access
  switchport access vlan 10

# Trunk port (carries multiple VLANs)
interface GigabitEthernet0/1
  switchport mode trunk
  switchport trunk allowed vlan 10,20,30
  switchport trunk native vlan 999
```

**Inter-VLAN Routing (Router-on-a-Stick):**
```
interface GigabitEthernet0/0.10
  encapsulation dot1Q 10
  ip address 10.0.10.1 255.255.255.0

interface GigabitEthernet0/0.20
  encapsulation dot1Q 20
  ip address 10.0.20.1 255.255.255.0
```

### Trunking (802.1Q)

**Frame Format:**
```
┌────────┬─────┬──────┬─────┬─────┬───┐
│  Dest  │ Src │ VLAN │Type │Data │FCS│
│  MAC   │ MAC │ Tag  │     │     │   │
└────────┴─────┴──────┴─────┴─────┴───┘
         ↑
    4 bytes added for VLAN tag
```

**VTP (VLAN Trunking Protocol):**
```
vtp mode server
vtp domain COMPANY
vtp password SecurePass
vtp version 2
```

### Spanning Tree Protocol (STP)

**STP Port States:**
```
Blocking → Listening → Learning → Forwarding
(20s)      (15s)       (15s)      (Active)
```

**STP Configuration:**
```
# Set root bridge priority
spanning-tree vlan 1 priority 0

# PortFast (skip listening/learning on access ports)
interface FastEthernet0/1
  spanning-tree portfast

# BPDU Guard (disable port if BPDU received)
spanning-tree portfast bpduguard default
```

**Rapid STP (802.1w):**
```
Discarding → Learning → Forwarding
(Faster convergence: < 1 second)
```

## Route Tables

### Linux Route Table

```bash
# View routes
ip route show

# Default route
default via 192.168.1.1 dev eth0 proto dhcp metric 100

# Network routes
10.0.0.0/24 dev eth1 proto kernel scope link src 10.0.0.10
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100

# Add route
ip route add 10.1.0.0/16 via 10.0.0.1 dev eth1

# Delete route
ip route del 10.1.0.0/16

# Multiple routing tables
ip route add default via 192.168.2.1 table 200
ip rule add from 192.168.2.0/24 table 200
```

### AWS Route Tables

```hcl
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  route {
    cidr_block         = "10.1.0.0/16"
    transit_gateway_id = aws_ec2_transit_gateway.main.id
  }

  route {
    cidr_block                = "10.2.0.0/16"
    vpc_peering_connection_id = aws_vpc_peering_connection.peer.id
  }

  tags = {
    Name = "private-route-table"
  }
}

resource "aws_route_table_association" "private" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}
```

## Advanced Routing

### Policy-Based Routing

```
# Route based on source IP
access-list 100 permit ip 192.168.1.0 0.0.0.255 any

route-map PBR-MAP permit 10
  match ip address 100
  set ip next-hop 10.0.0.1

interface GigabitEthernet0/0
  ip policy route-map PBR-MAP
```

### Multipath Routing (ECMP)

```
# Configure multiple paths
ip route 0.0.0.0 0.0.0.0 10.0.0.1
ip route 0.0.0.0 0.0.0.0 10.0.0.2

# Traffic load-balanced across both paths
# Per-packet or per-destination based on platform
```

**Linux ECMP:**
```bash
ip route add default \
  nexthop via 192.168.1.1 weight 1 \
  nexthop via 192.168.2.1 weight 1
```

## Link Aggregation (LACP)

### 802.3ad Configuration

**Cisco:**
```
interface Port-channel1
  switchport mode trunk

interface GigabitEthernet0/1
  channel-group 1 mode active
  switchport mode trunk

interface GigabitEthernet0/2
  channel-group 1 mode active
  switchport mode trunk
```

**Linux Bonding:**
```bash
# /etc/network/interfaces
auto bond0
iface bond0 inet static
    address 10.0.0.10
    netmask 255.255.255.0
    bond-mode 802.3ad
    bond-miimon 100
    bond-slaves eth0 eth1
```

## Troubleshooting

### Routing Issues

```bash
# Verify routing table
ip route show
route -n

# Trace route
traceroute 8.8.8.8
mtr 8.8.8.8

# Check neighbors (BGP, OSPF)
show ip bgp summary
show ip ospf neighbor

# Debug routing
debug ip routing
debug ip bgp
debug ip ospf events
```

### Switching Issues

```bash
# Check VLAN
show vlan brief
show vlan id 10

# Check trunk
show interfaces trunk
show interfaces GigabitEthernet0/1 switchport

# Spanning tree
show spanning-tree
show spanning-tree vlan 1

# MAC address table
show mac address-table
show mac address-table interface GigabitEthernet0/1
```

---

**Related Topics:**
- See [network-architecture.md](network-architecture.md) for network design
- See [tcp-ip-protocols.md](tcp-ip-protocols.md) for protocol fundamentals
- See [network-troubleshooting.md](network-troubleshooting.md) for debugging
