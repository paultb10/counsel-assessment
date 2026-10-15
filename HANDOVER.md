# Release handover

## Changed and why

Prioritized billing correctness for 28 September–4 October 2026.

- Editing descriptions preserves existing billability. Rows, totals and Export view now use identical week/filter scope; selection affects actions only.
- Meaningful changes to date, employee, client, duration, billability or description require review again. Bulk client/billability corrections use the same rule; unchanged saves preserve review.
- Undo restores only entries changed by the last effective review action, preserving unrelated work. Conflicting newer edits, deletions or missing original clients produce an explanation without partial restoration.

Workflow improvement: previously, switching filters could leave hidden action targets. Selection now clears with an announcement when the week/filters change, is limited to visible entries, and shows count/duration with a Clear selection control.

Preserved supplied records, backup format and styling; added no dependencies.

## Verification

- `npm run check`: 49 unit/component tests pass; TypeScript and production build pass.
- `npm run test:e2e`: 18 desktop/mobile Chromium checks pass, including actual CSV contents, corrections, saved-data persistence, successful/conflicting Undo, viewport fit and axe WCAG A/AA scans.
- Calendar/accounting/review tests pass in Europe/Bucharest, America/Los_Angeles and Pacific/Auckland, covering month boundaries and integer-minute totals.

Regression tests cover all six correction fields, unchanged saves, combined/empty filters, selection-independent exports and preservation of unrelated work.

## Remaining and release recommendation

Recommend release to the fictional local pilot. Refresh preserves records but returns to Time entries and resets review context. Undo is temporary, single-level and compares current values. Safari/Firefox and manual assistive-technology testing remain unverified.

Deferred dark theme, repeat-entry and additional review shortcuts to prioritize billing correctness. Next improvement: URL-backed navigation/filters.

## AI collaboration

Codex assisted diagnosis, implementation and tests. Tests check the brief and distinguish unchanged saves from corrections and safe Undo from conflicting newer work. Test-harness failures were corrected before claiming passing checks.
