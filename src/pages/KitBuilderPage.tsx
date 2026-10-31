/**
 * Kit Builder Page — Premium 10/10 design
 * - 2-tier sticky header
 * - Continuous progress wizard
 * - Sticky sidebar with hero pricing
 * - Subtle noise BG + motion transitions
 */

import { useState, useEffect, useRef, lazy, Suspense, type MutableRefObject } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { downloadKitPDF } from '@/utils/kitPdfGenerator';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatCurrency, calculateTotalKitPrice, type ExternalProductForKit } from '@/lib/kit-builder';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useKitBuilder } from '@/hooks/useKitBuilder';
import { useCustomKitPersistence } from '@/hooks/useCustomKitPersistence';
import { useKitAutoSave } from '@/hooks/useKitAutoSave';
import { useKitUndoRedo } from '@/hooks/useKitUndoRedo';
import { supabase } from '@/integrations/supabase/client';
import { invokeExternalDb } from '@/lib/external-db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  WizardSteps, BoxSelector, ItemSelector, VolumeIndicator,
  PersonalizationConfig, KitSummary,
} from '@/components/kit-builder';
import { KitSmartSuggestions } from '@/components/kit-builder/KitSmartSuggestions';
import { FreightEstimator } from '@/components/kit-builder/FreightEstimator';
import { KitTemplates, type KitTemplate } from '@/components/kit-builder/KitTemplates';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { transformToKitItem } from '@/hooks/useKitBuilderTransformers';
import { PageSEO } from "@/components/seo/PageSEO";
// import { MainLayout } from "@/components/layout/MainLayout";
import { logger } from '@/lib/logger';
import { useKitBuilderQuote } from './kit-builder/useKitBuilderQuote';
import { useKitWizardShortcuts } from '@/hooks/useKitWizardShortcuts';
import { useTemplateSnapshot } from '@/hooks/useTemplateSnapshot';
import { useCustomKitsRealtime } from '@/hooks/useCustomKitsRealtime';
import { KitMobileSummaryBar } from '@/components/kit-builder/KitMobileSummaryBar';
import { KitHealthCard } from '@/components/kit-builder/KitHealthCard';
import { KitOccasionSelector, OCCASIONS, type Occasion } from '@/components/kit-builder/KitOccasionSelector';
import { KitVariantsManager } from '@/components/kit-builder/KitVariantsManager';
import { KitCollaborationPanel } from '@/components/kit-builder/KitCollaborationPanel';
import { KitStockForecastCard } from '@/components/kit-builder/KitStockForecastCard';
import { KitOnboardingTour } from '@/components/kit-builder/KitOnboardingTour';
import { KitBuilderHeader } from '@/components/kit-builder/KitBuilderHeader';
import { KitHeroPricingCard } from '@/components/kit-builder/KitHeroPricingCard';
import { KitShortcutsDialog } from '@/components/kit-builder/KitShortcutsDialog';
import { SimilarKitsWidget } from '@/components/kit-builder/SimilarKitsWidget';
import { IdentitySuggestionButton } from '@/components/kit-builder/IdentitySuggestionButton';
import { useDuplicateKitDetector } from '@/hooks/useDuplicateKitDetector';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const KitIsometricPreview = lazy(() => import('@/components/kit-builder/KitIsometricPreview').then(m => ({ default: m.KitIsometricPreview })));
const KitPersonalizationPreview = lazy(() => import('@/components/kit-builder/KitPersonalizationPreview').then(m => ({ default: m.KitPersonalizationPreview })));

type KitBuilderState = ReturnType<typeof useKitBuilder>;
type LoadKitPayload = Parameters<KitBuilderState['loadKit']>[0];
type KitState = KitBuilderState['kitState'];

function resolveKitId(currentKitId: string | undefined, autoSavedKitId: string | null | undefined): string | undefined {
  return currentKitId || autoSavedKitId || undefined;
}

function kitWeightMetrics(kitState: KitState) {
  const itemsWeight = kitState.items.reduce((sum, item) => sum + ((item.weight || 0) * item.quantity), 0);
  const maximum = kitState.box?.maxWeight;
  return {
    itemsWeight,
    weightExceeded: maximum ? itemsWeight > maximum : false,
    weightPercent: maximum ? (itemsWeight / maximum) * 100 : 0,
  };
}

