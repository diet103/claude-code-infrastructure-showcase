---
name: shell-script-guidelines
description: Shell scripting best practices for DevSecOps automation. Covers error handling, argument validation, logging, debugging, POSIX compliance, security patterns, and shellcheck best practices. Use when writing bash/sh scripts, automation tools, CI/CD scripts, or deployment automation.
---

# Shell Script Development Guidelines

## Purpose

Comprehensive shell scripting guidelines for DevSecOps engineers, emphasizing reliability, error handling, security, and maintainability in automation scripts.

## When to Use This Skill

Automatically activates when you:
- Work with `.sh` files
- Mention bash, shell, scripting keywords
- Write automation scripts
- Create deployment scripts
- Build CI/CD pipeline scripts

---

## Quick Reference

### Essential Header (Every Script)

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Script: deploy-app.sh
# Description: Deploy application to production
# Author: DevOps Team
# Usage: ./deploy-app.sh <environment> <version>
```

### Core Principles

1. **Fail Fast** - `set -euo pipefail` in every script
2. **Validate Everything** - Check all arguments and preconditions
3. **Log Verbosely** - Make debugging easy
4. **Handle Errors** - Trap and cleanup properly
5. **Quote Variables** - Always `"$var"`, never `$var`
6. **Test Scripts** - Use shellcheck and bats

---

## Robust Error Handling

### Basic Error Handling

```bash
#!/usr/bin/env bash
set -euo pipefail

# Exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_ERROR=1
readonly EXIT_INVALID_ARGS=2

# Error handling function
error() {
    echo "ERROR: $*" >&2
    exit "${EXIT_ERROR}"
}

# Usage
if [[ ! -f "${config_file}" ]]; then
    error "Config file not found: ${config_file}"
fi
```

### Advanced with Cleanup

```bash
#!/usr/bin/env bash
set -euo pipefail

# Temporary file tracking
TEMP_FILES=()

# Cleanup function
cleanup() {
    local exit_code=$?

    # Remove temporary files
    for temp_file in "${TEMP_FILES[@]}"; do
        [[ -f "${temp_file}" ]] && rm -f "${temp_file}"
    done

    # Log exit
    if [[ ${exit_code} -eq 0 ]]; then
        log "INFO" "Script completed successfully"
    else
        log "ERROR" "Script failed with exit code ${exit_code}"
    fi

    exit "${exit_code}"
}

# Trap cleanup on exit
trap cleanup EXIT INT TERM

# Create and track temp file
temp_file=$(mktemp)
TEMP_FILES+=("${temp_file}")
```

---

## Argument Validation

### Basic Argument Parsing

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<EOF
Usage: ${0##*/} [OPTIONS] <environment> <version>

Deploy application to specified environment.

Arguments:
    environment     Target environment (dev|staging|prod)
    version         Application version to deploy

Options:
    -h, --help      Show this help message
    -v, --verbose   Enable verbose output
    -n, --dry-run   Perform dry run without changes

Examples:
    ${0##*/} prod v1.2.3
    ${0##*/} --dry-run staging v1.2.4-beta
EOF
    exit 0
}

# Parse options
VERBOSE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -n|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -*)
            error "Unknown option: $1"
            ;;
        *)
            break
            ;;
    esac
done

# Validate required arguments
if [[ $# -lt 2 ]]; then
    error "Missing required arguments. Use --help for usage."
fi

ENVIRONMENT="$1"
VERSION="$2"

# Validate environment
case "${ENVIRONMENT}" in
    dev|staging|prod)
        ;;
    *)
        error "Invalid environment: ${ENVIRONMENT}. Must be dev, staging, or prod."
        ;;
esac

# Validate version format
if [[ ! "${VERSION}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
    error "Invalid version format: ${VERSION}. Expected format: v1.2.3 or v1.2.3-beta"
fi
```

---

## Logging

### Structured Logging Function

