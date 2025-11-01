# Software-Defined Networking (SDN)

Comprehensive guide to software-defined networking covering SDN architecture, network overlays, Kubernetes CNI plugins (Calico, Cilium), network policies, and modern networking paradigms.

## Table of Contents

- [Overview](#overview)
- [SDN Architecture](#sdn-architecture)
- [Network Overlays](#network-overlays)
- [Kubernetes CNI](#kubernetes-cni)
- [Calico](#calico)
- [Cilium](#cilium)
- [Flannel](#flannel)
- [Network Policies](#network-policies)
- [Service Discovery](#service-discovery)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

## Overview

Software-Defined Networking (SDN) separates the control plane from the data plane, enabling programmatic network management and dynamic configuration.

**Key Benefits:**
- Centralized network control
- Dynamic configuration
- Programmable networks
- Vendor independence
- Automation and orchestration

## SDN Architecture

### Traditional vs SDN

```
Traditional Network:          SDN Network:
┌─────────────────┐          ┌─────────────────┐
│  Control Plane  │          │  SDN Controller │
│   (Routing)     │          │  (Centralized)  │
└────────┬────────┘          └────────┬────────┘
         │                            │
    ┌────▼─────┐                     │ API
    │ Switch 1 │              ┌──────┴──────┐
    └──────────┘              │             │
                        ┌─────▼──┐    ┌─────▼──┐
                        │Switch 1│    │Switch 2│
                        │(Data)  │    │(Data)  │
                        └────────┘    └────────┘
```

### SDN Layers

```
┌─────────────────────────────────────┐
│  Application Layer                   │
│  (Network apps, orchestration)      │
├─────────────────────────────────────┤
│  Control Layer                       │
│  (SDN controller, network logic)    │
├─────────────────────────────────────┤
│  Infrastructure Layer                │
│  (Physical/virtual network devices) │
└─────────────────────────────────────┘
```

## Network Overlays

### VXLAN (Virtual Extensible LAN)

**Characteristics:**
- Layer 2 over Layer 3 tunneling
- 24-bit VNID (16M networks)
- UDP encapsulation (port 4789)
- Multi-tenancy support

**VXLAN Frame:**
```
┌────────────────────────────────────────┐
│  Outer Ethernet Header                  │
├────────────────────────────────────────┤
│  Outer IP Header                        │
├────────────────────────────────────────┤
│  Outer UDP Header (port 4789)          │
├────────────────────────────────────────┤
│  VXLAN Header (VNI)                    │
├────────────────────────────────────────┤
│  Inner Ethernet Header                  │
├────────────────────────────────────────┤
│  Inner IP Header                        │
├────────────────────────────────────────┤
│  Payload                                │
└────────────────────────────────────────┘
```

**Configuration Example:**
```bash
# Create VXLAN interface
ip link add vxlan0 type vxlan \
    id 100 \
    dev eth0 \
    dstport 4789 \
    local 10.0.1.10

# Assign IP address
ip addr add 192.168.100.1/24 dev vxlan0

# Bring up interface
ip link set vxlan0 up

# Add remote endpoint
bridge fdb append 00:00:00:00:00:00 dev vxlan0 dst 10.0.1.20
```

### GENEVE (Generic Network Virtualization Encapsulation)

**Advantages over VXLAN:**
- Flexible option TLVs
- Better extensibility
- Standardized by IETF

### GRE (Generic Routing Encapsulation)

```bash
# Create GRE tunnel
ip tunnel add gre1 mode gre \
    remote 203.0.113.20 \
    local 203.0.113.10 \
    ttl 255

ip addr add 10.10.10.1/30 dev gre1
ip link set gre1 up
```

## Kubernetes CNI

### Container Network Interface (CNI)

**CNI Plugin Workflow:**
```
1. Kubernetes creates pod
2. Calls CNI plugin ADD command
3. CNI plugin:
   - Assigns IP address
   - Creates network interface
   - Sets up routes
   - Configures network policies
4. Returns network config to Kubernetes
```

### CNI Configuration

```json
{
  "cniVersion": "0.4.0",
  "name": "k8s-pod-network",
  "plugins": [
    {
      "type": "calico",
      "log_level": "info",
      "datastore_type": "kubernetes",
      "nodename": "node1",
      "ipam": {
        "type": "calico-ipam"
      },
      "policy": {
        "type": "k8s"
      },
      "kubernetes": {
        "kubeconfig": "/etc/cni/net.d/calico-kubeconfig"
      }
    },
    {
      "type": "portmap",
      "capabilities": {"portMappings": true}
    }
  ]
}
```

## Calico

### Architecture

```
┌────────────────────────────────────────┐
│         Calico Components               │
├────────────────────────────────────────┤
│  Felix (Agent on each node)            │
│  - Routing, ACLs, policy enforcement   │
├────────────────────────────────────────┤
│  BIRD (BGP client)                     │
│  - Route distribution                  │
├────────────────────────────────────────┤
│  Confd (Config manager)                │
│  - Monitors datastore, updates config  │
├────────────────────────────────────────┤
│  Typha (Optional)                      │
│  - Scaling component for large clusters│
└────────────────────────────────────────┘
```

### Installation

```yaml
# Install Calico operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.0/manifests/tigera-operator.yaml

# Configure Calico
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()
  registry: quay.io/
```

### IP Pool Configuration

```yaml
apiVersion: crd.projectcalico.org/v1
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 26
  ipipMode: Never
  vxlanMode: CrossSubnet
  natOutgoing: true
  nodeSelector: all()
```

### BGP Configuration

```yaml
# BGP peer configuration
apiVersion: crd.projectcalico.org/v1
kind: BGPPeer
metadata:
  name: rack1-tor
spec:
  peerIP: 10.0.1.1
  asNumber: 65001

---
# Node-specific BGP config
apiVersion: crd.projectcalico.org/v1
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
```

### Network Policies

```yaml
# Deny all ingress
apiVersion: crd.projectcalico.org/v1
kind: GlobalNetworkPolicy
metadata:
  name: deny-all-ingress
spec:
  order: 1000
  selector: all()
  types:
  - Ingress

---
# Allow DNS
apiVersion: crd.projectcalico.org/v1
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns
spec:
  order: 100
  selector: all()
  types:
  - Egress
  egress:
  - action: Allow
    protocol: UDP
    destination:
      selector: k8s-app == "kube-dns"
      ports:
      - 53

---
# Allow specific service communication
apiVersion: crd.projectcalico.org/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  selector: app == "backend"
  types:
  - Ingress
  ingress:
  - action: Allow
    protocol: TCP
    source:
      selector: app == "frontend"
    destination:
      ports:
      - 8080
```

## Cilium

### Architecture

```
┌────────────────────────────────────────┐
│         Cilium Components               │
├────────────────────────────────────────┤
│  Cilium Agent                          │
│  - eBPF program management             │
│  - Policy enforcement                  │
├────────────────────────────────────────┤
│  Cilium Operator                       │
│  - Cluster-wide operations             │
│  - IPAM, CEP garbage collection        │
├────────────────────────────────────────┤
│  Hubble (Optional)                     │
│  - Observability, service map          │
└────────────────────────────────────────┘
```

### Installation with Helm

```bash
# Add Cilium helm repo
helm repo add cilium https://helm.cilium.io/

# Install Cilium
helm install cilium cilium/cilium \
  --version 1.14.0 \
  --namespace kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=strict \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true
```

### Cilium Network Policy

```yaml
# L3/L4 policy
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP

---
# L7 HTTP policy
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: l7-http-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
      rules:
        http:
        - method: "GET"
          path: "/api/v1/.*"
        - method: "POST"
          path: "/api/v1/users"

---
# DNS-aware policy
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-external-api
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend
  egress:
  - toFQDNs:
    - matchName: "api.github.com"
    - matchPattern: "*.amazonaws.com"
  - toEndpoints:
    - matchLabels:
        "k8s:io.kubernetes.pod.namespace": kube-system
        "k8s:k8s-app": kube-dns
    toPorts:
    - ports:
      - port: "53"
        protocol: UDP
```

### Hubble Observability

```bash
# Install Hubble CLI
curl -L https://github.com/cilium/hubble/releases/latest/download/hubble-linux-amd64.tar.gz | tar xz
sudo mv hubble /usr/local/bin

# Enable port-forward to Hubble relay
kubectl port-forward -n kube-system svc/hubble-relay 4245:80

# Observe flows
hubble observe

# Filter by pod
hubble observe --pod production/frontend

# Filter by verdict
hubble observe --verdict DROPPED

# Service map
hubble observe --http-status

# Top connections
hubble observe --last 1000 -o jsonpb | \
  jq -r '.flow | "\(.source.namespace)/\(.source.pod_name) -> \(.destination.namespace)/\(.destination.pod_name)"' | \
  sort | uniq -c | sort -rn
```

## Flannel

### Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-flannel-cfg
  namespace: kube-system
data:
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "vxlan",
        "Port": 8472
      }
    }
```

### Backend Types

**VXLAN:**
```json
{
  "Backend": {
    "Type": "vxlan",
    "Port": 8472,
    "VNI": 1
  }
}
```

**Host-GW (No overlay):**
```json
{
  "Backend": {
    "Type": "host-gw"
  }
}
```

**WireGuard:**
```json
{
  "Backend": {
    "Type": "wireguard",
    "PersistentKeepalive": 25,
    "ListenPort": 51820
  }
}
```

## Network Policies

### Default Deny All

```yaml
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
```

### Allow All Egress

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector: {}
```

### Multi-Tier Application Policy

```yaml
# Database tier - only from app tier
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: database
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: application
    ports:
    - protocol: TCP
      port: 5432

---
# Application tier - from frontend and to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: application-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: application
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53

---
# Frontend tier - from ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 80
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: application
    ports:
    - protocol: TCP
      port: 8080
```

## Service Discovery

### CoreDNS Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

## Best Practices

1. **Choose appropriate CNI** - Calico for policy, Cilium for eBPF, Flannel for simplicity
2. **Enable network policies** - Default deny, explicit allow
3. **Use eBPF when possible** - Better performance than iptables
4. **Monitor network traffic** - Use Hubble or flow logs
5. **Implement proper IPAM** - Avoid IP exhaustion
6. **Use BGP for large clusters** - Better than full mesh
7. **Enable encryption** - WireGuard or IPsec for pod-to-pod
8. **Test failover** - Ensure network resilience
9. **Document network architecture** - IP ranges, policies
10. **Use L7 policies** - Fine-grained HTTP/gRPC control

## Anti-Patterns

- **No network policies** - All pods can communicate
- **Using deprecated CNI** - Stick to maintained plugins
- **Ignoring MTU** - Can cause packet fragmentation
- **Overlapping IP ranges** - Conflicts with on-prem networks
- **No monitoring** - Can't diagnose network issues
- **Single CNI plugin** - No failover capability
- **Insufficient IP space** - Running out of addresses
- **Complex policy chains** - Hard to debug
- **No encryption** - Pod traffic exposed
- **Ignoring performance** - Not optimizing for workload