function kitHasContent(kitState: KitState): boolean {
  return Boolean(kitState.box) || kitState.items.length > 0;
}

function recordString(row: Record<string, unknown>, key: string, fallback = ''): string {
  const value = row[key];
  return typeof value === 'string' ? value : fallback;
}

function recordNumber(row: Record<string, unknown>, key: string, fallback: number): number {
  const value = row[key];
  return typeof value === 'number' ? value : fallback;
}

function customKitPayload(row: Record<string, unknown>): LoadKitPayload {
  return {
    name: recordString(row, 'name'),
    kitType: (recordString(row, 'kit_type', 'montado') as LoadKitPayload['kitType']),
    box: row.box_data as LoadKitPayload['box'],
    items: (Array.isArray(row.items_data) ? row.items_data : []) as LoadKitPayload['items'],
    personalization: (row.personalization_data || { box: { enabled: false }, items: {} }) as LoadKitPayload['personalization'],
    kitQuantity: recordNumber(row, 'kit_quantity', 1),
    identity: { color: recordString(row, 'color', '#3B82F6'), icon: recordString(row, 'icon', 'Package'),
      tag: recordString(row, 'tag'), description: recordString(row, 'description'), isFavorite: row.is_favorite === true },
  };
}

function templatePayload(row: Record<string, unknown>): LoadKitPayload {
  const payload = customKitPayload(row);
  return { ...payload, kitType: 'montado', kitQuantity: 1,
    identity: { color: recordString(row, 'color', '#3B82F6'), icon: recordString(row, 'icon', 'Package'),
      tag: recordString(row, 'tag'), description: recordString(row, 'description'), isFavorite: false } };
}

interface LoadCustomKitOptions {
  id: string;
  loadKit: KitBuilderState['loadKit'];
  bumpLastUsed: (id: string) => void;
  hasBumpedRef: MutableRefObject<boolean>;
}

async function loadCustomKit(options: LoadCustomKitOptions): Promise<void> {
  try {
    const { data, error } = await supabase.from('custom_kits').select('*').eq('id', options.id).maybeSingle();
    if (error || !data) { toast.error('Kit não encontrado'); return; }
    options.loadKit(customKitPayload(data as Record<string, unknown>));
    toast.success('Kit carregado para edição');
    if (options.hasBumpedRef.current) return;
    options.hasBumpedRef.current = true;
    options.bumpLastUsed(options.id);
  } catch { toast.error('Erro ao carregar kit'); }
}

async function loadKitTemplate(id: string, loadKit: KitBuilderState['loadKit']): Promise<void> {
  try {
    const { data, error } = await supabase.from('kit_templates').select('*').eq('id', id).maybeSingle();
    if (error || !data) { toast.error('Template não encontrado'); return; }
    loadKit(templatePayload(data as Record<string, unknown>));
    toast.success('Template carregado para edição', { description: 'Ao salvar, atualizará o template do sistema.' });
  } catch { toast.error('Erro ao carregar template'); }
}

