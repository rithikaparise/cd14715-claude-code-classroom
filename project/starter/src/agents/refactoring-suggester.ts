import type { AgentDefinition } from './types.js';
import { refactoringSuggesterPrompt } from '../prompts/refactoring-suggester.prompt.js';

/**
 * Refactoring Suggester — identifies extract-method/class candidates,
 * design-pattern opportunities, modernization (modern JS/TS features),
 * dead code and redundant logic. Distinct from code-quality analysis:
 * this agent improves structure and readability, not bug/security risk.
 */
export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies refactoring opportunities in pull request changes: design patterns, modern language features, extract method/class candidates, dead code and redundant logic. Use for structural and readability improvements.',
  model: 'inherit',
  prompt: refactoringSuggesterPrompt,
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
};
