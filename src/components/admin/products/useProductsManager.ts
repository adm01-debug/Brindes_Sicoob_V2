/**
 * useProductsManager — Business logic hook for ProductsManager.
 * Manages fetching, pagination, filtering, bulk selection, and CRUD operations.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { invokeExternalDbSingle, invokeExternalDbDelete } from "@/lib/external-db";
import { toast } from "sonner";
import { useAuditLog } from "@/hooks/admin/useAuditLog";
import type { ProductFilters } from "../products/ProductFiltersBar";
import type { PromobrindProduct } from "@/lib/external-db/product-types";
import { parseMaterials } from "@/utils/product-mapper";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/**
 * Campos fiscais/embalagem/frete/SEO lidos abaixo mas ausentes de `PromobrindProduct`
 * porque `PRODUCT_SELECT_FIELDS_WITH_SALE/LEGACY/DETAIL` nunca os seleciona — por isso
 * ficam sempre `undefined` em produção hoje (ver Nota de risco funcional na doc de correções).
 */
type PromobrindProductRow = PromobrindProduct & {
  is_imported?: boolean | null; is_textil?: boolean | null; is_thermal?: boolean | null;
  allows_personalization?: boolean | null;
  has_gift_box?: boolean | null; has_optional_packaging?: boolean | null;
  internal_height_cm?: number | null; internal_width_cm?: number | null;
  internal_length_cm?: number | null; internal_diameter_cm?: number | null;
  box_inner_quantity?: number | null;
  packaging_material?: string | null; packaging_color?: string | null; packaging_finish?: string | null;
  suggested_price?: number | null; stock_unit?: string | null; min_order_quantity?: number | null;
  ncm_code?: string | null; ean?: string | null; gtin?: string | null; ipi_rate?: number | null;
  country_of_origin?: string | null; cfop?: string | null; csosn?: string | null;
  icms_rate?: number | null; pis_rate?: number | null; cofins_rate?: number | null;
  tax_regime?: string | null; cest?: string | null;
  freight_class?: string | null; default_carrier?: string | null;
  shipping_weight_kg?: number | null; shipping_width_cm?: number | null;
  shipping_height_cm?: number | null; shipping_length_cm?: number | null;
  cubic_weight?: number | null; requires_special_shipping?: boolean | null; shipping_notes?: string | null;
  product_type?: string | null; supply_mode?: string | null; warranty_months?: number | null;
  meta_title?: string | null; meta_keywords?: string[] | null;
  slug?: string | null; canonical_url?: string | null;
  key_benefits?: string | null; use_cases?: string | null;
  videos?: string[] | null;
};

export interface AdminProduct {
  id: string; sku: string; name: string; description: string | null;
  short_description: string | null; meta_description: string | null; brand: string | null;
  price: number; cost_price: number | null; suggested_price: number | null;
  stock: number | null; stock_unit: string | null;
  category_id: string | null; supplier_id: string | null; supplier_reference: string | null;
  images: string[] | null;
  colors: Array<{ name: string; hex?: string; stock?: number }> | null;
  materials: string[] | null;
  min_quantity: number | null; min_order_quantity: number | null;
  is_active: boolean | null; is_featured: boolean | null; is_bestseller: boolean | null;
  is_new: boolean | null; is_on_sale: boolean | null; is_kit: boolean | null;
  has_commercial_packaging: boolean | null; is_imported: boolean | null;
  is_textil: boolean | null; is_thermal: boolean | null;
  allows_personalization: boolean | null;
  has_gift_box: boolean | null; has_optional_packaging: boolean | null;
  packing_type: string | null;
  height_cm: number | null; width_cm: number | null; length_cm: number | null;
  diameter_cm: number | null; weight_g: number | null; capacity_ml: number | null;
  internal_height_cm: number | null; internal_width_cm: number | null;
  internal_length_cm: number | null; internal_diameter_cm: number | null;
  box_width_mm: number | null; box_height_mm: number | null; box_length_mm: number | null;
  box_weight_kg: number | null; box_quantity: number | null; box_inner_quantity: number | null;
  box_volume_cm3: number | null;
  packaging_material: string | null; packaging_color: string | null; packaging_finish: string | null;
  ncm_code: string | null; ean: string | null; gtin: string | null; ipi_rate: number | null;
  country_of_origin: string | null; cfop: string | null; csosn: string | null;
  icms_rate: number | null; pis_rate: number | null; cofins_rate: number | null;
  tax_regime: string | null; cest: string | null;
  freight_class: string | null; default_carrier: string | null;
  shipping_weight_kg: number | null; shipping_width_cm: number | null;
  shipping_height_cm: number | null; shipping_length_cm: number | null;
  cubic_weight: number | null; requires_special_shipping: boolean | null;
  shipping_notes: string | null; lead_time_days: number | null;
  product_type: string | null; supply_mode: string | null; warranty_months: number | null;
  gender: string | null;
  meta_title: string | null; meta_keywords: string[] | null;
  slug: string | null; canonical_url: string | null; video_url: string | null;
  key_benefits: string | null; use_cases: string | null;
  created_at: string; updated_at: string;
}

