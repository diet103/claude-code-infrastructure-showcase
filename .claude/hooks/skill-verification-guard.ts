#!/usr/bin/env node
/**
 * PreToolUse Hook - Skill Verification Guard
 *
 * Runs BEFORE Edit/Write/MultiEdit tools to:
 * 1. Enforce mandatory skill activation (two-try blocking model)
 * 2. Analyze code being written with AI to suggest relevant skills
 * 3. Check guardrail file/content patterns from skill-rules.json
 *
 * Two-try blocking model:
 * - First edit attempt with pending mandatory skills: BLOCKED, skills cleared
 * - Second edit attempt: ALLOWED (mandatory_pending is now empty)
 */

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { minimatch } from 'minimatch';
import type { AIProvider } from './providers/ai-provider.js';
import { parseLLMJson } from './providers/parse-llm-json.js';
import { createProvider } from './providers/provider-factory.js';
import { loadSessionState, updateSessionState } from './lib/session-state.js';
import { recordMetric } from './lib/metrics.js';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode: string;
    hook_event_name: string;
    tool_name: string;
    tool_input: {
        file_path?: string;
        old_string?: string;
        new_string?: string;
        content?: string;
    };
}

interface FileTriggers {
    pathPatterns: string[];
    pathExclusions?: string[];
    contentPatterns?: string[];
    createOnly?: boolean;
}

interface SkillRule {
    type: 'guardrail' | 'domain';
    enforcement: 'block' | 'suggest' | 'warn';
    priority: string;
    fileTriggers?: FileTriggers;
    blockMessage?: string;
    skipConditions?: {
        sessionSkillUsed?: boolean;
        fileMarkers?: string[];
        envOverride?: string;
    };
    description?: string;
}

interface SkillRules {
    version: string;
    skills: Record<string, SkillRule>;
}

// ============================================================
// DEBUG & LOGGING
// ============================================================

const DEBUG = process.env.SKILL_GUARD_DEBUG === 'true';

function debug(message: string, data?: any) {
    if (DEBUG) {
        console.error(`[DEBUG] ${message}`);
        if (data !== undefined) {
            console.error(JSON.stringify(data, null, 2));
        }
    }
}

