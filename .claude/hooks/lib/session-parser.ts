// Session Intelligence System - JSONL + Dev-Doc Parser
import { createReadStream, readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import * as readline from 'node:readline/promises';
import type {
    SessionEntry,
    UserEntry,
    AssistantEntry,
    AssistantContentPart,
    ContentChunk,
    DevDocInfo,
} from './types.js';

// ============================================================
// JSONL Parsing
// ============================================================

export async function parseSessionFile(
    filePath: string,
    opts?: { fromLine?: number; maxLines?: number },
): Promise<SessionEntry[]> {
    const entries: SessionEntry[] = [];
    const fromLine = opts?.fromLine ?? 0;
    const maxLines = opts?.maxLines ?? Infinity;

    let lineNum = 0;
    let parsed = 0;

    const rl = readline.createInterface({
        input: createReadStream(filePath, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
    });

    for await (const line of rl) {
        lineNum++;
        if (lineNum <= fromLine) continue;
        if (parsed >= maxLines) break;

        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
            const entry = JSON.parse(trimmed) as SessionEntry;
            if (entry && typeof entry === 'object' && 'type' in entry) {
                entries.push(entry);
                parsed++;
            }
        } catch {
            // Skip malformed lines
        }
    }

    return entries;
}

// ============================================================
// Text Extraction
// ============================================================

export function extractTextFromContent(
    content: string | AssistantContentPart[],
): string {
    if (typeof content === 'string') {
        return content.replace(/<[^>]+>/g, '').trim();
    }

    if (!Array.isArray(content)) return '';

    const parts: string[] = [];
    for (const part of content) {
        if (part.type === 'text' && part.text) {
            parts.push(part.text.replace(/<[^>]+>/g, '').trim());
        }
    }
    return parts.join('\n');
}

// ============================================================
// Data Extraction Functions
// ============================================================

export function extractUserPrompts(entries: SessionEntry[]): string[] {
    return entries
        .filter((e): e is UserEntry => e.type === 'user')
        .map((e) => {
            const text = typeof e.message.content === 'string'
                ? e.message.content
                : '';
            return text.trim();
        })
        .filter((t) => t.length > 0 && !t.startsWith('/'));
}

export function extractFilesEdited(entries: SessionEntry[]): string[] {
    const files = new Set<string>();

    for (const entry of entries) {
        if (entry.type !== 'assistant') continue;
        const assistantEntry = entry as AssistantEntry;
        if (!Array.isArray(assistantEntry.message?.content)) continue;

        for (const part of assistantEntry.message.content) {
            if (part.type === 'tool_use' && part.input) {
                const input = part.input as Record<string, unknown>;
                if (
                    ['Edit', 'Write', 'MultiEdit'].includes(part.name || '') &&
                    typeof input.file_path === 'string'
                ) {
                    files.add(input.file_path);
                }
            }
        }
    }

    return Array.from(files);
}

export function extractToolUsage(entries: SessionEntry[]): Record<string, number> {
    const tools: Record<string, number> = {};

    for (const entry of entries) {
        if (entry.type !== 'assistant') continue;
        const assistantEntry = entry as AssistantEntry;
        if (!Array.isArray(assistantEntry.message?.content)) continue;

        for (const part of assistantEntry.message.content) {
            if (part.type === 'tool_use' && part.name) {
                tools[part.name] = (tools[part.name] || 0) + 1;
            }
        }
    }

    return tools;
}

// ============================================================
// Content Chunk Generation
// ============================================================

export function generateContentChunks(entries: SessionEntry[]): ContentChunk[] {
    const chunks: ContentChunk[] = [];

    // Chunk 1: User prompts summary
    const prompts = extractUserPrompts(entries);
    if (prompts.length > 0) {
        const promptText = prompts
            .slice(0, 20)
            .map((p) => p.slice(0, 200))
            .join('\n');
        chunks.push({ chunkType: 'prompts', text: promptText });
    }

    // Chunk 2: Files edited
    const files = extractFilesEdited(entries);
    if (files.length > 0) {
        chunks.push({
            chunkType: 'files',
            text: `Files edited: ${files.join(', ')}`,
        });
    }

    // Chunk 3: Combined summary
    const tools = extractToolUsage(entries);
    const toolSummary = Object.entries(tools)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => `${name}(${count})`)
        .join(', ');

    const summaryParts = [
        `Session with ${prompts.length} user prompts.`,
        files.length > 0 ? `Edited ${files.length} files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}` : '',
        toolSummary ? `Tools: ${toolSummary}` : '',
        prompts.length > 0 ? `Topics: ${prompts.slice(0, 3).map((p) => p.slice(0, 80)).join(' | ')}` : '',
    ].filter(Boolean);

    chunks.push({ chunkType: 'summary', text: summaryParts.join('\n') });

    return chunks;
}

// ============================================================
// Dev Doc Parsing
// ============================================================

export function parseDevDoc(dirPath: string): DevDocInfo | null {
    if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) return null;

    const taskName = basename(dirPath);
    const parts: string[] = [];
    let planContent: string | undefined;
    let contextContent: string | undefined;
    let tasksContent: string | undefined;

    const files = readdirSync(dirPath).filter((f) => f.endsWith('.md'));

    for (const file of files) {
        const filePath = join(dirPath, file);
        try {
            const content = readFileSync(filePath, 'utf-8');
            parts.push(`## ${file}\n${content}`);

            const lower = file.toLowerCase();
            if (lower.includes('plan')) planContent = content;
            if (lower.includes('context')) contextContent = content;
            if (lower.includes('task')) tasksContent = content;
        } catch {
            // Skip unreadable files
        }
    }

    if (parts.length === 0) return null;

    const isActive = dirPath.includes('/active/');

    return {
        taskName,
        dirPath,
        planContent,
        contextContent,
        tasksContent,
        combinedText: parts.join('\n\n'),
        isActive,
    };
}

export function scanDevDocs(devDir: string): DevDocInfo[] {
    const docs: DevDocInfo[] = [];

    if (!existsSync(devDir)) return docs;

    function scanDir(dir: string): void {
        let entries: string[];
        try {
            entries = readdirSync(dir);
        } catch {
            return;
        }

        // Check if this directory itself has markdown files
        const hasMd = entries.some((e) => e.endsWith('.md'));
        if (hasMd) {
            const doc = parseDevDoc(dir);
            if (doc) docs.push(doc);
        }

        // Recurse into subdirectories (but not too deep)
        const depth = dir.replace(devDir, '').split('/').filter(Boolean).length;
        if (depth < 3) {
            for (const entry of entries) {
                const fullPath = join(dir, entry);
                try {
                    if (statSync(fullPath).isDirectory() && entry !== 'node_modules' && !entry.startsWith('.')) {
                        scanDir(fullPath);
                    }
                } catch {
                    // Skip
                }
            }
        }
    }

    scanDir(devDir);
    return docs;
}