export { PAGE_SIZE_OPTIONS };

interface ProductFetchOptions {
  page: number;
  size: number;
  search?: string;
  filters: ProductFilters;
}

function valueOrNull<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function valueOrDefault<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}

function firstDefined<T>(values: Array<T | null | undefined>, fallback: T): T {
  return values.find((value): value is T => value !== null && value !== undefined) ?? fallback;
}

function buildServerFilters(filters: ProductFilters): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (filters.category_id) result.category_id = filters.category_id;
  if (filters.supplier_id) result.supplier_id = filters.supplier_id;
  if (filters.price_min && filters.price_min > 0) result.price_min = filters.price_min;
  if (filters.price_max && filters.price_max > 0) result.price_max = filters.price_max;
  if (filters.is_kit) result.is_kit = true;
  if (filters.is_active !== undefined && filters.is_active !== 'all') {
    result.is_active = filters.is_active;
  }
  return result;
}

function formatProductImages(imageUrl: string | null, images: PromobrindProductRow["images"]): string[] {
  if (imageUrl) return [imageUrl];
  return Array.isArray(images) ? images : [];
}

function formatProductColors(colors: PromobrindProductRow["colors"]): AdminProduct["colors"] {
  if (!Array.isArray(colors)) return [];
  return colors.map(color => typeof color === 'string' ? { name: color } : color);
}

