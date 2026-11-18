/**
 * AdminProductFormPage — Página full-screen para criar/editar produtos
 * Substitui o Dialog modal por uma experiência imersiva com sidebar de navegação
 */

import { useState, useEffect, Suspense, type Dispatch, type SetStateAction } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { MainLayout } from "@/components/layout/MainLayout";
import { invokeExternalDbSingle, fetchPromobrindProductById, getProductImageUrl, getProductPrice, getProductStock, type PromobrindProduct } from '@/lib/external-db';
import { useAuditLog } from '@/hooks/admin/useAuditLog';
import { toast } from 'sonner';
import { type ProductFormData } from '@/components/admin/products/ProductFormSchema';
import { Loader2, ArrowLeft, History, Pencil, Copy, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { PageSEO } from "@/components/seo/PageSEO";
import { canonicalPrivateStorageValue } from '@/lib/private-storage';

// Lazy load heavy sub-components
const ProductFormFullscreen = lazyWithRetry(() => import('@/components/admin/products/ProductFormFullscreen').then(m => ({ default: m.ProductFormFullscreen })));
const AuditHistory = lazyWithRetry(() => import('@/components/audit/AuditHistory').then(m => ({ default: m.AuditHistory })));

type EditableProduct = PromobrindProduct & Partial<Omit<ProductFormData, keyof PromobrindProduct>> & {
  videos?: string[] | null;
  category?: string | null;
  supplier?: string | null;
};

function valueOr<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}

function textOr(value: string | null | undefined, fallback = ''): string {
  return value || fallback;
}

function nullableText(value: string | null | undefined): string | null {
  return value || null;
}

function resolvedProductType(product: EditableProduct): ProductFormData['product_type'] {
  if (product.product_type) return product.product_type;
  return product.is_kit ? 'kit' : 'product';
}

function metaKeywordsText(keywords: EditableProduct['meta_keywords']): string {
  return Array.isArray(keywords) ? keywords.join(', ') : '';
}

function productVideoUrl(product: EditableProduct): string {
  return product.videos?.[0] ?? product.video_url ?? '';
}

