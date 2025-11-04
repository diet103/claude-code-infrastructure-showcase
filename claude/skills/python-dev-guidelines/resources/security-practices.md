# Python Security Best Practices for DevSecOps

Security-first Python development patterns for infrastructure and automation code.

---

## Core Security Principles

1. **Never trust input** - Validate everything
2. **Secrets stay secret** - Never in code or logs
3. **Least privilege** - Minimal permissions always
4. **Dependencies matter** - Keep updated and scanned
5. **Fail securely** - Don't leak information in errors

---

## Secret Management

### ❌ NEVER DO THIS

```python
# Hardcoded secrets
API_KEY = "sk-abc123..."  # SECURITY VIOLATION
DATABASE_URL = "postgresql://user:password@host/db"  # SECURITY VIOLATION
AWS_SECRET = "wJalrXUtnFEMI/K7MDENG..."  # SECURITY VIOLATION

# Secrets in comments
def connect():
    # Use password: MySecretPass123  # SECURITY VIOLATION
    pass

# Secrets in logs
logger.info(f"API Key: {api_key}")  # SECURITY VIOLATION
```

### ✅ Proper Secret Management

```python
import os
from typing import Optional
from dotenv import load_dotenv

# Load from environment
load_dotenv()

class Config:
    """Secure configuration management."""

    @staticmethod
    def get_required_secret(key: str) -> str:
        """Get required secret or fail fast."""
        value = os.getenv(key)
        if not value:
            raise ValueError(f"Required secret {key} not set")
        return value

    @staticmethod
    def get_optional_secret(key: str, default: Optional[str] = None) -> Optional[str]:
        """Get optional secret with default."""
        return os.getenv(key, default)

# Usage
API_KEY = Config.get_required_secret("API_KEY")
DATABASE_URL = Config.get_required_secret("DATABASE_URL")

# AWS Secrets Manager (production)
import boto3
from botocore.exceptions import ClientError

def get_secret(secret_name: str, region: str = "us-east-1") -> dict:
    """Fetch secret from AWS Secrets Manager."""
    client = boto3.client("secretsmanager", region_name=region)

    try:
        response = client.get_secret_value(SecretId=secret_name)
        return json.loads(response["SecretString"])
    except ClientError as e:
        logger.error(f"Failed to fetch secret: {e}")
        raise
```

### Environment File Template

```bash
# .env.example (commit this)
API_KEY=your_api_key_here
DATABASE_URL=postgresql://user:pass@localhost/db
AWS_REGION=us-east-1
LOG_LEVEL=INFO

# .env (DO NOT COMMIT - add to .gitignore)
```

```.gitignore
# Security - Never commit these
.env
.env.local
secrets/
*.pem
*.key
credentials.json
```

---

## Input Validation

### Path Traversal Prevention

```python
from pathlib import Path

def safe_read_file(base_dir: Path, filename: str) -> str:
    """Safely read file preventing path traversal."""
    # Resolve to absolute path
    base = base_dir.resolve()
    requested = (base / filename).resolve()

    # Ensure requested file is within base directory
    if not requested.is_relative_to(base):
        raise ValueError(f"Path traversal attempt detected: {filename}")

    if not requested.is_file():
        raise FileNotFoundError(f"File not found: {filename}")

    return requested.read_text()

# Usage
try:
    content = safe_read_file(Path("/app/data"), user_input)
except ValueError:
    logger.warning(f"Path traversal attempt: {user_input}")
    raise
```

### Command Injection Prevention

```python
import subprocess
import shlex
from typing import List

# ❌ VULNERABLE
def run_command_unsafe(user_input: str) -> str:
    """VULNERABLE TO COMMAND INJECTION!"""
    # user_input could be: "file.txt; rm -rf /"
    output = subprocess.check_output(f"cat {user_input}", shell=True)
    return output.decode()

# ✅ SAFE
def run_command_safe(filename: str) -> str:
    """Safe command execution."""
    # Validate input
    if not filename.replace("_", "").replace("-", "").replace(".", "").isalnum():
        raise ValueError("Invalid filename")

    # Use list, not shell=True
    output = subprocess.check_output(
        ["cat", filename],
        shell=False,
        timeout=10
    )
    return output.decode()

# ✅ For complex commands
def run_with_validation(cmd: str, args: List[str]) -> str:
    """Run command with validated arguments."""
    allowed_commands = ["cat", "ls", "grep"]
    if cmd not in allowed_commands:
        raise ValueError(f"Command {cmd} not allowed")

    # Validate all arguments
    for arg in args:
        if any(c in arg for c in [";", "|", "&", ">", "<", "`", "$"]):
            raise ValueError(f"Invalid character in argument: {arg}")

    result = subprocess.run(
        [cmd] + args,
        capture_output=True,
        text=True,
        timeout=10,
        check=False
    )

    if result.returncode != 0:
        logger.error(f"Command failed: {result.stderr}")
        raise RuntimeError(f"Command failed: {cmd}")

    return result.stdout
