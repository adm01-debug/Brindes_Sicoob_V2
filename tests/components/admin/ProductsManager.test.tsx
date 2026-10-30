import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchProducts, productsState } = vi.hoisted(() => ({
  fetchProducts: vi.fn(),
  productsState: { products: [] as Array<Record<string, unknown>> },
}));

vi.mock('@/components/admin/products/useProductsManager', () => ({
  useProductsManager: () => ({
    products: productsState.products,
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

vi.mock('@/components/admin/products/ProductMarketingSection', () => ({
  ProductMarketingSection: ({ productId }: { productId: string }) => <div>Taxonomia local de {productId}</div>,
}));

import { ProductsManager } from '@/components/admin/ProductsManager';

describe('consulta administrativa de produtos', () => {
  beforeEach(() => {
    productsState.products = [];
  });

  it('não oferece mutações quando o catálogo mestre está em modo somente leitura', () => {
    render(<ProductsManager />);

    expect(screen.getByText('Consulta de Produtos')).toBeInTheDocument();
    expect(screen.getByText(/modo somente leitura/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /novo produto/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /importar/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Ações')).not.toBeInTheDocument();
  });

  it('expõe a curadoria local sem reabrir a escrita do catálogo mestre', () => {
    productsState.products = [{
      id: 'produto-1', sku: 'SIC-001', name: 'Caneca Sicoob', images: [], price: 42,
      stock: 12, is_active: true, is_featured: false, is_new: false, is_kit: false,
    }];

    render(<ProductsManager />);
    fireEvent.click(screen.getByRole('button', { name: 'Classificar marketing de Caneca Sicoob' }));

    expect(screen.getByRole('dialog', { name: 'Curadoria de marketing' })).toBeInTheDocument();
    expect(screen.getByText('Taxonomia local de produto-1')).toBeInTheDocument();
    expect(screen.getByText(/não alteram o catálogo mestre/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /novo produto/i })).not.toBeInTheDocument();
  });
});
