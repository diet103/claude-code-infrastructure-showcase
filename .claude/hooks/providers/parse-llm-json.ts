/**
 * Shared JSON extraction from LLM responses.
 * Handles both markdown code blocks and direct JSON.
 */

/**
 * Extract JSON from an LLM response string.
 * Tries markdown code block first, then direct JSON match.
 * Returns null if no valid JSON found.
 */
export function parseLLMJson(text: string): any | null {
    if (!text) return null;

    try {
        // Try markdown code block first: ```json ... ``` (or bare ``` ... ```)
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            return JSON.parse(codeBlockMatch[1]);
        }

        // Try direct JSON match (first balanced object or array)
        const extracted = extractFirstJsonValue(text);
        if (extracted) {
            return JSON.parse(extracted);
        }
    } catch {
        // JSON parse failed
    }

    return null;
}

/**
 * Extract the first complete JSON object or array from a string by tracking
 * brace/bracket depth, respecting string literals and escape sequences.
 */
function extractFirstJsonValue(text: string): string | null {
    const objStart = text.indexOf('{');
    const arrStart = text.indexOf('[');
    if (objStart === -1 && arrStart === -1) return null;

    const start = objStart === -1 ? arrStart
        : arrStart === -1 ? objStart
        : Math.min(objStart, arrStart);

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
        const char = text[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (inString) {
            if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
        } else if (char === '{' || char === '[') {
            depth++;
        } else if (char === '}' || char === ']') {
            depth--;
            if (depth === 0) {
                return text.slice(start, i + 1);
            }
        }
    }

    return null;
}
