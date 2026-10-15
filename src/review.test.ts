import { describe, expect, it } from 'vitest';
import {
  applyEntryUpdate,
  createUndoRecord,
  saveEntry,
  selectReview,
  selectWeek,
  undoEntries,
  updateEntries,
} from './review';
import { decodeData, totals } from './model';
import type { Data, Entry } from './model';
import fixture from './fixtures/pilot-workspace.json';

const data = (): Data => decodeData(JSON.stringify(fixture));
const filters = {
  week: '2026-09-28',
  clientId: 'all',
  employee: 'all',
  status: 'all',
  search: '',
};
const reviewedEntry = (): Entry => ({ ...data().entries[0], reviewed: true });

describe('review integrity', () => {
  it.each([
    { date: '2026-10-04' },
    { employee: 'Different employee' },
    { clientId: 'another-client' },
    { minutes: 17 },
    { billable: false },
    { description: 'Corrected wording' },
  ])('invalidates review for correction %j', (patch) => {
    const previous = { ...reviewedEntry(), billable: true };
    expect(applyEntryUpdate(previous, { ...previous, ...patch }).reviewed).toBe(
      false,
    );
  });
  it('preserves review on unchanged saves, including legacy missing status', () => {
    const previous = reviewedEntry();
    expect(applyEntryUpdate(previous, { ...previous }).reviewed).toBe(true);
    expect(
      applyEntryUpdate(
        { ...previous, reviewed: undefined },
        { ...previous, reviewed: undefined },
      ).reviewed,
    ).toBeUndefined();
  });
  it('preserves internal non-billable entries through save and rejects stale edits', () => {
    const original = data();
    const entry = original.entries.find((entry) => !entry.billable)!;
    const saved = saveEntry(
      original,
      { ...entry, description: 'Corrected wording' },
      undefined,
      entry,
    );
    expect(
      saved.entries.find((candidate) => candidate.id === entry.id)?.billable,
    ).toBe(false);
    expect(() => saveEntry(saved, entry, undefined, entry)).toThrow(
      'changed while',
    );
  });
  it('bulk corrections invalidate review, unchanged patches preserve it and explicit review works', () => {
    const original = data();
    const entry = { ...original.entries[0], reviewed: true };
    original.entries[0] = entry;
    const clientId = original.clients.find(
      (client) => client.id !== entry.clientId,
    )!.id;
    expect(
      updateEntries(original, [entry.id], { clientId }).entries[0].reviewed,
    ).toBe(false);
    expect(
      updateEntries(original, [entry.id], {
        billable: !entry.billable,
        reviewed: true,
      }).entries[0].reviewed,
    ).toBe(false);
    expect(
      updateEntries(original, [entry.id], { clientId: entry.clientId })
        .entries[0].reviewed,
    ).toBe(true);
    expect(
      updateEntries(original, [entry.id], { reviewed: false }).entries[0]
        .reviewed,
    ).toBe(false);
    expect(() =>
      updateEntries(original, ['missing'], { reviewed: true }),
    ).toThrow('no longer exists');
  });
});

describe('filtered week', () => {
  it('includes both month boundaries and excludes adjacent weeks', () => {
    const entry = reviewedEntry();
    const entries = [
      '2026-09-27',
      '2026-09-28',
      '2026-09-30',
      '2026-10-01',
      '2026-10-04',
      '2026-10-05',
    ].map((date) => ({ ...entry, id: date, date, minutes: 1 }));
    const visible = selectWeek(entries, filters.week);
    expect(visible.map((entry) => entry.date)).toEqual([
      '2026-09-28',
      '2026-09-30',
      '2026-10-01',
      '2026-10-04',
    ]);
    expect(totals(visible).total).toBe(4);
  });
  it('combines every filter and handles empty views', () => {
    const original = data();
    const entry = original.entries.find(
      (entry) => entry.date >= filters.week && entry.reviewed,
    )!;
    const result = selectReview(original.entries, original.clients, {
      ...filters,
      clientId: entry.clientId,
      employee: entry.employee,
      status: 'reviewed',
      search: entry.description,
    });
    expect(result).toContainEqual(entry);
    expect(
      result.every(
        (candidate) =>
          candidate.clientId === entry.clientId &&
          candidate.employee === entry.employee &&
          candidate.reviewed,
      ),
    ).toBe(true);
    expect(
      selectReview(original.entries, original.clients, {
        ...filters,
        search: 'no-such-entry',
      }),
    ).toEqual([]);
  });
});

describe('scoped undo', () => {
  it('preserves unrelated edits, additions, deletions and client changes', () => {
    const before = data();
    const affected = before.entries[0];
    const after = updateEntries(before, [affected.id], {
      billable: !affected.billable,
    });
    const operation = createUndoRecord(before, after);
    const unrelated = after.entries[1];
    const deleted = after.entries[2];
    const added = {
      ...affected,
      id: 'new-entry',
      description: 'Independent addition',
    };
    const current: Data = {
      ...after,
      clients: after.clients.map((client) => ({
        ...client,
        name: `${client.name} updated`,
      })),
      entries: [
        ...after.entries
          .filter((entry) => entry.id !== deleted.id)
          .map((entry) =>
            entry.id === unrelated.id ? { ...entry, minutes: 19 } : entry,
          ),
        added,
      ],
    };
    const undone = undoEntries(current, operation);
    expect(undone.entries.find((entry) => entry.id === affected.id)).toEqual(
      affected,
    );
    expect(
      undone.entries.find((entry) => entry.id === unrelated.id)?.minutes,
    ).toBe(19);
    expect(undone.entries.some((entry) => entry.id === deleted.id)).toBe(false);
    expect(undone.entries).toContainEqual(added);
    expect(undone.clients).toEqual(current.clients);
  });
  it.each(['edit', 'delete', 'client'])(
    'declines conflicting %s atomically',
    (conflict) => {
      const before = data();
      before.entries = before.entries.map((entry, index) =>
        index < 2 ? { ...entry, reviewed: true } : entry,
      );
      const ids = before.entries.slice(0, 2).map((entry) => entry.id);
      const after = updateEntries(before, ids, { reviewed: false });
      const operation = createUndoRecord(before, after);
      const affected = operation.after[0];
      const current: Data = structuredClone(after);
      if (conflict === 'edit')
        current.entries = current.entries.map((entry) =>
          entry.id === affected.id
            ? { ...entry, description: 'Newer work' }
            : entry,
        );
      if (conflict === 'delete')
        current.entries = current.entries.filter(
          (entry) => entry.id !== affected.id,
        );
      if (conflict === 'client')
        current.clients = current.clients.filter(
          (client) => client.id !== operation.before[0].clientId,
        );
      const snapshot = structuredClone(current);
      expect(() => undoEntries(current, operation)).toThrow('Cannot undo');
      expect(current).toEqual(snapshot);
    },
  );
  it('records only changed entries, preserving independent edits to no-op targets', () => {
    const before = data();
    const after = updateEntries(
      before,
      before.entries.map((entry) => entry.id),
      { reviewed: true },
    );
    const operation = createUndoRecord(before, after);
    expect(operation.before.every((entry) => !entry.reviewed)).toBe(true);
  });
});