function formatAdminProduct(
  product: PromobrindProductRow,
  imageUrl: string | null,
  price: number,
  stock: number | null,
): AdminProduct {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: firstDefined([product.description, product.short_description], null),
    short_description: valueOrNull(product.short_description),
    meta_description: valueOrNull(product.meta_description),
    brand: valueOrNull(product.brand),
    price,
    cost_price: valueOrNull(product.cost_price),
    stock,
    category_id: firstDefined([product.category_id, product.main_category_id], null),
    supplier_id: valueOrNull(product.supplier_id),
    supplier_reference: valueOrNull(product.supplier_reference),
    is_active: valueOrDefault(product.is_active, true),
    images: formatProductImages(imageUrl, product.images),
    colors: formatProductColors(product.colors),
    materials: parseMaterials(product.materials),
    min_quantity: valueOrDefault(product.min_quantity, 1),
    is_featured: valueOrDefault(product.is_featured, false),
    is_bestseller: valueOrDefault(product.is_bestseller, false),
    is_new: valueOrDefault(product.is_new, false),
    is_on_sale: valueOrDefault(product.is_on_sale, false),
    is_kit: valueOrDefault(product.is_kit, false),
    has_commercial_packaging: valueOrDefault(product.has_commercial_packaging, false),
    is_imported: valueOrDefault(product.is_imported, false),
    is_textil: valueOrDefault(product.is_textil, false),
    is_thermal: valueOrDefault(product.is_thermal, false),
    allows_personalization: valueOrDefault(product.allows_personalization, true),
    has_gift_box: valueOrDefault(product.has_gift_box, false),
    has_optional_packaging: valueOrDefault(product.has_optional_packaging, false),
    packing_type: valueOrNull(product.packing_type),
    height_cm: valueOrNull(product.height_cm),
    width_cm: valueOrNull(product.width_cm),
    length_cm: valueOrNull(product.length_cm),
    diameter_cm: valueOrNull(product.diameter_cm),
    weight_g: valueOrNull(product.weight_g),
    capacity_ml: valueOrNull(product.capacity_ml),
    internal_height_cm: valueOrNull(product.internal_height_cm),
    internal_width_cm: valueOrNull(product.internal_width_cm),
    internal_length_cm: valueOrNull(product.internal_length_cm),
    internal_diameter_cm: valueOrNull(product.internal_diameter_cm),
    box_width_mm: valueOrNull(product.box_width_mm),
    box_height_mm: valueOrNull(product.box_height_mm),
    box_length_mm: valueOrNull(product.box_length_mm),
    box_weight_kg: valueOrNull(product.box_weight_kg),
    box_quantity: valueOrNull(product.box_quantity),
    box_inner_quantity: valueOrNull(product.box_inner_quantity),
    box_volume_cm3: valueOrNull(product.box_volume_cm3),
    packaging_material: valueOrNull(product.packaging_material),
    packaging_color: valueOrNull(product.packaging_color),
    packaging_finish: valueOrNull(product.packaging_finish),
    suggested_price: valueOrNull(product.suggested_price),
    stock_unit: valueOrNull(product.stock_unit),
    min_order_quantity: valueOrNull(product.min_order_quantity),
    ncm_code: valueOrNull(product.ncm_code),
    ean: valueOrNull(product.ean),
    gtin: valueOrNull(product.gtin),
    ipi_rate: valueOrNull(product.ipi_rate),
    country_of_origin: valueOrNull(product.country_of_origin),
    cfop: valueOrNull(product.cfop),
    csosn: valueOrNull(product.csosn),
    icms_rate: valueOrNull(product.icms_rate),
    pis_rate: valueOrNull(product.pis_rate),
    cofins_rate: valueOrNull(product.cofins_rate),
    tax_regime: valueOrNull(product.tax_regime),
    cest: valueOrNull(product.cest),
    freight_class: valueOrNull(product.freight_class),
    default_carrier: valueOrNull(product.default_carrier),
    shipping_weight_kg: valueOrNull(product.shipping_weight_kg),
    shipping_width_cm: valueOrNull(product.shipping_width_cm),
    shipping_height_cm: valueOrNull(product.shipping_height_cm),
    shipping_length_cm: valueOrNull(product.shipping_length_cm),
    cubic_weight: valueOrNull(product.cubic_weight),
    requires_special_shipping: valueOrNull(product.requires_special_shipping),
    shipping_notes: valueOrNull(product.shipping_notes),
    lead_time_days: valueOrNull(product.lead_time_days),
    product_type: valueOrNull(product.product_type),
    supply_mode: valueOrNull(product.supply_mode),
    warranty_months: valueOrNull(product.warranty_months),
    gender: valueOrNull(product.gender),
    meta_title: valueOrNull(product.meta_title),
    meta_keywords: Array.isArray(product.meta_keywords) ? product.meta_keywords : null,
    slug: valueOrNull(product.slug),
    canonical_url: valueOrNull(product.canonical_url),
    video_url: product.videos?.[0] ?? null,
    key_benefits: valueOrNull(product.key_benefits),
    use_cases: valueOrNull(product.use_cases),
    created_at: valueOrDefault(product.created_at, ''),
    updated_at: valueOrDefault(product.updated_at, ''),
  };
}