```bash
#!/usr/bin/env bash
set -euo pipefail

# Log levels
readonly LOG_LEVEL_DEBUG=0
readonly LOG_LEVEL_INFO=1
readonly LOG_LEVEL_WARN=2
readonly LOG_LEVEL_ERROR=3

# Current log level (can be set via environment)
LOG_LEVEL="${LOG_LEVEL:-${LOG_LEVEL_INFO}}"

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    local level_num
    case "${level}" in
        DEBUG) level_num=${LOG_LEVEL_DEBUG} ;;
        INFO)  level_num=${LOG_LEVEL_INFO} ;;
        WARN)  level_num=${LOG_LEVEL_WARN} ;;
        ERROR) level_num=${LOG_LEVEL_ERROR} ;;
        *) level_num=${LOG_LEVEL_INFO} ;;
    esac

    # Only log if level is enabled
    if [[ ${level_num} -ge ${LOG_LEVEL} ]]; then
        local color=""
        local reset="\033[0m"

        case "${level}" in
            DEBUG) color="\033[0;36m" ;;  # Cyan
            INFO)  color="\033[0;32m" ;;  # Green
            WARN)  color="\033[0;33m" ;;  # Yellow
            ERROR) color="\033[0;31m" ;;  # Red
        esac

        if [[ ${level_num} -ge ${LOG_LEVEL_ERROR} ]]; then
            echo -e "${color}[${timestamp}] [${level}] ${message}${reset}" >&2
        else
            echo -e "${color}[${timestamp}] [${level}] ${message}${reset}"
        fi
    fi
}

# Usage
log "INFO" "Starting deployment"
log "DEBUG" "Environment: ${ENVIRONMENT}"
log "WARN" "This will modify production"
log "ERROR" "Deployment failed"
```

---

## Safe Command Execution

### Running Commands with Validation

```bash
#!/usr/bin/env bash
set -euo pipefail

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Run command with logging
run_command() {
    local cmd="$*"

    log "INFO" "Running: ${cmd}"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would execute: ${cmd}"
        return 0
    fi

    if ! ${cmd}; then
        error "Command failed: ${cmd}"
    fi
}

# Verify required commands
require_command() {
    local cmd="$1"
    if ! command_exists "${cmd}"; then
        error "Required command not found: ${cmd}"
    fi
}

# Usage
require_command "docker"
require_command "kubectl"
require_command "aws"

run_command docker build -t "app:${VERSION}" .
run_command docker push "app:${VERSION}"
```

---

## File Operations

### Safe File Handling

```bash
#!/usr/bin/env bash
set -euo pipefail

# Check file exists and is readable
check_file() {
    local file="$1"

    if [[ ! -e "${file}" ]]; then
        error "File does not exist: ${file}"
    fi

    if [[ ! -f "${file}" ]]; then
        error "Not a regular file: ${file}"
    fi

    if [[ ! -r "${file}" ]]; then
        error "File not readable: ${file}"
    fi
}

# Safe file copy with backup
safe_copy() {
    local source="$1"
    local dest="$2"

    check_file "${source}"

    # Create backup if destination exists
    if [[ -f "${dest}" ]]; then
        local backup="${dest}.backup.$(date +%Y%m%d_%H%M%S)"
        log "INFO" "Creating backup: ${backup}"
        cp "${dest}" "${backup}"
    fi

    # Copy with error handling
    if ! cp "${source}" "${dest}"; then
        error "Failed to copy ${source} to ${dest}"
    fi

    log "INFO" "Copied ${source} to ${dest}"
}

# Write file atomically
atomic_write() {
    local content="$1"
    local target="$2"
    local temp_file

    temp_file=$(mktemp)
    TEMP_FILES+=("${temp_file}")

    # Write to temp file
    echo "${content}" > "${temp_file}"

    # Atomic move
    if ! mv "${temp_file}" "${target}"; then
        error "Failed to write to ${target}"
    fi

    log "INFO" "Wrote to ${target}"
}
```

---

## Security Practices

### Secrets Handling

