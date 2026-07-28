#!/usr/bin/env node
// Session Intelligence System - Background Worker (Embedding Only)
// Reads plan + context files from active task, embeds into vector DB.
// Args: taskDir, taskName
import { readFileSync, existsSync, readdirSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// Config
// ============================================================

const GLOBAL_TIMEOUT_MS = 30_000;
const LOG_DIR = join(__dirname, 'data');
const LOG_FILE = join(LOG_DIR, 'session-doc-worker.log');

function log(msg: string): void {
    const ts = new Date().toISOString();
    const line = `[${ts}] ${msg}\n`;
    try {
        if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
        appendFileSync(LOG_FILE, line);
    } catch {
        // ignore
    }
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
    const timer = setTimeout(() => {
        log('Global timeout reached - exiting');
        process.exit(0);
    }, GLOBAL_TIMEOUT_MS);

    try {
        const [taskDir, taskName] = process.argv.slice(2);

        if (!taskDir || !taskName) {
            log('Missing arguments (taskDir, taskName) - exiting');
            return;
        }

        log(`Starting embedding for task="${taskName}"`);

        // Read plan + context files (combined)
        const planFile = join(taskDir, `${taskName}-plan.md`);
        const contextFile = findContextFile(taskDir, taskName);

        let combined = '';
        if (existsSync(planFile)) {
            combined += readFileSync(planFile, 'utf-8');
            log(`Read plan: ${planFile}`);
        }
        if (contextFile && existsSync(contextFile)) {
            combined += '\n\n' + readFileSync(contextFile, 'utf-8');
            log(`Read context: ${contextFile}`);
        }

        if (!combined.trim()) {
            log('No content to embed - skipping');
            return;
        }

        log(`Combined content: ${combined.length} chars`);

        // Embed and store in vector DB
        const dbPath = join(__dirname, 'data', 'sessions.db');

        const { VectorStore } = await import('./lib/vector-store.js');
        const { createEmbeddingProvider } = await import('./lib/embeddings.js');

        const store = new VectorStore(dbPath);
        const provider = createEmbeddingProvider();

        const startTime = Date.now();
        const embedding = await provider.embed(combined.slice(0, 8000));
        const elapsed = Date.now() - startTime;

        store.upsertEmbedding(
            `devdoc:${taskName}`,
            'devdoc',
            'full_summary',
            combined.slice(0, 2000),
            embedding,
        );

        store.close();
        log(`Indexed devdoc:${taskName} (${combined.length} chars, embed ${elapsed}ms)`);
    } catch (err) {
        log(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        clearTimeout(timer);
    }
}

// ============================================================
// Helpers
// ============================================================

function findContextFile(taskDir: string, taskName: string): string | null {
    try {
        const files = readdirSync(taskDir);
        const contextFile = files.find((f) => f.toLowerCase().includes('context') && f.endsWith('.md'));
        if (contextFile) return join(taskDir, contextFile);
    } catch {
        // ignore
    }
    return join(taskDir, `${taskName}-context.md`);
}

main();
