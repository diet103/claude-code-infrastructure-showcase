# Release Automation

Automated releases, changelog generation, release notes, semantic release, and git tag automation.

## Semantic Release

**Configuration:**
```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/github",
    "@semantic-release/git"
  ]
}
```

**Commit Conventions:**
```
feat: New feature (minor version bump)
fix: Bug fix (patch version bump)
BREAKING CHANGE: Breaking change (major version bump)
docs: Documentation only
chore: Maintenance tasks
```

## GitHub Release Action

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Generate Changelog
        id: changelog
        run: |
          echo "## Changes" > CHANGELOG.md
          git log $(git describe --tags --abbrev=0 HEAD^)..HEAD --pretty=format:"- %s (%an)" >> CHANGELOG.md

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          body_path: CHANGELOG.md
          files: |
            dist/*
            *.tar.gz
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

**Related Resources:**
- [versioning-strategies.md](versioning-strategies.md)
- [ci-cd-pipelines.md](ci-cd-pipelines.md)
