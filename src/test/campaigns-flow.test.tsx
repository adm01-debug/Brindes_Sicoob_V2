import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminCampanhasPage from '@/pages/admin/AdminCampanhasPage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock everything that needs complex context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: () => ({ onboarding: { step: 'done' } })
}));

vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>
}));

vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: () => <div data-testid="page-seo" />
}));

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
};


// Mock Supabase
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
      single: vi.fn().mockImplementation(() => Promise.resolve({ data: { id: '2' }, error: null })),
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
    
    await waitFor(() => expect(screen.getByText('Campaign 1')).toBeDefined());

    fireEvent.click(screen.getByText(/Nova Campanha/i));

    fireEvent.change(screen.getByLabelText(/Nome da Campanha/i), { target: { value: 'New Test Campaign' } });
    fireEvent.change(screen.getByLabelText(/Orçamento/i), { target: { value: '10000' } });
    
    fireEvent.click(screen.getByText(/Salvar Campanha/i));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('campaigns');
      expect(toast.success).toHaveBeenCalledWith("Campanha criada com sucesso");
    });
  });

  it('should open edit mode and update status', async () => {
    renderWithContext(<AdminCampanhasPage />);
    await waitFor(() => expect(screen.getByText('Campaign 1')).toBeDefined());

    const editButton = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-pencil'));
    if (editButton) {
      fireEvent.click(editButton);
      fireEvent.change(screen.getByLabelText(/Nome da Campanha/i), { target: { value: 'Updated Campaign' } });
      fireEvent.click(screen.getByText(/Salvar Campanha/i));

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('campaigns');
        expect(toast.success).toHaveBeenCalledWith("Campanha atualizada com sucesso");
      });
    }
  });
});
