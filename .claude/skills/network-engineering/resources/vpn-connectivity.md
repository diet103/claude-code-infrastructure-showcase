# VPN Connectivity

Comprehensive guide to VPN (Virtual Private Network) connectivity covering site-to-site VPN, client VPN, WireGuard, OpenVPN, IPsec, and cloud VPN services.

## Table of Contents

- [Overview](#overview)
- [VPN Types](#vpn-types)
- [WireGuard](#wireguard)
- [OpenVPN](#openvpn)
- [IPsec](#ipsec)
- [Cloud VPN Services](#cloud-vpn-services)
- [Site-to-Site VPN](#site-to-site-vpn)
- [Client VPN](#client-vpn)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## Overview

VPNs create encrypted tunnels over public networks, enabling secure remote access and site-to-site connectivity.

**Common Use Cases:**
- Connect on-premises data centers to cloud
- Secure remote worker access
- Multi-region connectivity
- Disaster recovery connections
- Third-party integrations

## VPN Types

### Site-to-Site VPN

```
┌─────────────┐         ┌──────────┐         ┌─────────────┐
│   Office    │         │          │         │    Cloud    │
│  Network    ├─────────┤ Internet ├─────────┤   VPC       │
│ 10.0.0.0/16 │  VPN    │          │  VPN    │ 172.16.0/16 │
└─────────────┘ Tunnel  └──────────┘ Tunnel  └─────────────┘
```

**Characteristics:**
- Connects two networks
- Always-on connection
- Typically hardware VPN appliances
- Redundant tunnels for HA

### Client VPN (Remote Access)

```
┌──────────┐          ┌──────────┐         ┌─────────────┐
│  Laptop  │          │          │         │  Corporate  │
│  Remote  ├──────────┤ Internet ├─────────┤   Network   │
│  Worker  │   VPN    │          │  VPN    │             │
└──────────┘  Client  └──────────┘ Gateway └─────────────┘
```

**Characteristics:**
- Individual user access
- On-demand connection
- Software VPN clients
- Multi-factor authentication

## WireGuard

### Server Configuration

```ini
# /etc/wireguard/wg0.conf (Server)
[Interface]
PrivateKey = SERVER_PRIVATE_KEY
Address = 10.200.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Client 1
[Peer]
PublicKey = CLIENT1_PUBLIC_KEY
AllowedIPs = 10.200.0.2/32
PersistentKeepalive = 25

# Client 2
[Peer]
PublicKey = CLIENT2_PUBLIC_KEY
AllowedIPs = 10.200.0.3/32
PersistentKeepalive = 25
```

### Client Configuration

```ini
# /etc/wireguard/wg0.conf (Client)
[Interface]
PrivateKey = CLIENT_PRIVATE_KEY
Address = 10.200.0.2/24
DNS = 10.200.0.1

[Peer]
PublicKey = SERVER_PUBLIC_KEY
Endpoint = vpn.example.com:51820
AllowedIPs = 10.0.0.0/8, 172.16.0.0/12
PersistentKeepalive = 25
```

### Key Generation

```bash
# Generate private key
wg genkey > privatekey

# Generate public key from private key
wg pubkey < privatekey > publickey

# Generate pre-shared key (optional, for additional security)
wg genpsk > presharedkey
```

### Managing WireGuard

```bash
# Start VPN
sudo wg-quick up wg0

# Stop VPN
sudo wg-quick down wg0

# Show status
sudo wg show

# Enable at boot
sudo systemctl enable wg-quick@wg0

# Check interface
ip addr show wg0

# Test connectivity
ping 10.200.0.1
```

### Site-to-Site with WireGuard

```ini
# Site A (10.0.0.0/16)
[Interface]
PrivateKey = SITE_A_PRIVATE_KEY
Address = 10.200.0.1/30
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE; ip route add 192.168.0.0/16 dev wg0
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE; ip route del 192.168.0.0/16 dev wg0

[Peer]
PublicKey = SITE_B_PUBLIC_KEY
Endpoint = site-b.example.com:51820
AllowedIPs = 10.200.0.2/32, 192.168.0.0/16
PersistentKeepalive = 25

# Site B (192.168.0.0/16)
[Interface]
PrivateKey = SITE_B_PRIVATE_KEY
Address = 10.200.0.2/30
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE; ip route add 10.0.0.0/16 dev wg0
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE; ip route del 10.0.0.0/16 dev wg0

[Peer]
PublicKey = SITE_A_PUBLIC_KEY
Endpoint = site-a.example.com:51820
AllowedIPs = 10.200.0.1/32, 10.0.0.0/16
PersistentKeepalive = 25
```

## OpenVPN

### Server Configuration

```
# /etc/openvpn/server.conf
port 1194
proto udp
dev tun

ca /etc/openvpn/ca.crt
cert /etc/openvpn/server.crt
key /etc/openvpn/server.key
dh /etc/openvpn/dh2048.pem

server 10.8.0.0 255.255.255.0
ifconfig-pool-persist /var/log/openvpn/ipp.txt

push "route 10.0.0.0 255.255.0.0"
push "dhcp-option DNS 10.0.0.2"
push "dhcp-option DOMAIN internal.example.com"

keepalive 10 120
cipher AES-256-GCM
auth SHA256
user nobody
group nogroup
persist-key
persist-tun

status /var/log/openvpn/openvpn-status.log
log-append /var/log/openvpn/openvpn.log
verb 3
explicit-exit-notify 1

# Security enhancements
tls-auth /etc/openvpn/ta.key 0
tls-version-min 1.2
tls-cipher TLS-ECDHE-RSA-WITH-AES-256-GCM-SHA384
```

### Client Configuration

```
# client.ovpn
client
dev tun
proto udp

remote vpn.example.com 1194
resolv-retry infinite
nobind

persist-key
persist-tun

ca ca.crt
cert client.crt
key client.key

remote-cert-tls server
cipher AES-256-GCM
auth SHA256
tls-version-min 1.2

verb 3
```

### PKI Setup

```bash
# Install Easy-RSA
apt-get install easy-rsa

# Initialize PKI
cd /etc/openvpn/easy-rsa
./easyrsa init-pki

# Build CA
./easyrsa build-ca nopass

# Generate server certificate
./easyrsa build-server-full server nopass

# Generate client certificate
./easyrsa build-client-full client1 nopass

# Generate DH parameters
./easyrsa gen-dh

# Generate TLS-auth key
openvpn --genkey --secret /etc/openvpn/ta.key
```

### OpenVPN with Docker

```yaml
version: '3.8'
services:
  openvpn:
    image: kylemanna/openvpn:latest
    cap_add:
    - NET_ADMIN
    ports:
    - "1194:1194/udp"
    volumes:
    - ./openvpn-data:/etc/openvpn
    restart: unless-stopped

# Initialize configuration
docker-compose run --rm openvpn ovpn_genconfig -u udp://vpn.example.com
docker-compose run --rm openvpn ovpn_initpki

# Generate client config
docker-compose run --rm openvpn easyrsa build-client-full client1 nopass
docker-compose run --rm openvpn ovpn_getclient client1 > client1.ovpn
```

## IPsec

### StrongSwan Configuration

```
# /etc/ipsec.conf
config setup
    charondebug="ike 2, knl 2, cfg 2"
    uniqueids=never

conn %default
    ikelifetime=60m
    keylife=20m
    rekeymargin=3m
    keyingtries=1
    keyexchange=ikev2
    authby=secret

conn site-to-site
    left=203.0.113.10
    leftsubnet=10.0.0.0/16
    leftid=@site-a
    right=203.0.113.20
    rightsubnet=192.168.0.0/16
    rightid=@site-b
    auto=start
    ike=aes256-sha2_256-modp2048!
    esp=aes256-sha2_256!
    dpdaction=restart
    closeaction=restart

# /etc/ipsec.secrets
@site-a @site-b : PSK "your-pre-shared-key-here"
```

### IPsec with NAT-T

```
conn roadwarrior
    left=%any
    leftsubnet=0.0.0.0/0
    leftfirewall=yes
    right=%any
    rightsubnet=10.0.0.0/8
    auto=add
    keyexchange=ikev2
    ike=aes256-sha2_256-modp2048!
    esp=aes256-sha2_256!
    authby=secret
```

## Cloud VPN Services

### AWS VPN

```hcl
# Customer Gateway
resource "aws_customer_gateway" "main" {
  bgp_asn    = 65000
  ip_address = "203.0.113.10"
  type       = "ipsec.1"

  tags = {
    Name = "on-prem-gateway"
  }
}

# Virtual Private Gateway
resource "aws_vpn_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-vpn-gateway"
  }
}

# VPN Connection
resource "aws_vpn_connection" "main" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.main.id
  type                = "ipsec.1"
  static_routes_only  = false

  tunnel1_inside_cidr   = "169.254.10.0/30"
  tunnel1_preshared_key = var.tunnel1_psk

  tunnel2_inside_cidr   = "169.254.11.0/30"
  tunnel2_preshared_key = var.tunnel2_psk

  tags = {
    Name = "main-vpn-connection"
  }
}

# VPN Connection Route
resource "aws_vpn_connection_route" "office" {
  destination_cidr_block = "10.0.0.0/16"
  vpn_connection_id      = aws_vpn_connection.main.id
}

# Route propagation
resource "aws_vpn_gateway_route_propagation" "main" {
  vpn_gateway_id = aws_vpn_gateway.main.id
  route_table_id = aws_route_table.private.id
}
```

### AWS Client VPN

```hcl
resource "aws_ec2_client_vpn_endpoint" "main" {
  description            = "Client VPN endpoint"
  server_certificate_arn = aws_acm_certificate.vpn_server.arn
  client_cidr_block      = "10.200.0.0/22"

  authentication_options {
    type                       = "certificate-authentication"
    root_certificate_chain_arn = aws_acm_certificate.vpn_client_root.arn
  }

  connection_log_options {
    enabled               = true
    cloudwatch_log_group  = aws_cloudwatch_log_group.vpn.name
    cloudwatch_log_stream = aws_cloudwatch_log_stream.vpn.name
  }

  split_tunnel = true

  dns_servers = ["10.0.0.2"]

  tags = {
    Name = "client-vpn"
  }
}

# Network association
resource "aws_ec2_client_vpn_network_association" "main" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  subnet_id              = aws_subnet.private[0].id
}

# Authorization rule
resource "aws_ec2_client_vpn_authorization_rule" "main" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  target_network_cidr    = aws_vpc.main.cidr_block
  authorize_all_groups   = true
}

# Route
resource "aws_ec2_client_vpn_route" "main" {
  client_vpn_endpoint_id = aws_ec2_client_vpn_endpoint.main.id
  destination_cidr_block = "0.0.0.0/0"
  target_vpc_subnet_id   = aws_ec2_client_vpn_network_association.main.subnet_id
}
```

### Google Cloud VPN

```hcl
resource "google_compute_vpn_gateway" "main" {
  name    = "vpn-gateway"
  network = google_compute_network.main.id
}

resource "google_compute_address" "vpn" {
  name = "vpn-gateway-ip"
}

resource "google_compute_forwarding_rule" "esp" {
  name        = "vpn-esp"
  ip_protocol = "ESP"
  ip_address  = google_compute_address.vpn.address
  target      = google_compute_vpn_gateway.main.id
}

resource "google_compute_forwarding_rule" "udp500" {
  name        = "vpn-udp500"
  ip_protocol = "UDP"
  port_range  = "500"
  ip_address  = google_compute_address.vpn.address
  target      = google_compute_vpn_gateway.main.id
}

resource "google_compute_forwarding_rule" "udp4500" {
  name        = "vpn-udp4500"
  ip_protocol = "UDP"
  port_range  = "4500"
  ip_address  = google_compute_address.vpn.address
  target      = google_compute_vpn_gateway.main.id
}

resource "google_compute_vpn_tunnel" "tunnel1" {
  name          = "vpn-tunnel1"
  peer_ip       = "203.0.113.10"
  shared_secret = var.shared_secret

  target_vpn_gateway = google_compute_vpn_gateway.main.id

  local_traffic_selector  = ["10.0.0.0/16"]
  remote_traffic_selector = ["192.168.0.0/16"]

  depends_on = [
    google_compute_forwarding_rule.esp,
    google_compute_forwarding_rule.udp500,
    google_compute_forwarding_rule.udp4500,
  ]
}

resource "google_compute_route" "route1" {
  name       = "vpn-route1"
  network    = google_compute_network.main.name
  dest_range = "192.168.0.0/16"
  priority   = 1000

  next_hop_vpn_tunnel = google_compute_vpn_tunnel.tunnel1.id
}
```

### Azure VPN Gateway

```hcl
resource "azurerm_virtual_network_gateway" "main" {
  name                = "vpn-gateway"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  type     = "Vpn"
  vpn_type = "RouteBased"

  active_active = false
  enable_bgp    = true
  sku           = "VpnGw2"

  ip_configuration {
    name                          = "vnetGatewayConfig"
    public_ip_address_id          = azurerm_public_ip.vpn.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }

  bgp_settings {
    asn = 65515
  }
}

resource "azurerm_local_network_gateway" "onprem" {
  name                = "onprem-gateway"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  gateway_address     = "203.0.113.10"
  address_space       = ["10.0.0.0/16"]

  bgp_settings {
    asn                 = 65000
    bgp_peering_address = "10.0.0.1"
  }
}

resource "azurerm_virtual_network_gateway_connection" "onprem" {
  name                = "onprem-connection"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  type                       = "IPsec"
  virtual_network_gateway_id = azurerm_virtual_network_gateway.main.id
  local_network_gateway_id   = azurerm_local_network_gateway.onprem.id

  shared_key = var.shared_key

  enable_bgp = true
}
```

## Site-to-Site VPN

### High Availability Setup

```
Primary Tunnel:
Office Router A ←→ Cloud VPN Gateway 1

Backup Tunnel:
Office Router A ←→ Cloud VPN Gateway 2

Secondary Backup:
Office Router B ←→ Cloud VPN Gateway 1
```

### BGP Configuration

```
# Cisco Router
router bgp 65000
 bgp log-neighbor-changes
 neighbor 169.254.10.1 remote-as 65515
 neighbor 169.254.10.1 timers 10 30 30
 !
 address-family ipv4
  network 10.0.0.0 mask 255.255.0.0
  neighbor 169.254.10.1 activate
  neighbor 169.254.10.1 soft-reconfiguration inbound
 exit-address-family

# For redundancy
 neighbor 169.254.11.1 remote-as 65515
 neighbor 169.254.11.1 timers 10 30 30
 !
 address-family ipv4
  neighbor 169.254.11.1 activate
  neighbor 169.254.11.1 soft-reconfiguration inbound
 exit-address-family
```

## Client VPN

### WireGuard Client VPN

```bash
# Server configuration for road warriors
[Interface]
Address = 10.200.0.1/24
ListenPort = 51820
PrivateKey = SERVER_PRIVATE_KEY

# Enable IP forwarding
PostUp = sysctl -w net.ipv4.ip_forward=1
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

PostDown = iptables -D FORWARD -i wg0 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Client 1
[Peer]
PublicKey = CLIENT1_PUBLIC
AllowedIPs = 10.200.0.10/32

# Client 2
[Peer]
PublicKey = CLIENT2_PUBLIC
AllowedIPs = 10.200.0.11/32
```

### OpenVPN Access Server

```bash
# Install OpenVPN Access Server
wget https://as-repository.openvpn.net/as-repo-public.gpg -O /etc/apt/trusted.gpg.d/as-repository.gpg
echo "deb http://as-repository.openvpn.net/as/debian focal main" > /etc/apt/sources.list.d/openvpn-as-repo.list
apt update && apt install openvpn-as

# Configure
/usr/local/openvpn_as/bin/ovpn-init --batch

# Access admin UI
# https://your-server-ip:943/admin
```

## Best Practices

1. **Use modern protocols** - WireGuard or IKEv2, avoid PPTP
2. **Enable strong encryption** - AES-256-GCM, SHA-256
3. **Implement redundancy** - Multiple tunnels, BGP
4. **Monitor VPN health** - Tunnel status, throughput, latency
5. **Use split-tunnel** - Only route necessary traffic through VPN
6. **Enable logging** - Connection logs, authentication logs
7. **Regular key rotation** - Rotate pre-shared keys periodically
8. **Use certificate authentication** - More secure than PSK
9. **Implement MFA** - For client VPN access
10. **Test failover** - Ensure backup tunnels work

## Anti-Patterns

- **Using PPTP** - Outdated, insecure protocol
- **Weak encryption** - DES, 3DES are obsolete
- **Single tunnel** - No redundancy
- **No monitoring** - Can't detect VPN failures
- **Full tunnel always** - Unnecessary bandwidth usage
- **Hard-coded credentials** - Use secrets management
- **No logging** - Can't audit or troubleshoot
- **Ignoring MTU** - Can cause packet fragmentation
- **No firewall rules** - VPN doesn't mean trusted
- **Manual configuration** - Use infrastructure as code
