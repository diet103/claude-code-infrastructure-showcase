# TCP/IP Protocols

Comprehensive guide to TCP/IP protocols covering OSI model, TCP/UDP, IP addressing, subnetting, CIDR, routing protocols, and packet flow analysis.

## OSI and TCP/IP Models

### Layer Comparison

```
OSI Model          TCP/IP Model      Protocols/Examples
─────────────────────────────────────────────────────────
7. Application  ┐
6. Presentation │→ Application     HTTP, HTTPS, FTP, SSH,
5. Session      ┘                  DNS, SMTP, TLS

4. Transport    → Transport        TCP, UDP, SCTP

3. Network      → Internet         IP, ICMP, IGMP, IPsec

2. Data Link    ┐
1. Physical     ┘→ Network Access  Ethernet, WiFi, ARP
```

## Transport Layer Protocols

### TCP (Transmission Control Protocol)

**Characteristics:**
- Connection-oriented
- Reliable delivery (acknowledgments)
- Ordered delivery
- Flow control
- Congestion control

**Three-Way Handshake:**
```
Client                Server
  │                     │
  │──── SYN ───────────→│  (Sequence = X)
  │                     │
  │←─── SYN-ACK ───────│  (Sequence = Y, Ack = X+1)
  │                     │
  │──── ACK ───────────→│  (Ack = Y+1)
  │                     │
  │   Connection Open   │
```

**TCP Header:**
```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
├───────────────────────────────────────────────────────────────┤
│          Source Port          │       Destination Port        │
├───────────────────────────────────────────────────────────────┤
│                        Sequence Number                        │
├───────────────────────────────────────────────────────────────┤
│                    Acknowledgment Number                      │
├───────┬───┬───────┬───────────────────────────────────────────┤
│Offset │Res│ Flags │          Window Size                      │
├───────┴───┴───────┼───────────────────────────────────────────┤
│      Checksum     │        Urgent Pointer                     │
└───────────────────┴───────────────────────────────────────────┘

Flags: URG, ACK, PSH, RST, SYN, FIN
```

### UDP (User Datagram Protocol)

**Characteristics:**
- Connectionless
- No reliability guarantees
- No ordering
- Low overhead
- Fast

**UDP Header (8 bytes):**
```
 0      7 8     15 16    23 24    31
├────────┼────────┼────────┼────────┤
│ Source │  Dest  │ Length │Checksum│
│  Port  │  Port  │        │        │
└────────┴────────┴────────┴────────┘
```

**Use Cases:**
- DNS queries
- Video streaming (loss acceptable)
- Gaming (low latency critical)
- VoIP
- IoT sensors

## Network Layer (IP)

### IPv4

**IPv4 Address:**
```
Format: 32 bits (4 octets)
Example: 192.168.1.100
Binary: 11000000.10101000.00000001.01100100
```

**IPv4 Classes:**
```
Class A: 0.0.0.0     - 127.255.255.255  (/8)   16M hosts
Class B: 128.0.0.0   - 191.255.255.255  (/16)  65K hosts
Class C: 192.0.0.0   - 223.255.255.255  (/24)  254 hosts
Class D: 224.0.0.0   - 239.255.255.255  (Multicast)
Class E: 240.0.0.0   - 255.255.255.255  (Reserved)
```

**Private IP Ranges (RFC 1918):**
```
10.0.0.0      - 10.255.255.255    (10.0.0.0/8)     16M IPs
172.16.0.0    - 172.31.255.255    (172.16.0.0/12)  1M IPs
192.168.0.0   - 192.168.255.255   (192.168.0.0/16) 65K IPs
```

### IPv6

**IPv6 Address:**
```
Format: 128 bits (8 groups of 4 hex digits)
Example: 2001:0db8:85a3:0000:0000:8a2e:0370:7334

Compressed: 2001:db8:85a3::8a2e:370:7334
(Leading zeros omitted, :: replaces consecutive zeros)
```

**IPv6 Types:**
```
Global Unicast:    2000::/3  (Internet routable)
Link-Local:        fe80::/10 (Local network only)
Unique Local:      fc00::/7  (Private, like RFC 1918)
Multicast:         ff00::/8
Loopback:          ::1/128
Unspecified:       ::/128
```

## Subnetting and CIDR

### Subnet Mask

