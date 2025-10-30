#!/usr/bin/env python3
"""
Post-tool-use hook that tracks edited files and their repos.
This runs after Edit, MultiEdit, or Write tools complete successfully.
"""

import json
import sys
import os
import re
from pathlib import Path
from typing import Optional
from datetime import datetime


def detect_repo(file_path: str, project_root: str) -> Optional[str]:
    """Detect repo from file path."""
    # Remove project root from path
    relative_path = file_path.replace(f"{project_root}/", "", 1)

    # Extract first directory component
    parts = relative_path.split('/')
    if not parts:
        return None

    repo = parts[0]

    # Common project directory patterns
    frontend_patterns = ['frontend', 'client', 'web', 'app', 'ui']
    backend_patterns = ['backend', 'server', 'api', 'src', 'services']
    database_patterns = ['database', 'prisma', 'migrations']

    if repo in frontend_patterns or repo in backend_patterns or repo in database_patterns:
        return repo

    # Package/monorepo structure
    if repo == 'packages':
        if len(parts) >= 2:
            return f"packages/{parts[1]}"
        return repo

    # Examples directory
    if repo == 'examples':
        if len(parts) >= 2:
            return f"examples/{parts[1]}"
        return repo

    # Check if it's a source file in root
    if len(parts) == 1:
        return 'root'

    return 'unknown'


def get_build_command(repo: str, project_root: str) -> Optional[str]:
    """Get build command for repo."""
    repo_path = Path(project_root) / repo
    package_json = repo_path / 'package.json'

    # Check if package.json exists and has a build script
    if package_json.exists():
        try:
            with open(package_json, 'r') as f:
                pkg_data = json.load(f)
                if 'scripts' in pkg_data and 'build' in pkg_data['scripts']:
                    # Detect package manager (prefer pnpm, then npm, then yarn)
                    if (repo_path / 'pnpm-lock.yaml').exists():
                        return f"cd {repo_path} && pnpm build"
                    elif (repo_path / 'package-lock.json').exists():
                        return f"cd {repo_path} && npm run build"
                    elif (repo_path / 'yarn.lock').exists():
                        return f"cd {repo_path} && yarn build"
                    else:
                        return f"cd {repo_path} && npm run build"
        except (json.JSONDecodeError, IOError):
            pass

    # Special case for database with Prisma
    if repo == 'database' or 'prisma' in repo:
        schema_paths = [
            repo_path / 'schema.prisma',
            repo_path / 'prisma' / 'schema.prisma'
        ]
        if any(p.exists() for p in schema_paths):
            return f"cd {repo_path} && npx prisma generate"

    return None


def get_tsc_command(repo: str, project_root: str) -> Optional[str]:
    """Get TSC command for repo."""
    repo_path = Path(project_root) / repo
    tsconfig = repo_path / 'tsconfig.json'

    # Check if tsconfig.json exists
    if tsconfig.exists():
        # Check for Vite/React-specific tsconfig
        tsconfig_app = repo_path / 'tsconfig.app.json'
        if tsconfig_app.exists():
            return f"cd {repo_path} && npx tsc --project tsconfig.app.json --noEmit"
        else:
            return f"cd {repo_path} && npx tsc --noEmit"

    return None


def main():
    try:
        # Read tool information from stdin
        tool_info_json = sys.stdin.read()
        tool_info = json.loads(tool_info_json)

        # Extract relevant data
        tool_name = tool_info.get('tool_name', '')
        file_path = tool_info.get('tool_input', {}).get('file_path', '')
        session_id = tool_info.get('session_id', 'default')

        # Skip if not an edit tool or no file path
        if tool_name not in ['Edit', 'MultiEdit', 'Write'] or not file_path:
            sys.exit(0)

        # Skip markdown files
        if re.search(r'\.(md|markdown)$', file_path):
            sys.exit(0)

        # Get project directory
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', '')
        if not project_dir:
            sys.exit(0)

        # Create cache directory in project
        cache_dir = Path(project_dir) / '.claude' / 'tsc-cache' / session_id
        cache_dir.mkdir(parents=True, exist_ok=True)

        # Detect repo
        repo = detect_repo(file_path, project_dir)

        # Skip if unknown repo
        if not repo or repo == 'unknown':
            sys.exit(0)

        # Log edited file
        timestamp = int(datetime.now().timestamp())
        edited_files_log = cache_dir / 'edited-files.log'
        with open(edited_files_log, 'a') as f:
            f.write(f"{timestamp}:{file_path}:{repo}\n")

        # Update affected repos list
        affected_repos_file = cache_dir / 'affected-repos.txt'
        existing_repos = set()
        if affected_repos_file.exists():
            existing_repos = set(affected_repos_file.read_text().strip().split('\n'))

        if repo not in existing_repos:
            with open(affected_repos_file, 'a') as f:
                f.write(f"{repo}\n")

        # Store build commands
        commands_tmp = cache_dir / 'commands.txt.tmp'
        build_cmd = get_build_command(repo, project_dir)
        tsc_cmd = get_tsc_command(repo, project_dir)

        with open(commands_tmp, 'a') as f:
            if build_cmd:
                f.write(f"{repo}:build:{build_cmd}\n")
            if tsc_cmd:
                f.write(f"{repo}:tsc:{tsc_cmd}\n")

        # Remove duplicates from commands
        if commands_tmp.exists():
            commands = set(commands_tmp.read_text().strip().split('\n'))
            commands_file = cache_dir / 'commands.txt'
            commands_file.write_text('\n'.join(sorted(commands)) + '\n')
            commands_tmp.unlink()

        # Exit cleanly
        sys.exit(0)

    except Exception as err:
        # Silent failure - don't interrupt the workflow
        sys.exit(0)


if __name__ == '__main__':
    main()
