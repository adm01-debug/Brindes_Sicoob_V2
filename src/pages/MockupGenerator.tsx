import type { TechniqueWithLimits } from "@/hooks/useMockupTechniques";
/**
 * MockupGenerator — Refactored v5
 * 
 * Business logic in useMockupGenerator hook.
 * Technique change logic extracted to MockupTechniqueHandlers.
 * Heavy sub-components are lazy-loaded.
 */

import { useCallback, Suspense } from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, Wand2, History } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TechniqueChangeDialog, DeleteMockupDialog } from "./mockup-generator/MockupDialogs";
import { MockupToolbar } from "./mockup-generator/MockupToolbar";
import { MockupEmptyState } from "./mockup-generator/MockupEmptyState";
import { useKeyboardShortcuts } from "@/components/mockup/KeyboardShortcuts";
import { GeneratingOverlay } from "@/components/mockup/GeneratingOverlay";
import { useMockupGenerator } from "@/hooks/useMockupGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { useTechniqueHandlers } from "./mockup-generator/MockupTechniqueHandlers";
import type { MockupApprovalData } from "@/types/mockup-approval";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import type { LayoutCaptureRequest } from "@/components/mockup/approval/OffscreenLayoutCapture";
import type { DetectedColor } from "@/hooks/useLogoColorAnalysis";

// Lazy load heavy sub-components
const LogoPositionEditor = lazyWithRetry(() => import("@/components/mockup/LogoPositionEditor").then(m => ({ default: m.LogoPositionEditor })));
const MockupWizard = lazyWithRetry(() => import("@/components/mockup/MockupWizard").then(m => ({ default: m.MockupWizard })));
const MockupResultCard = lazyWithRetry(() => import("@/components/mockup/MockupResultCard").then(m => ({ default: m.MockupResultCard })));
const MockupConfigPanel = lazyWithRetry(() => import("@/components/mockup/MockupConfigPanel").then(m => ({ default: m.MockupConfigPanel })));
const MockupHistoryPanel = lazyWithRetry(() => import("@/components/mockup/MockupHistoryPanel").then(m => ({ default: m.MockupHistoryPanel })));
const MockupLayoutButtons = lazyWithRetry(() => import("@/components/mockup/approval/MockupLayoutButtons").then(m => ({ default: m.MockupLayoutButtons })));
const OffscreenLayoutCapture = lazyWithRetry(() => import("@/components/mockup/approval/OffscreenLayoutCapture").then(m => ({ default: m.OffscreenLayoutCapture })));
const TechniqueColorConfigDialog = lazyWithRetry(() => import("@/components/mockup/TechniqueColorConfigDialog").then(m => ({ default: m.TechniqueColorConfigDialog })));
const AIMockupAssistant = lazyWithRetry(() => import("@/components/ai").then(m => ({ default: m.AIMockupAssistant })));

export default function MockupGenerator() {
  const mg = useMockupGenerator();
  const { profile } = useAuth();
  const user = mg.user;

  const technique = useTechniqueHandlers({
    hasLogo: mg.hasLogo,
    selectedTechnique: mg.selectedTechnique,
    setSelectedTechnique: mg.setSelectedTechnique,
    setGeneratedMockup: mg.setGeneratedMockup,
    setTechniqueColorConfig: mg.setTechniqueColorConfig,
  });

  useKeyboardShortcuts({
    onGenerate: mg.generateMockup,
    onReset: mg.resetForm,
    onDownload: () => mg.downloadMockup(),
    canGenerate: !!(mg.selectedProduct && mg.selectedTechnique && mg.hasLogo),
    canDownload: !!mg.generatedMockup,
    isLoading: mg.isLoading,
  });

  const layoutCaptureRequest = createLayoutCaptureRequest(mg, user?.id, profile);

  const handleLayoutCaptured = useCallback(() => {
    mg.setLastSavedRecordId(null);
    mg.setLastSavedMockupUrl(null);
    mg.fetchHistory();
  }, [mg]);

  return (
    <>
      <PageSEO title="Gerador de Mockups" description="Crie mockups profissionais de brindes personalizados com sua logo." path="/mockup-generator" />
      <Suspense fallback={null}>
        <OffscreenLayoutCapture request={layoutCaptureRequest} onCaptured={handleLayoutCaptured} />
      </Suspense>

      <GeneratingOverlay isVisible={mg.isLoading} productName={mg.selectedProduct?.name} techniqueName={mg.selectedTechnique?.name} />

      <MockupWorkspace mg={mg} technique={technique} profile={profile} />
      <MockupDialogs mg={mg} technique={technique} />
    </>
  );
}

