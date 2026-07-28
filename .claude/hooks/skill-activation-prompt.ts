#!/usr/bin/env node
/**
 * UserPromptSubmit Hook - Skill Activation + Session Intelligence
 *
 * Analyzes user prompts to suggest relevant skills using either:
 * - AI classification (multi-provider: Gemini, OpenAI, Anthropic, MiniMax, Ollama)
 * - Regex/keyword fallback (always available, zero cost)
 *
 * Session Intelligence (requires GEMINI_API_KEY):
 * - Vector search over dev docs for relevant past context
 * - Dev-doc update reminders (turn-based)
 * - Detailed observability via stderr + activity log
 *
 * Activation modes (configured in skill-rules.json settings):
 * - "disabled" (DEFAULT): Regex-only, zero behavior change from v1.0
 * - "fallback": AI first, silent fallback to regex on failure
 * - "ai-only": AI only, no fallback, silent on failure
 *
 * Conservativeness levels: strict | balanced | aggressive
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, statSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { AIProvider } from './providers/ai-provider.js';
import { EMPTY_CLASSIFICATION } from './providers/ai-provider.js';
import { parseLLMJson } from './providers/parse-llm-json.js';
import { createProvider } from './providers/provider-factory.js';
import { loadSessionState, updateSessionState } from './lib/session-state.js';
import { recordMetric } from './lib/metrics.js';

// Session intelligence imports (graceful - won't crash if lib/ missing)
let VectorStore: typeof import('./lib/vector-store.js').VectorStore | null = null;
let createEmbeddingProvider: typeof import('./lib/embeddings.js').createEmbeddingProvider | null = null;
let generateSearchTerms: typeof import('./lib/gemini-client.js').generateSearchTerms | null = null;
let assessRelevance: typeof import('./lib/gemini-client.js').assessRelevance | null = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load session intelligence libraries
try {
    const vectorMod = await import('./lib/vector-store.js');
    const embedMod = await import('./lib/embeddings.js');
    const geminiMod = await import('./lib/gemini-client.js');
    VectorStore = vectorMod.VectorStore;
    createEmbeddingProvider = embedMod.createEmbeddingProvider;
    generateSearchTerms = geminiMod.generateSearchTerms;
    assessRelevance = geminiMod.assessRelevance;
} catch {
    // Session intelligence libraries not available - vector search disabled
}

// ============================================================
// TYPE DEFINITIONS
// ============================================================

type ConservativenessLevel = 'strict' | 'balanced' | 'aggressive';
type ActivationMode = 'disabled' | 'fallback' | 'ai-only';
type SearchQuality = 'fast' | 'moderate' | 'quality';

interface SkillRulesSettings {
    skill_activation_mode?: ActivationMode;
    conservativeness?: ConservativenessLevel;
    ai_can_arm_blocks?: boolean;
}

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode: string;
    prompt: string;
}

interface PromptTriggers {
    keywords?: string[];
    intentPatterns?: string[];
}

interface SkillRule {
    type: 'guardrail' | 'domain';
    enforcement: 'block' | 'suggest' | 'warn';
    priority: 'critical' | 'high' | 'medium' | 'low';
    promptTriggers?: PromptTriggers;
    description?: string;
}

interface SkillRules {
    version: string;
    settings?: SkillRulesSettings;
    skills: Record<string, SkillRule>;
}

interface MatchedSkill {
    name: string;
    matchType: 'keyword' | 'intent';
    config: SkillRule;
}

interface ClassificationResult {
    mandatory: string[];
    recommended: string[];
}

interface VectorSearchResult {
    sessionId: string;
    sourceType: 'session' | 'devdoc';
    chunkType: string;
    chunkText: string;
    score: number;
}

interface RelevanceAssessment {
    relevant: boolean;
    score: number;
    keyFiles: string[];
    keyDecisions: string[];
    condensedContext: string;
}

interface DocUpdateState {
    sessionId: string;
    lastUpdateTime: number;
    lastUpdateTurn: number;
    turnCount: number;
}

interface SessionIntelData {
    ts: string;
    session: string;
    skills: {
        mandatory: string[];
        recommended: string[];
        source: string;
        ms: number;
    };
    search: {
        quality: string;
        hits: number;
        top: Array<{ id: string; score: number }>;
        relevant: boolean | null;
        ms: number;
    } | null;
    reminder: string;
}

// ============================================================
// CONSERVATIVENESS LEVEL FUNCTIONS
// ============================================================

function getConservativenessLevel(settings?: SkillRulesSettings): ConservativenessLevel {
    const envLevel = process.env.SKILL_CONSERVATIVENESS;
    if (envLevel && ['strict', 'balanced', 'aggressive'].includes(envLevel)) {
        return envLevel as ConservativenessLevel;
    }
    return settings?.conservativeness || 'balanced';
}

function getConservativenessInstructions(level: ConservativenessLevel): string {
    switch (level) {
        case 'strict':
            return `
CONSERVATIVENESS: STRICT (minimize false positives)

MANDATORY criteria (ALL must be true):
- User explicitly states CREATE or MODIFY code in this domain
- Action verb matches domain (e.g., "create component" for frontend)
- Domain is PRIMARY focus, not secondary context
- If ANY doubt exists, do NOT make it mandatory

RECOMMENDED criteria:
- Domain clearly mentioned but not primary task
- If any doubt, use RECOMMENDED not MANDATORY

STRICT EXAMPLES:
- "create a React component" -> frontend-dev-guidelines MANDATORY
- "fix the workflow" -> RECOMMENDED only (could be data fix, not code)
- "add error handling" -> RECOMMENDED only (could be any service)`;

        case 'aggressive':
            return `
CONSERVATIVENESS: AGGRESSIVE (catch everything)

MANDATORY criteria (ANY can trigger):
- Domain mentioned AND code in that area may be touched
- Task involves area even tangentially
- User might need skill context even if not primary focus

RECOMMENDED criteria:
- Domain tangentially mentioned
- Related systems that might be affected

AGGRESSIVE EXAMPLES:
- "update the form" -> form skill MANDATORY, backend MANDATORY, frontend MANDATORY
- "fix the workflow" -> workflow skill MANDATORY, backend MANDATORY
- "component that might need database" -> frontend MANDATORY, database MANDATORY`;

        case 'balanced':
        default:
            return `
CONSERVATIVENESS: BALANCED (default behavior)

MANDATORY = User is DIRECTLY creating/modifying code in this domain
RECOMMENDED = Domain mentioned for context/reference but not primary work

BALANCED EXAMPLES:
- "create a React component" -> frontend-dev-guidelines MANDATORY
- "add an Express route" -> backend-dev-guidelines MANDATORY
- "component showing workflow info" -> frontend MANDATORY, workflow RECOMMENDED
- "route that queries the database" -> backend MANDATORY, database RECOMMENDED`;
    }
}

// ============================================================
// CLASSIFICATION FUNCTIONS
// ============================================================

function generatePromptClassificationPrompt(
    rules: SkillRules,
    userPrompt: string,
    conservativeness: ConservativenessLevel = 'balanced'
): string {
    const skillList = Object.entries(rules.skills)
        .filter(([_, config]) => config.description)
        .map(([skillName, config]) => `- "${skillName}" - ${config.description}`)
        .join('\n');

    const conservativenessInstructions = getConservativenessInstructions(conservativeness);

    return `You are a skill classifier for a software project.
Your job is to identify which skills are needed based on the conservativeness level below.

SKILLS (use exact names):
${skillList}

USER PROMPT: "${userPrompt}"

${conservativenessInstructions}

GENERAL RULES:
- Don't add skills just because a word appears - consider actual intent
- Consider the primary action the user wants to perform

LIMITS:
- Maximum 1-2 MANDATORY skills (the primary domains being worked on)
- Maximum 2-3 RECOMMENDED skills (supporting context)
- Empty arrays are fine: {"mandatory": [], "recommended": []}

Return ONLY valid JSON:
{"mandatory": ["exact-skill-name"], "recommended": ["exact-skill-name"]}`;
}

async function classifyWithAI(
    provider: AIProvider,
    prompt: string,
    rules: SkillRules,
    conservativeness: ConservativenessLevel = 'balanced'
): Promise<ClassificationResult> {
    const classificationPrompt = generatePromptClassificationPrompt(rules, prompt, conservativeness);

    try {
        const text = await provider.classifyPrompt(classificationPrompt);

        if (process.env.DEBUG_SKILLS === '1') {
            console.error(`[${provider.name}] Raw response:`, text.substring(0, 500));
        }

        const result = parseLLMJson(text);
        if (result && typeof result === 'object') {
            const mandatory = Array.isArray(result.mandatory)
                ? result.mandatory.filter((s: unknown) => typeof s === 'string')
                : [];
            const recommended = Array.isArray(result.recommended)
                ? result.recommended.filter((s: unknown) => typeof s === 'string')
                : [];
            return { mandatory, recommended };
        }

        return EMPTY_CLASSIFICATION;
    } catch (error) {
        if (process.env.DEBUG_SKILLS === '1') {
            console.error(`[${provider.name}] Classification error:`, error);
        }
        return EMPTY_CLASSIFICATION;
    }
}

// ============================================================
// FALLBACK KEYWORD MATCHING
// ============================================================

function fallbackKeywordMatch(prompt: string, rules: SkillRules): MatchedSkill[] {
    const matchedSkills: MatchedSkill[] = [];
    const lowerPrompt = prompt.toLowerCase();

    for (const [skillName, config] of Object.entries(rules.skills)) {
        const triggers = config.promptTriggers;
        if (!triggers) continue;

        if (triggers.intentPatterns) {
            const intentMatch = triggers.intentPatterns.some(pattern => {
                const regex = new RegExp(pattern, 'i');
                return regex.test(prompt);
            });
            if (intentMatch) {
                matchedSkills.push({ name: skillName, matchType: 'intent', config });
                continue;
            }
        }

        if (triggers.keywords) {
            const keywordMatch = triggers.keywords.some(kw =>
                lowerPrompt.includes(kw.toLowerCase())
            );
            if (keywordMatch) {
                matchedSkills.push({ name: skillName, matchType: 'keyword', config });
            }
        }
    }

    return matchedSkills;
}

function fallbackToClassificationResult(matched: MatchedSkill[]): ClassificationResult {
    // Only enforcement: "block" skills may demand mandatory activation (and be
    // enforced by the PreToolUse guard); suggest/warn skills stay advisory no
    // matter how strong the trigger match is.
    const mandatory = matched
        .filter(s => s.matchType === 'intent' && s.config.enforcement === 'block')
        .map(s => s.name);
    const recommended = matched
        .filter(s => !(s.matchType === 'intent' && s.config.enforcement === 'block'))
        .map(s => s.name);
    return { mandatory, recommended };
}

function enforceMandatoryEligibility(result: ClassificationResult, rules: SkillRules): ClassificationResult {
    // AI classification is suggest-only by default: on real-world prompts it
    // over-triggers (~1/3 of off-topic prompts in the 2026-07 held-out
    // benchmark), so letting it arm hard blocks means wrong blocks. Opt in
    // via settings.ai_can_arm_blocks if you want AI-armed enforcement.
    const aiCanArmBlocks = rules.settings?.ai_can_arm_blocks === true;
    const mandatory = aiCanArmBlocks
        ? result.mandatory.filter(s => rules.skills[s]?.enforcement === 'block')
        : [];
    const demoted = result.mandatory.filter(s => rules.skills[s] && !mandatory.includes(s));
    const recommended = [...new Set([...demoted, ...result.recommended.filter(s => rules.skills[s])])];
    return { mandatory, recommended };
}

// ============================================================
// OUTPUT FORMATTING
// ============================================================

function generateTieredOutput(
    mandatory: string[],
    recommended: string[],
    source: string = 'LLM'
): string {
    let output = '';

    if (mandatory.length > 0) {
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        output += '⛔ MANDATORY SKILL ACTIVATION REQUIRED\n';
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        output += 'You MUST activate these skills BEFORE any action:\n';
        mandatory.forEach(s => output += `  → ${s}\n`);
        output += '\n';

        if (recommended.length > 0) {
            output += '📚 RECOMMENDED SKILLS:\n';
            recommended.forEach(s => output += `  → ${s}\n`);
            output += '\n';
        }

        output += '⚠️ EDITS WILL BE BLOCKED until mandatory skills are activated.\n';
        output += 'Your FIRST action must be: Skill tool calls.\n';
        output += `[via ${source}]\n`;
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    } else if (recommended.length > 0) {
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        output += '🎯 SKILL ACTIVATION CHECK\n';
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        output += '📚 RECOMMENDED SKILLS:\n';
        recommended.forEach(s => output += `  → ${s}\n`);
        output += '\n';
        output += 'ACTION: Use Skill tool BEFORE responding\n';
        output += `[via ${source}]\n`;
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    }

    return output;
}

// ============================================================
// SESSION INTELLIGENCE - VECTOR SEARCH
// ============================================================

async function searchRelevantSessions(
    prompt: string,
    quality: SearchQuality = 'quality',
): Promise<{ results: VectorSearchResult[]; assessment: RelevanceAssessment | null } | null> {
    if (!VectorStore || !createEmbeddingProvider) return null;

    const dbPath = join(
        process.env.CLAUDE_PROJECT_DIR || '.',
        '.claude', 'hooks', 'data', 'sessions.db',
    );

    if (!existsSync(dbPath)) return null;

    const store = new VectorStore(dbPath);
    try {
        const provider = createEmbeddingProvider();
        let allResults: VectorSearchResult[] = [];

        if (quality === 'fast') {
            const embedding = await provider.embed(prompt);
            allResults = store.search(embedding, { limit: 5, minScore: 0.3, sourceType: 'devdoc' });
            return allResults.length > 0 ? { results: allResults, assessment: null } : null;
        }

        if (quality === 'moderate') {
            const embedding = await provider.embed(prompt);
            allResults = store.search(embedding, { limit: 8, minScore: 0.25, sourceType: 'devdoc' });
            if (allResults.length === 0) return null;
            const assessment = assessRelevance ? await assessRelevance(prompt, allResults.slice(0, 5)) : null;
            return { results: allResults, assessment };
        }

        // Quality: full pipeline
        const [promptEmbedding, searchTerms] = await Promise.all([
            provider.embed(prompt),
            generateSearchTerms ? generateSearchTerms(prompt) : Promise.resolve([]),
        ]);

        // Search with prompt embedding
        const seenIds = new Set<string>();
        const promptResults = store.search(promptEmbedding, { limit: 5, minScore: 0.25, sourceType: 'devdoc' });
        for (const r of promptResults) {
            seenIds.add(r.sessionId);
            allResults.push(r);
        }

        // Search with each generated search term
        for (const term of searchTerms.slice(0, 3)) {
            const termEmbedding = await provider.embed(term);
            const termResults = store.search(termEmbedding, { limit: 3, minScore: 0.3, sourceType: 'devdoc' });
            for (const r of termResults) {
                if (!seenIds.has(r.sessionId)) {
                    seenIds.add(r.sessionId);
                    allResults.push(r);
                }
            }
        }

        if (allResults.length === 0) return null;

        // Sort by score, take top results, assess relevance
        allResults.sort((a, b) => b.score - a.score);
        allResults = allResults.slice(0, 8);

        const assessment = assessRelevance ? await assessRelevance(prompt, allResults.slice(0, 5)) : null;
        return { results: allResults, assessment };
    } finally {
        store.close();
    }
}

function formatSearchResults(
    searchResult: { results: VectorSearchResult[]; assessment: RelevanceAssessment | null },
    quality: SearchQuality,
): string {
    const { results, assessment } = searchResult;

    // If Gemini assessed as not relevant, skip
    if (assessment && !assessment.relevant) return '';

    let output = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    output += 'RELEVANT PAST CONTEXT\n';
    output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    if (assessment?.condensedContext) {
        output += `${assessment.condensedContext}\n\n`;
        if (assessment.keyFiles?.length > 0) {
            output += 'Key files: ' + assessment.keyFiles.join(', ') + '\n';
        }
        if (assessment.keyDecisions?.length > 0) {
            output += 'Key decisions:\n';
            assessment.keyDecisions.forEach(d => output += `  - ${d}\n`);
        }
    } else {
        // No assessment (fast mode) - show raw results
        const topResults = results.slice(0, 3);
        topResults.forEach(r => {
            const title = r.sessionId.replace('devdoc:', '');
            output += `${title} (score: ${r.score.toFixed(2)})\n`;
            output += `  ${r.chunkText.slice(0, 200).replace(/\n/g, ' ')}\n\n`;
        });
    }

    output += `[session-intelligence/${quality}]\n`;
    output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    return output;
}

// ============================================================
// DEV-DOC UPDATE REMINDERS
// ============================================================

const DOC_UPDATE_TURNS_THRESHOLD = parseInt(process.env.DOC_UPDATE_TURNS || '2', 10);
const DOC_UPDATE_TIME_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

function checkDevDocUpdateDue(sessionId: string): string | null {
    try {
        const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';
        const stateFile = join(projectDir, '.claude', 'hooks', 'state', `session-doc-${sessionId}.json`);

        let state: DocUpdateState = { sessionId, lastUpdateTime: 0, lastUpdateTurn: 0, turnCount: 0 };
        if (existsSync(stateFile)) {
            try {
                state = { ...state, ...JSON.parse(readFileSync(stateFile, 'utf-8')) };
            } catch {
                // use defaults
            }
        }

        // Increment turn counter
        state.turnCount = (state.turnCount || 0) + 1;

        const isFirstUpdate = state.lastUpdateTime === 0;
        const turnsSinceUpdate = state.turnCount - state.lastUpdateTurn;
        const timeSinceUpdate = Date.now() - state.lastUpdateTime;

        const isDue = isFirstUpdate
            || turnsSinceUpdate >= DOC_UPDATE_TURNS_THRESHOLD
            || timeSinceUpdate >= DOC_UPDATE_TIME_THRESHOLD_MS;

        if (!isDue) {
            try { writeFileSync(stateFile, JSON.stringify(state, null, 2)); } catch {}
            return null;
        }

        // Update state
        state.lastUpdateTime = Date.now();
        state.lastUpdateTurn = state.turnCount;
        try { writeFileSync(stateFile, JSON.stringify(state, null, 2)); } catch {}

        // List active task dirs for context
        const devActiveDir = join(projectDir, 'dev', 'active');
        const activeTasks = listActiveTaskDirs(devActiveDir);
        const taskListStr = activeTasks.length === 0
            ? 'No active task directories found. Create one with /dev-docs if working on a substantial task.'
            : activeTasks.length <= 5
                ? 'Active tasks:\n' + activeTasks.map(t => `   - /dev/active/${t}/`).join('\n')
                : `${activeTasks.length} active task directories in /dev/active/. Find the relevant one for your current work.`;

        return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DEV-DOC REMINDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After completing the user's request:

- If working on a tracked task: update its dev docs in /dev/active/
- If starting a new substantial task: create dev docs with /dev-docs
- If this is a quick fix or exploration: no action needed

${taskListStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    } catch {
        return null;
    }
}

function listActiveTaskDirs(devActiveDir: string): string[] {
    try {
        if (!existsSync(devActiveDir)) return [];
        return readdirSync(devActiveDir).filter(entry => {
            try {
                const fullPath = join(devActiveDir, entry);
                if (!statSync(fullPath).isDirectory()) return false;
                return readdirSync(fullPath).some(f => f.endsWith('.md'));
            } catch {
                return false;
            }
        });
    } catch {
        return [];
    }
}

// ============================================================
// OBSERVABILITY - STDERR + ACTIVITY LOG
// ============================================================

const SESSION_INTEL_VERBOSE = parseInt(process.env.SESSION_INTEL_VERBOSE ?? '2', 10);

function logSessionIntel(data: SessionIntelData): void {
    // Always write to activity log
    try {
        const logDir = join(__dirname, 'data');
        if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
        const logFile = join(logDir, 'session-intel.log');
        appendFileSync(logFile, JSON.stringify(data) + '\n');
    } catch {
        // Non-blocking
    }

    if (SESSION_INTEL_VERBOSE === 0) return;

    if (SESSION_INTEL_VERBOSE === 1) {
        // One-line summary
        const parts: string[] = [];
        if (data.skills.mandatory.length > 0 || data.skills.recommended.length > 0) {
            parts.push(`Skills: ${data.skills.mandatory.length}M/${data.skills.recommended.length}R`);
        }
        if (data.search) {
            const bestScore = data.search.top.length > 0 ? data.search.top[0].score.toFixed(2) : 'n/a';
            parts.push(`Search: ${data.search.hits} hits (best: ${bestScore})`);
        }
        if (data.reminder !== 'none') {
            parts.push(`Reminder: ${data.reminder}`);
        }
        if (parts.length > 0) {
            console.error(`[Session Intel] ${parts.join(' | ')}`);
        }
        return;
    }

    // Verbose (level 2) - detailed multi-line output
    const lines: string[] = ['[Session Intel] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'];

    // Skills
    if (data.skills.mandatory.length > 0) {
        lines.push(`  Skills: ${data.skills.mandatory.join(', ')} (MANDATORY) via ${data.skills.source} (${data.skills.ms}ms)`);
    } else if (data.skills.recommended.length > 0) {
        lines.push(`  Skills: ${data.skills.recommended.join(', ')} (recommended) via ${data.skills.source} (${data.skills.ms}ms)`);
    } else {
        lines.push(`  Skills: none via ${data.skills.source} (${data.skills.ms}ms)`);
    }

    // Search
    if (data.search) {
        lines.push(`  Search: ${data.search.quality} mode, ${data.search.hits} results (${data.search.ms}ms)`);
        for (const r of data.search.top.slice(0, 3)) {
            const title = r.id.replace('devdoc:', '');
            lines.push(`    ${data.search.top.indexOf(r) + 1}. "${title}" (${r.score.toFixed(2)})`);
        }
        if (data.search.relevant !== null) {
            lines.push(`  Assessment: ${data.search.relevant ? 'relevant' : 'not relevant'}`);
        }
    } else {
        lines.push('  Search: disabled or no DB');
    }

    // Reminder
    if (data.reminder !== 'none') {
        lines.push(`  Dev docs: ${data.reminder}`);
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(lines.join('\n'));
}

// ============================================================
// TIMEOUT HELPER
// ============================================================

const AI_TIMEOUT_MS = 10000;

async function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    onTimeout: () => T,
    label: string
): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>(resolve => {
        timer = setTimeout(() => {
            if (process.env.DEBUG_SKILLS === '1') {
                console.error(`[DEBUG] ${label} timed out after ${ms}ms, falling back`);
            }
            resolve(onTimeout());
        }, ms);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timer) clearTimeout(timer);
        // Swallow late rejections if the promise loses the race
        promise.catch(() => {});
    }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);
        const prompt = data.prompt;
        const sessionId = data.session_id;

        // Load skill rules (missing/malformed file = no skills configured, graceful no-op)
        const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';
        const rulesPath = join(projectDir, '.claude', 'skills', 'skill-rules.json');
        let rules: SkillRules = { version: '1.0', skills: {} };
        try {
            rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));
        } catch (err) {
            console.error(`skill-activation-prompt: could not load skill-rules.json (${err instanceof Error ? err.message : String(err)}), continuing without skill suggestions`);
        }

        // Get configuration
        const activationMode: ActivationMode = rules.settings?.skill_activation_mode || 'disabled';
        const conservativeness = getConservativenessLevel(rules.settings);
        const debug = process.env.DEBUG_SKILLS === '1';

        if (debug) {
            console.error(`[DEBUG] Activation mode: ${activationMode}`);
            console.error(`[DEBUG] Conservativeness level: ${conservativeness}`);
        }

        // Load session state
        const sessionState = loadSessionState(sessionId);
        const alreadyActivated = new Set(sessionState.skills_used || []);

        // === PARALLEL: Skill classification + Vector search ===
        const searchEnabled = process.env.SESSION_SEARCH_ENABLED !== 'false';
        const searchQuality = (process.env.SESSION_SEARCH_QUALITY || 'quality') as SearchQuality;

        const classifyStart = Date.now();
        const searchStart = Date.now();

        // Build classification promise based on mode
        let classificationPromise: Promise<{ result: ClassificationResult; source: string }>;

        if (activationMode === 'disabled') {
            classificationPromise = Promise.resolve(() => {
                const fallbackMatches = fallbackKeywordMatch(prompt, rules);
                const fallbackResult = fallbackToClassificationResult(fallbackMatches);
                return {
                    result: {
                        mandatory: fallbackResult.mandatory.filter(s => rules.skills[s]),
                        recommended: fallbackResult.recommended.filter(s => rules.skills[s]),
                    },
                    source: 'regex',
                };
            }).then(fn => fn());
        } else {
            const aiClassificationPromise = (async () => {
                const provider = await createProvider({ warnIfUnavailable: true });
                if (provider) {
                    const classification = await classifyWithAI(provider, prompt, rules, conservativeness);
                    if (debug) {
                        console.error(`[DEBUG] AI result (${provider.name}):`, JSON.stringify(classification));
                    }
                    const { mandatory: validMandatory, recommended: validRecommended } =
                        enforceMandatoryEligibility(classification, rules);

                    if (validMandatory.length === 0 && validRecommended.length === 0 && activationMode === 'fallback') {
                        if (debug) console.error('[DEBUG] AI returned nothing, falling back to regex');
                        const fallbackMatches = fallbackKeywordMatch(prompt, rules);
                        const fallbackResult = fallbackToClassificationResult(fallbackMatches);
                        return {
                            result: {
                                mandatory: fallbackResult.mandatory.filter(s => rules.skills[s]),
                                recommended: fallbackResult.recommended.filter(s => rules.skills[s]),
                            },
                            source: 'regex-fallback',
                        };
                    }

                    return { result: { mandatory: validMandatory, recommended: validRecommended }, source: provider.name };
                }
                if (activationMode === 'fallback') {
                    // No provider available - fallback mode regresses to regex matching
                    const fallbackMatches = fallbackKeywordMatch(prompt, rules);
                    const fallbackResult = fallbackToClassificationResult(fallbackMatches);
                    return {
                        result: {
                            mandatory: fallbackResult.mandatory.filter(s => rules.skills[s]),
                            recommended: fallbackResult.recommended.filter(s => rules.skills[s]),
                        },
                        source: 'regex-no-provider',
                    };
                }
                return { result: EMPTY_CLASSIFICATION, source: 'none' };
            })();

            classificationPromise = withTimeout(aiClassificationPromise, AI_TIMEOUT_MS, () => {
                const fallbackMatches = fallbackKeywordMatch(prompt, rules);
                const fallbackResult = fallbackToClassificationResult(fallbackMatches);
                return {
                    result: {
                        mandatory: fallbackResult.mandatory.filter(s => rules.skills[s]),
                        recommended: fallbackResult.recommended.filter(s => rules.skills[s]),
                    },
                    source: 'regex-timeout',
                };
            }, 'AI classification');
        }

        // Run classification + search in parallel
        const [classificationData, searchResult] = await Promise.all([
            classificationPromise,
            searchEnabled
                ? withTimeout(
                    searchRelevantSessions(prompt, searchQuality),
                    AI_TIMEOUT_MS,
                    () => null,
                    'Vector search'
                ).catch(err => {
                    if (debug) console.error('[Session Search] Error:', err);
                    return null;
                })
                : Promise.resolve(null),
        ]);

        const classifyMs = Date.now() - classifyStart;
        const searchMs = Date.now() - searchStart;

        const { result: classification, source: classificationSource } = classificationData;

        // Filter out already-activated skills
        const newMandatory = classification.mandatory.filter(s => !alreadyActivated.has(s));
        const newRecommended = classification.recommended.filter(s => !alreadyActivated.has(s));

        // Output skill suggestions if there are new ones
        if (newMandatory.length > 0 || newRecommended.length > 0) {
            console.log(generateTieredOutput(newMandatory, newRecommended, classificationSource));

            const allNewSkills = [...newMandatory, ...newRecommended];
            updateSessionState(sessionId, state => {
                state.skills_used = [...new Set([...state.skills_used, ...allNewSkills])];
                if (newMandatory.length > 0) {
                    state.mandatory_pending = [...new Set([...state.mandatory_pending, ...newMandatory])];
                }
            });

            for (const skill of newMandatory) {
                recordMetric({ event: 'suggested', session: sessionId, skill, level: 'mandatory', source: classificationSource });
            }
            for (const skill of newRecommended) {
                recordMetric({ event: 'suggested', session: sessionId, skill, level: 'recommended', source: classificationSource });
            }
        }

        // === SESSION CONTEXT INJECTION ===
        if (searchResult) {
            const contextOutput = formatSearchResults(searchResult, searchQuality);
            if (contextOutput) {
                console.log(contextOutput);
            }
        }

        // === DEV-DOC UPDATE INJECTION ===
        let reminderStatus = 'none';
        if (process.env.SESSION_DOCS_ENABLED !== 'false') {
            const devDocReminder = checkDevDocUpdateDue(sessionId);
            if (devDocReminder) {
                console.log(devDocReminder);
                reminderStatus = 'reminded';
            }
        }

        // === OBSERVABILITY: stderr + activity log ===
        const intelData: SessionIntelData = {
            ts: new Date().toISOString(),
            session: sessionId,
            skills: {
                mandatory: newMandatory,
                recommended: newRecommended,
                source: classificationSource,
                ms: classifyMs,
            },
            search: searchResult ? {
                quality: searchQuality,
                hits: searchResult.results.length,
                top: searchResult.results.slice(0, 5).map(r => ({
                    id: r.sessionId,
                    score: r.score,
                })),
                relevant: searchResult.assessment?.relevant ?? null,
                ms: searchMs,
            } : null,
            reminder: reminderStatus,
        };

        logSessionIntel(intelData);

        process.exit(0);
    } catch (err) {
        console.error(`skill-activation-prompt: hook failed, continuing without suggestions (${err instanceof Error ? err.message : String(err)})`);
        process.exit(0);
    }
}

main().catch(err => {
    console.error(`skill-activation-prompt: hook failed, continuing without suggestions (${err instanceof Error ? err.message : String(err)})`);
    process.exit(0);
});
