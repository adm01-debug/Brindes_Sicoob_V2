import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeExternalRpc } from "@/lib/external-rpc";
import { fetchPromobrindProductBySku } from "@/lib/external-db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Palette, 
  MapPin, 
  Maximize2, 
  Clock,
  Layers,
  Info,
  FileSpreadsheet,
  FileText,
  Download
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToPDF } from "@/utils/personalizationExport";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface ProductPersonalizationRulesProps {
  productId: string;
  productSku: string;
  productName?: string;
}

interface TechniqueInfo {
  id: string;
  name: string;
  code: string;
  description: string | null;
  estimatedDays: number | null;
  maxColors: number | null;
  isDefault: boolean;
}

interface LocationInfo {
  id: string;
  code: string;
  name: string;
  maxWidth: number | null;
  maxHeight: number | null;
  maxArea: number | null;
  areaImageUrl: string | null;
  techniques: TechniqueInfo[];
}

interface ComponentInfo {
  id: string;
  code: string;
  name: string;
  isPersonalizable: boolean;
  locations: LocationInfo[];
}

interface CustomizationOptionRecord {
  technique_id: string;
  tecnica_nome: string;
  codigo_tabela: string;
  max_cores: number | null;
}

interface CustomizationLocationRecord {
  location_code: string;
  location_name: string;
  options?: CustomizationOptionRecord[];
}

interface CustomizationOptionsResponse {
  locations?: CustomizationLocationRecord[];
}

function mapCustomizationComponents(result: CustomizationOptionsResponse): ComponentInfo[] {
  return (result.locations ?? []).map((location) => ({
    id: location.location_code,
    code: location.location_code,
    name: location.location_name,
    isPersonalizable: true,
    locations: [{
      id: location.location_code,
      code: location.location_code,
      name: location.location_name,
      maxWidth: null,
      maxHeight: null,
      maxArea: null,
      areaImageUrl: null,
      techniques: (location.options ?? []).map((option) => ({
        id: option.technique_id,
        name: option.tecnica_nome,
        code: option.codigo_tabela,
        description: null,
        estimatedDays: null,
        maxColors: option.max_cores,
        isDefault: false,
      })),
    }],
  }));
}

function TechniqueBadge({ technique }: { technique: TechniqueInfo }) {
  return (
    <TooltipProvider>
      <Tooltip><TooltipTrigger asChild><Badge variant={technique.isDefault ? "default" : "secondary"} className="cursor-help text-xs px-3 py-1"><Palette className="h-3 w-3 mr-1.5" />{technique.name}{technique.maxColors && <span className="ml-1.5 opacity-75">({technique.maxColors} {technique.maxColors === 1 ? "cor" : "cores"})</span>}{technique.isDefault && <span className="ml-1.5 text-[10px] uppercase tracking-wide opacity-75">padrão</span>}</Badge></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><div className="space-y-1"><p className="font-medium">{technique.name}</p>{technique.description && <p className="text-xs opacity-80">{technique.description}</p>}{technique.estimatedDays && <p className="text-xs flex items-center gap-1 opacity-75"><Clock className="h-3 w-3" />~{technique.estimatedDays} {technique.estimatedDays === 1 ? "dia" : "dias"}</p>}</div></TooltipContent></Tooltip>
    </TooltipProvider>
  );
}

function LocationSize({ location }: { location: LocationInfo }) {
  if (!location.maxWidth && !location.maxHeight) return null;
  const label = location.maxWidth && location.maxHeight ? `${location.maxWidth} × ${location.maxHeight} cm` : location.maxArea ? `${location.maxArea} cm²` : null;
  return <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Maximize2 className="h-3.5 w-3.5" />{label}</div>;
}

function LocationCard({ location }: { location: LocationInfo }) {
  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-info" /><span className="font-medium text-sm">{location.name}</span><span className="text-xs text-muted-foreground font-mono">({location.code})</span></div><LocationSize location={location} /></div>
      {location.areaImageUrl && <div className="relative rounded-lg overflow-hidden border border-border/50 bg-background"><img src={location.areaImageUrl} alt={`Área de impressão - ${location.name}`} className="w-full max-h-40 object-contain" loading="lazy" /><div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-background/80 backdrop-blur-sm text-xs text-muted-foreground">Área de impressão</div></div>}
      {location.techniques.length > 0 && <div className="flex flex-wrap gap-2">{location.techniques.map((technique) => <TechniqueBadge key={technique.id} technique={technique} />)}</div>}
    </div>
  );
}

function ComponentRules({ component }: { component: ComponentInfo }) {
  return (
    <AccordionItem value={component.id} className="border border-border rounded-xl mb-2 px-4 bg-card/50">
      <AccordionTrigger className="hover:no-underline py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Layers className="h-4 w-4 text-primary" /></div><div className="text-left"><span className="font-medium text-foreground">{component.name}</span><span className="text-xs text-muted-foreground ml-2">{component.locations.length} {component.locations.length === 1 ? "local" : "locais"}</span></div></div></AccordionTrigger>
      <AccordionContent className="pb-4"><div className="space-y-4 pl-11">{component.locations.map((location) => <LocationCard key={location.id} location={location} />)}</div></AccordionContent>
    </AccordionItem>
  );
}

