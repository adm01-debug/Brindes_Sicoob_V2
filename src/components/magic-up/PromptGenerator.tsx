/**
 * PromptGenerator — Gerador de prompts publicitários com IA
 * Cria prompts otimizados baseados no contexto do produto, cliente e objetivo
 * Inclui seleção de local, técnica e dimensões reais do banco de dados
 */

import { type ReactNode, useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wand2, Loader2, Sparkles, Target, Users, CalendarDays, RefreshCw, Check, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ScenePrompt } from "./PromptBank";
import { OBJECTIVES, TONES, AUDIENCES, SEASONS, getMoodColor } from "./promptGeneratorConstants";
import type { PrintAreaWithTechniques } from "@/types/gravacao";
import { PromptCustomizationPanel } from "./PromptCustomizationPanel";

interface GeneratedPrompt {
  title: string;
  prompt: string;
  category: string;
  mood: string;
  bestFor: string;
}

interface PromptGeneratorProps {
  productName?: string;
  productColor?: string;
  clientName?: string;
  clientSegment?: string | null;
  brandColorName?: string | null;
  /** Áreas de gravação do produto selecionado (do usePrintAreas) */
  printAreas?: PrintAreaWithTechniques[];
  onSelectPrompt: (prompt: ScenePrompt) => void;
  selectedPrompt: ScenePrompt | null;
  /** Valor inicial do local selecionado (sync com MagicUp) */
  initialLocationId?: string | null;
  /** Valor inicial da técnica selecionada (sync com MagicUp) */
  initialTechniqueId?: string | null;
  /** Callback para informar local/técnica selecionados ao MagicUp */
  onCustomizationChange?: (info: {
    locationId: string | null;
    locationName: string | null;
    techniqueId: string | null;
    techniqueName: string | null;
    maxWidth: number;
    maxHeight: number;
    unit: string;
  }) => void;
}

function normalizedSelection(value: string) {
  return value === "none" ? null : value;
}

function areaLabel(area: PrintAreaWithTechniques | null | undefined) {
  if (!area) return null;
  return [area.component_name, area.location_name].filter(Boolean).join(" — ");
}

function selectedAreaById(printAreas: PrintAreaWithTechniques[] | undefined, areaId: string | null) {
  if (!printAreas || !areaId) return null;
  return printAreas.find((area) => area.area_id === areaId) || null;
}

function areaTechniques(area: PrintAreaWithTechniques | null) {
  if (!area) return [];
  return area.techniques || [];
}

function selectedTechniqueById(techniques: PrintAreaWithTechniques["techniques"], techniqueId: string | null) {
  if (!techniqueId) return null;
  return techniques.find((technique) => technique.id === techniqueId) || null;
}

function numberValue(value: number | null | undefined) {
  return value || 0;
}

function notifyAreaSelection(callback: PromptGeneratorProps["onCustomizationChange"], areaId: string | null, area: PrintAreaWithTechniques | null) {
  callback?.({ locationId: areaId, locationName: areaLabel(area), techniqueId: null, techniqueName: null, maxWidth: numberValue(area?.max_width), maxHeight: numberValue(area?.max_height), unit: area?.unit || "cm" });
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Erro ao gerar prompts";
}

async function requestGeneratedPrompts(body: Record<string, unknown>): Promise<GeneratedPrompt[]> {
  const { data, error } = await supabase.functions.invoke("generate-ad-prompt", { body });
  if (error) throw error;
  if (data?.prompts && Array.isArray(data.prompts)) return data.prompts;
  throw new Error(data?.error || "Nenhum prompt retornado");
}

function valueOrNull<T>(value: T | null | undefined): T | null {
  if (!value) return null;
  return value;
}

function seasonValue(season: string) {
  if (season === "none") return "";
  return season;
}

