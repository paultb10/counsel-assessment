# Release handover

## Changed

Improved Friday review for 28 September–4 October 2026.

Description edits now preserve non-billable time. Weekly rows, totals and Export view share the active week and filters; selecting rows never narrows export. Individual and bulk corrections share review invalidation across date, employee, client, duration, billability and description. Unchanged saves retain review.

Undo records only changed entries, preserves independent workspace changes, and declines conflicting edits/deletions or missing original clients before restoring anything. Assumption: reject the whole conflicting undo rather than partially restore it; only the last effective review action is undoable in this mounted view.

Workflow improvement: selection is restricted to visible records, clears when week/filters change, with an announcement, shows selected count and duration, and offers Clear selection. Previously, hidden selections could affect another view. Existing CSS and backup format are preserved; no dependencies added.

## Verified

- `npm run check`: 49 unit/component tests pass; TypeScript and production build pass.
- `npm run test:e2e`: 18 desktop/mobile Chromium checks pass, including pilot restoration, filtered CSV contents, non-billable editing, review invalidation, persistence, safe/conflicting Undo, viewport fit and axe WCAG A/AA scans.
- Calendar/accounting/review tests pass under Europe/Bucharest, America/Los_Angeles and Pacific/Auckland. Dates remain local calendar dates; totals use integer minutes.

Tests cover all six correction fields, unchanged saves, week boundaries, combined/empty filters, selection-independent exports and independent work during Undo.

## Remaining and release recommendation

Release to the fictional local pilot. Native Safari/Firefox and manual assistive-technology testing remain unverified. Undo is temporary, single-level and compares current values; this is not an immutable audit ledger. Dark theme, repeat-entry and additional review shortcuts were deferred to prioritize correctness.

## AI use

Codex assisted diagnosis, implementation and tests. Generated changes were checked against explicit invariants, including unchanged saves and conflicting Undo. Initial test-harness failures were corrected before reporting passing results.