```bash
#!/usr/bin/env bash
set -euo pipefail

# NEVER hardcode secrets
# ❌ BAD
API_KEY="sk-abc123..."  # SECURITY VIOLATION
PASSWORD="secret123"    # SECURITY VIOLATION

# ✅ GOOD - Read from environment
API_KEY="${API_KEY:?API_KEY environment variable not set}"
PASSWORD="${PASSWORD:?PASSWORD environment variable not set}"

# ✅ GOOD - Read from file with restricted permissions
read_secret() {
    local secret_file="$1"

    # Check file permissions
    local perms
    perms=$(stat -c "%a" "${secret_file}" 2>/dev/null || stat -f "%A" "${secret_file}" 2>/dev/null)

    if [[ "${perms}" != "600" ]] && [[ "${perms}" != "400" ]]; then
        error "Secret file has insecure permissions: ${secret_file} (${perms})"
    fi

    cat "${secret_file}"
}

# ✅ GOOD - Fetch from secret manager
get_aws_secret() {
    local secret_name="$1"
    local region="${2:-us-east-1}"

    aws secretsmanager get-secret-value \
        --secret-id "${secret_name}" \
        --region "${region}" \
        --query 'SecretString' \
        --output text
}
```

### Input Sanitization

```bash
#!/usr/bin/env bash
set -euo pipefail

# Validate input contains only allowed characters
validate_alphanumeric() {
    local input="$1"

    if [[ ! "${input}" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        error "Invalid input: ${input}. Only alphanumeric, underscore, and hyphen allowed."
    fi
}

# Sanitize filename
sanitize_filename() {
    local filename="$1"

    # Remove path components
    filename="${filename##*/}"

    # Remove special characters
    filename="${filename//[^a-zA-Z0-9._-]/}"

    # Limit length
    echo "${filename:0:255}"
}

# Escape for SQL (use with caution - prefer parameterized queries)
escape_sql() {
    local input="$1"
    echo "${input//\'/\'\'}"
}
```

---

## Debugging

### Debug Mode

```bash
#!/usr/bin/env bash

# Enable debug mode if DEBUG env var is set
if [[ "${DEBUG:-}" == "true" ]]; then
    set -x  # Print commands before execution
fi

set -euo pipefail

# Debug function
debug() {
    if [[ "${DEBUG:-}" == "true" ]]; then
        echo "DEBUG: $*" >&2
    fi
}

# Usage
debug "Environment: ${ENVIRONMENT}"
debug "Version: ${VERSION}"

# Show variables for debugging
show_variables() {
    log "DEBUG" "Environment Variables:"
    log "DEBUG" "  ENVIRONMENT: ${ENVIRONMENT}"
    log "DEBUG" "  VERSION: ${VERSION}"
    log "DEBUG" "  DRY_RUN: ${DRY_RUN}"
    log "DEBUG" "  VERBOSE: ${VERBOSE}"
}
```

---

## Common Patterns

### Parallel Execution

```bash
#!/usr/bin/env bash
set -euo pipefail

# Run commands in parallel with error handling
parallel_run() {
    local pids=()
    local failed=0

    # Start all processes
    for cmd in "$@"; do
        ${cmd} &
        pids+=($!)
    done

    # Wait for all and check exit codes
    for pid in "${pids[@]}"; do
        if ! wait "${pid}"; then
            log "ERROR" "Process ${pid} failed"
            failed=1
        fi
    done

    return "${failed}"
}

# Usage
parallel_run \
    "docker build -t app1 ." \
    "docker build -t app2 ." \
    "docker build -t app3 ."
```

### Retry Logic

```bash
#!/usr/bin/env bash
set -euo pipefail

# Retry command with exponential backoff
retry() {
    local max_attempts="$1"
    shift
    local cmd="$*"
    local attempt=1
    local delay=1

    while [[ ${attempt} -le ${max_attempts} ]]; do
        log "INFO" "Attempt ${attempt}/${max_attempts}: ${cmd}"

        if ${cmd}; then
            return 0
        fi

        if [[ ${attempt} -lt ${max_attempts} ]]; then
            log "WARN" "Command failed, retrying in ${delay}s..."
            sleep "${delay}"
            delay=$((delay * 2))
        fi

        attempt=$((attempt + 1))
    done

    error "Command failed after ${max_attempts} attempts: ${cmd}"
}

# Usage
retry 3 curl -f https://api.example.com/health
```