export default function KitBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kitIdParam = searchParams.get('kit');
  const productIdParam = searchParams.get('product');
  const templateIdParam = searchParams.get('template');
  const [currentKitId, setCurrentKitId] = useState<string | undefined>(kitIdParam || undefined);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const hasLoadedRef = useRef(false);
  const hasLoadedProductRef = useRef(false);
  const hasLoadedTemplateRef = useRef(false);
  const hasBumpedRef = useRef(false);

  const {
    kitState, setKitType, wizardState, kitQuantity, availableBoxes, availableItems,
    isLoadingBoxes, isLoadingItems, boxesError, itemsError, refetchBoxes, refetchItems,
    boxFilters, setBoxFilters, itemFilters, setItemFilters,
    setKitName, selectBox, clearBox, addItem, removeItem, updateItemQuantity,
    updateItemVariant, reorderItems, setItemPersonalization, setBoxPersonalization,
    setKitQuantity, setIdentity, goToStep, nextStep, prevStep, resetKit, loadKit,
  } = useKitBuilder();

  const { saveKit, isSaving, bumpLastUsed } = useCustomKitPersistence();
  const { saveAsTemplate } = useTemplateSnapshot();
  const { handleAddToQuote, isCreatingQuote } = useKitBuilderQuote();
  useCustomKitsRealtime();

  const { lastSavedAt, isSaving: isAutoSaving, autoSavedKitId, lastSaveError, retry: retryAutoSave } = useKitAutoSave(
    kitState, kitQuantity, currentKitId, (id) => setCurrentKitId(id),
  );

  const { pushSnapshot, undo, redo, canUndo, canRedo } = useKitUndoRedo();

  useEffect(() => {
    pushSnapshot({
      boxId: kitState.box?.id || null,
      items: kitState.items.map(i => ({ id: i.id, quantity: i.quantity, sku: i.sku })),
      personalizationKeys: Object.keys(kitState.personalization.items),
      name: kitState.name, kitQuantity,
    });
  }, [kitState.box?.id, kitState.items.length, kitState.name, kitQuantity]);

  // Item 8 — dynamic document title
  useEffect(() => {
    const baseTitle = 'Kit Maker · Brindes Sicoob';
    document.title = kitState.name?.trim()
      ? `${kitState.name} · Kit Maker`
      : baseTitle;
    return () => { document.title = baseTitle; };
  }, [kitState.name]);

  // Item 7 — celebrate first-time validation (false → true)
  const wasValidRef = useRef(false);
  useEffect(() => {
    if (kitState.isValid && !wasValidRef.current && kitState.items.length > 0) {
      wasValidRef.current = true;
      // Subtle confetti burst from bottom-center
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.85, x: 0.5 },
          colors: ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))'].map(() => '#f97316'),
          scalar: 0.9,
          ticks: 120,
        });
      } catch { /* noop */ }
      toast.success('Seu kit está pronto! 🎉', {
        description: 'Próximo passo: revisar resumo e enviar para orçamento.',
        duration: 4000,
      });
    } else if (!kitState.isValid) {
      wasValidRef.current = false;
    }
  }, [kitState.isValid, kitState.items.length]);

  useEffect(() => {
    if (!kitIdParam || hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    void loadCustomKit({ id: kitIdParam, loadKit, bumpLastUsed, hasBumpedRef });
  }, [kitIdParam, loadKit, bumpLastUsed]);

  // Template mode: load a kit_templates row for admin editing
  useEffect(() => {
    if (!templateIdParam || hasLoadedTemplateRef.current || kitIdParam) return;
    hasLoadedTemplateRef.current = true;
    void loadKitTemplate(templateIdParam, loadKit);
  }, [templateIdParam, kitIdParam, loadKit]);

  useEffect(() => {
    if (!productIdParam || hasLoadedProductRef.current || kitIdParam) return;
    hasLoadedProductRef.current = true;
    (async () => {
      try {
        const result = await invokeExternalDb<ExternalProductForKit>({ table: 'products', operation: 'select', filters: { id: productIdParam }, select: 'id, name, sku, sale_price, primary_image_url, weight_g, width_mm, height_mm, length_mm, width_cm, height_cm, length_cm, materials, is_kit, category_id', limit: 1 });
        const product = result.records?.[0];
        if (product) {
          addItem(transformToKitItem(product));
          setKitName(product.name || '');
          toast.success(`"${product.name}" adicionado ao kit!`, { description: 'Selecione uma caixa e continue montando.' });
        } else toast.error('Produto não encontrado no catálogo');
      } catch (err) { logger.warn('[kit-builder] Failed to load product:', err); toast.error('Erro ao carregar produto'); }
    })();
  }, [productIdParam, kitIdParam, addItem, setKitName]);

  const { findDuplicate } = useDuplicateKitDetector();

  const confirmNewKitSave = async (editingId: string | undefined): Promise<boolean> => {
    if (editingId || kitState.items.length < 2) return true;
    const skus = kitState.items.map((item) => item.sku ? String(item.sku).toLowerCase() : '').filter(Boolean);
    const duplicate = await findDuplicate(skus);
    if (!duplicate) return true;
    return new Promise<boolean>((resolve) => {
      toast.warning(`Você já tem um kit parecido (${Math.round(duplicate.ratio * 100)}% similar): "${duplicate.name}"`, {
        duration: 8000,
        action: { label: 'Abrir existente', onClick: () => { resolve(false); navigate(`/montar-kit?kit=${duplicate.id}`); } },
        cancel: { label: 'Salvar mesmo assim', onClick: () => resolve(true) },
        onAutoClose: () => resolve(true),
        onDismiss: () => resolve(true),
      });
    });
  };

  const handleSaveKit = async () => {
    try {
      if (templateIdParam) {
        await saveAsTemplate({ kitState, templateId: templateIdParam });
        return;
      }
      const editingId = currentKitId || autoSavedKitId || undefined;
      if (!await confirmNewKitSave(editingId)) return;
      const result = await saveKit(kitState, kitQuantity, editingId);
      if (result && 'id' in result) setCurrentKitId((result as { id: string }).id);
    } catch { /* handled by hook */ }
  };

  const handleExportPDF = () => {
    try { downloadKitPDF({ kitState, kitQuantity, kitName: kitState.name }); toast.success('PDF do kit exportado com sucesso!'); }
    catch (error) { console.error('Erro ao exportar PDF:', error); toast.error('Erro ao gerar PDF do kit'); }
  };

  const handleResetKit = () => { resetKit(); setCurrentKitId(undefined); };

  // Item 3 — contextual toasts with Desfazer (uses undo from useKitUndoRedo)
  const handleSelectBox = (box: typeof availableBoxes[number]) => {
    selectBox(box);
    toast.success(`Caixa "${box.name}" selecionada`, {
      action: { label: 'Desfazer', onClick: () => undo() },
      duration: 4000,
    });
  };
  const handleAddItem = (item: Parameters<typeof addItem>[0]) => {
    const result = addItem(item);
    if (result.fits) {
      toast.success(`"${item.name}" adicionado`, {
        action: { label: 'Desfazer', onClick: () => undo() },
        duration: 3500,
      });
    }
    return result;
  };
  const handleRemoveItem = (itemId: string) => {
    const removed = kitState.items.find(i => i.id === itemId);
    removeItem(itemId);
    if (removed) {
      toast.success(`"${removed.name}" removido`, {
        action: { label: 'Desfazer', onClick: () => undo() },
        duration: 3500,
      });
    }
  };

  useKitWizardShortcuts({
    canProceed: wizardState.canProceed,
    currentStep: wizardState.currentStep,
    completedSteps: wizardState.completedSteps,
    onPrev: prevStep,
    onNext: nextStep,
    onJump: goToStep,
  });

  const { itemsWeight, weightExceeded, weightPercent } = kitWeightMetrics(kitState);
  const hasContent = kitHasContent(kitState);
  const isExistingKit = Boolean(resolveKitId(currentKitId, autoSavedKitId));
  const pricing = calculateTotalKitPrice(kitState.box, kitState.items, kitState.personalization, kitQuantity);

  const resolvedKitId = resolveKitId(currentKitId, autoSavedKitId);

  function applyAISuggestion(suggestion: { kit_type: 'montado' | 'original' | 'simples'; box_keywords: string[] }) {
    setKitType(suggestion.kit_type);
    setBoxFilters({ ...boxFilters, search: suggestion.box_keywords[0] ?? '' });
    goToStep('box');
  }

  function BuilderHeader() {
    return <><KitBuilderHeader kitName={kitState.name} onKitNameChange={setKitName} isValid={kitState.isValid}
      isSaving={isSaving} isAutoSaving={isAutoSaving} lastSavedAt={lastSavedAt} autoSaveError={lastSaveError}
      onRetryAutoSave={retryAutoSave} hasContent={hasContent} isExistingKit={isExistingKit} canUndo={canUndo}
      canRedo={canRedo} identity={kitState.identity} onIdentityChange={setIdentity} onSave={handleSaveKit}
      onUndo={() => undo()} onRedo={() => redo()} onReset={handleResetKit} kitState={kitState}
      templateId={templateIdParam || undefined} currentKitId={resolvedKitId} onAIApply={applyAISuggestion} />
      <div className="border-b bg-card/40 backdrop-blur-sm"><div className="container py-4">
        <WizardSteps currentStep={wizardState.currentStep} completedSteps={wizardState.completedSteps}
          onStepClick={goToStep} kitState={kitState} />
      </div></div></>;
  }

  function selectTemplate(template: KitTemplate): void {
    setKitType(template.kitType);
    setKitName(template.name);
    toast.success(`Template "${template.name}" aplicado!`, { description: `Tipo: ${template.kitType}. Agora selecione a caixa.` });
  }

  function updateOccasion(nextOccasion: Occasion | null): void {
    setOccasion(nextOccasion);
    if (!nextOccasion) { setBoxFilters({ ...boxFilters, search: '' }); return; }
    const metadata = OCCASIONS.find((item) => item.id === nextOccasion);
    if (!metadata) return;
    setKitType(metadata.suggestedKitType);
    setBoxFilters({ ...boxFilters, search: metadata.boxKeywords[0] ?? '' });
    toast.success(`Modo "${metadata.label}" ativado`, { description: 'Filtros e sugestões ajustados para esta ocasião.' });
  }

  function KitTypeSelector() {
    const options = [
      { value: 'montado', label: 'Montado', desc: 'Kit montado dentro da caixa, itens arrumados e prontos para presentear.' },
      { value: 'original', label: 'Original', desc: 'Kit com embalagem original do fornecedor, sem remontagem.' },
      { value: 'simples', label: 'Simples', desc: 'Produtos organizados em uma embalagem simples.' },
    ];
    return <div className="space-y-2"><Label className="text-sm font-medium">Tipo de Kit</Label>
      <RadioGroup value={kitState.kitType} onValueChange={(value) => setKitType(value as 'montado' | 'original' | 'simples')} className="flex gap-4">
        {options.map((option) => <TooltipProvider key={option.value}><Tooltip><TooltipTrigger asChild>
          <div className="flex items-center space-x-2"><RadioGroupItem value={option.value} id={`kit-${option.value}`} />
            <Label htmlFor={`kit-${option.value}`} className="cursor-pointer text-sm">{option.label}</Label></div>
        </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">{option.desc}</p></TooltipContent></Tooltip></TooltipProvider>)}
      </RadioGroup>
    </div>;
  }

  function StepHeading({ number, title, description }: { number: string; title: string; description: string }) {
    return <div><h2 className="text-3xl font-display font-bold tracking-tight">
      <span className="text-primary/40 tabular-nums mr-2">{number}</span>{title}</h2>
      <p className="text-muted-foreground mt-1">{description}</p></div>;
  }

  function BoxStep() {
    return <div className="w-full max-w-[1920px] mx-auto px-1 sm:px-2 py-2 space-y-4 pb-24 md:pb-6">
      <StepHeading number="01" title="Selecione a Embalagem" description="Toda boa entrega começa pela embalagem certa" />
      <KitOccasionSelector value={occasion} onChange={updateOccasion} /><KitTypeSelector />
      <BoxSelector boxes={availableBoxes} selectedBox={kitState.box} isLoading={isLoadingBoxes} error={boxesError}
        onRetry={() => { void refetchBoxes(); }} filters={boxFilters} onFiltersChange={setBoxFilters}
        onSelect={handleSelectBox} onClear={clearBox} />
    </div>;
  }

  function addSuggestedItem(item: { id: string }): void {
    const kitItem = availableItems.find((available) => available.id === item.id);
    if (kitItem) handleAddItem(kitItem);
  }

  function ItemsStep() {
    return <div className="w-full max-w-[1920px] mx-auto px-1 sm:px-2 py-2 space-y-4 pb-24 md:pb-6">
      <StepHeading number="02" title="Adicione os Itens" description="O coração do kit — escolha produtos memoráveis" />
      <ItemSelector items={availableItems} selectedItems={kitState.items} isLoading={isLoadingItems} error={itemsError}
        onRetry={() => { void refetchItems(); }} filters={itemFilters} onFiltersChange={setItemFilters}
        onAddItem={handleAddItem} onRemoveItem={handleRemoveItem} onUpdateQuantity={updateItemQuantity}
        onUpdateVariant={(itemId, data) => updateItemVariant(itemId, data)} onReorder={reorderItems}
        boxSelected={kitState.box !== null} />
      {kitState.items.length > 0 && <KitSmartSuggestions selectedItems={kitState.items} onAddItem={addSuggestedItem} />}
    </div>;
  }

  function PersonalizationStep() {
    return <div className="space-y-4"><StepHeading number="03" title="Personalização" description="Sua marca presente em cada detalhe" />
      <PersonalizationConfig box={kitState.box} items={kitState.items} kitQuantity={kitQuantity}
        boxPersonalization={kitState.personalization.box} itemPersonalizations={kitState.personalization.items}
        onBoxPersonalizationChange={setBoxPersonalization} onItemPersonalizationChange={setItemPersonalization} />
    </div>;
  }

  function SummaryStep() {
    return <div className="space-y-4"><StepHeading number="04" title="Resumo" description="Pronto para encantar seu cliente" />
      <KitSummary kitState={kitState} kitQuantity={kitQuantity} kitName={kitState.name} onKitNameChange={setKitName}
        onKitQuantityChange={setKitQuantity} onAddToQuote={() => handleAddToQuote(kitState, kitQuantity)}
        onExportPDF={handleExportPDF} isAddingToQuote={isCreatingQuote} currentKitId={resolvedKitId} />
    </div>;
  }

  function CurrentStep() {
    switch (wizardState.currentStep) {
      case 'box': return <><>{!kitState.box && kitState.items.length === 0 && <KitTemplates visible onSelectTemplate={selectTemplate} />}</><BoxStep /></>;
      case 'items': return <ItemsStep />;
      case 'personalization': return <PersonalizationStep />;
      case 'summary': return <SummaryStep />;
    }
  }

  function StepNavigation() {
    return <div className="flex justify-between mt-6"><Button variant="outline" onClick={prevStep}
      disabled={wizardState.currentStep === 'box'}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
      {wizardState.currentStep !== 'summary' && <Button onClick={nextStep} disabled={!wizardState.canProceed}
        size="lg" className="shadow-lg shadow-primary/20">Próximo<ArrowRight className="h-4 w-4 ml-2" /></Button>}
    </div>;
  }

  function BuilderSteps() {
    return <div className="lg:col-span-2"><Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
      <CardContent className="p-6"><div key={wizardState.currentStep} className="animate-fade-in"><CurrentStep /></div></CardContent>
    </Card><StepNavigation /></div>;
  }

  function hasPersonalization(): boolean {
    if (kitState.personalization.box?.enabled) return true;
    return Object.values(kitState.personalization.items).some((item) => item?.enabled);
  }

  function VisualPreviews() {
    return <>{kitState.box && <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
      <KitIsometricPreview kitState={kitState} /></Suspense>}
      {hasPersonalization() && <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
        <KitPersonalizationPreview kitState={kitState} /></Suspense>}
      {kitState.totalPrice > 0 && <KitHealthCard kitState={kitState} kitQuantity={kitQuantity} />}</>;
  }

  function IdentityAndSimilar() {
    return <><IdentitySuggestionButton kitName={kitState.name} items={kitState.items.map((item) => ({ name: item.name, sku: item.sku }))}
      description={kitState.identity?.description ?? null} current={kitState.identity}
      onApply={(partial) => setIdentity({ color: '#3B82F6', icon: 'Package', ...(kitState.identity ?? {}), ...partial })} />
      <SimilarKitsWidget currentSkus={kitState.items.map((item) => String(item.sku ?? '').toLowerCase()).filter(Boolean)}
        excludeId={templateIdParam ?? undefined} /></>;
  }

  function formattedWeight(): string {
    if (kitState.totalWeight >= 1000) return `${(kitState.totalWeight / 1000).toFixed(2)} kg`;
    return `${kitState.totalWeight} g`;
  }

  function PriceBreakdown() {
    return <AccordionItem value="breakdown" className="border-b-0"><AccordionTrigger className="px-4 py-3 hover:no-underline">
      <span className="font-display font-semibold text-sm">Composição de preço</span></AccordionTrigger>
      <AccordionContent className="px-4 pb-4"><div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Caixa</span><span className="tabular-nums">{formatCurrency(kitState.boxPrice)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Itens</span><span className="tabular-nums">{formatCurrency(kitState.itemsPrice)}</span></div>
        {kitState.personalizationPrice > 0 && <div className="flex justify-between text-primary"><span>Personalização</span><span className="tabular-nums">{formatCurrency(kitState.personalizationPrice)}</span></div>}
        <div className="border-t border-border/40 pt-2 flex justify-between font-semibold"><span>Total/kit</span><span className="text-primary tabular-nums">{formatCurrency(kitState.totalPrice)}</span></div>
        {kitState.totalWeight > 0 && <div className="flex justify-between text-xs text-muted-foreground pt-1"><span>Peso estimado</span><span className="tabular-nums">{formattedWeight()}</span></div>}
      </div></AccordionContent>
    </AccordionItem>;
  }

  function WeightIndicator() {
    if (!kitState.box?.maxWeight) return null;
    return <div className={cn('rounded-lg p-3 space-y-2', weightExceeded ? 'bg-destructive/5 border border-destructive/30' : 'bg-muted/30')}>
      <div className="flex items-center justify-between text-xs"><span className="font-medium">Peso</span>
        <span className={cn('tabular-nums', weightExceeded ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
          {(itemsWeight / 1000).toFixed(1)}kg / {(kitState.box.maxWeight / 1000).toFixed(1)}kg</span></div>
      <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden"><div
        className={cn('h-full rounded-full transition-all duration-500', weightExceeded ? 'bg-destructive' : weightPercent > 80 ? 'bg-warning' : 'bg-success')}
        style={{ width: `${Math.min(weightPercent, 100)}%` }} /></div>
      {weightExceeded && <p className="text-[11px] text-destructive font-medium">⚠ Excede em {((itemsWeight - kitState.box.maxWeight) / 1000).toFixed(1)}kg</p>}
    </div>;
  }

  function CapacityDetails() {
    if (!kitState.box) return null;
    return <AccordionItem value="capacity" className="border-b-0 border-t border-border/30">
      <AccordionTrigger className="px-4 py-3 hover:no-underline"><span className="font-display font-semibold text-sm">Capacidade</span></AccordionTrigger>
      <AccordionContent className="px-4 pb-4 space-y-3"><VolumeIndicator usedVolume={kitState.totalItemsVolume}
        totalVolume={kitState.box.internalVolume} usagePercent={kitState.volumeUsagePercent} /><WeightIndicator /></AccordionContent>
    </AccordionItem>;
  }

  function FreightDetails() {
    if (kitState.totalWeight <= 0) return null;
    return <AccordionItem value="freight" className="border-b-0 border-t border-border/30">
      <AccordionTrigger className="px-4 py-3 hover:no-underline"><span className="font-display font-semibold text-sm">Estimativa de frete</span></AccordionTrigger>
      <AccordionContent className="px-4 pb-4"><FreightEstimator totalWeightGrams={kitState.totalWeight} kitQuantity={kitQuantity} /></AccordionContent>
    </AccordionItem>;
  }

  function DetailsCard() {
    if (!hasContent) return null;
    return <Card className="rounded-xl border-border/40"><Accordion type="multiple" defaultValue={['breakdown']} className="w-full">
      <PriceBreakdown /><CapacityDetails /><FreightDetails />
    </Accordion></Card>;
  }

  function SidebarContent() {
    return <><KitHeroPricingCard unitPrice={pricing.unitPrice} total={pricing.total} kitQuantity={kitQuantity}
      isValid={kitState.isValid} hasContent={hasContent} /><VisualPreviews /><IdentityAndSimilar /><DetailsCard />
      {kitState.items.length > 0 && <KitStockForecastCard items={kitState.items} kitQuantity={kitQuantity} />}
      <KitVariantsManager kitMasterId={resolvedKitId} currentState={kitState} currentQuantity={kitQuantity} />
      <KitCollaborationPanel kitId={resolvedKitId} /></>;
  }

  function BuilderSidebar() {
    const content = <SidebarContent />;
    return <><aside className="hidden lg:block"><div className="sticky top-[180px] space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 -mr-2 scrollbar-thin">
      {content}</div></aside><KitMobileSummaryBar kitState={kitState} kitQuantity={kitQuantity}>{content}</KitMobileSummaryBar></>;
  }

  function KitBuilderBody() {
    return <><KitOnboardingTour /><KitShortcutsDialog /><div className="min-h-screen relative" style={{ background: `
      radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.08), transparent),
      radial-gradient(ellipse 60% 40% at 100% 100%, hsl(var(--primary) / 0.04), transparent),
      hsl(var(--background))` }}>
      <PageSEO title="Kit Maker" description="Monte kits personalizados de brindes promocionais." path="/montar-kit" noIndex />
      <BuilderHeader /><div className="container py-6"><div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BuilderSteps /><BuilderSidebar /></div></div><div className="h-20 lg:hidden" aria-hidden />
    </div></>;
  }

  return <KitBuilderBody />;
}
