/**
 * Kit Builder Page — Premium 10/10 design
 * - 2-tier sticky header
 * - Continuous progress wizard
 * - Sticky sidebar with hero pricing
 * - Subtle noise BG + motion transitions
 */

import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { downloadKitPDF } from '@/utils/kitPdfGenerator';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatCurrency, calculateTotalKitPrice } from '@/lib/kit-builder';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useKitBuilder } from '@/hooks/useKitBuilder';
import { useCustomKitPersistence } from '@/hooks/useCustomKitPersistence';
import { useKitAutoSave } from '@/hooks/useKitAutoSave';
import { useKitUndoRedo } from '@/hooks/useKitUndoRedo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { invokeExternalDb } from '@/lib/external-db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  WizardSteps, BoxSelector, ItemSelector, VolumeIndicator,
  PersonalizationConfig, KitSummary,
} from '@/components/kit-builder';
import { KitSmartSuggestions } from '@/components/kit-builder/KitSmartSuggestions';
import { FreightEstimator } from '@/components/kit-builder/FreightEstimator';
import { KitTemplates } from '@/components/kit-builder/KitTemplates';
import type { KitTemplate } from '@/components/kit-builder/KitTemplates';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { transformToKitItem } from '@/hooks/useKitBuilderTransformers';
import { PageSEO } from "@/components/seo/PageSEO";
import { MainLayout } from "@/components/layout/MainLayout";
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

