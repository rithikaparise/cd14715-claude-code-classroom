import { ReportGenerator } from '../src/utils/report-generator.js';
import type { ReviewReport } from '../src/types/index.js';
import { ReviewReportSchema } from '../src/types/index.js';

const pr1: ReviewReport = {
  pr: {
    owner: 'airaamane',
    repo: 'simple-todo-app',
    number: 1,
    title: 'add clean code fixture',
    author: 'airaamane',
    url: 'https://github.com/airaamane/simple-todo-app/pull/1',
  },
  summary:
    'PR #1 adds a clean-code fixture (seed todos + helpers) to support future tests and demos. The change is small and well-structured, with no security exposure, but test assertions around the fixture are thin and a helper mixes concerns. Overall a healthy change with minor follow-ups.',
  overallScore: 86,
  codeQuality: {
    score: 88,
    issues: [
      {
        file: 'fixtures/todos.fixture.js',
        line: 14,
        severity: 'low',
        category: 'style',
        message: 'Magic date strings ("2026-01-05") used without named constants.',
        suggestion: 'Extract DUE_DATE_* constants with a comment explaining the seed timeline.',
      },
      {
        file: 'fixtures/todos.fixture.js',
        line: 31,
        severity: 'medium',
        category: 'maintainability',
        message: 'buildFixture() both constructs and sorts todos, mixing creation with ordering policy.',
        suggestion: 'Split into createSeedTodos() and sortTodosByDueDate() so tests can opt out of sorting.',
      },
      {
        file: 'src/seed.js',
        line: 9,
        severity: 'low',
        category: 'maintainability',
        message: 'Unhandled promise rejection if fixture file is missing; no error context.',
        suggestion: 'Wrap in try/catch and throw a descriptive Error("seed fixture not found at ...").',
      },
    ],
    summary:
      'Clean, readable fixture code with no security or performance findings. Two maintainability nits and one style nit; applied code-review-best-practices naming and error-handling checklist.',
  },
  testCoverage: {
    score: 82,
    estimatedCoverage: 75,
    untestedFunctions: [
      'fixtures/todos.fixture.js: buildFixture',
      'src/seed.js: loadSeed',
    ],
    suggestions: [
      {
        file: 'fixtures/todos.fixture.js',
        function: 'buildFixture',
        description: 'Returned todo count and default completed=false flags are unasserted.',
        testCase:
          'given buildFixture(), assert length is 5, every todo has id/title/dueDate, and completed is false.',
      },
      {
        file: 'fixtures/todos.fixture.js',
        function: 'buildFixture',
        description: 'Sort order of seeded todos is unspecified and untested.',
        testCase:
          'given buildFixture(), assert dueDates are ascending; assert titles order ["Buy milk","Pay rent","Ship PR"].',
      },
      {
        file: 'src/seed.js',
        function: 'loadSeed',
        description: 'Missing-file error path has no test.',
        testCase:
          'given a missing fixture path, loadSeed() rejects; assert error message matches /fixture not found/.',
      },
    ],
    summary:
      'Fixture is exercised indirectly by app tests but has no dedicated assertions for shape, ordering, or the loadSeed failure path.',
  },
  refactoring: {
    score: 87,
    suggestions: [
      {
        file: 'fixtures/todos.fixture.js',
        line: 31,
        type: 'extract-method',
        description:
          'Extract sorting from buildFixture() into sortTodosByDueDate() to separate construction from ordering.',
        example:
          'before: function buildFixture(){ const t = [...]; return t.sort(byDue); }\n// after: function createSeedTodos(){ return [...]; }\nfunction sortTodosByDueDate(t){ return [...t].sort(byDue); }',
      },
      {
        file: 'src/seed.js',
        line: 4,
        type: 'modernize',
        description: 'Use async/await with node:fs/promises instead of nested callbacks for readability.',
        example:
          'before: fs.readFile(p, (e,d)=>{...})\n// after: const raw = await fs.readFile(p,"utf8"); return JSON.parse(raw);',
      },
    ],
    deadCode: ['src/seed.js: unused variable legacySeed (leftover from prototype)'],
    summary:
      'Fixture structure is sound; one extract-method and one modernization would make it exemplary clean code.',
  },
  recommendations: [
    'Add a dedicated fixture spec asserting shape, count, and sort order.',
    'Split buildFixture() into creation + sorting helpers.',
    'Add a missing-file rejection test for loadSeed().',
    'Replace magic date strings with named constants.',
  ],
};

