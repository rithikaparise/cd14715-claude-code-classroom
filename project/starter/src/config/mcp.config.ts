/**
 * MCP server configurations for external tool integration.
 *
 * - GitHub MCP server: fetches PR data, repository information, file diffs.
 * - ESLint MCP server: lints JavaScript/TypeScript for style and correctness.
 */

const githubToken = process.env.GITHUB_TOKEN ?? '';

export const githubMcpServer = {
  type: 'stdio' as const,
  command: 'npx' as const,
  args: ['-y', '@modelcontextprotocol/server-github'],
  env: {
    GITHUB_PERSONAL_ACCESS_TOKEN: githubToken,
  },
};

export const eslintMcpServer = {
  type: 'stdio' as const,
  command: 'npx' as const,
  args: ['-y', 'eslint-mcp'],
  env: {},
};

export const mcpServers = {
  github: githubMcpServer,
  eslint: eslintMcpServer,
};

export type McpServers = typeof mcpServers;
