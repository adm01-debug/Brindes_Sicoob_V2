
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoriesManager } from '@/components/admin/categories/CategoriesManager';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
    })),
  },
}));

// Mock useAdminPermissions
vi.mock('@/hooks/useAdminPermissions', () => ({
  useAdminPermissions: () => ({
    canEdit: true,
    canDelete: true,
    canImport: true,
    canExport: true,
  }),
}));

// Mock logAdminAction
vi.mock('@/utils/adminAudit', () => ({
  logAdminAction: vi.fn(),
}));

describe('CategoriesManager', () => {
  it('should open form and validate fields before saving', async () => {
    render(<CategoriesManager />);
    
    // Click "Nova Categoria"
    const addButton = screen.getByText(/Nova Categoria/i);
    fireEvent.click(addButton);

    // Try to save empty form
    const saveButton = screen.getByText(/Salvar/i);
    fireEvent.click(saveButton);
    
    // Check if form is still open (validation should prevent closing)
    expect(screen.getByLabelText(/Nome/i)).toBeDefined();

    // Fill form with invalid slug
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Categoria Teste' } });
    fireEvent.change(screen.getByLabelText(/Slug/i), { target: { value: 'Slug Invalido!' } });
    fireEvent.click(saveButton);

    // Form should still be open
    expect(screen.getByLabelText(/Slug/i)).toBeDefined();
  });
});