type MockupState = ReturnType<typeof useMockupGenerator>;
type TechniqueState = ReturnType<typeof useTechniqueHandlers>;
type Profile = ReturnType<typeof useAuth>['profile'];
type SelectedProduct = NonNullable<MockupState['selectedProduct']>;
type ProductDimensions = NonNullable<SelectedProduct['dimensions']>;
type ProductSelection = NonNullable<MockupState['productSelection']>;
type NumericDimensionKey = 'height_cm' | 'width_cm' | 'diameter_cm' | 'length_cm' | 'capacity_ml' | 'weight_g';

function dimensionValue(dimensions: ProductDimensions | null | undefined, key: NumericDimensionKey): number | null {
  if (!dimensions) return null;
  const value = dimensions[key];
  return typeof value === 'number' ? value : null;
}

function selectionValue<K extends keyof ProductSelection>(selection: ProductSelection | null | undefined, key: K): ProductSelection[K] | undefined {
  if (!selection) return undefined;
  return selection[key];
}

function firstMaterial(product: SelectedProduct): string | undefined {
  return product.materials?.[0];
}

function productImage(mg: MockupState): string | undefined {
  return mg.getProductImage() || undefined;
}

function productWidth(dimensions: ProductDimensions | null | undefined): number | null {
  const width = dimensionValue(dimensions, 'width_cm');
  if (width !== null) return width;
  return dimensionValue(dimensions, 'diameter_cm');
}

function documentNumber(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `MK-${now.getFullYear()}${month}${day}-${hour}${minute}`;
}

function clientName(client: MockupState['selectedClient']): string {
  return client?.nome_fantasia || client?.razao_social || client?.name || '—';
}

function techniqueLocation(mg: MockupState): string {
  const selected = mg.selectedTechnique;
  const location = selected && 'locationName' in selected ? (selected as TechniqueWithLimits).locationName : null;
  return location || mg.activeArea?.name || 'Frente';
}

function approvalProduct(mg: MockupState): MockupApprovalData['product'] {
  const product = mg.selectedProduct;
  if (!product) throw new Error('Produto obrigatório para gerar documento de aprovação.');
  return {
    name: product.name,
    sku: product.sku,
    imageUrl: productImage(mg),
    color: selectionValue(mg.productSelection, 'colorName'),
    colorHex: selectionValue(mg.productSelection, 'colorHex'),
    material: firstMaterial(product),
    heightCm: dimensionValue(product.dimensions, 'height_cm'),
    widthCm: dimensionValue(product.dimensions, 'width_cm'),
    diameterCm: dimensionValue(product.dimensions, 'diameter_cm'),
    depthCm: dimensionValue(product.dimensions, 'length_cm'),
    capacityMl: dimensionValue(product.dimensions, 'capacity_ml'),
    weightG: dimensionValue(product.dimensions, 'weight_g'),
  };
}

function approvalPersonalization(mg: MockupState): MockupApprovalData['personalization'] {
  const selected = mg.selectedTechnique;
  if (!selected) throw new Error('Técnica obrigatória para gerar documento de aprovação.');
  return {
    techniqueName: selected.name,
    techniqueCode: selected.code || undefined,
    locationName: techniqueLocation(mg),
    widthCm: mg.activeArea?.logoWidth || 0,
    heightCm: mg.activeArea?.logoHeight || 0,
    colorsCount: mg.techniqueColorConfig?.colorCount,
  };
}

function pantoneName(color: DetectedColor): string {
  return color.selectedPantone || color.pantoneMatch?.pantoneCode || color.name;
}

