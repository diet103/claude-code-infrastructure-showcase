# DNS Management

Comprehensive guide to DNS (Domain Name System) management covering DNS architecture, zone files, cloud DNS services, DNSSEC, DNS security, and traffic routing strategies.

## Table of Contents

- [Overview](#overview)
- [DNS Architecture](#dns-architecture)
- [DNS Record Types](#dns-record-types)
- [Zone Files](#zone-files)
- [Cloud DNS Services](#cloud-dns-services)
- [Route 53 Advanced Features](#route-53-advanced-features)
- [DNSSEC](#dnssec)
- [DNS Security](#dns-security)
- [Traffic Routing Strategies](#traffic-routing-strategies)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## Overview

DNS translates human-readable domain names into IP addresses. Proper DNS management is critical for availability, performance, and security.

**Key Concepts:**
- Hierarchical distributed database
- Authoritative vs recursive DNS
- DNS caching and TTL
- Zone delegation
- DNS resolution process

## DNS Architecture

### DNS Hierarchy

```
                    Root (.)
                       |
        ┌──────────────┼──────────────┐
        |              |              |
       .com           .org           .net
        |              |              |
    example.com    wikipedia.org  cloudflare.net
        |
  ┌─────┴─────┐
  |           |
www.example.com  api.example.com
```

### DNS Resolution Flow

```
1. User requests www.example.com
2. Client checks local DNS cache
3. If not cached, queries recursive resolver
4. Resolver queries root nameserver → .com TLD nameserver → example.com authoritative nameserver
5. Returns IP address to client
6. Client caches result based on TTL
```

### DNS Server Types

**Authoritative DNS:**
- Holds actual DNS records
- Responds with definitive answers
- Managed by domain owner

**Recursive DNS:**
- Queries other DNS servers on behalf of clients
- Caches results
- Examples: 8.8.8.8 (Google), 1.1.1.1 (Cloudflare)

## DNS Record Types

### A Record (IPv4 Address)

```
example.com.    300    IN    A    192.0.2.1
```

### AAAA Record (IPv6 Address)

```
example.com.    300    IN    AAAA    2001:0db8::1
```

### CNAME Record (Canonical Name)

```
www.example.com.    300    IN    CNAME    example.com.
```

**Important:** CNAME cannot coexist with other records at same name.

### MX Record (Mail Exchange)

```
example.com.    3600    IN    MX    10 mail1.example.com.
example.com.    3600    IN    MX    20 mail2.example.com.
```

Lower priority number = higher priority.

### TXT Record (Text/SPF/DKIM)

```
example.com.         300    IN    TXT    "v=spf1 include:_spf.google.com ~all"
_dmarc.example.com.  300    IN    TXT    "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
```

### NS Record (Name Server)

```
example.com.    86400    IN    NS    ns1.example.com.
example.com.    86400    IN    NS    ns2.example.com.
```

### SRV Record (Service)

```
_service._proto.name.    TTL    IN    SRV    priority weight port target
_http._tcp.example.com.  300    IN    SRV    10 60 80 server1.example.com.
```

### CAA Record (Certificate Authority Authorization)

```
example.com.    300    IN    CAA    0 issue "letsencrypt.org"
example.com.    300    IN    CAA    0 issuewild "letsencrypt.org"
```

## Zone Files

### BIND Zone File Format

```
$TTL 3600
$ORIGIN example.com.

@    IN    SOA    ns1.example.com. admin.example.com. (
                  2024010101    ; Serial (YYYYMMDDnn)
                  7200          ; Refresh (2 hours)
                  3600          ; Retry (1 hour)
                  1209600       ; Expire (2 weeks)
                  3600 )        ; Minimum TTL (1 hour)

     IN    NS     ns1.example.com.
     IN    NS     ns2.example.com.

     IN    A      192.0.2.1
     IN    AAAA   2001:0db8::1

     IN    MX     10 mail.example.com.

www  IN    A      192.0.2.1
api  IN    A      192.0.2.2
cdn  IN    CNAME  cdn.cloudfront.net.

; Subdomain delegation
staging  IN  NS  ns1.staging.example.com.
staging  IN  NS  ns2.staging.example.com.

; Wildcard record
*.dynamic  IN  A  192.0.2.100
```

### SOA Record Explained

```
SOA <primary-ns> <admin-email> (
    <serial>      ; Version number, increment on each change
    <refresh>     ; Time secondary should check for updates
    <retry>       ; Time to retry failed refresh
    <expire>      ; Time before zone considered invalid
    <minimum>     ; Minimum TTL for negative responses
)
```

## Cloud DNS Services

### AWS Route 53

**Create Hosted Zone:**
```hcl
resource "aws_route53_zone" "primary" {
  name    = "example.com"
  comment = "Primary DNS zone for example.com"

  tags = {
    Environment = "production"
  }
}

# A record
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "www.example.com"
  type    = "A"
  ttl     = 300
  records = ["192.0.2.1"]
}

# Alias record (AWS-specific)
resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# CNAME record
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.example.com"
  type    = "CNAME"
  ttl     = 300
  records = ["api-lb.us-east-1.elb.amazonaws.com"]
}
```

### Google Cloud DNS

```hcl
resource "google_dns_managed_zone" "primary" {
  name        = "example-com"
  dns_name    = "example.com."
  description = "Primary DNS zone"

  dnssec_config {
    state = "on"
  }
}

resource "google_dns_record_set" "a" {
  managed_zone = google_dns_managed_zone.primary.name
  name         = "www.example.com."
  type         = "A"
  ttl          = 300
  rrdatas      = ["192.0.2.1"]
}

resource "google_dns_record_set" "mx" {
  managed_zone = google_dns_managed_zone.primary.name
  name         = "example.com."
  type         = "MX"
  ttl          = 3600
  rrdatas      = [
    "10 mail1.example.com.",
    "20 mail2.example.com."
  ]
}
```

### Azure DNS

```hcl
resource "azurerm_dns_zone" "primary" {
  name                = "example.com"
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    environment = "production"
  }
}

resource "azurerm_dns_a_record" "www" {
  name                = "www"
  zone_name           = azurerm_dns_zone.primary.name
  resource_group_name = azurerm_resource_group.main.name
  ttl                 = 300
  records             = ["192.0.2.1"]
}

resource "azurerm_dns_cname_record" "cdn" {
  name                = "cdn"
  zone_name           = azurerm_dns_zone.primary.name
  resource_group_name = azurerm_resource_group.main.name
  ttl                 = 300
  record              = "cdn.azureedge.net"
}
```

## Route 53 Advanced Features

### Weighted Routing (Traffic Distribution)

```hcl
# Send 70% traffic to new version, 30% to old
resource "aws_route53_record" "api_new" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 60

  weighted_routing_policy {
    weight = 70
  }

  set_identifier = "api-new"
  records        = ["192.0.2.10"]
}

resource "aws_route53_record" "api_old" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 60

  weighted_routing_policy {
    weight = 30
  }

  set_identifier = "api-old"
  records        = ["192.0.2.20"]
}
```

### Latency-Based Routing

```hcl
resource "aws_route53_record" "api_us_east" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.example.com"
  type    = "A"

  latency_routing_policy {
    region = "us-east-1"
  }

  set_identifier = "api-us-east-1"

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_eu_west" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.example.com"
  type    = "A"

  latency_routing_policy {
    region = "eu-west-1"
  }

  set_identifier = "api-eu-west-1"

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }
}
```

### Geolocation Routing

```hcl
# Default for all locations
resource "aws_route53_record" "geo_default" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "www.example.com"
  type    = "A"

  geolocation_routing_policy {
    continent = "*"
  }

  set_identifier = "default"
  records        = ["192.0.2.1"]
}

# Europe
resource "aws_route53_record" "geo_europe" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "www.example.com"
  type    = "A"

  geolocation_routing_policy {
    continent = "EU"
  }

  set_identifier = "europe"
  records        = ["192.0.2.10"]
}

# Asia
resource "aws_route53_record" "geo_asia" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "www.example.com"
  type    = "A"

  geolocation_routing_policy {
    continent = "AS"
  }

  set_identifier = "asia"
  records        = ["192.0.2.20"]
}
```

### Failover Routing

```hcl
# Primary endpoint with health check
resource "aws_route53_health_check" "primary" {
  fqdn              = "primary.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = {
    Name = "primary-health-check"
  }
}

resource "aws_route53_record" "primary" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier         = "primary"
  health_check_id        = aws_route53_health_check.primary.id
  records                = ["192.0.2.1"]
  ttl                    = 60
}

# Secondary (failover) endpoint
resource "aws_route53_record" "secondary" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier = "secondary"
  records        = ["192.0.2.100"]
  ttl            = 60
}
```

### Multi-Value Answer Routing

```hcl
resource "aws_route53_record" "multi_value_1" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 60

  multivalue_answer_routing_policy = true
  set_identifier                   = "server-1"
  health_check_id                  = aws_route53_health_check.server1.id

  records = ["192.0.2.1"]
}

resource "aws_route53_record" "multi_value_2" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 60

  multivalue_answer_routing_policy = true
  set_identifier                   = "server-2"
  health_check_id                  = aws_route53_health_check.server2.id

  records = ["192.0.2.2"]
}
```

## DNSSEC

### Enable DNSSEC on Route 53

```hcl
resource "aws_route53_zone" "primary" {
  name = "example.com"
}

# Enable DNSSEC signing
resource "aws_route53_key_signing_key" "main" {
  hosted_zone_id             = aws_route53_zone.primary.zone_id
  key_management_service_arn = aws_kms_key.dnssec.arn
  name                       = "example-ksk"
}

resource "aws_route53_hosted_zone_dnssec" "main" {
  hosted_zone_id = aws_route53_key_signing_key.main.hosted_zone_id
}

# KMS key for DNSSEC
resource "aws_kms_key" "dnssec" {
  customer_master_key_spec = "ECC_NIST_P256"
  deletion_window_in_days  = 7
  key_usage                = "SIGN_VERIFY"
  policy = jsonencode({
    Statement = [
      {
        Action = [
          "kms:DescribeKey",
          "kms:GetPublicKey",
          "kms:Sign",
        ],
        Effect = "Allow"
        Principal = {
          Service = "dnssec-route53.amazonaws.com"
        }
        Resource = "*"
      },
    ]
    Version = "2012-10-17"
  })
}
```

### DNSSEC Validation

```bash
# Check DNSSEC status
dig example.com +dnssec

# Verify DNSSEC chain
delv @8.8.8.8 example.com

# Check DS record at parent
dig DS example.com
```

## DNS Security

### DNS over HTTPS (DoH)

```python
# Using DNS over HTTPS
import requests

def resolve_doh(domain):
    url = "https://cloudflare-dns.com/dns-query"
    headers = {"accept": "application/dns-json"}
    params = {"name": domain, "type": "A"}

    response = requests.get(url, headers=headers, params=params)
    return response.json()

result = resolve_doh("example.com")
print(result)
```

### DNS over TLS (DoT)

```bash
# Configure systemd-resolved for DoT
cat > /etc/systemd/resolved.conf <<EOF
[Resolve]
DNS=1.1.1.1#cloudflare-dns.com 8.8.8.8#dns.google
DNSOverTLS=yes
DNSSEC=yes
EOF

systemctl restart systemd-resolved
```

### DDoS Protection

```hcl
# Route 53 with Shield Advanced
resource "aws_shield_protection" "route53" {
  name         = "route53-protection"
  resource_arn = aws_route53_zone.primary.arn
}

# Rate limiting health checks
resource "aws_route53_health_check" "rate_limited" {
  type                            = "HTTPS"
  resource_path                   = "/health"
  fqdn                            = "api.example.com"
  port                            = 443
  request_interval                = 30
  failure_threshold               = 3
  measure_latency                 = true
  enable_sni                      = true
}
```

## Traffic Routing Strategies

### Blue-Green Deployment

```hcl
# Blue environment (current production)
resource "aws_route53_record" "production" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  weighted_routing_policy {
    weight = 100  # All traffic to blue
  }

  set_identifier = "blue"
  records        = ["192.0.2.10"]
  ttl            = 60
}

# Green environment (new version)
resource "aws_route53_record" "staging" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "app.example.com"
  type    = "A"

  weighted_routing_policy {
    weight = 0  # No production traffic yet
  }

  set_identifier = "green"
  records        = ["192.0.2.20"]
  ttl            = 60
}

# To switch: Update weights (blue=0, green=100)
```

### Canary Deployment

```hcl
# Stable version
resource "aws_route53_record" "stable" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.example.com"
  type    = "A"

  weighted_routing_policy {
    weight = 95  # 95% traffic
  }

  set_identifier = "stable"
  records        = ["192.0.2.10"]
  ttl            = 60
}

# Canary version
resource "aws_route53_record" "canary" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.example.com"
  type    = "A"

  weighted_routing_policy {
    weight = 5  # 5% traffic for testing
  }

  set_identifier = "canary"
  records        = ["192.0.2.20"]
  ttl            = 60
}
```

### Split-View DNS (Internal/External)

```
Internal Zone (10.0.0.0/8):
    api.example.com → 10.0.1.10 (private IP)

External Zone (Internet):
    api.example.com → 203.0.113.10 (public IP)
```

**Implementation:**
```hcl
# Private hosted zone
resource "aws_route53_zone" "private" {
  name = "example.com"

  vpc {
    vpc_id = aws_vpc.main.id
  }
}

resource "aws_route53_record" "internal_api" {
  zone_id = aws_route53_zone.private.zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 300
  records = ["10.0.1.10"]
}

# Public hosted zone
resource "aws_route53_zone" "public" {
  name = "example.com"
}

resource "aws_route53_record" "external_api" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 300
  records = ["203.0.113.10"]
}
```

## Best Practices

1. **Use appropriate TTL values** - Lower for records that change frequently, higher for stable records
2. **Enable DNSSEC** - Prevent DNS spoofing and cache poisoning
3. **Implement health checks** - For failover and routing decisions
4. **Use alias records** - For AWS resources (no charge, automatic updates)
5. **Monitor DNS queries** - Detect anomalies and attacks
6. **Maintain multiple NS records** - At least two, preferably in different networks
7. **Use CAA records** - Prevent unauthorized certificate issuance
8. **Document zone changes** - Version control and change management
9. **Test before going live** - Use dig/nslookup to verify records
10. **Plan for migration** - Lower TTLs before DNS changes

## Anti-Patterns

- **Very high TTL on changing records** - Slows down updates
- **Very low TTL unnecessarily** - Increases DNS query load and cost
- **No DNSSEC** - Vulnerable to DNS attacks
- **Single nameserver** - Single point of failure
- **Missing health checks** - Sends traffic to failed endpoints
- **No monitoring** - Can't detect DNS issues
- **Wildcard DNS without restrictions** - Security and performance issues
- **No DNS backup** - Risk of total outage
- **Ignoring propagation time** - Changes can take time to propagate
- **Hard-coded IP addresses** - Use DNS instead
