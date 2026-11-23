export const RUNTIME_1052_AUTO_CONTEXT_MESSAGE_LIMIT = 160
export const RUNTIME_1052_AUTO_COMPACT_TOKEN_LIMIT = 80_000
export const RUNTIME_1052_COMPACTION_CHUNK_CHARS = 32_000
export const RUNTIME_1052_COMPACTED_USER_MESSAGE_TOKEN_BUDGET = 8_000
export const RUNTIME_1052_COMPACTION_FALLBACK_MESSAGES = 60

export type Runtime1052CompactionPhase = 'pre-step'
export type Runtime1052CompactionTrigger = 'auto' | 'safety'
export type Runtime1052CompactionReason =
  | 'token-limit'
  | 'message-window'
  | 'manual-safety'
  | 'model-error'
export type Runtime1052CompactionStrategy = 'summary-checkpoint' | 'tail-trim'

export type Runtime1052ContextPolicy = {
  autoCompactEnabled: boolean
  contextMessageLimit: number
  compactTokenLimit: number
  compactedUserMessageTokenBudget: number
  compactionChunkChars: number
  fallbackMessageLimit: number
}

export function resolveRuntime1052ContextPolicy(): Runtime1052ContextPolicy {
  return {
    autoCompactEnabled: true,
    contextMessageLimit: RUNTIME_1052_AUTO_CONTEXT_MESSAGE_LIMIT,
    compactTokenLimit: RUNTIME_1052_AUTO_COMPACT_TOKEN_LIMIT,
    compactedUserMessageTokenBudget: RUNTIME_1052_COMPACTED_USER_MESSAGE_TOKEN_BUDGET,
    compactionChunkChars: RUNTIME_1052_COMPACTION_CHUNK_CHARS,
    fallbackMessageLimit: RUNTIME_1052_COMPACTION_FALLBACK_MESSAGES,
  }
}
