# Friday close: making the review trustworthy

## What I prioritized

Sofia could not trust Friday close: she could not reconcile the numbers, tell which entries an action would affect, or rely on a reviewed record staying accurate. I prioritized predictable review for 28 September–4 October 2026.

## What changed

Description edits preserve non-billable time. Rows, totals and Export view now share the same week and filters; selecting entries never changes export scope.

Individual and bulk corrections share review invalidation: changes to date, employee, client, duration, billability or description require another review. Unchanged saves preserve review. Undo restores only changed entries; conflicts with newer work stop the entire undo with an explanation.

The workflow makes scope visible: selection clears when the view changes, shows count/duration, and action buttons name the operation and destination. Weekly progress stays separate from filtered totals. URL-backed review context survives refresh and Back/Forward, without restoring selection. This addresses context lost during my browser review.

I preserved supplied records, backup format and styling, without adding dependencies.

## Evidence

- `npm run check`: 56 unit/component tests, TypeScript and production build pass.
- `npm run test:e2e`: 22 desktop/mobile Chromium checks pass, covering CSV contents, corrections, persistence, Undo conflicts, navigation, progress, viewport fit and axe accessibility scans.
- Calendar/accounting/review tests passed in Bucharest, Los Angeles and Auckland timezones. Formatting and GitHub CI passed. I also completed the browser review.

## Release judgment

I would release to the fictional local pilot. Undo remains temporary, single-level and value-based. Safari/Firefox and manual assistive-technology testing remain unverified. Links preserve context, not data. I deferred dark theme and repeat-entry to protect billing correctness.

## AI ownership

Codex assisted diagnosis, implementation and tests. Final review caught an AI-introduced URL bug that cleared the literal search `all`; regression tests reproduced it before correction.