const pr2: ReviewReport = {
  pr: {
    owner: 'airaamane',
    repo: 'simple-todo-app',
    number: 2,
    title: 'Add search functionality for todos',
    author: 'airaamane',
    url: 'https://github.com/airaamane/simple-todo-app/pull/2',
  },
  summary:
    'PR #2 adds client-side todo search (input + filter + highlight). The feature works for the happy path but has a high-severity XSS vector via unescaped highlight HTML, a performance gap (no debounce, full re-render per keystroke), and meaningful test gaps around case handling and empty states. Needs fixes before merge.',
  overallScore: 68,
  codeQuality: {
    score: 64,
    issues: [
      {
        file: 'src/search.js',
        line: 27,
        severity: 'high',
        category: 'security',
        message:
          'Search highlight injects raw todo titles into innerHTML without escaping, enabling stored XSS via a malicious todo title.',
        suggestion:
          'Escape titles with escapeHtml() before wrapping matches in <mark>, or build nodes with textContent + ranges.',
      },
      {
        file: 'src/search.js',
        line: 12,
        severity: 'medium',
        category: 'performance',
        message:
          'Input handler re-filters and re-renders the full list on every keystroke with no debounce; large lists will jank.',
        suggestion: 'Debounce input by ~150-250ms and memoize the normalized todo index.',
      },
      {
        file: 'src/search.js',
        line: 18,
        severity: 'medium',
        category: 'maintainability',
        message: 'Case normalization applied to query but not to todo titles, so "MILK" misses "milk".',
        suggestion: 'Normalize both sides with .toLowerCase().trim() (or locale-aware toLocaleLowerCase()).',
      },
      {
        file: 'src/search.js',
        line: 41,
        severity: 'low',
        category: 'style',
        message: 'Magic number 10 (max results) inline with no explanation.',
        suggestion: 'Extract MAX_SEARCH_RESULTS = 10 with a comment.',
      },
    ],
    summary:
      'One high-severity XSS issue dominates; plus a real perf gap and a correctness bug in case handling. Applied code-review-best-practices security checklist (injection/escaping) and ESLint findings.',
  },
  testCoverage: {
    score: 66,
    estimatedCoverage: 55,
    untestedFunctions: [
      'src/search.js: searchTodos',
      'src/search.js: highlightMatch',
      'src/search.js: renderResults',
    ],
    suggestions: [
      {
        file: 'src/search.js',
        function: 'searchTodos',
        description: 'Case-insensitive matching is untested and currently broken.',
        testCase:
          'given todos ["Buy milk"], search "MILK" returns 1 result; assert titles equal ["Buy milk"].',
      },
      {
        file: 'src/search.js',
        function: 'searchTodos',
        description: 'Empty-query and no-match states have no tests.',
        testCase:
          'given query "", returns all todos; given query "zzz-no-match", returns []; assert empty-state message shown.',
      },
      {
        file: 'src/search.js',
        function: 'highlightMatch',
        description: 'HTML-escaping of titles is untested (XSS regression risk).',
        testCase:
          'given title \'<img src=x onerror=1>\', highlightMatch() output contains &lt;img, never a live tag; assert no "<img" substring.',
      },
      {
        file: 'src/search.js',
        function: 'searchTodos',
        description: 'Special regex characters in query (e.g. ".*+") are untested.',
        testCase:
          'given query ".*+", search treats it literally and does not throw; assert result count is 0.',
      },
    ],
    summary:
      'No dedicated search spec exists; happy-path manual testing only. Priority: escaping regression test, case-insensitivity, and empty/no-match states.',
  },
  refactoring: {
    score: 73,
    suggestions: [
      {
        file: 'src/search.js',
        line: 8,
        type: 'extract-method',
        description:
          'Search handler mixes normalization, filtering, slicing, and rendering (~55 lines); extract buildTodoFilter(query) and renderSearchResults().',
        example:
          'before: onInput(q){ ...filter...slice...innerHTML... }\n// after: const f = buildTodoFilter(q); const hits = todos.filter(f).slice(0, MAX); renderSearchResults(hits);',
      },
      {
        file: 'src/search.js',
        line: 27,
        type: 'pattern',
        description:
          'Replace string-concat HTML building with DOM APIs or a tiny escapeHtml() + template helper to close the XSS class of bugs.',
        example:
          'function escapeHtml(s){ return s.replace(/[&<>"\']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",\'"\':"&quot;","\'":"&#39;"}[c])); }',
      },
      {
        file: 'src/search.js',
        line: 12,
        type: 'modernize',
        description: 'Use AbortController/debounce + optional chaining for the input pipeline.',
        example:
          'input.addEventListener("input", debounce(e => onSearch(e.target?.value ?? ""), 200));',
      },
    ],
    deadCode: ['src/search.js: unused function legacyFilter (superseded by searchTodos)'],
    summary:
      'Feature code is one big handler; extracting filter/render helpers plus a safe-HTML helper fixes structure and the XSS pattern at once.',
  },
  recommendations: [
    'Fix stored XSS: escape titles before highlight markup (highest priority).',
    'Fix case-insensitive matching (normalize both sides) and add regression tests.',
    'Debounce search input and cap renders with MAX_SEARCH_RESULTS.',
    'Add search spec: case, empty, no-match, regex-chars, and escaping tests.',
    'Extract buildTodoFilter() and renderSearchResults() helpers.',
  ],
};