export default function KitBuilderPage() {
  const { user } = useAuth();
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
    isLoadingBoxes, isLoadingItems, boxFilters, setBoxFilters, itemFilters, setItemFilters,
    setKitName, selectBox, clearBox, addItem, removeItem, updateItemQuantity,
    updateItemVariant, reorderItems, setItemPersonalization, setBoxPersonalization,
    setKitQuantity, setIdentity, goToStep, nextStep, prevStep, resetKit, loadKit,
  } = useKitBuilder();

  const { saveKit, isSaving, bumpLastUsed } = useCustomKitPersistence();
  const { saveAsTemplate } = useTemplateSnapshot();
  const { handleAddToQuote, isCreatingQuote } = useKitBuilderQuote();
  useCustomKitsRealtime();

  const { lastSavedAt, isSaving: isAutoSaving, autoSavedKitId } = useKitAutoSave(
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
    (async () => {
      try {
        const { data, error } = await supabase.from('custom_kits').select('*').eq('id', kitIdParam).maybeSingle();
        if (error || !data) { toast.error('Kit não encontrado'); return; }
        const row = data as Record<string, unknown>;
        loadKit({
          name: (row.name as string) || '',
          kitType: ((row.kit_type as 'montado' | 'original' | 'simples') || 'montado'),
          box: row.box_data as never,
          items: (row.items_data as unknown[] as never) || [],
          personalization: (row.personalization_data as never) || { box: { enabled: false }, items: {} },
          kitQuantity: (row.kit_quantity as number) || 1,
          identity: {
            color: (row.color as string) || '#3B82F6',
            icon: (row.icon as string) || 'Package',
            tag: (row.tag as string) || '',
            description: (row.description as string) || '',
            isFavorite: (row.is_favorite as boolean) ?? false,
          },
        });
        toast.success('Kit carregado para edição');
        // Bump last_used_at so it appears at top of "Usados recentemente"
        if (!hasBumpedRef.current) {
          hasBumpedRef.current = true;
          bumpLastUsed(kitIdParam);
        }
      } catch { toast.error('Erro ao carregar kit'); }
    })();
  }, [kitIdParam, loadKit, bumpLastUsed]);

  // Template mode: load a kit_templates row for admin editing
  useEffect(() => {
    if (!templateIdParam || hasLoadedTemplateRef.current || kitIdParam) return;
    hasLoadedTemplateRef.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('kit_templates').select('*').eq('id', templateIdParam).maybeSingle();
        if (error || !data) { toast.error('Template não encontrado'); return; }
        const row = data as Record<string, unknown>;
        loadKit({
          name: (row.name as string) || '',
          kitType: 'montado',
          box: row.box_data as never,
          items: (row.items_data as unknown[] as never) || [],
          personalization: (row.personalization_data as never) || { box: { enabled: false }, items: {} },
          kitQuantity: 1,
          identity: {
            color: (row.color as string) || '#3B82F6',
            icon: (row.icon as string) || 'Package',
            tag: (row.tag as string) || '',
            description: (row.description as string) || '',
            isFavorite: false,
          },
        });
        toast.success('Template carregado para edição', { description: 'Ao salvar, atualizará o template do sistema.' });
      } catch { toast.error('Erro ao carregar template'); }
    })();
  }, [templateIdParam, kitIdParam, loadKit]);

  useEffect(() => {
    if (!productIdParam || hasLoadedProductRef.current || kitIdParam) return;
    hasLoadedProductRef.current = true;
    (async () => {
      try {
        const result = await invokeExternalDb<any>({ table: 'products', operation: 'select', filters: { id: productIdParam }, select: 'id, name, sku, sale_price, cost_price, primary_image_url, weight_g, width_mm, height_mm, length_mm, width_cm, height_cm, length_cm, materials, is_kit, category_id', limit: 1 });
        if (result.records?.length > 0) {
          const product = result.records[0];
          addItem(transformToKitItem(product as Record<string, unknown>));
          setKitName(product.name || '');
          toast.success(`"${product.name}" adicionado ao kit!`, { description: 'Selecione uma caixa e continue montando.' });
        } else toast.error('Produto não encontrado no catálogo');
      } catch (err) { logger.warn('[kit-builder] Failed to load product:', err); toast.error('Erro ao carregar produto'); }
    })();
  }, [productIdParam, kitIdParam, addItem, setKitName]);

  const { findDuplicate } = useDuplicateKitDetector();

  const handleSaveKit = async () => {
    try {
      // In template mode (admin editing kit_templates), save back to kit_templates
      if (templateIdParam) {
        await saveAsTemplate({ kitState, templateId: templateIdParam });
        return;
      }

      // Duplicate detection — only when creating a brand new kit
      const editingId = currentKitId || autoSavedKitId || undefined;
      if (!editingId && kitState.items.length >= 2) {
        const skus = kitState.items
          .map((i) => (i.sku ? String(i.sku).toLowerCase() : ''))
          .filter(Boolean);
        const dup = await findDuplicate(skus);
        if (dup) {
          const proceed = await new Promise<boolean>((resolve) => {
            toast.warning(`Você já tem um kit parecido (${Math.round(dup.ratio * 100)}% similar): "${dup.name}"`, {
              duration: 8000,
              action: {
                label: 'Abrir existente',
                onClick: () => { resolve(false); navigate(`/montar-kit?kit=${dup.id}`); },
              },
              cancel: { label: 'Salvar mesmo assim', onClick: () => resolve(true) },
              onAutoClose: () => resolve(true),
              onDismiss: () => resolve(true),
            });
          });
          if (!proceed) return;
        }
      }

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

  const itemsWeight = kitState.items.reduce((sum, item) => sum + ((item.weight || 0) * item.quantity), 0);
  const weightExceeded = kitState.box?.maxWeight ? itemsWeight > kitState.box.maxWeight : false;
  const weightPercent = kitState.box?.maxWeight ? (itemsWeight / kitState.box.maxWeight) * 100 : 0;
  const hasContent = !!kitState.box || kitState.items.length > 0;
  const isExistingKit = !!(currentKitId || autoSavedKitId);
  const pricing = calculateTotalKitPrice(kitState.box, kitState.items, kitState.personalization, kitQuantity);

  return (
    <MainLayout>
      <KitOnboardingTour />
      <KitShortcutsDialog />

      {/* Subtle noise + gradient background — distinguishes from catalog */}
      <div
        className="min-h-screen relative"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.08), transparent),
            radial-gradient(ellipse 60% 40% at 100% 100%, hsl(var(--primary) / 0.04), transparent),
            hsl(var(--background))
          `,
        }}
      >
        <PageSEO title="Kit Maker" description="Monte kits personalizados de brindes promocionais." path="/kit-builder" noIndex />

        <KitBuilderHeader
          kitName={kitState.name}
          onKitNameChange={setKitName}
          isValid={kitState.isValid}
          isSaving={isSaving}
          isAutoSaving={isAutoSaving}
          lastSavedAt={lastSavedAt}
          hasContent={hasContent}
          isExistingKit={isExistingKit}
          canUndo={canUndo}
          canRedo={canRedo}
          identity={kitState.identity}
          onIdentityChange={setIdentity}
          onSave={handleSaveKit}
          onUndo={() => undo()}
          onRedo={() => redo()}
          onReset={handleResetKit}
          kitState={kitState}
          templateId={templateIdParam || undefined}
          currentKitId={currentKitId || autoSavedKitId || undefined}
          
          onAIApply={(s) => {
            setKitType(s.kit_type);
            setBoxFilters({ ...boxFilters, search: s.box_keywords[0] ?? '' });
            goToStep('box');
          }}
        />

        {/* Wizard */}
        <div className="border-b bg-card/40 backdrop-blur-sm">
          <div className="container py-4">
            <WizardSteps
              currentStep={wizardState.currentStep}
              completedSteps={wizardState.completedSteps}
              onStepClick={goToStep}
              kitState={kitState}
            />
          </div>
        </div>

        {/* Content */}
        <div className="container py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <div key={wizardState.currentStep} className="animate-fade-in">
                    {wizardState.currentStep === 'box' && !kitState.box && kitState.items.length === 0 && (
                      <KitTemplates visible onSelectTemplate={(template: KitTemplate) => {
                        setKitType(template.kitType); setKitName(template.name);
                        toast.success(`Template "${template.name}" aplicado!`, { description: `Tipo: ${template.kitType}. Agora selecione a caixa.` });
                      }} />
                    )}

                    {wizardState.currentStep === 'box' && (
                      <div className="w-full max-w-[1920px] mx-auto px-1 sm:px-2 py-2 space-y-4 pb-24 md:pb-6">
                        <div>
                          <h2 className="text-3xl font-display font-bold tracking-tight">
                            <span className="text-primary/40 tabular-nums mr-2">01</span>
                            Selecione a Embalagem
                          </h2>
                          <p className="text-muted-foreground mt-1">Toda boa entrega começa pela embalagem certa</p>
                        </div>
                        <KitOccasionSelector
                          value={occasion}
                          onChange={(o) => {
                            setOccasion(o);
                            if (o) {
                              const meta = OCCASIONS.find((x) => x.id === o);
                              if (meta) {
                                setKitType(meta.suggestedKitType);
                                setBoxFilters({ ...boxFilters, search: meta.boxKeywords[0] ?? '' });
                                toast.success(`Modo "${meta.label}" ativado`, {
                                  description: 'Filtros e sugestões ajustados para esta ocasião.',
                                });
                              }
                            } else {
                              setBoxFilters({ ...boxFilters, search: '' });
                            }
                          }}
                        />
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Tipo de Kit</Label>
                          <RadioGroup value={kitState.kitType} onValueChange={(v) => setKitType(v as 'montado' | 'original' | 'simples')} className="flex gap-4">
                            {[{ value: 'montado', label: 'Montado', desc: 'Kit montado dentro da caixa, itens arrumados e prontos para presentear.' },
                              { value: 'original', label: 'Original', desc: 'Kit com embalagem original do fornecedor, sem remontagem.' },
                              { value: 'simples', label: 'Simples', desc: 'Agrupamento de itens sem embalagem especial — apenas os produtos.' }
                            ].map(opt => (
                              <TooltipProvider key={opt.value}><Tooltip><TooltipTrigger asChild>
                                <div className="flex items-center space-x-2"><RadioGroupItem value={opt.value} id={`kit-${opt.value}`} /><Label htmlFor={`kit-${opt.value}`} className="cursor-pointer text-sm">{opt.label}</Label></div>
                              </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">{opt.desc}</p></TooltipContent></Tooltip></TooltipProvider>
                            ))}
                          </RadioGroup>
                        </div>
                        <BoxSelector boxes={availableBoxes} selectedBox={kitState.box} isLoading={isLoadingBoxes} filters={boxFilters} onFiltersChange={setBoxFilters} onSelect={handleSelectBox} onClear={clearBox} />
                      </div>
                    )}

                    {wizardState.currentStep === 'items' && (
                      <div className="w-full max-w-[1920px] mx-auto px-1 sm:px-2 py-2 space-y-4 pb-24 md:pb-6">
                        <div>
                          <h2 className="text-3xl font-display font-bold tracking-tight">
                            <span className="text-primary/40 tabular-nums mr-2">02</span>
                            Adicione os Itens
                          </h2>
                          <p className="text-muted-foreground mt-1">O coração do kit — escolha produtos memoráveis</p>
                        </div>
                        <ItemSelector items={availableItems} selectedItems={kitState.items} isLoading={isLoadingItems}
                          filters={itemFilters} onFiltersChange={setItemFilters} onAddItem={handleAddItem} onRemoveItem={handleRemoveItem}
                          onUpdateQuantity={updateItemQuantity} onUpdateVariant={(itemId, data) => updateItemVariant(itemId, data)}
                          onReorder={reorderItems} boxSelected={kitState.box !== null} />
                        {kitState.items.length > 0 && (
                          <KitSmartSuggestions selectedItems={kitState.items}
                            onAddItem={(item) => { const kitItem = availableItems.find(i => i.id === item.id); if (kitItem) handleAddItem(kitItem); }} />
                        )}
                      </div>
                    )}

                    {wizardState.currentStep === 'personalization' && (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-3xl font-display font-bold tracking-tight">
                            <span className="text-primary/40 tabular-nums mr-2">03</span>
                            Personalização
                          </h2>
                          <p className="text-muted-foreground mt-1">Sua marca presente em cada detalhe</p>
                        </div>
                        <PersonalizationConfig box={kitState.box} items={kitState.items} kitQuantity={kitQuantity}
                          boxPersonalization={kitState.personalization.box} itemPersonalizations={kitState.personalization.items}
                          onBoxPersonalizationChange={setBoxPersonalization} onItemPersonalizationChange={setItemPersonalization} />
                      </div>
                    )}

                    {wizardState.currentStep === 'summary' && (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-3xl font-display font-bold tracking-tight">
                            <span className="text-primary/40 tabular-nums mr-2">04</span>
                            Resumo
                          </h2>
                          <p className="text-muted-foreground mt-1">Pronto para encantar seu cliente</p>
                        </div>
                        <KitSummary kitState={kitState} kitQuantity={kitQuantity} kitName={kitState.name}
                          onKitNameChange={setKitName} onKitQuantityChange={setKitQuantity}
                          onAddToQuote={() => handleAddToQuote(kitState, kitQuantity)}
                          onExportPDF={handleExportPDF} isAddingToQuote={isCreatingQuote}
                          currentKitId={currentKitId || autoSavedKitId || undefined} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={prevStep} disabled={wizardState.currentStep === 'box'}>
                  <ArrowLeft className="h-4 w-4 mr-2" />Voltar
                </Button>
                {wizardState.currentStep !== 'summary' && (
                  <Button onClick={nextStep} disabled={!wizardState.canProceed} size="lg" className="shadow-lg shadow-primary/20">
                    Próximo<ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>

            {/* Sticky premium sidebar */}
            {(() => {
              const sidebarContent = (
                <>
                  {/* Hero pricing — always visible at top */}
                  <KitHeroPricingCard
                    unitPrice={pricing.unitPrice}
                    total={pricing.total}
                    kitQuantity={kitQuantity}
                    isValid={kitState.isValid}
                    hasContent={hasContent}
                  />

                  {kitState.box && (
                    <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
                      <KitIsometricPreview kitState={kitState} />
                    </Suspense>
                  )}

                  {(kitState.personalization.box?.enabled || Object.values(kitState.personalization.items).some(p => p?.enabled)) && (
                    <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
                      <KitPersonalizationPreview kitState={kitState} />
                    </Suspense>
                  )}

                  {kitState.totalPrice > 0 && <KitHealthCard kitState={kitState} kitQuantity={kitQuantity} />}

                  <IdentitySuggestionButton
                    kitName={kitState.name}
                    items={kitState.items.map((i) => ({ name: i.name, sku: i.sku }))}
                    description={kitState.identity?.description ?? null}
                    current={kitState.identity}
                    onApply={(partial) => setIdentity({
                      color: '#3B82F6',
                      icon: 'Package',
                      ...(kitState.identity ?? {}),
                      ...partial,
                    })}
                  />

                  <SimilarKitsWidget
                    currentSkus={kitState.items.map((i) => String(i.sku ?? '').toLowerCase()).filter(Boolean)}
                    excludeId={templateIdParam ?? undefined}
                  />

                  {/* Collapsible details */}
                  {hasContent && (
                    <Card className="rounded-xl border-border/40">
                      <Accordion type="multiple" defaultValue={['breakdown']} className="w-full">
                        <AccordionItem value="breakdown" className="border-b-0">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <span className="font-display font-semibold text-sm">Composição de preço</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between"><span className="text-muted-foreground">Caixa</span><span className="tabular-nums">{formatCurrency(kitState.boxPrice)}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Itens</span><span className="tabular-nums">{formatCurrency(kitState.itemsPrice)}</span></div>
                              {kitState.personalizationPrice > 0 && <div className="flex justify-between text-primary"><span>Personalização</span><span className="tabular-nums">{formatCurrency(kitState.personalizationPrice)}</span></div>}
                              <div className="border-t border-border/40 pt-2 flex justify-between font-semibold"><span>Total/kit</span><span className="text-primary tabular-nums">{formatCurrency(kitState.totalPrice)}</span></div>
                              {kitState.totalWeight > 0 && <div className="flex justify-between text-xs text-muted-foreground pt-1"><span>Peso estimado</span><span className="tabular-nums">{kitState.totalWeight >= 1000 ? `${(kitState.totalWeight / 1000).toFixed(2)} kg` : `${kitState.totalWeight} g`}</span></div>}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {kitState.box && (
                          <AccordionItem value="capacity" className="border-b-0 border-t border-border/30">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                              <span className="font-display font-semibold text-sm">Capacidade</span>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 space-y-3">
                              <VolumeIndicator usedVolume={kitState.totalItemsVolume} totalVolume={kitState.box.internalVolume} usagePercent={kitState.volumeUsagePercent} />
                              {kitState.box.maxWeight && (
                                <div className={cn('rounded-lg p-3 space-y-2', weightExceeded ? 'bg-destructive/5 border border-destructive/30' : 'bg-muted/30')}>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium">Peso</span>
                                    <span className={cn('tabular-nums', weightExceeded ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                                      {(itemsWeight / 1000).toFixed(1)}kg / {(kitState.box.maxWeight / 1000).toFixed(1)}kg
                                    </span>
                                  </div>
                                  <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={cn('h-full rounded-full transition-all duration-500', weightExceeded ? 'bg-destructive' : weightPercent > 80 ? 'bg-warning' : 'bg-success')}
                                      style={{ width: `${Math.min(weightPercent, 100)}%` }}
                                    />
                                  </div>
                                  {weightExceeded && <p className="text-[11px] text-destructive font-medium">⚠ Excede em {((itemsWeight - kitState.box.maxWeight) / 1000).toFixed(1)}kg</p>}
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {kitState.totalWeight > 0 && (
                          <AccordionItem value="freight" className="border-b-0 border-t border-border/30">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                              <span className="font-display font-semibold text-sm">Estimativa de frete</span>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <FreightEstimator totalWeightGrams={kitState.totalWeight} kitQuantity={kitQuantity} />
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>
                    </Card>
                  )}

                  {kitState.items.length > 0 && (
                    <KitStockForecastCard items={kitState.items} kitQuantity={kitQuantity} />
                  )}

                  <KitVariantsManager
                    kitMasterId={currentKitId || autoSavedKitId || undefined}
                    currentState={kitState}
                    currentQuantity={kitQuantity}
                  />

                  <KitCollaborationPanel kitId={currentKitId || autoSavedKitId || undefined} />
                </>
              );

              return (
                <>
                  <aside className="hidden lg:block">
                    <div className="sticky top-[180px] space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 -mr-2 scrollbar-thin">
                      {sidebarContent}
                    </div>
                  </aside>
                  <KitMobileSummaryBar kitState={kitState} kitQuantity={kitQuantity}>
                    {sidebarContent}
                  </KitMobileSummaryBar>
                </>
              );
            })()}
          </div>
        </div>
        <div className="h-20 lg:hidden" aria-hidden />
      </div>
    </MainLayout>
  );
}
