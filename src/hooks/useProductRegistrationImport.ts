/**
 * Import-related logic extracted from useProductRegistration
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { 
  ProductFormData, 
  ProductImageInput, 
  BulkImportRow, 
  ImportValidationResult 
} from './useProductRegistration';
import type { ExternalSupplier, ExternalCategory } from './useExternalDatabase';

function resolveSupplierId(
  row: BulkImportRow,
  suppliers: ExternalSupplier[],
  errors: string[],
): string | undefined {
  if (row.supplier_id) return row.supplier_id;
  const supplier = row.supplier_name
    ? suppliers.find(item => item.name.toLowerCase() === row.supplier_name?.toLowerCase())
    : undefined;
  if (supplier) return supplier.id;
  errors.push(row.supplier_name
    ? `Fornecedor "${row.supplier_name}" não encontrado`
    : 'Fornecedor é obrigatório');
  return undefined;
}

function resolveCategoryId(
  row: BulkImportRow,
  categories: ExternalCategory[],
  errors: string[],
  warnings: string[],
): string | undefined {
  if (row.category_id) return row.category_id;
  const category = row.category_name
    ? categories.find(item => item.name.toLowerCase() === row.category_name?.toLowerCase())
    : undefined;
  if (category) return category.id;
  if (row.category_name) warnings.push(`Categoria "${row.category_name}" não encontrada`);
  errors.push('Categoria é obrigatória');
  return undefined;
}

function splitValues(value: string | undefined): string[] {
  return value?.split(',').map(item => item.trim()).filter(Boolean) || [];
}

function optionalFloat(value: string | number | undefined): number | undefined {
  return value ? parseFloat(String(value)) : undefined;
}

function optionalInteger(value: string | number | undefined, fallback?: number): number | undefined {
  return value ? parseInt(String(value)) : fallback;
}

function validateIdentity(row: BulkImportRow, errors: string[]): void {
  if (!row.name?.trim()) errors.push('Nome é obrigatório');
  if (!row.sku?.trim()) errors.push('SKU é obrigatório');
}

function parsePrice(value: string | number, errors: string[]): number {
  const price = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(price) || price <= 0) errors.push('Preço deve ser um número maior que zero');
  return price;
}

function requireValues(values: string[], message: string, errors: string[]): void {
  if (values.length === 0) errors.push(message);
}

export function useProductImport(
  referenceData: { suppliers: ExternalSupplier[]; categories: ExternalCategory[] },
  createProduct: (data: ProductFormData) => Promise<unknown>
) {
  const [importProgress, setImportProgress] = useState<{
    total: number; processed: number; succeeded: number; failed: number;
  } | null>(null);

  const validateImportRow = useCallback((
    row: BulkImportRow, rowNumber: number,
    suppliers: ExternalSupplier[], categories: ExternalCategory[]
  ): ImportValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    validateIdentity(row, errors);
    const price = parsePrice(row.price, errors);

    const supplierId = resolveSupplierId(row, suppliers, errors);
    const categoryId = resolveCategoryId(row, categories, errors, warnings);

    const colors = splitValues(row.colors);
    requireValues(colors, 'Pelo menos uma cor é obrigatória', errors);

    const materials = splitValues(row.materials);
    requireValues(materials, 'Pelo menos um material é obrigatório', errors);

    const imageUrls = splitValues(row.images);
    requireValues(imageUrls, 'Pelo menos uma imagem é obrigatória', errors);

    const images: ProductImageInput[] = imageUrls.map((url, idx) => ({
      url, is_primary: idx === 0, image_type: 'main' as const,
    }));

    if (errors.length > 0 || !supplierId || !categoryId) {
      return { valid: false, errors, warnings, row: rowNumber };
    }

    return {
      valid: true, errors: [], warnings, row: rowNumber,
      data: {
        name: row.name.trim(), sku: row.sku.trim(), price,
        supplier_id: supplierId, category_id: categoryId,
        description: row.description?.trim(),
        cost_price: optionalFloat(row.cost_price),
        brand: row.brand?.trim(), model: row.model?.trim(),
        weight_grams: optionalInteger(row.weight_grams),
        stock: optionalInteger(row.stock, 0),
        min_quantity: optionalInteger(row.min_quantity, 1),
        colors, materials, images,
      },
    };
  }, []);

  const importProducts = useCallback(async (
    rows: BulkImportRow[],
    onProgress?: (progress: typeof importProgress) => void
  ) => {
    const { suppliers, categories } = referenceData;
    const progress = { total: rows.length, processed: 0, succeeded: 0, failed: 0 };
    setImportProgress(progress);
    onProgress?.(progress);

    const errors: Array<{ row: number; errors: string[] }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const validation = validateImportRow(row, i + 1, suppliers, categories);
      if (!validation.valid) {
        progress.failed++;
        errors.push({ row: i + 1, errors: validation.errors });
      } else if (validation.data) {
        try { await createProduct(validation.data); progress.succeeded++; }
        catch { progress.failed++; errors.push({ row: i + 1, errors: ['Erro ao salvar no banco de dados'] }); }
      }
      progress.processed++;
      setImportProgress({ ...progress });
      onProgress?.({ ...progress });
    }

    if (progress.succeeded > 0) toast.success(`${progress.succeeded} produto(s) importado(s) com sucesso!`);
    if (progress.failed > 0) toast.error(`${progress.failed} produto(s) falharam na importação`);
    setImportProgress(null);
    return { succeeded: progress.succeeded, failed: progress.failed, errors };
  }, [referenceData, validateImportRow, createProduct]);

  const generateTemplate = useCallback(() => {
    const headers = ['name','sku','price','supplier_name','category_name','description','cost_price','brand','model','weight_grams','colors','materials','images','stock','min_quantity'];
    const exampleRow = ['Caneta Personalizada','CAN-001','5.99','Fornecedor ABC','Canetas','Caneta esferográfica para brindes','2.50','Marca XYZ','Modelo Standard','15','Azul,Vermelho,Preto','Plástico,Metal','https://exemplo.com/imagem1.jpg,https://exemplo.com/imagem2.jpg','1000','50'];
    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_produtos.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Template baixado com sucesso!');
  }, []);

  return { importProgress, importProducts, validateImportRow, generateTemplate };
}
