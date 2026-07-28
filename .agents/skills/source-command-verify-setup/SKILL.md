---
name: "source-command-verify-setup"
description: "Run the infrastructure health check and fix anything that fails"
---

# source-command-verify-setup

Use this skill when the user asks to run the migrated source command `verify-setup`.

## Command Template

Run the Codex infrastructure health check and get it fully green.

## Steps

1. Run the health check from the project root:
   ```bash
   bash .Codex/scripts/verify-setup.sh
   ```

2. For every `[FAIL]` line, apply the printed fix. Common fixes:
   - Dependencies missing: `cd .Codex/hooks && npm install`
   - Scripts not executable: `chmod +x .Codex/hooks/*.sh`
   - Invalid JSON in `.Codex/settings.json` or `.Codex/skills/skill-rules.json`: read the file, find the syntax error (usually a trailing comma), and repair it without changing any settings values
   - Missing hook scripts registered in settings.json: ask the user whether to copy them from the showcase repo (https://github.com/diet103/Codex-infrastructure-showcase) or remove the dead registrations

3. Re-run the script after each fix until it reports 0 failed.

4. `[WARN]` lines are optional features (session intelligence, jq-based file tracking, AI classification keys). Do NOT install API keys or system packages on the user's behalf - summarize what each warning means and let the user decide.

5. Report the final result to the user: what was broken, what you fixed, and what (if anything) remains as a warning.
