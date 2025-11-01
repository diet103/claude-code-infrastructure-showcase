# Network Security

Comprehensive guide to network security covering firewalls, security groups, network ACLs, DDoS protection, WAF, IDS/IPS, zero trust architecture, and network security best practices.

## Table of Contents

- [Overview](#overview)
- [Security Layers](#security-layers)
- [Firewalls](#firewalls)
- [Security Groups](#security-groups)
- [Network ACLs](#network-acls)
- [DDoS Protection](#ddos-protection)
- [Web Application Firewall (WAF)](#web-application-firewall-waf)
- [IDS/IPS](#idsips)
- [Zero Trust Architecture](#zero-trust-architecture)
- [Network Segmentation](#network-segmentation)
- [VPN Security](#vpn-security)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## Overview

Network security protects infrastructure, data, and communications from unauthorized access, attacks, and vulnerabilities through multiple layers of defense.

**Defense in Depth Strategy:**
```
┌────────────────────────────────────────┐
│ Application Security (WAF, API GW)     │
├────────────────────────────────────────┤
│ Host Security (Firewall, SELinux)     │
├────────────────────────────────────────┤
│ Network Security (SG, NACL, FW)       │
├────────────────────────────────────────┤
│ Perimeter Security (DDoS, IPS)        │
├────────────────────────────────────────┤
│ Physical Security (Data Centers)       │
└────────────────────────────────────────┘
```

## Security Layers

### Network Zones

```
┌─────────────────────────────────────────────┐
│              Internet                        │
└──────────────────┬──────────────────────────┘
                   │
            ┌──────▼──────┐
            │   Firewall  │
            │  (Perimeter)│
            └──────┬──────┘
                   │
       ┌───────────┴───────────┐
       │                       │
 ┌─────▼─────┐          ┌─────▼──────┐
 │   DMZ     │          │  Internal   │
 │ (Public)  │          │  (Private)  │
 └───────────┘          └─────┬───────┘
                              │
                      ┌───────▼────────┐
                      │   Database     │
                      │   (Isolated)   │
                      └────────────────┘
```

### Security Control Layers

1. **Perimeter:** DDoS protection, firewall
2. **Network:** Security groups, NACLs, routing
3. **Application:** WAF, API gateway
4. **Data:** Encryption, access control
5. **Identity:** IAM, authentication, authorization

## Firewalls

### iptables Configuration

```bash
#!/bin/bash
# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (rate limited)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow ping (rate limited)
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s -j ACCEPT

# Drop invalid packets
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

# Log dropped packets
iptables -A INPUT -m limit --limit 5/min -j LOG --log-prefix "iptables denied: " --log-level 7

# Drop everything else
iptables -A INPUT -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4
```

### nftables (Modern Replacement)

```bash
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow loopback
        iif lo accept

        # Allow established/related
        ct state established,related accept

        # Allow SSH (rate limited)
        tcp dport 22 ct state new limit rate 3/minute accept

        # Allow HTTP/HTTPS
        tcp dport { 80, 443 } accept

        # Allow ICMP
        icmp type echo-request limit rate 1/second accept

        # Log drops
        limit rate 5/minute log prefix "nftables drop: "
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

### UFW (Uncomplicated Firewall)

```bash
# Enable UFW
ufw enable

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow ssh
ufw limit ssh  # Rate limit SSH

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow from specific IP
ufw allow from 192.0.2.0/24 to any port 3306

# Allow specific service
ufw allow from 10.0.0.0/8 to any app 'PostgreSQL'

# Deny specific IP
ufw deny from 203.0.113.0/24

# Show status
ufw status verbose

# Application profiles
ufw app list
ufw allow 'Nginx Full'
```

## Security Groups

### AWS Security Groups

```hcl
# Web server security group
resource "aws_security_group" "web" {
  name        = "web-server-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  # Inbound rules
  ingress {
    description     = "HTTPS from ALB"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "SSH from bastion"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  # Outbound rules
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-server-sg"
  }
}

# Database security group
resource "aws_security_group" "database" {
  name        = "database-sg"
  description = "Security group for database servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from app servers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    description = "No outbound internet"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
  }

  tags = {
    Name = "database-sg"
  }
}

# ALB security group
resource "aws_security_group" "alb" {
  name        = "alb-sg"
  description = "Security group for application load balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from internet (redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "To web servers"
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.web.id]
  }

  tags = {
    Name = "alb-sg"
  }
}
```

### Azure Network Security Groups

```hcl
resource "azurerm_network_security_group" "web" {
  name                = "web-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTP"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "DenyAll"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}
```

## Network ACLs

### AWS Network ACLs

```hcl
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  # Inbound rules
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # Ephemeral ports for return traffic
  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Deny known malicious IPs
  ingress {
    protocol   = "-1"
    rule_no    = 50
    action     = "deny"
    cidr_block = "203.0.113.0/24"  # Example malicious range
    from_port  = 0
    to_port    = 0
  }

  # Outbound rules
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = {
    Name = "public-nacl"
  }
}
```

## DDoS Protection

### AWS Shield and WAF

```hcl
# AWS Shield Advanced
resource "aws_shield_protection" "alb" {
  name         = "alb-protection"
  resource_arn = aws_lb.main.arn
}

# Rate limiting with WAF
resource "aws_wafv2_web_acl" "main" {
  name  = "rate-limit-acl"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # Geographic blocking
  rule {
    name     = "GeoBlockRule"
    priority = 2

    action {
      block {}
    }

    statement {
      geo_match_statement {
        country_codes = ["CN", "RU"]  # Example countries
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlockRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "MainWebACL"
    sampled_requests_enabled   = true
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

### Cloudflare DDoS Protection

```hcl
resource "cloudflare_rate_limit" "api" {
  zone_id = var.cloudflare_zone_id

  threshold = 1000
  period    = 60
  match {
    request {
      url_pattern = "api.example.com/v1/*"
    }
  }

  action {
    mode    = "challenge"
    timeout = 3600
  }
}

resource "cloudflare_firewall_rule" "block_countries" {
  zone_id     = var.cloudflare_zone_id
  description = "Block traffic from specific countries"
  filter_id   = cloudflare_filter.geo_block.id
  action      = "block"
}

resource "cloudflare_filter" "geo_block" {
  zone_id     = var.cloudflare_zone_id
  description = "Block specific countries"
  expression  = "(ip.geoip.country in {\"CN\" \"RU\"})"
}
```

## Web Application Firewall (WAF)

### AWS WAF Rules

```hcl
resource "aws_wafv2_web_acl" "comprehensive" {
  name  = "comprehensive-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # SQL injection protection
  rule {
    name     = "SQLInjectionRule"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLInjectionRule"
      sampled_requests_enabled   = true
    }
  }

  # XSS protection
  rule {
    name     = "XSSRule"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "XSSRule"
      sampled_requests_enabled   = true
    }
  }

  # Core rule set
  rule {
    name     = "CoreRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CoreRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # IP reputation list
  rule {
    name     = "IPReputationRule"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesAmazonIpReputationList"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "IPReputationRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ComprehensiveWAF"
    sampled_requests_enabled   = true
  }
}
```

## IDS/IPS

### Snort Configuration

```bash
# /etc/snort/snort.conf

# Network variables
ipvar HOME_NET 10.0.0.0/8
ipvar EXTERNAL_NET !$HOME_NET

# Port lists
portvar HTTP_PORTS [80,443,8080]
portvar SSH_PORTS 22

# Rules
include $RULE_PATH/local.rules

# Custom rules in local.rules:
# Detect port scanning
alert tcp $EXTERNAL_NET any -> $HOME_NET any (msg:"SCAN nmap TCP"; flags:S; threshold:type both, track by_src, count 5, seconds 60; sid:10000001;)

# Detect SSH brute force
alert tcp $EXTERNAL_NET any -> $HOME_NET $SSH_PORTS (msg:"SSH Brute Force Attempt"; flow:to_server,established; content:"SSH"; threshold:type both, track by_src, count 5, seconds 60; sid:10000002;)

# Detect SQL injection
alert tcp $EXTERNAL_NET any -> $HOME_NET $HTTP_PORTS (msg:"SQL Injection Attempt"; flow:to_server,established; content:"UNION"; content:"SELECT"; sid:10000003;)
```

### Suricata (Modern IDS/IPS)

```yaml
# /etc/suricata/suricata.yaml
vars:
  address-groups:
    HOME_NET: "[10.0.0.0/8]"
    EXTERNAL_NET: "!$HOME_NET"

  port-groups:
    HTTP_PORTS: "80,443"
    SSH_PORTS: "22"

af-packet:
  - interface: eth0
    threads: auto
    cluster-id: 99
    cluster-type: cluster_flow

outputs:
  - fast:
      enabled: yes
      filename: fast.log
  - eve-log:
      enabled: yes
      filetype: regular
      filename: eve.json
      types:
        - alert
        - http
        - dns
        - tls

# Custom rules
rule-files:
  - local.rules
  - emerging-threats.rules
```

## Zero Trust Architecture

### Zero Trust Principles

```
Traditional:          Zero Trust:
Trust inside         Trust nothing
Verify once          Verify always
Network-based        Identity-based
Perimeter security   Micro-segmentation
```

### Implementation with Service Mesh

```yaml
# Istio authorization policy (zero trust)
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}  # Empty spec denies all

---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  selector:
    matchLabels:
      app: api
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/frontend"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]

---
# Require mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

## Network Segmentation

### VLAN Segmentation

```
VLAN 10: Management (10.0.10.0/24)
VLAN 20: Web Tier (10.0.20.0/24)
VLAN 30: App Tier (10.0.30.0/24)
VLAN 40: Database Tier (10.0.40.0/24)
VLAN 50: DMZ (10.0.50.0/24)
```

### Kubernetes Network Policies

```yaml
# Default deny all
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

---
# Allow frontend to API
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080

---
# Allow API to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api
    ports:
    - protocol: TCP
      port: 5432

---
# Allow egress to external APIs
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
```

## VPN Security

### WireGuard Configuration

```ini
# /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <server-private-key>
Address = 10.200.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Client 1
PublicKey = <client1-public-key>
AllowedIPs = 10.200.0.2/32

[Peer]
# Client 2
PublicKey = <client2-public-key>
AllowedIPs = 10.200.0.3/32
```

## Best Practices

1. **Implement defense in depth** - Multiple security layers
2. **Principle of least privilege** - Minimum necessary access
3. **Default deny** - Explicitly allow only what's needed
4. **Network segmentation** - Isolate workloads and data
5. **Enable logging** - Monitor and audit all traffic
6. **Regular security audits** - Review and update rules
7. **Encrypt in transit** - Use TLS/mTLS for all communications
8. **Rate limiting** - Protect against abuse and DDoS
9. **Keep systems updated** - Patch vulnerabilities promptly
10. **Incident response plan** - Be prepared for security events

## Anti-Patterns

- **0.0.0.0/0 everywhere** - Overly permissive rules
- **No logging** - Can't detect or investigate incidents
- **Single security layer** - Insufficient defense
- **Trusting internal network** - Internal threats exist
- **No rate limiting** - Vulnerable to DDoS
- **Ignoring egress filtering** - Data exfiltration risk
- **Weak encryption** - Use modern TLS versions only
- **No security monitoring** - Can't detect breaches
- **Manual firewall rules** - Inconsistent and error-prone
- **No incident response plan** - Slow reaction to breaches
