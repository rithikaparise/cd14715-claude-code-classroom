# Code Review — airaamane/simple-todo-app #3

**Add premium subscription features** by airaamane
<https://github.com/airaamane/simple-todo-app/pull/3>

**Overall score:** 58/100

## Summary

PR #3 introduces premium subscriptions (plans, checkout, entitlements, premium todo features). It is the largest and riskiest change: client-side price/entitlement checks, a hardcoded test key, and missing server-side verification create high-severity billing-bypass risks, with no tests for upgrade/downgrade, webhook, or entitlement edge cases. Requires security rework before merge.

## Code Quality (52/100)

Four high-severity billing/security findings (client-trusted price, client-only gates, leaked secret, unverified webhooks) plus plan drift and export scalability. Applied security-analysis skill checklist and must-fix billing rules.

- **[high/security]** `src/billing/checkout.js:36` — Subscription price taken from client request body and trusted for charge creation; attacker can set price to 1 cent. **Fix:** Look up price server-side from PLAN_PRICES by planId; never accept amount from the client.
- **[high/security]** `src/billing/entitlements.js:22` — Premium gate checked only in the UI (isPremium flag in localStorage); API routes serve premium features without verification. **Fix:** Enforce entitlements server-side on every premium route via requirePremium middleware verifying Stripe subscription status.
- **[high/security]** `src/billing/stripe.js:7` — Hardcoded Stripe secret key committed to source. **Fix:** Remove key, rotate it immediately, and read from process.env.STRIPE_SECRET_KEY via the secret manager.
- **[high/security]** `src/billing/webhooks.js:48` — Stripe webhook handler skips signature verification, allowing forged subscription events. **Fix:** Verify with stripe.webhooks.constructEvent(rawBody, sig, webhookSecret) before mutating entitlements.
- **[medium/maintainability]** `src/billing/plans.js:19` — Plan matrix duplicated between frontend and backend with no shared source; drift risk. **Fix:** Share a single PLANS definition imported by both, or generate the UI list from the API.
- **[medium/performance]** `src/premium/features.js:63` — Premium export loads all todos into memory for CSV generation; unbounded for large accounts. **Fix:** Stream rows with pagination/cursors and cap export size with a documented limit.

## Test Coverage (55/100, est. 40%)

Billing paths have effectively no automated coverage; the five suggestions above are the minimum merge-blocking set, ordered by financial risk.

**Untested:**
- `src/billing/checkout.js: createCheckoutSession`
- `src/billing/webhooks.js: handleWebhook`
- `src/billing/entitlements.js: requirePremium`
- `src/premium/features.js: exportTodosCsv`
- `src/billing/plans.js: getPlan`

- `src/billing/checkout.js` :: **createCheckoutSession** — Tampered-price path untested (billing-bypass regression). **Test:** given planId "pro" with body amount 1, assert server charges 999 (plan price) and ignores client amount.
- `src/billing/webhooks.js` :: **handleWebhook** — Forged/unsigned webhook path untested. **Test:** given an event with invalid signature, assert 400 and no entitlement change; given valid signature, assert upgrade applied.
- `src/billing/entitlements.js` :: **requirePremium** — Downgrade/expiry mid-session untested. **Test:** given an expired subscription, premium route returns 403; assert free-tier route still 200.
- `src/premium/features.js` :: **exportTodosCsv** — Large-export and empty-list behavior untested. **Test:** given 0 todos, returns header-only CSV; given 50k todos, streams without OOM; assert row count and quoting of commas.
- `src/billing/plans.js` :: **getPlan** — Unknown-plan lookup untested. **Test:** given planId "nope", assert throws PlanNotFound with code 404.

## Refactoring (66/100)

Billing logic is scattered across UI/API with duplicated plans; centralizing pricing + entitlements and streaming exports modernizes the structure.

- `src/billing/checkout.js:36` **[pattern]** — Introduce a server-authoritative pricing service (getPlanPrice(planId)) and a requirePremium middleware to centralize billing policy.

```js
async function requirePremium(req,res,next){ const sub = await getActiveSubscription(req.user.id); if(!sub) return res.sendStatus(403); next(); }
```
- `src/billing/plans.js:19` **[extract-method]** — Unify duplicated plan matrix into a single shared PLANS module consumed by UI and API.

```js
export const PLANS = { free:{price:0,...}, pro:{price:999,...} };
// UI: Object.entries(PLANS).map(renderPlan)
```
- `src/premium/features.js:63` **[modernize]** — Replace in-memory CSV string building with async generator streaming.

```js
async function* todoRows(userId){ let cur=null; while(true){ const page=await listTodos(userId,{cursor:cur}); if(!page.length) break; yield* page; cur=page.at(-1).id; } }
```

**Dead code:**
- `src/billing/legacy.js: entire module superseded by checkout.js (still imported nowhere)`
- `src/premium/features.js: unused function betaBadge (abandoned experiment)`

## Recommendations

1. BLOCKER: stop trusting client price; verify plan server-side and rotate the leaked Stripe key.
2. BLOCKER: verify Stripe webhook signatures and enforce premium gates server-side.
3. Add billing regression tests (tampered price, forged webhook, expired sub) before merge.
4. Unify the plan matrix into one shared module; stream large CSV exports.
5. Remove src/billing/legacy.js and other dead premium code.