function promptRequestBody(input: {
  props: Pick<PromptGeneratorProps, "productName" | "productColor" | "clientName" | "clientSegment" | "brandColorName">;
  selectedTech: PrintAreaWithTechniques["techniques"][number] | null;
  selectedArea: PrintAreaWithTechniques | null;
  locationLabel: string | null;
  objective: string;
  tone: string;
  audience: string;
  season: string;
}) {
  const { props, selectedTech, selectedArea, locationLabel, objective, tone, audience, season } = input;
  return {
    productName: props.productName,
    productColor: props.productColor,
    productCategory: null,
    techniqueName: valueOrNull(selectedTech?.nome),
    locationName: valueOrNull(locationLabel),
    maxWidth: valueOrNull(selectedArea?.max_width),
    maxHeight: valueOrNull(selectedArea?.max_height),
    dimensionUnit: selectedArea?.unit || "cm",
    isCurved: selectedArea?.is_curved || false,
    clientName: props.clientName,
    clientSegment: props.clientSegment,
    brandColorName: props.brandColorName,
    objective,
    tone,
    targetAudience: audience,
    season: seasonValue(season),
    numberOfPrompts: 4,
  };
}

function CampaignSelect({ label, icon, value, placeholder, options, onChange }: { label: string; icon: ReactNode; value: string; placeholder: string; options: ReadonlyArray<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1"><Label className="text-[11px] text-muted-foreground flex items-center gap-1">{icon}{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value} className="text-xs">{option.label}</SelectItem>)}</SelectContent></Select></div>
  );
}

function CampaignSettings({ objective, tone, audience, season, setters }: { objective: string; tone: string; audience: string; season: string; setters: { objective: (value: string) => void; tone: (value: string) => void; audience: (value: string) => void; season: (value: string) => void } }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <CampaignSelect label="Objetivo" icon={<Target className="h-3 w-3" />} value={objective} placeholder="Escolha..." options={OBJECTIVES} onChange={setters.objective} />
      <CampaignSelect label="Tom" icon={<Sparkles className="h-3 w-3" />} value={tone} placeholder="Escolha..." options={TONES} onChange={setters.tone} />
      <CampaignSelect label="Público-alvo" icon={<Users className="h-3 w-3" />} value={audience} placeholder="Escolha..." options={AUDIENCES} onChange={setters.audience} />
      <CampaignSelect label="Temporada" icon={<CalendarDays className="h-3 w-3" />} value={season} placeholder="Opcional..." options={SEASONS} onChange={setters.season} />
    </div>
  );
}

function ContextChips({ productName, productColor, clientSegment, brandColorName }: Pick<PromptGeneratorProps, "productName" | "productColor" | "clientSegment" | "brandColorName">) {
  if (!clientSegment && !productColor) return null;
  return <div className="flex flex-wrap gap-1.5">{productName && <Badge variant="secondary" className="text-[9px]">📦 {productName}</Badge>}{productColor && <Badge variant="secondary" className="text-[9px]">🎨 {productColor}</Badge>}{clientSegment && <Badge variant="secondary" className="text-[9px]">🏢 {clientSegment}</Badge>}{brandColorName && <Badge variant="secondary" className="text-[9px]">🖌️ {brandColorName}</Badge>}</div>;
}

function GenerateButtonContent({ generating, generated }: { generating: boolean; generated: boolean }) {
  if (generating) return <><Loader2 className="h-4 w-4 animate-spin" />Criando prompts com IA...</>;
  if (generated) return <><RefreshCw className="h-4 w-4" />Gerar novos prompts</>;
  return <><Wand2 className="h-4 w-4" />Gerar Prompts com IA</>;
}

function PromptGenerateButton({ generating, generated, productName, onGenerate }: { generating: boolean; generated: boolean; productName?: string; onGenerate: () => void }) {
  return <Button onClick={onGenerate} disabled={generating || !productName} className="w-full gap-2" variant={generated ? "outline" : "default"} size="sm"><GenerateButtonContent generating={generating} generated={generated} /></Button>;
}

