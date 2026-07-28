// Session Intelligence System - Shared Types

// ============================================================
// JSONL Entry Types (observed from session files)
// ============================================================

export interface UserEntry {
    type: 'user';
    message: {
        content: string;
        role: 'user';
    };
    uuid: string;
    parentUuid?: string;
    timestamp: string;
}

export interface AssistantContentPart {
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    name?: string;
    input?: Record<string, unknown>;
    content?: string | AssistantContentPart[];
}

export interface AssistantEntry {
    type: 'assistant';
    message: {
        content: AssistantContentPart[];
        role: 'assistant';
    };
    requestId?: string;
    timestamp?: string;
}

export interface ProgressEntry {
    type: 'progress';
    data: {
        type: string;
        toolUseID?: string;
    };
}

export interface SystemEntry {
    type: 'system';
    subtype?: string;
    content?: string;
    level?: string;
}

export interface FileHistoryEntry {
    type: 'file-history-snapshot';
    snapshot?: Record<string, unknown>;
    trackedFileBackups?: Record<string, unknown>;
}

export interface CustomTitleEntry {
    type: 'custom-title';
    customTitle: string;
}

export type SessionEntry =
    | UserEntry
    | AssistantEntry
    | ProgressEntry
    | SystemEntry
    | FileHistoryEntry
    | CustomTitleEntry;

// ============================================================
// Hook Input
// ============================================================

export interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode?: string;
    prompt?: string;
}

// ============================================================
// Vector Search
// ============================================================

export type SearchQuality = 'fast' | 'moderate' | 'quality';

export interface VectorSearchResult {
    sessionId: string;
    sourceType: 'session' | 'devdoc';
    chunkType: string;
    chunkText: string;
    score: number;
}

export interface RelevanceAssessment {
    relevant: boolean;
    score: number;
    keyFiles: string[];
    keyDecisions: string[];
    condensedContext: string;
}

// ============================================================
// Session Metadata
// ============================================================

export interface SessionMetadata {
    sessionId: string;
    sourceType: 'session' | 'devdoc';
    title?: string;
    customTitle?: string;
    totalTurns: number;
    filesEdited: string[];
    toolsUsed: Record<string, number>;
    startTime?: string;
    endTime?: string;
    fileSizeBytes: number;
    lastIndexedAt?: string;
}

// ============================================================
// Content Chunks
// ============================================================

export interface ContentChunk {
    chunkType: 'summary' | 'files' | 'prompts' | 'full_summary';
    text: string;
}

// ============================================================
// Dev Doc
// ============================================================

export interface DevDocInfo {
    taskName: string;
    dirPath: string;
    planContent?: string;
    contextContent?: string;
    tasksContent?: string;
    combinedText: string;
    isActive: boolean;
}

// ============================================================
// Doc Update State (throttling for Phase 2)
// ============================================================

export interface DocUpdateState {
    sessionId: string;
    lastUpdateTime: number;
    lastUpdateTurn: number;
    workerPid?: number;
    workerStartedAt?: number;
}

// ============================================================
// Indexing State
// ============================================================

export interface IndexingState {
    sourceId: string;
    sourceType: 'session' | 'devdoc';
    lastHash: string;
    lastIndexedAt: string;
}
