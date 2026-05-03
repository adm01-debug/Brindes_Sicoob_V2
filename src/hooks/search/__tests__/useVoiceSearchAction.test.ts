import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVoiceSearchAction } from '@/hooks/search/useVoiceSearchAction';
import { useNavigate } from 'react-router-dom';
import { useVoiceCommandHistory } from '@/hooks/useVoiceCommandHistory';
import { useOracleVoiceBridge } from '@/stores/oracleVoiceBridge';

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/hooks/useVoiceCommandHistory', () => ({
  useVoiceCommandHistory: vi.fn(() => ({
    addCommand: vi.fn(),
  })),
}));

vi.mock('@/stores/oracleVoiceBridge', () => ({
  useOracleVoiceBridge: {
    getState: vi.fn(() => ({
      openOracle: vi.fn(),
    })),
  },
}));

describe('useVoiceSearchAction', () => {
  const mockNavigate = vi.fn();
  const mockAddCommand = vi.fn();
  const setOpen = vi.fn();
  const setVoiceOverlayOpen = vi.fn();
  const setQuery = vi.fn();
  const setResults = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    (useVoiceCommandHistory as any).mockReturnValue({ addCommand: mockAddCommand });
    vi.useFakeTimers();
  });

  it('should handle navigate action', () => {
    const { result } = renderHook(() => useVoiceSearchAction(setOpen, setVoiceOverlayOpen, setQuery, setResults));
    
    result.current.handleVoiceAction({
      action: 'navigate',
      data: { route: '/test-route' },
      response: 'Navigating to test route',
    });

    expect(mockAddCommand).toHaveBeenCalled();
    vi.runAllTimers();
    expect(mockNavigate).toHaveBeenCalledWith('/test-route');
    expect(setVoiceOverlayOpen).toHaveBeenCalledWith(false);
  });

  it('should handle search action', () => {
    const { result } = renderHook(() => useVoiceSearchAction(setOpen, setVoiceOverlayOpen, setQuery, setResults));
    
    result.current.handleVoiceAction({
      action: 'search',
      data: { query: 'test search' },
      response: 'Searching for test search',
    });

    vi.runAllTimers();
    expect(setQuery).toHaveBeenCalledWith('test search');
    expect(setOpen).toHaveBeenCalledWith(true);
    expect(setVoiceOverlayOpen).toHaveBeenCalledWith(false);
  });

  it('should handle clear action', () => {
    const { result } = renderHook(() => useVoiceSearchAction(setOpen, setVoiceOverlayOpen, setQuery, setResults));
    
    result.current.handleVoiceAction({
      action: 'clear',
      response: 'Clearing search',
    });

    vi.runAllTimers();
    expect(setQuery).toHaveBeenCalledWith('');
    expect(setResults).toHaveBeenCalledWith([]);
    expect(setVoiceOverlayOpen).toHaveBeenCalledWith(false);
  });
});
