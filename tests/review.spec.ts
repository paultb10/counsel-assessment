import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import fixture from '../src/fixtures/pilot-workspace.json' with { type: 'json' };

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage data', exact: true }).click();
  await page.getByRole('button', { name: /Open pilot workspace/ }).click();
  await page.getByRole('button', { name: 'Replace and restore' }).click();
  await page
    .getByRole('button', { name: 'Weekly review', exact: true })
    .click();
});

test('filtered review totals, selection scope and CSV use the same view', async ({
  page,
}) => {
  await expect(page.getByLabel('Review week', { exact: true })).toHaveValue(
    '2026-09-28',
  );
  await page.getByLabel('Select visible entries').check();
  const client = fixture.clients.find(
    (client) => client.name === 'Meridian Holdings',
  )!;
  await page.getByLabel('Review client').selectOption(client.id);
  await expect(
    page.getByRole('button', { name: 'Apply to 0 selected' }),
  ).toBeDisabled();
  await expect(page.getByText(/View changed. Selection cleared/)).toBeVisible();
  await page.getByLabel('Review employee').selectOption('Sofia Keller');
  await page.getByLabel('Review status').selectOption('reviewed');
  const expected = fixture.entries.filter(
    (entry) =>
      entry.date >= '2026-09-28' &&
      entry.date <= '2026-10-04' &&
      entry.clientId === client.id &&
      entry.employee === 'Sofia Keller' &&
      entry.reviewed,
  );
  expect(expected.length).toBeGreaterThan(0);
  await expect(page.locator('.review-row')).toHaveCount(expected.length);
  const total = expected.reduce((sum, entry) => sum + entry.minutes, 0);
  await expect(page.getByTestId('review-total')).toHaveText(
    `${Math.floor(total / 60)}h${total % 60 ? ` ${String(total % 60).padStart(2, '0')}m` : ''}`,
  );
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export view' }).click();
  const path = await (await downloading).path();
  const content = await readFile(path!, 'utf8');
  for (const entry of expected) expect(content).toContain(entry.description);
  expect(content.trim().split('\r\n')).toHaveLength(expected.length + 1);
  await page.getByLabel('Search review').fill('no-such-entry');
  await expect(
    page.getByRole('button', { name: 'Export view' }),
  ).toBeDisabled();
  await expect(page.getByTestId('review-total')).toHaveText('0h');
});

test('description corrections preserve internal time and reviewed corrections support undo', async ({
  page,
}) => {
  const internal = fixture.entries.find(
    (entry) => entry.description === 'Weekly team planning',
  )!;
  await page
    .getByRole('button', {
      name: 'Edit review entry: Weekly team planning',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('dialog').getByRole('checkbox'),
  ).not.toBeChecked();
  await page.getByLabel('Description').fill('Weekly team planning corrected');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('counsel.time.v1')!).entries,
  );
  expect(
    stored.find((entry: { id: string }) => entry.id === internal.id),
  ).toMatchObject({ billable: false, reviewed: false });
  const row = page
    .locator('.review-row')
    .filter({ hasText: 'Weekly team planning corrected' });
  await row
    .getByRole('button', {
      name: 'Review Weekly team planning corrected',
      exact: true,
    })
    .click();
  await row.getByRole('checkbox').check();
  await page.getByLabel('Bulk action').selectOption('client');
  const destination = fixture.clients.find(
    (client) => client.id !== internal.clientId,
  )!;
  await page.getByLabel('Destination client').selectOption(destination.id);
  await page.getByRole('button', { name: 'Apply to 1 selected' }).click();
  await expect(row.getByText(destination.name, { exact: true })).toBeVisible();
  await expect(
    row.getByRole('button', {
      name: 'Review Weekly team planning corrected',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo last action' }).click();
  await expect(
    row.getByRole('button', {
      name: 'Reopen Weekly team planning corrected',
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole('button', { name: 'Weekly review', exact: true })
    .click();
  await expect(
    page
      .locator('.review-row')
      .filter({ hasText: 'Weekly team planning corrected' })
      .getByText('Non-billable', { exact: true }),
  ).toBeVisible();
});

test('weekly review is accessible and fits the viewport', async ({ page }) => {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/review-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test('undo declines a newer edit without losing it', async ({ page }) => {
  const description = 'Weekly team planning';
  await page
    .getByRole('button', { name: `Review ${description}`, exact: true })
    .click();
  await page
    .getByRole('button', {
      name: `Edit review entry: ${description}`,
      exact: true,
    })
    .click();
  await page.getByLabel('Description').fill('Newer independent correction');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Undo last action' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Cannot undo: an affected entry changed or was deleted',
  );
  await expect(
    page
      .locator('.review-row')
      .filter({ hasText: 'Newer independent correction' }),
  ).toBeVisible();
});
