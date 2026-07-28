/**
 * Google Gemini AI Provider
 *
 * Uses @google/genai SDK with gemini-3-flash-preview model.
 * SDK is loaded via dynamic import() so missing package doesn't crash.
 *
 * Get a free API key: https://aistudio.google.com/apikey
 * Set GEMINI_API_KEY environment variable.
 * Set GEMINI_MODEL to change model (default: gemini-3-flash-preview)
 */

import type { AIProvider } from './ai-provider.js';

export class GeminiProvider implements AIProvider {
    readonly name = 'gemini';
    private client: any = null;

    async initialize(): Promise<boolean> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return false;

        try {
            const { GoogleGenAI } = await import('@google/genai');
            this.client = new GoogleGenAI({ apiKey });
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
            throw new Error('Gemini client not initialized');
        }

        const response = await this.client.models.generateContent({
            model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text || '';
    }
}

export async function createGeminiProvider(): Promise<AIProvider | null> {
    const provider = new GeminiProvider();
    const ok = await provider.initialize();
    return ok ? provider : null;
}
