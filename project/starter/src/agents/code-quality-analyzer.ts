import type { AgentDefinition } from './types.js';
import { codeQualityAnalyzerPrompt } from '../prompts/code-quality-analyzer.prompt.js';

/**
 * Code Quality Analyzer — security vulnerabilities, performance issues,
 * maintainability concerns and best-practice violations.
 *
 * Invokes Claude Skills (e.g. code-review-best-practices, security-analysis,
 * javascript-best-practices) via the Skill tool for specialized analysis.
 */
export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes code diffs for security vulnerabilities, performance bottlenecks, maintainability issues and best-practice violations. Use for code quality review of pull request changes.',
  model: 'inherit',
  prompt: codeQualityAnalyzerPrompt,
  tools: ['Read', 'Grep', 'Glob', 'Skill', 'mcp__eslint__lint'],
};
