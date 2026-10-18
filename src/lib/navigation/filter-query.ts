import { addDays, format, isValid, parse, startOfDay } from 'date-fns';
import { ORDER_STATUS_FLOW } from '@/constants/orders';
import { QUOTE_STATUS_CONFIG } from '@/lib/quote-status-config';
import { ORDER_STATUS_OPTIONS as SICOOB_ORDER_STATUS_OPTIONS } from '@/types/sicoob/orders';

const DATE_PARAM_FORMAT = 'yyyy-MM-dd';
const ORDER_STATUSES = new Set<string>(ORDER_STATUS_FLOW);
const SICOOB_ORDER_STATUSES = new Set<string>(SICOOB_ORDER_STATUS_OPTIONS);
const QUOTE_STATUSES = new Set(Object.keys(QUOTE_STATUS_CONFIG));

export const QUOTE_SORT_OPTIONS = ['newest', 'oldest', 'highest', 'lowest', 'expiring'] as const;
export type QuoteSortOption = (typeof QUOTE_SORT_OPTIONS)[number];
const QUOTE_SORTS = new Set<string>(QUOTE_SORT_OPTIONS);

export interface OrderQueryFilters {
  search: string;
  status: string;
  clientCompany: string;
  dateRange?: { from: Date | undefined; to: Date | undefined };
  page: number;
}

export interface SicoobOrderQueryFilters {
  searchTerm: string;
  statusFilter: string;
  paFilter: string;
  singularFilter: string;
  dateRange?: { from: Date | undefined; to?: Date };
  page: number;
}

export interface QuoteQueryFilters {
  searchTerm: string;
  statusFilter: string;
  sortBy: QuoteSortOption;
}

export function toApiDateRange(range: { from?: Date; to?: Date } | undefined) {
  return {
    startDate: range?.from ? startOfDay(range.from).toISOString() : undefined,
    endDateExclusive: range?.to ? startOfDay(addDays(range.to, 1)).toISOString() : undefined,
  };
}

function textOrEmpty(value: string | null): string {
  return value ?? '';
}

function positiveInteger(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10_000 ? parsed : 1;
}

function localDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, DATE_PARAM_FORMAT, new Date());
  return isValid(parsed) && format(parsed, DATE_PARAM_FORMAT) === value ? parsed : undefined;
}

function dateRange(params: URLSearchParams) {
  const from = localDate(params.get('from'));
  const to = localDate(params.get('to'));
  if (!from && !to) return undefined;
  if (!from && to) return { from: to, to };
  if (from && to && to < from) return { from: to, to: from };
  return { from, to };
}

function allowed(value: string | null, values: Set<string>, fallback = 'all'): string {
  return value && values.has(value) ? value : fallback;
}

function setOptional(params: URLSearchParams, key: string, value: string, defaultValue = '') {
  if (value && value !== defaultValue) params.set(key, value);
  else params.delete(key);
}

function setDate(params: URLSearchParams, key: string, value: Date | undefined) {
  if (value) params.set(key, format(value, DATE_PARAM_FORMAT));
  else params.delete(key);
}

export function parseOrderQuery(params: URLSearchParams): OrderQueryFilters {
  return {
    search: textOrEmpty(params.get('search')),
    status: allowed(params.get('status'), ORDER_STATUSES),
    clientCompany: textOrEmpty(params.get('company')),
    dateRange: dateRange(params),
    page: positiveInteger(params.get('page')),
  };
}

export function writeOrderQuery(
  current: URLSearchParams,
  filters: OrderQueryFilters,
): URLSearchParams {
  const next = new URLSearchParams(current);
  setOptional(next, 'search', filters.search);
  setOptional(next, 'status', filters.status, 'all');
  setOptional(next, 'company', filters.clientCompany);
  setDate(next, 'from', filters.dateRange?.from);
  setDate(next, 'to', filters.dateRange?.to);
  setOptional(next, 'page', String(filters.page), '1');
  return next;
}

export function parseSicoobOrderQuery(params: URLSearchParams): SicoobOrderQueryFilters {
  return {
    searchTerm: textOrEmpty(params.get('search')),
    statusFilter: allowed(params.get('status'), SICOOB_ORDER_STATUSES),
    paFilter: textOrEmpty(params.get('pa')) || 'all',
    singularFilter: textOrEmpty(params.get('singular')) || 'all',
    dateRange: dateRange(params),
    page: positiveInteger(params.get('page')),
  };
}

export function writeSicoobOrderQuery(
  current: URLSearchParams,
  filters: SicoobOrderQueryFilters,
): URLSearchParams {
  const next = new URLSearchParams(current);
  setOptional(next, 'search', filters.searchTerm);
  setOptional(next, 'status', filters.statusFilter, 'all');
  setOptional(next, 'pa', filters.paFilter, 'all');
  setOptional(next, 'singular', filters.singularFilter, 'all');
  setDate(next, 'from', filters.dateRange?.from);
  setDate(next, 'to', filters.dateRange?.to);
  setOptional(next, 'page', String(filters.page), '1');
  return next;
}

export function reconcileSicoobReferences(
  filters: SicoobOrderQueryFilters,
  paIds?: ReadonlySet<string>,
  cooperativeIds?: ReadonlySet<string>,
): SicoobOrderQueryFilters {
  const invalidPa = paIds && filters.paFilter !== 'all' && !paIds.has(filters.paFilter);
  const invalidCooperative = cooperativeIds && filters.singularFilter !== 'all' && !cooperativeIds.has(filters.singularFilter);
  if (!invalidPa && !invalidCooperative) return filters;
  return {
    ...filters,
    paFilter: invalidPa ? 'all' : filters.paFilter,
    singularFilter: invalidCooperative ? 'all' : filters.singularFilter,
    page: 1,
  };
}

export function parseQuoteQuery(params: URLSearchParams): QuoteQueryFilters {
  const rawSort = params.get('order');
  return {
    searchTerm: textOrEmpty(params.get('q')),
    statusFilter: allowed(params.get('status'), QUOTE_STATUSES),
    sortBy: (rawSort && QUOTE_SORTS.has(rawSort) ? rawSort : 'newest') as QuoteSortOption,
  };
}

export function writeQuoteQuery(
  current: URLSearchParams,
  filters: QuoteQueryFilters,
): URLSearchParams {
  const next = new URLSearchParams(current);
  setOptional(next, 'q', filters.searchTerm);
  setOptional(next, 'status', filters.statusFilter, 'all');
  setOptional(next, 'order', filters.sortBy, 'newest');
  return next;
}