```

### SQL Injection Prevention

```python
import sqlite3
from typing import Any, List, Tuple

# ❌ VULNERABLE
def get_user_unsafe(user_id: str) -> dict:
    """VULNERABLE TO SQL INJECTION!"""
    query = f"SELECT * FROM users WHERE id = '{user_id}'"
    cursor.execute(query)  # user_id could be: "1' OR '1'='1"
    return cursor.fetchone()

# ✅ SAFE - Parameterized Queries
def get_user_safe(user_id: str) -> dict | None:
    """Safe parameterized query."""
    query = "SELECT * FROM users WHERE id = ?"
    cursor.execute(query, (user_id,))
    return cursor.fetchone()

# ✅ Using SQLAlchemy (ORM)
from sqlalchemy import select
from sqlalchemy.orm import Session

def get_user_orm(session: Session, user_id: str) -> User | None:
    """Safe ORM query."""
    stmt = select(User).where(User.id == user_id)
    return session.scalar(stmt)

# ✅ Dynamic queries safely
def search_users(
    session: Session,
    filters: dict[str, Any]
) -> List[User]:
    """Build safe dynamic query."""
    stmt = select(User)

    # Whitelist allowed filters
    allowed_filters = {"username", "email", "status"}
    for key, value in filters.items():
        if key not in allowed_filters:
            raise ValueError(f"Filter {key} not allowed")

        stmt = stmt.where(getattr(User, key) == value)

    return list(session.scalars(stmt))
```

---

## Dependency Security

### Scanning Dependencies

```bash
# Install security scanners
pip install pip-audit safety bandit

# Scan for known vulnerabilities
pip-audit

# Alternative scanner
safety check

# Scan code for security issues
bandit -r src/

# Check outdated packages
pip list --outdated
```

### Requirements Management

```toml
# pyproject.toml with pinned versions
[project]
dependencies = [
    "requests==2.31.0",  # Pin exact versions
    "boto3>=1.28.0,<2.0.0",  # Pin major version
    "pydantic>=2.0.0,<3.0.0"
]

[project.optional-dependencies]
dev = [
    "pytest==7.4.3",
    "mypy==1.7.1",
    "ruff==0.1.9"
]
```

```yaml
# dependabot.yml - Automated updates
version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### Secure Installation

```bash
# Verify package hashes
pip install --require-hashes -r requirements.txt

# Use private PyPI for internal packages
pip install --index-url https://pypi.company.com/simple package-name

# Audit before install
pip-audit --desc
pip install package-name
```

---

## Authentication & Authorization

### Password Handling

```python
import bcrypt
import secrets

# ❌ NEVER store plaintext passwords
passwords = {"user": "password123"}  # SECURITY VIOLATION

# ✅ Hash passwords properly
def hash_password(password: str) -> str:
    """Hash password with bcrypt."""
    salt = bcrypt.gensalt(rounds=12)  # Adjust rounds for security/performance
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())

# Generate secure random tokens
def generate_token(length: int = 32) -> str:
    """Generate cryptographically secure token."""
    return secrets.token_urlsafe(length)

# Usage
user_password = hash_password("user_input_password")
# Store user_password in database

# Verification
if verify_password(user_input, stored_hash):
    # Authenticated
    pass
```

### API Key Validation

```python
import hmac
import hashlib
import time
from typing import Optional

class APIKeyValidator:
    """Secure API key validation."""

    def __init__(self, secret: str):
        self._secret = secret.encode()

    def generate_key(self, user_id: str, expires: int = 86400) -> str:
        """Generate time-limited API key."""
        timestamp = int(time.time()) + expires
        message = f"{user_id}:{timestamp}".encode()
        signature = hmac.new(self._secret, message, hashlib.sha256).hexdigest()
        return f"{user_id}:{timestamp}:{signature}"

    def validate_key(self, key: str) -> Optional[str]:
        """Validate API key and return user_id if valid."""
        try:
            user_id, timestamp, signature = key.split(":")

            # Check expiry
            if int(timestamp) < int(time.time()):
                return None

            # Verify signature
            message = f"{user_id}:{timestamp}".encode()
            expected = hmac.new(self._secret, message, hashlib.sha256).hexdigest()

            # Constant-time comparison
            if not hmac.compare_digest(signature, expected):
                return None

            return user_id

        except (ValueError, AttributeError):
            return None
```

---

## Secure Logging

