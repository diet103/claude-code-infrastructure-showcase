#!/usr/bin/env node
// Session Intelligence System - Stop Hook (Plan Indexer)
// Checks if active task's plan/context files changed, spawns embedding worker.
// Must complete in <200ms.
import { readFileSync, existsSync, writeFileSync, mkdirSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// Config
// ============================================================

const STALE_PID_MS = 60_000;

// ============================================================
// Types
// ============================================================

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode?: string;
}

interface IndexState {
    lastHash: string;
    lastIndexedAt: number;
    workerPid?: number;
    workerStartedAt?: number;
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);
        const { session_id } = data;
        if (!session_id) return;

        // Check if vector DB exists (no point indexing if Phase 3 hasn't run yet)
        const dbPath = join(__dirname, 'data', 'sessions.db');
        if (!existsSync(dbPath)) return;

        // Find active task directory
        const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';
        const devActiveDir = join(projectDir, 'dev', 'active');
        if (!existsSync(devActiveDir)) return;

        const activeTask = findActiveTask(devActiveDir);
        if (!activeTask) return;

        // Load state
        const stateDir = join(__dirname, 'state');
        if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
        const stateFile = join(stateDir, `session-index-${activeTask.name}.json`);
        const state = loadState(stateFile);

        // Check if worker already running
        if (state.workerPid && state.workerStartedAt) {
            const elapsed = Date.now() - state.workerStartedAt;
            if (elapsed < STALE_PID_MS) {
                try {
                    process.kill(state.workerPid, 0);
                    return;
                } catch {
                    // PID gone, continue
                }
            }
        }

        // Hash current plan + context content
        const currentHash = hashTaskFiles(activeTask.dir, activeTask.name);
        if (currentHash === state.lastHash) return; // No change

        // Spawn embedding worker
        const workerPath = join(__dirname, 'session-doc-worker.ts');
        if (!existsSync(workerPath)) return;

        const child = spawn(
            'npx',
            ['tsx', workerPath, activeTask.dir, activeTask.name],
            {
                detached: true,
                stdio: 'ignore',
                cwd: __dirname,
                env: { ...process.env },
            },
        );
        child.unref();

        // Save state
        state.lastHash = currentHash;
        state.lastIndexedAt = Date.now();
        state.workerPid = child.pid;
        state.workerStartedAt = Date.now();
        saveState(stateFile, state);
    } catch {
        // Non-blocking
    }
}

// ============================================================
// Helpers
// ============================================================

function findActiveTask(devActiveDir: string): { dir: string; name: string } | null {
    try {
        const entries = readdirSync(devActiveDir);
        for (const entry of entries) {
            const fullPath = join(devActiveDir, entry);
            try {
                if (!statSync(fullPath).isDirectory()) continue;
                const files = readdirSync(fullPath);
                if (files.some((f) => f.endsWith('.md'))) {
                    return { dir: fullPath, name: entry };
                }
            } catch {
                continue;
            }
        }
    } catch {
        // ignore
    }
    return null;
}

function hashTaskFiles(taskDir: string, _taskName: string): string {
    const hash = createHash('md5');
    try {
        const files = readdirSync(taskDir).filter((f) => f.endsWith('.md')).sort();
        for (const file of files) {
            const content = readFileSync(join(taskDir, file), 'utf-8');
            hash.update(content);
        }
    } catch {
        // ignore
    }
    return hash.digest('hex');
}

function loadState(stateFile: string): IndexState {
    try {
        if (existsSync(stateFile)) {
            return JSON.parse(readFileSync(stateFile, 'utf-8'));
        }
    } catch {
        // ignore
    }
    return { lastHash: '', lastIndexedAt: 0 };
}

function saveState(stateFile: string, state: IndexState): void {
    try {
        writeFileSync(stateFile, JSON.stringify(state, null, 2));
    } catch {
        // ignore
    }
}

main();
