# Load Balancing

Comprehensive guide to load balancing covering algorithms, protocols, health checks, and implementation across different platforms including HAProxy, nginx, and cloud-native load balancers.

## Table of Contents

- [Overview](#overview)
- [Load Balancer Types](#load-balancer-types)
- [Load Balancing Algorithms](#load-balancing-algorithms)
- [Health Checks](#health-checks)
- [SSL/TLS Termination](#ssltls-termination)
- [Session Persistence](#session-persistence)
- [Cloud Load Balancers](#cloud-load-balancers)
- [HAProxy Configuration](#haproxy-configuration)
- [Nginx Load Balancing](#nginx-load-balancing)
- [Kubernetes Ingress](#kubernetes-ingress)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## Overview

Load balancing distributes network traffic across multiple servers to ensure high availability, optimal resource utilization, and improved application performance.

**Key Benefits:**
- High availability through redundancy
- Horizontal scalability
- Zero-downtime deployments
- Traffic distribution optimization
- SSL/TLS offloading
- Protection against DDoS attacks

## Load Balancer Types

### Layer 4 (Transport Layer)

**Characteristics:**
- Operates at TCP/UDP level
- Routes based on IP address and port
- Fast, low latency
- Protocol-agnostic
- Cannot inspect application data

**Use Cases:**
- High-throughput applications
- Non-HTTP protocols
- UDP load balancing
- Simple TCP pass-through

**Example: AWS Network Load Balancer (NLB)**
```yaml
# NLB via Terraform
resource "aws_lb" "network" {
  name               = "app-nlb"
  internal           = false
  load_balancer_type = "network"
  subnets            = var.public_subnet_ids

  enable_cross_zone_load_balancing = true
  enable_deletion_protection       = true

  tags = {
    Name        = "app-nlb"
    Environment = "production"
  }
}

resource "aws_lb_target_group" "tcp" {
  name     = "app-tcp-targets"
  port     = 8080
  protocol = "TCP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    interval            = 30
    port                = "traffic-port"
    protocol            = "TCP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
  }

  deregistration_delay = 30
}

resource "aws_lb_listener" "tcp" {
  load_balancer_arn = aws_lb.network.arn
  port              = 443
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tcp.arn
  }
}
```

### Layer 7 (Application Layer)

**Characteristics:**
- Operates at HTTP/HTTPS level
- Content-based routing
- SSL termination
- Request inspection
- URL/header-based routing
- WebSocket support

**Use Cases:**
- HTTP/HTTPS applications
- Microservices routing
- A/B testing
- Canary deployments
- API gateways

**Example: AWS Application Load Balancer (ALB)**
```yaml
# ALB with path-based routing
resource "aws_lb" "application" {
  name               = "app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true
  enable_http2              = true
  enable_waf                = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    enabled = true
  }
}

resource "aws_lb_target_group" "api" {
  name     = "api-targets"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  deregistration_delay = 30
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.application.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# Path-based routing
resource "aws_lb_listener_rule" "api_v2" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_v2.arn
  }

  condition {
    path_pattern {
      values = ["/api/v2/*"]
    }
  }
}

# Header-based routing
resource "aws_lb_listener_rule" "canary" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.canary.arn
  }

  condition {
    http_header {
      http_header_name = "X-Canary-Version"
      values           = ["v2"]
    }
  }
}
```

### Global Load Balancers

**Characteristics:**
- Geographic distribution
- DNS-based routing
- Multi-region failover
- Latency-based routing

**Example: AWS Global Accelerator**
```hcl
resource "aws_globalaccelerator_accelerator" "main" {
  name            = "app-accelerator"
  ip_address_type = "IPV4"
  enabled         = true

  attributes {
    flow_logs_enabled   = true
    flow_logs_s3_bucket = aws_s3_bucket.flow_logs.id
  }
}

resource "aws_globalaccelerator_listener" "main" {
  accelerator_arn = aws_globalaccelerator_accelerator.main.id
  protocol        = "TCP"

  port_range {
    from_port = 443
    to_port   = 443
  }
}

resource "aws_globalaccelerator_endpoint_group" "us_east" {
  listener_arn = aws_globalaccelerator_listener.main.id
  endpoint_group_region = "us-east-1"

  health_check_interval_seconds = 30
  health_check_path            = "/health"
  health_check_port            = 443
  health_check_protocol        = "HTTPS"
  threshold_count              = 3
  traffic_dial_percentage      = 100

  endpoint_configuration {
    endpoint_id = aws_lb.us_east.arn
    weight      = 100
  }
}

resource "aws_globalaccelerator_endpoint_group" "eu_west" {
  listener_arn = aws_globalaccelerator_listener.main.id
  endpoint_group_region = "eu-west-1"

  traffic_dial_percentage = 100

  endpoint_configuration {
    endpoint_id = aws_lb.eu_west.arn
    weight      = 100
  }
}
```

## Load Balancing Algorithms

### Round Robin

**How it works:** Distributes requests sequentially across all servers.

**Pros:**
- Simple and fair distribution
- No state required
- Works well with identical servers

**Cons:**
- Doesn't account for server load
- Not suitable for varying server capacities

**Configuration:**
```nginx
upstream backend {
    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com;
}
```

### Weighted Round Robin

**How it works:** Distributes based on assigned weights.

```nginx
upstream backend {
    server backend1.example.com weight=3;  # Gets 3x traffic
    server backend2.example.com weight=2;  # Gets 2x traffic
    server backend3.example.com weight=1;  # Gets 1x traffic
}
```

### Least Connections

**How it works:** Routes to server with fewest active connections.

**Best for:** Long-lived connections, varying request durations

```nginx
upstream backend {
    least_conn;

    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com;
}
```

### IP Hash

**How it works:** Hash client IP to determine server.

**Best for:** Session persistence, sticky sessions

```nginx
upstream backend {
    ip_hash;

    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com;
}
```

### Consistent Hashing

**How it works:** Hash-based distribution with minimal disruption on server changes.

```haproxy
backend app_servers
    balance hdr(X-User-ID)
    hash-type consistent

    server app1 10.0.1.10:8080 check
    server app2 10.0.1.11:8080 check
    server app3 10.0.1.12:8080 check
```

## Health Checks

### Active Health Checks

**HTTP/HTTPS Health Checks:**
```yaml
# Kubernetes Liveness Probe
livenessProbe:
  httpGet:
    path: /health
    port: 8080
    httpHeaders:
    - name: X-Health-Check
      value: "true"
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
  successThreshold: 1

# Kubernetes Readiness Probe
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
  successThreshold: 1
```

**TCP Health Checks:**
```haproxy
backend mysql_servers
    mode tcp
    balance leastconn

    option tcp-check
    tcp-check connect port 3306

    server mysql1 10.0.1.20:3306 check inter 2s rise 2 fall 3
    server mysql2 10.0.1.21:3306 check inter 2s rise 2 fall 3
```

### Passive Health Checks

**Circuit Breaker Pattern:**
```nginx
upstream backend {
    server backend1.example.com max_fails=3 fail_timeout=30s;
    server backend2.example.com max_fails=3 fail_timeout=30s;
    server backend3.example.com max_fails=3 fail_timeout=30s;
}
```

## SSL/TLS Termination

### HAProxy SSL Termination

```haproxy
global
    maxconn 4096
    tune.ssl.default-dh-param 2048

frontend https_frontend
    bind *:443 ssl crt /etc/haproxy/certs/site.pem alpn h2,http/1.1

    # Security headers
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    http-response set-header X-Frame-Options "SAMEORIGIN"
    http-response set-header X-Content-Type-Options "nosniff"

    # Redirect HTTP to HTTPS
    redirect scheme https code 301 if !{ ssl_fc }

    default_backend app_servers

backend app_servers
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200

    server app1 10.0.1.10:8080 check
    server app2 10.0.1.11:8080 check
```

### Nginx SSL Termination

```nginx
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Session Persistence

### Cookie-Based Persistence

```haproxy
backend app_servers
    balance roundrobin

    # Insert cookie for session stickiness
    cookie SERVERID insert indirect nocache

    server app1 10.0.1.10:8080 check cookie app1
    server app2 10.0.1.11:8080 check cookie app2
    server app3 10.0.1.12:8080 check cookie app3
```

### Application-Controlled Sessions

```nginx
upstream backend {
    hash $cookie_session_id consistent;

    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com;
}
```

## Cloud Load Balancers

### AWS Load Balancer Comparison

```
Feature              ALB          NLB           GLB
Layer                7            4             4
Protocol             HTTP/HTTPS   TCP/UDP/TLS   Any IP
Routing              Content      Connection    Network
Static IP            No           Yes           No
PrivateLink          Yes          Yes           No
WebSocket            Yes          Yes           No
gRPC                 Yes          Yes           No
Lambda Target        Yes          No            No
```

### GCP Load Balancer

```yaml
# GCP HTTP(S) Load Balancer via Terraform
resource "google_compute_global_forwarding_rule" "https" {
  name       = "app-https-forwarding-rule"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.default.address
}

resource "google_compute_target_https_proxy" "default" {
  name             = "app-https-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_ssl_certificate.default.id]
}

resource "google_compute_url_map" "default" {
  name            = "app-url-map"
  default_service = google_compute_backend_service.default.id

  host_rule {
    hosts        = ["app.example.com"]
    path_matcher = "allpaths"
  }

  path_matcher {
    name            = "allpaths"
    default_service = google_compute_backend_service.default.id

    path_rule {
      paths   = ["/api/v2/*"]
      service = google_compute_backend_service.api_v2.id
    }
  }
}

resource "google_compute_backend_service" "default" {
  name          = "app-backend-service"
  protocol      = "HTTP"
  timeout_sec   = 30
  health_checks = [google_compute_health_check.default.id]

  backend {
    group           = google_compute_instance_group.us_central1.id
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }

  backend {
    group           = google_compute_instance_group.us_east1.id
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

resource "google_compute_health_check" "default" {
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

## HAProxy Configuration

```haproxy
global
    log /dev/log local0
    maxconn 4096
    user haproxy
    group haproxy
    daemon

    # SSL settings
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  http-server-close
    option  forwardfor except 127.0.0.0/8
    option  redispatch
    retries 3
    timeout connect 5000
    timeout client  50000
    timeout server  50000
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:password

frontend http_frontend
    bind *:80
    redirect scheme https code 301

frontend https_frontend
    bind *:443 ssl crt /etc/haproxy/certs/

    # Rate limiting
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt 100 }

    # ACLs for routing
    acl is_api path_beg /api
    acl is_admin path_beg /admin
    acl is_static path_end .jpg .png .css .js

    use_backend api_servers if is_api
    use_backend admin_servers if is_admin
    use_backend static_servers if is_static
    default_backend app_servers

backend app_servers
    balance roundrobin
    option httpchk GET /health HTTP/1.1\r\nHost:\ localhost
    http-check expect status 200

    server app1 10.0.1.10:8080 check inter 2s rise 2 fall 3 maxconn 1000
    server app2 10.0.1.11:8080 check inter 2s rise 2 fall 3 maxconn 1000
    server app3 10.0.1.12:8080 check inter 2s rise 2 fall 3 maxconn 1000

backend api_servers
    balance leastconn
    option httpchk GET /api/health

    server api1 10.0.2.10:8080 check
    server api2 10.0.2.11:8080 check
```

## Nginx Load Balancing

```nginx
http {
    upstream backend {
        least_conn;

        server backend1.example.com:8080 max_fails=3 fail_timeout=30s;
        server backend2.example.com:8080 max_fails=3 fail_timeout=30s;
        server backend3.example.com:8080 max_fails=3 fail_timeout=30s;

        # Backup server
        server backup.example.com:8080 backup;

        keepalive 32;
    }

    upstream api_backend {
        hash $request_uri consistent;

        server api1.example.com:8080;
        server api2.example.com:8080;

        keepalive 32;
    }

    server {
        listen 80;
        server_name app.example.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name app.example.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;

            # Buffering
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
        }

        location /api/ {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }

        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

## Kubernetes Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "route"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "86400"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api/v1
        pathType: Prefix
        backend:
          service:
            name: api-v1
            port:
              number: 8080
      - path: /api/v2
        pathType: Prefix
        backend:
          service:
            name: api-v2
            port:
              number: 8080
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

## Best Practices

1. **Always use health checks** - Detect and remove unhealthy instances
2. **Enable connection draining** - Allow in-flight requests to complete
3. **Use SSL/TLS termination** - Offload encryption from backends
4. **Implement rate limiting** - Protect against abuse and DDoS
5. **Enable access logs** - Debug issues and analyze traffic patterns
6. **Use appropriate timeouts** - Prevent resource exhaustion
7. **Configure proper session persistence** - When stateful sessions required
8. **Enable monitoring and metrics** - Track performance and errors
9. **Use multiple availability zones** - Ensure high availability
10. **Test failover regularly** - Verify redundancy works

## Anti-Patterns

- **Single load balancer** - Creates single point of failure
- **No health checks** - Sends traffic to failed instances
- **Overly aggressive health checks** - Can overload backends
- **No SSL/TLS** - Exposes traffic to interception
- **Hard-coded server IPs** - Makes scaling difficult
- **Insufficient connection limits** - Can exhaust resources
- **No monitoring** - Can't detect issues
- **Same health check and application port** - Can give false positives
- **No timeout configuration** - Leads to resource leaks
- **Ignoring connection draining** - Causes dropped requests during deployments
