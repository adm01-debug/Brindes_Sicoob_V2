import type { ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Info, Palette, Clock, Layers, Ruler, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface Technique {
  id: string;
  name: string;
  code: string | null;
  // Novos campos opcionais (vindos do RPC fn_get_product_customization_options)
  maxColors?: number | null;
  chargesPerColor?: boolean;
  usesDimension?: boolean;
  isCurved?: boolean;
  setupCost?: number | null;
  variationLabel?: string | null;
  groupCode?: string | null;
  maxWidth?: number | null;
  maxHeight?: number | null;
  locationName?: string | null;
}

interface TechniqueTooltipProps {
  technique: Technique;
  children: ReactNode;
  className?: string;
}

// Visual examples and descriptions for each technique
type TechniqueInfoKey =
  | "bordado" | "silk" | "dtf" | "laser" | "sublimacao"
  | "hot_stamping" | "tampografia" | "uv" | "default";

const TECHNIQUE_INFO: Record<TechniqueInfoKey, {
  description: string;
  durability: string;
  colors: string;
  bestFor: string;
  visualStyle: string;
  gradient: string;
}> = {
  bordado: {
    description: "Técnica premium com fios de alta qualidade",
    durability: "Altíssima - 500+ lavagens",
    colors: "Até 15 cores",
    bestFor: "Camisas, bonés, jaquetas",
    visualStyle: "Textura 3D com linhas visíveis",
    gradient: "from-warning to-orange",
  },
  silk: {
    description: "Serigrafia tradicional para grandes quantidades",
    durability: "Alta - 200+ lavagens",
    colors: "Até 6 cores (por tela)",
    bestFor: "Camisetas, sacolas, uniformes",
    visualStyle: "Cores sólidas e vibrantes",
    gradient: "from-blue-500 to-cyan-600",
  },
  dtf: {
    description: "Transfer digital com detalhes fotográficos",
    durability: "Alta - 100+ lavagens",
    colors: "Ilimitadas (CMYK)",
    bestFor: "Fotos, gradientes, designs complexos",
    visualStyle: "Acabamento brilhante",
    gradient: "from-primary to-primary",
  },
  laser: {
    description: "Gravação permanente por remoção de material",
    durability: "Permanente",
    colors: "Monocromático",
    bestFor: "Metal, acrílico, madeira",
    visualStyle: "Elegante e discreto",
    gradient: "from-gray-500 to-slate-700",
  },
  sublimacao: {
    description: "A tinta penetra no material poliéster",
    durability: "Permanente - não descasca",
    colors: "Ilimitadas (CMYK)",
    bestFor: "Poliéster branco, canecas, mousepads",
    visualStyle: "Integrado ao tecido",
    gradient: "from-success to-teal-600",
  },
  hot_stamping: {
    description: "Aplicação de foil metálico com calor",
    durability: "Alta - efeito luxuoso",
    colors: "Metálicos (ouro, prata)",
    bestFor: "Embalagens, agendas, couro",
    visualStyle: "Brilho metálico premium",
    gradient: "from-warning/80 to-warning",
  },
  tampografia: {
    description: "Impressão em superfícies irregulares",
    durability: "Alta",
    colors: "Até 4 cores",
    bestFor: "Canetas, brindes pequenos",
    visualStyle: "Preciso em curvas",
    gradient: "from-indigo-500 to-violet-600",
  },
  uv: {
    description: "Impressão UV com secagem instantânea",
    durability: "Alta - resistente a UV",
    colors: "Ilimitadas + branco",
    bestFor: "Acrílico, vidro, metal",
    visualStyle: "Textura levemente relevo",
    gradient: "from-destructive to-destructive",
  },
  default: {
    description: "Técnica de personalização profissional",
    durability: "Variável",
    colors: "Consulte",
    bestFor: "Diversos produtos",
    visualStyle: "Acabamento profissional",
    gradient: "from-primary to-primary/80",
  },
};

function getTechniqueInfo(technique: Technique) {
  const code = (technique.code || technique.name || "").toLowerCase();
  
  for (const [key, value] of Object.entries(TECHNIQUE_INFO)) {
    if (code.includes(key)) {
      return value;
    }
  }
  
  return TECHNIQUE_INFO.default;
}

function DetailRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return <div className="flex items-start gap-2 text-xs">{icon}<div><span className="text-muted-foreground">{label}:</span><span className="ml-1 font-medium">{children}</span></div></div>;
}

