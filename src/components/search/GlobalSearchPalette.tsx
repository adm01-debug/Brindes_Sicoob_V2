/**
 * GlobalSearchPalette — orquestra atalhos e a visualização da busca global.
 */
import { useEffect } from 'react';
import { GlobalSearchPaletteView } from './GlobalSearchPaletteView';
import { useGlobalSearch, type SearchResult } from './useGlobalSearch';

type GlobalSearchState = ReturnType<typeof useGlobalSearch>;

function openFirstResult(event: KeyboardEvent, results: SearchResult[]): boolean {
  const isOpenShortcut = event.key === 'Enter' && (event.metaKey || event.ctrlKey);
  if (!isOpenShortcut) return false;
  const first = results[0];
  if (!first?.href) return true;
  event.preventDefault();
  window.open(first.href, '_blank', 'noopener,noreferrer');
  return true;
}

function selectNumberedResult(event: KeyboardEvent, search: GlobalSearchState) {
  const hasModifier = event.metaKey || event.ctrlKey || event.altKey;
  if (!/^[1-9]$/.test(event.key) || hasModifier) return;
  const target = event.target as HTMLElement | null;
  if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
  const result = search.results[Number.parseInt(event.key, 10) - 1];
  if (!result) return;
  event.preventDefault();
  search.handleSelect(result.href);
}

function useResultShortcuts(search: GlobalSearchState) {
  useEffect(() => {
    if (!search.open) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (openFirstResult(event, search.results)) return;
      selectNumberedResult(event, search);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [search]);
}

export function GlobalSearchPalette() {
  const search = useGlobalSearch();
  useResultShortcuts(search);
  return <GlobalSearchPaletteView search={search} />;
}