function createApprovalData(mg: MockupState, profile: Profile, mockupUrl: string): MockupApprovalData {
  const now = new Date();
  return {
    documentNumber: documentNumber(now),
    date: now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    client: { name: clientName(mg.selectedClient), cnpj: mg.selectedClient?.cnpj, logoUrl: mg.selectedClient?.logo_url || undefined },
    seller: { name: profile?.full_name || '—', email: profile?.email || undefined },
    product: approvalProduct(mg),
    personalization: approvalPersonalization(mg),
    pantoneColors: mg.logoColorAnalysis.colors.map((color) => ({ name: pantoneName(color), hex: color.hex })),
    mockupImageUrl: mockupUrl,
    layoutMode: mg.lastSavedLayoutMode,
  };
}

function createLayoutCaptureRequest(mg: MockupState, userId: string | undefined, profile: Profile): LayoutCaptureRequest | null {
  if (!mg.lastSavedRecordId) return null;
  if (!userId) return null;
  if (!mg.selectedProduct) return null;
  if (!mg.selectedTechnique) return null;
  const mockupUrl = mg.lastSavedMockupUrl || mg.generatedMockup;
  if (!mockupUrl) return null;
  return { data: createApprovalData(mg, profile, mockupUrl), recordId: mg.lastSavedRecordId, userId };
}

function MockupWorkspace({ mg, technique, profile }: { mg: MockupState; technique: TechniqueState; profile: Profile }) {
  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
      <MockupProgress mg={mg} />
      <MockupNotices mg={mg} />
      <MockupTabs mg={mg} technique={technique} profile={profile} />
    </div>
  );
}

function selectWizardStep(step: number, mg: MockupState): void {
  mg.setActiveTab('generator');
  const sectionMap: Record<number, string> = { 1: 'Empresa', 2: 'Produto', 3: 'Técnica', 4: 'Logo', 5: 'Posição', 6: 'Gerar' };
  const label = sectionMap[step];
  if (label) toast.info(`📍 ${label}`, { duration: 1500 });
}

function MockupProgress({ mg }: { mg: MockupState }) {
  if (mg.activeTab === 'history') return null;
  return <Suspense fallback={null}><MockupWizard currentStep={mg.wizardStep} hasClient={Boolean(mg.selectedClient)}
    hasProduct={Boolean(mg.selectedProduct)} hasTechnique={Boolean(mg.selectedTechnique)} hasLogo={mg.hasLogo}
    hasPositioned={mg.hasUserInteractedPosition} hasGenerated={Boolean(mg.generatedMockup)}
    onStepClick={(step) => selectWizardStep(step, mg)} /></Suspense>;
}

function DraftRestoredNotice() {
  return <Alert className="border-success/50 bg-success/10"><CheckCircle2 className="h-4 w-4 text-success" />
    <AlertTitle className="text-success">Rascunho restaurado</AlertTitle>
    <AlertDescription className="text-success/80">Seu progresso anterior foi restaurado automaticamente.</AlertDescription>
  </Alert>;
}

function GenerationError({ mg }: { mg: MockupState }) {
  if (!mg.generationError || mg.isLoading) return null;
  return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Erro na geração</AlertTitle>
    <AlertDescription className="flex items-center justify-between"><span>{mg.generationError}</span>
      <Button variant="outline" size="sm" onClick={() => mg.setGenerationError(null)}>Dispensar</Button>
    </AlertDescription>
  </Alert>;
}

function UrlProductLoadError({ mg }: { mg: MockupState }) {
  if (!mg.urlProductLoadError) return null;
  return <Alert variant="destructive" role="alert"><AlertCircle className="h-4 w-4" />
    <AlertTitle>Não foi possível carregar o produto</AlertTitle>
    <AlertDescription className="flex items-center justify-between gap-3">
      <span>O produto solicitado pelo link não foi carregado. Tente novamente.</span>
      <Button variant="outline" size="sm" onClick={mg.retryUrlProduct}>Tentar novamente</Button>
    </AlertDescription>
  </Alert>;
}

function MockupNotices({ mg }: { mg: MockupState }) {
  return <>{mg.showDraftRestoredNotice && <DraftRestoredNotice />}<UrlProductLoadError mg={mg} /><GenerationError mg={mg} /></>;
}