```
Subnet Mask: 255.255.255.0 = /24
Binary: 11111111.11111111.11111111.00000000

Network portion: First 24 bits
Host portion: Last 8 bits
Total hosts: 2^8 - 2 = 254 usable
```

### CIDR Notation

```
CIDR    Subnet Mask      Hosts    Subnet Count
/8      255.0.0.0        16,777,214    1
/16     255.255.0.0      65,534       256
/24     255.255.255.0    254          65,536
/25     255.255.255.128  126          131,072
/26     255.255.255.192  62           262,144
/27     255.255.255.224  30           524,288
/28     255.255.255.240  14           1,048,576
/29     255.255.255.248  6            2,097,152
/30     255.255.255.252  2            4,194,304
/32     255.255.255.255  1 (host)     -
```

### Subnetting Example

**Subnet 192.168.1.0/24 into 4 equal subnets:**
```
Original: 192.168.1.0/24 (254 hosts)
New mask: /26 (2 borrowed bits, 2^2 = 4 subnets)

Subnet 1: 192.168.1.0/26   (192.168.1.1   - 192.168.1.62)
Subnet 2: 192.168.1.64/26  (192.168.1.65  - 192.168.1.126)
Subnet 3: 192.168.1.128/26 (192.168.1.129 - 192.168.1.190)
Subnet 4: 192.168.1.192/26 (192.168.1.193 - 192.168.1.254)

Each subnet: 64 IPs (62 usable)
```

### VLSM (Variable Length Subnet Mask)

```
Network: 192.168.1.0/24

Requirements:
- Sales: 100 hosts → /25 (126 hosts)
- IT: 50 hosts → /26 (62 hosts)
- HR: 20 hosts → /27 (30 hosts)
- Mgmt: 10 hosts → /28 (14 hosts)

Allocation:
Sales:  192.168.1.0/25    (192.168.1.0   - 192.168.1.127)
IT:     192.168.1.128/26  (192.168.1.128 - 192.168.1.191)
HR:     192.168.1.192/27  (192.168.1.192 - 192.168.1.223)
Mgmt:   192.168.1.224/28  (192.168.1.224 - 192.168.1.239)
```

## ICMP (Internet Control Message Protocol)

### Common ICMP Types

```
Type 0:  Echo Reply (Ping response)
Type 3:  Destination Unreachable
Type 5:  Redirect
Type 8:  Echo Request (Ping)
Type 11: Time Exceeded (TTL=0)
Type 30: Traceroute
```

### Ping Example

```bash
$ ping -c 4 8.8.8.8

PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=117 time=12.3 ms
64 bytes from 8.8.8.8: icmp_seq=2 ttl=117 time=11.8 ms
64 bytes from 8.8.8.8: icmp_seq=3 ttl=117 time=12.1 ms
64 bytes from 8.8.8.8: icmp_seq=4 ttl=117 time=12.0 ms

--- 8.8.8.8 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 11.849/12.050/12.301/0.174 ms
```

### Traceroute

```bash
$ traceroute google.com

 1  gateway (192.168.1.1)  1.234 ms
 2  10.0.0.1 (10.0.0.1)  8.456 ms
 3  isp-router.net (203.0.113.1)  12.789 ms
 4  * * *  (timeout)
 5  google-peer.net (172.217.1.1)  15.234 ms
 6  google.com (142.250.185.46)  16.123 ms
```

## Routing Protocols

### Static Routing

```bash
# Linux
ip route add 10.0.2.0/24 via 10.0.1.1

# Cisco
ip route 10.0.2.0 255.255.255.0 10.0.1.1

# Default route
ip route add default via 192.168.1.1
```

### Dynamic Routing Protocols

**RIP (Routing Information Protocol):**
- Distance vector protocol
- Metric: Hop count (max 15)
- Updates every 30 seconds
- Legacy, rarely used

**OSPF (Open Shortest Path First):**
- Link-state protocol
- Metric: Cost (based on bandwidth)
- Fast convergence
- Scalable (areas)
- Widely used in enterprises

**BGP (Border Gateway Protocol):**
- Path vector protocol
- Metric: AS path, policies
- Internet routing protocol
- Scalable to internet size

### OSPF Areas

```
┌────────────────────────────────────┐
│         Backbone Area 0            │
│         (All routers)              │
└──────┬─────────┬──────────┬────────┘
       │         │          │
   ┌───▼───┐ ┌───▼───┐  ┌───▼───┐
   │Area 1 │ │Area 2 │  │Area 3 │
   │       │ │       │  │       │
   └───────┘ └───────┘  └───────┘
```

