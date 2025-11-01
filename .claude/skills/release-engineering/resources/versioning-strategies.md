# Versioning Strategies

Semantic versioning (SemVer), calendar versioning (CalVer), Git-based versioning, and version management.

## Semantic Versioning (SemVer)

**Format:** MAJOR.MINOR.PATCH

```
v1.0.0 - Initial release
v1.0.1 - Patch: Bug fix
v1.1.0 - Minor: New feature (backward compatible)
v2.0.0 - Major: Breaking change
```

**Implementation:**
```bash
# Tag release
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# Auto-increment with npm
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

## Calendar Versioning (CalVer)

**Format:** YYYY.MM.MICRO or YY.MM.MICRO

```
2024.01.0 - January 2024, first release
2024.01.1 - January 2024, second release
2024.02.0 - February 2024, first release
```

**Use Cases:**
- Time-based releases
- Marketing-driven versioning
- Infrastructure tools (Ubuntu, Poetry)

## Git-Based Versioning

**Git Describe:**
```bash
# v1.2.3-14-g2414721
# v1.2.3: Last tag
# 14: Commits since tag
# g2414721: Git commit hash

git describe --tags --always
```

---

**Related Resources:**
- [artifact-management.md](artifact-management.md)
- [release-automation.md](release-automation.md)
