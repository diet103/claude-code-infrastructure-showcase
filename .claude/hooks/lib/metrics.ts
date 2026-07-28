/**
 * Append-only JSONL telemetry for the skill-activation system.
 *
 * Each suggestion, activation, and block gets one line in
 * state/metrics.jsonl, so every real session accumulates data on how
 * well the triggers work (report: .claude/scripts/skill-stats.sh).
 * Fail-open: telemetry must never break a hook.
 */

import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'fs';
import { join, dirname } from 'path';

const MAX_BYTES = 10 * 1024 * 1024;

export function metricsPath(): string {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';
    return join(projectDir, '.claude', 'hooks', 'state', 'metrics.jsonl');
}

export function recordMetric(event: Record<string, unknown>): void {
    try {
        const session = String(event.session ?? '');
        if (session.startsWith('bench-')) return;
        const path = metricsPath();
        const dir = dirname(path);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        if (existsSync(path) && statSync(path).size > MAX_BYTES) {
            renameSync(path, `${path}.1`);
        }
        appendFileSync(path, JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n');
    } catch {
        // fail-open
    }
}
