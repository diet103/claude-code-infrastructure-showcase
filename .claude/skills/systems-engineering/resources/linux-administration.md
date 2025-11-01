# Linux Administration

Comprehensive guide to Linux system administration covering systemd, user management, package management, file systems, and system operations.

## systemd Service Management

### Creating Custom Services

**Example: Node.js Application Service:**
```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Node.js Application
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=appuser
Group=appuser
WorkingDirectory=/opt/myapp
Environment="NODE_ENV=production"
Environment="PORT=3000"
EnvironmentFile=/etc/myapp/config

# Main process
ExecStart=/usr/bin/node /opt/myapp/server.js

# Restart policy
Restart=always
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

# Resource limits
MemoryLimit=512M
CPUQuota=50%

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/myapp

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

[Install]
WantedBy=multi-user.target
```

**Service Management Commands:**
```bash
# Reload systemd after creating/editing service
sudo systemctl daemon-reload

# Start and enable service
sudo systemctl start myapp
sudo systemctl enable myapp

# Check status
sudo systemctl status myapp

# View logs
journalctl -u myapp -f
journalctl -u myapp --since "1 hour ago"
journalctl -u myapp --since "2024-01-01" --until "2024-01-31"

# Restart service
sudo systemctl restart myapp

# Reload configuration without restart
sudo systemctl reload myapp
```

### Timer Units (Cron Alternative)

**Backup Timer Example:**
```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Daily backup timer
Requires=backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true
RandomizedDelaySec=30min

[Install]
WantedBy=timers.target
```

**Backup Service:**
```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Backup service
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
User=backup
Group=backup
```

**Enable Timer:**
```bash
sudo systemctl enable backup.timer
sudo systemctl start backup.timer
sudo systemctl list-timers
```

## User and Group Management

### Creating Users

```bash
# Create user with home directory
sudo useradd -m -s /bin/bash -c "Application User" appuser

# Create system user (no home, no login)
sudo useradd -r -s /usr/sbin/nologin -c "Service Account" serviceuser

# Set password
sudo passwd appuser

# Create user with specific UID
sudo useradd -u 1500 -m -s /bin/bash customuser

# Add user to group
sudo usermod -aG sudo appuser
sudo usermod -aG docker appuser

# Lock/unlock user account
sudo usermod -L appuser  # Lock
sudo usermod -U appuser  # Unlock

# Delete user
sudo userdel -r appuser  # -r removes home directory
```

### Group Management

```bash
# Create group
sudo groupadd developers
sudo groupadd -g 2000 customgroup

# Add user to group
sudo gpasswd -a username groupname
sudo usermod -aG groupname username

# Remove user from group
sudo gpasswd -d username groupname

# List user's groups
groups username
id username

# Delete group
sudo groupdel groupname
```

### SSH Key Management

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "user@example.com"
ssh-keygen -t rsa -b 4096 -C "user@example.com"

# Copy key to server
ssh-copy-id user@server
# Or manually:
cat ~/.ssh/id_ed25519.pub | ssh user@server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# Set proper permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# SSH config for easy access
cat > ~/.ssh/config <<EOF
Host production
    HostName prod.example.com
    User deploy
    Port 22
    IdentityFile ~/.ssh/production_key

Host staging
    HostName staging.example.com
    User deploy
    ProxyJump bastion.example.com
EOF

chmod 600 ~/.ssh/config
```

## Package Management

### apt (Debian/Ubuntu)

```bash
# Update package index
sudo apt update

# Upgrade all packages
sudo apt upgrade
sudo apt full-upgrade  # More aggressive

# Search for packages
apt search nginx
apt-cache search nginx

# Install package
sudo apt install nginx

# Install specific version
sudo apt install nginx=1.18.0-0ubuntu1

# Remove package
sudo apt remove nginx
sudo apt purge nginx  # Also removes config files

# Clean up
sudo apt autoremove
sudo apt autoclean

# Show package information
apt show nginx
apt-cache policy nginx

# List installed packages
apt list --installed
dpkg -l

