# Networking Fundamentals

Comprehensive guide to Linux networking covering TCP/IP stack, DNS, load balancers, firewalls, routing, VPN, and network debugging tools for systems engineers.

## Table of Contents

- [TCP/IP Stack Overview](#tcpip-stack-overview)
- [Network Configuration](#network-configuration)
- [DNS Configuration](#dns-configuration)
- [Firewall Management](#firewall-management)
- [Routing and Bridging](#routing-and-bridging)
- [Load Balancers](#load-balancers)
- [VPN Configuration](#vpn-configuration)
- [Network Debugging Tools](#network-debugging-tools)
- [Network Performance Tuning](#network-performance-tuning)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)
- [Common Issues](#common-issues)

## TCP/IP Stack Overview

### Understanding the Layers

```
┌─────────────────────────────────────────┐
│   Application Layer (HTTP, SSH, DNS)   │
├─────────────────────────────────────────┤
│   Transport Layer (TCP, UDP)            │
├─────────────────────────────────────────┤
│   Network Layer (IP, ICMP)              │
├─────────────────────────────────────────┤
│   Link Layer (Ethernet, WiFi)           │
└─────────────────────────────────────────┘
```

### Network Namespaces

```bash
# Create network namespace
sudo ip netns add testns

# List namespaces
sudo ip netns list

# Execute command in namespace
sudo ip netns exec testns ip addr

# Create veth pair (virtual ethernet)
sudo ip link add veth0 type veth peer name veth1

# Move one end to namespace
sudo ip link set veth1 netns testns

# Configure interfaces
sudo ip addr add 10.0.0.1/24 dev veth0
sudo ip link set veth0 up

sudo ip netns exec testns ip addr add 10.0.0.2/24 dev veth1
sudo ip netns exec testns ip link set veth1 up

# Test connectivity
ping 10.0.0.2

# Delete namespace
sudo ip netns delete testns
```

## Network Configuration

### Modern Network Management (ip command)

```bash
# View all interfaces
ip addr show
ip link show

# View specific interface
ip addr show eth0

# Add IP address
sudo ip addr add 192.168.1.100/24 dev eth0

# Remove IP address
sudo ip addr del 192.168.1.100/24 dev eth0

# Bring interface up/down
sudo ip link set eth0 up
sudo ip link set eth0 down

# Set MTU
sudo ip link set eth0 mtu 9000

# View routing table
ip route show

# Add default route
sudo ip route add default via 192.168.1.1

# Add specific route
sudo ip route add 10.0.0.0/8 via 192.168.1.254

# Delete route
sudo ip route del 10.0.0.0/8

# View ARP table
ip neigh show

# Flush ARP cache
sudo ip neigh flush all
```

### Netplan Configuration (Ubuntu 18.04+)

```yaml
# /etc/netplan/01-network-config.yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
        search:
          - example.com
      routes:
        - to: 10.0.0.0/8
          via: 192.168.1.254

    eth1:
      dhcp4: true

  bonds:
    bond0:
      interfaces:
        - eth2
        - eth3
      parameters:
        mode: 802.3ad
        lacp-rate: fast
        mii-monitor-interval: 100
      addresses:
        - 10.0.1.10/24

  vlans:
    vlan100:
      id: 100
      link: eth0
      addresses:
        - 192.168.100.10/24
```

```bash
# Apply netplan configuration
sudo netplan try       # Test with 120s rollback
sudo netplan apply     # Apply permanently

# Generate configuration
sudo netplan generate

# Debug mode
sudo netplan --debug apply
```

### Legacy Network Configuration (ifupdown)

```bash
# /etc/network/interfaces
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4
    dns-search example.com

    # On boot commands
    up ip route add 10.0.0.0/8 via 192.168.1.254
    down ip route del 10.0.0.0/8

# Restart networking
sudo systemctl restart networking
sudo ifdown eth0 && sudo ifup eth0
```

## DNS Configuration

### systemd-resolved (Modern)

```bash
# Check DNS status
resolvectl status

# Query DNS
resolvectl query example.com

# Flush DNS cache
sudo resolvectl flush-caches

# View statistics
resolvectl statistics

# Configuration
cat /etc/systemd/resolved.conf
```

**systemd-resolved Configuration:**
```ini
# /etc/systemd/resolved.conf
[Resolve]
DNS=8.8.8.8 1.1.1.1
FallbackDNS=8.8.4.4 1.0.0.1
Domains=~.
DNSSEC=allow-downgrade
DNSOverTLS=opportunistic
Cache=yes
CacheFromLocalhost=no
```

```bash
# Restart resolver
sudo systemctl restart systemd-resolved
```

### Traditional DNS Configuration

```bash
# /etc/resolv.conf
nameserver 8.8.8.8
nameserver 8.8.4.4
search example.com internal.example.com
options timeout:2 attempts:3 rotate
```

### Local DNS with dnsmasq

```bash
# Install dnsmasq
sudo apt install dnsmasq

# Configuration
# /etc/dnsmasq.conf
domain-needed
bogus-priv
no-resolv
no-poll
server=8.8.8.8
server=8.8.4.4
cache-size=1000

# Local domain
local=/home.lan/
domain=home.lan

# Static hosts
address=/router.home.lan/192.168.1.1
address=/server.home.lan/192.168.1.10

# DHCP (if needed)
dhcp-range=192.168.1.100,192.168.1.200,12h
dhcp-option=option:router,192.168.1.1
dhcp-option=option:dns-server,192.168.1.1

# Restart dnsmasq
sudo systemctl restart dnsmasq
```

## Firewall Management

### iptables

**Basic Concepts:**
```bash
# Tables: filter (default), nat, mangle, raw
# Chains: INPUT, OUTPUT, FORWARD, PREROUTING, POSTROUTING
```

**View Rules:**
```bash
# List all rules
sudo iptables -L -v -n

# List with line numbers
sudo iptables -L -v -n --line-numbers

# List specific chain
sudo iptables -L INPUT -v -n

# List NAT rules
sudo iptables -t nat -L -v -n
```

**Basic Rules:**
```bash
# Default policies
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# Allow loopback
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow from specific IP
sudo iptables -A INPUT -s 192.168.1.0/24 -j ACCEPT

# Rate limiting (prevent brute force)
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP

# Delete rule by number
sudo iptables -D INPUT 5

# Insert rule at position
sudo iptables -I INPUT 1 -p tcp --dport 8080 -j ACCEPT
```

**NAT Configuration:**
```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf

# Source NAT (SNAT) / Masquerade
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Destination NAT (DNAT) / Port Forwarding
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.1.100:8080

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
# Or using iptables-persistent
sudo apt install iptables-persistent
sudo netfilter-persistent save
```

### firewalld (RHEL/CentOS/Fedora)

```bash
# Check status
sudo firewall-cmd --state
sudo systemctl status firewalld

# List zones
sudo firewall-cmd --get-zones
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --get-default-zone

# List all configuration
sudo firewall-cmd --list-all

# Add service
sudo firewall-cmd --add-service=http
sudo firewall-cmd --add-service=https
sudo firewall-cmd --runtime-to-permanent  # Make persistent

# Add port
sudo firewall-cmd --add-port=8080/tcp
sudo firewall-cmd --add-port=8080/tcp --permanent

# Add rich rule
sudo firewall-cmd --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" accept' --permanent

# Port forwarding
sudo firewall-cmd --add-forward-port=port=80:proto=tcp:toport=8080:toaddr=192.168.1.100 --permanent

# Reload firewall
sudo firewall-cmd --reload

# Create custom zone
sudo firewall-cmd --permanent --new-zone=custom
sudo firewall-cmd --reload
sudo firewall-cmd --zone=custom --add-service=ssh --permanent
```

### nftables (Modern Replacement)

```bash
# Install nftables
sudo apt install nftables

# Basic configuration
# /etc/nftables.conf
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow loopback
        iif lo accept

        # Allow established connections
        ct state established,related accept

        # Allow SSH
        tcp dport 22 accept

        # Allow HTTP/HTTPS
        tcp dport { 80, 443 } accept

        # Rate limit SSH
        tcp dport 22 ct state new limit rate 4/minute accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}

# NAT table
table inet nat {
    chain postrouting {
        type nat hook postrouting priority 100;
        oifname "eth0" masquerade
    }
}

# Enable nftables
sudo systemctl enable nftables
sudo systemctl start nftables

# List rules
sudo nft list ruleset

# Reload configuration
sudo nft -f /etc/nftables.conf
```

## Routing and Bridging

### Static Routing

```bash
# Add persistent route (via netplan on Ubuntu)
# See netplan configuration above

# Temporary route
sudo ip route add 10.20.0.0/16 via 192.168.1.254

# Multiple paths (load balancing)
sudo ip route add default \
    nexthop via 192.168.1.1 weight 1 \
    nexthop via 192.168.2.1 weight 1

# Policy-based routing
sudo ip rule add from 192.168.1.0/24 table 100
sudo ip route add default via 192.168.1.1 table 100
```

### Network Bridging

```bash
# Create bridge
sudo ip link add br0 type bridge

# Add interfaces to bridge
sudo ip link set eth0 master br0
sudo ip link set eth1 master br0

# Configure bridge
sudo ip addr add 192.168.1.10/24 dev br0
sudo ip link set br0 up

# Using netplan
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false

  bridges:
    br0:
      interfaces:
        - eth0
        - eth1
      dhcp4: false
      addresses:
        - 192.168.1.10/24
```

## Load Balancers

### HAProxy

**Installation:**
```bash
sudo apt install haproxy
```

**Configuration:**
```bash
# /etc/haproxy/haproxy.cfg
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon
    maxconn 4096

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  http-server-close
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

# Stats interface
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
    stats auth admin:password

# Frontend
frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/haproxy/certs/

    # Redirect HTTP to HTTPS
    redirect scheme https code 301 if !{ ssl_fc }

    # ACLs
    acl is_api path_beg /api
    acl is_static path_beg /static

    # Use backends
    use_backend api_back if is_api
    use_backend static_back if is_static
    default_backend web_back

# Backend - Web servers
backend web_back
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200

    server web1 192.168.1.101:8080 check
    server web2 192.168.1.102:8080 check
    server web3 192.168.1.103:8080 check backup

# Backend - API servers
backend api_back
    balance leastconn
    option httpchk GET /api/health

    server api1 192.168.1.111:3000 check
    server api2 192.168.1.112:3000 check

# Backend - Static content
backend static_back
    balance source
    server static1 192.168.1.121:80 check
```

```bash
# Test configuration
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Restart HAProxy
sudo systemctl restart haproxy

# View stats
curl http://localhost:8404/stats
```

### nginx Load Balancer

```nginx
# /etc/nginx/nginx.conf
http {
    upstream web_backend {
        least_conn;  # or: ip_hash, round_robin (default)

        server 192.168.1.101:8080 weight=3;
        server 192.168.1.102:8080 weight=2;
        server 192.168.1.103:8080 backup;

        # Health checks (nginx Plus)
        # health_check interval=5s fails=3 passes=2;
    }

    upstream api_backend {
        ip_hash;  # Session persistence

        server 192.168.1.111:3000 max_fails=3 fail_timeout=30s;
        server 192.168.1.112:3000 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            proxy_pass http://web_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        location /api {
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## VPN Configuration

### WireGuard

**Installation:**
```bash
sudo apt install wireguard
```

**Server Configuration:**
```bash
# Generate keys
wg genkey | sudo tee /etc/wireguard/private.key
sudo chmod 600 /etc/wireguard/private.key
sudo cat /etc/wireguard/private.key | wg pubkey | sudo tee /etc/wireguard/public.key

# Server config
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <server_private_key>
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Client 1
[Peer]
PublicKey = <client1_public_key>
AllowedIPs = 10.0.0.2/32

# Client 2
[Peer]
PublicKey = <client2_public_key>
AllowedIPs = 10.0.0.3/32

# Enable IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Start WireGuard
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

**Client Configuration:**
```bash
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.0.0.2/24
PrivateKey = <client_private_key>
DNS = 8.8.8.8

[Peer]
PublicKey = <server_public_key>
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0  # Route all traffic through VPN
# Or: AllowedIPs = 10.0.0.0/24  # Only VPN network
PersistentKeepalive = 25

# Connect
sudo wg-quick up wg0
sudo wg-quick down wg0
```

## Network Debugging Tools

### tcpdump

```bash
# Capture on interface
sudo tcpdump -i eth0

# Write to file
sudo tcpdump -i eth0 -w capture.pcap

# Read from file
tcpdump -r capture.pcap

# Filter by host
sudo tcpdump -i eth0 host 192.168.1.100

# Filter by port
sudo tcpdump -i eth0 port 80
sudo tcpdump -i eth0 'port 80 or port 443'

# Filter by protocol
sudo tcpdump -i eth0 icmp
sudo tcpdump -i eth0 tcp

# Complex filters
sudo tcpdump -i eth0 'tcp port 80 and (src 192.168.1.0/24 or dst 192.168.1.0/24)'

# Show packet contents
sudo tcpdump -i eth0 -X  # Hex and ASCII
sudo tcpdump -i eth0 -A  # ASCII only

# Limit packet count
sudo tcpdump -i eth0 -c 100
```

### ss (Socket Statistics)

```bash
# Replace netstat with ss
ss -tuln  # TCP/UDP listening ports

# All sockets
ss -a

# TCP sockets
ss -t

# Listening sockets
ss -l

# Show process
ss -p

# Show statistics
ss -s

# Filter by state
ss state established
ss state time-wait

# Filter by port
ss -t dst :80
ss -t src :22

# Show timer information
ss -o
```

### Other Debugging Tools

```bash
# Ping
ping -c 4 example.com
ping -i 0.2 -c 10 192.168.1.1  # Fast ping

# Traceroute
traceroute example.com
mtr example.com  # Better traceroute

# DNS lookup
nslookup example.com
dig example.com
dig +short example.com
dig @8.8.8.8 example.com  # Specific nameserver

# Test TCP connection
telnet example.com 80
nc -zv example.com 80  # netcat

# HTTP testing
curl -v http://example.com
curl -I http://example.com  # Headers only

# Network statistics
netstat -i  # Interface statistics
ip -s link  # Modern alternative

# ARP
arp -a
ip neigh show
```

## Network Performance Tuning

### TCP/IP Tuning

```bash
# /etc/sysctl.d/99-network-tuning.conf

# Increase buffer sizes
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# TCP window scaling
net.ipv4.tcp_window_scaling = 1

# TCP fast open
net.ipv4.tcp_fastopen = 3

# Congestion control (BBR recommended)
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# SYN backlog
net.ipv4.tcp_max_syn_backlog = 8192
net.core.somaxconn = 4096

# Connection tracking
net.netfilter.nf_conntrack_max = 1000000
net.nf_conntrack_max = 1000000

# TIME_WAIT sockets
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Apply settings
sudo sysctl -p /etc/sysctl.d/99-network-tuning.conf
```

## Best Practices

1. **Security:**
   - Default deny firewall policy
   - Use SSH keys, disable password authentication
   - Regular security updates
   - Monitor network traffic

2. **DNS:**
   - Use multiple DNS servers
   - Local DNS caching
   - Monitor DNS resolution times

3. **Load Balancing:**
   - Health checks on all backends
   - Graceful degradation (backup servers)
   - Monitor backend performance
   - Use SSL/TLS termination at load balancer

4. **VPN:**
   - Use modern protocols (WireGuard)
   - Rotate keys periodically
   - Monitor VPN connections
   - Use split tunneling when appropriate

5. **Monitoring:**
   - Monitor bandwidth usage
   - Track packet loss
   - Monitor connection states
   - Alert on anomalies

## Anti-Patterns

### ❌ No Firewall

```bash
# BAD - All ports open
sudo iptables -F
sudo iptables -P INPUT ACCEPT
```

### ❌ Single Point of Failure

```bash
# BAD - Only one DNS server
nameserver 8.8.8.8

# GOOD - Multiple DNS servers
nameserver 8.8.8.8
nameserver 8.8.4.4
```

### ❌ No Connection Tracking

```bash
# BAD - Stateless rules
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# GOOD - Stateful firewall
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT
```

### ❌ Hardcoded IP Addresses

```bash
# BAD - IP addresses in application
# Use DNS names instead
```

## Common Issues

**Cannot reach external network:**
```bash
# Check default route
ip route show

# Check DNS
resolvectl status
ping 8.8.8.8  # Test by IP
ping google.com  # Test by name

# Check firewall
sudo iptables -L -v -n
```

**High latency:**
```bash
# Check with mtr
mtr example.com

# Check interface errors
ip -s link show eth0

# Check congestion control
sysctl net.ipv4.tcp_congestion_control
```

**Connection timeouts:**
```bash
# Check if port is open
sudo ss -tuln | grep :80

# Check firewall
sudo iptables -L INPUT -v -n

# Test from remote
nc -zv server.example.com 80
```

---

**Related Topics:**
- See [security-hardening.md](security-hardening.md) for firewall security
- See [performance-tuning.md](performance-tuning.md) for network performance
- See [troubleshooting-guide.md](troubleshooting-guide.md) for network debugging
- See [system-monitoring.md](system-monitoring.md) for network monitoring
