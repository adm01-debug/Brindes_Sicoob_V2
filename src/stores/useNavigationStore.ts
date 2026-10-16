import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NavigationHistoryItem {
  key: string;
  pathname: string;
  search: string;
  title: string;
  timestamp: number;
  state?: unknown;
  stateRequired: boolean;
}

type NavigationAction = 'PUSH' | 'POP' | 'REPLACE';

interface NavigationState {
  history: NavigationHistoryItem[];
  direction: 'forward' | 'backward';
  record: (item: Omit<NavigationHistoryItem, 'stateRequired'>, action: NavigationAction) => void;
  getPrevious: () => NavigationHistoryItem | undefined;
  setDirection: (direction: 'forward' | 'backward') => void;
  clear: () => void;
}

export function canRestoreNavigationItem(item: NavigationHistoryItem): boolean {
  return !item.stateRequired || Object.prototype.hasOwnProperty.call(item, 'state');
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      history: [],
      direction: 'forward',
      record: (item, action) => {
        set(({ history, direction }) => {
          const nextItem: NavigationHistoryItem = {
            ...item,
            stateRequired: item.state !== null && item.state !== undefined,
          };
          if (history[0]?.key === nextItem.key) {
            return { history: [nextItem, ...history.slice(1)], direction };
          }
          if (action === 'REPLACE') {
            return {
              history: [nextItem, ...history.slice(history.length ? 1 : 0)].slice(0, 20),
              direction,
            };
          }
          const withoutSameKey = history.filter((old) => old.key !== nextItem.key);
          return {
            history: [nextItem, ...withoutSameKey].slice(0, 20),
            direction: action === 'PUSH' ? 'forward' : direction,
          };
        });
      },
      getPrevious: () => get().history[1],
      setDirection: (direction) => set({ direction }),
      clear: () => set({ history: [], direction: 'forward' }),
    }),
    {
      name: 'navigation-history',
      partialize: (state) => ({
        ...state,
        history: state.history.map(({ state: _ephemeralState, ...safeItem }) => safeItem),
      }),
    },
  ),
);
