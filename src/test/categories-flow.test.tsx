
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoriesManager } from '@/components/admin/categories/CategoriesManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import React from 'react';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => Promise.resolve({ 
        data: [{ id: '1', name: 'Existing', slug: 'existing-slug', sort_order: 1 }], 
        error: null 
      })),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '2' }, error: null }),
    })),
  },
}));

vi.mock('@/hooks/useAdminPermissions', () => ({
  useAdminPermissions: () => ({
    canEdit: true,
    canDelete: true,
    canImport: true,
    canExport: true,
  }),
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

describe('Categories Flow - CRUD & Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate invalid fields and show toast errors', async () => {
    render(<CategoriesManager />);
    await waitFor(() => expect(screen.getByText('Existing')).toBeDefined());
    fireEvent.click(screen.getByText(/Nova Categoria/i));

    const saveButton = screen.getByText(/Salvar/i);
    const nameInput = screen.getByLabelText(/Nome/i);
    const slugInput = screen.getByLabelText(/Slug/i);
    const orderInput = screen.getByLabelText(/Ordem/i);

    // 1. Invalid Slug Format
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.change(slugInput, { target: { value: 'Invalid Slug!' } });
    fireEvent.click(saveButton);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("O slug deve conter apenas"));
    expect(screen.getByLabelText(/Nome/i)).toBeInTheDocument(); // Modal stays open

    // 2. Negative Sort Order
    fireEvent.change(slugInput, { target: { value: 'valid-slug' } });
    fireEvent.change(orderInput, { target: { value: '-1' } });
    fireEvent.click(saveButton);
    expect(toast.error).toHaveBeenCalledWith("A ordem não pode ser um valor negativo");
    expect(screen.getByLabelText(/Nome/i)).toBeInTheDocument(); // Modal stays open

    // 3. Duplicate Slug
    fireEvent.change(orderInput, { target: { value: '10' } });
    fireEvent.change(slugInput, { target: { value: 'existing-slug' } });
    fireEvent.click(saveButton);
    expect(toast.error).toHaveBeenCalledWith("Este slug já está sendo usado por outra categoria");
    expect(screen.getByLabelText(/Nome/i)).toBeInTheDocument(); // Modal stays open
  });

  it('should successfully create a new category', async () => {
    render(<CategoriesManager />);
    await waitFor(() => expect(screen.getByText('Existing')).toBeDefined());
    fireEvent.click(screen.getByText(/Nova Categoria/i));

    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'New Category' } });
    fireEvent.change(screen.getByLabelText(/Slug/i), { target: { value: 'new-category' } });
    fireEvent.click(screen.getByText(/Salvar/i));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('product_categories');
      expect(toast.success).toHaveBeenCalledWith("Categoria criada com sucesso");
    });
    
    // Check if modal closed (it shouldn't be in the document anymore)
    await waitFor(() => {
      expect(screen.queryByLabelText(/Nome/i)).toBeNull();
    });
  });

  it('should successfully update an existing category', async () => {
    render(<CategoriesManager />);
    await waitFor(() => expect(screen.getByText('Existing')).toBeDefined());

    const editButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-pencil'));
    fireEvent.click(editButtons[0]);

    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByText(/Salvar/i));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('product_categories');
      expect(toast.success).toHaveBeenCalledWith("Categoria atualizada com sucesso");
    });
  });

  it('should show error toast when supabase fails on insert', async () => {
    (supabase.from as any).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
    }));

    render(<CategoriesManager />);
    fireEvent.click(screen.getByText(/Nova Categoria/i));
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Error Test' } });
    fireEvent.change(screen.getByLabelText(/Slug/i), { target: { value: 'error-test' } });
    fireEvent.click(screen.getByText(/Salvar/i));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erro ao salvar categoria");
    });
  });
});
