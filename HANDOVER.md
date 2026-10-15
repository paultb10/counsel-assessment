# Release handover

## Changed and why

Improved Friday close for 28 September–4 October 2026.

- Description edits preserve billability. Rows, totals and Export view share week/filter scope; selection affects actions only.
- Meaningful changes to date, employee, client, duration, billability or description require review again. Bulk client/billability corrections share this rule; unchanged saves preserve review.
- Undo restores only changed entries, preserving independent work. Conflicting newer edits, deletions or missing original clients are declined atomically with an explanation.

Friday-close improvement: previously, filters could hide selected action targets and refresh lost review context. Selection now clears on view changes, shows count/duration and offers Clear selection. Action buttons name their operation, count and destination. URL-backed page/week/filters/search survive refresh and Back/Forward; selection never does. Whole-week reviewed/pending progress remains explicitly separate from filtered totals, with empty/complete states.

Preserved records, backup format and styling; added no dependencies.

## Verification

- `npm run check`: 55 unit/component tests pass; TypeScript and production build pass.
- `npm run test:e2e`: 22 desktop/mobile Chromium checks pass, including CSV contents, corrections, saved-data persistence, successful/conflicting Undo, refresh and Back/Forward, selection clearing, weekly progress, viewport fit and axe WCAG A/AA scans.
- Calendar/accounting/review tests passed in Europe/Bucharest, America/Los_Angeles and Pacific/Auckland, including month boundaries and integer-minute totals.

Regression coverage includes all six correction fields, unchanged saves, combined/empty filters, selection-independent exports and independent work during Undo.

## Remaining and release recommendation

Recommend release to the fictional local pilot. Undo is temporary, single-level and compares current values. Safari/Firefox and manual assistive-technology testing remain unverified. Links preserve filters, not workspace data.

Deferred dark theme and repeat-entry to prioritize the core workflow.

## AI collaboration

Codex assisted diagnosis, implementation and tests. Tests check the brief and distinguish unchanged saves from corrections and safe Undo from conflicting newer work. Test-harness failures were corrected before reporting passing checks.