function mapProductToFormData(product: EditableProduct): Partial<ProductFormData> {
  return {
    sku: textOr(product.sku), name: textOr(product.name),
    description: valueOr(product.description, valueOr(product.short_description, '')),
    short_description: valueOr(product.short_description, ''), meta_description: valueOr(product.meta_description, ''),
    brand: valueOr(product.brand, ''), category_id: valueOr(product.category_id, valueOr(product.main_category_id, '')),
    supplier_id: valueOr(product.supplier_id, ''), supplier_reference: valueOr(product.supplier_reference, ''),
    sale_price: valueOr(getProductPrice(product), 0), cost_price: valueOr(product.cost_price, 0),
    suggested_price: valueOr(product.suggested_price, null), stock_quantity: valueOr(getProductStock(product), 0),
    stock_unit: valueOr(product.stock_unit, 'un'), product_type: resolvedProductType(product),
    min_quantity: valueOr(product.min_quantity, 1), min_order_quantity: valueOr(product.min_order_quantity, null),
    height_cm: valueOr(product.height_cm, null), width_cm: valueOr(product.width_cm, null),
    length_cm: valueOr(product.length_cm, null), diameter_cm: valueOr(product.diameter_cm, null),
    weight_g: valueOr(product.weight_g, null), capacity_ml: valueOr(product.capacity_ml, null),
    internal_height_cm: valueOr(product.internal_height_cm, null), internal_width_cm: valueOr(product.internal_width_cm, null),
    internal_length_cm: valueOr(product.internal_length_cm, null), internal_diameter_cm: valueOr(product.internal_diameter_cm, null),
    packing_type: valueOr(product.packing_type, ''), box_width_mm: valueOr(product.box_width_mm, null),
    box_height_mm: valueOr(product.box_height_mm, null), box_length_mm: valueOr(product.box_length_mm, null),
    box_weight_kg: valueOr(product.box_weight_kg, null), box_quantity: valueOr(product.box_quantity, null),
    box_volume_cm3: valueOr(product.box_volume_cm3, null), packaging_material: valueOr(product.packaging_material, ''),
    packaging_color: valueOr(product.packaging_color, ''), packaging_finish: valueOr(product.packaging_finish, ''),
    is_active: valueOr(product.is_active, true), is_featured: valueOr(product.is_featured, false),
    is_bestseller: valueOr(product.is_bestseller, false), is_new: valueOr(product.is_new, false),
    is_on_sale: valueOr(product.is_on_sale, false), is_featured_expires_at: valueOr(product.is_featured_expires_at, null),
    is_bestseller_expires_at: valueOr(product.is_bestseller_expires_at, null), is_new_expires_at: valueOr(product.is_new_expires_at, null),
    is_on_sale_expires_at: valueOr(product.is_on_sale_expires_at, null), is_kit: valueOr(product.is_kit, false),
    has_commercial_packaging: valueOr(product.has_commercial_packaging, false), is_imported: valueOr(product.is_imported, false),
    is_textil: valueOr(product.is_textil, false), is_thermal: valueOr(product.is_thermal, false),
    allows_personalization: valueOr(product.allows_personalization, true), has_gift_box: valueOr(product.has_gift_box, false),
    has_optional_packaging: valueOr(product.has_optional_packaging, false), ncm_code: valueOr(product.ncm_code, ''),
    ean: valueOr(product.ean, ''), gtin: valueOr(product.gtin, ''), ipi_rate: valueOr(product.ipi_rate, null),
    country_of_origin: valueOr(product.country_of_origin, ''), cfop: valueOr(product.cfop, ''),
    csosn: valueOr(product.csosn, ''), icms_rate: valueOr(product.icms_rate, null),
    pis_rate: valueOr(product.pis_rate, null), cofins_rate: valueOr(product.cofins_rate, null),
    tax_regime: valueOr(product.tax_regime, ''), cest: valueOr(product.cest, ''),
    freight_class: valueOr(product.freight_class, ''), default_carrier: valueOr(product.default_carrier, ''),
    shipping_weight_kg: valueOr(product.shipping_weight_kg, null), shipping_width_cm: valueOr(product.shipping_width_cm, null),
    shipping_height_cm: valueOr(product.shipping_height_cm, null), shipping_length_cm: valueOr(product.shipping_length_cm, null),
    cubic_weight: valueOr(product.cubic_weight, null), requires_special_shipping: valueOr(product.requires_special_shipping, false),
    shipping_notes: valueOr(product.shipping_notes, ''), lead_time_days: valueOr(product.lead_time_days, null),
    supply_mode: valueOr(product.supply_mode, ''), warranty_months: valueOr(product.warranty_months, null),
    gender: valueOr(product.gender, ''), meta_title: valueOr(product.meta_title, ''),
    meta_keywords: metaKeywordsText(product.meta_keywords), slug: valueOr(product.slug, ''),
    canonical_url: valueOr(product.canonical_url, ''), video_url: productVideoUrl(product),
    key_benefits: valueOr(product.key_benefits, ''), use_cases: valueOr(product.use_cases, ''),
  };
}

function keywordList(value: string | null | undefined): string[] | null {
  if (!value) return null;
  return value.split(',').map((keyword) => keyword.trim()).filter(Boolean);
}

