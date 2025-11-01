# Security Hardening

Comprehensive guide to Linux security hardening covering OS hardening, CIS benchmarks, firewall configuration, SELinux/AppArmor, SSH hardening, and vulnerability scanning.

## Table of Contents

- [Security Hardening Overview](#security-hardening-overview)
- [OS Hardening Checklist](#os-hardening-checklist)
- [CIS Benchmarks](#cis-benchmarks)
- [Firewall Configuration](#firewall-configuration)
- [SELinux and AppArmor](#selinux-and-apparmor)
- [SSH Hardening](#ssh-hardening)
- [File Permissions and Capabilities](#file-permissions-and-capabilities)
- [Audit Logging](#audit-logging)
- [Vulnerability Scanning](#vulnerability-scanning)

## Security Hardening Overview

### Defense in Depth

```
┌─────────────────────────────────────┐
│    Application Security              │
├─────────────────────────────────────┤
│    Host Security (This Guide)        │
├─────────────────────────────────────┤
│    Network Security                  │
├─────────────────────────────────────┤
│    Physical Security                 │
└─────────────────────────────────────┘
```

### Security Principles

- **Least Privilege**: Minimal permissions needed
- **Defense in Depth**: Multiple layers of security
- **Fail Secure**: Fail closed, not open
- **Separation of Duties**: No single point of control
- **Audit Everything**: Log all security events

## OS Hardening Checklist

### Initial Setup

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 3. Remove unnecessary packages
sudo apt autoremove --purge

# 4. Disable unnecessary services
sudo systemctl list-unit-files --type=service --state=enabled
sudo systemctl disable <service>
```

### User and Access Control

```bash
# 1. Disable root login
sudo passwd -l root

# 2. Create admin user with sudo
sudo useradd -m -s /bin/bash admin
sudo usermod -aG sudo admin

# 3. Set strong password policy
# /etc/security/pwquality.conf
minlen = 14
dcredit = -1  # At least 1 digit
ucredit = -1  # At least 1 uppercase
lcredit = -1  # At least 1 lowercase
ocredit = -1  # At least 1 special char

# 4. Set password aging
sudo chage -M 90 -m 7 -W 14 username
# Max age: 90 days, Min age: 7 days, Warning: 14 days

# 5. Lock inactive accounts
sudo useradd -e 2024-12-31 tempuser  # Expiration date

# 6. Review sudoers configuration
sudo visudo
# Require password for sudo
Defaults timestamp_timeout=5
```

### Network Hardening

```bash
# /etc/sysctl.d/99-network-security.conf

# IP forwarding (disable unless router)
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Ignore source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Ignore ICMP ping requests (optional)
net.ipv4.icmp_echo_ignore_all = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Log suspicious packets
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Reverse path filtering
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Apply settings
sudo sysctl -p /etc/sysctl.d/99-network-security.conf
```

## CIS Benchmarks

### CIS Benchmark Implementation

```bash
#!/bin/bash
# cis-hardening.sh - Implement CIS benchmark controls

set -euo pipefail

echo "=== CIS Benchmark Hardening ==="

# 1.1 Filesystem Configuration
echo "[1] Configuring filesystems..."

# Create separate partitions (manual - document in fstab)
cat >> /etc/fstab <<EOF
# Secure mount options
/tmp     /tmp     tmpfs   defaults,nodev,nosuid,noexec 0 0
EOF

# 1.5 Additional Process Hardening
echo "[2] Enabling ASLR..."
echo "kernel.randomize_va_space = 2" >> /etc/sysctl.d/99-cis.conf

# 1.7 Warning Banners
echo "[3] Configuring warning banners..."
cat > /etc/issue <<EOF
Authorized access only. All activity may be monitored and reported.
EOF
cp /etc/issue /etc/issue.net

# 3.1 Network Parameters
echo "[4] Configuring network parameters..."
cat >> /etc/sysctl.d/99-cis.conf <<EOF
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.tcp_syncookies = 1
EOF

sysctl -p /etc/sysctl.d/99-cis.conf

# 4.1 Configure System Accounting (auditd)
echo "[5] Installing and configuring auditd..."
apt-get install -y auditd audispd-plugins
systemctl enable auditd
systemctl start auditd

# 5.2 Configure SSH Server
echo "[6] Hardening SSH..."
cat >> /etc/ssh/sshd_config.d/99-cis.conf <<EOF
Protocol 2
LogLevel INFO
X11Forwarding no
MaxAuthTries 4
IgnoreRhosts yes
HostbasedAuthentication no
PermitRootLogin no
PermitEmptyPasswords no
PermitUserEnvironment no
ClientAliveInterval 300
ClientAliveCountMax 0
LoginGraceTime 60
MaxStartups 10:30:60
MaxSessions 4
EOF

systemctl restart sshd

# 5.3 Configure PAM
echo "[7] Configuring PAM..."
apt-get install -y libpam-pwquality

# 6.1 System File Permissions
echo "[8] Setting secure file permissions..."
chmod 644 /etc/passwd
chmod 644 /etc/group
chmod 600 /etc/shadow
chmod 600 /etc/gshadow
chmod 600 /etc/ssh/sshd_config

echo "=== CIS Hardening Complete ==="
echo "Review and customize /etc/sysctl.d/99-cis.conf as needed"
```

## Firewall Configuration

### iptables Hardening

```bash
#!/bin/bash
# firewall-rules.sh - Secure iptables configuration

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

# Rate limiting for SSH (prevent brute force)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -m conntrack --ctstate NEW -j ACCEPT

# Drop invalid packets
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

# Drop fragmented packets
iptables -A INPUT -f -j DROP

# Drop XMAS packets
iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP

# Drop NULL packets
iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP

# Log dropped packets
iptables -A INPUT -m limit --limit 5/min -j LOG --log-prefix "iptables-dropped: " --log-level 7

# Save rules
iptables-save > /etc/iptables/rules.v4

# Load on boot
apt-get install -y iptables-persistent
```

### firewalld Configuration

```bash
# Install firewalld
sudo dnf install firewalld
sudo systemctl enable firewalld
sudo systemctl start firewalld

# Default zone
sudo firewall-cmd --set-default-zone=public

# Drop all by default
sudo firewall-cmd --zone=public --set-target=DROP --permanent

# Allow SSH with rate limiting
sudo firewall-cmd --permanent --zone=public --add-rich-rule='
  rule service name="ssh"
  limit value="4/m"
  accept'

# Allow HTTP/HTTPS
sudo firewall-cmd --permanent --zone=public --add-service=http
sudo firewall-cmd --permanent --zone=public --add-service=https

# Block ICMP (ping)
sudo firewall-cmd --permanent --zone=public --add-icmp-block=echo-request

# Log dropped packets
sudo firewall-cmd --permanent --zone=public --add-rich-rule='
  rule
  log prefix="firewalld-drop: " level=info
  drop'

# Reload firewall
sudo firewall-cmd --reload
```

## SELinux and AppArmor

### SELinux (RHEL/CentOS)

```bash
# Check SELinux status
getenforce
sestatus

# Enable SELinux
sudo setenforce 1  # Temporary
# Permanent: Edit /etc/selinux/config
SELINUX=enforcing

# SELinux modes:
# - enforcing: Deny and log violations
# - permissive: Allow but log violations
# - disabled: No SELinux

# Check context
ls -Z /var/www/html
ps -eZ | grep httpd

# Set file context
sudo semanage fcontext -a -t httpd_sys_content_t "/srv/www(/.*)?"
sudo restorecon -Rv /srv/www

# Port labeling
sudo semanage port -a -t http_port_t -p tcp 8080
sudo semanage port -l | grep http_port_t

# Troubleshooting
sudo ausearch -m avc -ts recent
sudo audit2allow -a
sudo audit2why -a

# Create custom policy
sudo ausearch -m avc -ts recent | audit2allow -M mypolicy
sudo semodule -i mypolicy.pp

# Boolean settings
getsebool -a
sudo setsebool -P httpd_can_network_connect on
```

### AppArmor (Ubuntu/Debian)

```bash
# Check status
sudo aa-status

# Install utilities
sudo apt install apparmor-utils

# Create profile
sudo aa-genprof /usr/bin/myapp

# While app runs, generate profile:
# 1. Run application and perform all functions
# 2. In another terminal: sudo aa-logprof
# 3. Review and approve events

# Profile modes
sudo aa-enforce /etc/apparmor.d/usr.bin.myapp   # Enforce
sudo aa-complain /etc/apparmor.d/usr.bin.myapp  # Complain (log only)
sudo aa-disable /etc/apparmor.d/usr.bin.myapp   # Disable

# Example profile
cat > /etc/apparmor.d/usr.bin.myapp <<'EOF'
#include <tunables/global>

/usr/bin/myapp {
  #include <abstractions/base>

  capability net_bind_service,

  /usr/bin/myapp mr,
  /etc/myapp/** r,
  /var/log/myapp/** rw,
  /var/lib/myapp/** rw,

  # Network
  network inet stream,
  network inet6 stream,

  # Deny everything else
  deny /** wl,
}
EOF

# Load profile
sudo apparmor_parser -r /etc/apparmor.d/usr.bin.myapp
```

## SSH Hardening

### SSH Server Configuration

```bash
# /etc/ssh/sshd_config

# Network
Port 22  # Consider non-standard port
AddressFamily inet  # IPv4 only
ListenAddress 0.0.0.0

# Protocol
Protocol 2

# Authentication
PermitRootLogin no
MaxAuthTries 3
MaxSessions 2
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Kerberos
KerberosAuthentication no

# GSSAPI
GSSAPIAuthentication no

# Host-based
HostbasedAuthentication no
IgnoreRhosts yes

# Features
X11Forwarding no
PrintMotd no
PermitUserEnvironment no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no

# Timeout
ClientAliveInterval 300
ClientAliveCountMax 0
LoginGraceTime 60

# Access Control
AllowUsers admin deploy
AllowGroups sshusers
DenyUsers root guest
# Or use DenyGroups

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# Cryptography
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group-exchange-sha256

# Banner
Banner /etc/ssh/banner

# Test configuration
sudo sshd -t

# Restart SSH
sudo systemctl restart sshd
```

### SSH Client Hardening

```bash
# ~/.ssh/config

Host *
    # Cryptography
    Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
    MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
    KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org

    # Security
    HashKnownHosts yes
    StrictHostKeyChecking ask
    VerifyHostKeyDNS ask

    # Connection
    ServerAliveInterval 60
    ServerAliveCountMax 3
    TCPKeepAlive no

    # Disable
    ForwardAgent no
    ForwardX11 no
```

### SSH Key Management

```bash
# Generate strong SSH key (Ed25519 recommended)
ssh-keygen -t ed25519 -C "user@example.com"

# Or RSA 4096
ssh-keygen -t rsa -b 4096 -C "user@example.com"

# Add passphrase to existing key
ssh-keygen -p -f ~/.ssh/id_ed25519

# Set proper permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/config

# Audit authorized keys
cat ~/.ssh/authorized_keys
# Remove unknown keys

# Restrict key usage
# In authorized_keys:
from="192.168.1.0/24",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA...
```

## File Permissions and Capabilities

### Critical File Permissions

```bash
# System files
sudo chmod 644 /etc/passwd
sudo chmod 644 /etc/group
sudo chmod 600 /etc/shadow
sudo chmod 600 /etc/gshadow
sudo chmod 600 /boot/grub/grub.cfg

# SSH
sudo chmod 600 /etc/ssh/*_key
sudo chmod 644 /etc/ssh/*.pub
sudo chmod 600 /etc/ssh/sshd_config

# Sudo configuration
sudo chmod 440 /etc/sudoers
sudo chmod 750 /etc/sudoers.d

# Find world-writable files
find / -xdev -type f -perm -0002 -ls 2>/dev/null

# Find files with SUID/SGID
find / -xdev \( -perm -4000 -o -perm -2000 \) -type f -ls 2>/dev/null

# Remove SUID if not needed
sudo chmod u-s /path/to/file
```

### File Capabilities

```bash
# View capabilities
getcap /usr/bin/ping
sudo getcap -r / 2>/dev/null

# Set capability (instead of SUID)
sudo setcap cap_net_bind_service=+ep /usr/bin/myapp

# Remove capability
sudo setcap -r /usr/bin/myapp

# Audit capabilities
sudo getcap -r / 2>/dev/null
```

## Audit Logging

### auditd Configuration

```bash
# Install auditd
sudo apt install auditd audispd-plugins

# /etc/audit/auditd.conf
log_file = /var/log/audit/audit.log
log_format = RAW
log_group = root
priority_boost = 4
flush = INCREMENTAL_ASYNC
freq = 50
num_logs = 5
max_log_file = 50
max_log_file_action = ROTATE
space_left = 75
space_left_action = SYSLOG
admin_space_left = 50
admin_space_left_action = SUSPEND
disk_full_action = SUSPEND
disk_error_action = SUSPEND

# Enable auditd
sudo systemctl enable auditd
sudo systemctl start auditd
```

### Audit Rules

```bash
# /etc/audit/rules.d/audit.rules

# Delete all existing rules
-D

# Buffer size
-b 8192

# Failure mode (0=silent 1=printk 2=panic)
-f 1

# Monitor authentication
-w /var/log/faillog -p wa -k logins
-w /var/log/lastlog -p wa -k logins
-w /var/run/utmp -p wa -k session
-w /var/log/wtmp -p wa -k logins
-w /var/log/btmp -p wa -k logins

# Monitor user/group changes
-w /etc/group -p wa -k identity
-w /etc/passwd -p wa -k identity
-w /etc/gshadow -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/security/opasswd -p wa -k identity

# Monitor network configuration
-w /etc/hosts -p wa -k network
-w /etc/hostname -p wa -k network
-w /etc/network/ -p wa -k network

# Monitor system calls
-a always,exit -F arch=b64 -S adjtimex -S settimeofday -k time-change
-a always,exit -F arch=b64 -S sethostname -S setdomainname -k system-locale

# Monitor file deletions
-a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -k delete

# Monitor sudo
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers

# Load rules
sudo augenrules --load

# Or
sudo service auditd restart
```

### Analyzing Audit Logs

```bash
# Search logs
sudo ausearch -k logins
sudo ausearch -m USER_LOGIN
sudo ausearch -ts today -k identity

# Generate report
sudo aureport --summary
sudo aureport --auth
sudo aureport --failed
sudo aureport --login

# Real-time monitoring
sudo tail -f /var/log/audit/audit.log
```

## Vulnerability Scanning

### Lynis Security Audit

```bash
# Install Lynis
sudo apt install lynis

# Run audit
sudo lynis audit system

# Review results
cat /var/log/lynis.log
cat /var/log/lynis-report.dat

# Focus on high-priority items
sudo lynis show warnings
sudo lynis show suggestions
```

### OpenSCAP

```bash
# Install OpenSCAP
sudo apt install libopenscap8 ssg-base ssg-debian

# Run scan
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_standard \
    --results scan-results.xml \
    --report scan-report.html \
    /usr/share/xml/scap/ssg/content/ssg-debian11-ds.xml

# View report
firefox scan-report.html
```

### Rootkit Detection

```bash
# rkhunter
sudo apt install rkhunter
sudo rkhunter --update
sudo rkhunter --check

# chkrootkit
sudo apt install chkrootkit
sudo chkrootkit
```

---

**Related Topics:**
- See [networking-fundamentals.md](networking-fundamentals.md) for firewall configuration
- See [linux-administration.md](linux-administration.md) for user management
- See [system-monitoring.md](system-monitoring.md) for audit logging
