---
name: python-dev-guidelines
description: Python development best practices for DevSecOps. Covers type hints, error handling, testing with pytest, logging patterns, dependency management, security practices, and code organization. Use when writing Python code, creating modules, setting up projects, or debugging Python applications.
---

# Python Development Guidelines

## Purpose

Comprehensive Python development guidelines for DevSecOps engineers, emphasizing type safety, testing, error handling, security, and maintainability.

## When to Use This Skill

Automatically activates when you:
- Work with `.py` files
- Mention Python, pytest, typing, or related keywords
- Create new Python modules or packages
- Debug Python errors
- Set up Python projects
- Work with virtual environments

---

## Quick Reference

### Core Principles

1. **Type Everything** - Use type hints everywhere for maintainability
2. **Test Everything** - pytest for all code, aim for >80% coverage
3. **Handle Errors Explicitly** - Never use bare `except:`
4. **Log Meaningfully** - Structured logging with context
5. **Secure by Default** - No secrets in code, validate all inputs
6. **Dependencies Matter** - Pin versions, scan for vulnerabilities

### Project Structure

```
project/
├── src/
│   └── package_name/
│       ├── __init__.py
│       ├── main.py
│       ├── models/
│       ├── services/
│       └── utils/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── pyproject.toml
├── README.md
└── .env.example
```

---

## Essential Patterns

### Type Hints (Always)

```python
from typing import Optional, List, Dict, Any
from collections.abc import Callable

def process_data(
    items: List[Dict[str, Any]],
    filter_fn: Callable[[Dict[str, Any]], bool],
    max_results: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Process data with optional filtering and limiting."""
    filtered = [item for item in items if filter_fn(item)]
    return filtered[:max_results] if max_results else filtered
```

### Error Handling

```python
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class ServiceError(Exception):
    """Base exception for service errors."""
    pass

class ResourceNotFoundError(ServiceError):
    """Raised when resource doesn't exist."""
    pass

def fetch_resource(resource_id: str) -> Optional[Dict[str, Any]]:
    """Fetch resource with proper error handling."""
    try:
        # Attempt fetch
        data = api_client.get(f"/resource/{resource_id}")
        return data
    except requests.HTTPError as e:
        if e.response.status_code == 404:
            raise ResourceNotFoundError(f"Resource {resource_id} not found") from e
        logger.error(f"HTTP error fetching resource: {e}", exc_info=True)
        raise ServiceError(f"Failed to fetch resource: {e}") from e
    except requests.RequestException as e:
        logger.error(f"Network error: {e}", exc_info=True)
        raise ServiceError(f"Network error: {e}") from e
```

### Testing with pytest

```python
import pytest
from unittest.mock import Mock, patch

@pytest.fixture
def sample_data():
    """Fixture for test data."""
    return {"id": "123", "name": "test"}

def test_process_data_filters_correctly(sample_data):
    """Test data processing with filtering."""
    items = [sample_data, {"id": "456", "name": "other"}]
    result = process_data(
        items,
        filter_fn=lambda x: x["id"] == "123"
    )
    assert len(result) == 1
    assert result[0]["id"] == "123"

def test_fetch_resource_not_found():
    """Test resource not found handling."""
    with pytest.raises(ResourceNotFoundError):
        fetch_resource("nonexistent")
```

---

## Resource Files (Progressive Disclosure)

For detailed guidance, refer to these resource files:

### Core Development
- **[typing-patterns.md](resources/typing-patterns.md)** - Type hints, generics, protocols
- **[error-handling.md](resources/error-handling.md)** - Exception hierarchies, context managers
- **[testing-patterns.md](resources/testing-patterns.md)** - pytest, fixtures, mocking, parametrize

### Code Organization
- **[project-structure.md](resources/project-structure.md)** - Package layout, imports, modules
- **[dependency-management.md](resources/dependency-management.md)** - Poetry, pip-tools, virtual envs

### Quality & Security
- **[logging-patterns.md](resources/logging-patterns.md)** - Structured logging, log levels, handlers
- **[security-practices.md](resources/security-practices.md)** - Input validation, secrets, dependencies
- **[code-quality.md](resources/code-quality.md)** - Ruff, mypy, black, pre-commit

---

## Common Anti-Patterns to Avoid

❌ **Bare except clauses**
```python
try:
    do_something()
except:  # DON'T - catches everything including KeyboardInterrupt
    pass
```

✅ **Specific exception handling**
```python
try:
    do_something()
except ValueError as e:
    logger.error(f"Invalid value: {e}")
    raise
```

❌ **No type hints**
```python
def process(data):  # What type is data?
    return data.get("value")
```

✅ **Clear type hints**
```python
def process(data: Dict[str, Any]) -> Optional[Any]:
    return data.get("value")
```

❌ **Hardcoded secrets**
```python
API_KEY = "sk-abc123..."  # DON'T
```

✅ **Environment variables**
```python
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY not set")
```

---

## DevSecOps Integration

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.9
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.1
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]

  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.5
    hooks:
      - id: bandit
        args: ["-c", "pyproject.toml"]
```

### CI/CD Pipeline

```yaml
# .github/workflows/python-ci.yml
name: Python CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install poetry
          poetry install

      - name: Run ruff
        run: poetry run ruff check .

      - name: Run mypy
        run: poetry run mypy .

      - name: Run tests
        run: poetry run pytest --cov --cov-report=xml

      - name: Security scan
        run: poetry run bandit -r src/
```

---

## Quick Commands

```bash
# Setup new project
poetry new my-project
cd my-project
poetry add requests httpx pydantic
poetry add --group dev pytest pytest-cov mypy ruff bandit

# Run quality checks
ruff check . --fix
mypy .
pytest --cov

# Security scan
bandit -r src/
pip-audit

# Type stub generation
stubgen -p mypackage -o stubs/
```

---

## When to Load Resource Files

Ask me to load specific resource files when you need deep dives:

- **"Load typing-patterns"** - When working with complex types, generics, protocols
- **"Load error-handling"** - When designing exception hierarchies or error flows
- **"Load testing-patterns"** - When setting up pytest, fixtures, or mocking
- **"Load security-practices"** - When handling secrets, inputs, or dependencies
- **"Load logging-patterns"** - When implementing logging infrastructure
- **"Load project-structure"** - When organizing new projects or refactoring
- **"Load dependency-management"** - When setting up Poetry, pip-tools, or requirements

---

## Integration with Claude Code

This skill works with:
- **skill-activation-prompt hook** - Auto-suggests when editing `.py` files
- **post-tool-use-tracker hook** - Tracks Python files being modified
- **python-lint-check hook** - Runs ruff/mypy on Stop (if configured)

---

## Version & Compatibility

- **Python Version**: 3.11+
- **Type Checking**: mypy strict mode
- **Linting**: ruff (replaces flake8, isort, black)
- **Testing**: pytest 7+
- **Dependency Management**: Poetry or pip-tools