function restorePosition(direction: 'undo' | 'redo', mg: MockupState): void {
  const state = mg.positionHistory[direction]();
  if (state) mg.updateActiveArea(state);
}

function MockupTabHeader({ mg }: { mg: MockupState }) {
  return <div className="flex items-center justify-between gap-2">
    <TabsList><TabsTrigger value="generator" className="flex items-center gap-2"><Wand2 className="h-4 w-4" /> Gerar Mockup</TabsTrigger>
      <TabsTrigger value="history" className="flex items-center gap-2"><History className="h-4 w-4" /> Histórico ({mg.mockupHistory.length})</TabsTrigger>
    </TabsList>
    <MockupToolbar canUndo={mg.positionHistory.canUndo} canRedo={mg.positionHistory.canRedo}
      onUndo={() => restorePosition('undo', mg)} onRedo={() => restorePosition('redo', mg)}
      isDraftSaving={mg.isDraftSaving} lastSaved={mg.lastSaved} draftError={mg.draftError} />
  </div>;
}

function LoadingFallback() {
  return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}

function MockupTabs({ mg, technique, profile }: { mg: MockupState; technique: TechniqueState; profile: Profile }) {
  return <Tabs value={mg.activeTab} onValueChange={mg.setActiveTab}
    className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
    <MockupTabHeader mg={mg} />
    <TabsContent value="generator"><Suspense fallback={<LoadingFallback />}>
      <GeneratorWorkspace mg={mg} technique={technique} profile={profile} />
    </Suspense></TabsContent>
    <TabsContent value="history"><Suspense fallback={<LoadingFallback />}><HistoryPanel mg={mg} /></Suspense></TabsContent>
  </Tabs>;
}

function updateProductSelection(selection: Parameters<MockupState['setProductSelection']>[0], mg: MockupState): void {
  mg.setProductSelection(selection);
  mg.setGeneratedMockup(null);
}

function ConfigurationPanel({ mg, technique }: { mg: MockupState; technique: TechniqueState }) {
  return <MockupConfigPanel techniques={mg.techniques} productSelection={mg.productSelection}
    selectedTechnique={mg.selectedTechnique} selectedClient={mg.selectedClient} isLoadingData={mg.isLoadingData}
    personalizationAreas={mg.personalizationAreas} filteredTechniques={mg.filteredTechniques}
    onProductSelect={(selection) => updateProductSelection(selection, mg)} onTechniqueSelect={technique.handleTechniqueChange}
    onClientSelect={mg.setSelectedClient} onReset={mg.resetForm} activeAreaId={mg.activeAreaId}
    onAreasChange={mg.setPersonalizationAreas} onActiveAreaChange={mg.setActiveAreaId} onLogoUpload={mg.handleAreaLogoUpload}
    onLogoRemove={mg.logoColorAnalysis.clearAnalysis} productLocations={mg.productLocations} logoColorAnalysis={mg.logoColorAnalysis} />;
}

function GeneratorWorkspace({ mg, technique, profile }: { mg: MockupState; technique: TechniqueState; profile: Profile }) {
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><ConfigurationPanel mg={mg} technique={technique} />
    <PreviewColumn mg={mg} technique={technique} profile={profile} />
  </div>;
}

function techniqueLimit(selected: MockupState['selectedTechnique'], key: 'maxWidth' | 'maxHeight'): number | null {
  if (!selected || !(key in selected)) return null;
  return (selected as TechniqueWithLimits)[key] ?? null;
}

function layoutTechnique(mg: MockupState) {
  const selected = mg.selectedTechnique;
  if (!selected) return null;
  return { name: selected.name, code: selected.code, maxWidth: techniqueLimit(selected, 'maxWidth'),
    maxHeight: techniqueLimit(selected, 'maxHeight'), locationName: 'locationName' in selected ? (selected as TechniqueWithLimits).locationName : null };
}

