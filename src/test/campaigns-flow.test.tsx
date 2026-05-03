
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminCampanhasPage from '@/pages/admin/AdminCampanhasPage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};




// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => Promise.resolve({ 
        data: [{ 
          id: '1', 
          name: 'Campaign 1', 
          status: 'draft', 
          budget: 5000, 
          created_at: new Date().toISOString(),
          start_date: '2024-01-01T00:00:00',
          end_date: '2024-12-31T00:00:00'
        }], 
        error: null 
      })),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '2' }, error: null }),
    })),
  },
}));

vi.mock('@/utils/adminAudit', () => ({
  logAdminAction: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Campaigns Flow - CRUD & Status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user' },
      profile: { role: 'dev' },
      isDev: true,
      canManage: true,
      isLoading: false
    });
  });


  it('should successfully create a new campaign', async () => {
    renderWithContext(<AdminCampanhasPage />);
    
    // Wait for initial load
    await waitFor(() => expect(screen.getByText('Campaign 1')).toBeDefined());

    fireEvent.click(screen.getByText(/Nova Campanha/i));

    // Fill form
    fireEvent.change(screen.getByLabelText(/Nome da Campanha/i), { target: { value: 'New Test Campaign' } });
    fireEvent.change(screen.getByLabelText(/Orçamento/i), { target: { value: '10000' } });
    
    fireEvent.click(screen.getByText(/Salvar Campanha/i));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('campaigns');
      expect(toast.success).toHaveBeenCalledWith("Campanha criada com sucesso");
    });
  });

  it('should open edit mode and update status', async () => {
    renderWithRouter(<AdminCampanhasPage />);
    await waitFor(() => expect(screen.getByText('Campaign 1')).toBeDefined());

    // Click edit button
    const editButton = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-pencil'));
    if (editButton) {
      fireEvent.click(editButton);
      
      // Update name
      fireEvent.change(screen.getByLabelText(/Nome da Campanha/i), { target: { value: 'Updated Campaign' } });
      
      fireEvent.click(screen.getByText(/Salvar Campanha/i));

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('campaigns');
        expect(toast.success).toHaveBeenCalledWith("Campanha atualizada com sucesso");
      });
    }
  });
});
