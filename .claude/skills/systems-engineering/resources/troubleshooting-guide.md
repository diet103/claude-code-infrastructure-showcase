# Troubleshooting Guide

Comprehensive troubleshooting methodology and diagnostic techniques for Linux systems covering systematic debugging, diagnostic tools, common issues, and resolution patterns.

## Table of Contents

- [Troubleshooting Methodology](#troubleshooting-methodology)
- [Diagnostic Tools](#diagnostic-tools)
- [CPU Issues](#cpu-issues)
- [Memory Problems](#memory-problems)
- [Disk and I/O Issues](#disk-and-io-issues)
- [Network Troubleshooting](#network-troubleshooting)
- [Process Debugging](#process-debugging)
- [Log Analysis](#log-analysis)
- [Common Issues](#common-issues)

## Troubleshooting Methodology

### Systematic Approach

```
1. Define the problem
   - What is not working?
   - When did it start?
   - What changed recently?

2. Gather information
   - System logs
   - Performance metrics
   - Error messages
   - Configuration changes

3. Identify the scope
   - Single system or multiple?
   - Specific service or system-wide?
   - Intermittent or persistent?

4. Form hypothesis
   - Based on symptoms and data
   - Most likely cause first

5. Test hypothesis
   - Make one change at a time
   - Document each test
   - Revert if unsuccessful

6. Implement solution
   - Apply fix permanently
   - Document resolution
   - Monitor after fix

7. Prevent recurrence
   - Root cause analysis
   - Implement monitoring
   - Update runbooks
```

### The 5 Whys

```
Problem: Web server is down

Why? → Process crashed
Why? → Out of memory
Why? → Memory leak in application
Why? → Improper resource cleanup
Why? → Missing connection pool management

Root Cause: Application doesn't close database connections
Solution: Implement connection pooling and proper cleanup
```

## Diagnostic Tools

### Essential Toolkit

```bash
# System information
uname -a          # Kernel and system info
hostnamectl       # System details
lsb_release -a    # Distribution info

# Resource monitoring
top               # Process monitor
htop              # Better process monitor
vmstat 1          # Virtual memory statistics
iostat -x 1       # I/O statistics
mpstat 1          # CPU statistics
sar               # System activity reporter

# Network
ss -tuln          # Socket statistics
netstat -tuln     # Network connections (legacy)
ip addr           # IP addresses
ip route          # Routing table
tcpdump           # Packet capture
traceroute        # Trace route to host

# Disk
df -h             # Disk usage
du -sh /*         # Directory sizes
lsblk             # Block devices
fdisk -l          # Partition tables

# Process
ps aux            # Process list
pstree            # Process tree
lsof              # Open files
strace            # Trace system calls
pmap              # Process memory map

# Logs
journalctl        # systemd logs
dmesg             # Kernel messages
tail -f           # Follow log files
```

## CPU Issues

### High CPU Usage

**Diagnosis:**
```bash
# Identify high CPU processes
top -bn1 | head -20
ps aux --sort=-%cpu | head -10

# Per-core CPU usage
mpstat -P ALL 1 5

# CPU usage by user
ps -eo user,%cpu --sort=-%cpu | awk '{usage[$1]+=$2} END {for(u in usage) print u, usage[u]}'

# Check load average
uptime
cat /proc/loadavg

# Ideal load: Number of CPU cores
# High load: Investigate what's queued
```

**Investigation:**
```bash
# Trace high CPU process
sudo strace -p <PID> -c  # Count syscalls
sudo strace -p <PID> -tt # Detailed trace with timestamps

# Check what files process is using
lsof -p <PID>

# Check process threads
ps -T -p <PID>
top -H -p <PID>

# Profile with perf
sudo perf top -p <PID>
sudo perf record -p <PID> -g -- sleep 30
sudo perf report
```

**Solutions:**
```bash
# Kill runaway process
kill <PID>
kill -9 <PID>  # Force kill

# Reduce process priority
renice +10 <PID>

# Limit CPU usage with cgroups
cgcreate -g cpu:/limit
cgset -r cpu.cfs_quota_us=50000 limit  # 50% CPU
cgexec -g cpu:limit command

# Or with systemd
systemctl set-property myapp.service CPUQuota=50%
```

### CPU Wait (I/O Wait)

```bash
# Check I/O wait
iostat -x 1 5

# If 'wa' (I/O wait) is high, check:
iotop -oPa  # I/O by process

# Find processes doing I/O
pidstat -d 1

# Solution: See Disk I/O Issues below
```

## Memory Problems

### Out of Memory (OOM)

**Diagnosis:**
```bash
# Check memory usage
free -h
cat /proc/meminfo

# Check swap usage
swapon --show
vmstat 1 5

# Check OOM killer logs
dmesg | grep -i "out of memory"
journalctl -k | grep -i "oom"

# Find memory hogs
ps aux --sort=-%mem | head -10

# Per-process memory details
pmap -x <PID>
cat /proc/<PID>/status | grep -i mem
```

**Investigation:**
```bash
# Check for memory leaks
valgrind --leak-check=full ./program

# Monitor memory usage over time
watch -n 1 'free -h'

# Check memory usage by user
ps -eo user,%mem --sort=-%mem | awk '{usage[$1]+=$2} END {for(u in usage) print u, usage[u]}'

# Analyze memory allocation
cat /proc/<PID>/maps
cat /proc/<PID>/smaps
```

**Solutions:**
```bash
# Clear cache (safe)
sync; echo 3 > /proc/sys/vm/drop_caches

# Add more swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Limit process memory (systemd)
systemctl set-property myapp.service MemoryLimit=1G

# Adjust swappiness
sudo sysctl vm.swappiness=10

# Kill memory hog as last resort
kill <PID>
```

### Memory Leaks

```bash
# Monitor process memory over time
while true; do
    ps aux | grep <process> | grep -v grep
    sleep 10
done

# Use valgrind for detailed analysis
valgrind --leak-check=full \
         --show-leak-kinds=all \
         --track-origins=yes \
         --verbose \
         --log-file=valgrind-out.txt \
         ./program

# Monitor with top
top -p <PID>
# Watch RES (resident memory) increase over time
```

## Disk and I/O Issues

### Disk Full

**Diagnosis:**
```bash
# Check disk usage
df -h

# Find large directories
du -sh /* | sort -h
du -sh /var/* | sort -h

# Find large files
find / -type f -size +100M -exec ls -lh {} \;
find / -type f -size +1G 2>/dev/null

# Check inode usage
df -i

# Find directories with many files
find / -xdev -type d -exec sh -c 'echo "{} $(find "{}" -maxdepth 1 | wc -l)"' \; | sort -k2 -rn | head
```

**Solutions:**
```bash
# Clear log files
sudo truncate -s 0 /var/log/large.log

# Remove old log files
find /var/log -name "*.log" -mtime +30 -delete

# Clean package cache
sudo apt clean
sudo yum clean all

# Remove old kernels (Ubuntu/Debian)
sudo apt autoremove --purge

# Clear systemd journal
sudo journalctl --vacuum-time=7d
sudo journalctl --vacuum-size=500M

# Find and remove duplicate files
fdupes -r /path/to/directory
```

### High I/O Wait

**Diagnosis:**
```bash
# Check I/O wait
iostat -x 1 5
# Look at %util and await columns

# Find I/O intensive processes
iotop -oPa
pidstat -d 1

# Check disk statistics
vmstat 1 5
# Look at bi (blocks in) and bo (blocks out)

# Identify slow disk
iostat -x 1 5
# High 'await' indicates slow disk
```

**Investigation:**
```bash
# Check for failing disk
sudo smartctl -a /dev/sda
dmesg | grep -i error

# Check disk errors
cat /sys/block/sda/device/ioerr_cnt

# Monitor disk performance
sudo iotop -oPa
sudo blktrace /dev/sda
```

**Solutions:**
```bash
# Optimize I/O scheduler
echo deadline > /sys/block/sda/queue/scheduler

# Increase readahead
sudo blockdev --setra 4096 /dev/sda

# Tune filesystem mount options
# Add to /etc/fstab: noatime,nodiratime

# Use faster disk (SSD instead of HDD)
# Implement RAID for performance
# Move to cloud storage
```

## Network Troubleshooting

### Cannot Connect to Server

**Diagnosis:**
```bash
# 1. Check if service is running
systemctl status nginx
ps aux | grep nginx

# 2. Check if port is listening
ss -tuln | grep :80
netstat -tuln | grep :80

# 3. Check firewall
sudo iptables -L -n
sudo ufw status

# 4. Test from local
curl http://localhost:80
telnet localhost 80
nc -zv localhost 80

# 5. Test from remote
ping server-ip
telnet server-ip 80
nc -zv server-ip 80
```

**Network Connectivity:**
```bash
# Ping test
ping -c 4 8.8.8.8       # Test internet
ping -c 4 gateway-ip     # Test gateway
ping -c 4 server-ip      # Test server

# DNS resolution
nslookup example.com
dig example.com
host example.com

# Traceroute
traceroute example.com
mtr example.com  # Better traceroute

# Check routing
ip route show
route -n
```

**Port and Service:**
```bash
# Check if port is open locally
sudo ss -tuln | grep :80

# Check from remote
nmap -p 80 server-ip
telnet server-ip 80
nc -zv server-ip 80

# Check listening addresses
ss -tuln
# 0.0.0.0:80 = listening on all interfaces
# 127.0.0.1:80 = only localhost
```

### Network Performance Issues

```bash
# Test bandwidth
iperf3 -s  # Server
iperf3 -c server-ip  # Client

# Check network errors
ip -s link show eth0
netstat -i

# Monitor connections
ss -s
ss -tan
watch -n 1 'ss -tan | tail -n +2 | awk "{print \$1}" | sort | uniq -c'

# Check TCP settings
sysctl -a | grep tcp

# Packet capture
sudo tcpdump -i eth0 -n port 80
sudo tcpdump -i eth0 -w capture.pcap
```

## Process Debugging

### Process Won't Start

**Diagnosis:**
```bash
# Check service status
systemctl status myapp.service

# View detailed logs
journalctl -u myapp.service -n 50
journalctl -u myapp.service --since "10 minutes ago"

# Check service file
systemctl cat myapp.service

# Try manual start
/usr/bin/myapp --config /etc/myapp/config.yml

# Check dependencies
ldd /usr/bin/myapp

# Check permissions
ls -l /usr/bin/myapp
namei -l /usr/bin/myapp
```

**Common Causes:**
```bash
# 1. Configuration error
/usr/bin/myapp --test-config

# 2. Permission denied
sudo chmod +x /usr/bin/myapp
sudo chown myapp:myapp /var/log/myapp

# 3. Port already in use
ss -tuln | grep :8080
# Kill process using port or change port

# 4. Missing dependencies
ldd /usr/bin/myapp
# Install missing libraries

# 5. Resource limits
ulimit -a
# Increase limits if needed
```

### Process Hangs/Freezes

```bash
# Check process state
ps aux | grep myapp
# D = uninterruptible sleep (I/O)
# S = sleeping
# R = running
# Z = zombie

# Get stack trace
sudo gdb -p <PID>
(gdb) thread apply all bt
(gdb) quit

# Trace system calls
sudo strace -p <PID>

# Check what process is waiting on
cat /proc/<PID>/wchan

# Check open files
lsof -p <PID>

# Force core dump (for analysis)
sudo gcore <PID>
```

### Zombie Processes

```bash
# Find zombie processes
ps aux | grep defunct
ps -eo pid,stat,comm | grep Z

# Zombies can't be killed directly
# Must kill parent process

# Find parent
ps -o ppid= -p <zombie-pid>

# Kill parent
kill <parent-pid>

# If parent is init (PID 1), reboot is needed
```

## Log Analysis

### Finding Issues in Logs

```bash
# Recent errors
journalctl -p err --since today
grep -i error /var/log/syslog | tail -50

# Application errors
journalctl -u myapp.service | grep -i error
tail -f /var/log/myapp/error.log

# Count error types
grep ERROR /var/log/myapp/app.log | awk '{print $5}' | sort | uniq -c | sort -rn

# Find pattern in logs
grep -r "connection refused" /var/log/

# Time-based search
journalctl --since "2024-01-01 00:00:00" --until "2024-01-01 23:59:59"

# Multiple log files
tail -f /var/log/nginx/*.log
multitail /var/log/nginx/access.log /var/log/nginx/error.log
```

### Log Correlation

```bash
# Correlate logs by timestamp
# Script to merge logs by timestamp
#!/bin/bash
cat /var/log/app1.log /var/log/app2.log | sort -k1,2

# Track request across logs
request_id="abc123"
grep -r "$request_id" /var/log/
```

## Common Issues

### Issue: System Won't Boot

```bash
# Boot into rescue mode
# GRUB menu: Advanced options → Recovery mode

# Check boot logs
journalctl -b -1  # Previous boot
dmesg

# Check fstab
cat /etc/fstab
# Comment out problematic mounts

# Check disk errors
fsck /dev/sda1

# Reinstall GRUB
grub-install /dev/sda
update-grub
```

### Issue: SSH Connection Refused

```bash
# Check SSH service
systemctl status sshd
journalctl -u sshd

# Check port
ss -tuln | grep :22

# Check firewall
sudo ufw status
sudo iptables -L INPUT

# Test SSH
ssh -v user@server  # Verbose

# Check SSH config
sudo sshd -t  # Test config
cat /etc/ssh/sshd_config

# Common fixes:
sudo systemctl start sshd
sudo ufw allow 22
```

### Issue: High Load Average

```bash
# Check load
uptime
# Load should be ≈ number of CPU cores

# If high load:
# 1. Check CPU usage
top

# 2. Check I/O wait
iostat -x 1

# 3. Check memory
free -h
vmstat 1

# 4. Find cause
# High CPU → top, ps
# High I/O → iotop
# High memory → free, ps aux --sort=-%mem
```

### Issue: Permission Denied

```bash
# Check file permissions
ls -l /path/to/file

# Check ownership
ls -l /path/to/file

# Check full path
namei -l /path/to/file

# Check SELinux/AppArmor
getenforce
sudo setenforce 0  # Temporarily disable to test

# Fix permissions
sudo chmod 644 /path/to/file
sudo chown user:group /path/to/file

# For directories
sudo chmod -R 755 /path/to/dir
```

### Issue: Time Synchronization

```bash
# Check system time
date
timedatectl

# Check NTP status
systemctl status systemd-timesyncd
timedatectl show-timesync

# Sync time manually
sudo systemctl restart systemd-timesyncd

# Or use ntpdate
sudo ntpdate -u pool.ntp.org

# Set timezone
timedatectl set-timezone America/New_York
```

### Issue: DNS Resolution Failed

```bash
# Test DNS
nslookup example.com
dig example.com

# Check resolv.conf
cat /etc/resolv.conf

# Check systemd-resolved
resolvectl status

# Flush DNS cache
sudo systemd-resolve --flush-caches
# Or
sudo resolvectl flush-caches

# Test with specific DNS
dig @8.8.8.8 example.com

# Fix: Update DNS servers
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
```

---

**Related Topics:**
- See [performance-tuning.md](performance-tuning.md) for optimization
- See [system-monitoring.md](system-monitoring.md) for proactive monitoring
- See [networking-fundamentals.md](networking-fundamentals.md) for network issues
- See [linux-administration.md](linux-administration.md) for system management
