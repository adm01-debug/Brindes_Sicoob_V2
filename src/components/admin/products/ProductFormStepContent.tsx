/**
 * ProductFormStepContent — Renderiza o conteúdo de cada etapa do formulário
 */
import React, { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Package, Layers, Info, Wand2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { SectionCard } from './ProductFormHelpers';
import { CategoryCascadeSelector } from './CategoryCascadeSelector';
import { ProductSupplierSection } from './sections/ProductSupplierSection';
import { ProductInfoSection } from './sections/ProductInfoSection';
import { ProductDimensionsSection } from './sections/ProductDimensionsSection';
import { ProductPriceSection } from './sections/ProductPriceSection';
import { ProductFlagsSection } from './sections/ProductFlagsSection';
import { ProductPackagingSection } from './sections/ProductPackagingSection';
import { ProductFiscalSection } from './sections/ProductFiscalSection';
import { ProductSeoSection } from './sections/ProductSeoSection';
import { ProductMarketingTextsSection } from './sections/ProductMarketingTextsSection';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import type { ProductFormData } from './ProductFormSchema';
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';

const ProductClassificationSection = lazyWithRetry(() => import('./sections/ProductClassificationSection'));
const ProductMediaSection = lazyWithRetry(() => import('./sections/ProductMediaSection'));
const ProductEngravingSection = lazyWithRetry(() => import('./sections/ProductEngravingSection'));
const ProductKitComponentsSection = lazyWithRetry(() => import('../products/kit-components/ProductKitComponentsSection').then(m => ({ default: m.ProductKitComponentsSection })));

function SectionSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/70">
      <div className="space-y-4 p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    </Card>
  );
}

interface FormProps {
  register: UseFormRegister<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  watch: UseFormWatch<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
  numericProps: (name: keyof ProductFormData) => object;
}

interface StepContentProps {
  stepId: string;
  formProps: FormProps;
  formValues: ProductFormData;
  productId?: string;
  isEdit: boolean;
  images: string[];
  onImagesChange: (imgs: string[]) => void;
  supplierId: string;
  onSupplierChange: (id: string, name?: string, markupPercent?: number | null) => void;
  skuStatus: 'idle' | 'checking' | 'valid' | 'duplicate';
  duplicateName: string;
  skuManuallyEdited: boolean;
  onSkuManualEdit: () => void;
  isBoxProduct: boolean;
  supplierMarkup: number | null;
  costPriceDisplay: string;
  salePriceDisplay: string;
  onCostPriceDisplayChange: (v: string) => void;
  onSalePriceDisplayChange: (v: string) => void;
  onSalePriceManualEdit: () => void;
  flags: Record<string, boolean>;
  expirations: Record<string, string | null>;
  generateSeoAI: () => void;
  isSeoGenerating: boolean;
}

function EssentialsStep(props: StepContentProps) {
  const { formProps, formValues, supplierId, onSupplierChange, productId, isEdit, skuStatus, duplicateName, skuManuallyEdited, onSkuManualEdit, isBoxProduct } = props;
  return (
    <>
      <ProductSupplierSection supplierId={supplierId} onSupplierChange={onSupplierChange} setValue={formProps.setValue} errors={formProps.errors} productId={productId} isEdit={isEdit} primarySupplierName={formValues.brand || ''} />
      <ProductInfoSection {...formProps} skuStatus={skuStatus} duplicateName={duplicateName} skuManuallyEdited={skuManuallyEdited} onSkuManualEdit={onSkuManualEdit} />
      <ProductDimensionsSection {...formProps} isBoxProduct={isBoxProduct} />
    </>
  );
}

function CommercialStep({ formProps, formValues, flags, expirations }: StepContentProps) {
  return (
    <>
      <SectionCard id="category" title="Categoria" icon={Layers} subtitle="Classificação principal do produto no catálogo">
        <CategoryCascadeSelector value={formValues.category_id || ''} onChange={(id) => formProps.setValue('category_id', id)} error={formProps.errors.category_id?.message} />
      </SectionCard>
      <ProductFlagsSection setValue={formProps.setValue} flags={flags} expirations={expirations} />
    </>
  );
}