function layoutProduct(mg: MockupState) {
  const product = mg.selectedProduct;
  if (!product) return null;
  return { name: product.name, sku: product.sku, imageUrl: productImage(mg),
    color: selectionValue(mg.productSelection, 'colorName'), colorHex: selectionValue(mg.productSelection, 'colorHex'),
    material: firstMaterial(product), heightCm: dimensionValue(product.dimensions, 'height_cm'),
    widthCm: dimensionValue(product.dimensions, 'width_cm'), diameterCm: dimensionValue(product.dimensions, 'diameter_cm'),
    depthCm: dimensionValue(product.dimensions, 'length_cm'), capacityMl: dimensionValue(product.dimensions, 'capacity_ml'),
    weightG: dimensionValue(product.dimensions, 'weight_g') };
}

function layoutSeller(profile: Profile) {
  if (!profile) return null;
  return { name: profile.full_name || '—', email: profile.email || undefined };
}

function LayoutActions({ mg, profile }: { mg: MockupState; profile: Profile }) {
  const product = mg.selectedProduct;
  return <MockupLayoutButtons generatedMockup={mg.generatedMockup} product={layoutProduct(mg)} technique={layoutTechnique(mg)}
    client={mg.selectedClient} seller={layoutSeller(profile)} activeArea={mg.activeArea || null}
    productHeightCm={dimensionValue(product?.dimensions, 'height_cm')} productWidthCm={productWidth(product?.dimensions)}
    pantoneColors={mg.logoColorAnalysis.colors} colorsCount={mg.techniqueColorConfig?.colorCount}
    onStaticGenerated={async (dataUrl, extra) => saveStaticLayout(dataUrl, extra, mg)}
    onGenerateMockup={mg.generateMockup} isGeneratingMockup={mg.isLoading} />;
}

async function saveStaticLayout(
  dataUrl: string,
  extra: Parameters<MockupState['saveMockupToHistory']>[2],
  mg: MockupState,
): Promise<void> {
  if (!mg.activeArea) return;
  const recordId = await mg.saveMockupToHistory(dataUrl, mg.activeArea, extra);
  if (!recordId) return;
  mg.setLastSavedMockupUrl(dataUrl);
  mg.setLastSavedLayoutMode('static');
  mg.setLastSavedRecordId(recordId);
}

function ProductEditor({ mg, technique, profile }: { mg: MockupState; technique: TechniqueState; profile: Profile }) {
  const productImage = mg.getProductImage();
  if (!mg.selectedProduct || !productImage || !mg.activeArea) return <MockupEmptyState />;
  return <LogoPositionEditor productImageUrl={productImage} logoPreview={mg.activeArea.logoPreview}
    positionX={mg.activeArea.positionX} positionY={mg.activeArea.positionY} logoWidth={mg.activeArea.logoWidth}
    logoHeight={mg.activeArea.logoHeight} logoRotation={mg.activeArea.logoRotation || 0} logoScale={mg.activeArea.logoScale ?? 100}
    techniqueCode={mg.selectedTechnique?.code} techniqueName={mg.selectedTechnique?.name}
    maxWidth={techniqueLimit(mg.selectedTechnique, 'maxWidth')} maxHeight={techniqueLimit(mg.selectedTechnique, 'maxHeight')}
    productHeightCm={dimensionValue(mg.selectedProduct.dimensions, 'height_cm')}
    productWidthCm={productWidth(mg.selectedProduct.dimensions)}
    onPositionChange={(x, y) => mg.updateActiveArea({ positionX: x, positionY: y })}
    onSizeChange={(width, height) => mg.updateActiveArea({ logoWidth: width, logoHeight: height })}
    onRotationChange={(rotation) => mg.updateActiveArea({ logoRotation: rotation })}
    onLogoScaleChange={(scale) => mg.updateActiveArea({ logoScale: scale })} techniqueColorConfig={mg.techniqueColorConfig}
    onColorConfigClick={() => technique.setColorConfigDialogOpen(true)} headerActions={<LayoutActions mg={mg} profile={profile} />} />;
}

