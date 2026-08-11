# AI Provider Abstraction Layer

This directory contains the multi-provider AI abstraction used by the skill activation hooks.

## Architecture

```
Hook (owns prompts)           Provider (sends/receives text)
┌─────────────────────┐       ┌──────────────────────┐
│ skill-activation-    │──────▶│ AIProvider.classify() │
│ prompt.ts            │       │                      │
│ skill-verification-  │──────▶│ AIProvider.analyze()  │
│ guard.ts             │       └──────────────────────┘
└─────────────────────┘                │
                                       ▼
                              ┌──────────────────────┐
                              │ Provider Factory      │
                              │ (auto-detect or       │
                              │  explicit override)   │
                              └──────────────────────┘
                                       │
                    ┌──────────┬───────┴───────┬──────────┬──────────┐
                    ▼          ▼               ▼          ▼          ▼
              ┌─────────┐ ┌────────┐   ┌───────────┐ ┌────────┐ ┌────────┐
              │ Gemini  │ │ OpenAI │   │ Anthropic │ │ MiniMax│ │ Ollama │
              │ (cloud) │ │(cloud) │   │ (cloud)   │ │(cloud) │ │(local) │
              └─────────┘ └────────┘   └───────────┘ └────────┘ └────────┘
```

## Providers

| Provider | SDK | Model | API Key Env | Free Tier |
|----------|-----|-------|-------------|-----------|
| Gemini | `@google/genai` | `gemini-3-flash-preview` | `GEMINI_API_KEY` | Yes (generous) |
| OpenAI | `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` | No (pay-per-use) |
| Anthropic | `@anthropic-ai/sdk` | `claude-haiku-4-5-20251001` | `ANTHROPIC_API_KEY` | No (pay-per-use) |
| MiniMax | `@anthropic-ai/sdk` | `MiniMax-M3` (default), `MiniMax-M2.7` | `MINIMAX_API_KEY` | No (pay-per-use) |
| Ollama | HTTP fetch | `llama3.2` | None needed | Yes (runs locally) |

**Cost:** These are tiny classification prompts, so per-call cost is fractions of a cent on all hosted providers. Gemini's free tier covers typical usage. Ollama is free, local, and offline - the right choice for privacy-sensitive setups.

MiniMax uses its Anthropic-compatible API. Set `MINIMAX_MODEL` to `MiniMax-M3` or `MiniMax-M2.7`. The default global endpoint is `https://api.minimax.io/anthropic`; set `MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic` for the China region.

## Auto-Detection Priority

The factory tries providers in this order:

1. **Explicit override**: `SKILL_AI_PROVIDER=gemini|openai|anthropic|minimax|ollama`
2. **GEMINI_API_KEY** present -> Gemini
3. **OPENAI_API_KEY** present -> OpenAI
4. **ANTHROPIC_API_KEY** present -> Anthropic
5. **MINIMAX_API_KEY** present -> MiniMax
6. **OLLAMA_BASE_URL** present -> Ollama (ping, 500ms timeout)
7. **No provider** -> regex-only fallback (zero cost, works offline)

Ollama is opt-in: set `SKILL_AI_PROVIDER=ollama` or `OLLAMA_BASE_URL`. The factory does not probe for a local Ollama unprompted, because the detection ping would cost every hook call up to 500ms whenever no provider is configured.

## Adding a Custom Provider

1. Create `my-provider.ts` implementing the `AIProvider` interface:

```typescript
import type { AIProvider } from './ai-provider.js';

export class MyProvider implements AIProvider {
    readonly name = 'my-provider';

    async initialize(): Promise<boolean> {
        // Check credentials, initialize SDK
        return true;
    }

    async classifyPrompt(prompt: string): Promise<string> {
        // Send prompt, return raw text response
        return '{"mandatory": [], "recommended": []}';
    }

    async analyzeEdit(prompt: string): Promise<string> {
        // Send prompt, return raw text response
        return '{"skills": []}';
    }
}

export async function createMyProvider(): Promise<AIProvider | null> {
    const provider = new MyProvider();
    const ok = await provider.initialize();
    return ok ? provider : null;
}
```

2. Register it in `provider-factory.ts`:
   - Import your creator function
   - Add to `PROVIDER_CREATORS` map
   - Add detection logic to the cascade

## Design Decisions

- **Hooks own prompts**: Providers are simple send/receive adapters. All prompt engineering lives in the hook files, not in providers.
- **Dynamic imports**: AI SDKs use `await import()` with try/catch so missing packages don't crash. Install only the SDK you need.
- **Optional dependencies**: AI SDKs are listed as `optionalDependencies` in package.json. Classic (regex-only) mode works without any AI SDK installed.
- **JSON parsing**: Shared `parse-llm-json.ts` handles extracting JSON from LLM responses (markdown code blocks + direct JSON).
