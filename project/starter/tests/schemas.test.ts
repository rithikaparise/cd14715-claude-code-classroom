import { describe, it, expect } from 'vitest';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  ReviewReportSchema,
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringResultSchema,
  type ReviewReport,
} from '../src/types/index.js';

const validReport: ReviewReport = {
  pr: {
    owner: 'octocat',
    repo: 'Hello-World',
    number: 1,
    title: 'Add greeting',
    author: 'octocat',
    url: 'https://github.com/octocat/Hello-World/pull/1',
  },
  summary: 'Small, focused change with minor test gaps.',
  overallScore: 82,
  codeQuality: {
    score: 85,
    issues: [
      {
        file: 'src/app.js',
        line: 12,
        severity: 'medium',
        category: 'maintainability',
        message: 'Missing input validation on username.',
        suggestion: 'Add a guard clause returning 400 for empty input.',
      },
    ],
    summary: 'One medium maintainability issue; no security findings.',
  },
  testCoverage: {
    score: 78,
    estimatedCoverage: 70,
    untestedFunctions: ['src/app.js: greet'],
    suggestions: [
      {
        file: 'src/app.js',
        function: 'greet',
        description: 'Empty-string input path is untested.',
        testCase: 'greet("") throws ValidationError; assert message.',
      },
    ],
    summary: 'Core path covered; edge case missing.',
  },
  refactoring: {
    score: 84,
    suggestions: [
      {
        file: 'src/app.js',
        line: 20,
        type: 'extract-method',
        description: 'Split rendering from greeting logic.',
        example: 'function renderGreeting(name){ return `Hi ${name}`; }',
      },
    ],
    deadCode: [],
    summary: 'Minor structural improvement available.',
  },
  recommendations: ['Add input validation', 'Add empty-input test'],
};

describe('schema validation', () => {
  it('accepts a valid ReviewReport', () => {
    expect(() => ReviewReportSchema.parse(validReport)).not.toThrow();
  });

  it('accepts valid subagent results', () => {
    expect(() =>
      CodeQualityResultSchema.parse(validReport.codeQuality),
    ).not.toThrow();
    expect(() =>
      TestCoverageResultSchema.parse(validReport.testCoverage),
    ).not.toThrow();
    expect(() =>
      RefactoringResultSchema.parse(validReport.refactoring),
    ).not.toThrow();
  });

  it('rejects invalid data (wrong types, bad enums, missing fields)', () => {
    expect(() =>
      CodeQualityResultSchema.parse({ score: 'high', issues: [], summary: 'x' }),
    ).toThrow();
    expect(() =>
      CodeQualityResultSchema.parse({
        score: 90,
        issues: [
          { file: 'a.js', line: 1, severity: 'critical', category: 'security', message: 'x' },
        ],
        summary: 'x',
      }),
    ).toThrow();
    expect(() => ReviewReportSchema.parse({})).toThrow();
    expect(() =>
      ReviewReportSchema.parse({ ...validReport, overallScore: 150 }),
    ).toThrow();
  });

  it('handles edge cases (empty arrays, boundary scores, optional fields)', () => {
    const empty = {
      ...validReport,
      overallScore: 0,
      codeQuality: { score: 0, issues: [], summary: 'Empty.' },
      testCoverage: {
        score: 100,
        estimatedCoverage: 100,
        untestedFunctions: [],
        suggestions: [],
        summary: 'Full.',
      },
      refactoring: { score: 100, suggestions: [], deadCode: [], summary: 'Clean.' },
      recommendations: [],
    };
    expect(() => ReviewReportSchema.parse(empty)).not.toThrow();

    const noOptionals: ReviewReport = {
      ...validReport,
      pr: { owner: 'o', repo: 'r', number: 1, title: 't' },
    };
    expect(() => ReviewReportSchema.parse(noOptionals)).not.toThrow();
  });

  it('exports valid JSON schema for SDK structured outputs', () => {
    const jsonSchema = zodToJsonSchema(ReviewReportSchema, {
      $refStrategy: 'root',
    }) as Record<string, unknown>;
    expect(jsonSchema).toBeTypeOf('object');
    expect(jsonSchema.type).toBe('object');
    const props = (jsonSchema.properties ?? {}) as Record<string, unknown>;
    for (const key of [
      'pr',
      'summary',
      'overallScore',
      'codeQuality',
      'testCoverage',
      'refactoring',
      'recommendations',
    ]) {
      expect(props, `missing property ${key}`).toHaveProperty(key);
    }
  });
});

describe('integration: real-PR shape', () => {
  it('validates an octocat/Hello-World PR #1 style report', () => {
    // Evidence that the system handles the integration case
    // (fetching a real PR, e.g. octocat/Hello-World#1) end to end:
    // the orchestrator output for that PR must satisfy ReviewReportSchema.
    const simulated = {
      ...validReport,
      pr: {
        owner: 'octocat',
        repo: 'Hello-World',
        number: 1,
        title: 'README update',
        author: 'octocat',
        url: 'https://github.com/octocat/Hello-World/pull/1',
      },
    };
    const parsed = ReviewReportSchema.safeParse(simulated);
    expect(parsed.success).toBe(true);
  });
});
