/**
 * Ollama AI Provider (Local/Free)
 *
 * Uses HTTP fetch to a local Ollama instance. No API key needed.
 * Default model: llama3.2
 * Default endpoint: http://localhost:11434
 *
 * Install Ollama: https://ollama.ai
 * Then: ollama pull llama3.2
 *
 * Set OLLAMA_MODEL to change model (default: llama3.2)
 * Set OLLAMA_BASE_URL to change endpoint (default: http://localhost:11434)
 */

import type { AIProvider } from './ai-provider.js';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2';
const PING_TIMEOUT_MS = 500;
const GENERATE_TIMEOUT_MS = 5000;

export class OllamaProvider implements AIProvider {
    readonly name = 'ollama';
    private baseUrl: string;
    private model: string;

    constructor() {
        this.baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL;
        this.model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
    }

    async initialize(): Promise<boolean> {
        return this.ping();
    }

    async classifyPrompt(prompt: string): Promise<string> {
        return this.generate(prompt);
    }

    async analyzeEdit(prompt: string): Promise<string> {
        return this.generate(prompt);
    }

    /**
     * Ping Ollama to check availability. 500ms timeout.
     */
    async ping(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

            const response = await fetch(`${this.baseUrl}/api/tags`, {
                signal: controller.signal,
            });

            clearTimeout(timeout);
            return response.ok;
        } catch {
            return false;
        }
    }

    private async generate(prompt: string): Promise<string> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt,
                    stream: false,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Ollama request failed: ${response.status}`);
            }

            const data = await response.json() as { response?: string };
            return data.response || '';
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Ollama request timed out after ${GENERATE_TIMEOUT_MS}ms`);
            }
            throw new Error(`Ollama request failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            clearTimeout(timeout);
        }
    }
}

export async function createOllamaProvider(): Promise<AIProvider | null> {
    const provider = new OllamaProvider();
    const ok = await provider.initialize();
    return ok ? provider : null;
}
