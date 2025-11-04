# Python Type Hints & Typing Patterns

Complete guide to modern Python type hints for maintainable, type-safe code.

---

## Why Type Hints Matter

- **Early error detection** - Catch bugs before runtime with mypy
- **Better IDE support** - Autocomplete, refactoring, navigation
- **Self-documenting** - Types explain expected data structures
- **Refactoring confidence** - Types guide safe changes

---

## Basic Type Hints

### Simple Types

```python
# Built-in types
def greet(name: str) -> str:
    return f"Hello, {name}"

def add(a: int, b: int) -> int:
    return a + b

def calculate(value: float) -> float:
    return value * 1.5

def is_valid(flag: bool) -> bool:
    return not flag
```

### Collections

```python
from typing import List, Dict, Set, Tuple

# Lists
def process_names(names: List[str]) -> List[str]:
    return [name.upper() for name in names]

# Dictionaries
def get_config() -> Dict[str, Any]:
    return {"host": "localhost", "port": 8080}

# Sets
def unique_ids(ids: List[int]) -> Set[int]:
    return set(ids)

# Tuples (fixed length)
def get_coordinates() -> Tuple[float, float]:
    return (51.5074, -0.1278)

# Tuples (variable length)
def get_scores() -> Tuple[int, ...]:
    return (95, 87, 92, 88)
```

### Modern Collections (Python 3.9+)

```python
# Use built-in types directly (no typing import needed)
def process_items(items: list[str]) -> dict[str, int]:
    """Count occurrences using modern syntax."""
    return {item: items.count(item) for item in set(items)}

def merge_data(
    data1: dict[str, list[int]],
    data2: dict[str, list[int]]
) -> dict[str, list[int]]:
    """Merge dictionaries with list values."""
    result = data1.copy()
    for key, values in data2.items():
        result.setdefault(key, []).extend(values)
    return result
```

---

## Optional & Union Types

```python
from typing import Optional, Union

# Optional (value or None)
def find_user(user_id: str) -> Optional[dict[str, Any]]:
    """Return user dict or None if not found."""
    user = db.get(user_id)
    return user if user else None

# Union (one of multiple types)
def process_id(id_value: Union[str, int]) -> str:
    """Accept string or int ID, return as string."""
    return str(id_value)

# Modern syntax (Python 3.10+)
def find_config(name: str) -> dict[str, Any] | None:
    """Modern optional syntax using |."""
    return configs.get(name)

def normalize_value(value: str | int | float) -> float:
    """Modern union syntax."""
    return float(value)
```

---

## Advanced Patterns

### Callable Types

```python
from collections.abc import Callable

# Function that takes a function
def apply_transform(
    data: list[int],
    transform: Callable[[int], int]
) -> list[int]:
    """Apply transformation function to each element."""
    return [transform(x) for x in data]

# Multiple parameters
def filter_items(
    items: list[str],
    predicate: Callable[[str, int], bool]
) -> list[str]:
    """Filter with index-aware predicate."""
    return [item for i, item in enumerate(items) if predicate(item, i)]

# Usage
result = apply_transform([1, 2, 3], lambda x: x * 2)
```

### Generic Types

```python
from typing import TypeVar, Generic

T = TypeVar('T')

class Container(Generic[T]):
    """Generic container for any type."""

    def __init__(self) -> None:
        self._items: list[T] = []

    def add(self, item: T) -> None:
        """Add item to container."""
        self._items.append(item)

    def get_all(self) -> list[T]:
        """Get all items."""
        return self._items.copy()

# Usage
string_container: Container[str] = Container()
string_container.add("hello")

int_container: Container[int] = Container()
int_container.add(42)
```

### Protocol Types (Structural Typing)

```python
from typing import Protocol

class Drawable(Protocol):
    """Protocol for drawable objects."""
    def draw(self) -> None: ...
    def get_bounds(self) -> tuple[int, int, int, int]: ...

class Circle:
    """Implements Drawable protocol without inheritance."""
    def draw(self) -> None:
        print("Drawing circle")

    def get_bounds(self) -> tuple[int, int, int, int]:
        return (0, 0, 100, 100)

def render(obj: Drawable) -> None:
    """Render any drawable object."""
    obj.draw()
    bounds = obj.get_bounds()
    print(f"Bounds: {bounds}")

# Works with any class implementing the protocol
render(Circle())
```

---

## Type Aliases

