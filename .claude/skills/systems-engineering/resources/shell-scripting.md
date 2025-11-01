# Shell Scripting

Comprehensive guide to Bash scripting covering patterns, error handling, functions, input validation, common pitfalls, testing, and best practices for production-ready scripts.

## Table of Contents

- [Script Structure](#script-structure)
- [Error Handling](#error-handling)
- [Functions and Modularity](#functions-and-modularity)
- [Input Validation](#input-validation)
- [Common Pitfalls](#common-pitfalls)
- [Testing Shell Scripts](#testing-shell-scripts)
- [Best Practices](#best-practices)
- [Complete Examples](#complete-examples)

## Script Structure

### Basic Template

```bash
#!/usr/bin/env bash
#
# Script: backup.sh
# Description: Automated backup script with error handling
# Author: DevOps Team
# Date: 2025-01-01
#

set -euo pipefail  # Exit on error, undefined vars, pipe failures
IFS=$'\n\t'        # Set Internal Field Separator

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "$0")"
readonly BACKUP_DIR="/backup"
readonly LOG_FILE="/var/log/${SCRIPT_NAME%.sh}.log"

# Variables
VERBOSE=false
DRY_RUN=false

# Cleanup function
cleanup() {
    local exit_code=$?
    # Cleanup temporary files
    rm -f /tmp/backup-$$-*
    exit "$exit_code"
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Main function
main() {
    log "INFO" "Starting backup process"

    # Script logic here

    log "INFO" "Backup completed successfully"
}

# Run main function
main "$@"
```

### Shebang Best Practices

```bash
# BEST - Portable, uses env to find bash
#!/usr/bin/env bash

# ACCEPTABLE - Direct path (less portable)
#!/bin/bash

# AVOID - Assumes bash is in specific location
#!/usr/local/bin/bash

# FOR sh compatibility (POSIX)
#!/bin/sh
```

## Error Handling

### set Options

```bash
# Exit on any error
set -e

# Exit on undefined variable
set -u

# Exit on pipe failure (not just last command)
set -o pipefail

# Combined (recommended for production scripts)
set -euo pipefail

# Debug mode (print each command)
set -x

# Alternative: enable only for debugging
DEBUG=${DEBUG:-false}
if [ "$DEBUG" = "true" ]; then
    set -x
fi
```

### Error Handling Patterns

```bash
# Pattern 1: Check command success
if ! command -v docker &> /dev/null; then
    echo "Error: docker not found" >&2
    exit 1
fi

# Pattern 2: Or operator
mkdir -p /backup || {
    echo "Error: Failed to create backup directory" >&2
    exit 1
}

# Pattern 3: Explicit error checking
cp source.txt dest.txt
if [ $? -ne 0 ]; then
    echo "Error: Copy failed" >&2
    exit 1
fi

# Pattern 4: Command substitution with error check
output=$(command 2>&1) || {
    echo "Error: Command failed with output: $output" >&2
    exit 1
}
```

### trap for Cleanup

```bash
#!/bin/bash

# Cleanup function
cleanup() {
    local exit_code=$?
    echo "Cleaning up..."

    # Remove temporary files
    rm -f "$TEMP_FILE"

    # Unmount if mounted
    if mountpoint -q "$MOUNT_POINT"; then
        umount "$MOUNT_POINT"
    fi

    # Kill background processes
    if [ -n "${PID:-}" ]; then
        kill "$PID" 2>/dev/null || true
    fi

    exit "$exit_code"
}

# Trap on EXIT, INT, TERM
trap cleanup EXIT INT TERM

# Create temp file
TEMP_FILE=$(mktemp)

# Rest of script...
```

### Logging Functions

```bash
# Color codes
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly GREEN='\033[0;32m'
readonly NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        ERROR)
            echo -e "${RED}[$timestamp] ERROR: $message${NC}" >&2
            echo "[$timestamp] ERROR: $message" >> "$LOG_FILE"
            ;;
        WARN)
            echo -e "${YELLOW}[$timestamp] WARN: $message${NC}" >&2
            echo "[$timestamp] WARN: $message" >> "$LOG_FILE"
            ;;
        INFO)
            echo "[$timestamp] INFO: $message"
            echo "[$timestamp] INFO: $message" >> "$LOG_FILE"
            ;;
        DEBUG)
            if [ "$VERBOSE" = true ]; then
                echo "[$timestamp] DEBUG: $message"
            fi
            echo "[$timestamp] DEBUG: $message" >> "$LOG_FILE"
            ;;
    esac
}

# Die function (log error and exit)
die() {
    log "ERROR" "$@"
    exit 1
}

# Usage
log "INFO" "Starting process"
log "WARN" "Disk space is low"
log "ERROR" "Failed to connect to database"
die "Critical error occurred"
```

## Functions and Modularity

### Function Basics

```bash
# Function definition
function_name() {
    local arg1=$1
    local arg2=${2:-"default"}  # Default value

    # Function logic
    echo "Processing $arg1 and $arg2"

    return 0  # Return status (0-255)
}

# Calling function
function_name "value1" "value2"

# Capture output
result=$(function_name "value1")

# Check return status
if function_name "value1"; then
    echo "Success"
else
    echo "Failed"
fi
```

### Advanced Function Patterns

```bash
# Function with named parameters (associative array)
process_data() {
    local -A params=(
        [input]=""
        [output]=""
        [format]="json"
    )

    # Parse parameters
    while [[ $# -gt 0 ]]; do
        case $1 in
            --input)
                params[input]="$2"
                shift 2
                ;;
            --output)
                params[output]="$2"
                shift 2
                ;;
            --format)
                params[format]="$2"
                shift 2
                ;;
            *)
                echo "Unknown parameter: $1" >&2
                return 1
                ;;
        esac
    done

    # Validate required parameters
    if [ -z "${params[input]}" ]; then
        echo "Error: --input is required" >&2
        return 1
    fi

    echo "Processing ${params[input]} in ${params[format]} format"
}

# Usage
process_data --input "data.csv" --output "result.json" --format "json"
```

### Library Pattern

```bash
# lib/common.sh - Shared functions
#!/bin/bash

# Prevent multiple sourcing
[[ -n "${_COMMON_LIB_LOADED:-}" ]] && return
readonly _COMMON_LIB_LOADED=1

# Shared functions
is_root() {
    [ "$(id -u)" -eq 0 ]
}

check_command() {
    command -v "$1" &> /dev/null
}

# Export functions (for older bash)
export -f is_root
export -f check_command
```

```bash
# main-script.sh - Use library
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

if ! is_root; then
    echo "This script must be run as root" >&2
    exit 1
fi

if ! check_command "docker"; then
    echo "Docker is not installed" >&2
    exit 1
fi
```

## Input Validation

### Argument Parsing with getopts

```bash
#!/bin/bash

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
    -h, --help          Show this help message
    -v, --verbose       Enable verbose mode
    -f, --file FILE     Input file (required)
    -o, --output DIR    Output directory (default: ./output)
    -n, --dry-run       Dry run mode
EOF
    exit 1
}

# Default values
VERBOSE=false
DRY_RUN=false
INPUT_FILE=""
OUTPUT_DIR="./output"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -f|--file)
            INPUT_FILE="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -n|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            echo "Unknown argument: $1" >&2
            usage
            ;;
    esac
done

# Validate required arguments
if [ -z "$INPUT_FILE" ]; then
    echo "Error: --file is required" >&2
    usage
fi

# Validate file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File not found: $INPUT_FILE" >&2
    exit 1
fi
```

### Input Validation Functions

```bash
# Validate IP address
is_valid_ip() {
    local ip=$1
    local regex='^([0-9]{1,3}\.){3}[0-9]{1,3}$'

    if [[ $ip =~ $regex ]]; then
        # Check each octet
        IFS='.' read -r -a octets <<< "$ip"
        for octet in "${octets[@]}"; do
            if [ "$octet" -gt 255 ]; then
                return 1
            fi
        done
        return 0
    fi
    return 1
}

# Validate email
is_valid_email() {
    local email=$1
    local regex='^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    [[ $email =~ $regex ]]
}

# Validate number
is_number() {
    local value=$1
    [[ $value =~ ^[0-9]+$ ]]
}

# Validate port
is_valid_port() {
    local port=$1
    is_number "$port" && [ "$port" -ge 1 ] && [ "$port" -le 65535 ]
}

# Usage
if ! is_valid_ip "$IP_ADDRESS"; then
    die "Invalid IP address: $IP_ADDRESS"
fi
```

## Common Pitfalls

### Quoting Variables

```bash
# BAD - Word splitting and globbing
file="my file.txt"
cat $file  # Interprets as two arguments: "my" and "file.txt"

# GOOD - Quoted
cat "$file"

# BAD - Globbing can expand
files="*.txt"
rm $files  # May delete unintended files

# GOOD - Quoted to prevent globbing
rm "$files"

# Array iteration
# BAD
for file in $FILES; do
    echo $file
done

# GOOD
for file in "${FILES[@]}"; do
    echo "$file"
done
```

### Word Splitting

```bash
# BAD
files=$(ls /tmp)
for file in $files; do
    # Breaks on spaces in filenames
    echo "$file"
done

# GOOD - Use arrays
mapfile -t files < <(find /tmp -type f)
for file in "${files[@]}"; do
    echo "$file"
done

# BETTER - Direct loop
find /tmp -type f | while IFS= read -r file; do
    echo "$file"
done
```

### Command Substitution

```bash
# BAD - Deprecated
output=`command`

# GOOD - Modern syntax
output=$(command)

# Nested - Modern syntax is easier to read
result=$(echo "The date is $(date)")
```

### Test Command

```bash
# Use [[ ]] instead of [ ]

# BAD - [ ] (test)
if [ $var = "value" ]; then  # Fails if var is empty
    echo "Match"
fi

# GOOD - [[ ]]
if [[ $var = "value" ]]; then
    echo "Match"
fi

# [[ ]] benefits:
# - No word splitting
# - Pattern matching with =
# - Regex matching with =~
# - && and || operators

# Pattern matching
if [[ $filename = *.txt ]]; then
    echo "Text file"
fi

# Regex
if [[ $email =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo "Valid email"
fi
```

### Comparison Operators

```bash
# String comparison
[[ $str1 = $str2 ]]    # Equal
[[ $str1 != $str2 ]]   # Not equal
[[ -z $str ]]          # Empty string
[[ -n $str ]]          # Not empty

# Numeric comparison
[[ $num1 -eq $num2 ]]  # Equal
[[ $num1 -ne $num2 ]]  # Not equal
[[ $num1 -lt $num2 ]]  # Less than
[[ $num1 -le $num2 ]]  # Less than or equal
[[ $num1 -gt $num2 ]]  # Greater than
[[ $num1 -ge $num2 ]]  # Greater than or equal

# File tests
[[ -f $file ]]         # File exists
[[ -d $dir ]]          # Directory exists
[[ -e $path ]]         # Path exists
[[ -r $file ]]         # Readable
[[ -w $file ]]         # Writable
[[ -x $file ]]         # Executable
```

## Testing Shell Scripts

### shellcheck

```bash
# Install shellcheck
sudo apt install shellcheck

# Check script
shellcheck myscript.sh

# Ignore specific warnings
# shellcheck disable=SC2086
echo $var

# Multiple warnings
# shellcheck disable=SC2086,SC2181
```

### BATS (Bash Automated Testing System)

```bash
# Install bats
git clone https://github.com/bats-core/bats-core.git
cd bats-core
sudo ./install.sh /usr/local
```

**Test File:**
```bash
# test/backup.bats
#!/usr/bin/env bats

# Setup runs before each test
setup() {
    load 'test_helper/bats-support/load'
    load 'test_helper/bats-assert/load'

    # Create test directory
    TEST_DIR=$(mktemp -d)
    SOURCE_DIR="$TEST_DIR/source"
    BACKUP_DIR="$TEST_DIR/backup"

    mkdir -p "$SOURCE_DIR" "$BACKUP_DIR"
    echo "test data" > "$SOURCE_DIR/file1.txt"
}

# Teardown runs after each test
teardown() {
    rm -rf "$TEST_DIR"
}

@test "backup creates archive" {
    run ./backup.sh --source "$SOURCE_DIR" --dest "$BACKUP_DIR"

    assert_success
    assert [ -f "$BACKUP_DIR/backup-*.tar.gz" ]
}

@test "backup fails without source" {
    run ./backup.sh --dest "$BACKUP_DIR"

    assert_failure
    assert_output --partial "Error: --source is required"
}

@test "backup preserves file content" {
    run ./backup.sh --source "$SOURCE_DIR" --dest "$BACKUP_DIR"

    assert_success

    # Extract and verify
    cd "$BACKUP_DIR"
    tar -xzf backup-*.tar.gz
    assert [ "$(cat source/file1.txt)" = "test data" ]
}
```

**Run Tests:**
```bash
bats test/backup.bats
```

## Best Practices

### 1. Script Organization

```bash
#!/usr/bin/env bash
#
# Well-organized script structure
#

set -euo pipefail

# Constants first
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly CONFIG_FILE="/etc/myapp/config"

# Variables
DEBUG=false

# Functions
log() { ... }
validate_input() { ... }
process_data() { ... }

# Main logic
main() {
    log "INFO" "Starting"
    validate_input "$@"
    process_data
    log "INFO" "Complete"
}

# Run main
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
```

### 2. Documentation

```bash
#!/usr/bin/env bash
#
# Script: deploy.sh
# Description: Deploy application to production
# Usage: ./deploy.sh [OPTIONS]
# Options:
#   -e, --env ENV       Environment (staging|production)
#   -v, --version VER   Version to deploy
#   -h, --help          Show help
#
# Examples:
#   ./deploy.sh --env production --version v1.2.3
#   ./deploy.sh -e staging -v latest
#
# Author: DevOps Team
# Date: 2025-01-01
#

# Function documentation
#
# backup_database()
#   Creates a database backup before deployment
#
# Arguments:
#   $1 - Database name
#   $2 - Backup directory
#
# Returns:
#   0 on success, 1 on failure
#
backup_database() {
    local db_name=$1
    local backup_dir=$2
    # ...
}
```

### 3. Error Messages

```bash
# Good error messages are:
# - Clear and specific
# - Include context
# - Suggest solutions

# BAD
echo "Error" >&2

# GOOD
echo "Error: Failed to connect to database 'production' at localhost:5432" >&2
echo "Suggestion: Check if PostgreSQL is running and credentials are correct" >&2
```

### 4. Debugging

```bash
# Enable debugging
bash -x script.sh

# Or in script
set -x  # Enable
set +x  # Disable

# Conditional debugging
DEBUG=${DEBUG:-false}
if [ "$DEBUG" = "true" ]; then
    set -x
fi

# Verbose logging
VERBOSE=${VERBOSE:-false}
debug_log() {
    if [ "$VERBOSE" = "true" ]; then
        echo "[DEBUG] $@" >&2
    fi
}
```

## Complete Examples

### System Backup Script

```bash
#!/usr/bin/env bash
#
# backup.sh - Automated system backup
#

set -euo pipefail

# Configuration
readonly BACKUP_DIR="/backup"
readonly RETENTION_DAYS=7
readonly LOG_FILE="/var/log/backup.log"

# Directories to backup
readonly BACKUP_SOURCES=(
    "/etc"
    "/var/www"
    "/home"
)

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $@" | tee -a "$LOG_FILE"
}

die() {
    log "ERROR: $@"
    exit 1
}

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    die "This script must be run as root"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR" || die "Failed to create backup directory"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"

log "Starting backup to $BACKUP_FILE"

# Create backup
if tar -czf "$BACKUP_FILE" "${BACKUP_SOURCES[@]}" 2>&1 | tee -a "$LOG_FILE"; then
    log "Backup created successfully"
    log "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    die "Backup failed"
fi

# Remove old backups
log "Removing backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete

log "Backup completed successfully"
```

### Service Health Check

```bash
#!/usr/bin/env bash
#
# health-check.sh - Check service health
#

set -euo pipefail

# Configuration
readonly SERVICE_NAME="myapp"
readonly HEALTH_URL="http://localhost:8080/health"
readonly MAX_RETRIES=3
readonly RETRY_DELAY=5

check_service() {
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo "✓ Service $SERVICE_NAME is running"
        return 0
    else
        echo "✗ Service $SERVICE_NAME is not running"
        return 1
    fi
}

check_http() {
    local url=$1
    local retries=0

    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo "✓ HTTP endpoint $url is healthy"
            return 0
        fi

        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            echo "Retry $retries/$MAX_RETRIES after $RETRY_DELAY seconds..."
            sleep $RETRY_DELAY
        fi
    done

    echo "✗ HTTP endpoint $url is unhealthy"
    return 1
}

# Main checks
echo "Checking service health..."
check_service
check_http "$HEALTH_URL"

if [ $? -eq 0 ]; then
    echo "All health checks passed"
    exit 0
else
    echo "Health checks failed"
    exit 1
fi
```

---

**Related Topics:**
- See [automation-patterns.md](automation-patterns.md) for cron and systemd timers
- See [troubleshooting-guide.md](troubleshooting-guide.md) for debugging scripts
- See [linux-administration.md](linux-administration.md) for system management
