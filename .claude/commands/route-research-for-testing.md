---
description: Map edited routes & launch tests
argument-hint: "[/extra/path …]"
allowed-tools: Bash(cat:*), Bash(awk:*), Bash(grep:*), Bash(sort:*), Bash(xargs:*), Bash(sed:*)
model: sonnet
---

## Context

Changed route files this session (auto-generated):

!cat "$CLAUDE_PROJECT_DIR/.claude/tsc-cache"/\*/edited-files.log \
 | awk -F: '{print $2}' \
 | grep '/routes/' \
 | sort -u

User-specified additional routes: `$ARGUMENTS`

## Your task

Follow the numbered steps **exactly**:

1. Combine the auto list with `$ARGUMENTS`, dedupe, and resolve any prefixes
   defined in your API entry point (e.g. `src/app.ts`, `src/server.ts`, or
   wherever routes are registered).
2. For each final route, output a JSON record with the path, method, expected
   request/response shapes, and valid + invalid payload examples.
3. **Now test each route** using cURL or your project's test script:

```bash
# For each route, test with appropriate method and payload
curl -X GET http://localhost:<YOUR_PORT>/api/route-path
curl -X POST -H "Content-Type: application/json" -d '{"key":"value"}' http://localhost:<YOUR_PORT>/api/route-path
```

Substitute `<YOUR_PORT>` with your project's actual dev server port.

Report results for each route: status code, response shape, and any errors found.