```python
from typing import TypeAlias

# Simple aliases for readability
UserId: TypeAlias = str
EmailAddress: TypeAlias = str
Timestamp: TypeAlias = int

# Complex type aliases
Config: TypeAlias = dict[str, str | int | bool]
Handler: TypeAlias = Callable[[dict[str, Any]], dict[str, Any]]
Result: TypeAlias = tuple[bool, str | None]

def send_email(
    user_id: UserId,
    email: EmailAddress,
    timestamp: Timestamp
) -> Result:
    """Send email with typed parameters."""
    try:
        # Send logic
        return (True, None)
    except Exception as e:
        return (False, str(e))
```

---

## Dataclasses with Types

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class User:
    """User model with type hints."""
    id: str
    username: str
    email: str
    created_at: datetime = field(default_factory=datetime.now)
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    is_active: bool = True
    last_login: Optional[datetime] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
            "tags": self.tags,
            "is_active": self.is_active
        }
```

---

## Pydantic Models (Validation + Types)

```python
from pydantic import BaseModel, Field, validator, field_validator
from datetime import datetime

class APIRequest(BaseModel):
    """API request with validation."""
    user_id: str = Field(..., min_length=1, max_length=100)
    action: str = Field(..., pattern=r'^[a-z_]+$')
    timestamp: datetime = Field(default_factory=datetime.now)
    payload: dict[str, Any] = Field(default_factory=dict)
    retry_count: int = Field(default=0, ge=0, le=5)

    @field_validator('action')
    @classmethod
    def validate_action(cls, v: str) -> str:
        """Validate action is in allowed list."""
        allowed = ['create', 'update', 'delete', 'read']
        if v not in allowed:
            raise ValueError(f"Action must be one of {allowed}")
        return v

    class Config:
        """Pydantic configuration."""
        frozen = False
        validate_assignment = True
```

---

## Type Guards

```python
from typing import TypeGuard

def is_string_list(val: list[Any]) -> TypeGuard[list[str]]:
    """Type guard for list of strings."""
    return all(isinstance(item, str) for item in val)

def process_strings(items: list[Any]) -> None:
    """Process items only if they're strings."""
    if is_string_list(items):
        # mypy now knows items is list[str]
        for item in items:
            print(item.upper())  # Safe - mypy knows it's str
```

---

## Literal Types

```python
from typing import Literal

LogLevel = Literal['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']

def set_log_level(level: LogLevel) -> None:
    """Set log level with restricted values."""
    logger.setLevel(level)

# Valid
set_log_level('DEBUG')

# Invalid - mypy will catch this
# set_log_level('INVALID')  # Error!
```

---

## Common Patterns

### API Response Types

```python
from typing import TypedDict

class SuccessResponse(TypedDict):
    """Successful API response."""
    success: Literal[True]
    data: dict[str, Any]
    message: str

class ErrorResponse(TypedDict):
    """Error API response."""
    success: Literal[False]
    error: str
    code: int

APIResponse = SuccessResponse | ErrorResponse

def make_api_call(endpoint: str) -> APIResponse:
    """Make API call with typed response."""
    try:
        data = requests.get(endpoint).json()
        return {
            "success": True,
            "data": data,
            "message": "OK"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "code": 500
        }
```

### Context Manager Types

```python
from typing import Iterator
from contextlib import contextmanager

@contextmanager
def database_connection(url: str) -> Iterator[Connection]:
    """Type-safe context manager."""
    conn = connect(url)
    try:
        yield conn
    finally:
        conn.close()

# Usage
with database_connection("postgresql://...") as conn:
    # mypy knows conn is Connection type
    conn.execute("SELECT * FROM users")
```

---

## Mypy Configuration

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_calls = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true

# Per-module overrides
[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

---

## Best Practices

✅ **DO:**
- Type all function signatures
- Use modern syntax (3.9+: `list[str]`, 3.10+: `str | None`)
- Use `TypeAlias` for complex types
- Use Pydantic for data validation
- Run mypy in strict mode
- Use protocols for structural typing

❌ **DON'T:**
- Use `Any` unless absolutely necessary
- Skip return type hints
- Use `# type: ignore` without understanding why
- Mix old and new syntax (pick one style)
- Forget to install type stubs for libraries

---

## Common Type Stubs

```bash
# Install stubs for popular libraries
pip install types-requests
pip install types-redis
pip install types-PyYAML
pip install types-boto3
pip install types-paramiko
```

---

## Resources

- [MyPy Documentation](https://mypy.readthedocs.io/)
- [PEP 484 - Type Hints](https://peps.python.org/pep-0484/)
- [Typing Best Practices](https://typing.readthedocs.io/)
