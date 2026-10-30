/**
 * ProductFormFullscreen — Stepper horizontal com preview lateral
 * Refatorado: conteúdo das etapas em ProductFormStepContent.tsx
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormData, defaultFormValues } from './ProductFormSchema';
import { ProductPreviewPanel } from './ProductPreviewPanel';
import { HorizontalStepper, type StepDef } from './HorizontalStepper';
import { ProductFormStepContent } from './ProductFormStepContent';
import { useProductFormDraft } from './hooks/useProductFormDraft';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Package, Tag, ImageIcon, Layers, Megaphone, Paintbrush, AlertCircle, FileText, Save, X, PanelRightClose, PanelRightOpen, ChevronLeft, ChevronRight, Info, Boxes } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { useSkuValidation } from './hooks/useSkuValidation';
import { useProductSeoAI } from '@/hooks/useProductSeoAI';

// ============================================
// TYPES & STEPS
// ============================================

interface ProductFormFullscreenProps {
  initialData?: Partial<ProductFormData>;
  productImages?: string[];
  productId?: string;
  onSubmit: (data: ProductFormData, images: string[]) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  isEdit: boolean;
}

interface SaveProductButtonProps {
  isSaving: boolean;
  isDuplicate: boolean;
  isEdit: boolean;
  expandedLabel?: boolean;
}

interface StepperBarProps extends SaveProductButtonProps {
  activeIndex: number;
  stepReady: boolean[];
  stepErrors: number[];
  missingFields: string[][];
  showValidation: boolean;
  errorCount: number;
  onStepClick: (index: number) => void;
}

interface NavigationProps extends SaveProductButtonProps {
  stepIndex: number;
  onStepClick: (index: number) => void;
  onCancel: () => void;
}

interface PreviewSidebarProps {
  showPreview: boolean;
  onToggle: () => void;
  name: string;
  sku: string;
  salePrice: number;
  stockQuantity: number;
  images: string[];
  brand: string;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
  isKit: boolean;
  isActive: boolean;
}

interface ProductFlags extends Record<string, boolean> {
  is_active: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_on_sale: boolean;
  is_kit: boolean;
  is_imported: boolean;
  is_textil: boolean;
  is_thermal: boolean;
  allows_personalization: boolean;
  has_gift_box: boolean;
  has_optional_packaging: boolean;
  has_commercial_packaging: boolean;
}

const STEPS: StepDef[] = [
  { id: 'essentials', label: 'Identificação', description: 'Fornecedor e dados', icon: Info, requiredFields: ['supplier_id', 'sku', 'name'], fieldLabels: { supplier_id: 'Fornecedor', sku: 'SKU Interno', name: 'Nome do Produto' } },
  { id: 'fiscal', label: 'Financeiro e Fiscal', description: 'Preços, estoque e tributos', icon: FileText, requiredFields: ['sale_price'], fieldLabels: { sale_price: 'Preço de Venda' } },
  { id: 'classification', label: 'Classificação', description: 'Gênero, cores e vínculos', icon: Layers, requiredFields: [], fieldLabels: {} },
  { id: 'commercial', label: 'Categorias e Dimensões', description: 'Categoria, dimensões e flags', icon: Tag, requiredFields: [], fieldLabels: {} },
  { id: 'engraving', label: 'Gravação', description: 'Áreas de personalização', icon: Paintbrush, requiredFields: [], fieldLabels: {} },
  { id: 'packaging', label: 'Embalagem', description: 'Dados da embalagem', icon: Package, requiredFields: [], fieldLabels: {} },
  { id: 'kits', label: 'Kits', description: 'Gestão de kits nativos', icon: Boxes, requiredFields: [], fieldLabels: {} },
  { id: 'media', label: 'Mídia', description: 'Imagens e vídeos', icon: ImageIcon, requiredFields: [], fieldLabels: {} },
  { id: 'content', label: 'SEO', description: 'Meta tags e marketing', icon: Megaphone, requiredFields: [], fieldLabels: {} },
];

function emptyString(value: string | null | undefined): string {
  return value ?? '';
}

function zeroNumber(value: number | null | undefined): number {
  return value ?? 0;
}

function falseBoolean(value: boolean | null | undefined): boolean {
  return value ?? false;
}

function buildProductFlags(values: ProductFormData): ProductFlags {
  return {
    is_active: falseBoolean(values.is_active),
    is_featured: falseBoolean(values.is_featured),
    is_bestseller: falseBoolean(values.is_bestseller),
    is_new: falseBoolean(values.is_new),
    is_on_sale: falseBoolean(values.is_on_sale),
    is_kit: falseBoolean(values.is_kit),
    is_imported: falseBoolean(values.is_imported),
    is_textil: falseBoolean(values.is_textil),
    is_thermal: falseBoolean(values.is_thermal),
    allows_personalization: falseBoolean(values.allows_personalization),
    has_gift_box: falseBoolean(values.has_gift_box),
    has_optional_packaging: falseBoolean(values.has_optional_packaging),
    has_commercial_packaging: falseBoolean(values.has_commercial_packaging),
  };
}

function buildProductExpirations(values: ProductFormData): Record<string, string | null> {
  return {
    is_featured_expires_at: values.is_featured_expires_at ?? null,
    is_bestseller_expires_at: values.is_bestseller_expires_at ?? null,
    is_new_expires_at: values.is_new_expires_at ?? null,
    is_on_sale_expires_at: values.is_on_sale_expires_at ?? null,
  };
}

function getInitialPreviewVisibility(): boolean {
  const stored = localStorage.getItem('product-form-show-preview');
  return stored === null || stored === 'true';
}

function getMissingFields(values: ProductFormData): string[][] {
  return STEPS.map(step => step.requiredFields
    .filter(field => {
      const value = values[field];
      if (typeof value === 'number') return value <= 0;
      return !value;
    })
    .map(field => step.fieldLabels[field as string] || field));
}

function hasEssentials(values: ProductFormData): boolean {
  return Boolean(values.supplier_id && values.sku && values.name);
}

function hasClassification(values: ProductFormData): boolean {
  return Boolean(values.ncm_code || values.ean);
}

function hasMedia(values: ProductFormData, imageCount: number): boolean {
  return imageCount > 0 || Boolean(values.video_url);
}

function hasSeoContent(values: ProductFormData): boolean {
  return Boolean(values.meta_title || values.meta_description || values.key_benefits);
}

function getStepReadiness(values: ProductFormData, imageCount: number, isEdit: boolean, productId?: string): boolean[] {
  return [
    hasEssentials(values),
    zeroNumber(values.sale_price) > 0,
    Boolean(values.packing_type),
    hasClassification(values),
    isEdit && Boolean(productId),
    true,
    hasMedia(values, imageCount),
    hasSeoContent(values),
  ];
}

function getStepErrors(errorFields: string[]): number[] {
  return STEPS.map(step => step.requiredFields.reduce(
    (count, field) => count + Number(errorFields.includes(field)),
    0,
  ));
}

function SaveProductButton({ isSaving, isDuplicate, isEdit, expandedLabel = false }: SaveProductButtonProps) {
  const label = expandedLabel
    ? (isEdit ? 'Salvar produto' : 'Criar produto')
    : (isEdit ? 'Salvar' : 'Criar');
  const iconClassName = expandedLabel ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <Button type="submit" size="sm" disabled={isSaving || isDuplicate} className="gap-2 font-semibold shadow-sm">
      {isSaving ? <Loader2 className={`${iconClassName} animate-spin`} /> : <Save className={iconClassName} />}
      {label}
    </Button>
  );
}

function StepperBar({
  activeIndex,
  stepReady,
  stepErrors,
  missingFields,
  showValidation,
  errorCount,
  onStepClick,
  ...saveButtonProps
}: StepperBarProps) {
  return (
    <Card className="border-border/50 bg-card/80 px-6 py-4">
      <div className="flex items-end justify-between gap-6">
        <div className="flex-1 min-w-0">
          <HorizontalStepper steps={STEPS} activeIndex={activeIndex} stepReady={stepReady} stepErrors={stepErrors} onStepClick={onStepClick} missingFields={missingFields} showValidation={showValidation} />
        </div>
        <div className="flex items-center gap-2 shrink-0 pb-1">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-destructive text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              {errorCount}
            </span>
          )}
          <SaveProductButton {...saveButtonProps} />
        </div>
      </div>
    </Card>
  );
}

function DuplicateSkuAlert({ isDuplicate, duplicateName }: { isDuplicate: boolean; duplicateName?: string | null }) {
  if (!isDuplicate) return null;
  const productReference = duplicateName ? ` no produto "${duplicateName}"` : '';

  return (
    <Card className="border-destructive/20 bg-destructive/5 p-4">
      <div className="flex items-start gap-3 text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm font-semibold">SKU duplicado</p>
          <p className="mt-1 text-sm">Este SKU já está em uso{productReference}. Ajuste antes de salvar.</p>
        </div>
      </div>
    </Card>
  );
}

function AnimatedStep({ stepId, direction, children }: { stepId: string; direction: number; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={stepId}
        custom={direction}
        className="space-y-5"
        initial={{ opacity: 0, x: direction > 0 ? 60 : -60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction > 0 ? -60 : 60 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function MissingFieldsAlert({ show, labels }: { show: boolean; labels: string[] }) {
  if (!show || labels.length === 0) return null;
  const plural = labels.length > 1 ? 's' : '';

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-warning/30 bg-warning/5 p-3">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-warning">
            {labels.length} campo{plural} obrigatório{plural} nesta etapa
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {labels.map(label => (
              <li key={label} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-warning" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

function FormNavigation({ stepIndex, onStepClick, onCancel, ...saveButtonProps }: NavigationProps) {
  const previousStep = STEPS[stepIndex - 1];
  const nextStep = STEPS[stepIndex + 1];
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div className="flex items-center justify-between pt-2 pb-20 lg:pb-4">
      <div className="flex items-center gap-3">
        {previousStep && (
          <Button type="button" variant="outline" size="sm" onClick={() => onStepClick(stepIndex - 1)} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            {previousStep.label}
          </Button>
        )}
        <span className="hidden lg:inline text-[10px] text-muted-foreground/50">Ctrl+←/→ navegar · Ctrl+S salvar</span>
      </div>
      <div className="flex items-center gap-2">
        {nextStep && (
          <Button type="button" size="sm" onClick={() => onStepClick(stepIndex + 1)} className="gap-2">
            {nextStep.label}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {isLast && <SaveProductButton {...saveButtonProps} expandedLabel />}
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

function PreviewSidebar({ showPreview, onToggle, ...previewProps }: PreviewSidebarProps) {
  return (
    <div className="hidden xl:flex flex-col shrink-0">
      <div className="sticky top-24">
        <div className="flex items-center justify-end mb-2">
          <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-7 px-2" onClick={onToggle}>
            {showPreview ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
            {showPreview ? 'Ocultar' : 'Preview'}
          </Button>
        </div>
        {showPreview && (
          <div className="w-64 animate-in slide-in-from-right-4 duration-200">
            <ProductPreviewPanel {...previewProps} />
          </div>
        )}
      </div>
    </div>
  );
}

function MobileNavigation({ stepIndex, onStepClick, onCancel, ...saveButtonProps }: NavigationProps) {
  const hasPreviousStep = stepIndex > 0;
  const hasNextStep = stepIndex < STEPS.length - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-sm border-t border-border/50 p-3 z-40">
      <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          {hasPreviousStep && (
            <Button type="button" variant="outline" size="sm" onClick={() => onStepClick(stepIndex - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="text-xs font-medium text-muted-foreground">{stepIndex + 1}/{STEPS.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasNextStep ? (
            <Button type="button" size="sm" onClick={() => onStepClick(stepIndex + 1)} className="gap-2">
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <SaveProductButton {...saveButtonProps} />
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN
// ============================================

export function ProductFormFullscreen({
  initialData,
  productImages: initialImages = [],
  productId,
  onSubmit,
  onCancel,
  isSaving,
  isEdit,
}: ProductFormFullscreenProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(isEdit);
  const [supplierMarkup, setSupplierMarkup] = useState<number | null>(null);
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(isEdit);
  const [costPriceDisplay, setCostPriceDisplay] = useState('');
  const [salePriceDisplay, setSalePriceDisplay] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(getInitialPreviewVisibility);

  const {
    register, handleSubmit, setValue, watch, trigger, getValues,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { ...defaultFormValues, ...initialData },
  });

  const formValues = watch();
  const supplierId = emptyString(formValues.supplier_id);
  const packingType = emptyString(formValues.packing_type);
  const isBoxProduct = packingType.toLowerCase().includes('caixa');
  const skuValue = emptyString(formValues.sku);
  const nameValue = emptyString(formValues.name);
  const salePriceValue = zeroNumber(formValues.sale_price);
  const costPriceValue = zeroNumber(formValues.cost_price);
  const stockQuantityValue = zeroNumber(formValues.stock_quantity);
  const brandValue = emptyString(formValues.brand);
  const supplierRefValue = emptyString(formValues.supplier_reference);
  const flags = buildProductFlags(formValues);
  const expirations = buildProductExpirations(formValues);

  const { status: skuStatus, duplicateName } = useSkuValidation(skuValue, isEdit, (initialData?.sku));
  const { clearDraft } = useProductFormDraft({ productId, setValue, formValues, images, stepIndex, setImages, setStepIndex });

  // Effects
  useEffect(() => {
    if (!skuManuallyEdited && !isEdit && supplierRefValue) {
      setValue('sku', supplierRefValue, { shouldValidate: true });
    }
  }, [supplierRefValue, skuManuallyEdited, isEdit, setValue]);

  useEffect(() => {
    if (costPriceValue && costPriceValue > 0 && !costPriceDisplay)
      setCostPriceDisplay(costPriceValue.toFixed(2));
  }, [costPriceValue, costPriceDisplay]);

  useEffect(() => {
    if (salePriceValue && salePriceValue > 0 && !salePriceDisplay)
      setSalePriceDisplay(salePriceValue.toFixed(2));
  }, [salePriceValue, salePriceDisplay]);

  useEffect(() => {
    if (!supplierMarkup || !costPriceValue || costPriceValue <= 0) return;
    const calc = Math.round(costPriceValue * (1 + supplierMarkup / 100) * 100) / 100;
    setValue('suggested_price', calc);
    if (!priceManuallyEdited) {
      setValue('sale_price', calc);
      setSalePriceDisplay(calc.toFixed(2));
    }
  }, [costPriceValue, supplierMarkup, priceManuallyEdited, setValue]);

  const numericProps = (name: keyof ProductFormData) => ({
    ...register(name, { valueAsNumber: true }),
    type: 'number' as const,
    step: name.includes('price') ? '0.01' : '1',
  });

  const formProps = { register, setValue, watch, errors, numericProps };
  const { generate: generateSeoAI, isGenerating: isSeoGenerating } = useProductSeoAI(getValues, setValue);

  const [showValidation, setShowValidation] = useState(false);

  const missingFields = useMemo(() => getMissingFields(formValues), [formValues]);

  const stepReady = useMemo(
    () => getStepReadiness(formValues, images.length, isEdit, productId),
    [formValues, images.length, isEdit, productId],
  );

  const stepErrors = useMemo(() => getStepErrors(Object.keys(errors)), [errors]);

  const [direction, setDirection] = useState(0);

  const goStep = useCallback((i: number) => {
    setDirection(i > stepIndex ? 1 : -1);
    setStepIndex(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stepIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') { e.preventDefault(); document.querySelector<HTMLFormElement>('form')?.requestSubmit(); }
        else if (e.key === 'ArrowRight' && stepIndex < STEPS.length - 1) { e.preventDefault(); goStep(stepIndex + 1); }
        else if (e.key === 'ArrowLeft' && stepIndex > 0) { e.preventDefault(); goStep(stepIndex - 1); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stepIndex, goStep]);

  const handleSubmitWithValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await trigger();
    const totalMissing = missingFields.reduce((sum, arr) => sum + arr.length, 0);

    if (!isValid || totalMissing > 0) {
      setShowValidation(true);
      const firstBadStep = missingFields.findIndex(arr => arr.length > 0);
      if (firstBadStep >= 0 && firstBadStep !== stepIndex) goStep(firstBadStep);
      return;
    }

    clearDraft();
    handleSubmit(async (data) => {
      if (skuStatus === 'duplicate') return;
      await onSubmit(data, images);
    })(e);
  };

  const currentStep = STEPS[stepIndex] ?? STEPS[0];
  if (!currentStep) return null;
  const currentMissingFields = missingFields[stepIndex] ?? [];
  const isDuplicateSku = skuStatus === 'duplicate';

  const togglePreview = () => {
    setShowPreview(currentValue => {
      const nextValue = !currentValue;
      localStorage.setItem('product-form-show-preview', String(nextValue));
      return nextValue;
    });
  };

  return (
    <form onSubmit={handleSubmitWithValidation} className="flex flex-col gap-4">
      <StepperBar
        activeIndex={stepIndex}
        stepReady={stepReady}
        stepErrors={stepErrors}
        missingFields={missingFields}
        showValidation={showValidation}
        errorCount={Object.keys(errors).length}
        onStepClick={goStep}
        isSaving={isSaving}
        isDuplicate={isDuplicateSku}
        isEdit={isEdit}
      />

      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-5">
          <DuplicateSkuAlert isDuplicate={isDuplicateSku} duplicateName={duplicateName} />

          <AnimatedStep stepId={currentStep.id} direction={direction}>
            <ProductFormStepContent
              stepId={currentStep.id}
              formProps={formProps}
              formValues={formValues}
              productId={productId}
              isEdit={isEdit}
              images={images}
              onImagesChange={setImages}
              supplierId={supplierId}
              onSupplierChange={(id, name, markupPercent) => {
                setValue('supplier_id', id);
                if (name) setValue('brand', name);
                setSupplierMarkup(markupPercent ?? null);
                setPriceManuallyEdited(false);
              }}
              skuStatus={skuStatus}
              duplicateName={duplicateName}
              skuManuallyEdited={skuManuallyEdited}
              onSkuManualEdit={() => setSkuManuallyEdited(true)}
              isBoxProduct={isBoxProduct}
              supplierMarkup={supplierMarkup}
              costPriceDisplay={costPriceDisplay}
              salePriceDisplay={salePriceDisplay}
              onCostPriceDisplayChange={setCostPriceDisplay}
              onSalePriceDisplayChange={setSalePriceDisplay}
              onSalePriceManualEdit={() => setPriceManuallyEdited(true)}
              flags={flags}
              expirations={expirations}
              generateSeoAI={generateSeoAI}
              isSeoGenerating={isSeoGenerating}
            />
          </AnimatedStep>

          <MissingFieldsAlert show={showValidation} labels={currentMissingFields} />

          <FormNavigation
            stepIndex={stepIndex}
            onStepClick={goStep}
            onCancel={onCancel}
            isSaving={isSaving}
            isDuplicate={isDuplicateSku}
            isEdit={isEdit}
          />
        </div>

        <PreviewSidebar
          showPreview={showPreview}
          onToggle={togglePreview}
          name={nameValue}
          sku={skuValue}
          salePrice={salePriceValue}
          stockQuantity={stockQuantityValue}
          images={images}
          brand={brandValue}
          isFeatured={flags.is_featured}
          isNew={flags.is_new}
          isOnSale={flags.is_on_sale}
          isKit={flags.is_kit}
          isActive={flags.is_active}
        />
      </div>

      <MobileNavigation
        stepIndex={stepIndex}
        onStepClick={goStep}
        onCancel={onCancel}
        isSaving={isSaving}
        isDuplicate={isDuplicateSku}
        isEdit={isEdit}
      />
    </form>
  );
}