function ResultCard({ mg }: { mg: MockupState }) {
  return <MockupResultCard generatedMockup={mg.generatedMockup} isLoading={mg.isLoading}
    onDownload={() => mg.downloadMockup()} productName={mg.selectedProduct?.name} techniqueName={mg.selectedTechnique?.name}
    onReset={mg.resetForm} beforeImage={mg.beforeImage} annotations={mg.mockupAnnotations}
    onAnnotationsChange={mg.setMockupAnnotations} />;
}

function BatchResults({ mg }: { mg: MockupState }) {
  if (mg.generatedBatchMockups.length <= 1) return null;
  return <div className="space-y-2"><p className="text-sm font-medium text-muted-foreground">Todas as áreas ({mg.generatedBatchMockups.length})</p>
    <div className="grid grid-cols-2 gap-2">{mg.generatedBatchMockups.map((batch) => <div key={`${batch.areaName}-${batch.url}`}
      className="border border-border/30 rounded-lg overflow-hidden bg-card"><img src={batch.url} alt={batch.areaName}
        className="w-full aspect-square object-contain" loading="lazy" /><div className="p-2 text-center">
          <Badge variant="secondary" className="text-[10px]">{batch.areaName}</Badge></div></div>)}</div>
  </div>;
}

function PreviewColumn({ mg, technique, profile }: { mg: MockupState; technique: TechniqueState; profile: Profile }) {
  return <div className="space-y-4 lg:sticky lg:top-4 lg:self-start"><ProductEditor mg={mg} technique={technique} profile={profile} />
    <ResultCard mg={mg} /><BatchResults mg={mg} />
  </div>;
}

function removeHistoryItem(id: string, mg: MockupState): void {
  mg.setMockupToDelete(id);
  mg.setDeleteDialogOpen(true);
}

function HistoryPanel({ mg }: { mg: MockupState }) {
  return <MockupHistoryPanel mockupHistory={mg.mockupHistory} isLoading={mg.isLoadingHistory} clients={mg.historyClients}
    techniques={mg.techniques} onLoadFromHistory={mg.loadFromHistory} onDownload={mg.downloadMockup}
    onDelete={(id) => removeHistoryItem(id, mg)} onShare={mg.handleShareMockup} />;
}

function colorConfigMessage(config: NonNullable<MockupState['techniqueColorConfig']>): string {
  if (config.category === 'laser') return `Tom ${config.laserTone === 'claro' ? 'claro' : 'escuro'} selecionado`;
  if (config.category !== 'serigrafia') return 'Policromia (Full Color)';
  const count = config.colorCount || 1;
  return `${config.colorCount} cor${count > 1 ? 'es' : ''} configurada${count > 1 ? 's' : ''}`;
}

function confirmColorConfig(config: NonNullable<MockupState['techniqueColorConfig']>, mg: MockupState): void {
  mg.setTechniqueColorConfig(config);
  toast.success(colorConfigMessage(config), { duration: 2000 });
}

function MockupDialogs({ mg, technique }: { mg: MockupState; technique: TechniqueState }) {
  return <><TechniqueChangeDialog open={technique.techniqueChangeDialogOpen} onOpenChange={technique.setTechniqueChangeDialogOpen}
    fromName={mg.selectedTechnique?.name} toName={technique.pendingTechnique?.name} hasGeneratedMockup={Boolean(mg.generatedMockup)}
    onConfirm={technique.confirmTechniqueChange} onCancel={() => technique.setTechniqueChangeDialogOpen(false)} />
    <DeleteMockupDialog open={mg.deleteDialogOpen} onOpenChange={mg.setDeleteDialogOpen} onConfirm={mg.deleteMockup} />
    <Suspense fallback={null}><TechniqueColorConfigDialog open={technique.colorConfigDialogOpen}
      onOpenChange={technique.setColorConfigDialogOpen} techniqueName={mg.selectedTechnique?.name || ''}
      techniqueCode={mg.selectedTechnique?.code} detectedColors={mg.logoColorAnalysis.colors} currentConfig={mg.techniqueColorConfig}
      onConfirm={(config) => confirmColorConfig(config, mg)} /></Suspense>
    <Suspense fallback={null}><AIMockupAssistant productName={mg.selectedProduct?.name} techniqueName={mg.selectedTechnique?.name} /></Suspense>
  </>;
}
