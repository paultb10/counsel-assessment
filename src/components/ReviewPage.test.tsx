import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { ReviewPage } from './ReviewPage';
import { EntryForm } from './EntryForm';
import type { Data } from '../model';
import { csv, decodeData, duration, totals } from '../model';
import { selectReview } from '../review';
import fixture from '../fixtures/pilot-workspace.json';
import * as model from '../model';

vi.mock('../model', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../model')>()),
  download: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const initial = (): Data => decodeData(JSON.stringify(fixture));
const Harness = () => {
  const [data, setData] = useState(initial);
  return (
    <ReviewPage data={data} save={setData} onEdit={vi.fn()} readOnly={false} />
  );
};

describe('weekly review view and action scope', () => {
  it('uses filtered rows for totals and export regardless of selection', () => {
    render(<Harness />);
    const data = initial();
    const client = data.clients.find(
      (client) => client.name === 'Meridian Holdings',
    )!;
    fireEvent.change(screen.getByLabelText('Review client'), {
      target: { value: client.id },
    });
    fireEvent.change(screen.getByLabelText('Review employee'), {
      target: { value: 'Sofia Keller' },
    });
    fireEvent.change(screen.getByLabelText('Review status'), {
      target: { value: 'reviewed' },
    });
    const expected = selectReview(data.entries, data.clients, {
      week: '2026-09-28',
      clientId: client.id,
      employee: 'Sofia Keller',
      status: 'reviewed',
      search: '',
    });
    expect(expected.length).toBeGreaterThan(0);
    expect(screen.getByTestId('review-total')).toHaveTextContent(
      duration(totals(expected).total),
    );
    expect(document.querySelectorAll('.review-row')).toHaveLength(
      expected.length,
    );
    fireEvent.click(screen.getByLabelText('Select visible entries'));
    fireEvent.click(screen.getByRole('button', { name: 'Export view' }));
    expect(model.download).toHaveBeenLastCalledWith(
      csv(expected, data.clients),
      'counsel-review-2026-09-28.csv',
      'text/csv;charset=utf-8',
    );
    fireEvent.change(screen.getByLabelText('Search review'), {
      target: { value: 'missing-entry' },
    });
    expect(screen.getByTestId('review-total')).toHaveTextContent('0h');
    expect(screen.getByRole('button', { name: 'Export view' })).toBeDisabled();
  });
  it('exports the whole active view when only one entry is selected', () => {
    render(<Harness />);
    const data = initial();
    const expected = selectReview(data.entries, data.clients, {
      week: '2026-09-28',
      clientId: 'all',
      employee: 'all',
      status: 'all',
      search: '',
    });
    const row = document.querySelector('.review-row') as HTMLElement;
    fireEvent.click(within(row).getByRole('checkbox'));
    expect(screen.getByRole('status')).toHaveTextContent(
      `1 selected · ${duration(expected[0].minutes)} in this view`,
    );
    expect(screen.getByLabelText('Select visible entries')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Export view' }));
    expect(model.download).toHaveBeenCalledWith(
      csv(expected, data.clients),
      'counsel-review-2026-09-28.csv',
      'text/csv;charset=utf-8',
    );
  });
  it.each([
    'Review client',
    'Review employee',
    'Review status',
    'Search review',
    'Review week',
  ])('clears selection when %s changes', (label) => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText('Select visible entries'));
    const values: Record<string, string> = {
      'Review client': initial().clients[0].id,
      'Review employee': 'Sofia Keller',
      'Review status': 'pending',
      'Search review': 'agreement',
      'Review week': '2026-09-21',
    };
    fireEvent.change(screen.getByLabelText(label), {
      target: { value: values[label] },
    });
    expect(
      screen.getByRole('button', { name: 'Apply to 0 selected' }),
    ).toBeDisabled();
    expect(screen.getByText(/View changed. Selection cleared/)).toBeVisible();
  });
  it('shows selected duration, clears selection explicitly and undoes an action', () => {
    render(<Harness />);
    const row = document.querySelector('.review-row') as HTMLElement;
    fireEvent.click(within(row).getByRole('checkbox'));
    expect(screen.getByRole('status')).toHaveTextContent('1 selected');
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(
      screen.getByRole('button', { name: 'Apply to 0 selected' }),
    ).toBeDisabled();
    fireEvent.click(within(row).getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Bulk action'), {
      target: { value: 'nonbillable' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Apply to 1 selected' }),
    );
    expect(within(row).getByText('Non-billable')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Undo last action' }));
    expect(within(row).getByText('Billable')).toBeVisible();
  });
});

it('description-only form edits preserve billability and all other entry values', () => {
  HTMLDialogElement.prototype.showModal = function (): void {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (): void {
    this.removeAttribute('open');
  };
  const entry = initial().entries.find((entry) => !entry.billable)!;
  const handleSave = vi.fn();
  render(
    <EntryForm
      entry={entry}
      clients={initial().clients}
      onSave={handleSave}
      onClose={vi.fn()}
    />,
  );
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  fireEvent.change(screen.getByLabelText(/Description/), {
    target: { value: 'Updated wording' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  const { reviewed: _reviewed, ...fields } = entry;
  expect(handleSave).toHaveBeenCalledWith(
    { ...fields, description: 'Updated wording' },
    undefined,
  );
});
