/**
 * AI Provider Abstraction Layer
 *
 * Defines the interface that all AI providers must implement.
 * Hooks own prompt engineering; providers just send text and return text.
 * The hook code handles JSON parsing via parse-llm-json.ts.
 */

export interface AIClassificationResult {
    mandatory: string[];
    recommended: string[];
}

export interface AIEditAnalysisResult {
    skills: string[];
}

/**
 * Core provider interface. Each provider adapter implements this.
 * Methods accept a prompt string and return the raw LLM text response.
 * JSON parsing is handled by the calling code, not the provider.
 */
export interface AIProvider {
    /** Provider name for logging */
    readonly name: string;

    /**
     * Send a classification prompt to the LLM.
     * Used by UserPromptSubmit hook to classify user intent.
     * @param prompt - The full classification prompt (built by the hook)
     * @returns Raw text response from the LLM
     */
    classifyPrompt(prompt: string): Promise<string>;

    /**
     * Send an edit analysis prompt to the LLM.
     * Used by PreToolUse hook to analyze code being written.
     * @param prompt - The full analysis prompt (built by the hook)
     * @returns Raw text response from the LLM
     */
    analyzeEdit(prompt: string): Promise<string>;
}

export const EMPTY_CLASSIFICATION: AIClassificationResult = {
    mandatory: [],
    recommended: [],
};

export const EMPTY_ANALYSIS: AIEditAnalysisResult = {
    skills: [],
};
