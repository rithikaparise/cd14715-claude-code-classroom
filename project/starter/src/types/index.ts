import { z } from 'zod';

// ─── Code Quality ──────────────────────────────────────────────

export const SeveritySchema = z.enum(['high', 'medium', 'low']);
export type Severity = z.infer<typeof SeveritySchema>;

export const CodeQualityIssueSchema = z.object({
  file: z.string().min(1),
  line: z.number().int().positive(),
  severity: SeveritySchema,
  category: z.enum(['security', 'performance', 'maintainability', 'style']),
  message: z.string().min(1),
  suggestion: z.string().optional(),
});
export type CodeQualityIssue = z.infer<typeof CodeQualityIssueSchema>;

export const CodeQualityResultSchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(CodeQualityIssueSchema),
  summary: z.string().min(1),
});
export type CodeQualityResult = z.infer<typeof CodeQualityResultSchema>;

// ─── Test Coverage ─────────────────────────────────────────────

export const TestSuggestionSchema = z.object({
  file: z.string().min(1),
  function: z.string().min(1),
  description: z.string().min(1),
  testCase: z.string().optional(),
});
export type TestSuggestion = z.infer<typeof TestSuggestionSchema>;

export const TestCoverageResultSchema = z.object({
  score: z.number().min(0).max(100),
  estimatedCoverage: z.number().min(0).max(100),
  untestedFunctions: z.array(z.string()),
  suggestions: z.array(TestSuggestionSchema),
  summary: z.string().min(1),
});
export type TestCoverageResult = z.infer<typeof TestCoverageResultSchema>;

// ─── Refactoring ───────────────────────────────────────────────

export const RefactoringSuggestionSchema = z.object({
  file: z.string().min(1),
  line: z.number().int().positive().optional(),
  type: z.string().min(1),
  description: z.string().min(1),
  example: z.string().optional(),
});
export type RefactoringSuggestion = z.infer<typeof RefactoringSuggestionSchema>;

export const RefactoringResultSchema = z.object({
  score: z.number().min(0).max(100),
  suggestions: z.array(RefactoringSuggestionSchema),
  deadCode: z.array(z.string()),
  summary: z.string().min(1),
});
export type RefactoringResult = z.infer<typeof RefactoringResultSchema>;

// ─── Review Report (aggregated) ────────────────────────────────

export const PullRequestInfoSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1),
  author: z.string().optional(),
  url: z.string().url().optional(),
});
export type PullRequestInfo = z.infer<typeof PullRequestInfoSchema>;

export const ReviewReportSchema = z.object({
  pr: PullRequestInfoSchema,
  summary: z.string().min(1),
  overallScore: z.number().min(0).max(100),
  codeQuality: CodeQualityResultSchema,
  testCoverage: TestCoverageResultSchema,
  refactoring: RefactoringResultSchema,
  recommendations: z.array(z.string()),
});
export type ReviewReport = z.infer<typeof ReviewReportSchema>;
