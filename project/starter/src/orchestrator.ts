import { query } from '@anthropic-ai/claude-agent-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { mcpServers } from './config/mcp.config.js';
import {
  codeQualityAnalyzer,
  testCoverageAnalyzer,
  refactoringSuggester,
} from './agents/index.js';
import { orchestratorPrompt } from './prompts/orchestrator.prompt.js';
import { ReviewReportSchema, type ReviewReport } from './types/index.js';
import { logger } from './utils/logger.js';
import { withRetry, withTimeout, ReviewError, ErrorCodes } from './utils/error-handler.js';
import { RateLimiter } from './utils/rate-limiter.js';

/**
 * Main orchestrator: fetches PR data via GitHub MCP, spawns all three
 * subagents via the Task tool in parallel, and aggregates their findings
 * into a validated ReviewReport.
 */
export class Orchestrator {
  private rateLimiter = new RateLimiter();

  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<ReviewReport> {
    const model = process.env.ANTHROPIC_MODEL;
    if (!model) {
      throw new ReviewError(
        'ANTHROPIC_MODEL environment variable is required (e.g. claude-sonnet-4-5-20250929)',
        ErrorCodes.VALIDATION,
      );
    }

    const outputSchema = zodToJsonSchema(ReviewReportSchema, {
      $refStrategy: 'root',
    });

    const userPrompt = `${orchestratorPrompt}\n\nTarget PR: ${owner}/${repo}#${prNumber}. Fetch its data, then invoke subagents.`;

    await this.rateLimiter.acquire(2000);
    try {
      const run = () =>
        this.runQuery({
          model,
          userPrompt,
          outputSchema,
        });
      // Retry transient SDK failures; bound total time per attempt.
      const raw = await withRetry(
        () => withTimeout(run, 10 * 60 * 1000),
        { maxRetries: 2, delayMs: 2000 },
      );
      const parsed = ReviewReportSchema.safeParse(raw);
      if (!parsed.success) {
        logger.error(`Schema validation failed: ${parsed.error.message}`);
        throw new ReviewError(
          `Structured output failed ReviewReport validation: ${parsed.error.message}`,
          ErrorCodes.VALIDATION,
        );
      }
      return parsed.data;
    } finally {
      this.rateLimiter.release();
    }
  }

  private async runQuery(args: {
    model: string;
    userPrompt: string;
    outputSchema: Record<string, unknown>;
  }): Promise<unknown> {
    let structured: unknown;
    // The SDK returns an async iterable of messages; the final result
    // carries structured_output conforming to outputFormat's JSON schema.
    for await (const message of query({
      prompt: args.userPrompt,
      options: {
        model: args.model,
        mcpServers,
        agents: {
          'code-quality-analyzer': codeQualityAnalyzer as never,
          'test-coverage-analyzer': testCoverageAnalyzer as never,
          'refactoring-suggester': refactoringSuggester as never,
        },
        allowedTools: [
          'Task',
          'Read',
          'Grep',
          'Glob',
          'Skill',
          'mcp__github__get_pull_request',
          'mcp__github__get_pull_request_diff',
          'mcp__github__get_pull_request_files',
          'mcp__eslint__lint',
        ],
        maxTurns: 30,
        outputFormat: {
          type: 'json_schema' as never,
          schema: args.outputSchema as never,
        } as never,
      },
    }) as AsyncIterable<Record<string, unknown>>) {
      const output =
        (message as { structured_output?: unknown }).structured_output ??
        (message as { result?: { structured_output?: unknown } }).result
          ?.structured_output;
      if (output !== undefined) structured = output;
      if (
        (message as { type?: string }).type === 'result' &&
        (message as { subtype?: string }).subtype !== undefined
      ) {
        const maybe =
          (message as { structured_output?: unknown }).structured_output ??
          (message as { result?: unknown }).result;
        if (maybe !== undefined) structured = maybe;
      }
    }
    if (structured === undefined) {
      throw new ReviewError(
        'Orchestrator produced no structured output (subagents may have failed)',
        ErrorCodes.AGENT_FAILED,
      );
    }
    return structured;
  }
}