function PersonalizationRulesContent({ components, onExportExcel, onExportPdf }: { components: ComponentInfo[]; onExportExcel: () => void; onExportPdf: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><h3 className="font-display text-lg font-semibold text-foreground">Personalização</h3><TooltipProvider><Tooltip><TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p className="text-sm max-w-xs">Técnicas e locais disponíveis para personalização deste produto</p></TooltipContent></Tooltip></TooltipProvider></div>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" />Exportar</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={onExportExcel} className="gap-2 cursor-pointer"><FileSpreadsheet className="h-4 w-4 text-success" />Exportar Excel</DropdownMenuItem><DropdownMenuItem onClick={onExportPdf} className="gap-2 cursor-pointer"><FileText className="h-4 w-4 text-destructive" />Exportar PDF</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </div>
      <Accordion type="single" collapsible className="w-full">{components.map((component) => <ComponentRules key={component.id} component={component} />)}</Accordion>
    </div>
  );
}

type RuleSourceData =
  | { source: "none"; productDbId: string | null; groupId?: never }
  | { source: "product"; productDbId: string; groupId?: never }
  | { source: "group"; productDbId: string; groupId: string };

function useProductRuleSource(productSku: string) {
  return useQuery<RuleSourceData>({
    queryKey: ["product-personalization-source", productSku],
    queryFn: async () => {
      const product = await fetchPromobrindProductBySku(productSku);
      if (!product) return { source: "none", productDbId: null };
      const productDbId = product.id;
      const { data: customComponents } = await supabase.from("product_components").select("id").eq("product_id", productDbId).eq("is_active", true).limit(1);
      if (customComponents?.length) return { source: "product", productDbId };
      const { data: groupMember } = await supabase.from("product_group_members").select("product_group_id, use_group_rules").eq("product_id", productDbId).maybeSingle();
      if (groupMember?.use_group_rules) return { source: "group", productDbId, groupId: groupMember.product_group_id };
      return { source: "none", productDbId };
    },
  });
}

async function fetchCustomizationComponents(productId: string, sourceLabel: string) {
  try {
    const result = await invokeExternalRpc<CustomizationOptionsResponse>("fn_get_product_customization_options", { p_product_id: productId });
    return mapCustomizationComponents(result ?? {});
  } catch (error) {
    logger.warn(`Error fetching ${sourceLabel} rules via v6:`, error);
    return null;
  }
}

function useProductSpecificRules(productData?: RuleSourceData) {
  return useQuery({
    queryKey: ["product-custom-rules", productData?.productDbId],
    queryFn: () => productData?.source === "product" ? fetchCustomizationComponents(productData.productDbId, "product") : null,
    enabled: productData?.source === "product",
  });
}

function useGroupRules(productData?: RuleSourceData) {
  return useQuery({
    queryKey: ["product-group-rules", productData?.groupId, productData?.productDbId],
    queryFn: () => productData?.source === "group" ? fetchCustomizationComponents(productData.productDbId, "group") : null,
    enabled: productData?.source === "group",
  });
}

function resolvedComponents(source: RuleSourceData["source"] | undefined, productComponents: ComponentInfo[] | null | undefined, groupComponents: ComponentInfo[] | null | undefined) {
  return source === "product" ? productComponents ?? [] : groupComponents ?? [];
}

function exportRules(format: "excel" | "pdf", productName: string | undefined, productSku: string, components: ComponentInfo[]) {
  try {
    const options = { productName: productName || productSku, productSku, components };
    if (format === "excel") exportToExcel(options); else exportToPDF(options);
    toast.success(`${format === "excel" ? "Excel" : "PDF"} exportado com sucesso!`);
  } catch (error) {
    console.error("Export error:", error); toast.error(`Erro ao exportar ${format === "excel" ? "Excel" : "PDF"}`);
  }
}

export function ProductPersonalizationRules({ productSku, productName }: ProductPersonalizationRulesProps) {
  const { data: productData, isLoading: loadingProduct } = useProductRuleSource(productSku);
  const { data: productComponents, isLoading: loadingProductRules } = useProductSpecificRules(productData);
  const { data: groupComponents, isLoading: loadingGroupRules } = useGroupRules(productData);

  const isLoading = [loadingProduct, loadingProductRules, loadingGroupRules].some(Boolean);
  const components = resolvedComponents(productData?.source, productComponents, groupComponents);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!components || components.length === 0) {
    return null;
  }

  const personalizableComponents = components.filter(c => c.isPersonalizable && c.locations.length > 0);
  
  if (personalizableComponents.length === 0) {
    return null;
  }

  const handleExportExcel = () => exportRules("excel", productName, productSku, personalizableComponents);
  const handleExportPDF = () => exportRules("pdf", productName, productSku, personalizableComponents);

  return <PersonalizationRulesContent components={personalizableComponents} onExportExcel={handleExportExcel} onExportPdf={handleExportPDF} />;
}
