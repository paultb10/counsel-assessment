import { describe, expect, it } from 'vitest';
import { readPage, readReviewFilters } from './navigation';

describe('URL review context', () => {
  it.each(['review', 'entries', 'reports', 'clients'] as const)(
    'reads page %s',
    (page) => {
      expect(readPage(`?page=${page}`)).toBe(page);
    },
  );
  it('defaults unknown routes and invalid filter values safely', () => {
    expect(readPage('?page=unknown')).toBe('entries');
    expect(
      readReviewFilters('?week=2026-02-30&status=invalid', '2026-09-28'),
    ).toEqual({
      week: '2026-09-28',
      clientId: 'all',
      employee: 'all',
      status: 'all',
      search: '',
    });
  });
  it('normalizes cross-month dates to Monday and decodes filters', () => {
    const params = new URLSearchParams({
      week: '2026-10-04',
      client: 'client-1',
      employee: 'Sofia Keller',
      status: 'pending',
      search: 'agreement & advice',
    });
    expect(readReviewFilters(`?${params}`, '2026-09-21')).toEqual({
      week: '2026-09-28',
      clientId: 'client-1',
      employee: 'Sofia Keller',
      status: 'pending',
      search: 'agreement & advice',
    });
  });
});
