# Performance Tuning

Comprehensive guide to Linux system performance tuning covering CPU optimization, memory management, disk I/O, network performance, profiling tools, and benchmarking for maximum efficiency.

## Table of Contents

- [Performance Analysis Methodology](#performance-analysis-methodology)
- [CPU Optimization](#cpu-optimization)
- [Memory Tuning](#memory-tuning)
- [Disk I/O Optimization](#disk-io-optimization)
- [Network Performance](#network-performance)
- [Profiling Tools](#profiling-tools)
- [Benchmarking](#benchmarking)
- [Kernel Parameters](#kernel-parameters)
- [Best Practices](#best-practices)
- [Common Issues](#common-issues)

## Performance Analysis Methodology

### The USE Method (Utilization, Saturation, Errors)

```
For every resource:
1. Utilization: % time the resource was busy
2. Saturation: Degree of extra work queued
3. Errors: Count of error events
```

**Analysis Workflow:**
```bash
#!/bin/bash
# performance-check.sh - Quick system performance overview

echo "=== CPU Analysis ==="
uptime
mpstat -P ALL 1 1

echo -e "\n=== Memory Analysis ==="
free -h
vmstat 1 2

echo -e "\n=== Disk I/O Analysis ==="
iostat -x 1 2

echo -e "\n=== Network Analysis ==="
ss -s
sar -n DEV 1 2 2>/dev/null || echo "sysstat not installed"

echo -e "\n=== Top Processes ==="
ps aux --sort=-%cpu | head -10
```

## CPU Optimization

### CPU Affinity

**Pin Process to Specific CPUs:**
```bash
# Run process on CPUs 0-3
taskset -c 0-3 ./my-application

# Pin existing process
taskset -cp 0-3 <PID>

# View current affinity
taskset -cp <PID>

# Example: Pin nginx workers
for pid in $(pgrep nginx); do
    taskset -cp 0-3 $pid
done
```

**systemd Service CPU Affinity:**
```ini
# /etc/systemd/system/myapp.service
[Service]
CPUAffinity=0-3
CPUQuota=200%  # Allow up to 2 CPUs
CPUWeight=200  # Higher scheduling priority
```

### CPU Governors

```bash
# View available governors
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors

# Check current governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Set performance governor (maximum frequency)
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Set powersave governor (minimum frequency)
echo powersave | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Install cpufrequtils for easier management
sudo apt install cpufrequtils

# Set governor permanently
sudo cpufreq-set -g performance

# Check CPU frequencies
cpufreq-info
watch -n 1 'grep MHz /proc/cpuinfo'
```

### Process Priority (nice/renice)

```bash
# Start with lower priority (higher nice value = lower priority)
nice -n 10 ./cpu-intensive-job

# Start with higher priority (requires root)
sudo nice -n -10 ./critical-service

# Change priority of running process
sudo renice -n -5 -p <PID>

# Set priority for all processes of a user
sudo renice -n 5 -u username

# View process priorities
ps -eo pid,ni,comm --sort=-ni | head
```

### CPU Monitoring

```bash
# Real-time CPU usage per core
mpstat -P ALL 1

# Per-process CPU usage
pidstat 1

# CPU usage history
sar -u 1 10

# Top CPU consumers
top -bn1 | head -20
ps aux --sort=-%cpu | head -10

# CPU wait time (I/O wait)
iostat -c 1
```

## Memory Tuning

### Swap Configuration

```bash
# Check current swap
free -h
swapon --show

# Create swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Adjust swappiness (0-100, lower = less swapping)
# Default: 60, Recommended for servers: 10
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.d/99-swappiness.conf

# Disable swap completely (for k8s nodes)
sudo swapoff -a
# Comment out swap in /etc/fstab
```

### Huge Pages

**When to Use:**
- Large memory workloads (databases, VMs)
- Reduces TLB misses
- Better for applications with large memory allocations

```bash
# Check huge page size
grep Hugepagesize /proc/meminfo

# Configure huge pages (2MB pages)
# Calculate: (Required RAM in MB) / 2
# Example: For 4GB = 4096 / 2 = 2048 pages

# Temporary
echo 2048 | sudo tee /proc/sys/vm/nr_hugepages

# Permanent
echo 'vm.nr_hugepages=2048' | sudo tee -a /etc/sysctl.d/99-hugepages.conf
sudo sysctl -p /etc/sysctl.d/99-hugepages.conf

# Check allocation
cat /proc/meminfo | grep -i huge

# Mount hugetlbfs
sudo mkdir -p /mnt/huge
sudo mount -t hugetlbfs hugetlbfs /mnt/huge
echo 'hugetlbfs /mnt/huge hugetlbfs defaults 0 0' | sudo tee -a /etc/fstab

# Application usage (example for PostgreSQL)
# postgresql.conf
# huge_pages = on
```

### Memory Optimization

```bash
# /etc/sysctl.d/99-memory.conf

# Swappiness (lower = less swap usage)
vm.swappiness = 10

# Cache pressure (higher = more aggressive cache reclaim)
vm.vfs_cache_pressure = 50

# Dirty page ratios
vm.dirty_ratio = 15              # % of RAM for dirty pages before blocking
vm.dirty_background_ratio = 5    # % to start background writes

# Overcommit strategy
vm.overcommit_memory = 1         # 0=heuristic, 1=always, 2=never
vm.overcommit_ratio = 50         # % of RAM for overcommit

# Minimum free memory (in KB)
vm.min_free_kbytes = 65536

# Apply changes
sudo sysctl -p /etc/sysctl.d/99-memory.conf
```

### Memory Monitoring

```bash
# Memory overview
free -h
cat /proc/meminfo

# Detailed memory stats
vmstat 1 5

# Per-process memory
ps aux --sort=-%mem | head -10
pmap -x <PID>

# Memory pressure (PSI - Pressure Stall Information)
cat /proc/pressure/memory

# OOM killer history
dmesg | grep -i oom

# Memory bandwidth (if available)
perf stat -e 'mem-loads,mem-stores' -a sleep 5
```

## Disk I/O Optimization

### I/O Schedulers

```bash
# Check current scheduler
cat /sys/block/sda/queue/scheduler

# Available schedulers: none, mq-deadline, kyber, bfq

# Set scheduler temporarily
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler

# Set permanently (via kernel parameter)
# Edit /etc/default/grub
GRUB_CMDLINE_LINUX="elevator=mq-deadline"
sudo update-grub

# Recommended schedulers:
# - SSD/NVMe: none (no scheduler, direct I/O)
# - HDD: mq-deadline or bfq
# - Database workloads: mq-deadline
# - Desktop: bfq
```

### Readahead Tuning

```bash
# Check current readahead
sudo blockdev --getra /dev/sda

# Set readahead (in 512-byte sectors)
# Default: 256 (128KB)
# Recommended for sequential: 4096 (2MB)
sudo blockdev --setra 4096 /dev/sda

# Make permanent
echo 'ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/read_ahead_kb}="2048"' | \
  sudo tee /etc/udev/rules.d/60-readahead.rules
```

### Filesystem Mount Options

```bash
# /etc/fstab optimization examples

# noatime: Don't update access time (significant performance boost)
UUID=xxx /data ext4 defaults,noatime,nodiratime 0 2

# For databases (PostgreSQL, MySQL)
UUID=xxx /var/lib/postgresql ext4 noatime,data=ordered,barrier=1 0 2

# For high-performance write workloads
UUID=xxx /data xfs noatime,nodiratime,logbufs=8,logbsize=256k 0 2

# For SSDs
UUID=xxx /data ext4 noatime,discard 0 2
```

### I/O Monitoring

```bash
# Disk I/O statistics
iostat -x 1 5

# Per-process I/O
iotop
iotop -oPa  # Show accumulated I/O

# Disk usage
df -h
du -sh /var/* | sort -h

# Find large files
find / -type f -size +1G -exec ls -lh {} \;

# I/O wait time
vmstat 1 5  # Check 'wa' column

# Detailed I/O stats
pidstat -d 1

# Block device stats
cat /proc/diskstats
```

## Network Performance

### TCP/IP Tuning

```bash
# /etc/sysctl.d/99-network-performance.conf

# === TCP Buffer Sizes ===
# Increase for high-bandwidth networks (10Gbps+)
net.core.rmem_max = 134217728          # 128MB
net.core.wmem_max = 134217728          # 128MB
net.core.rmem_default = 16777216       # 16MB
net.core.wmem_default = 16777216       # 16MB

# TCP autotuning
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# === TCP Performance ===
# Window scaling
net.ipv4.tcp_window_scaling = 1

# Timestamps
net.ipv4.tcp_timestamps = 1

# Selective acknowledgments
net.ipv4.tcp_sack = 1

# TCP Fast Open
net.ipv4.tcp_fastopen = 3

# === Congestion Control ===
# BBR (recommended for modern kernels)
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# === Connection Handling ===
# SYN backlog
net.ipv4.tcp_max_syn_backlog = 8192
net.core.somaxconn = 4096

# Connection tracking
net.netfilter.nf_conntrack_max = 1000000
net.nf_conntrack_max = 1000000

# TIME_WAIT reuse
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Keep-alive
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15

# === Network Buffers ===
net.core.netdev_max_backlog = 5000
net.core.netdev_budget = 600

# Apply settings
sudo sysctl -p /etc/sysctl.d/99-network-performance.conf
```

### NIC Ring Buffers

```bash
# Check current ring buffer sizes
ethtool -g eth0

# Increase ring buffer size
sudo ethtool -G eth0 rx 4096 tx 4096

# Make permanent (systemd)
# /etc/systemd/system/ethtool-ring.service
[Unit]
Description=Ethtool ring buffer configuration
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/ethtool -G eth0 rx 4096 tx 4096

[Install]
WantedBy=multi-user.target
```

### Network Monitoring

```bash
# Interface statistics
ip -s link show eth0
netstat -i

# Bandwidth monitoring
iftop -i eth0
nload eth0

# Connection statistics
ss -s

# Network throughput
iperf3 -s  # Server
iperf3 -c server-ip  # Client

# Packet statistics
sar -n DEV 1 5

# TCP statistics
nstat -az | grep -i tcp
```

## Profiling Tools

### perf

```bash
# Install perf
sudo apt install linux-tools-$(uname -r)

# Record system-wide CPU usage
sudo perf record -a -g sleep 30

# Analyze recorded data
sudo perf report

# Record specific process
sudo perf record -p <PID> -g sleep 30

# Live top (like top but with perf)
sudo perf top

# CPU cache statistics
sudo perf stat -e cache-references,cache-misses ./application

# Memory access patterns
sudo perf stat -e mem-loads,mem-stores ./application

# Branch prediction
sudo perf stat -e branches,branch-misses ./application

# Flamegraph generation
sudo perf record -F 99 -a -g -- sleep 30
sudo perf script | ./stackcollapse-perf.pl | ./flamegraph.pl > flamegraph.svg
```

### strace

```bash
# Trace system calls
strace ./application

# Trace specific syscalls
strace -e open,read,write ./application

# Attach to running process
sudo strace -p <PID>

# Count syscalls
strace -c ./application

# Save to file
strace -o trace.log ./application

# Trace with timestamps
strace -tt ./application

# Trace child processes
strace -f ./application
```

### ftrace

```bash
# Function tracing
cd /sys/kernel/debug/tracing

# Enable function tracing
echo function > current_tracer

# Set filter
echo 'sys_read' > set_ftrace_filter

# Enable tracing
echo 1 > tracing_on

# View trace
cat trace

# Disable tracing
echo 0 > tracing_on
```

### BPF/bpftrace

```bash
# Install bpftrace
sudo apt install bpftrace

# Trace open() syscalls
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_open { printf("%s %s\n", comm, str(args->filename)); }'

# Count syscalls by process
sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# TCP connection tracking
sudo bpftrace -e 'kprobe:tcp_connect { printf("PID %d connecting\n", pid); }'

# Disk I/O latency
sudo bpftrace -e 'tracepoint:block:block_rq_issue { @start[arg0] = nsecs; }
tracepoint:block:block_rq_complete /@start[arg0]/ {
  @usecs = hist((nsecs - @start[arg0]) / 1000);
  delete(@start[arg0]);
}'
```

## Benchmarking

### CPU Benchmarks

```bash
# sysbench CPU test
sudo apt install sysbench

# Single-threaded
sysbench cpu --cpu-max-prime=20000 run

# Multi-threaded
sysbench cpu --threads=4 --cpu-max-prime=20000 run

# stress-ng
sudo apt install stress-ng

# CPU stress test
stress-ng --cpu 4 --timeout 60s --metrics
```

### Memory Benchmarks

```bash
# sysbench memory test
sysbench memory --memory-total-size=10G --memory-oper=read run
sysbench memory --memory-total-size=10G --memory-oper=write run

# RAM speed test
sudo apt install mbw
mbw 1024

# Memory bandwidth
sysbench memory --threads=4 --memory-total-size=10G run
```

### Disk I/O Benchmarks

```bash
# fio - Flexible I/O tester
sudo apt install fio

# Random read test
fio --name=randread --ioengine=libaio --iodepth=16 --rw=randread \
    --bs=4k --direct=1 --size=1G --numjobs=4 --runtime=60 --group_reporting

# Sequential write test
fio --name=seqwrite --ioengine=libaio --iodepth=16 --rw=write \
    --bs=1M --direct=1 --size=1G --numjobs=1 --runtime=60

# Mixed workload (70% read, 30% write)
fio --name=mixed --ioengine=libaio --iodepth=16 --rw=randrw --rwmixread=70 \
    --bs=4k --direct=1 --size=1G --numjobs=4 --runtime=60 --group_reporting

# dd test (simple sequential)
dd if=/dev/zero of=testfile bs=1G count=1 oflag=direct
dd if=testfile of=/dev/null bs=1G count=1 iflag=direct
```

### Network Benchmarks

```bash
# iperf3
sudo apt install iperf3

# Server
iperf3 -s

# Client (TCP)
iperf3 -c server-ip -t 30

# Client (UDP)
iperf3 -c server-ip -u -b 1G

# Parallel streams
iperf3 -c server-ip -P 4

# netperf
sudo apt install netperf

# TCP stream test
netperf -H server-ip -t TCP_STREAM

# TCP request/response
netperf -H server-ip -t TCP_RR
```

## Kernel Parameters

### Complete Performance Tuning Configuration

```bash
# /etc/sysctl.d/99-performance.conf

# === CPU ===
# Scheduler
kernel.sched_migration_cost_ns = 5000000
kernel.sched_autogroup_enabled = 0

# === Memory ===
vm.swappiness = 10
vm.vfs_cache_pressure = 50
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.min_free_kbytes = 65536

# Huge pages
vm.nr_hugepages = 1024

# === Disk I/O ===
# Writeback
vm.dirty_writeback_centisecs = 500
vm.dirty_expire_centisecs = 3000

# === Network ===
# Buffer sizes
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# TCP performance
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_sack = 1
net.ipv4.tcp_fastopen = 3

# Congestion control
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

# Connection handling
net.ipv4.tcp_max_syn_backlog = 8192
net.core.somaxconn = 4096
net.core.netdev_max_backlog = 5000

# TIME_WAIT
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# === File Descriptors ===
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288

# === Security (with performance consideration) ===
kernel.randomize_va_space = 2
kernel.kptr_restrict = 1

# Apply
sudo sysctl -p /etc/sysctl.d/99-performance.conf
```

## Best Practices

### 1. Measure Before Optimizing

```bash
# Establish baseline
#!/bin/bash
echo "=== Baseline Performance ==="
echo "Date: $(date)"
echo ""

# CPU
echo "CPU Load:"
uptime

# Memory
echo -e "\nMemory:"
free -h

# Disk I/O
echo -e "\nDisk I/O:"
iostat -x 1 2 | tail -n +4

# Network
echo -e "\nNetwork:"
ss -s

# Save baseline
./baseline.sh > baseline-$(date +%Y%m%d).txt
```

### 2. One Change at a Time

- Make single parameter changes
- Document each change
- Measure impact before next change
- Keep rollback plan ready

### 3. Test in Staging First

```bash
# Never tune production directly
# Use staging environment
# Load test after changes
# Monitor for regressions
```

### 4. Monitor Continuously

```bash
# Set up monitoring before tuning
# Track:
# - CPU utilization
# - Memory usage
# - Disk I/O wait
# - Network throughput
# - Application latency
```

### 5. Document Everything

```bash
# Performance tuning log
# /var/log/performance-tuning.log
Date: 2025-01-15
Change: Increased TCP buffer sizes
Parameter: net.core.rmem_max = 134217728
Reason: High-bandwidth network, buffer exhaustion
Result: Throughput increased from 800Mbps to 9.5Gbps
```

## Common Issues

### High CPU Usage

```bash
# Identify CPU hogs
top -bn1 | head -20
ps aux --sort=-%cpu | head -10

# Check CPU wait time
iostat -c 1 5

# Profile application
sudo perf top -p <PID>

# Solutions:
# - Optimize code
# - Increase CPU quota
# - Horizontal scaling
# - Better algorithm
```

### Memory Exhaustion

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check for memory leaks
valgrind --leak-check=full ./application

# OOM killer logs
dmesg | grep -i oom

# Solutions:
# - Increase RAM
# - Fix memory leaks
# - Adjust swappiness
# - Add swap space
# - Optimize application
```

### Disk I/O Bottleneck

```bash
# Check I/O wait
iostat -x 1 5
vmstat 1 5

# Find I/O intensive processes
iotop -oPa

# Solutions:
# - Use SSD instead of HDD
# - Optimize I/O scheduler
# - Increase readahead
# - Use RAID for performance
# - Add more disks
# - Optimize application queries
```

### Network Congestion

```bash
# Check network stats
ss -s
netstat -i
sar -n DEV 1 5

# Check for dropped packets
ethtool -S eth0 | grep drop

# Solutions:
# - Increase TCP buffers
# - Use BBR congestion control
# - Increase ring buffers
# - Check for bandwidth limits
# - Optimize application
```

---

**Related Topics:**
- See [linux-administration.md](linux-administration.md) for system management
- See [troubleshooting-guide.md](troubleshooting-guide.md) for debugging
- See [system-monitoring.md](system-monitoring.md) for monitoring setup
- See [networking-fundamentals.md](networking-fundamentals.md) for network tuning
