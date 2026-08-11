/**
 * MiniMax AI Provider
 *
 * Uses @anthropic-ai/sdk against the MiniMax Anthropic-compatible endpoint.
 * MiniMax exposes an Anthropic-compatible API at https://api.minimax.io/anthropic
 * (global) and https://api.minimaxi.com/anthropic (China region).
 *
 * Set MINIMAX_API_KEY environment variable.
 * Set MINIMAX_MODEL to MiniMax-M3 (default) or MiniMax-M2.7.
 * Set MINIMAX_BASE_URL to switch region (default: https://api.minimax.io/anthropic)
 */

import type { AIProvider } from './ai-provider.js';

export const MINIMAX_MODELS = ['MiniMax-M3', 'MiniMax-M2.7'] as const;
export const MINIMAX_ANTHROPIC_BASE_URLS = {
    global: 'https://api.minimax.io/anthropic',
    china: 'https://api.minimaxi.com/anthropic',
} as const;

const DEFAULT_BASE_URL = MINIMAX_ANTHROPIC_BASE_URLS.global;
const DEFAULT_MODEL = MINIMAX_MODELS[0];

export class MiniMaxProvider implements AIProvider {
    readonly name = 'minimax';
    private client: any = null;

    async initialize(): Promise<boolean> {
        const apiKey = process.env.MINIMAX_API_KEY;
        if (!apiKey) return false;

        try {
            const { default: Anthropic } = await import('@anthropic-ai/sdk');
            const opts: any = { apiKey };
            opts.baseURL = process.env.MINIMAX_BASE_URL || DEFAULT_BASE_URL;
            this.client = new Anthropic(opts);
            return true;
        } catch {
            return false;
        }
    }

    async classifyPrompt(prompt: string): Promise<string> {
        return this.generate(prompt);
    }

    async analyzeEdit(prompt: string): Promise<string> {
        return this.generate(prompt);
    }

    private async generate(prompt: string): Promise<string> {
        if (!this.client) {
            throw new Error('MiniMax client not initialized');
        }

        const response = await this.client.messages.create({
            model: process.env.MINIMAX_MODEL || DEFAULT_MODEL,
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        const block = response.content?.[0];
        return block?.type === 'text' ? block.text : '';
    }
}

export async function createMiniMaxProvider(): Promise<AIProvider | null> {
    const provider = new MiniMaxProvider();
    const ok = await provider.initialize();
    return ok ? provider : null;
}
