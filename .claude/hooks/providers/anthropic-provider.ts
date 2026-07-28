/**
 * Anthropic AI Provider
 *
 * Uses @anthropic-ai/sdk with claude-haiku-4-5-20251001 model.
 *
 * Set ANTHROPIC_API_KEY environment variable.
 * Set ANTHROPIC_MODEL to change model (default: claude-haiku-4-5-20251001)
 */

import type { AIProvider } from './ai-provider.js';

export class AnthropicProvider implements AIProvider {
    readonly name = 'anthropic';
    private client: any = null;

    async initialize(): Promise<boolean> {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return false;

        try {
            const { default: Anthropic } = await import('@anthropic-ai/sdk');
            this.client = new Anthropic({ apiKey });
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
            throw new Error('Anthropic client not initialized');
        }

        const response = await this.client.messages.create({
            model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        const block = response.content?.[0];
        return block?.type === 'text' ? block.text : '';
    }
}

export async function createAnthropicProvider(): Promise<AIProvider | null> {
    const provider = new AnthropicProvider();
    const ok = await provider.initialize();
    return ok ? provider : null;
}
