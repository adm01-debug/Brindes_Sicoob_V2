import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavigationHistoryItem {
  pathname: string;
  search: string;
  title: string;
  timestamp: number;
}

interface NavigationState {
  history: NavigationHistoryItem[];
  direction: 'forward' | 'backward';
  push: (item: NavigationHistoryItem) => void;
  pop: () => NavigationHistoryItem | undefined;
  getPrevious: () => NavigationHistoryItem | undefined;
  setDirection: (direction: 'forward' | 'backward') => void;
  clear: () => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      history: [],
      direction: 'forward',
      push: (item) => {
        const { history } = get();
        // Evitar duplicados consecutivos
        if (history.length > 0 && history[0].pathname === item.pathname && history[0].search === item.search) {
          return;
        }
        set({ history: [item, ...history].slice(0, 20), direction: 'forward' }); // Limitar a 20 itens
      },
      pop: () => {
        const { history } = get();
        if (history.length === 0) return undefined;
        const [first, ...rest] = history;
        set({ history: rest, direction: 'backward' });
        return first;
      },
      getPrevious: () => {
        const { history } = get();
        return history.length > 1 ? history[1] : undefined;
      },
      setDirection: (direction) => set({ direction }),
      clear: () => set({ history: [], direction: 'forward' }),
    }),
    {
      name: 'navigation-history',
    }
  )
);