function LocationDetail({ technique }: { technique: Technique }) {
  return technique.locationName ? <DetailRow icon={<Layers className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />} label="Local">{technique.locationName}</DetailRow> : null;
}

function VariationDetail({ technique }: { technique: Technique }) {
  return technique.variationLabel ? <DetailRow icon={<Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />} label="Variação">{technique.variationLabel}{technique.groupCode ? <span className="ml-1 text-muted-foreground">({technique.groupCode})</span> : null}</DetailRow> : null;
}

function SizeDetail({ technique }: { technique: Technique }) {
  return technique.maxWidth && technique.maxHeight ? <DetailRow icon={<Ruler className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />} label="Máx"><span className="tabular-nums">{technique.maxWidth}×{technique.maxHeight} cm</span></DetailRow> : null;
}

function ColorDetail({ technique }: { technique: Technique }) {
  if (technique.maxColors === null || technique.maxColors === undefined) return null;
  return <DetailRow icon={<Palette className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />} label="Máx cores">{technique.maxColors}{technique.chargesPerColor ? <span className="ml-1 text-[10px] text-muted-foreground">(cobra por cor)</span> : null}</DetailRow>;
}

function SetupDetail({ technique }: { technique: Technique }) {
  return technique.setupCost && technique.setupCost > 0 ? <DetailRow icon={<Wrench className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />} label="Setup"><span className="tabular-nums">R$ {technique.setupCost.toFixed(2)}</span></DetailRow> : null;
}

function TechniqueRealDetails({ technique }: { technique: Technique }) {
  const hasDetails = [technique.locationName, technique.maxWidth, technique.maxColors, technique.setupCost, technique.groupCode, technique.variationLabel, technique.isCurved].some(Boolean);
  if (!hasDetails) return null;
  return <div className="pt-2 border-t mt-2 space-y-1.5">
    <LocationDetail technique={technique} /><VariationDetail technique={technique} /><SizeDetail technique={technique} /><ColorDetail technique={technique} /><SetupDetail technique={technique} />
    {technique.isCurved ? <Badge variant="outline" className="text-[10px]">Suporta curvo</Badge> : null}
  </div>;
}

function BasicTechniqueDetails({ info }: { info: (typeof TECHNIQUE_INFO)[TechniqueInfoKey] }) {
  return <><div className="flex items-start gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground mt-0.5" /><div><span className="text-muted-foreground">Durabilidade:</span><span className="ml-1 font-medium">{info.durability}</span></div></div><div className="flex items-start gap-2 text-sm"><Palette className="h-4 w-4 text-muted-foreground mt-0.5" /><div><span className="text-muted-foreground">Cores:</span><span className="ml-1 font-medium">{info.colors}</span></div></div><div className="flex items-start gap-2 text-sm"><Info className="h-4 w-4 text-muted-foreground mt-0.5" /><div><span className="text-muted-foreground">Ideal para:</span><span className="ml-1 font-medium">{info.bestFor}</span></div></div></>;
}

export function TechniqueTooltip({ technique, children, className }: TechniqueTooltipProps) {
  const info = getTechniqueInfo(technique);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className={cn("cursor-help", className)}>
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-72 p-0 overflow-hidden">
        {/* Visual Header */}
        <div className={cn("p-4 bg-gradient-to-r text-primary-foreground", info.gradient)}>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-lg">{technique.name}</h4>
            <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
              {technique.code || "PRO"}
            </Badge>
          </div>
          <p className="text-sm opacity-90 mt-1">{info.description}</p>
        </div>

        {/* Details */}
        <div className="p-3 space-y-2">
          <BasicTechniqueDetails info={info} />

          <TechniqueRealDetails technique={technique} />

          {/* Visual Style Preview */}
          <div className="pt-2 border-t mt-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Aparência:</span> {info.visualStyle}
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
