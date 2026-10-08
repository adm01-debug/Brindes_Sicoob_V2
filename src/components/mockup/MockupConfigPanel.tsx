import type { ReactNode } from "react";
/**
 * MockupConfigPanel — Configuration form for mockup generation
 * 
 * Extracted from MockupGenerator.tsx to reduce god-component size.
 * Handles: Client, Product, Technique selection + Areas.
 */

import { Loader2, Paintbrush, RefreshCw, Info, ChevronDown, Wand2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { TechniqueTooltip } from "./TechniqueTooltip";
import { MockupClientSelector } from "./MockupClientSelector";
import { MockupProductSelector, type MockupProductSelection } from "./MockupProductSelector";
import { MultiAreaManager, type PersonalizationArea } from "./MultiAreaManager";
import { LogoColorAnalyzer } from "./LogoColorAnalyzer";
import type { DetectedColor } from "@/hooks/useLogoColorAnalysis";

interface Technique {
  id: string;
  name: string;
  code: string | null;
  maxWidth?: number | null;
  maxHeight?: number | null;
  areaName?: string | null;
  locationName?: string | null;
  // Atributos novos (vindos de TechniqueWithLimits)
  maxColors?: number | null;
  chargesPerColor?: boolean;
  usesDimension?: boolean;
  isCurved?: boolean;
  setupCost?: number | null;
  variationLabel?: string | null;
  groupCode?: string | null;
  shape?: string | null;
}

export interface MockupClient {
  id: string;
  name: string;
  razao_social?: string;
  nome_fantasia?: string;
  ramo?: string;
  logo_url?: string;
  cnpj?: string;
}

interface MockupConfigPanelProps {
  techniques: Technique[];
  productSelection: MockupProductSelection | null;
  selectedTechnique: Technique | null;
  selectedClient: MockupClient | null;
  isLoadingData: boolean;
  personalizationAreas: PersonalizationArea[];
  onProductSelect: (selection: MockupProductSelection | null) => void;
  onTechniqueSelect: (technique: Technique | null) => void;
  onClientSelect: (client: MockupClient | null) => void;
  onReset: () => void;
  filteredTechniques: Technique[];
  // Multi-area props
  activeAreaId: string | null;
  onAreasChange: (areas: PersonalizationArea[]) => void;
  onActiveAreaChange: (id: string | null) => void;
  onLogoUpload: (areaId: string, file: File) => void;
  onLogoRemove?: (areaId: string) => void;
  /** Real product locations from DB — if provided, locks areas to these */
  productLocations: { code: string; name: string; order: number }[] | null;
  /** Logo color analysis */
  logoColorAnalysis?: {
    colors: DetectedColor[];
    isAnalyzing: boolean;
    error: string | null;
    updatePantone: (index: number, pantoneCode: string) => void;
  };
}

export function MockupConfigPanel(props: MockupConfigPanelProps) {
  return (
    <Card className="border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Configuração
        </CardTitle>
        <CardDescription>
          Selecione o produto, técnica e faça upload do logo do cliente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {props.isLoadingData ? <LoadingState /> : <ConfigSections {...props} />}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return <div className="flex items-center justify-center py-8"><div className="text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" /><p className="text-sm text-muted-foreground">Carregando dados...</p></div></div>;
}

function ConfigSections(props: MockupConfigPanelProps) {
  return <>
    <ClientSection {...props} />
    <ProductSection {...props} />
    <TechniqueSection {...props} />
    <AreasSection {...props} />
    <LogoAnalysisSection analysis={props.logoColorAnalysis} />
    <div className="flex gap-2 pt-4"><Tooltip><TooltipTrigger asChild><Button variant="outline" onClick={props.onReset} aria-label="Limpar formulário"><RefreshCw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Limpar formulário</TooltipContent></Tooltip></div>
  </>;
}

function ClientSection(props: MockupConfigPanelProps) {
  return <MobileCollapsibleSection stepNumber={1} label="Empresa" isCompleted={Boolean(props.selectedClient)} summary={props.selectedClient?.name} required><MockupClientSelector selectedClient={props.selectedClient} onClientSelect={props.onClientSelect} /></MobileCollapsibleSection>;
}

function ProductSection(props: MockupConfigPanelProps) {
  return <MobileCollapsibleSection stepNumber={2} label="Produto" isCompleted={Boolean(props.productSelection)} summary={props.productSelection?.product.name}><MockupProductSelector selection={props.productSelection} onSelect={props.onProductSelect} /></MobileCollapsibleSection>;
}

function TechniqueOptionMetadata({ technique }: { technique: Technique }) {
  const hasDetails = technique.variationLabel || technique.maxColors || technique.isCurved || technique.usesDimension;
  if (!hasDetails) return null;
  return <div className="flex items-center gap-1.5 ml-5 text-[10px] text-muted-foreground">{technique.variationLabel && <span className="truncate max-w-[140px]">{technique.variationLabel}</span>}<TechniqueColorCount technique={technique} />{technique.isCurved ? <span>· curvo</span> : null}{technique.usesDimension ? <span>· por área</span> : null}</div>;
}

function TechniqueColorCount({ technique }: { technique: Technique }) {
  if (!technique.maxColors) return null;
  return <span>· {technique.maxColors} cor{technique.maxColors > 1 ? "es" : ""}</span>;
}

function TechniqueOption({ technique }: { technique: Technique }) {
  const dimensions = technique.maxWidth && technique.maxHeight
    ? <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">{technique.maxWidth}×{technique.maxHeight}cm</span>
    : null;
  return <TechniqueTooltip technique={technique}><SelectItem value={technique.id} className="cursor-pointer"><div className="flex flex-col gap-0.5 w-full"><div className="flex items-center gap-2"><Paintbrush className="h-3.5 w-3.5 text-primary" /><span>{technique.name}</span>{dimensions}</div><TechniqueOptionMetadata technique={technique} /></div></SelectItem></TechniqueTooltip>;
}

function TechniqueOptions(props: MockupConfigPanelProps) {
  if (props.filteredTechniques.length === 0) {
    const message = props.productSelection ? "Nenhuma técnica disponível para este produto" : "Selecione um produto primeiro";
    return <div className="px-2 py-4 text-center text-sm text-muted-foreground">{message}</div>;
  }
  const isFiltered = props.productSelection && props.filteredTechniques.length < props.techniques.length;
  return <>{isFiltered && <div className="px-2 py-1.5 text-[10px] text-muted-foreground bg-muted/50">Técnicas compatíveis com {props.productSelection?.product.name}</div>}{props.filteredTechniques.map((technique) => <TechniqueOption key={technique.id} technique={technique} />)}</>;
}

function TechniqueDetails({ technique }: { technique: Technique | null }) {
  if (!technique || !(technique.locationName || technique.maxWidth || technique.maxColors)) return null;
  return <p className="text-[11px] text-muted-foreground"><TechniqueLocation technique={technique} /><TechniqueLimits technique={technique} /><TechniquePricing technique={technique} /></p>;
}

function TechniqueLocation({ technique }: { technique: Technique }) {
  return technique.locationName ? <>Local: <strong className="text-foreground/80">{technique.locationName}</strong></> : null;
}

function TechniqueLimits({ technique }: { technique: Technique }) {
  const dimensions = technique.maxWidth && technique.maxHeight ? <> · Máx {technique.maxWidth}×{technique.maxHeight}cm</> : null;
  const colors = technique.maxColors ? <> · {technique.maxColors} cor{technique.maxColors > 1 ? "es" : ""}{technique.chargesPerColor ? " (cobra por cor)" : ""}</> : null;
  return <>{dimensions}{colors}</>;
}

function TechniquePricing({ technique }: { technique: Technique }) {
  return technique.setupCost ? <> · Setup R$ {technique.setupCost.toFixed(2)}</> : null;
}

function TechniqueSection(props: MockupConfigPanelProps) {
  const selected = props.selectedTechnique;
  const trailing = selected ? <TechniqueTooltip technique={selected}><Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" /></TechniqueTooltip> : undefined;
  const isFiltered = props.productSelection && props.filteredTechniques.length > 0 && props.filteredTechniques.length < props.techniques.length;
  const handleChange = (value: string) => props.onTechniqueSelect(props.filteredTechniques.find((technique) => technique.id === value) ?? null);
  return <MobileCollapsibleSection stepNumber={3} label="Técnica de Personalização" isCompleted={Boolean(selected)} summary={selected?.name} trailing={trailing}><Select value={selected?.id || ""} onValueChange={handleChange}><SelectTrigger><SelectValue placeholder="Selecione uma técnica..." /></SelectTrigger><SelectContent><TechniqueOptions {...props} /></SelectContent></Select><TechniqueDetails technique={selected} />{isFiltered && <p className="text-[10px] text-muted-foreground">{props.filteredTechniques.length} de {props.techniques.length} técnicas compatíveis</p>}</MobileCollapsibleSection>;
}

function AreasSection(props: MockupConfigPanelProps) {
  const logoCount = props.personalizationAreas.filter((area) => area.logoPreview).length;
  return <MobileCollapsibleSection stepNumber={4} label="Áreas de Personalização" isCompleted={logoCount > 0} summary={logoCount > 0 ? `${logoCount} logo(s)` : undefined}><MultiAreaManager areas={props.personalizationAreas} activeAreaId={props.activeAreaId} onAreasChange={props.onAreasChange} onActiveAreaChange={props.onActiveAreaChange} onLogoUpload={props.onLogoUpload} onLogoRemove={props.onLogoRemove} productLocations={props.productLocations} /></MobileCollapsibleSection>;
}

function LogoAnalysisSection({ analysis }: { analysis?: MockupConfigPanelProps["logoColorAnalysis"] }) {
  if (!analysis || (analysis.colors.length === 0 && !analysis.isAnalyzing)) return null;
  return <MobileCollapsibleSection stepNumber={5} label="Cores da Logo" isCompleted={analysis.colors.length > 0 && !analysis.isAnalyzing} summary={analysis.colors.length > 0 ? `${analysis.colors.length} Pantone` : undefined}><LogoColorAnalyzer colors={analysis.colors} isAnalyzing={analysis.isAnalyzing} error={analysis.error} onPantoneChange={analysis.updatePantone} /></MobileCollapsibleSection>;
}

// ─── Mobile Collapsible Section ──────────────────────────────────────

interface MobileCollapsibleSectionProps {
  stepNumber: number;
  label: string;
  isCompleted: boolean;
  summary?: string;
  required?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
}

function StepCircle({ stepNumber, isCompleted }: Pick<MobileCollapsibleSectionProps, "stepNumber" | "isCompleted">) {
  return <span className={cn("flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold", isCompleted ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>{stepNumber}</span>;
}

function MobileSectionHeader(props: Omit<MobileCollapsibleSectionProps, "children">) {
  return <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"><div className="flex items-center gap-2"><StepCircle {...props} /><span className="text-sm font-medium">{props.label}</span>{props.required && <span className="text-destructive text-xs">*</span>}{props.trailing}</div><div className="flex items-center gap-2">{props.isCompleted && props.summary && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{props.summary}</span>}<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" /></div></div>;
}

function MobileCollapsibleSection(props: MobileCollapsibleSectionProps) {
  return (
    <div className="space-y-2">
      <div className="hidden md:block space-y-2">
        <Label className="flex items-center gap-2">
          <StepCircle {...props} />
          {props.label} {props.required && <span className="text-destructive">*</span>}
          {props.trailing}
        </Label>
        {props.children}
      </div>
      <div className="md:hidden">
        <Collapsible defaultOpen={!props.isCompleted}>
          <CollapsibleTrigger className="w-full">
            <MobileSectionHeader {...props} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">{props.children}</CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
