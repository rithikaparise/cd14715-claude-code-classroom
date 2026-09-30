import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReviewReport } from '../types/index.js';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Generates JSON / Markdown / HTML review reports. */
export class ReportGenerator {
  constructor(private outDir = 'reports') {}

  async saveAll(report: ReviewReport, baseName: string): Promise<string[]> {
    await mkdir(this.outDir, { recursive: true });
    const json = this.toJSON(report);
    const md = this.toMarkdown(report);
    const html = this.toHTML(report);
    const paths = [
      join(this.outDir, `${baseName}.json`),
      join(this.outDir, `${baseName}.md`),
      join(this.outDir, `${baseName}.html`),
    ];
    await writeFile(paths[0], json, 'utf8');
    await writeFile(paths[1], md, 'utf8');
    await writeFile(paths[2], html, 'utf8');
    return paths;
  }

  toJSON(report: ReviewReport): string {
    return JSON.stringify(report, null, 2);
  }

  toMarkdown(r: ReviewReport): string {
    const lines: string[] = [];
    lines.push(`# Code Review — ${r.pr.owner}/${r.pr.repo} #${r.pr.number}`);
    lines.push('');
    lines.push(`**${esc(r.pr.title)}**${r.pr.author ? ` by ${esc(r.pr.author)}` : ''}`);
    if (r.pr.url) lines.push(`<${r.pr.url}>`);
    lines.push('');
    lines.push(`**Overall score:** ${r.overallScore}/100`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(r.summary);
    lines.push('');
    lines.push(`## Code Quality (${r.codeQuality.score}/100)`);
    lines.push('');
    lines.push(r.codeQuality.summary);
    lines.push('');
    if (r.codeQuality.issues.length === 0) {
      lines.push('_No issues found._');
    } else {
      for (const i of r.codeQuality.issues) {
        lines.push(
          `- **[${i.severity}/${i.category}]** \`${i.file}:${i.line}\` — ${i.message}${i.suggestion ? ` **Fix:** ${i.suggestion}` : ''}`,
        );
      }
    }
    lines.push('');
    lines.push(
      `## Test Coverage (${r.testCoverage.score}/100, est. ${r.testCoverage.estimatedCoverage}%)`,
    );
    lines.push('');
    lines.push(r.testCoverage.summary);
    lines.push('');
    if (r.testCoverage.untestedFunctions.length > 0) {
      lines.push('**Untested:**');
      for (const f of r.testCoverage.untestedFunctions) lines.push(`- \`${f}\``);
      lines.push('');
    }
    for (const s of r.testCoverage.suggestions) {
      lines.push(
        `- \`${s.file}\` :: **${s.function}** — ${s.description}${s.testCase ? ` **Test:** ${s.testCase}` : ''}`,
      );
    }
    lines.push('');
    lines.push(`## Refactoring (${r.refactoring.score}/100)`);
    lines.push('');
    lines.push(r.refactoring.summary);
    lines.push('');
    for (const s of r.refactoring.suggestions) {
      lines.push(
        `- \`${s.file}${s.line ? `:${s.line}` : ''}\` **[${s.type}]** — ${s.description}`,
      );
      if (s.example) {
        lines.push('');
        lines.push('```js');
        lines.push(s.example);
        lines.push('```');
      }
    }
    if (r.refactoring.deadCode.length > 0) {
      lines.push('');
      lines.push('**Dead code:**');
      for (const d of r.refactoring.deadCode) lines.push(`- \`${d}\``);
    }
    lines.push('');
    lines.push('## Recommendations');
    lines.push('');
    r.recommendations.forEach((rec, i) => lines.push(`${i + 1}. ${rec}`));
    lines.push('');
    return lines.join('\n');
  }

  toHTML(r: ReviewReport): string {
    const issueRows = r.codeQuality.issues
      .map(
        (i) =>
          `<tr><td><code>${esc(i.file)}:${i.line}</code></td><td>${esc(i.severity)}</td><td>${esc(i.category)}</td><td>${esc(i.message)}${i.suggestion ? `<br><em>Fix: ${esc(i.suggestion)}</em>` : ''}</td></tr>`,
      )
      .join('\n') || '<tr><td colspan="4">No issues found.</td></tr>';
    const testRows = r.testCoverage.suggestions
      .map(
        (s) =>
          `<tr><td><code>${esc(s.file)}</code></td><td><code>${esc(s.function)}</code></td><td>${esc(s.description)}${s.testCase ? `<br><em>Test: ${esc(s.testCase)}</em>` : ''}</td></tr>`,
      )
      .join('\n') || '<tr><td colspan="3">No suggestions.</td></tr>';
    const refRows = r.refactoring.suggestions
      .map(
        (s) =>
          `<tr><td><code>${esc(s.file)}${s.line ? `:${s.line}` : ''}</code></td><td>${esc(s.type)}</td><td>${esc(s.description)}${s.example ? `<pre>${esc(s.example)}</pre>` : ''}</td></tr>`,
      )
      .join('\n') || '<tr><td colspan="3">No suggestions.</td></tr>';
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Code Review — ${esc(r.pr.owner)}/${esc(r.pr.repo)} #${r.pr.number}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem;color:#1a1a1a}table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border:1px solid #ddd;padding:.5rem;text-align:left;vertical-align:top}th{background:#f5f5f5}code{background:#f5f5f5;padding:.1rem .3rem;border-radius:4px}pre{background:#111;color:#eee;padding:.75rem;border-radius:8px;overflow:auto}.score{font-size:1.4rem;font-weight:700}.badge{display:inline-block;padding:.15rem .6rem;border-radius:999px;background:#eef;color:#111}</style>
</head><body>
<h1>Code Review — ${esc(r.pr.owner)}/${esc(r.pr.repo)} #${r.pr.number}</h1>
<p><strong>${esc(r.pr.title)}</strong>${r.pr.author ? ` by ${esc(r.pr.author)}` : ''}</p>
${r.pr.url ? `<p><a href="${esc(r.pr.url)}">${esc(r.pr.url)}</a></p>` : ''}
<p class="score">Overall score: <span class="badge">${r.overallScore}/100</span></p>
<h2>Summary</h2><p>${esc(r.summary)}</p>
<h2>Code Quality (${r.codeQuality.score}/100)</h2><p>${esc(r.codeQuality.summary)}</p>
<table><thead><tr><th>Location</th><th>Severity</th><th>Category</th><th>Finding</th></tr></thead><tbody>${issueRows}</tbody></table>
<h2>Test Coverage (${r.testCoverage.score}/100, est. ${r.testCoverage.estimatedCoverage}%)</h2><p>${esc(r.testCoverage.summary)}</p>
<p><strong>Untested:</strong> ${r.testCoverage.untestedFunctions.length ? r.testCoverage.untestedFunctions.map((f) => `<code>${esc(f)}</code>`).join(', ') : 'none'}</p>
<table><thead><tr><th>File</th><th>Function</th><th>Suggestion</th></tr></thead><tbody>${testRows}</tbody></table>
<h2>Refactoring (${r.refactoring.score}/100)</h2><p>${esc(r.refactoring.summary)}</p>
<table><thead><tr><th>Location</th><th>Type</th><th>Suggestion</th></tr></thead><tbody>${refRows}</tbody></table>
${r.refactoring.deadCode.length ? `<p><strong>Dead code:</strong> ${r.refactoring.deadCode.map((d) => `<code>${esc(d)}</code>`).join(', ')}</p>` : ''}
<h2>Recommendations</h2><ol>${r.recommendations.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
</body></html>`;
  }
}