# Hold package version
sudo apt-mark hold nginx
sudo apt-mark unhold nginx
```

### yum/dnf (RHEL/CentOS)

```bash
# Update system
sudo yum update
sudo dnf update  # dnf on newer systems

# Search packages
yum search nginx
dnf search nginx

# Install package
sudo yum install nginx
sudo dnf install nginx

# Install specific version
sudo yum install nginx-1.18.0

# Remove package
sudo yum remove nginx
sudo dnf remove nginx

# List installed
yum list installed
dnf list installed

# Show package info
yum info nginx
dnf info nginx

# Clean cache
sudo yum clean all
sudo dnf clean all

# Enable/disable repository
sudo yum-config-manager --enable epel
sudo dnf config-manager --set-enabled epel
```

### snap (Universal Packages)

```bash
# Install snap
sudo apt install snapd

# Search snaps
snap find name

# Install snap
sudo snap install --classic code

# List installed snaps
snap list

# Update snaps
sudo snap refresh
sudo snap refresh code

# Remove snap
sudo snap remove code

# View snap info
snap info code
```

## File Systems

### ext4 File System

```bash
# Create ext4 filesystem
sudo mkfs.ext4 /dev/sdb1

# Create with label
sudo mkfs.ext4 -L "data_volume" /dev/sdb1

# Check filesystem
sudo fsck.ext4 /dev/sdb1
sudo e2fsck -f /dev/sdb1

# Resize filesystem
sudo resize2fs /dev/sdb1

# View filesystem info
sudo dumpe2fs /dev/sdb1
sudo tune2fs -l /dev/sdb1

# Set reserved blocks
sudo tune2fs -m 1 /dev/sdb1  # Reserve 1% for root
```

### XFS File System

```bash
# Create XFS filesystem
sudo mkfs.xfs /dev/sdb1

# Create with label
sudo mkfs.xfs -L "data_volume" /dev/sdb1

# Check XFS filesystem
sudo xfs_repair /dev/sdb1

# Grow XFS (cannot shrink!)
sudo xfs_growfs /mount/point

# View info
sudo xfs_info /dev/sdb1
```

### Mount Management

**Permanent Mounts (/etc/fstab):**
```bash
# /etc/fstab
# <device>              <mount point>  <type>  <options>                    <dump> <pass>
UUID=xxx-xxx-xxx        /data          ext4    defaults,noatime             0      2
/dev/sdb1               /backup        xfs     defaults,noatime,nodiratime  0      2
//server/share          /mnt/share     cifs    credentials=/root/.smbcreds  0      0
nfs-server:/export      /mnt/nfs       nfs     defaults,soft,timeo=30       0      0
```

**Mount Commands:**
```bash
# Mount filesystem
sudo mount /dev/sdb1 /mnt

# Mount with options
sudo mount -o noatime,nodiratime /dev/sdb1 /mnt

# Mount all in fstab
sudo mount -a

# Unmount
sudo umount /mnt
sudo umount -l /mnt  # Lazy unmount

# Show mounted filesystems
mount
df -h
findmnt

# Get UUID
sudo blkid /dev/sdb1
lsblk -f
```

## Boot Process

### GRUB Configuration

```bash
# Edit GRUB config
sudo vim /etc/default/grub

# Example changes:
GRUB_TIMEOUT=5
GRUB_CMDLINE_LINUX="quiet splash"
GRUB_CMDLINE_LINUX="nomodeset"  # For graphics issues

# Update GRUB
sudo update-grub  # Debian/Ubuntu
sudo grub2-mkconfig -o /boot/grub2/grub.cfg  # RHEL/CentOS

# Set default boot entry
sudo grub-set-default 0
```

### systemd Boot Targets

```bash
# View current target
systemctl get-default

# Change default target
sudo systemctl set-default multi-user.target  # Text mode
sudo systemctl set-default graphical.target   # GUI mode

# Switch target (without reboot)
sudo systemctl isolate multi-user.target

# List all targets
systemctl list-units --type=target
```

## Kernel Management

### Kernel Tuning (sysctl)

```bash
# View all parameters
sysctl -a