function buildProductData(data: ProductFormData, images: string[]): Record<string, unknown> {
  const durableImages = images.map((image) => (
    canonicalPrivateStorageValue(image, 'personalization-images') ?? image
  ));
  const productData: Record<string, unknown> = {
    sku: data.sku, name: data.name, description: nullableText(data.description),
    short_description: nullableText(data.short_description), meta_description: nullableText(data.meta_description),
    brand: nullableText(data.brand), category_id: nullableText(data.category_id), supplier_id: nullableText(data.supplier_id),
    supplier_reference: nullableText(data.supplier_reference), sale_price: valueOr(data.sale_price, 0),
    cost_price: valueOr(data.cost_price, null), suggested_price: valueOr(data.suggested_price, null),
    stock_quantity: valueOr(data.stock_quantity, 0), stock_unit: textOr(data.stock_unit, 'un'),
    product_type: textOr(data.product_type, 'product'), is_kit: data.product_type === 'kit',
    min_quantity: valueOr(data.min_quantity, 1), min_order_quantity: valueOr(data.min_order_quantity, null),
    is_active: data.is_active, is_featured: data.is_featured, is_bestseller: data.is_bestseller,
    is_new: data.is_new, is_on_sale: data.is_on_sale,
    is_featured_expires_at: nullableText(data.is_featured_expires_at),
    is_bestseller_expires_at: nullableText(data.is_bestseller_expires_at),
    is_new_expires_at: nullableText(data.is_new_expires_at), is_on_sale_expires_at: nullableText(data.is_on_sale_expires_at),
    has_commercial_packaging: data.has_commercial_packaging, is_imported: data.is_imported,
    is_textil: data.is_textil, is_thermal: data.is_thermal, allows_personalization: data.allows_personalization,
    has_gift_box: data.has_gift_box, has_optional_packaging: data.has_optional_packaging,
    packing_type: nullableText(data.packing_type), height_cm: valueOr(data.height_cm, null),
    width_cm: valueOr(data.width_cm, null), length_cm: valueOr(data.length_cm, null),
    diameter_cm: valueOr(data.diameter_cm, null), weight_g: valueOr(data.weight_g, null),
    capacity_ml: valueOr(data.capacity_ml, null), internal_height_cm: valueOr(data.internal_height_cm, null),
    internal_width_cm: valueOr(data.internal_width_cm, null), internal_length_cm: valueOr(data.internal_length_cm, null),
    internal_diameter_cm: valueOr(data.internal_diameter_cm, null), box_width_mm: valueOr(data.box_width_mm, null),
    box_height_mm: valueOr(data.box_height_mm, null), box_length_mm: valueOr(data.box_length_mm, null),
    box_weight_kg: valueOr(data.box_weight_kg, null), box_quantity: valueOr(data.box_quantity, null),
    box_volume_cm3: valueOr(data.box_volume_cm3, null), packaging_material: nullableText(data.packaging_material),
    packaging_color: nullableText(data.packaging_color), packaging_finish: nullableText(data.packaging_finish),
    ncm_code: nullableText(data.ncm_code), ean: nullableText(data.ean), gtin: nullableText(data.gtin),
    country_of_origin: nullableText(data.country_of_origin), supplier_product_url: nullableText(data.supplier_product_url),
    supply_mode: nullableText(data.supply_mode), ipi_rate: valueOr(data.ipi_rate, null),
    lead_time_days: valueOr(data.lead_time_days, null), gender: nullableText(data.gender),
    meta_title: nullableText(data.meta_title), meta_keywords: keywordList(data.meta_keywords),
    slug: nullableText(data.slug), canonical_url: nullableText(data.canonical_url),
    videos: data.video_url ? [data.video_url] : [], key_benefits: nullableText(data.key_benefits),
    use_cases: nullableText(data.use_cases), updated_at: new Date().toISOString(),
  };
  if (durableImages.length > 0) {
    productData.images = durableImages;
    productData.primary_image_url = durableImages[0];
  }
  return productData;
}

type AuditTools = Pick<ReturnType<typeof useAuditLog>, 'logAction' | 'getChangedFields'>;
type Navigate = ReturnType<typeof useNavigate>;

async function duplicateSkuProduct(
  data: ProductFormData,
  isEdit: boolean,
  product: EditableProduct | null,
): Promise<PromobrindProduct | undefined> {
  const skuChanged = Boolean(isEdit && product && data.sku !== product.sku);
  if (isEdit && !skuChanged) return undefined;
  const { fetchPromobrindProducts } = await import('@/lib/external-db');
  const products = await fetchPromobrindProducts({ search: data.sku, limit: 5 });
  return products.find((candidate) => candidate.sku?.toLowerCase() === data.sku.toLowerCase());
}

interface PersistProductInput {
  isEdit: boolean;
  product: EditableProduct | null;
  productData: Record<string, unknown>;
  audit: AuditTools;
  navigate: Navigate;
  setProduct: Dispatch<SetStateAction<EditableProduct | null>>;
}