function GeneratedPromptCard({ prompt, selected, onSelect }: { prompt: GeneratedPrompt; selected: boolean; onSelect: () => void }) {
  return (
    <Card className={cn("cursor-pointer transition-all hover:shadow-md group", selected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "hover:border-primary/40")} onClick={onSelect}>
      <CardContent className="p-3"><div className="flex items-start justify-between gap-2 mb-1.5"><div className="flex items-center gap-2 min-w-0">{selected && <Check className="h-4 w-4 text-primary shrink-0" />}<p className={cn("text-sm font-semibold truncate", selected && "text-primary")}>{prompt.title}</p></div><Badge variant="outline" className={cn("text-[8px] px-1.5 py-0 border", getMoodColor(prompt.mood))}>{prompt.mood}</Badge></div><p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{prompt.prompt}</p>{prompt.bestFor && <p className="text-[10px] text-primary/70 flex items-center gap-1"><Lightbulb className="h-3 w-3 shrink-0" />{prompt.bestFor}</p>}</CardContent>
    </Card>
  );
}

function GeneratedPromptResults({ prompts, selectedPrompt, onSelect }: { prompts: GeneratedPrompt[]; selectedPrompt: ScenePrompt | null; onSelect: (prompt: GeneratedPrompt) => void }) {
  if (prompts.length === 0) return null;
  return <div className="space-y-2"><p className="text-[11px] text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" />{prompts.length} cenários criados pela IA — clique para usar</p><div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-1">{prompts.map((prompt, index) => <GeneratedPromptCard key={`${prompt.title}-${index}`} prompt={prompt} selected={selectedPrompt?.prompt === prompt.prompt} onSelect={() => onSelect(prompt)} />)}</div></div>;
}

function PromptEmptyState({ generated, generating, hasPrintAreas }: { generated: boolean; generating: boolean; hasPrintAreas: boolean }) {
  if (generated || generating) return null;
  return <div className="text-center py-4 text-muted-foreground"><Wand2 className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">{hasPrintAreas ? <>Selecione o <strong>local e técnica</strong> de personalização, configure o objetivo e clique em <strong>"Gerar Prompts"</strong></> : <>Configure as opções acima e clique em <strong>"Gerar Prompts"</strong> para que a IA crie cenários otimizados</>}</p></div>;
}

function CustomizationSettings({ printAreas, selectedAreaId, selectedTechId, onAreaChange, onTechChange }: { printAreas?: PrintAreaWithTechniques[]; selectedAreaId: string | null; selectedTechId: string | null; onAreaChange: (id: string) => void; onTechChange: (id: string) => void }) {
  if (!printAreas?.length) return null;
  return <PromptCustomizationPanel printAreas={printAreas} selectedAreaId={selectedAreaId} selectedTechId={selectedTechId} onAreaChange={onAreaChange} onTechChange={onTechChange} />;
}

function useCampaignSettings() {
  const [objective, setObjective] = useState("");
  const [tone, setTone] = useState("");
  const [audience, setAudience] = useState("");
  const [season, setSeason] = useState("none");
  return { objective, tone, audience, season, setters: { objective: setObjective, tone: setTone, audience: setAudience, season: setSeason } };
}

