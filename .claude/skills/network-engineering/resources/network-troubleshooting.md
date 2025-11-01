# Network Troubleshooting

Comprehensive guide to network troubleshooting covering debugging tools, packet analysis, latency issues, connectivity problems, and systematic troubleshooting methodologies.

## Table of Contents

- [Overview](#overview)
- [Troubleshooting Methodology](#troubleshooting-methodology)
- [Basic Network Tools](#basic-network-tools)
- [Packet Analysis](#packet-analysis)
- [DNS Troubleshooting](#dns-troubleshooting)
- [Connection Issues](#connection-issues)
- [Latency and Performance](#latency-and-performance)
- [Cloud Network Debugging](#cloud-network-debugging)
- [Kubernetes Network Troubleshooting](#kubernetes-network-troubleshooting)
- [Common Issues](#common-issues)
- [Best Practices](#best-practices)

## Overview

Systematic network troubleshooting requires understanding network layers, using appropriate tools, and following a methodical approach to isolate and resolve issues.

**OSI Model Troubleshooting Approach:**
```
Layer 7 - Application   → Check application logs, API responses
Layer 4 - Transport     → Verify TCP/UDP connectivity, port access
Layer 3 - Network       → Test IP routing, ping, traceroute
Layer 2 - Data Link     → Check ARP, MAC addresses, switches
Layer 1 - Physical      → Verify cables, interfaces, link status
```

## Troubleshooting Methodology

### Step-by-Step Process

1. **Define the problem** - What exactly isn't working?
2. **Gather information** - When did it start? What changed?
3. **Identify the scope** - Single user, subnet, or entire network?
4. **Develop hypothesis** - What layer/component might be failing?
5. **Test hypothesis** - Use tools to verify or disprove
6. **Implement solution** - Fix the root cause
7. **Verify resolution** - Confirm problem is resolved
8. **Document** - Record issue and resolution

### Divide and Conquer

```
Problem: Can't access website

Test 1: Can you reach the internet?
  ├─ No  → Check local network, gateway
  └─ Yes → Continue

Test 2: Can you resolve DNS?
  ├─ No  → Check DNS servers, resolv.conf
  └─ Yes → Continue

Test 3: Can you reach the IP?
  ├─ No  → Check routing, firewall
  └─ Yes → Continue

Test 4: Can you connect to the port?
  ├─ No  → Check firewall, service status
  └─ Yes → Check application layer
```

## Basic Network Tools

### ping

```bash
# Basic ping
ping 8.8.8.8

# Limited count
ping -c 4 google.com

# Larger packet size
ping -s 1400 google.com

# Flood ping (root required)
sudo ping -f 192.168.1.1

# Set TTL
ping -t 10 example.com

# IPv6
ping6 2001:4860:4860::8888
```

### traceroute / tracepath

```bash
# Trace route to destination
traceroute google.com

# Use ICMP instead of UDP
traceroute -I google.com

# Set max hops
traceroute -m 20 google.com

# No DNS resolution (faster)
traceroute -n 8.8.8.8

# tracepath (no root required)
tracepath google.com
```

### mtr (My TraceRoute)

```bash
# Interactive view
mtr google.com

# Report mode (50 packets)
mtr -r -c 50 google.com

# Both TCP and ICMP
mtr --tcp -P 443 google.com

# CSV output
mtr --csv google.com

# No DNS resolution
mtr -n 8.8.8.8
```

### netstat / ss

```bash
# Show all listening ports
netstat -tuln
ss -tuln

# Show all connections
netstat -tan
ss -tan

# Show process using port
netstat -tulnp
ss -tulnp

# Show routing table
netstat -r
ip route show

# Show statistics
netstat -s
ss -s

# Show specific protocol
ss -t  # TCP only
ss -u  # UDP only
```

### ip commands

```bash
# Show all interfaces
ip addr show
ip a

# Show specific interface
ip addr show eth0

# Show routing table
ip route show
ip route get 8.8.8.8

# Show ARP table
ip neigh show

# Show link status
ip link show

# Show statistics
ip -s link show eth0

# Add route
ip route add 192.168.1.0/24 via 10.0.0.1

# Delete route
ip route del 192.168.1.0/24
```

### nmap

```bash
# Scan common ports
nmap example.com

# Scan specific ports
nmap -p 80,443 example.com

# Scan port range
nmap -p 1-1000 example.com

# Service version detection
nmap -sV example.com

# OS detection
sudo nmap -O example.com

# Scan subnet
nmap 192.168.1.0/24

# Fast scan (top 100 ports)
nmap -F example.com

# Scan with no ping (if ICMP blocked)
nmap -Pn example.com
```

## Packet Analysis

### tcpdump

```bash
# Capture on interface
tcpdump -i eth0

# Capture to file
tcpdump -i eth0 -w capture.pcap

# Read from file
tcpdump -r capture.pcap

# Filter by host
tcpdump host 192.168.1.100

# Filter by port
tcpdump port 80

# Filter by protocol
tcpdump tcp
tcpdump udp
tcpdump icmp

# Complex filter
tcpdump 'tcp port 80 and (host 192.168.1.100 or host 192.168.1.101)'

# Show packet contents (hex and ASCII)
tcpdump -X

# Verbose output
tcpdump -v
tcpdump -vv
tcpdump -vvv

# Don't resolve hostnames (faster)
tcpdump -n

# Capture specific number of packets
tcpdump -c 100

# Capture only SYN packets
tcpdump 'tcp[tcpflags] & (tcp-syn) != 0'

# Capture HTTP GET requests
tcpdump -s 0 -A 'tcp dst port 80 and tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x47455420'
```

### Wireshark Filters

```
# Display filters
http
http.request.method == "POST"
tcp.port == 443
ip.src == 192.168.1.100
ip.dst == 10.0.0.1

# Filter by protocol
dns
tls
ssh

# Filter TCP flags
tcp.flags.syn == 1
tcp.flags.reset == 1

# Follow TCP stream
Right-click packet → Follow → TCP Stream

# Filter retransmissions
tcp.analysis.retransmission

# Filter slow connections
tcp.time_delta > 0.1
```

### tshark (Wireshark CLI)

```bash
# Capture and display
tshark -i eth0

# Capture to file
tshark -i eth0 -w capture.pcap

# Read and filter
tshark -r capture.pcap -Y "http.request.method == GET"

# Show specific fields
tshark -r capture.pcap -T fields -e ip.src -e ip.dst -e tcp.port

# Statistics
tshark -r capture.pcap -q -z io,stat,1

# Protocol hierarchy
tshark -r capture.pcap -q -z io,phs

# Conversations
tshark -r capture.pcap -q -z conv,tcp
```

## DNS Troubleshooting

### dig

```bash
# Basic query
dig example.com

# Query specific record type
dig example.com A
dig example.com AAAA
dig example.com MX
dig example.com NS
dig example.com TXT

# Query specific DNS server
dig @8.8.8.8 example.com

# Short answer
dig +short example.com

# Reverse DNS lookup
dig -x 8.8.8.8

# Trace DNS resolution
dig +trace example.com

# No recursion (query authoritative only)
dig +norecurse example.com

# Show TTL
dig +ttlid example.com

# Check DNSSEC
dig +dnssec example.com
```

### nslookup

```bash
# Basic lookup
nslookup example.com

# Query specific server
nslookup example.com 8.8.8.8

# Interactive mode
nslookup
> server 8.8.8.8
> example.com
> set type=MX
> example.com
> exit
```

### host

```bash
# Basic query
host example.com

# Specific record type
host -t MX example.com
host -t NS example.com

# Reverse lookup
host 8.8.8.8

# Verbose output
host -v example.com
```

## Connection Issues

### telnet

```bash
# Test TCP connection
telnet example.com 80
telnet 192.168.1.100 3306

# If successful, you can send commands
# For HTTP:
GET / HTTP/1.1
Host: example.com
```

### nc (netcat)

```bash
# Test TCP connection
nc -zv example.com 80

# Scan port range
nc -zv example.com 20-100

# Test UDP
nc -zuv example.com 53

# Listen on port (server)
nc -l 8080

# Connect to port (client)
nc localhost 8080

# Transfer file
# Receiver:
nc -l 9999 > received_file
# Sender:
nc receiver_ip 9999 < file_to_send
```

### curl

```bash
# Test HTTP connection
curl -I https://example.com

# Verbose output
curl -v https://example.com

# Show timing
curl -w "@curl-format.txt" -o /dev/null -s https://example.com

# curl-format.txt content:
# time_namelookup: %{time_namelookup}s
# time_connect: %{time_connect}s
# time_appconnect: %{time_appconnect}s
# time_pretransfer: %{time_pretransfer}s
# time_redirect: %{time_redirect}s
# time_starttransfer: %{time_starttransfer}s
# time_total: %{time_total}s

# Test with specific source IP
curl --interface 192.168.1.100 https://example.com

# Follow redirects
curl -L https://example.com

# Test SSL/TLS
curl -v --tlsv1.2 https://example.com
```

## Latency and Performance

### iperf3

```bash
# Server mode
iperf3 -s

# Client mode (default TCP)
iperf3 -c server_ip

# UDP test
iperf3 -c server_ip -u -b 1G

# Reverse mode (server sends)
iperf3 -c server_ip -R

# Bidirectional test
iperf3 -c server_ip --bidir

# Specify duration
iperf3 -c server_ip -t 60

# JSON output
iperf3 -c server_ip -J
```

### hping3

```bash
# ICMP ping
sudo hping3 -1 example.com

# SYN flood test (for testing firewalls)
sudo hping3 -S -p 80 --flood example.com

# Traceroute with TCP
sudo hping3 -S -p 80 --traceroute example.com

# Test firewall
sudo hping3 -S -p 22 192.168.1.1
```

## Cloud Network Debugging

### AWS VPC Flow Logs

```bash
# Query Flow Logs with AWS CLI
aws ec2 describe-flow-logs

# Enable VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxxxx \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flowlogs

# Query with CloudWatch Insights
fields @timestamp, srcAddr, dstAddr, srcPort, dstPort, protocol, bytes
| filter dstPort = 443
| sort @timestamp desc
| limit 100
```

### AWS Reachability Analyzer

```bash
# Create network path analysis
aws ec2 create-network-insights-path \
  --source eni-xxxxx \
  --destination eni-yyyyy \
  --protocol tcp \
  --destination-port 443

# Analyze path
aws ec2 start-network-insights-analysis \
  --network-insights-path-id nip-xxxxx
```

### GCP Network Monitoring

```bash
# VPC Flow Logs query
gcloud logging read "resource.type=gce_subnetwork" \
  --limit 50 \
  --format json

# Connectivity test
gcloud network-management connectivity-tests create test-name \
  --source-instance=instance-1 \
  --destination-ip-address=10.0.0.100 \
  --protocol=TCP \
  --destination-port=443
```

## Kubernetes Network Troubleshooting

### Pod Connectivity

```bash
# Execute in pod
kubectl exec -it pod-name -- /bin/sh

# Test DNS
kubectl exec pod-name -- nslookup kubernetes.default

# Test service connectivity
kubectl exec pod-name -- curl http://service-name

# Debug with temporary pod
kubectl run tmp-shell --rm -i --tty --image nicolaka/netshoot -- /bin/bash

# Inside debug pod:
ping service-name
curl http://service-name
nslookup service-name
traceroute service-name
```

### Network Policies

```bash
# List network policies
kubectl get networkpolicies

# Describe policy
kubectl describe networkpolicy policy-name

# Test connectivity with netshoot
kubectl run test-$RANDOM --rm -i -t --image=nicolaka/netshoot -- /bin/bash
```

### Service Debugging

```bash
# Check service
kubectl get svc service-name

# Check endpoints
kubectl get endpoints service-name

# Describe service
kubectl describe svc service-name

# Check if service has endpoints
kubectl get endpoints service-name -o jsonpath='{.subsets[*].addresses[*].ip}'

# Port forward for testing
kubectl port-forward svc/service-name 8080:80
```

### DNS Debugging

```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# Test DNS from pod
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup kubernetes.default

# Check DNS config
kubectl exec pod-name -- cat /etc/resolv.conf
```

## Common Issues

### Issue: Cannot ping host

```bash
# Check if host is up
ping 192.168.1.100

# Check routing
ip route get 192.168.1.100

# Check ARP
ip neigh show

# Check firewall
sudo iptables -L -n
sudo ufw status

# Check if ICMP is blocked
sudo hping3 -1 192.168.1.100
```

### Issue: DNS not resolving

```bash
# Check DNS servers
cat /etc/resolv.conf

# Test with different DNS server
dig @8.8.8.8 example.com

# Check DNS resolution
nslookup example.com

# Test with specific record type
dig example.com A
dig example.com AAAA

# Flush DNS cache
# Ubuntu:
sudo systemd-resolve --flush-caches
# macOS:
sudo dscacheutil -flushcache
```

### Issue: Connection timeout

```bash
# Check if port is open
telnet example.com 80
nc -zv example.com 80

# Check firewall
sudo iptables -L -n | grep 80

# Check if service is listening
sudo netstat -tulnp | grep :80

# Trace route
traceroute example.com

# Check for packet loss
mtr example.com
```

### Issue: Intermittent connectivity

```bash
# Continuous ping
ping -i 0.2 8.8.8.8

# Monitor with mtr
mtr --report-cycles 1000 example.com

# Check for high latency
ping -c 100 example.com | tail -1

# Monitor interface errors
watch -n 1 'ip -s link show eth0'

# Check system logs
journalctl -u NetworkManager
dmesg | grep -i network
```

### Issue: Slow network performance

```bash
# Test bandwidth
iperf3 -c server_ip

# Check interface speed
ethtool eth0

# Check for duplex mismatch
ethtool eth0 | grep -i duplex

# Monitor bandwidth usage
iftop -i eth0
nethogs

# Check MTU
ip link show eth0 | grep mtu

# Test with different packet sizes
ping -s 1400 -M do example.com  # Test MTU
```

## Best Practices

1. **Use systematic approach** - Follow OSI model, bottom-up or top-down
2. **Document baseline** - Know normal network behavior
3. **Check recent changes** - Often the cause of issues
4. **Use appropriate tools** - Don't use ping for everything
5. **Check both sides** - Client and server perspectives
6. **Verify DNS first** - Common source of issues
7. **Check firewalls** - Security groups, iptables, cloud FW
8. **Monitor continuously** - Don't wait for issues
9. **Keep logs** - Enable flow logs, connection logs
10. **Test incrementally** - Isolate the problem layer by layer