async function updateExistingProduct(input: PersistProductInput, product: EditableProduct): Promise<void> {
  await invokeExternalDbSingle<PromobrindProduct>({ table: 'products', operation: 'update', id: product.id, data: input.productData });
  const { oldFields, newFields } = input.audit.getChangedFields(
    { sku: product.sku, name: product.name, description: product.description, sale_price: getProductPrice(product), stock_quantity: getProductStock(product), is_active: product.is_active },
    input.productData,
  );
  if (Object.keys(newFields).length > 0) {
    await input.audit.logAction({ action: 'UPDATE', entityType: 'products', entityId: product.id, oldValues: oldFields, newValues: newFields });
  }
  toast.success('Produto atualizado com sucesso');
  const refreshed = await fetchPromobrindProductById(product.id);
  if (refreshed) input.setProduct(refreshed);
}

async function insertProduct(input: PersistProductInput): Promise<void> {
  const newProduct = await invokeExternalDbSingle<PromobrindProduct>({
    table: 'products', operation: 'insert', data: { ...input.productData, created_at: new Date().toISOString() },
  });
  if (!newProduct) {
    toast.success('Produto criado com sucesso');
    input.navigate('/admin/cadastros');
    return;
  }
  await input.audit.logAction({
    action: 'INSERT', entityType: 'products', entityId: newProduct.id, oldValues: null,
    newValues: {
      sku: String(input.productData.sku ?? ""), name: String(input.productData.name ?? ""),
      sale_price: Number(input.productData.sale_price ?? 0), is_active: Boolean(input.productData.is_active),
    },
  });
  toast.success('Produto criado! Agora vincule Tags, Ramos, Marketing e Técnicas.');
  input.navigate(`/admin/cadastros/produto/${newProduct.id}`, { replace: true });
}

async function persistProduct(input: PersistProductInput): Promise<void> {
  if (input.isEdit && input.product) {
    await updateExistingProduct(input, input.product);
    return;
  }
  await insertProduct(input);
}

function productImages(product: EditableProduct): string[] {
  const imageUrl = getProductImageUrl(product);
  if (imageUrl) {
    const additional = Array.isArray(product.images) ? product.images.filter((image: string) => image !== imageUrl) : [];
    return [imageUrl, ...additional];
  }
  return Array.isArray(product.images) ? product.images : [];
}

function durableProductImages(product: EditableProduct): string[] {
  return productImages(product).map((image) => (
    canonicalPrivateStorageValue(image, 'personalization-images') ?? image
  ));
}

async function exportProduct(product: EditableProduct): Promise<void> {
  const { exportProductPdf } = await import('@/utils/productPdfExport');
  exportProductPdf({
    formData: mapProductToFormData(product) as ProductFormData,
    productImages: productImages(product),
    categoryName: textOr(product.category_name, textOr(product.category)),
    supplierName: textOr(product.supplier_name, textOr(product.supplier)),
  });
  toast.success('PDF gerado com sucesso!');
}

interface ProductPageHeaderProps {
  isEdit: boolean;
  product: EditableProduct | null;
  activeTab: 'form' | 'history';
  setActiveTab: Dispatch<SetStateAction<'form' | 'history'>>;
  navigate: Navigate;
}

function ProductPageHeader({ isEdit, product, activeTab, setActiveTab, navigate }: ProductPageHeaderProps) {
  if (!isEdit) return null;
  const duplicate = () => {
    if (!product) return;
    sessionStorage.setItem('duplicate_product', JSON.stringify({ ...product, sku: `${product.sku}-COPIA` }));
    navigate('/admin/cadastros/produto/novo');
  };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate('/admin/cadastros')} className="h-9 w-9 rounded-lg">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {product && <p className="text-sm text-muted-foreground">{product.sku} — {product.name}</p>}
      </div>
      <div className="flex items-center gap-2">
        {product && <>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { void exportProduct(product); }}>
            <FileDown className="h-3.5 w-3.5" />Exportar PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={duplicate}>
            <Copy className="h-3.5 w-3.5" />Duplicar
          </Button>
        </>}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'form' | 'history')}>
          <TabsList className="h-9">
            <TabsTrigger value="form" className="gap-1.5 text-xs"><Pencil className="h-3.5 w-3.5" />Editar</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