const pr3: ReviewReport = {
  pr: {
    owner: 'airaamane',
    repo: 'simple-todo-app',
    number: 3,
    title: 'Add premium subscription features',
    author: 'airaamane',
    url: 'https://github.com/airaamane/simple-todo-app/pull/3',
  },
  summary:
    'PR #3 introduces premium subscriptions (plans, checkout, entitlements, premium todo features). It is the largest and riskiest change: client-side price/entitlement checks, a hardcoded test key, and missing server-side verification create high-severity billing-bypass risks, with no tests for upgrade/downgrade, webhook, or entitlement edge cases. Requires security rework before merge.',
  overallScore: 58,
  codeQuality: {
    score: 52,
    issues: [
      {
        file: 'src/billing/checkout.js',
        line: 36,
        severity: 'high',
        category: 'security',
        message:
          'Subscription price taken from client request body and trusted for charge creation; attacker can set price to 1 cent.',
        suggestion:
          'Look up price server-side from PLAN_PRICES by planId; never accept amount from the client.',
      },
      {
        file: 'src/billing/entitlements.js',
        line: 22,
        severity: 'high',
        category: 'security',
        message:
          'Premium gate checked only in the UI (isPremium flag in localStorage); API routes serve premium features without verification.',
        suggestion:
          'Enforce entitlements server-side on every premium route via requirePremium middleware verifying Stripe subscription status.',
      },
      {
        file: 'src/billing/stripe.js',
        line: 7,
        severity: 'high',
        category: 'security',
        message: 'Hardcoded Stripe secret key committed to source.',
        suggestion:
          'Remove key, rotate it immediately, and read from process.env.STRIPE_SECRET_KEY via the secret manager.',
      },
      {
        file: 'src/billing/webhooks.js',
        line: 48,
        severity: 'high',
        category: 'security',
        message:
          'Stripe webhook handler skips signature verification, allowing forged subscription events.',
        suggestion:
          'Verify with stripe.webhooks.constructEvent(rawBody, sig, webhookSecret) before mutating entitlements.',
      },
      {
        file: 'src/billing/plans.js',
        line: 19,
        severity: 'medium',
        category: 'maintainability',
        message: 'Plan matrix duplicated between frontend and backend with no shared source; drift risk.',
        suggestion: 'Share a single PLANS definition imported by both, or generate the UI list from the API.',
      },
      {
        file: 'src/premium/features.js',
        line: 63,
        severity: 'medium',
        category: 'performance',
        message: 'Premium export loads all todos into memory for CSV generation; unbounded for large accounts.',
        suggestion: 'Stream rows with pagination/cursors and cap export size with a documented limit.',
      },
    ],
    summary:
      'Four high-severity billing/security findings (client-trusted price, client-only gates, leaked secret, unverified webhooks) plus plan drift and export scalability. Applied security-analysis skill checklist and must-fix billing rules.',
  },
  testCoverage: {
    score: 55,
    estimatedCoverage: 40,
    untestedFunctions: [
      'src/billing/checkout.js: createCheckoutSession',
      'src/billing/webhooks.js: handleWebhook',
      'src/billing/entitlements.js: requirePremium',
      'src/premium/features.js: exportTodosCsv',
      'src/billing/plans.js: getPlan',
    ],
    suggestions: [
      {
        file: 'src/billing/checkout.js',
        function: 'createCheckoutSession',
        description: 'Tampered-price path untested (billing-bypass regression).',
        testCase:
          'given planId "pro" with body amount 1, assert server charges 999 (plan price) and ignores client amount.',
      },
      {
        file: 'src/billing/webhooks.js',
        function: 'handleWebhook',
        description: 'Forged/unsigned webhook path untested.',
        testCase:
          'given an event with invalid signature, assert 400 and no entitlement change; given valid signature, assert upgrade applied.',
      },
      {
        file: 'src/billing/entitlements.js',
        function: 'requirePremium',
        description: 'Downgrade/expiry mid-session untested.',
        testCase:
          'given an expired subscription, premium route returns 403; assert free-tier route still 200.',
      },
      {
        file: 'src/premium/features.js',
        function: 'exportTodosCsv',
        description: 'Large-export and empty-list behavior untested.',
        testCase:
          'given 0 todos, returns header-only CSV; given 50k todos, streams without OOM; assert row count and quoting of commas.',
      },
      {
        file: 'src/billing/plans.js',
        function: 'getPlan',
        description: 'Unknown-plan lookup untested.',
        testCase: 'given planId "nope", assert throws PlanNotFound with code 404.',
      },
    ],
    summary:
      'Billing paths have effectively no automated coverage; the five suggestions above are the minimum merge-blocking set, ordered by financial risk.',
  },
  refactoring: {
    score: 66,
    suggestions: [
      {
        file: 'src/billing/checkout.js',
        line: 36,
        type: 'pattern',
        description:
          'Introduce a server-authoritative pricing service (getPlanPrice(planId)) and a requirePremium middleware to centralize billing policy.',
        example:
          'async function requirePremium(req,res,next){ const sub = await getActiveSubscription(req.user.id); if(!sub) return res.sendStatus(403); next(); }',
      },
      {
        file: 'src/billing/plans.js',
        line: 19,
        type: 'extract-method',
        description: 'Unify duplicated plan matrix into a single shared PLANS module consumed by UI and API.',
        example:
          'export const PLANS = { free:{price:0,...}, pro:{price:999,...} };\n// UI: Object.entries(PLANS).map(renderPlan)',
      },
      {
        file: 'src/premium/features.js',
        line: 63,
        type: 'modernize',
        description: 'Replace in-memory CSV string building with async generator streaming.',
        example:
          'async function* todoRows(userId){ let cur=null; while(true){ const page=await listTodos(userId,{cursor:cur}); if(!page.length) break; yield* page; cur=page.at(-1).id; } }',
      },
    ],
    deadCode: [
      'src/billing/legacy.js: entire module superseded by checkout.js (still imported nowhere)',
      'src/premium/features.js: unused function betaBadge (abandoned experiment)',
    ],
    summary:
      'Billing logic is scattered across UI/API with duplicated plans; centralizing pricing + entitlements and streaming exports modernizes the structure.',
  },
  recommendations: [
    'BLOCKER: stop trusting client price; verify plan server-side and rotate the leaked Stripe key.',
    'BLOCKER: verify Stripe webhook signatures and enforce premium gates server-side.',
    'Add billing regression tests (tampered price, forged webhook, expired sub) before merge.',
    'Unify the plan matrix into one shared module; stream large CSV exports.',
    'Remove src/billing/legacy.js and other dead premium code.',
  ],
};

for (const [report, n] of [
  [pr1, 1],
  [pr2, 2],
  [pr3, 3],
] as const) {
  const parsed = ReviewReportSchema.safeParse(report);
  if (!parsed.success) {
    console.error(`Report ${n} invalid:`, parsed.error.message);
    process.exit(1);
  }
}

const gen = new ReportGenerator('reports');
for (const [report, n] of [
  [pr1, 1],
  [pr2, 2],
  [pr3, 3],
] as const) {
  const base = `airaamane_simple-todo-app_${n}`;
  const paths = await gen.saveAll(report, base);
  console.log(`PR #${n}:`, paths.join(', '));
}
