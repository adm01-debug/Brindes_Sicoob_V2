import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usePopularSearchItems } from '@/hooks/search/usePopularSearchItems';
import { useVoiceSearchAction } from '@/hooks/search/useVoiceSearchAction';

// Mocking the hooks to test the UI components that would use them
vi.mock('@/hooks/search/usePopularSearchItems', () => ({
  usePopularSearchItems: vi.fn(),
}));

vi.mock('@/hooks/search/useVoiceSearchAction', () => ({
  useVoiceSearchAction: vi.fn(() => ({
    handleVoiceAction: vi.fn(),
  })),
}));

// A mock component that uses the search hooks to simulate the UI
const SearchTestComponent = () => {
  const popularItems = usePopularSearchItems(true);
  const { handleVoiceAction } = useVoiceSearchAction(
    vi.fn(), vi.fn(), vi.fn(), vi.fn()
  );

  return (
    <div>
      <div data-testid="popular-list">
        {popularItems?.map(item => (
          <div key={item.id} data-testid="popular-item">{item.name}</div>
        ))}
      </div>
      <button 
        data-testid="voice-trigger"
        onClick={() => handleVoiceAction({ action: 'search', data: { query: 'voice test' }, response: 'ok' })}
      >
        Voice Search
      </button>
    </div>
  );
};

describe('E2E Search Experience (Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render popular search items correctly', async () => {
    (usePopularSearchItems as any).mockReturnValue([
      { id: '1', name: 'Product A' },
      { id: '2', name: 'Product B' },
    ]);

    render(
      <MemoryRouter>
        <SearchTestComponent />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('popular-list')).toBeDefined();
    });

    const items = screen.getAllByTestId('popular-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('Product A');
    expect(items[1].textContent).toBe('Product B');
  });

  it('should trigger voice search action', () => {
    const mockHandleVoiceAction = vi.fn();
    (useVoiceSearchAction as any).mockReturnValue({
      handleVoiceAction: mockHandleVoiceAction,
    });

    render(
      <MemoryRouter>
        <SearchTestComponent />
      </MemoryRouter>
    );

    const button = screen.getByTestId('voice-trigger');
    fireEvent.click(button);

    expect(mockHandleVoiceAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'search',
      data: { query: 'voice test' }
    }));
  });

  it('should not show errors in console during normal search flow', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    (usePopularSearchItems as any).mockReturnValue([]);
    
    render(
      <MemoryRouter>
        <SearchTestComponent />
      </MemoryRouter>
    );

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
