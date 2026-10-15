import { useEffect, useSyncExternalStore } from 'react';
import type { Page } from './components/Sidebar';
import { validDate, weekStart } from './model';
import type { ReviewFilters } from './review';

const navigationEvent = 'counsel:navigate';
const subscribe = (notify: () => void): (() => void) => {
  window.addEventListener('popstate', notify);
  window.addEventListener(navigationEvent, notify);
  return () => {
    window.removeEventListener('popstate', notify);
    window.removeEventListener(navigationEvent, notify);
  };
};
const getSnapshot = (): string => window.location.search;
const updateLocation = (
  changes: Record<string, string>,
  replace = false,
): void => {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(changes)) {
    if (!value || value === 'all') url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  if (url.href === window.location.href) return;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new Event(navigationEvent));
};

export const readPage = (search: string): Page => {
  const page = new URLSearchParams(search).get('page');
  return page === 'review' || page === 'reports' || page === 'clients'
    ? page
    : 'entries';
};

export const readReviewFilters = (
  search: string,
  defaultWeek: string,
): ReviewFilters => {
  const params = new URLSearchParams(search);
  const week = params.get('week') ?? '';
  const status = params.get('status');
  return {
    week: validDate(week) ? weekStart(week) : defaultWeek,
    clientId: params.get('client') || 'all',
    employee: params.get('employee') || 'all',
    status: status === 'pending' || status === 'reviewed' ? status : 'all',
    search: params.get('search') ?? '',
  };
};

export const usePageLocation = (): {
  page: Page;
  handleNavigate: (page: Page) => void;
} => {
  const search = useSyncExternalStore(subscribe, getSnapshot);
  return {
    page: readPage(search),
    handleNavigate: (page: Page): void => updateLocation({ page }),
  };
};

export const useReviewLocation = (
  defaultWeek: string,
): {
  filters: ReviewFilters;
  locationKey: string;
  handleChangeFilters: (patch: Partial<ReviewFilters>) => void;
} => {
  const search = useSyncExternalStore(subscribe, getSnapshot);
  const filters = readReviewFilters(search, defaultWeek);
  useEffect(() => {
    if (new URLSearchParams(search).get('week') !== filters.week) {
      updateLocation({ week: filters.week }, true);
    }
  }, [search, filters.week]);
  const handleChangeFilters = (patch: Partial<ReviewFilters>): void => {
    const next = { ...filters, ...patch };
    updateLocation(
      {
        page: 'review',
        week: next.week,
        client: next.clientId,
        employee: next.employee,
        status: next.status,
        search: next.search,
      },
      patch.search !== undefined,
    );
  };
  return { filters, locationKey: search, handleChangeFilters };
};
