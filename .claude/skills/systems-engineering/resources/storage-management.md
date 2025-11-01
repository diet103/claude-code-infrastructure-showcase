# Storage Management

Comprehensive guide to Linux storage management covering LVM operations, RAID configurations, filesystem selection, backup strategies, and capacity planning.

## Table of Contents

- [Storage Architecture](#storage-architecture)
- [LVM Operations](#lvm-operations)
- [RAID Configurations](#raid-configurations)
- [Filesystem Selection](#filesystem-selection)
- [Backup Strategies](#backup-strategies)
- [Snapshot Management](#snapshot-management)
- [Performance Monitoring](#performance-monitoring)
- [Capacity Planning](#capacity-planning)

## Storage Architecture

### Storage Stack

```
Applications
    ↓
Filesystem (ext4, xfs, btrfs)
    ↓
Logical Volume (LVM)
    ↓
RAID (mdadm)
    ↓
Physical Devices (SSD, HDD)
```

### Disk Information

```bash
# List block devices
lsblk
lsblk -f  # With filesystem info

# Disk details
sudo fdisk -l
sudo parted -l

# Disk usage
df -h
df -i  # Inode usage

# SMART info (disk health)
sudo apt install smartmontools
sudo smartctl -a /dev/sda
sudo smartctl -H /dev/sda  # Health summary
```

## LVM Operations

### LVM Concepts

```
Physical Volumes (PV) → Volume Groups (VG) → Logical Volumes (LV)
/dev/sda1, /dev/sdb1 → vg_data → lv_data, lv_logs
```

### Creating LVM

```bash
# 1. Create physical volume
sudo pvcreate /dev/sdb
sudo pvcreate /dev/sdc

# View PVs
sudo pvdisplay
sudo pvs

# 2. Create volume group
sudo vgcreate vg_data /dev/sdb /dev/sdc

# View VGs
sudo vgdisplay
sudo vgs

# 3. Create logical volume
sudo lvcreate -L 100G -n lv_data vg_data
# Or use percentage
sudo lvcreate -l 100%FREE -n lv_data vg_data

# View LVs
sudo lvdisplay
sudo lvs

# 4. Create filesystem
sudo mkfs.ext4 /dev/vg_data/lv_data

# 5. Mount
sudo mkdir -p /mnt/data
sudo mount /dev/vg_data/lv_data /mnt/data

# 6. Add to fstab
echo '/dev/vg_data/lv_data /mnt/data ext4 defaults 0 2' | sudo tee -a /etc/fstab
```

### Extending LVM

```bash
# Add new disk to VG
sudo pvcreate /dev/sdd
sudo vgextend vg_data /dev/sdd

# Extend logical volume
sudo lvextend -L +50G /dev/vg_data/lv_data
# Or use all free space
sudo lvextend -l +100%FREE /dev/vg_data/lv_data

# Resize filesystem
# ext4
sudo resize2fs /dev/vg_data/lv_data

# xfs
sudo xfs_growfs /mnt/data

# All in one (extend LV and resize FS)
sudo lvextend -L +50G -r /dev/vg_data/lv_data
```

### Reducing LVM (ext4 only, not xfs)

```bash
# CAUTION: Back up data first!
# Cannot shrink mounted filesystem

# 1. Unmount
sudo umount /mnt/data

# 2. Check filesystem
sudo e2fsck -f /dev/vg_data/lv_data

# 3. Resize filesystem first
sudo resize2fs /dev/vg_data/lv_data 50G

# 4. Reduce LV
sudo lvreduce -L 50G /dev/vg_data/lv_data

# 5. Remount
sudo mount /dev/vg_data/lv_data /mnt/data
```

### LVM Snapshots

```bash
# Create snapshot (10G for changes)
sudo lvcreate -L 10G -s -n lv_data_snap /dev/vg_data/lv_data

# Mount snapshot
sudo mkdir -p /mnt/snap
sudo mount /dev/vg_data/lv_data_snap /mnt/snap

# Use for backup
tar -czf /backup/data-$(date +%Y%m%d).tar.gz -C /mnt/snap .

# Remove snapshot
sudo umount /mnt/snap
sudo lvremove /dev/vg_data/lv_data_snap

# Revert to snapshot (restore)
sudo umount /mnt/data
sudo lvconvert --merge /dev/vg_data/lv_data_snap
# Reboot to complete merge
sudo reboot
```

### Removing LVM

```bash
# 1. Unmount
sudo umount /mnt/data

# 2. Remove LV
sudo lvremove /dev/vg_data/lv_data

# 3. Remove VG
sudo vgremove vg_data

# 4. Remove PV
sudo pvremove /dev/sdb /dev/sdc
```

## RAID Configurations

### RAID Levels

```
RAID 0 (Striping)
- Min disks: 2
- Capacity: Sum of all disks
- Performance: Excellent (read/write)
- Redundancy: None
- Use: Non-critical data, temp storage

RAID 1 (Mirroring)
- Min disks: 2
- Capacity: Size of smallest disk
- Performance: Good read, normal write
- Redundancy: Can lose N-1 disks
- Use: Critical data, boot drives

RAID 5 (Striping + Parity)
- Min disks: 3
- Capacity: (N-1) × disk size
- Performance: Good read, moderate write
- Redundancy: Can lose 1 disk
- Use: File servers, general storage

RAID 6 (Striping + Double Parity)
- Min disks: 4
- Capacity: (N-2) × disk size
- Performance: Good read, slower write
- Redundancy: Can lose 2 disks
- Use: Large arrays, critical data

RAID 10 (Mirror + Stripe)
- Min disks: 4
- Capacity: (N/2) × disk size
- Performance: Excellent
- Redundancy: Can lose 1 disk per mirror
- Use: Databases, high performance
```

### Creating RAID with mdadm

```bash
# Install mdadm
sudo apt install mdadm

# RAID 1 (mirror)
sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc

# RAID 5
sudo mdadm --create /dev/md0 --level=5 --raid-devices=3 /dev/sdb /dev/sdc /dev/sdd

# RAID 10
sudo mdadm --create /dev/md0 --level=10 --raid-devices=4 /dev/sdb /dev/sdc /dev/sdd /dev/sde

# Check status
cat /proc/mdstat
sudo mdadm --detail /dev/md0

# Create filesystem
sudo mkfs.ext4 /dev/md0

# Mount
sudo mkdir -p /mnt/raid
sudo mount /dev/md0 /mnt/raid

# Save configuration
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf
sudo update-initramfs -u

# Add to fstab
echo '/dev/md0 /mnt/raid ext4 defaults 0 2' | sudo tee -a /etc/fstab
```

### RAID Maintenance

```bash
# Monitor RAID
cat /proc/mdstat
sudo mdadm --detail /dev/md0

# Check for errors
sudo mdadm --examine /dev/sdb
dmesg | grep md

# Replace failed disk
# 1. Mark disk as failed (if not auto-detected)
sudo mdadm /dev/md0 --fail /dev/sdb

# 2. Remove failed disk
sudo mdadm /dev/md0 --remove /dev/sdb

# 3. Physically replace disk

# 4. Add new disk
sudo mdadm /dev/md0 --add /dev/sdb

# 5. Monitor rebuild
watch cat /proc/mdstat

# Stop RAID
sudo umount /mnt/raid
sudo mdadm --stop /dev/md0

# Remove RAID
sudo mdadm --remove /dev/md0
sudo mdadm --zero-superblock /dev/sdb /dev/sdc
```

## Filesystem Selection

### Filesystem Comparison

```
ext4
- Mature, stable
- Max file: 16TB
- Max volume: 1EB
- Good general performance
- No built-in compression
- Use: General purpose, boot drives

xfs
- High performance
- Max file: 8EB
- Max volume: 8EB
- Excellent for large files
- Cannot shrink
- Use: Large files, databases, NFS

btrfs
- Modern features
- Snapshots, compression
- Self-healing with redundancy
- CoW (Copy-on-Write)
- Still maturing
- Use: Advanced features needed

ZFS
- Enterprise features
- Built-in RAID
- Compression, deduplication
- High memory usage
- Licensing concerns
- Use: Enterprise storage
```

### Creating Filesystems

```bash
# ext4
sudo mkfs.ext4 /dev/sdb1
sudo mkfs.ext4 -L "data_volume" /dev/sdb1  # With label

# xfs
sudo mkfs.xfs /dev/sdb1
sudo mkfs.xfs -L "data_volume" /dev/sdb1

# btrfs
sudo mkfs.btrfs /dev/sdb1
sudo mkfs.btrfs -L "data_volume" /dev/sdb1

# Check filesystem
sudo fsck.ext4 /dev/sdb1
sudo xfs_repair /dev/sdb1
sudo btrfs check /dev/sdb1
```

### Filesystem Tuning

```bash
# ext4 optimization
# Reserve less space for root (default 5%)
sudo tune2fs -m 1 /dev/sdb1

# Disable access time updates
# Add to /etc/fstab
/dev/sdb1 /data ext4 noatime,nodiratime 0 2

# xfs optimization
# Mount options in /etc/fstab
/dev/sdb1 /data xfs noatime,nodiratime,logbufs=8,logbsize=256k 0 2

# View filesystem info
sudo tune2fs -l /dev/sdb1  # ext4
sudo xfs_info /dev/sdb1    # xfs
```

## Backup Strategies

### Backup Methods

#### 1. rsync Backups

```bash
# Basic rsync backup
rsync -avz --delete /source/ /backup/

# Remote backup
rsync -avz -e ssh /source/ user@backup-server:/backup/

# Exclude files
rsync -avz --exclude='*.tmp' --exclude='cache/' /source/ /backup/

# Incremental backup with hard links
rsync -avz --link-dest=/backup/2024-01-01/ /source/ /backup/2024-01-02/

# Backup script with rotation
#!/bin/bash
SOURCE="/data"
BACKUP_DIR="/backup"
DATE=$(date +%Y-%m-%d)
LATEST="$BACKUP_DIR/latest"

# Create backup with hard links to previous
rsync -avz --delete --link-dest="$LATEST" "$SOURCE/" "$BACKUP_DIR/$DATE/"

# Update latest link
rm -f "$LATEST"
ln -s "$DATE" "$LATEST"

# Delete backups older than 30 days
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;
```

#### 2. tar Backups

```bash
# Create archive
tar -czf backup-$(date +%Y%m%d).tar.gz /data

# Incremental backup
tar -czf full-backup.tar.gz -g snapshot.file /data
# Later incremental
tar -czf inc-backup.tar.gz -g snapshot.file /data

# Extract
tar -xzf backup.tar.gz -C /restore/

# Verify
tar -tzf backup.tar.gz
```

#### 3. restic (Modern Backup Tool)

```bash
# Install restic
sudo apt install restic

# Initialize repository
restic init --repo /backup/restic

# Backup
restic backup /data --repo /backup/restic

# List snapshots
restic snapshots --repo /backup/restic

# Restore
restic restore latest --target /restore --repo /backup/restic

# Forget old backups
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --repo /backup/restic
restic prune --repo /backup/restic
```

#### 4. Borg Backup

```bash
# Install
sudo apt install borgbackup

# Initialize
borg init --encryption=repokey /backup/borg

# Create backup
borg create /backup/borg::$(date +%Y-%m-%d) /data

# List archives
borg list /backup/borg

# Restore
borg extract /backup/borg::2024-01-01

# Prune old backups
borg prune /backup/borg --keep-daily=7 --keep-weekly=4 --keep-monthly=6
```

### Backup Strategy (3-2-1 Rule)

```
3 copies of data
2 different media types
1 offsite copy

Example:
- Original data on server
- Local backup on NAS
- Cloud backup (AWS S3, Backblaze B2)
```

## Snapshot Management

### LVM Snapshots (covered above)

### btrfs Snapshots

```bash
# Create snapshot
sudo btrfs subvolume snapshot /mnt/data /mnt/data/.snapshots/$(date +%Y-%m-%d)

# List snapshots
sudo btrfs subvolume list /mnt/data

# Delete snapshot
sudo btrfs subvolume delete /mnt/data/.snapshots/2024-01-01

# Automated snapshots
#!/bin/bash
SUBVOL="/mnt/data"
SNAP_DIR="$SUBVOL/.snapshots"

mkdir -p "$SNAP_DIR"

# Create snapshot
sudo btrfs subvolume snapshot -r "$SUBVOL" "$SNAP_DIR/$(date +%Y-%m-%d-%H%M%S)"

# Keep only last 7 days
find "$SNAP_DIR" -maxdepth 1 -type d -mtime +7 | while read snap; do
    sudo btrfs subvolume delete "$snap"
done
```

## Performance Monitoring

### Disk Performance

```bash
# I/O statistics
iostat -x 1 5

# Key metrics:
# - %util: Disk utilization
# - await: Average wait time
# - r/s, w/s: Read/write per second
# - rkB/s, wkB/s: Throughput

# Per-process I/O
sudo iotop
sudo iotop -oPa  # Accumulated I/O

# Disk latency
sudo ioping /dev/sda

# Benchmark disk
# Write test
dd if=/dev/zero of=/tmp/testfile bs=1G count=1 oflag=direct

# Read test
dd if=/tmp/testfile of=/dev/null bs=1G count=1 iflag=direct

# Better benchmarking with fio
sudo apt install fio
fio --name=random-read --ioengine=libaio --iodepth=16 --rw=randread --bs=4k --direct=1 --size=1G --numjobs=4 --runtime=60 --group_reporting
```

## Capacity Planning

### Monitoring Disk Usage

```bash
# Disk usage
df -h
du -sh /*
du -sh /var/* | sort -h

# Find large files
find / -type f -size +1G -exec ls -lh {} \; 2>/dev/null

# Disk usage trends
# Use monitoring tools (Prometheus + Grafana)
# Or cron job
cat > /usr/local/bin/disk-usage-log.sh <<'EOF'
#!/bin/bash
echo "$(date +%Y-%m-%d,%H:%M:%S),$(df / | tail -1 | awk '{print $5}')" >> /var/log/disk-usage.csv
EOF

chmod +x /usr/local/bin/disk-usage-log.sh

# Add to cron (hourly)
0 * * * * /usr/local/bin/disk-usage-log.sh
```

### Capacity Planning

```bash
# Calculate growth rate
# Analyze disk-usage.csv
awk -F, '{print $1,$3}' /var/log/disk-usage.csv | \
  awk 'NR>1 {print ($2-prev)/(NR-1); prev=$2}'

# Predict when disk will be full
# Based on growth rate and current usage
# Alert when > 80% full
```

### Cleanup Strategies

```bash
# Log rotation (automatic)
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 myapp myapp
}

# Clean package cache
sudo apt clean
sudo yum clean all

# Clean systemd journal
sudo journalctl --vacuum-time=30d
sudo journalctl --vacuum-size=1G

# Remove old kernels
sudo apt autoremove --purge

# Clean temp files
sudo find /tmp -type f -atime +7 -delete
sudo find /var/tmp -type f -atime +30 -delete
```

---

**Related Topics:**
- See [linux-administration.md](linux-administration.md) for filesystem basics
- See [performance-tuning.md](performance-tuning.md) for I/O optimization
- See [troubleshooting-guide.md](troubleshooting-guide.md) for disk issues
- See [automation-patterns.md](automation-patterns.md) for backup automation