function logInvocation(projectDir: string, data: { action: string; [key: string]: any }) {
    try {
        const logFile = join(projectDir, '.claude', 'hooks', 'skill-guard.log');
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} | ${JSON.stringify(data)}\n`;
        appendFileSync(logFile, logEntry);
    } catch {
        // Fail silently
    }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function globMatch(filePath: string, pattern: string): boolean {
    return minimatch(filePath, pattern, { matchBase: true, dot: true });
}

/**
 * Get edit content from tool input based on tool type.
 */
function getEditContent(toolName: string, toolInput: HookInput['tool_input']): string {
    if (toolName === 'Edit' && toolInput.new_string) {
        return toolInput.new_string;
    }
    if (toolName === 'Write' && toolInput.content) {
        return toolInput.content;
    }
    if (toolName === 'MultiEdit' && (toolInput as any).edits) {
        const edits = (toolInput as any).edits as Array<{ new_string: string }>;
        return edits.map(e => e.new_string).join('\n');
    }
    return '';
}

/**
 * Determine if an edit is "high signal" and worth analyzing with AI.
 * Only generic patterns - no project-specific references.
 */
function isHighSignalEdit(content: string, filePath: string): boolean {
    if (!content || content.length < 10) return false;

    // Import statements
    if (/import\s+.*from\s+['"]/.test(content)) return true;

    // Function/class definitions
    if (/(export\s+)?(async\s+)?function\s+\w+/.test(content)) return true;
    if (/(export\s+)?class\s+\w+/.test(content)) return true;
    if (/=>\s*\{/.test(content)) return true;

    // Database operations (Prisma)
    if (/prisma\.\w+\.(find|create|update|delete|upsert)/.test(content)) return true;
    if (/PrismaService/.test(content)) return true;

    // React/TSX patterns
    if (/<\w+[\s/>]/.test(content) && (filePath.endsWith('.tsx') || filePath.endsWith('.jsx'))) return true;
    if (/use[A-Z]\w+\(/.test(content)) return true;

    // Router methods
    if (/router\.(get|post|put|delete|patch)\(/.test(content)) return true;
    if (/@route|express\.Router|Router\(\)/.test(content)) return true;

    // Sentry patterns
    if (/Sentry\.|captureException|captureMessage/.test(content)) return true;

    // TanStack Router/Query
    if (/createRoute|createFileRoute|useNavigate|useParams/.test(content)) return true;
    if (/useQuery|useMutation|useSuspenseQuery/.test(content)) return true;

    // Substantial size (not just typo fixes)
    if (content.length > 150) return true;

    return false;
}

/**
 * Generate classification prompt for edit analysis.
 */
function generateClassificationPrompt(rules: SkillRules, filePath: string, editContent: string): string {
    const skillList = Object.entries(rules.skills)
        .filter(([_, config]) => config.description)
        .map(([skillName, config]) => `- "${skillName}" - ${config.description}`)
        .join('\n');

    return `You are analyzing CODE CONTENT being edited.

FILE: ${filePath}
EDIT CONTENT (what's being written):
\`\`\`
${editContent}
\`\`\`

Based on the code being written, identify which skills are relevant.
You MUST use these EXACT skill names (no other names allowed):

${skillList}

CRITICAL RULES:
- Use the EXACT skill names above (in quotes)
- Maximum 2 skills (the most relevant)
- If code is generic or unclear: {"skills": []}
- Return ONLY valid JSON, no markdown, no explanation

Example responses:
{"skills": ["frontend-dev-guidelines"]}
{"skills": ["backend-dev-guidelines"]}
{"skills": []}

Return JSON now:`;
}

/**
 * Analyze edit content with AI provider to suggest relevant skills.
 */
async function analyzeEditWithAI(
    provider: AIProvider,
    filePath: string,
    editContent: string,
    rules: SkillRules
): Promise<string[]> {
    const prompt = generateClassificationPrompt(
        rules,
        filePath,
        editContent.substring(0, 1000)
    );

    try {
        const text = await provider.analyzeEdit(prompt);
        debug(`AI response (${provider.name})`, { text: text.substring(0, 200) });

        const result = parseLLMJson(text);
        if (result && Array.isArray(result.skills)) {
            return result.skills.filter((s: unknown) =>
                typeof s === 'string' && rules.skills[s as string]
            );
        }

        return [];
    } catch (error) {
        debug(`AI error (${provider.name})`, { error: String(error) });
        return [];
    }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';

    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        debug('Hook input received', {
            tool_name: data.tool_name,
            file_path: data.tool_input.file_path,
            session_id: data.session_id,
        });

        const { tool_name, tool_input, session_id } = data;

        // Only intercept Edit/Write/MultiEdit tools
        if (!['Edit', 'Write', 'MultiEdit'].includes(tool_name)) {
            debug('Tool not monitored, allowing', { tool_name });
            process.exit(0);
        }

        const filePath = tool_input.file_path;
        if (!filePath) {
            debug('No file path, allowing');
            process.exit(0);
        }

        // Normalize file path
        const normalizedPath = filePath.startsWith(projectDir)
            ? filePath.substring(projectDir.length + 1)
            : filePath;

        debug('Path normalization', { original: filePath, normalized: normalizedPath });

        // Load rules
        const rulesPath = join(projectDir, '.claude', 'skills', 'skill-rules.json');
        const rules: SkillRules = JSON.parse(readFileSync(rulesPath, 'utf-8'));

        // Session state
        const sessionState = loadSessionState(session_id);
        debug('Session state loaded', sessionState);

        // ============================================================
        // MANDATORY SKILL ENFORCEMENT (two-try blocking model)
        // ============================================================
        const mandatoryPending = sessionState.mandatory_pending || [];
        if (mandatoryPending.length > 0) {
            if (process.env.SKIP_MANDATORY_SKILLS !== 'true') {
                const skillList = mandatoryPending.map(s => `  → ${s}`).join('\n');

                console.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ BLOCKED - Mandatory Skills Not Activated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You must first use the Skill tool to activate:
${skillList}

After activating these skills, retry your edit.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

                // Two-try model: clear pending so next attempt passes
                updateSessionState(session_id, state => {
                    state.skills_used = [...new Set([...state.skills_used, ...mandatoryPending])];
                    state.mandatory_pending = state.mandatory_pending.filter(s => !mandatoryPending.includes(s));
                });

                logInvocation(projectDir, {
                    action: 'blocked',
                    reason: 'mandatory_skills_not_activated',
                    pendingSkills: mandatoryPending,
                    file: normalizedPath,
                    tool: tool_name,
                });
                recordMetric({ event: 'blocked', session: session_id, skills: mandatoryPending, kind: 'mandatory', file: normalizedPath });

                process.exit(2);
            } else {
                debug('Skipping mandatory skill check - SKIP_MANDATORY_SKILLS=true');
            }
        }

        // ============================================================
        // AI-POWERED SKILL SUGGESTION
        // ============================================================
        if (process.env.SKIP_PRETOOLUSE_AI !== 'true') {
            const editContent = getEditContent(tool_name, tool_input);
            const filesAnalyzed = sessionState.files_analyzed_by_ai || [];

            // Cheap gates first: only pay for provider initialization when
            // this edit will actually be analyzed
            if (!isHighSignalEdit(editContent, normalizedPath)) {
                debug('Low signal edit, skipping AI analysis');
            } else if (filesAnalyzed.includes(normalizedPath)) {
                debug('File already analyzed by AI in this session, skipping');
            } else {
                debug('High signal edit detected, analyzing with AI');
                const provider = await createProvider();

                if (provider) {
                    const aiSuggestions = await analyzeEditWithAI(provider, normalizedPath, editContent, rules);

                    if (aiSuggestions.length > 0) {
                        const alreadySuggested = new Set([
                            ...sessionState.skills_used,
                            ...(sessionState.ai_suggested_skills || []),
                        ]);

                        const newSuggestions = aiSuggestions.filter(s => !alreadySuggested.has(s));

                        if (newSuggestions.length > 0) {
                            const SOFT_BLOCK = process.env.PRETOOLUSE_SOFT_BLOCK === 'true';
                            const skillList = newSuggestions.map(s => `  → ${s}`).join('\n');

                            updateSessionState(session_id, state => {
                                if (SOFT_BLOCK) {
                                    state.pretooluse_pending = newSuggestions;
                                }
                                state.ai_suggested_skills = [
                                    ...new Set([...state.ai_suggested_skills, ...newSuggestions]),
                                ];
                                state.files_analyzed_by_ai = [
                                    ...new Set([...state.files_analyzed_by_ai, normalizedPath]),
                                ];
                            });

                            if (SOFT_BLOCK) {
                                console.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ SOFT BLOCK - Skills Recommended
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on your code changes, consider activating:
${skillList}

Use Skill tool to activate, then retry your edit.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

                                logInvocation(projectDir, {
                                    action: 'soft_blocked',
                                    reason: 'pretooluse_ai_suggestion',
                                    suggestedSkills: newSuggestions,
                                    file: normalizedPath,
                                    tool: tool_name,
                                });
                                recordMetric({ event: 'blocked', session: session_id, skills: newSuggestions, kind: 'ai-soft', file: normalizedPath });

                                process.exit(2);
                            } else {
                                console.error(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 SKILL SUGGESTION (based on code analysis)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on the code you're writing, consider:
${skillList}

Use Skill tool to activate if helpful.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

                                logInvocation(projectDir, {
                                    action: 'suggested',
                                    reason: 'pretooluse_ai_suggestion',
                                    suggestedSkills: newSuggestions,
                                    file: normalizedPath,
                                    tool: tool_name,
                                });
                            }
                        }
                    }
                }
            }
        }

        // ============================================================
        // GUARDRAIL CHECKS (file/content pattern matching)
        // ============================================================
        for (const [skillName, config] of Object.entries(rules.skills)) {
            if (config.type !== 'guardrail') continue;

            debug(`Checking guardrail: ${skillName}`);

            // Skip if already used in session
            if (config.skipConditions?.sessionSkillUsed && sessionState.skills_used.includes(skillName)) {
                debug(`Skipping ${skillName} - already used in session`);
                continue;
            }

            // Check environment override
            if (config.skipConditions?.envOverride && process.env[config.skipConditions.envOverride]) {
                debug(`Skipping ${skillName} - environment override set`);
                continue;
            }

            const fileTriggers = config.fileTriggers;
            if (!fileTriggers) continue;

            // Check path patterns
            let pathMatch = false;
            for (const pattern of fileTriggers.pathPatterns) {
                if (globMatch(normalizedPath, pattern) || globMatch(filePath, pattern)) {
                    pathMatch = true;
                    break;
                }
            }

            if (!pathMatch) continue;

            // Check exclusions
            if (fileTriggers.pathExclusions) {
                let excluded = false;
                for (const pattern of fileTriggers.pathExclusions) {
                    if (globMatch(normalizedPath, pattern) || globMatch(filePath, pattern)) {
                        excluded = true;
                        break;
                    }
                }
                if (excluded) continue;
            }

            // Check file markers
            if (config.skipConditions?.fileMarkers && existsSync(filePath)) {
                const fileContent = readFileSync(filePath, 'utf-8');
                const hasMarker = config.skipConditions.fileMarkers.some(marker =>
                    fileContent.includes(marker)
                );
                if (hasMarker) continue;
            }

            // Content pattern matching
            let contentMatch = false;
            if (fileTriggers.contentPatterns) {
                let contentToCheck = getEditContent(tool_name, tool_input);

                if (!contentToCheck && existsSync(filePath)) {
                    contentToCheck = readFileSync(filePath, 'utf-8');
                }

                if (contentToCheck) {
                    for (const pattern of fileTriggers.contentPatterns) {
                        const regex = new RegExp(pattern, 'i');
                        if (regex.test(contentToCheck)) {
                            contentMatch = true;
                            break;
                        }
                    }
                }
            }

            // Trigger decision
            const shouldTrigger = pathMatch && (contentMatch || !fileTriggers.contentPatterns);

            if (shouldTrigger) {
                // Mark as handled so the sessionSkillUsed skip applies on the next edit
                if (!sessionState.skills_used.includes(skillName)) {
                    sessionState.skills_used.push(skillName);
                    updateSessionState(session_id, state => {
                        state.skills_used = [...new Set([...state.skills_used, skillName])];
                    });
                }

                if (config.enforcement === 'block') {
                    const message = config.blockMessage?.replace('{file_path}', normalizedPath) ||
                        `⚠️ BLOCKED - ${skillName} required`;

                    logInvocation(projectDir, {
                        action: 'blocked',
                        skillName,
                        file: normalizedPath,
                        tool: tool_name,
                        reason: contentMatch ? 'path+content' : 'path-only',
                    });
                    recordMetric({ event: 'blocked', session: session_id, skills: [skillName], kind: 'guardrail', file: normalizedPath });

                    console.error(message);
                    process.exit(2);
                }

                // enforcement: suggest/warn guardrails advise without blocking
                logInvocation(projectDir, {
                    action: 'advised',
                    skillName,
                    file: normalizedPath,
                    tool: tool_name,
                    reason: contentMatch ? 'path+content' : 'path-only',
                });

                console.error(`💡 Consider activating skill "${skillName}" for this file (${normalizedPath})`);
            }
        }

        // All checks passed
        logInvocation(projectDir, {
            action: 'allowed',
            file: normalizedPath,
            tool: tool_name,
            reason: 'no guardrails triggered',
        });

        debug('All checks passed, allowing operation');
        process.exit(0);
    } catch (err) {
        console.error('Error in skill-verification-guard hook:', err);
        logInvocation(projectDir, { action: 'error', error: String(err) });
        process.exit(0); // Fail open
    }
}

main().catch(err => {
    console.error('Uncaught error:', err);
    process.exit(0);
});