function useCustomizationState(props: PromptGeneratorProps) {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(props.initialLocationId || null);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(props.initialTechniqueId || null);
  useEffect(() => setSelectedAreaId(props.initialLocationId || null), [props.initialLocationId]);
  useEffect(() => setSelectedTechId(props.initialTechniqueId || null), [props.initialTechniqueId]);
  const selectedArea = useMemo(() => selectedAreaById(props.printAreas, selectedAreaId), [selectedAreaId, props.printAreas]);
  const techniques = useMemo(() => areaTechniques(selectedArea), [selectedArea]);
  const selectedTech = useMemo(() => selectedTechniqueById(techniques, selectedTechId), [selectedTechId, techniques]);
  const locationLabel = useMemo(() => areaLabel(selectedArea), [selectedArea]);
  const onAreaChange = (areaId: string) => {
    const nextAreaId = normalizedSelection(areaId);
    setSelectedAreaId(nextAreaId);
    setSelectedTechId(null);
    notifyAreaSelection(props.onCustomizationChange, nextAreaId, selectedAreaById(props.printAreas, nextAreaId));
  };
  const onTechChange = (techId: string) => {
    const nextTechId = normalizedSelection(techId);
    setSelectedTechId(nextTechId);
    const tech = techniques.find((item) => item.id === nextTechId);
    props.onCustomizationChange?.({ locationId: selectedAreaId, locationName: locationLabel, techniqueId: nextTechId, techniqueName: tech?.nome ?? null, maxWidth: numberValue(selectedArea?.max_width), maxHeight: numberValue(selectedArea?.max_height), unit: selectedArea?.unit || "cm" });
  };
  return { selectedAreaId, selectedTechId, selectedArea, selectedTech, locationLabel, onAreaChange, onTechChange };
}

function usePromptGeneration(props: PromptGeneratorProps, campaign: ReturnType<typeof useCampaignSettings>, customization: ReturnType<typeof useCustomizationState>) {
  const [generating, setGenerating] = useState(false);
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [generated, setGenerated] = useState(false);
  const generate = useCallback(async () => {
    if (!props.productName) { toast.error("Selecione um produto primeiro"); return; }
    setGenerating(true);
    try {
      const result = await requestGeneratedPrompts(promptRequestBody({ props, selectedTech: customization.selectedTech, selectedArea: customization.selectedArea, locationLabel: customization.locationLabel, objective: campaign.objective, tone: campaign.tone, audience: campaign.audience, season: campaign.season }));
      setPrompts(result);
      setGenerated(true);
      toast.success(`✨ ${result.length} prompts gerados pela IA!`);
    } catch (error: unknown) {
      console.error("Prompt generation error:", error);
      toast.error(errorMessage(error));
    } finally {
      setGenerating(false);
    }
  }, [props, customization.selectedTech, customization.selectedArea, customization.locationLabel, campaign.objective, campaign.tone, campaign.audience, campaign.season]);
  return { generating, prompts, generated, generate };
}

function selectGeneratedPrompt(prompt: GeneratedPrompt, onSelect: PromptGeneratorProps["onSelectPrompt"]) {
  onSelect({ id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: prompt.title, prompt: prompt.prompt, category: prompt.category });
}

// Constants imported from ./promptGeneratorConstants

export function PromptGenerator(props: PromptGeneratorProps) {
  const campaign = useCampaignSettings();
  const customization = useCustomizationState(props);
  const generation = usePromptGeneration(props, campaign, customization);
  const hasPrintAreas = Boolean(props.printAreas?.length);

  return (
    <div className="space-y-4">
      {/* ─── Customization: Location, Technique & Dimensions ──── */}
      <CustomizationSettings printAreas={props.printAreas} selectedAreaId={customization.selectedAreaId} selectedTechId={customization.selectedTechId} onAreaChange={customization.onAreaChange} onTechChange={customization.onTechChange} />
      <CampaignSettings objective={campaign.objective} tone={campaign.tone} audience={campaign.audience} season={campaign.season} setters={campaign.setters} />

      {/* Context chips */}
      <ContextChips productName={props.productName} productColor={props.productColor} clientSegment={props.clientSegment} brandColorName={props.brandColorName} />

      {/* Generate button */}
      <PromptGenerateButton generating={generation.generating} generated={generation.generated} productName={props.productName} onGenerate={generation.generate} />

      <GeneratedPromptResults prompts={generation.prompts} selectedPrompt={props.selectedPrompt} onSelect={(prompt) => selectGeneratedPrompt(prompt, props.onSelectPrompt)} />
      <PromptEmptyState generated={generation.generated} generating={generation.generating} hasPrintAreas={hasPrintAreas} />
    </div>
  );
}
