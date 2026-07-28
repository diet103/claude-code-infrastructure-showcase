#!/usr/bin/env node
/**
 * PostToolUse Hook - Skill Activation Tracker
 *
 * Fires when the Skill tool is used. Clears the activated skill from
 * mandatory_pending and pretooluse_pending in session state, preventing
 * unnecessary blocking after a skill has been activated.
 */

import { existsSync, readFileSync } from 'fs';
import { loadSessionState, sessionStatePath, updateSessionState } from './lib/session-state.js';
import { recordMetric } from './lib/metrics.js';

interface HookInput {
    session_id: string;
    tool_name: string;
    tool_input: {
        skill?: string;
    };
    tool_result?: string;
}

function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        // Only handle Skill tool
        if (data.tool_name !== 'Skill') {
            process.exit(0);
        }

        const skillName = data.tool_input.skill;
        if (!skillName) {
            process.exit(0);
        }

        recordMetric({ event: 'activated', session: data.session_id, skill: skillName });

        if (!existsSync(sessionStatePath(data.session_id))) {
            process.exit(0);
        }

        const current = loadSessionState(data.session_id);
        const isPending = current.mandatory_pending.includes(skillName)
            || current.pretooluse_pending.includes(skillName);

        if (isPending) {
            const state = updateSessionState(data.session_id, state => {
                state.mandatory_pending = state.mandatory_pending.filter(s => s !== skillName);
                state.pretooluse_pending = state.pretooluse_pending.filter(s => s !== skillName);
            });

            if (process.env.DEBUG_SKILLS === '1') {
                console.error(`[Skill Tracker] Cleared "${skillName}" from pending lists`);
                console.error(`[Skill Tracker] Remaining mandatory: ${state.mandatory_pending.length > 0 ? state.mandatory_pending.join(', ') : '(none)'}`);
            }
        }

        process.exit(0);
    } catch (err) {
        if (process.env.DEBUG_SKILLS === '1') {
            console.error('[Skill Tracker] Error:', err);
        }
        process.exit(0);
    }
}

main();
