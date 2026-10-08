import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  useExternalProducts, 
  useExternalProductImages,
  useExternalCategories,
  useExternalSuppliers,
  useExternalTechniques,
  useExternalTags,
  useExternalSupplierColors,
  useExternalSupplierMaterials,
  type ExternalProduct,
  type ExternalCategory,
  type ExternalSupplier,
  type ExternalTechnique,
  type ExternalTag,
  type ExternalSupplierColor,
  type ExternalSupplierMaterial,
} from './useExternalDatabase';
import { useAuditLog } from './admin/useAuditLog';
import { useProductImport } from './useProductRegistrationImport';

// Tipos para o formulário de cadastro
export interface ProductFormData {
  name: string;
  sku: string;
  price: number;
  supplier_id: string;
  category_id: string;
  images: ProductImageInput[];
  colors: string[];
  materials: string[];
  description?: string;
  short_description?: string;
  cost_price?: number;
  subcategory_id?: string;
  brand?: string;
  model?: string;
  weight_grams?: number;
  width_cm?: number;
  height_cm?: number;
  depth_cm?: number;
  min_quantity?: number;
  stock?: number;
  lead_time_days?: number;
  is_kit?: boolean;
  is_active?: boolean;
  technique_ids?: string[];
  tag_ids?: string[];
}

export interface ProductImageInput {
  url: string;
  alt_text?: string;
  is_primary?: boolean;
  image_type?: 'main' | 'gallery' | 'detail' | 'mockup';
}

export interface BulkImportRow {
  name: string;
  sku: string;
  price: number | string;
  supplier_name?: string;
  supplier_id?: string;
  category_name?: string;
  category_id?: string;
  description?: string;
  cost_price?: number | string;
  brand?: string;
  model?: string;
  weight_grams?: number | string;
  colors?: string;
  materials?: string;
  images?: string;
  stock?: number | string;
  min_quantity?: number | string;
  [key: string]: unknown;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  row: number;
  data?: ProductFormData;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: keyof ProductFormData | '';
  required: boolean;
}

function recordsOrEmpty<T>(result: { records?: T[] } | null | undefined) {
  return result?.records ?? [];
}

