/**
 * MagicUp Configuration Panel — Left side with product, logo, scene selection
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Loader2,
  MapPin,
  Paintbrush,
  Wand2,
  Eye,
  EyeOff,
  Building2,
  Search,
  X,
  Sparkles,
  Briefcase,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProductSearchCombobox } from '@/components/mockup/ProductSearchCombobox';
import { PromptBank } from '@/components/magic-up/PromptBank';
import { PromptGenerator } from '@/components/magic-up/PromptGenerator';
import { cn } from '@/lib/utils';
import { getCompanyDisplayName } from '@/types/crm';
import type { useMagicUpState, MagicUpProduct } from '@/hooks/useMagicUpState';
import { MagicUpCampaignPanel } from '@/components/magic-up/MagicUpCampaignPanel';
import { MagicUpBrandKitPanel } from '@/components/magic-up/MagicUpBrandKitPanel';
import { MagicUpCreativeControls } from '@/components/magic-up/MagicUpCreativeControls';
import { MagicUpRefinementActions } from '@/components/magic-up/MagicUpRefinementActions';
import { MagicUpBatchGenerationPanel } from '@/components/magic-up/MagicUpBatchGenerationPanel';
import { BRIEF_OPTIONS, toHuman, type MagicUpBrief } from './magicUpStrategy';

type MagicUpStateReturn = ReturnType<typeof useMagicUpState>;

interface MagicUpConfigPanelProps {
  m: MagicUpStateReturn;
}

export function MagicUpConfigPanel({ m }: MagicUpConfigPanelProps) {
  return (
    <div className="space-y-4">
      <ClientCard m={m} />
      <BriefingCard m={m} />
      <ProductCard m={m} />
      <LogoCard m={m} />
      <BrandKitCard m={m} />
      <SceneCard m={m} />
      <MagicUpCreativeControls value={m.creativeControls} onChange={m.setCreativeControls} />
      <MagicUpRefinementActions
        activeRefinement={m.activeRefinement}
        onApply={m.handleApplyRefinement}
      />
      <MagicUpBatchGenerationPanel
        queue={m.batchQueue}
        running={m.batchRunning}
        canGenerate={m.canGenerate}
        onSetQueue={m.handleSetBatchQueue}
        onRunQueue={m.handleRunBatchQueue}
        onClearQueue={m.handleClearBatchQueue}
      />
      <PreviewCard m={m} />
      <GenerateButton m={m} />
    </div>
  );
}

function BriefingCard({ m }: { m: MagicUpStateReturn }) {
  const fields: Array<{
    field: keyof Pick<MagicUpBrief, 'objective' | 'channel' | 'audience' | 'tone'>;
    options: string[];
  }> = [
    { field: 'objective', options: BRIEF_OPTIONS.objective },
    { field: 'channel', options: BRIEF_OPTIONS.channel },
    { field: 'audience', options: BRIEF_OPTIONS.audience },
    { field: 'tone', options: BRIEF_OPTIONS.tone },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4 text-primary" /> Briefing da campanha
        </CardTitle>
        <CardDescription className="text-xs">
          Defina intenção comercial, canal, público e CTA antes de gerar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <MagicUpCampaignPanel
          brief={m.brief}
          campaign={m.activeCampaign}
          campaigns={m.campaigns}
          onBriefChange={m.setBrief}
          onCampaignChange={m.setActiveCampaign}
          onSave={m.handleSaveCampaign}
          onSelectCampaign={m.handleSelectCampaign}
          onDuplicateCampaign={m.handleDuplicateCampaign}
          fields={fields}
        />
      </CardContent>
    </Card>
  );
}

function ClientCard({ m }: { m: MagicUpStateReturn }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Empresa
          <Badge variant="outline" className="ml-1 text-[9px]">
            Opcional
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Busque na base de 51k+ empresas do CRM
        </CardDescription>
      </CardHeader>
      <CardContent>
        {m.selectedClient ? <SelectedClient m={m} /> : <ClientSearch m={m} />}
      </CardContent>
    </Card>
  );
}

function SelectedClient({ m }: { m: MagicUpStateReturn }) {
  const client = m.selectedClient;
  if (!client) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-2">
      {client.logo_url && (
        <img
          src={client.logo_url}
          alt=""
          className="h-8 w-8 rounded border bg-background object-contain"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{client.name}</p>
        {client.ramo_atividade && (
          <p className="text-[10px] text-muted-foreground">{client.ramo_atividade}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={m.handleClearClient}
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ClientSearch({ m }: { m: MagicUpStateReturn }) {
  const showResults = m.showClientResults && m.clientSearch.length >= 3;
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label="Buscar empresa para a campanha"
        placeholder="Buscar empresa por nome..."
        value={m.clientSearch}
        onChange={(event) => {
          m.setClientSearch(event.target.value);
          m.setShowClientResults(true);
        }}
        onFocus={() => m.setShowClientResults(true)}
        className="h-9 pl-9"
      />
      {showResults && <ClientSearchResults m={m} />}
    </div>
  );
}

function ClientSearchResults({ m }: { m: MagicUpStateReturn }) {
  if (m.loadingClients) {
    return (
      <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover p-3 text-center text-sm text-muted-foreground shadow-lg">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        Buscando...
      </div>
    );
  }
  if (m.clientResults.length === 0) {
    return (
      <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover p-3 text-center text-sm text-muted-foreground shadow-lg">
        Nenhuma empresa encontrada
      </div>
    );
  }
  return (
    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-popover shadow-lg">
      {m.clientResults.map((client) => (
        <button
          key={client.id}
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50"
          onClick={() => m.handleSelectClient(client)}
        >
          {client.logo_url && (
            <img
              src={client.logo_url}
              alt=""
              className="h-6 w-6 rounded border bg-background object-contain"
              loading="lazy"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{getCompanyDisplayName(client)}</p>
            {client.ramo_atividade && (
              <p className="text-[10px] text-muted-foreground">{client.ramo_atividade}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function SelectedProductSummary({ m }: { m: MagicUpStateReturn }) {
  if (!m.selectedProduct) return null;
  return (
    <div className="flex gap-4">
      {m.currentImage && (
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-background">
          <img
            src={m.currentImage}
            alt={m.selectedProduct.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="truncate text-sm font-medium">{m.selectedProduct.name}</p>
        <p className="text-xs text-muted-foreground">SKU: {m.selectedProduct.sku}</p>
        {!m.loadingColors && m.colors.length > 0 && <ProductColorSelector m={m} />}
      </div>
    </div>
  );
}

function ProductColorSelector({ m }: { m: MagicUpStateReturn }) {
  return (
    <div className="flex flex-wrap gap-1">
      {m.colors.map((color) => {
        const selected = m.selectedColor?.name === color.name;
        const label = color.name.length > 12 ? `${color.name.slice(0, 12)}…` : color.name;
        return (
          <button
            key={color.name}
            type="button"
            onClick={() => m.setSelectedColor(selected ? null : color)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all',
              selected
                ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50',
            )}
            title={color.name}
          >
            <span
              className="h-2.5 w-2.5 rounded-full border border-border/30"
              style={{ backgroundColor: color.hex }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function PrintAreaSelector({ m }: { m: MagicUpStateReturn }) {
  if (
    !m.selectedProduct ||
    m.sceneTab === 'ai' ||
    m.loadingPrintAreas ||
    m.printAreas.length === 0
  ) {
    return null;
  }
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" /> Local de Personalização
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {m.printAreas.map((area) => {
          const label =
            [area.component_name, area.location_name].filter(Boolean).join(' — ') || area.area_code;
          const selected = m.selectedLocationId === area.area_id;
          return (
            <button
              key={area.area_id}
              type="button"
              onClick={() => m.setSelectedLocationId(selected ? null : area.area_id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                selected
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50',
              )}
            >
              <MapPin className="h-3 w-3" />
              {label}
              {area.max_width > 0 && (
                <span className="text-[9px] opacity-60">
                  {area.max_width}×{area.max_height}
                  {area.unit}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TechniqueSelector({ m }: { m: MagicUpStateReturn }) {
  if (!m.selectedProduct || m.sceneTab === 'ai' || m.availableTechniques.length === 0) {
    return null;
  }
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Paintbrush className="h-3 w-3" /> Técnica
      </Label>
      <Select
        value={m.selectedTechnique?.id || ''}
        onValueChange={(value) =>
          m.setSelectedTechnique(
            m.availableTechniques.find((technique) => technique.id === value) || null,
          )
        }
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {m.availableTechniques.map((technique) => (
            <SelectItem key={technique.id} value={technique.id}>
              {technique.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ProductCard({ m }: { m: MagicUpStateReturn }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            1
          </span>
          Produto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProductSearchCombobox
          products={m.products}
          selectedProduct={m.selectedProduct}
          onSelect={(p) => m.handleSelectProduct(p as MagicUpProduct | null)}
          placeholder="Buscar produto por nome ou SKU..."
        />

        <SelectedProductSummary m={m} />
        <PrintAreaSelector m={m} />
        <TechniqueSelector m={m} />
      </CardContent>
    </Card>
  );
}

function LogoCard({ m }: { m: MagicUpStateReturn }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            2
          </span>
          Logo do Cliente
        </CardTitle>
        {m.selectedClient?.logo_url && m.logoPreview === m.selectedClient.logo_url && (
          <CardDescription className="text-xs">
            ✓ Logo carregado automaticamente da empresa
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <LogoUploader m={m} />
      </CardContent>
    </Card>
  );
}

function LogoUploader({ m }: { m: MagicUpStateReturn }) {
  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        m.logoPreview ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-primary/50',
      )}
    >
      <input
        type="file"
        accept="image/*"
        onChange={m.handleLogoUpload}
        disabled={m.logoUploading}
        className="hidden"
        id="magic-logo-upload"
      />
      <label
        htmlFor="magic-logo-upload"
        className="flex cursor-pointer flex-col items-center gap-2"
      >
        <LogoUploadContent m={m} />
      </label>
    </div>
  );
}

function LogoUploadContent({ m }: { m: MagicUpStateReturn }) {
  if (m.logoUploading) return <Loader2 className="h-10 w-10 animate-spin text-primary" />;
  if (m.logoPreview) {
    return (
      <>
        <div className="h-20 w-20 overflow-hidden rounded-lg border bg-background">
          <img
            src={m.logoPreview}
            alt="Logo"
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
        <Button variant="outline" size="sm" type="button">
          Trocar logo
        </Button>
      </>
    );
  }
  return (
    <>
      <Upload className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm font-medium">Clique para enviar o logo</p>
      <p className="text-xs text-muted-foreground">PNG, JPG, SVG · Máx. 10MB</p>
    </>
  );
}

function BrandKitCard({ m }: { m: MagicUpStateReturn }) {
  return (
    <MagicUpBrandKitPanel
      kit={m.brandKit}
      loading={m.loadingBrandKit}
      selectedClientName={m.selectedClient?.name}
      logoPreview={m.logoPreview}
      onUpdate={m.handleUpdateBrandKit}
      onUseLogo={m.handleUseBrandLogo}
      onAddCurrentLogo={m.handleAddCurrentLogoToBrandKit}
      onSave={m.handleSaveBrandKit}
    />
  );
}

function SceneModeTabs({ m }: { m: MagicUpStateReturn }) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
      <button
        type="button"
        onClick={() => m.setSceneTab('ai')}
        className={cn(
          'flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all',
          m.sceneTab === 'ai'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Wand2 className="h-3.5 w-3.5" />
        Gerar com IA
      </button>
      <button
        type="button"
        onClick={() => m.setSceneTab('bank')}
        className={cn(
          'flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all',
          m.sceneTab === 'bank'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Banco de Prompts
      </button>
    </div>
  );
}

function SceneSelector({ m }: { m: MagicUpStateReturn }) {
  if (m.sceneTab === 'ai') {
    return <AiSceneSelector m={m} />;
  }
  return (
    <PromptBank
      selectedPrompt={m.selectedScene}
      onSelect={(prompt) => m.setSelectedScene(prompt)}
      productName={m.selectedProduct?.name}
      clientSegment={m.selectedClient?.ramo_atividade}
    />
  );
}

function updateSceneCustomization(
  m: MagicUpStateReturn,
  info: {
    locationId: string | null;
    techniqueId: string | null;
    techniqueName: string | null;
  },
) {
  m.setSelectedLocationId(info.locationId);
  if (!info.techniqueId || !info.techniqueName) {
    m.setSelectedTechnique(null);
    return;
  }
  const technique = m.availableTechniques.find((candidate) => candidate.id === info.techniqueId);
  m.setSelectedTechnique({
    id: info.techniqueId,
    name: info.techniqueName,
    code: technique?.code || '',
  });
}

function AiSceneSelector({ m }: { m: MagicUpStateReturn }) {
  return (
    <PromptGenerator
      productName={m.selectedProduct?.name}
      productColor={m.selectedColor?.name}
      clientName={m.selectedClient?.name}
      clientSegment={m.selectedClient?.ramo_atividade}
      brandColorName={m.selectedClient?.cor_primaria_nome}
      printAreas={m.printAreas || []}
      onSelectPrompt={(prompt) => m.setSelectedScene(prompt)}
      selectedPrompt={m.selectedScene}
      initialLocationId={m.selectedLocationId}
      initialTechniqueId={m.selectedTechnique?.id || null}
      onCustomizationChange={(info) => updateSceneCustomization(m, info)}
    />
  );
}

function AdditionalSceneDetails({ m }: { m: MagicUpStateReturn }) {
  const showHint = !m.selectedScene && Boolean(m.additionalDetails.trim());
  return (
    <div className="relative">
      <Label className="mb-1 block text-xs text-muted-foreground">
        Detalhes adicionais (complementa o cenário acima):
      </Label>
      <Textarea
        aria-label="Detalhes adicionais do cenário"
        value={m.additionalDetails}
        onChange={(event) => m.setAdditionalDetails(event.target.value)}
        placeholder="Ex: A pessoa deve estar sorrindo, ambiente com tons quentes, foco no produto..."
        rows={3}
        className="resize-none text-sm"
      />
      {showHint && (
        <p className="mt-1 text-[10px] text-warning">
          💡 Dica: selecione também um cenário acima para melhores resultados
        </p>
      )}
    </div>
  );
}

function getSceneSummary(m: MagicUpStateReturn) {
  const hasDetails = Boolean(m.additionalDetails.trim());
  if (m.selectedScene && hasDetails) {
    return `${m.selectedScene.title} + detalhes extras`;
  }
  if (m.selectedScene) return m.selectedScene.title;
  return 'Cenário personalizado';
}

function ScenePromptPreview({ m }: { m: MagicUpStateReturn }) {
  const hasSceneInput = Boolean(m.selectedScene || m.additionalDetails.trim());
  if (!hasSceneInput) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{getSceneSummary(m)}</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-[10px]"
          onClick={() => m.setShowPromptPreview(!m.showPromptPreview)}
        >
          {m.showPromptPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {m.showPromptPreview ? 'Ocultar' : 'Ver prompt completo'}
        </Button>
      </div>
      {m.showPromptPreview && m.fullPromptPreview && (
        <pre className="whitespace-pre-wrap rounded border bg-muted/50 p-2.5 font-mono text-[10px] text-muted-foreground">
          {m.fullPromptPreview}
        </pre>
      )}
    </div>
  );
}

function SceneCard({ m }: { m: MagicUpStateReturn }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            3
          </span>
          Cenário Publicitário
        </CardTitle>
        <CardDescription className="text-xs">
          Use a IA para gerar cenários personalizados ou escolha do banco de prompts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SceneModeTabs m={m} />
        <SceneSelector m={m} />
        <AdditionalSceneDetails m={m} />
        <ScenePromptPreview m={m} />
      </CardContent>
    </Card>
  );
}

function PreviewCard({ m }: { m: MagicUpStateReturn }) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">Prévia comercial</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Badge variant="outline" className="justify-center">
            Canal: {toHuman(m.brief.channel)}
          </Badge>
          <Badge variant="outline" className="justify-center">
            Formato: {m.creativeControls.aspectRatio}
          </Badge>
          <Badge variant="outline" className="justify-center">
            Score: {m.qualityScore.total}/100
          </Badge>
          <Badge variant="outline" className="justify-center">
            Tom: {toHuman(m.brief.tone)}
          </Badge>
        </div>
        <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          {m.qualityScore.checks.map((check) => (
            <p key={check.label}>
              {check.passed ? '✓' : '•'} {check.label}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GenerateButton({ m }: { m: MagicUpStateReturn }) {
  return (
    <Button
      onClick={() => m.handleGenerate()}
      disabled={!m.canGenerate || m.generating}
      className="h-12 w-full gap-2 text-base"
      size="lg"
    >
      {m.generating ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Gerando com modelo Pro...
        </>
      ) : (
        <>
          <Wand2 className="h-5 w-5" />
          {m.variations.length > 0 ? 'Gerar Nova Variação' : 'Gerar Imagem Publicitária'}
          {!m.canGenerate && (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {!m.selectedProduct
                ? 'Selecione um produto'
                : !m.logoPreview
                  ? 'Envie o logo'
                  : !m.effectivePrompt
                    ? 'Escolha um cenário'
                    : ''}
            </Badge>
          )}
        </>
      )}
    </Button>
  );
}
