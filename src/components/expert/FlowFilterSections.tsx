/**
 * FlowFilterSections — Section content renderers for FlowFilterPanel.
 */
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MultiChipGrid } from "./FlowFilterPrimitives";
import type { FlowFilterState, FlowFilterOptions } from "./FlowFilterPanel";

const PRICE_PRESETS = [
  { label: "Até R$10", min: "", max: "10" },
  { label: "R$10–50", min: "10", max: "50" },
  { label: "R$50–100", min: "50", max: "100" },
  { label: "R$100+", min: "100", max: "" },
];

const GENDER_OPTIONS = ["Unissex", "Masculino", "Feminino", "Infantil"];

interface SectionContentProps {
  id: string;
  filters: FlowFilterState;
  options: FlowFilterOptions;
  update: (patch: Partial<FlowFilterState>) => void;
  toggleArray: (key: keyof FlowFilterState, value: string) => void;
}

function PriceSection({ filters, update }: Pick<SectionContentProps, "filters" | "update">) {
  const handlePreset = (min: string, max: string) => {
    if (filters.priceMin === min && filters.priceMax === max) update({ priceMin: "", priceMax: "" });
    else update({ priceMin: min, priceMax: max });
  };
  const updatePrice = (key: "priceMin" | "priceMax", value: string) => {
    if (value === "" || Number(value) >= 0) update({ [key]: value });
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRICE_PRESETS.map(preset => <button key={preset.label} onClick={() => handlePreset(preset.min, preset.max)} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all duration-150", filters.priceMin === preset.min && filters.priceMax === preset.max ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/5" : "bg-muted/5 border-border/15 text-muted-foreground/45 hover:border-primary/20 hover:text-foreground")}>{preset.label}</button>)}
      </div>
      <div className="flex items-center gap-2">
        <PriceInput value={filters.priceMin} placeholder="Mín" onChange={value => updatePrice("priceMin", value)} />
        <div className="h-px w-3 bg-border/25" />
        <PriceInput value={filters.priceMax} placeholder="Máx" onChange={value => updatePrice("priceMax", value)} />
      </div>
    </div>
  );
}

function PriceInput({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (value: string) => void }) {
  return <div className="flex-1 relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/35 font-medium">R$</span><input type="number" min={0} step="0.01" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={cn("w-full h-7 pl-6 pr-2 rounded-lg text-[11px] bg-background/30 border transition-all focus:outline-none focus:ring-1 focus:ring-primary/25", value ? "border-primary/30 text-primary font-medium" : "border-border/15 text-foreground/70")} /></div>;
}

const QUICK_FILTERS = [
  { key: "onlyNew", label: "🆕 Novidades", desc: "Lançamentos recentes" },
  { key: "onlyFeatured", label: "⭐ Destaques", desc: "Produtos em destaque" },
  { key: "onlyKit", label: "📦 Kits", desc: "Kits e combos" },
  { key: "onlyBestseller", label: "🏆 Mais vendidos", desc: "Campeões de venda" },
  { key: "hasPersonalization", label: "🎨 Personalização", desc: "Aceita gravação" },
] as const;

function QuickFilters({ filters, update }: Pick<SectionContentProps, "filters" | "update">) {
  return <div className="space-y-1">{QUICK_FILTERS.map(({ key, label, desc }) => <div key={key} className="flex items-center justify-between py-1 group/quick"><div><span className="text-[11px] text-foreground/80 font-medium">{label}</span><p className="text-[9px] text-muted-foreground/30 leading-tight">{desc}</p></div><Switch checked={filters[key]} onCheckedChange={value => update({ [key]: value })} className="scale-[0.75] origin-right" /></div>)}</div>;
}

type OptionKey = keyof FlowFilterOptions;
type SelectionKey = "selectedColors" | "selectedCategories" | "selectedMaterials" | "selectedGenders" | "selectedSuppliers" | "selectedTechniques" | "selectedPublicos" | "selectedDatasComemorativas" | "selectedEndomarketing" | "selectedNichos" | "selectedTags";
interface ChipSectionConfig { optionKey?: OptionKey; selectionKey: SelectionKey; items?: string[]; placeholder?: string; maxVisible?: number }
const CHIP_SECTIONS: Record<string, ChipSectionConfig> = {
  cores: { optionKey: "colors", selectionKey: "selectedColors", placeholder: "Buscar cor…" },
  categorias: { optionKey: "categories", selectionKey: "selectedCategories", placeholder: "Buscar categoria…", maxVisible: 20 },
  materiais: { optionKey: "materials", selectionKey: "selectedMaterials", placeholder: "Buscar material…" },
  genero: { items: GENDER_OPTIONS, selectionKey: "selectedGenders" },
  fornecedores: { optionKey: "suppliers", selectionKey: "selectedSuppliers", placeholder: "Buscar fornecedor…" },
  tecnicas: { optionKey: "techniques", selectionKey: "selectedTechniques", placeholder: "Buscar técnica…" },
  publico: { optionKey: "publicoAlvo", selectionKey: "selectedPublicos", placeholder: "Buscar público…" },
  datas: { optionKey: "datasComemorativas", selectionKey: "selectedDatasComemorativas", placeholder: "Buscar data…" },
  endomarketing: { optionKey: "endomarketing", selectionKey: "selectedEndomarketing" },
  nichos: { optionKey: "nichos", selectionKey: "selectedNichos", placeholder: "Buscar nicho…" },
  tags: { optionKey: "tags", selectionKey: "selectedTags", placeholder: "Buscar tag…" },
};

function ChipSection({ config, filters, options, toggleArray }: Omit<SectionContentProps, "id" | "update"> & { config: ChipSectionConfig }) {
  const items = config.items ?? (config.optionKey ? options[config.optionKey] : []);
  return <MultiChipGrid items={items} selected={filters[config.selectionKey]} onToggle={value => toggleArray(config.selectionKey, value)} searchable={Boolean(config.placeholder)} placeholder={config.placeholder} maxVisible={config.maxVisible} />;
}

export function SectionContent({ id, filters, options, update, toggleArray }: SectionContentProps) {
  if (id === "preco") return <PriceSection filters={filters} update={update} />;
  if (id === "estoque") return <div className="space-y-1.5"><div className="flex items-center justify-between py-0.5"><span className="text-[11px] text-foreground/70">Apenas com estoque</span><Switch checked={filters.onlyInStock} onCheckedChange={value => update({ onlyInStock: value })} className="scale-[0.75] origin-right" /></div></div>;
  if (id === "rapidas") return <QuickFilters filters={filters} update={update} />;
  const config = CHIP_SECTIONS[id];
  if (!config) return null;
  return <ChipSection config={config} filters={filters} options={options} toggleArray={toggleArray} />;
}

// Re-export constants for external use
export { PRICE_PRESETS, GENDER_OPTIONS };