## Packet Flow Analysis

### TCP Packet Capture

```bash
# Capture with tcpdump
sudo tcpdump -i eth0 -nn port 80

# Sample output
12:34:56.789012 IP 192.168.1.100.51234 > 93.184.216.34.80: Flags [S], seq 123456, win 65535
12:34:56.801234 IP 93.184.216.34.80 > 192.168.1.100.51234: Flags [S.], seq 789012, ack 123457, win 65535
12:34:56.801456 IP 192.168.1.100.51234 > 93.184.216.34.80: Flags [.], ack 789013, win 65535
12:34:56.801678 IP 192.168.1.100.51234 > 93.184.216.34.80: Flags [P.], seq 123457:123557
```

### HTTP Request Flow

```
1. DNS Resolution
   Client → DNS Server: "What is example.com?"
   DNS Server → Client: "93.184.216.34"

2. TCP Handshake
   Client → Server: SYN
   Server → Client: SYN-ACK
   Client → Server: ACK

3. HTTP Request
   Client → Server: GET / HTTP/1.1
                    Host: example.com

4. HTTP Response
   Server → Client: HTTP/1.1 200 OK
                    Content-Type: text/html
                    <html>...</html>

5. Connection Close
   Client → Server: FIN
   Server → Client: ACK
   Server → Client: FIN
   Client → Server: ACK
```

## Network Address Translation (NAT)

### NAT Types

**SNAT (Source NAT):**
```
Internal → External
10.0.1.5:12345 → 203.0.113.1:54321
(Private IP → Public IP)
```

**DNAT (Destination NAT / Port Forwarding):**
```
External → Internal
203.0.113.1:80 → 10.0.1.10:8080
(Public → Private web server)
```

**PAT (Port Address Translation):**
```
Multiple internal hosts share one public IP
10.0.1.5:12345 → 203.0.113.1:54321
10.0.1.6:12346 → 203.0.113.1:54322
10.0.1.7:12347 → 203.0.113.1:54323
```

## Quality of Service (QoS)

### DSCP (Differentiated Services Code Point)

```
ToS Field in IP Header (8 bits)
┌──────────┬────┐
│ DSCP (6) │ECN │
└──────────┴────┘

DSCP Values:
EF (Expedited Forwarding): 46 - VoIP, real-time
AF41 (Assured Forwarding): 34 - Video
AF31: 26 - High-priority data
BE (Best Effort): 0 - Default
```

### Traffic Shaping

```bash
# Linux tc (traffic control)
tc qdisc add dev eth0 root tbf rate 1mbit burst 32kbit latency 400ms

# Prioritize SSH traffic
tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
   match ip dport 22 0xffff flowid 1:1
```

## Protocol Encapsulation

### Packet Structure

```
┌─────────────────────────────────────┐
│      Ethernet Header (14 bytes)     │
├─────────────────────────────────────┤
│      IP Header (20+ bytes)          │
├─────────────────────────────────────┤
│      TCP Header (20+ bytes)         │
├─────────────────────────────────────┤
│      Application Data               │
└─────────────────────────────────────┘

MTU: 1500 bytes (Ethernet)
MSS: 1460 bytes (MTU - IP - TCP headers)
```

### Tunneling Protocols

**GRE (Generic Routing Encapsulation):**
```
┌──────────┐
│ Outer IP │
├──────────┤
│   GRE    │
├──────────┤
│ Inner IP │
├──────────┤
│   Data   │
└──────────┘
```

**IPsec:**
```
Transport Mode:
┌──────────┬─────────┬──────────┐
│ IP Header│ESP/AH   │ Payload  │
└──────────┴─────────┴──────────┘

Tunnel Mode:
┌──────────┬────────┬──────────┬──────────┐
│ New IP   │ESP/AH  │ Orig IP  │ Payload  │
└──────────┴────────┴──────────┴──────────┘
```

---

**Related Topics:**
- See [network-architecture.md](network-architecture.md) for network design
- See [routing-switching.md](routing-switching.md) for routing protocols
- See [network-troubleshooting.md](network-troubleshooting.md) for packet analysis
- See [vpn-connectivity.md](vpn-connectivity.md) for VPN protocols