function FiscalStep(props: StepContentProps) {
  const { formProps, supplierMarkup, costPriceDisplay, salePriceDisplay, onCostPriceDisplayChange, onSalePriceDisplayChange, onSalePriceManualEdit } = props;
  return (
    <>
      <ProductPriceSection {...formProps} supplierMarkup={supplierMarkup} costPriceDisplay={costPriceDisplay} salePriceDisplay={salePriceDisplay} onCostPriceDisplayChange={onCostPriceDisplayChange} onSalePriceDisplayChange={onSalePriceDisplayChange} onSalePriceManualEdit={onSalePriceManualEdit} />
      <ProductFiscalSection {...formProps} />
    </>
  );
}

function ContentStep({ formProps, generateSeoAI, isSeoGenerating }: StepContentProps) {
  return (
    <>
      <div className="flex items-center justify-end">
        <Button type="button" variant="outline" size="sm" onClick={generateSeoAI} disabled={isSeoGenerating} className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
          {isSeoGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 animate-pulse" />}
          {isSeoGenerating ? 'Gerando...' : 'Preencher com IA'}
        </Button>
      </div>
      <ProductSeoSection {...formProps} />
      <ProductMarketingTextsSection register={formProps.register} />
    </>
  );
}

function ClassificationStep({ productId, isEdit, formValues, formProps }: StepContentProps) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <ProductClassificationSection productId={productId} isEdit={isEdit} productName={formValues.name} productSku={formValues.sku} gender={formValues.gender || ''} onGenderChange={(value) => formProps.setValue('gender', value)} />
    </Suspense>
  );
}

function KitsStep({ productId, formValues, formProps }: StepContentProps) {
  const toggleKit = () => formProps.setValue('is_kit', !formValues.is_kit);
  return (
    <>
      <SectionCard id="kit-flag" title="Tipo de Produto" icon={Package} subtitle="Defina se este produto é um kit">
        <div className={cn('flex items-center justify-between rounded-lg border p-3 transition-all duration-200 cursor-pointer hover:bg-accent/30', formValues.is_kit ? 'bg-primary/5 border-primary/20' : 'border-border/50')} onClick={toggleKit} role="switch" aria-checked={Boolean(formValues.is_kit)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleKit(); } }}>
          <div className="flex items-center gap-1.5">
            <Label className="cursor-pointer text-xs font-medium">É Kit</Label>
            <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground/40 cursor-help shrink-0" /></TooltipTrigger><TooltipContent className="text-xs max-w-[220px]">Define como kit composto por múltiplos componentes</TooltipContent></Tooltip>
          </div>
          <div onClick={(event) => event.stopPropagation()}><Switch checked={Boolean(formValues.is_kit)} onCheckedChange={(value) => formProps.setValue('is_kit', value)} /></div>
        </div>
      </SectionCard>
      {formValues.is_kit && (
        <Suspense fallback={<SectionSkeleton />}>
          <ProductKitComponentsSection productId={productId || ''} boxInternalDimensions={{ height_cm: formValues.internal_height_cm ?? null, width_cm: formValues.internal_width_cm ?? null, length_cm: formValues.internal_length_cm ?? null }} />
        </Suspense>
      )}
    </>
  );
}

export function ProductFormStepContent(props: StepContentProps) {
  switch (props.stepId) {
    case 'essentials':
      return <EssentialsStep {...props} />;
    case 'commercial':
      return <CommercialStep {...props} />;
    case 'packaging':
      return <ProductPackagingSection {...props.formProps} />;
    case 'fiscal':
      return <FiscalStep {...props} />;
    case 'content':
      return <ContentStep {...props} />;
    case 'engraving':
      return <Suspense fallback={<SectionSkeleton />}><ProductEngravingSection productId={props.productId} isEdit={props.isEdit} /></Suspense>;
    case 'classification':
      return <ClassificationStep {...props} />;
    case 'kits':
      return <KitsStep {...props} />;
    case 'media':
      return <Suspense fallback={<SectionSkeleton />}><ProductMediaSection images={props.images} onImagesChange={props.onImagesChange} productId={props.productId} /></Suspense>;
  }
}
