
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVoiceSearchAction } from '../useVoiceSearchAction';

// Mocks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/useVoiceCommandHistory', () => ({
  useVoiceCommandHistory: () => ({
    addCommand: vi.fn(),
  }),
}));

describe('useVoiceSearchAction', () => {
  const setOpen = vi.fn();
  const setVoiceOverlayOpen = vi.fn();
  const setQuery = vi.fn();
  const setResults = vi.fn();

  it('should handle search action correctly', () => {
    const { result } = renderHook(() => 
      useVoiceSearchAction(setOpen, setVoiceOverlayOpen, setQuery, setResults)
    );

    const action = {
      action: 'search',
      response: 'Searching for products',
      data: { query: 'laptop' }
    };

    result.current.handleVoiceAction(action as any);

    // Wait for setTimeout
    setTimeout(() => {
      expect(setQuery).toHaveBeenCalledWith('laptop');
      expect(setOpen).toHaveBeenCalledWith(true);
      expect(setVoiceOverlayOpen).toHaveBeenCalledWith(false);
    }, 600);
  });

  it('should handle navigate action', () => {
    const { result } = renderHook(() => 
      useVoiceSearchAction(setOpen, setVoiceOverlayOpen, setQuery, setResults)
    );

    const action = {
      action: 'navigate',
      response: 'Going to orders',
      data: { route: '/orcamentos' }
    };

    result.current.handleVoiceAction(action as any);

    setTimeout(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/orcamentos');
      expect(setVoiceOverlayOpen).toHaveBeenCalledWith(false);
    }, 600);
  });
});
