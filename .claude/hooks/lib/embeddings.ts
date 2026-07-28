// Session Intelligence System - Gemini Embeddings
import { getGeminiClient, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from './gemini-client.js';

// ============================================================
// Gemini Embedding Provider
// ============================================================

export class GeminiEmbeddingProvider {
    get dimensions(): number {
        return EMBEDDING_DIMENSIONS;
    }

    async embed(text: string, taskType?: string): Promise<number[]> {
        const client = getGeminiClient();
        if (!client) {
            throw new Error('Gemini client not available (no GEMINI_API_KEY)');
        }

        const truncated = text.slice(0, 8000);

        const response = await client.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: truncated,
            config: {
                outputDimensionality: EMBEDDING_DIMENSIONS,
                ...(taskType ? { taskType } : {}),
            },
        });

        const embedding = response.embeddings?.[0]?.values;
        if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
            throw new Error(
                `Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding?.length ?? 0}`,
            );
        }

        return embedding;
    }

    async embedBatch(texts: string[], taskType?: string): Promise<number[][]> {
        const results: number[][] = [];
        for (const text of texts) {
            results.push(await this.embed(text, taskType));
            // Small delay to avoid rate limiting
            if (texts.length > 5) {
                await new Promise((r) => setTimeout(r, 100));
            }
        }
        return results;
    }
}

// ============================================================
// Factory
// ============================================================

export function createEmbeddingProvider(): GeminiEmbeddingProvider {
    return new GeminiEmbeddingProvider();
}
