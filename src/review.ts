import type { Client, Data, Entry } from './model';
import { addDays, validateEntry } from './model';

export type ReviewFilters = {
  week: string;
  clientId: string;
  employee: string;
  status: string;
  search: string;
};
export type EntryPatch = Partial<
  Pick<Entry, 'clientId' | 'billable' | 'reviewed'>
>;
export type UndoRecord = { before: Entry[]; after: Entry[] };

export function selectWeek(entries: Entry[], week: string) {
  return entries.filter(
    (entry) => entry.date >= week && entry.date <= addDays(week, 6),
  );
}
export function selectReview(
  entries: Entry[],
  clients: Client[],
  filters: ReviewFilters,
) {
  return selectWeek(entries, filters.week)
    .filter(
      (entry) =>
        (filters.clientId === 'all' || entry.clientId === filters.clientId) &&
        (filters.employee === 'all' || entry.employee === filters.employee) &&
        (filters.status === 'all' ||
          !!entry.reviewed === (filters.status === 'reviewed')) &&
        `${entry.description} ${clients.find((c) => c.id === entry.clientId)?.name ?? ''} ${entry.employee}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.employee.localeCompare(b.employee) ||
        a.id.localeCompare(b.id),
    );
}
const entryFactsChanged = (previous: Entry, next: Entry): boolean =>
  previous.date !== next.date ||
  previous.minutes !== next.minutes ||
  previous.clientId !== next.clientId ||
  previous.billable !== next.billable ||
  previous.description !== next.description ||
  previous.employee !== next.employee;

export const applyEntryUpdate = (previous: Entry, next: Entry): Entry => ({
  ...next,
  reviewed: entryFactsChanged(previous, next) ? false : previous.reviewed,
});
export function saveEntry(
  data: Data,
  entry: Entry,
  client?: Client,
  original?: Entry,
): Data {
  const previous = data.entries.find((e) => e.id === entry.id);
  if (
    original &&
    (!previous || JSON.stringify(previous) !== JSON.stringify(original))
  )
    throw new Error(
      'This entry changed while you were editing. Close and reopen it to use the latest version.',
    );
  const clients = client ? [...data.clients, client] : data.clients;
  validateEntry(entry, clients);
  return {
    ...data,
    clients,
    entries: [
      ...data.entries.filter((e) => e.id !== entry.id),
      previous
        ? applyEntryUpdate(previous, entry)
        : { ...entry, reviewed: false },
    ],
  };
}
export function updateEntries(
  data: Data,
  ids: string[],
  patch: EntryPatch,
): Data {
  const selected = new Set(ids);
  if (ids.some((id) => !data.entries.some((e) => e.id === id)))
    throw new Error('An entry no longer exists. Refresh your selection.');
  return {
    ...data,
    entries: data.entries.map((entry) => {
      if (!selected.has(entry.id)) return entry;
      const merged = { ...entry, ...patch };
      validateEntry(merged, data.clients);
      return entryFactsChanged(entry, merged)
        ? applyEntryUpdate(entry, merged)
        : merged;
    }),
  };
}
const sameEntry = (left: Entry, right: Entry): boolean =>
  left.id === right.id &&
  !entryFactsChanged(left, right) &&
  left.reviewed === right.reviewed;

export const createUndoRecord = (before: Data, after: Data): UndoRecord => {
  const changed = before.entries.filter((entry) => {
    const next = after.entries.find((candidate) => candidate.id === entry.id);
    return next && !sameEntry(entry, next);
  });
  const ids = new Set(changed.map((entry) => entry.id));
  return {
    before: changed,
    after: after.entries.filter((entry) => ids.has(entry.id)),
  };
};

export const undoEntries = (data: Data, operation: UndoRecord): Data => {
  for (const expected of operation.after) {
    const current = data.entries.find((entry) => entry.id === expected.id);
    if (!current || !sameEntry(current, expected)) {
      throw new Error(
        'Cannot undo: an affected entry changed or was deleted. Your newer work has been kept.',
      );
    }
  }
  for (const original of operation.before) {
    if (!data.clients.some((client) => client.id === original.clientId)) {
      throw new Error(
        'Cannot undo: the original client no longer exists. Your current work has been kept.',
      );
    }
    validateEntry(original, data.clients);
  }
  const originals = new Map(operation.before.map((entry) => [entry.id, entry]));
  return {
    ...data,
    entries: data.entries.map((entry) => originals.get(entry.id) ?? entry),
  };
};
