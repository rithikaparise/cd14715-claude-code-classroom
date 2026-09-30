# Code Review — airaamane/simple-todo-app #1

**add clean code fixture** by airaamane
<https://github.com/airaamane/simple-todo-app/pull/1>

**Overall score:** 86/100

## Summary

PR #1 adds a clean-code fixture (seed todos + helpers) to support future tests and demos. The change is small and well-structured, with no security exposure, but test assertions around the fixture are thin and a helper mixes concerns. Overall a healthy change with minor follow-ups.

## Code Quality (88/100)

Clean, readable fixture code with no security or performance findings. Two maintainability nits and one style nit; applied code-review-best-practices naming and error-handling checklist.

- **[low/style]** `fixtures/todos.fixture.js:14` — Magic date strings ("2026-01-05") used without named constants. **Fix:** Extract DUE_DATE_* constants with a comment explaining the seed timeline.
- **[medium/maintainability]** `fixtures/todos.fixture.js:31` — buildFixture() both constructs and sorts todos, mixing creation with ordering policy. **Fix:** Split into createSeedTodos() and sortTodosByDueDate() so tests can opt out of sorting.
- **[low/maintainability]** `src/seed.js:9` — Unhandled promise rejection if fixture file is missing; no error context. **Fix:** Wrap in try/catch and throw a descriptive Error("seed fixture not found at ...").

## Test Coverage (82/100, est. 75%)

Fixture is exercised indirectly by app tests but has no dedicated assertions for shape, ordering, or the loadSeed failure path.

**Untested:**
- `fixtures/todos.fixture.js: buildFixture`
- `src/seed.js: loadSeed`

- `fixtures/todos.fixture.js` :: **buildFixture** — Returned todo count and default completed=false flags are unasserted. **Test:** given buildFixture(), assert length is 5, every todo has id/title/dueDate, and completed is false.
- `fixtures/todos.fixture.js` :: **buildFixture** — Sort order of seeded todos is unspecified and untested. **Test:** given buildFixture(), assert dueDates are ascending; assert titles order ["Buy milk","Pay rent","Ship PR"].
- `src/seed.js` :: **loadSeed** — Missing-file error path has no test. **Test:** given a missing fixture path, loadSeed() rejects; assert error message matches /fixture not found/.

## Refactoring (87/100)

Fixture structure is sound; one extract-method and one modernization would make it exemplary clean code.

- `fixtures/todos.fixture.js:31` **[extract-method]** — Extract sorting from buildFixture() into sortTodosByDueDate() to separate construction from ordering.

```js
before: function buildFixture(){ const t = [...]; return t.sort(byDue); }
// after: function createSeedTodos(){ return [...]; }
function sortTodosByDueDate(t){ return [...t].sort(byDue); }
```
- `src/seed.js:4` **[modernize]** — Use async/await with node:fs/promises instead of nested callbacks for readability.

```js
before: fs.readFile(p, (e,d)=>{...})
// after: const raw = await fs.readFile(p,"utf8"); return JSON.parse(raw);
```

**Dead code:**
- `src/seed.js: unused variable legacySeed (leftover from prototype)`

## Recommendations

1. Add a dedicated fixture spec asserting shape, count, and sort order.
2. Split buildFixture() into creation + sorting helpers.
3. Add a missing-file rejection test for loadSeed().
4. Replace magic date strings with named constants.
