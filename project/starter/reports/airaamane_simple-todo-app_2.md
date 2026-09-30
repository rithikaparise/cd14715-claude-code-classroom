# Code Review — airaamane/simple-todo-app #2

**Add search functionality for todos** by airaamane
<https://github.com/airaamane/simple-todo-app/pull/2>

**Overall score:** 68/100

## Summary

PR #2 adds client-side todo search (input + filter + highlight). The feature works for the happy path but has a high-severity XSS vector via unescaped highlight HTML, a performance gap (no debounce, full re-render per keystroke), and meaningful test gaps around case handling and empty states. Needs fixes before merge.

## Code Quality (64/100)

One high-severity XSS issue dominates; plus a real perf gap and a correctness bug in case handling. Applied code-review-best-practices security checklist (injection/escaping) and ESLint findings.

- **[high/security]** `src/search.js:27` — Search highlight injects raw todo titles into innerHTML without escaping, enabling stored XSS via a malicious todo title. **Fix:** Escape titles with escapeHtml() before wrapping matches in <mark>, or build nodes with textContent + ranges.
- **[medium/performance]** `src/search.js:12` — Input handler re-filters and re-renders the full list on every keystroke with no debounce; large lists will jank. **Fix:** Debounce input by ~150-250ms and memoize the normalized todo index.
- **[medium/maintainability]** `src/search.js:18` — Case normalization applied to query but not to todo titles, so "MILK" misses "milk". **Fix:** Normalize both sides with .toLowerCase().trim() (or locale-aware toLocaleLowerCase()).
- **[low/style]** `src/search.js:41` — Magic number 10 (max results) inline with no explanation. **Fix:** Extract MAX_SEARCH_RESULTS = 10 with a comment.

## Test Coverage (66/100, est. 55%)

No dedicated search spec exists; happy-path manual testing only. Priority: escaping regression test, case-insensitivity, and empty/no-match states.

**Untested:**
- `src/search.js: searchTodos`
- `src/search.js: highlightMatch`
- `src/search.js: renderResults`

- `src/search.js` :: **searchTodos** — Case-insensitive matching is untested and currently broken. **Test:** given todos ["Buy milk"], search "MILK" returns 1 result; assert titles equal ["Buy milk"].
- `src/search.js` :: **searchTodos** — Empty-query and no-match states have no tests. **Test:** given query "", returns all todos; given query "zzz-no-match", returns []; assert empty-state message shown.
- `src/search.js` :: **highlightMatch** — HTML-escaping of titles is untested (XSS regression risk). **Test:** given title '<img src=x onerror=1>', highlightMatch() output contains &lt;img, never a live tag; assert no "<img" substring.
- `src/search.js` :: **searchTodos** — Special regex characters in query (e.g. ".*+") are untested. **Test:** given query ".*+", search treats it literally and does not throw; assert result count is 0.

## Refactoring (73/100)

Feature code is one big handler; extracting filter/render helpers plus a safe-HTML helper fixes structure and the XSS pattern at once.

- `src/search.js:8` **[extract-method]** — Search handler mixes normalization, filtering, slicing, and rendering (~55 lines); extract buildTodoFilter(query) and renderSearchResults().

```js
before: onInput(q){ ...filter...slice...innerHTML... }
// after: const f = buildTodoFilter(q); const hits = todos.filter(f).slice(0, MAX); renderSearchResults(hits);
```
- `src/search.js:27` **[pattern]** — Replace string-concat HTML building with DOM APIs or a tiny escapeHtml() + template helper to close the XSS class of bugs.

```js
function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
```
- `src/search.js:12` **[modernize]** — Use AbortController/debounce + optional chaining for the input pipeline.

```js
input.addEventListener("input", debounce(e => onSearch(e.target?.value ?? ""), 200));
```

**Dead code:**
- `src/search.js: unused function legacyFilter (superseded by searchTodos)`

## Recommendations

1. Fix stored XSS: escape titles before highlight markup (highest priority).
2. Fix case-insensitive matching (normalize both sides) and add regression tests.
3. Debounce search input and cap renders with MAX_SEARCH_RESULTS.
4. Add search spec: case, empty, no-match, regex-chars, and escaping tests.
5. Extract buildTodoFilter() and renderSearchResults() helpers.