export function useProductsManager() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<ProductFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);

  const { logAction } = useAuditLog();
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;
  const queryContextRef = useRef({ pageSize, advancedFilters });
  queryContextRef.current = { pageSize, advancedFilters };

  const loadProducts = useCallback(async ({ page, size, search, filters }: ProductFetchOptions) => {
    setIsLoading(true);
    try {
      const { fetchPromobrindProducts, getProductImageUrl, getProductPrice, getProductStock } = await import('@/lib/external-db');
      const offset = (page - 1) * size;
      const serverFilters = buildServerFilters(filters);

      const result = await fetchPromobrindProducts(({
        search: search || undefined, limit: size, offset,
        orderBy: { column: 'created_at', ascending: false },
        returnCount: true, filters: serverFilters,
      }));

      const { products: rawProducts, count } = result;
      const productsData: PromobrindProductRow[] = rawProducts;
      setTotalCount(count);

      const formatted = productsData.map(product => formatAdminProduct(
        product,
        getProductImageUrl(product),
        getProductPrice(product),
        getProductStock(product),
      ));
      setProducts(formatted);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(
    (page = currentPage, size = pageSize, search = searchTerm, filters = advancedFilters) =>
      loadProducts({ page, size, search, filters }),
    [advancedFilters, currentPage, loadProducts, pageSize, searchTerm],
  );

  useEffect(() => {
    const { pageSize: initialSize, advancedFilters: initialFilters } = queryContextRef.current;
    void loadProducts({ page: 1, size: initialSize, search: '', filters: initialFilters });
  }, [loadProducts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { pageSize: activeSize, advancedFilters: activeFilters } = queryContextRef.current;
      setCurrentPage(1);
      void loadProducts({ page: 1, size: activeSize, search: searchTerm, filters: activeFilters });
    }, 400);
    return () => clearTimeout(timer);
  }, [loadProducts, searchTerm]);

  const handleFiltersChange = useCallback((newFilters: ProductFilters) => {
    setAdvancedFilters(newFilters);
    setCurrentPage(1);
    void loadProducts({ page: 1, size: pageSize, search: searchTerm, filters: newFilters });
  }, [loadProducts, pageSize, searchTerm]);

  const displayedProducts = useMemo(() => {
    return products;
  }, [products]);

  const handlePageChange = (page: number) => { setCurrentPage(page); setSelectedIds(new Set()); fetchProducts(page, pageSize, searchTerm); };
  const handlePageSizeChange = (newSize: string) => { const size = parseInt(newSize, 10); setPageSize(size); setCurrentPage(1); fetchProducts(1, size, searchTerm); };
  const openCreateForm = () => navigate('/admin/cadastros/produto/novo');
  const openEditForm = (product: AdminProduct) => navigate(`/admin/cadastros/produto/${product.id}`);
  const openDeleteDialog = (product: AdminProduct) => { setSelectedProduct(product); setIsDeleteOpen(true); };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    try {
      await invokeExternalDbDelete('products', selectedProduct.id);
      await logAction({ action: 'DELETE', entityType: 'products', entityId: selectedProduct.id,
        oldValues: { sku: selectedProduct.sku, name: selectedProduct.name, price: selectedProduct.price }, newValues: null });
      toast.success("Produto excluído com sucesso");
      setIsDeleteOpen(false);
      fetchProducts(currentPage, pageSize, searchTerm);
    } catch (error: unknown) {
      console.error("Error deleting product:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao excluir produto");
    }
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === displayedProducts.length ? new Set() : new Set(displayedProducts.map(p => p.id)));
  }, [displayedProducts]);

  const handleBulkToggleActive = useCallback(async (activate: boolean) => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        invokeExternalDbSingle({ table: 'products', operation: 'update', id, data: { is_active: activate, updated_at: new Date().toISOString() } })
      ));
      toast.success(`${selectedIds.size} produto(s) ${activate ? 'ativado(s)' : 'desativado(s)'}`);
      setSelectedIds(new Set());
      fetchProducts(currentPage, pageSize, searchTerm);
    } catch (error: unknown) {
      console.error('Bulk update error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar produtos em lote');
    } finally { setIsBulkUpdating(false); }
  }, [selectedIds, currentPage, pageSize, searchTerm, fetchProducts]);

  const stats = useMemo(() => {
    const active = products.filter(p => p.is_active).length;
    const inactive = products.filter(p => !p.is_active).length;
    const noStock = products.filter(p => (p.stock ?? 0) <= 0).length;
    const avgPrice = products.length ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0;
    return { active, inactive, noStock, avgPrice };
  }, [products]);

  return {
    products: displayedProducts, isLoading, searchTerm, setSearchTerm,
    advancedFilters, handleFiltersChange,
    selectedIds, toggleSelect, toggleSelectAll, setSelectedIds,
    isBulkUpdating, handleBulkToggleActive,
    currentPage, pageSize, totalCount, totalPages, handlePageChange, handlePageSizeChange,
    isDeleteOpen, setIsDeleteOpen, isImportOpen, setIsImportOpen,
    selectedProduct, stats,
    openCreateForm, openEditForm, openDeleteDialog, handleDelete,
    fetchProducts, PAGE_SIZE_OPTIONS,
  };
}
