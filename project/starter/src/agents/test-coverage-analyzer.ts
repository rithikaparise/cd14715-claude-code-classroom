import type { AgentDefinition } from './types.js';
import { testCoverageAnalyzerPrompt } from '../prompts/test-coverage-analyzer.prompt.js';

/**
 * Test Coverage Analyzer — estimates coverage by comparing source files
 * with test files, flags untested functions, and proposes concrete test
 * cases with meaningful assertions.
 */
export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Evaluates test completeness for pull request changes: estimates coverage, identifies untested functions and critical paths, and suggests specific test cases with assertions. Use for test-gap analysis.',
  model: 'inherit',
  prompt: testCoverageAnalyzerPrompt,
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
};