// Hook principal de cadastro
export function useProductRegistration() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productsDb = useExternalProducts();
  const imagesDb = useExternalProductImages();
  const categoriesDb = useExternalCategories();
  const suppliersDb = useExternalSuppliers();
  const techniquesDb = useExternalTechniques();
  const tagsDb = useExternalTags();
  const colorsDb = useExternalSupplierColors();
  const materialsDb = useExternalSupplierMaterials();
  const { logAction } = useAuditLog();

  const fetchCategoriesAll = categoriesDb.fetchAll;
  const fetchSuppliersAll = suppliersDb.fetchAll;
  const fetchTechniquesAll = techniquesDb.fetchAll;
  const fetchTagsAll = tagsDb.fetchAll;
  const fetchColorsAll = colorsDb.fetchAll;
  const fetchMaterialsAll = materialsDb.fetchAll;
  const createProductRecord = productsDb.create;
  const createImageRecord = imagesDb.create;

  const [referenceData, setReferenceData] = useState<{
    categories: ExternalCategory[];
    suppliers: ExternalSupplier[];
    techniques: ExternalTechnique[];
    tags: ExternalTag[];
    colors: ExternalSupplierColor[];
    materials: ExternalSupplierMaterial[];
    isLoading: boolean;
    error: string | null;
  }>({ categories: [], suppliers: [], techniques: [], tags: [], colors: [], materials: [], isLoading: false, error: null });

  const loadReferenceData = useCallback(async () => {
    setReferenceData((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const [categoriesResult, suppliersResult, techniquesResult, tagsResult, colorsResult, materialsResult] = await Promise.all([
        fetchCategoriesAll({ filters: { is_active: true }, limit: 500 }),
        fetchSuppliersAll({ limit: 200 }),
        fetchTechniquesAll({ filters: { is_active: true }, limit: 100 }),
        fetchTagsAll({ limit: 500 }),
        fetchColorsAll({ limit: 500 }),
        fetchMaterialsAll({ limit: 500 }),
      ]);
      setReferenceData({
        categories: recordsOrEmpty(categoriesResult), suppliers: recordsOrEmpty(suppliersResult),
        techniques: recordsOrEmpty(techniquesResult), tags: recordsOrEmpty(tagsResult),
        colors: recordsOrEmpty(colorsResult), materials: recordsOrEmpty(materialsResult),
        isLoading: false, error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar dados de referência';
      setReferenceData((prev) => ({ ...prev, isLoading: false, error: message }));
      toast.error(message);
    }
  }, [fetchCategoriesAll, fetchSuppliersAll, fetchTechniquesAll, fetchTagsAll, fetchColorsAll, fetchMaterialsAll]);

  const createProduct = useCallback(async (data: ProductFormData): Promise<ExternalProduct | null> => {
    setIsSubmitting(true);
    try {
      const productData: Partial<ExternalProduct> = {
        name: data.name, sku: data.sku, price: data.price,
        supplier_id: data.supplier_id, category_id: data.category_id,
        description: data.description, short_description: data.short_description,
        cost_price: data.cost_price, subcategory_id: data.subcategory_id,
        brand: data.brand, model: data.model, weight_grams: data.weight_grams,
        width_cm: data.width_cm, height_cm: data.height_cm, depth_cm: data.depth_cm,
        min_quantity: data.min_quantity || 1, stock: data.stock || 0,
        lead_time_days: data.lead_time_days, is_kit: data.is_kit || false,
        is_active: data.is_active ?? true,
      };

      const createdProduct = await createProductRecord(productData);
      if (!createdProduct) throw new Error('Falha ao criar produto');

      if (data.images?.length > 0) {
        await Promise.all(data.images.map((img, index) =>
          createImageRecord({
            product_id: createdProduct.id, url: img.url,
            alt_text: img.alt_text || data.name, position: index,
            is_primary: img.is_primary || index === 0, image_type: img.image_type || 'main',
          })
        ));
      }

      await logAction({
        action: 'INSERT', entityType: 'products', entityId: createdProduct.id, oldValues: null,
        newValues: { name: data.name, sku: data.sku, price: data.price, supplier_id: data.supplier_id, category_id: data.category_id, colors: data.colors, materials: data.materials, images_count: data.images.length },
      });

      toast.success(`Produto "${data.name}" cadastrado com sucesso!`);
      return createdProduct;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar produto');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [createProductRecord, createImageRecord, logAction]);

  // Delegate import logic
  const { importProgress, importProducts, validateImportRow, generateTemplate } = useProductImport(referenceData, createProduct);

  return {
    isSubmitting, importProgress, referenceData,
    loadReferenceData, createProduct, importProducts, validateImportRow, generateTemplate,
  };
}

// Campos disponíveis para mapeamento
export const PRODUCT_FIELDS: Array<{
  key: keyof ProductFormData; label: string; required: boolean; type: 'text' | 'number' | 'list';
}> = [
  { key: 'name', label: 'Nome do Produto', required: true, type: 'text' },
  { key: 'sku', label: 'SKU', required: true, type: 'text' },
  { key: 'price', label: 'Preço', required: true, type: 'number' },
  { key: 'supplier_id', label: 'Fornecedor', required: true, type: 'text' },
  { key: 'category_id', label: 'Categoria', required: true, type: 'text' },
  { key: 'images', label: 'Imagens (URLs)', required: true, type: 'list' },
  { key: 'colors', label: 'Cores', required: true, type: 'list' },
  { key: 'materials', label: 'Materiais', required: true, type: 'list' },
  { key: 'description', label: 'Descrição', required: false, type: 'text' },
  { key: 'short_description', label: 'Descrição Curta', required: false, type: 'text' },
  { key: 'cost_price', label: 'Preço de Custo', required: false, type: 'number' },
  { key: 'brand', label: 'Marca', required: false, type: 'text' },
  { key: 'model', label: 'Modelo', required: false, type: 'text' },
  { key: 'weight_grams', label: 'Peso (g)', required: false, type: 'number' },
  { key: 'width_cm', label: 'Largura (cm)', required: false, type: 'number' },
  { key: 'height_cm', label: 'Altura (cm)', required: false, type: 'number' },
  { key: 'depth_cm', label: 'Profundidade (cm)', required: false, type: 'number' },
  { key: 'stock', label: 'Estoque', required: false, type: 'number' },
  { key: 'min_quantity', label: 'Quantidade Mínima', required: false, type: 'number' },
  { key: 'lead_time_days', label: 'Prazo de Entrega (dias)', required: false, type: 'number' },
];