# View specific parameter
sysctl net.ipv4.ip_forward

# Set temporarily
sudo sysctl -w net.ipv4.ip_forward=1

# Persistent configuration
sudo vim /etc/sysctl.d/99-custom.conf
```

**Common Kernel Parameters:**
```bash
# /etc/sysctl.d/99-performance.conf

# Network performance
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# Connection tracking
net.netfilter.nf_conntrack_max = 1000000
net.nf_conntrack_max = 1000000

# File descriptors
fs.file-max = 2097152

# Swappiness
vm.swappiness = 10

# Disk I/O
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# Apply changes
sudo sysctl -p /etc/sysctl.d/99-performance.conf
```

### Kernel Modules

```bash
# List loaded modules
lsmod

# Load module
sudo modprobe module_name

# Unload module
sudo modprobe -r module_name

# Module info
modinfo module_name

# Persistent module loading
echo "module_name" | sudo tee -a /etc/modules

# Blacklist module
echo "blacklist module_name" | sudo tee -a /etc/modprobe.d/blacklist.conf
```

## Log Management

### journalctl (systemd logs)

```bash
# View all logs
journalctl

# Follow logs
journalctl -f

# View specific unit
journalctl -u nginx.service

# Since/until
journalctl --since "2024-01-01 00:00:00"
journalctl --since "1 hour ago"
journalctl --until "2024-01-31 23:59:59"

# Priority filtering
journalctl -p err  # Errors only
journalctl -p warning  # Warnings and above

# Boot logs
journalctl -b  # Current boot
journalctl -b -1  # Previous boot
journalctl --list-boots

# Show last N lines
journalctl -n 100

# Output format
journalctl -o json-pretty

# Clear old logs
sudo journalctl --vacuum-time=7d
sudo journalctl --vacuum-size=500M
```

### Log Rotation

```bash
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 appuser appuser
    sharedscripts
    postrotate
        systemctl reload myapp > /dev/null 2>&1 || true
    endscript
}
```

## Process Management

```bash
# View processes
ps aux
ps -ef
pstree

# Top processes
top
htop

# Kill process
kill PID
kill -9 PID  # Force kill
killall process_name
pkill pattern

# Process priority (nice)
nice -n 10 command  # Lower priority
sudo renice -5 PID  # Higher priority

# Background jobs
command &
jobs
fg %1
bg %1

# Detach from terminal
nohup command &
screen
tmux
```

## System Information

```bash
# OS information
cat /etc/os-release
lsb_release -a
uname -a

# Hardware info
lscpu  # CPU
lsmem  # Memory
lsblk  # Block devices
lspci  # PCI devices
lsusb  # USB devices
dmidecode  # BIOS/hardware

# System resources
free -h  # Memory
df -h    # Disk usage
uptime   # Uptime and load

# Network
ip addr
ip route
hostname
hostnamectl
```

## Best Practices

1. **Service Management:**
   - Use systemd for services
   - Set resource limits
   - Enable security features
   - Configure proper logging

2. **User Management:**
   - Use SSH keys, not passwords
   - Follow least privilege principle
   - Disable root login
   - Regular user audits

3. **Package Management:**
   - Keep system updated
   - Use package manager, avoid manual installs
   - Document installed packages
   - Test updates in staging first

4. **File Systems:**
   - Use appropriate filesystem for workload
   - Mount with noatime for performance
   - Regular filesystem checks
   - Monitor disk usage

5. **Monitoring:**
   - Centralize logs
   - Set up log rotation
   - Monitor system resources
   - Alert on anomalies

## Common Issues

**Service fails to start:**
```bash
systemctl status service.service
journalctl -u service.service -n 50
systemctl cat service.service  # View service file
```

**Out of disk space:**
```bash
df -h  # Find full filesystem
du -sh /* | sort -h  # Find large directories
find / -type f -size +100M  # Find large files
```

**High load:**
```bash
top  # Identify resource hogs
ps aux --sort=-%cpu  # CPU hogs
ps aux --sort=-%mem  # Memory hogs
```
