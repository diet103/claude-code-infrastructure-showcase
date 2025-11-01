# Automation Patterns

Comprehensive guide to automation patterns covering cron jobs, systemd timers, event-driven automation, idempotency, error handling, and testing for reliable operational automation.

## Table of Contents

- [Automation Philosophy](#automation-philosophy)
- [Cron Jobs](#cron-jobs)
- [systemd Timers](#systemd-timers)
- [Event-Driven Automation](#event-driven-automation)
- [Idempotency Patterns](#idempotency-patterns)
- [Error Handling](#error-handling)
- [Logging and Notifications](#logging-and-notifications)
- [Testing Automation](#testing-automation)

## Automation Philosophy

### When to Automate

```
Automate if:
✓ Task is repetitive
✓ Task is time-consuming
✓ Task is error-prone when manual
✓ Task needs to run on schedule
✓ Task requires consistency

Don't automate if:
✗ Task rarely runs
✗ Automation time > manual time savings
✗ Task requires human judgment
✗ One-time operation
```

### Automation Principles

1. **Idempotent**: Safe to run multiple times
2. **Observable**: Log everything
3. **Resilient**: Handle failures gracefully
4. **Testable**: Can be tested before production
5. **Documented**: Clear purpose and behavior

## Cron Jobs

### Cron Syntax

```
* * * * * command
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday=0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)

Special strings:
@reboot    - Run once at startup
@yearly    - 0 0 1 1 * (Jan 1, midnight)
@monthly   - 0 0 1 * * (1st of month, midnight)
@weekly    - 0 0 * * 0 (Sunday, midnight)
@daily     - 0 0 * * * (Every day, midnight)
@hourly    - 0 * * * * (Every hour)
```

### Cron Examples

```bash
# Edit crontab
crontab -e

# List cron jobs
crontab -l

# System-wide cron
sudo vim /etc/crontab
ls /etc/cron.d/
ls /etc/cron.{hourly,daily,weekly,monthly}/

# Examples
# Run every day at 2 AM
0 2 * * * /usr/local/bin/backup.sh

# Run every hour
0 * * * * /usr/local/bin/cleanup.sh

# Run every 15 minutes
*/15 * * * * /usr/local/bin/monitor.sh

# Run on weekdays at 9 AM
0 9 * * 1-5 /usr/local/bin/report.sh

# Run first day of month
0 0 1 * * /usr/local/bin/monthly-report.sh

# Multiple times
0 0,6,12,18 * * * /usr/local/bin/check.sh

# Run every 5 minutes during business hours
*/5 9-17 * * 1-5 /usr/local/bin/poll.sh
```

### Production Cron Job

```bash
#!/bin/bash
# /usr/local/bin/backup-cron.sh
# Daily database backup with error handling

set -euo pipefail

# Configuration
readonly BACKUP_DIR="/backup/database"
readonly LOG_FILE="/var/log/backup-cron.log"
readonly RETENTION_DAYS=7
readonly DB_NAME="production"
readonly SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

notify_slack() {
    local message=$1
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$message\"}" \
        "$SLACK_WEBHOOK" 2>/dev/null || true
}

# Error handling
trap 'log "ERROR: Backup failed"; notify_slack "❌ Backup failed"; exit 1' ERR

# Main backup
log "Starting backup"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/db-$DB_NAME-$(date +%Y%m%d-%H%M%S).sql.gz"

# Perform backup
pg_dump "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup successful: $BACKUP_FILE ($SIZE)"
    notify_slack "✅ Backup successful: $(basename $BACKUP_FILE) ($SIZE)"
else
    log "ERROR: Backup file is empty or missing"
    notify_slack "❌ Backup failed: Empty or missing file"
    exit 1
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "db-$DB_NAME-*.sql.gz" -mtime +$RETENTION_DAYS -delete
log "Cleaned up backups older than $RETENTION_DAYS days"

log "Backup completed successfully"
```

```bash
# Cron entry
0 2 * * * /usr/local/bin/backup-cron.sh
```

### Cron Best Practices

```bash
# 1. Use absolute paths
# BAD
0 2 * * * backup.sh

# GOOD
0 2 * * * /usr/local/bin/backup.sh

# 2. Set PATH in crontab
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# 3. Redirect output
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup-cron.log 2>&1

# 4. Use flock to prevent overlapping
0 * * * * flock -n /var/lock/hourly-job.lock /usr/local/bin/hourly-job.sh

# 5. Set mailto for errors
MAILTO=admin@example.com
0 2 * * * /usr/local/bin/backup.sh
```

## systemd Timers

### Why systemd Timers?

```
Advantages over cron:
✓ Better logging (journalctl)
✓ Dependencies (wait for network, etc.)
✓ Resource limits
✓ Separate service/timer units
✓ More flexible scheduling
✓ Can trigger on system events
```

### Creating systemd Timer

**Service File:**
```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Daily Backup Service
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=backup
Group=backup
ExecStart=/usr/local/bin/backup.sh

# Resource limits
MemoryLimit=2G
CPUQuota=50%

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=backup
```

**Timer File:**
```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Daily Backup Timer
Requires=backup.service

[Timer]
# Run daily at 2 AM
OnCalendar=*-*-* 02:00:00

# Run on boot if missed
Persistent=true

# Random delay up to 30 minutes
RandomizedDelaySec=30min

# Accuracy (default: 1min)
AccuracySec=1min

[Install]
WantedBy=timers.target
```

**Enable and Start:**
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable timer (starts on boot)
sudo systemctl enable backup.timer

# Start timer now
sudo systemctl start backup.timer

# Check timer status
sudo systemctl status backup.timer
systemctl list-timers --all

# View logs
journalctl -u backup.service
journalctl -u backup.service -f  # Follow

# Manual run
sudo systemctl start backup.service
```

### Timer Schedule Examples

```ini
# Every 15 minutes
OnCalendar=*:0/15

# Every hour
OnCalendar=hourly
# Or
OnCalendar=*:00

# Every day at 3 AM
OnCalendar=daily
OnCalendar=03:00

# Every Monday at 9 AM
OnCalendar=Mon *-*-* 09:00:00

# Weekdays at 9 AM
OnCalendar=Mon-Fri *-*-* 09:00:00

# First day of month at midnight
OnCalendar=*-*-01 00:00:00

# Multiple schedules
OnCalendar=00:00
OnCalendar=12:00

# 5 minutes after boot
OnBootSec=5min

# 10 minutes after last activation
OnUnitActiveSec=10min
```

### Calendar Event Format

```
DayOfWeek Year-Month-Day Hour:Minute:Second

Examples:
Mon 2024-01-01 00:00:00
Mon,Fri *-*-* 09:00:00
Mon..Fri *-*-01 00:00:00

# Test calendar expression
systemd-analyze calendar "Mon,Fri *-*-* 09:00:00"
```

## Event-Driven Automation

### inotify (File System Events)

```bash
# Install inotify-tools
sudo apt install inotify-tools

# Watch for file changes
inotifywait -m /var/log/myapp/ -e create -e modify |
    while read path action file; do
        echo "File $file was $action"
        # Process file
    done

# Watch and process
#!/bin/bash
inotifywait -m -e create --format '%f' /data/incoming/ |
    while read file; do
        echo "Processing $file"
        /usr/local/bin/process-file.sh "/data/incoming/$file"
        mv "/data/incoming/$file" "/data/processed/"
    done
```

**systemd Service for File Watch:**
```ini
# /etc/systemd/system/file-processor.service
[Unit]
Description=File Processor Service
After=network.target

[Service]
Type=simple
User=processor
ExecStart=/usr/local/bin/file-watcher.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### systemd Path Units

```ini
# /etc/systemd/system/process-upload.path
[Unit]
Description=Monitor upload directory

[Path]
PathChanged=/data/uploads
Unit=process-upload.service

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/process-upload.service
[Unit]
Description=Process uploaded files

[Service]
Type=oneshot
ExecStart=/usr/local/bin/process-uploads.sh
```

## Idempotency Patterns

### Check Before Action

```bash
# BAD - Not idempotent
echo "new line" >> /etc/config

# GOOD - Check first
if ! grep -q "new line" /etc/config; then
    echo "new line" >> /etc/config
fi

# BAD - Creates duplicate cron entries
echo "0 2 * * * /backup.sh" | crontab

# GOOD - Check if exists
(crontab -l 2>/dev/null | grep -F "/backup.sh") || \
    (crontab -l 2>/dev/null; echo "0 2 * * * /backup.sh") | crontab -
```

### State Files

```bash
#!/bin/bash
# Use state file to track completion

STATE_FILE="/var/run/myapp-sync.state"
LOCK_FILE="/var/run/myapp-sync.lock"

# Prevent concurrent runs
exec 200>"$LOCK_FILE"
flock -n 200 || { echo "Already running"; exit 1; }

# Check if already processed today
if [ -f "$STATE_FILE" ]; then
    LAST_RUN=$(cat "$STATE_FILE")
    TODAY=$(date +%Y-%m-%d)

    if [ "$LAST_RUN" = "$TODAY" ]; then
        echo "Already processed today"
        exit 0
    fi
fi

# Perform work
echo "Processing..."
# ... work here ...

# Update state
date +%Y-%m-%d > "$STATE_FILE"
```

### Declarative Configuration

```bash
# Instead of imperative commands
# Use configuration management (Ansible, etc.)

# BAD - Imperative
useradd myuser
mkdir /data
chown myuser:myuser /data

# GOOD - Declarative (Ansible)
- name: Ensure user exists
  user:
    name: myuser
    state: present

- name: Ensure directory exists
  file:
    path: /data
    state: directory
    owner: myuser
    group: myuser
```

## Error Handling

### Comprehensive Error Handling

```bash
#!/bin/bash
set -euo pipefail

# Error handler
error_exit() {
    local line=$1
    local cmd=$2
    echo "Error on line $line: Command '$cmd' failed" >&2
    # Cleanup
    cleanup_on_error
    # Notify
    send_alert "Script failed on line $line"
    exit 1
}

trap 'error_exit ${LINENO} "${BASH_COMMAND}"' ERR

cleanup_on_error() {
    # Remove partial files
    rm -f /tmp/partial-*
    # Unlock resources
    rm -f /var/lock/mylock
}

# Main logic with error checking
main() {
    # Check prerequisites
    command -v rsync &>/dev/null || {
        echo "Error: rsync not found" >&2
        exit 1
    }

    # Check disk space
    AVAILABLE=$(df /backup | tail -1 | awk '{print $4}')
    REQUIRED=1000000  # 1GB in KB

    if [ "$AVAILABLE" -lt "$REQUIRED" ]; then
        echo "Error: Insufficient disk space" >&2
        send_alert "Backup failed: No disk space"
        exit 1
    fi

    # Perform backup
    if ! rsync -av /data/ /backup/; then
        echo "Error: rsync failed" >&2
        send_alert "Backup failed: rsync error"
        exit 1
    fi

    echo "Backup completed successfully"
}

main "$@"
```

### Retries with Exponential Backoff

```bash
#!/bin/bash

retry_with_backoff() {
    local max_attempts=5
    local timeout=1
    local attempt=1
    local exit_code=0

    while [ $attempt -le $max_attempts ]; do
        if "$@"; then
            return 0
        else
            exit_code=$?
        fi

        echo "Attempt $attempt failed. Retrying in ${timeout}s..." >&2
        sleep $timeout
        attempt=$((attempt + 1))
        timeout=$((timeout * 2))
    done

    echo "Command failed after $max_attempts attempts" >&2
    return $exit_code
}

# Usage
retry_with_backoff curl -f https://api.example.com/endpoint
```

## Logging and Notifications

### Structured Logging

```bash
#!/bin/bash

LOG_FILE="/var/log/myapp/automation.log"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Log levels: DEBUG, INFO, WARN, ERROR
    case "$LOG_LEVEL" in
        DEBUG) ;;
        INFO) [[ "$level" == "DEBUG" ]] && return ;;
        WARN) [[ "$level" == "DEBUG" || "$level" == "INFO" ]] && return ;;
        ERROR) [[ "$level" != "ERROR" ]] && return ;;
    esac

    # JSON log format
    echo "{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"message\":\"$message\"}" | tee -a "$LOG_FILE"
}

log "INFO" "Starting automation"
log "DEBUG" "Configuration loaded"
log "ERROR" "Failed to connect to database"
```

### Notification Strategies

```bash
# Email notification
send_email() {
    local subject=$1
    local body=$2
    echo "$body" | mail -s "$subject" admin@example.com
}

# Slack notification
send_slack() {
    local message=$1
    local webhook="https://hooks.slack.com/services/YOUR/WEBHOOK"

    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$message\"}" \
        "$webhook"
}

# PagerDuty alert
send_pagerduty() {
    local description=$1
    local routing_key="YOUR_ROUTING_KEY"

    curl -X POST https://events.pagerduty.com/v2/enqueue \
        -H 'Content-Type: application/json' \
        -d "{
            \"routing_key\": \"$routing_key\",
            \"event_action\": \"trigger\",
            \"payload\": {
                \"summary\": \"$description\",
                \"severity\": \"critical\",
                \"source\": \"$(hostname)\"
            }
        }"
}

# Multi-channel notification
notify() {
    local message=$1
    local severity=${2:-info}

    log "INFO" "$message"

    case "$severity" in
        critical)
            send_pagerduty "$message"
            send_slack "🚨 CRITICAL: $message"
            send_email "CRITICAL Alert" "$message"
            ;;
        error)
            send_slack "❌ ERROR: $message"
            send_email "Error Alert" "$message"
            ;;
        warning)
            send_slack "⚠️  WARNING: $message"
            ;;
        info)
            send_slack "ℹ️  INFO: $message"
            ;;
    esac
}
```

## Testing Automation

### Testing Framework

```bash
#!/bin/bash
# test-automation.sh

TESTS_PASSED=0
TESTS_FAILED=0

assert_equals() {
    local expected=$1
    local actual=$2
    local message=${3:-"Assertion failed"}

    if [ "$expected" = "$actual" ]; then
        echo "✓ PASS: $message"
        ((TESTS_PASSED++))
    else
        echo "✗ FAIL: $message (expected: '$expected', got: '$actual')"
        ((TESTS_FAILED++))
    fi
}

assert_file_exists() {
    local file=$1
    if [ -f "$file" ]; then
        echo "✓ PASS: File exists: $file"
        ((TESTS_PASSED++))
    else
        echo "✗ FAIL: File does not exist: $file"
        ((TESTS_FAILED++))
    fi
}

# Setup
setup() {
    TEST_DIR=$(mktemp -d)
}

# Teardown
teardown() {
    rm -rf "$TEST_DIR"
}

# Tests
test_backup_creates_file() {
    setup
    /usr/local/bin/backup.sh --dest "$TEST_DIR"
    assert_file_exists "$TEST_DIR/backup.tar.gz"
    teardown
}

test_cleanup_removes_old_files() {
    setup
    touch -t 202401010000 "$TEST_DIR/old-file"
    /usr/local/bin/cleanup.sh --dir "$TEST_DIR" --days 7
    [ ! -f "$TEST_DIR/old-file" ]
    assert_equals $? 0 "Old file removed"
    teardown
}

# Run tests
test_backup_creates_file
test_cleanup_removes_old_files

# Summary
echo ""
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $TESTS_FAILED"

if [ $TESTS_FAILED -gt 0 ]; then
    exit 1
fi
```

### Integration Testing

```bash
#!/bin/bash
# integration-test.sh

# Test in staging environment
STAGING_SERVER="staging.example.com"

# Deploy automation scripts
rsync -av /usr/local/bin/ $STAGING_SERVER:/usr/local/bin/

# Run automation
ssh $STAGING_SERVER "/usr/local/bin/automation.sh"

# Verify results
ssh $STAGING_SERVER "test -f /backup/latest.tar.gz" || {
    echo "Integration test failed: No backup file"
    exit 1
}

echo "Integration test passed"
```

---

**Related Topics:**
- See [shell-scripting.md](shell-scripting.md) for scripting patterns
- See [configuration-management.md](configuration-management.md) for infrastructure automation
- See [system-monitoring.md](system-monitoring.md) for monitoring automation tasks
- See [linux-administration.md](linux-administration.md) for system management
