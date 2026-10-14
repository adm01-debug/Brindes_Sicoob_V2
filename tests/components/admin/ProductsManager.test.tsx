import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { fetchProducts } = vi.hoisted(() => ({ fetchProducts: vi.fn() }));

vi.mock('@/components/admin/products/useProductsManager', () => ({
  useProductsManager: () => ({
    products: [],
    isLoading: false,
    searchTerm: '',
    setSearchTerm: vi.fn(),
    advancedFilters: {},
    handleFiltersChange: vi.fn(),
    selectedIds: new Set<string>(),
    toggleSelect: vi.fn(),
    toggleSelectAll: vi.fn(),
    setSelectedIds: vi.fn(),
    isBulkUpdating: false,
    handleBulkToggleActive: vi.fn(),
    currentPage: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 1,
    handlePageChange: vi.fn(),
    handlePageSizeChange: vi.fn(),
    isDeleteOpen: false,
    setIsDeleteOpen: vi.fn(),
    isImportOpen: false,
    setIsImportOpen: vi.fn(),
    selectedProduct: null,
    stats: { active: 0, inactive: 0, noStock: 0, avgPrice: 0 },
    openCreateForm: vi.fn(),
    openEditForm: vi.fn(),
    openDeleteDialog: vi.fn(),
    handleDelete: vi.fn(),
    fetchProducts,
    PAGE_SIZE_OPTIONS: [25, 50, 100],
  }),
}));

import { ProductsManager } from '@/components/admin/ProductsManager';

describe('consulta administrativa de produtos', () => {
  it('não oferece mutações quando o catálogo mestre está em modo somente leitura', () => {
    render(<ProductsManager />);

    expect(screen.getByText('Consulta de Produtos')).toBeInTheDocument();
    expect(screen.getByText(/modo somente leitura/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /novo produto/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /importar/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Ações')).not.toBeInTheDocument();
  });
});