```python
import logging
import re
from typing import Any

class SecureFormatter(logging.Formatter):
    """Formatter that redacts sensitive information."""

    PATTERNS = [
        (re.compile(r'(api[_-]?key|token|password)\s*[:=]\s*["\']?([^"\'\s]+)', re.I), r'\1=REDACTED'),
        (re.compile(r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', re.I), 'Bearer REDACTED'),
        (re.compile(r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b'), 'XXXX-XXXX-XXXX-XXXX'),
    ]

    def format(self, record: logging.LogRecord) -> str:
        """Format log record with sensitive data redacted."""
        msg = super().format(record)

        for pattern, replacement in self.PATTERNS:
            msg = pattern.sub(replacement, msg)

        return msg

# Setup secure logging
handler = logging.StreamHandler()
handler.setFormatter(SecureFormatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))

logger = logging.getLogger(__name__)
logger.addHandler(handler)

# Usage - sensitive data automatically redacted
logger.info(f"Connecting with api_key={api_key}")
# Output: Connecting with api_key=REDACTED
```

---

## File Upload Security

```python
from pathlib import Path
import magic
from werkzeug.utils import secure_filename

class SecureFileUpload:
    """Secure file upload handler."""

    ALLOWED_EXTENSIONS = {".txt", ".pdf", ".png", ".jpg", ".csv"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    def __init__(self, upload_dir: Path):
        self.upload_dir = upload_dir
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def validate_upload(self, filename: str, content: bytes) -> Path:
        """Validate and save uploaded file."""
        # Sanitize filename
        safe_name = secure_filename(filename)
        if not safe_name:
            raise ValueError("Invalid filename")

        # Check extension
        suffix = Path(safe_name).suffix.lower()
        if suffix not in self.ALLOWED_EXTENSIONS:
            raise ValueError(f"Extension {suffix} not allowed")

        # Check size
        if len(content) > self.MAX_FILE_SIZE:
            raise ValueError("File too large")

        # Verify MIME type matches extension
        mime = magic.from_buffer(content, mime=True)
        expected_mimes = {
            ".txt": "text/plain",
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".csv": "text/csv"
        }
        if mime != expected_mimes.get(suffix):
            raise ValueError(f"MIME type {mime} doesn't match extension {suffix}")

        # Generate unique filename
        unique_name = f"{secrets.token_hex(8)}_{safe_name}"
        file_path = self.upload_dir / unique_name

        # Save with restricted permissions
        file_path.write_bytes(content)
        file_path.chmod(0o600)

        return file_path
```

---

## Encryption

```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import base64

class DataEncryption:
    """Symmetric encryption for sensitive data."""

    def __init__(self, password: str, salt: bytes | None = None):
        """Initialize with password-derived key."""
        if salt is None:
            salt = secrets.token_bytes(16)

        self.salt = salt

        # Derive key from password
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        self.cipher = Fernet(key)

    def encrypt(self, data: str) -> str:
        """Encrypt string data."""
        return self.cipher.encrypt(data.encode()).decode()

    def decrypt(self, encrypted: str) -> str:
        """Decrypt data."""
        return self.cipher.decrypt(encrypted.encode()).decode()

# Usage
encryptor = DataEncryption(password="strong-password", salt=b"...")
encrypted = encryptor.encrypt("sensitive data")
decrypted = encryptor.decrypt(encrypted)
```

---

## AWS IAM Best Practices

```python
import boto3
from typing import Optional

class AWSSecureClient:
    """AWS client with security best practices."""

    def __init__(self, role_arn: Optional[str] = None):
        """Initialize with optional role assumption."""
        if role_arn:
            # Use temporary credentials via role assumption
            sts = boto3.client("sts")
            response = sts.assume_role(
                RoleArn=role_arn,
                RoleSessionName="app-session",
                DurationSeconds=3600  # 1 hour max
            )
            credentials = response["Credentials"]

            self.session = boto3.Session(
                aws_access_key_id=credentials["AccessKeyId"],
                aws_secret_access_key=credentials["SecretAccessKey"],
                aws_session_token=credentials["SessionToken"]
            )
        else:
            # Use default credentials (EC2 instance role, etc.)
            self.session = boto3.Session()

    def get_s3_client(self):
        """Get S3 client with least privilege."""
        return self.session.client("s3")
```

---

## Security Checklist

Before deploying Python code:

- [ ] No hardcoded secrets or credentials
- [ ] All secrets from environment or secret manager
- [ ] Input validation on all external data
- [ ] No shell=True in subprocess calls
- [ ] Parameterized SQL queries (no string interpolation)
- [ ] Dependencies scanned with pip-audit/safety
- [ ] Code scanned with bandit
- [ ] Sensitive data redacted from logs
- [ ] File uploads validated and sanitized
- [ ] Passwords hashed with bcrypt (never plaintext)
- [ ] HTTPS only for external communications
- [ ] Principle of least privilege for permissions
- [ ] Error messages don't leak internal details
- [ ] Security headers set (if web app)
- [ ] Rate limiting implemented (if API)

---

## Tools & Resources

```bash
# Security scanning
pip install bandit pip-audit safety

# Run scans
bandit -r src/ -ll
pip-audit --desc
safety check --json

# Pre-commit security
pre-commit install
```

**Resources:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Python Security Best Practices](https://python.readthedocs.io/en/stable/library/security_warnings.html)
- [Bandit Documentation](https://bandit.readthedocs.io/)
