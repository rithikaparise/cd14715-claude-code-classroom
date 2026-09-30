/**
 * Minimal AgentDefinition type compatible with the Claude Agent SDK.
 * Uses `model: 'inherit'` so subagents reuse the orchestrator's model.
 */
export interface AgentDefinition {
  description: string;
  /** 'inherit' reuses the orchestrator model; a specific model id is also allowed. */
  model: 'inherit' | string;
  prompt: string;
  tools: string[];
}
