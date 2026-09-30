import 'dotenv/config';
import { Orchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';
import { logger } from './utils/logger.js';

function usage(): string {
  return 'Usage: npm run dev -- <owner> <repo> <prNumber>\nExample: npm run dev -- airaamane simple-todo-app 1';
}

function fail(message: string): never {
  console.error(`Error: ${message}\n\n${usage()}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const [, , owner, repo, prRaw] = process.argv;
  if (!owner || !repo || !prRaw) {
    fail('All three arguments (owner, repo, prNumber) are required.');
  }
  const prNumber = Number.parseInt(prRaw, 10);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    fail(`PR number must be a valid positive integer (got "${prRaw}").`);
  }

  // ── Authentication validation ──
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const awsKey = process.env.AWS_ACCESS_KEY_ID;
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;
  const hasAnthropic = !!anthropicKey;
  const hasAws = !!awsKey && !!awsSecret;
  if (!hasAnthropic && !hasAws) {
    fail(
      'No credentials found. Set ANTHROPIC_API_KEY (or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION).',
    );
  }
  if (hasAws && !awsRegion) {
    fail('AWS_REGION is required when using AWS credentials.');
  }
  logger.info(
    `Auth: using ${hasAnthropic ? 'Anthropic API key' : 'AWS credentials'}.`,
  );

  // ── Model validation ──
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) {
    fail(
      'ANTHROPIC_MODEL is required. Example: ANTHROPIC_MODEL=claude-sonnet-4-5-20250929 (Anthropic) or a Bedrock model id.',
    );
  }

  // ── GitHub token validation (used by the GitHub MCP server) ──
  // src/config/mcp.config.ts maps GITHUB_PERSONAL_ACCESS_TOKEN from
  // process.env.GITHUB_TOKEN, so fail early with a helpful message
  // instead of letting the MCP server fail later.
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    fail(
      'GITHUB_TOKEN is required for GitHub MCP access. Create a token with repo read access at https://github.com/settings/tokens and set GITHUB_TOKEN.',
    );
  }

  if (!process.env.PROJECT_ROOT) {
    logger.warn('PROJECT_ROOT is not set; continuing with cwd.');
  }

  try {
    const orchestrator = new Orchestrator();
    logger.info(`Reviewing PR ${owner}/${repo}#${prNumber} ...`);
    const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);
    const generator = new ReportGenerator('reports');
    const base = `${owner}_${repo}_${prNumber}`;
    const paths = await generator.saveAll(report, base);
    logger.info('Reports saved:');
    for (const p of paths) logger.info(`  - ${p}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // User-friendly message, no raw stack trace.
    console.error(`Failed to review PR: ${message}`);
    process.exit(1);
  }
}

await main();
