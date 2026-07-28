/**
 * Shared session-state persistence for the skill hooks.
 *
 * All skill hooks read and write .claude/hooks/state/skills-used-<sessionId>.json.
 * Hooks can run concurrently (Claude issues tool calls in parallel), so all
 * mutations go through updateSessionState(), which re-reads the file
 * immediately before writing and writes atomically (temp file + rename).
 * This shrinks the read-modify-write race window from the full hook lifetime
 * (seconds, when AI analysis runs) to microseconds.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface SessionState {
    skills_used: string[];
    mandatory_pending: string[];
    files_verified: string[];
    ai_suggested_skills: string[];
    files_analyzed_by_ai: string[];
    pretooluse_pending: string[];
    last_updated: string;
}

function stateDir(): string {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';
    return join(projectDir, '.claude', 'hooks', 'state');
}

export function sessionStatePath(sessionId: string): string {
    return join(stateDir(), `skills-used-${sessionId}.json`);
}

function defaultState(): SessionState {
    return {
        skills_used: [],
        mandatory_pending: [],
        files_verified: [],
        ai_suggested_skills: [],
        files_analyzed_by_ai: [],
        pretooluse_pending: [],
        last_updated: new Date().toISOString(),
    };
}

export function loadSessionState(sessionId: string): SessionState {
    const statePath = sessionStatePath(sessionId);
    if (!existsSync(statePath)) return defaultState();
    try {
        return { ...defaultState(), ...JSON.parse(readFileSync(statePath, 'utf-8')) };
    } catch {
        return defaultState();
    }
}

/**
 * Re-read the freshest on-disk state, apply the mutation, and write
 * atomically. Returns the state as written. Persistence is best-effort:
 * a failed write never throws into the calling hook.
 */
export function updateSessionState(
    sessionId: string,
    mutate: (state: SessionState) => void
): SessionState {
    const statePath = sessionStatePath(sessionId);
    const state = loadSessionState(sessionId);
    mutate(state);
    state.last_updated = new Date().toISOString();
    try {
        const dir = stateDir();
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const tmpPath = `${statePath}.${process.pid}.tmp`;
        writeFileSync(tmpPath, JSON.stringify(state, null, 2));
        renameSync(tmpPath, statePath);
    } catch {
        // State persistence is best-effort; never break the hook
    }
    return state;
}
