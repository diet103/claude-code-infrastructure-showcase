// Session Intelligence System - Gemini Client Wrapper
import { GoogleGenAI } from '@google/genai';
import { parseLLMJson } from '../providers/parse-llm-json.js';
import type { RelevanceAssessment, VectorSearchResult } from './types.js';

// ============================================================
// Constants
// ============================================================

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSIONS = 768;

// ============================================================
// Singleton Client
// ============================================================

let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
    if (_client) return _client;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    _client = new GoogleGenAI({ apiKey });
    return _client;
}

// ============================================================
// Search Term Generation (Phase 4)
// ============================================================

export async function generateSearchTerms(
    userPrompt: string,
): Promise<string[]> {
    const client = getGeminiClient();
    if (!client) return [];

    const prompt = `Extract 3-5 search terms from this developer prompt that would help find relevant past sessions or documentation. Focus on:
- Technical concepts (e.g., "workflow", "authentication", "Prisma")
- Specific features or components (e.g., "monthly report", "role assignment")
- File names or patterns mentioned
- Error types or debugging topics

Prompt: "${userPrompt}"

Return ONLY a JSON array of strings, e.g.: ["term1", "term2", "term3"]`;

    const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
    });

    const parsed = parseLLMJson(response.text?.trim() || '');
    return Array.isArray(parsed)
        ? parsed.filter((t: unknown): t is string => typeof t === 'string')
        : [];
}

// ============================================================
// Relevance Assessment (Phase 4)
// ============================================================

export async function assessRelevance(
    userPrompt: string,
    results: VectorSearchResult[],
): Promise<RelevanceAssessment | null> {
    const client = getGeminiClient();
    if (!client) return null;

    const resultsText = results
        .map((r, i) => `[${i + 1}] (${r.sourceType}: ${r.sessionId}, score: ${r.score.toFixed(3)})\n${r.chunkText.slice(0, 500)}`)
        .join('\n\n');

    const prompt = `A developer just sent this prompt:
"${userPrompt}"

Here are potentially relevant past sessions/documents found via semantic search:
${resultsText}

Assess relevance and extract useful context. Return a JSON object:
{
  "relevant": true/false,
  "score": 0.0-1.0,
  "keyFiles": ["file1.ts", "file2.ts"],
  "keyDecisions": ["Decision 1", "Decision 2"],
  "condensedContext": "2-3 sentence summary of the most relevant information"
}

If nothing is relevant to the prompt, set relevant=false and leave other fields empty.
Return ONLY the JSON object.`;

    const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
    });

    const parsed = parseLLMJson(response.text?.trim() || '');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as RelevanceAssessment
        : null;
}
