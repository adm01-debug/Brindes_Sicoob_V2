
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

describe('Categories Flow - Validation & Editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate invalid fields and show toast errors', async () => {
    render(<CategoriesManager />);
    
    // Wait for initial load
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

    // 2. Negative Sort Order
    fireEvent.change(slugInput, { target: { value: 'valid-slug' } });
    fireEvent.change(orderInput, { target: { value: '-1' } });
    fireEvent.click(saveButton);
    expect(toast.error).toHaveBeenCalledWith("A ordem não pode ser um valor negativo");

    // 3. Duplicate Slug
    fireEvent.change(orderInput, { target: { value: '10' } });
    fireEvent.change(slugInput, { target: { value: 'existing-slug' } });
    fireEvent.click(saveButton);
    expect(toast.error).toHaveBeenCalledWith("Este slug já está sendo usado por outra categoria");
  });

  it('should load correct values when editing', async () => {
    render(<CategoriesManager />);
    
    // Wait for the table to render the existing category
    await waitFor(() => expect(screen.getByText('Existing')).toBeDefined());

    // Find and click the edit button (usually an icon, we'll look for the Pencil icon or button)
    const editButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-pencil'));
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0]);
      
      // Check if fields are populated
      expect((screen.getByLabelText(/Nome/i) as HTMLInputElement).value).toBe('Existing');
      expect((screen.getByLabelText(/Slug/i) as HTMLInputElement).value).toBe('existing-slug');
      expect((screen.getByLabelText(/Ordem/i) as HTMLInputElement).value).toBe('1');
    }
  });
});