interface ProductPageContentProps {
  activeTab: 'form' | 'history';
  isEdit: boolean;
  id: string | undefined;
  product: EditableProduct | null;
  duplicateProduct: EditableProduct | null;
  onSubmit: (data: ProductFormData, images: string[]) => Promise<void>;
  isSaving: boolean;
  navigate: Navigate;
}

function formSource(isEdit: boolean, product: EditableProduct | null, duplicate: EditableProduct | null): EditableProduct | null {
  return isEdit ? product : duplicate;
}

function ProductPageContent(props: ProductPageContentProps) {
  if (props.activeTab === 'history') {
    if (!props.isEdit || !props.id) return null;
    return <AuditHistory entityType="products" entityId={props.id} title="Histórico de Alterações" maxHeight="70vh" />;
  }
  const source = formSource(props.isEdit, props.product, props.duplicateProduct);
  return (
    <ProductFormFullscreen
      initialData={source ? mapProductToFormData(source) : undefined}
      productImages={source ? durableProductImages(source) : []}
      productId={props.isEdit ? props.id : undefined}
      onSubmit={props.onSubmit}
      onCancel={() => props.navigate('/admin/cadastros')}
      isSaving={props.isSaving}
      isEdit={props.isEdit}
    />
  );
}

export default function AdminProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== 'novo';

  const [product, setProduct] = useState<EditableProduct | null>(null);
  const [duplicateProduct, setDuplicateProduct] = useState<EditableProduct | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // Load duplicate data from sessionStorage for new products
  useEffect(() => {
    if (!isEdit) {
      const stored = sessionStorage.getItem('duplicate_product');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as EditableProduct;
          setDuplicateProduct(parsed);
          toast.info(`Duplicando produto: ${parsed.name}. Altere o SKU antes de salvar.`);
        } catch { /* ignore */ }
        sessionStorage.removeItem('duplicate_product');
      }
    }
  }, [isEdit]);

  const { logAction, getChangedFields } = useAuditLog();

  // Load product data for edit mode
  useEffect(() => {
    if (!isEdit || !id) return;
    
    const loadProduct = async () => {
      setIsLoading(true);
      try {
        const fullProduct = await fetchPromobrindProductById(id);
        if (fullProduct) {
          setProduct(fullProduct);
        } else {
          toast.error('Produto não encontrado');
          navigate('/admin/cadastros');
        }
      } catch (err) {
        console.error('Error loading product:', err);
        toast.error('Erro ao carregar produto');
        navigate('/admin/cadastros');
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id, isEdit, navigate]);

  const handleFormSubmit = async (data: ProductFormData, images: string[]) => {
    setIsSaving(true);
    try {
      const duplicate = await duplicateSkuProduct(data, isEdit, product);
      if (duplicate) {
        toast.error(`SKU "${data.sku}" já está cadastrado no produto "${duplicate.name}"`);
        return;
      }
      const productData = buildProductData(data, images);
      await persistProduct({
        isEdit, product, productData, audit: { logAction, getChangedFields }, navigate, setProduct,
      });
    } catch (error: unknown) {
      console.error('Error saving product:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar produto');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <>
      <PageSEO title="Cadastro de Produto" description="Cadastre ou edite produtos do catálogo." path="/admin/cadastros/produto" noIndex />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando produto...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* Breadcrumbs are rendered by MainLayout's PersistentBreadcrumbs */}

        <ProductPageHeader isEdit={isEdit} product={product} activeTab={activeTab}
          setActiveTab={setActiveTab} navigate={navigate} />

        {/* Content */}
        <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
          <ProductPageContent activeTab={activeTab} isEdit={isEdit} id={id} product={product}
            duplicateProduct={duplicateProduct} onSubmit={handleFormSubmit} isSaving={isSaving} navigate={navigate} />
        </Suspense>
      </div>
    </>
  );
}
