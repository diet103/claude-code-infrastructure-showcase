#!/usr/bin/env python3
import json
import sys
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, TypedDict


class PromptTriggers(TypedDict, total=False):
    keywords: List[str]
    intentPatterns: List[str]


class SkillRule(TypedDict):
    type: str  # 'guardrail' | 'domain'
    enforcement: str  # 'block' | 'suggest' | 'warn'
    priority: str  # 'critical' | 'high' | 'medium' | 'low'
    promptTriggers: Optional[PromptTriggers]


class SkillRules(TypedDict):
    version: str
    skills: Dict[str, SkillRule]


class HookInput(TypedDict):
    session_id: str
    transcript_path: str
    cwd: str
    permission_mode: str
    prompt: str


class MatchedSkill(TypedDict):
    name: str
    matchType: str  # 'keyword' | 'intent'
    config: SkillRule


def main():
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        data: HookInput = json.loads(input_data)
        prompt = data['prompt'].lower()

        # Load skill rules
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.path.expanduser('~/project'))
        rules_path = Path(project_dir) / '.claude' / 'skills' / 'skill-rules.json'

        with open(rules_path, 'r') as f:
            rules: SkillRules = json.load(f)

        matched_skills: List[MatchedSkill] = []

        # Check each skill for matches
        for skill_name, config in rules['skills'].items():
            triggers = config.get('promptTriggers')
            if not triggers:
                continue

            # Keyword matching
            if 'keywords' in triggers:
                keyword_match = any(
                    kw.lower() in prompt
                    for kw in triggers['keywords']
                )
                if keyword_match:
                    matched_skills.append({
                        'name': skill_name,
                        'matchType': 'keyword',
                        'config': config
                    })
                    continue

            # Intent pattern matching
            if 'intentPatterns' in triggers:
                intent_match = any(
                    re.search(pattern, prompt, re.IGNORECASE)
                    for pattern in triggers['intentPatterns']
                )
                if intent_match:
                    matched_skills.append({
                        'name': skill_name,
                        'matchType': 'intent',
                        'config': config
                    })

        # Generate output if matches found
        if matched_skills:
            output = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
            output += '🎯 SKILL ACTIVATION CHECK\n'
            output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'

            # Group by priority
            critical = [s for s in matched_skills if s['config']['priority'] == 'critical']
            high = [s for s in matched_skills if s['config']['priority'] == 'high']
            medium = [s for s in matched_skills if s['config']['priority'] == 'medium']
            low = [s for s in matched_skills if s['config']['priority'] == 'low']

            if critical:
                output += '⚠️ CRITICAL SKILLS (REQUIRED):\n'
                for s in critical:
                    output += f"  → {s['name']}\n"
                output += '\n'

            if high:
                output += '📚 RECOMMENDED SKILLS:\n'
                for s in high:
                    output += f"  → {s['name']}\n"
                output += '\n'

            if medium:
                output += '💡 SUGGESTED SKILLS:\n'
                for s in medium:
                    output += f"  → {s['name']}\n"
                output += '\n'

            if low:
                output += '📌 OPTIONAL SKILLS:\n'
                for s in low:
                    output += f"  → {s['name']}\n"
                output += '\n'

            output += 'ACTION: Use Skill tool BEFORE responding\n'
            output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'

            print(output, end='')

        sys.exit(0)
    except Exception as err:
        print(f'Error in skill-activation-prompt hook: {err}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