---

## Testing

### Shellcheck Integration

```bash
# Install shellcheck
# macOS: brew install shellcheck
# Linux: apt-get install shellcheck

# Run shellcheck
shellcheck script.sh

# Disable specific warnings
# shellcheck disable=SC2034  # Unused variable
readonly VERSION="1.0.0"
```

### BATS Testing

```bash
#!/usr/bin/env bats
# test_deploy.bats

setup() {
    # Setup test environment
    export ENVIRONMENT="test"
    export VERSION="v1.0.0"
    export DRY_RUN="true"
}

@test "script validates environment" {
    run ./deploy.sh invalid v1.0.0
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Invalid environment" ]]
}

@test "script validates version format" {
    run ./deploy.sh prod invalid-version
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Invalid version format" ]]
}

@test "script runs successfully in dry-run mode" {
    run ./deploy.sh --dry-run prod v1.0.0
    [ "$status" -eq 0 ]
    [[ "$output" =~ "DRY RUN" ]]
}
```

---

## Complete Example

```bash
#!/usr/bin/env bash
###############################################################################
# Script: backup-database.sh
# Description: Backup PostgreSQL database to S3 with encryption
# Author: DevOps Team
# Usage: ./backup-database.sh <environment> [--encrypt]
###############################################################################

set -euo pipefail
IFS=$'\n\t'

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly EXIT_SUCCESS=0
readonly EXIT_ERROR=1

# Configuration
readonly BACKUP_DIR="/tmp/db-backups"
readonly S3_BUCKET="company-db-backups"
TEMP_FILES=()

# Logging
log() {
    local level="$1"
    shift
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] $*" >&2
}

error() {
    log "ERROR" "$*"
    exit "${EXIT_ERROR}"
}

# Cleanup
cleanup() {
    local exit_code=$?

    for temp_file in "${TEMP_FILES[@]}"; do
        [[ -f "${temp_file}" ]] && rm -f "${temp_file}"
    done

    [[ -d "${BACKUP_DIR}" ]] && rm -rf "${BACKUP_DIR}"

    if [[ ${exit_code} -eq 0 ]]; then
        log "INFO" "Backup completed successfully"
    else
        log "ERROR" "Backup failed"
    fi

    exit "${exit_code}"
}

trap cleanup EXIT INT TERM

# Main logic
main() {
    local environment="$1"
    local encrypt="${2:-false}"

    log "INFO" "Starting backup for ${environment}"

    # Validate
    require_command "pg_dump"
    require_command "aws"

    # Create backup directory
    mkdir -p "${BACKUP_DIR}"

    # Perform backup
    local backup_file="${BACKUP_DIR}/db-${environment}-$(date +%Y%m%d_%H%M%S).sql"
    log "INFO" "Creating backup: ${backup_file}"

    pg_dump -h "${DB_HOST}" -U "${DB_USER}" "${DB_NAME}" > "${backup_file}"

    # Optionally encrypt
    if [[ "${encrypt}" == "true" ]]; then
        log "INFO" "Encrypting backup"
        gpg --encrypt --recipient "${GPG_KEY}" "${backup_file}"
        backup_file="${backup_file}.gpg"
    fi

    # Upload to S3
    log "INFO" "Uploading to S3"
    aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/${environment}/"

    log "INFO" "Backup completed"
}

# Run
main "$@"
```

---

## Resources

- **[shellcheck](https://www.shellcheck.net/)** - Shell script linter
- **[BATS](https://github.com/bats-core/bats-core)** - Bash testing framework
- **[Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html)**
- **[Bash Best Practices](https://bertvv.github.io/cheat-sheets/Bash.html)**
