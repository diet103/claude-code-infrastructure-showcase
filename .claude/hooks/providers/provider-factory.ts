/**
 * Provider Factory
 *
 * Auto-detects which AI provider to use based on available credentials.
 * Can be overridden with SKILL_AI_PROVIDER environment variable.
 *
 * Detection priority:
 * 1. SKILL_AI_PROVIDER env var (explicit: gemini|openai|anthropic|minimax|ollama)
 * 2. GEMINI_API_KEY present -> Gemini
 * 3. OPENAI_API_KEY present -> OpenAI
 * 4. ANTHROPIC_API_KEY present -> Anthropic
 * 5. MINIMAX_API_KEY present -> MiniMax
 * 6. OLLAMA_BASE_URL present -> Ollama (ping, 500ms timeout)
 * 7. null -> regex-only fallback
 *
 * Ollama requires explicit opt-in (SKILL_AI_PROVIDER=ollama or OLLAMA_BASE_URL):
 * probing for it unconditionally would cost every hook call a 500ms network
 * ping whenever no provider is configured — the default install.
 */

import type { AIProvider } from './ai-provider.js';
import { createGeminiProvider } from './gemini-provider.js';
import { createOpenAIProvider } from './openai-provider.js';
import { createAnthropicProvider } from './anthropic-provider.js';
import { createMiniMaxProvider } from './minimax-provider.js';
import { createOllamaProvider } from './ollama-provider.js';

const debug = process.env.DEBUG_SKILLS === '1';

type ProviderName = 'gemini' | 'openai' | 'anthropic' | 'minimax' | 'ollama';

const PROVIDER_CREATORS: Record<ProviderName, () => Promise<AIProvider | null>> = {
    gemini: createGeminiProvider,
    openai: createOpenAIProvider,
    anthropic: createAnthropicProvider,
    minimax: createMiniMaxProvider,
    ollama: createOllamaProvider,
};

/**
 * Create an AI provider based on explicit override or auto-detection.
 * Returns null if no provider is available (regex-only mode).
 *
 * Pass warnIfUnavailable when AI mode was explicitly requested, so the
 * "no provider" message is always visible (not just in debug mode).
 */
export async function createProvider(options?: { warnIfUnavailable?: boolean }): Promise<AIProvider | null> {
    // 1. Explicit override
    const explicit = process.env.SKILL_AI_PROVIDER as ProviderName | undefined;
    if (explicit && PROVIDER_CREATORS[explicit]) {
        if (debug) console.error(`[Provider] Using explicit provider: ${explicit}`);
        const provider = await PROVIDER_CREATORS[explicit]();
        if (provider) return provider;
        if (debug) console.error(`[Provider] Explicit provider ${explicit} failed to initialize`);
        if (options?.warnIfUnavailable) {
            console.error('skill-activation: no AI provider available, using regex-only mode');
        }
        return null;
    }

    // 2. Auto-detection cascade
    const cascade: { check: () => boolean; name: ProviderName }[] = [
        { check: () => !!process.env.GEMINI_API_KEY, name: 'gemini' },
        { check: () => !!process.env.OPENAI_API_KEY, name: 'openai' },
        { check: () => !!process.env.ANTHROPIC_API_KEY, name: 'anthropic' },
        { check: () => !!process.env.MINIMAX_API_KEY, name: 'minimax' },
        { check: () => !!process.env.OLLAMA_BASE_URL, name: 'ollama' }, // Opt-in only: the ping costs 500ms when Ollama is absent
    ];

    for (const { check, name } of cascade) {
        if (check()) {
            if (debug) console.error(`[Provider] Trying auto-detected provider: ${name}`);
            const provider = await PROVIDER_CREATORS[name]();
            if (provider) {
                if (debug) console.error(`[Provider] Using auto-detected provider: ${name}`);
                return provider;
            }
        }
    }

    if (options?.warnIfUnavailable) {
        console.error('skill-activation: no AI provider available, using regex-only mode');
    } else if (debug) {
        console.error('[Provider] No AI provider available, using regex-only mode');
    }
    return null;
}
