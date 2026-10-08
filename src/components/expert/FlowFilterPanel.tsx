import { type ElementType, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, DollarSign, Layers, Volume2, Tag, SlidersHorizontal, RotateCcw,
  Palette, Package, Sparkles, Users, Calendar, Briefcase,
  Building2, Paintbrush, Truck, Zap, Target, TrendingUp, Filter, Gem,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GroupSeparator, SectionRow, CollapsibleContent } from "./FlowFilterPrimitives";
import { SectionContent, GENDER_OPTIONS } from "./FlowFilterSections";

// ─── Types (re-exported for consumers) ───────────────────
export interface FlowFilterState {
  priceMin: string; priceMax: string;
  selectedCategories: string[]; selectedMaterials: string[];
  selectedColors: string[]; selectedGenders: string[];
  selectedSuppliers: string[]; selectedTechniques: string[];
  selectedPublicos: string[]; selectedDatasComemorativas: string[];
  selectedEndomarketing: string[]; selectedNichos: string[];
  selectedTags: string[];
  onlyInStock: boolean; onlyNew: boolean; onlyKit: boolean;
  onlyBestseller: boolean; onlyFeatured: boolean; hasPersonalization: boolean;
}

export const defaultFlowFilters: FlowFilterState = {
  priceMin: "", priceMax: "",
  selectedCategories: [], selectedMaterials: [], selectedColors: [],
  selectedGenders: [], selectedSuppliers: [], selectedTechniques: [],
  selectedPublicos: [], selectedDatasComemorativas: [], selectedEndomarketing: [],
  selectedNichos: [], selectedTags: [],
  onlyInStock: false, onlyNew: false, onlyKit: false,
  onlyBestseller: false, onlyFeatured: false, hasPersonalization: false,
};

export function countActiveFilters(f: FlowFilterState): number {
  let count = 0;
  if (f.priceMin || f.priceMax) count++;
  count += f.selectedCategories.length + f.selectedMaterials.length + f.selectedColors.length;
  count += f.selectedGenders.length + f.selectedSuppliers.length + f.selectedTechniques.length;
  count += f.selectedPublicos.length + f.selectedDatasComemorativas.length;
  count += f.selectedEndomarketing.length + f.selectedNichos.length + f.selectedTags.length;
  if (f.onlyInStock) count++; if (f.onlyNew) count++; if (f.onlyKit) count++;
  if (f.onlyBestseller) count++; if (f.onlyFeatured) count++; if (f.hasPersonalization) count++;
  return count;
}

export function getActiveFilterLabels(f: FlowFilterState): { label: string; key: string; value?: string }[] {
  const labels: { label: string; key: string; value?: string }[] = [];
  if (f.priceMin || f.priceMax) {
    const l = f.priceMin && f.priceMax ? `R$${f.priceMin}–${f.priceMax}` : f.priceMin ? `R$${f.priceMin}+` : `Até R$${f.priceMax}`;
    labels.push({ label: l, key: "price" });
  }
  const arrayKeys: [keyof FlowFilterState, string][] = [
    ["selectedCategories","selectedCategories"],["selectedColors","selectedColors"],["selectedMaterials","selectedMaterials"],
    ["selectedGenders","selectedGenders"],["selectedSuppliers","selectedSuppliers"],["selectedTechniques","selectedTechniques"],
    ["selectedPublicos","selectedPublicos"],["selectedDatasComemorativas","selectedDatasComemorativas"],
    ["selectedEndomarketing","selectedEndomarketing"],["selectedNichos","selectedNichos"],["selectedTags","selectedTags"],
  ];
  arrayKeys.forEach(([k, key]) => (f[k] as string[]).forEach(v => labels.push({ label: v, key, value: v })));
  const booleanLabels: Array<[keyof FlowFilterState, string]> = [["onlyInStock", "Em estoque"], ["onlyNew", "Novidades"], ["onlyKit", "Kits"], ["onlyBestseller", "+ Vendidos"], ["onlyFeatured", "Destaques"], ["hasPersonalization", "Personalização"]];
  booleanLabels.forEach(([key, label]) => { if (f[key]) labels.push({ label, key }); });
  return labels;
}

export interface FlowFilterOptions {
  categories: string[]; materials: string[]; colors: string[];
  suppliers: string[]; techniques: string[]; publicoAlvo: string[];
  datasComemorativas: string[]; endomarketing: string[];
  nichos: string[]; tags: string[];
}

// ─── Section definitions ────────────────────────────────
const SECTION_GROUPS: { label: string; icon: ElementType; sections: { id: string; label: string; icon: ElementType }[] }[] = [
  { label: "PRODUTO", icon: Package, sections: [
    { id: "cores", label: "Cores", icon: Palette }, { id: "categorias", label: "Categorias", icon: Layers },
    { id: "materiais", label: "Materiais", icon: Gem }, { id: "genero", label: "Gênero", icon: Users },
    { id: "preco", label: "Faixa de Preço", icon: DollarSign }, { id: "estoque", label: "Estoque & Status", icon: Package },
  ]},
  { label: "COMERCIAL", icon: TrendingUp, sections: [
    { id: "fornecedores", label: "Fornecedores", icon: Truck }, { id: "tecnicas", label: "Técnicas de Gravação", icon: Paintbrush },
  ]},
  { label: "MARKETING", icon: Target, sections: [
    { id: "publico", label: "Público-Alvo", icon: Users }, { id: "datas", label: "Datas Comemorativas", icon: Calendar },
    { id: "endomarketing", label: "Endomarketing", icon: Briefcase }, { id: "nichos", label: "Nichos/Segmentos", icon: Building2 },
  ]},
  { label: "ATALHOS", icon: Zap, sections: [
    { id: "tags", label: "Tags", icon: Tag }, { id: "rapidas", label: "Opções Rápidas", icon: Sparkles },
  ]},
];

const PRICE_PRESETS_COUNT = 4;

// ─── Props ──────────────────────────────────────────────
interface FlowFilterPanelProps {
  isOpen: boolean; onClose: () => void;
  filters: FlowFilterState; onFiltersChange: (f: FlowFilterState) => void;
  options: FlowFilterOptions;
  autoPlayTts: boolean; onAutoPlayTtsChange: (v: boolean) => void;
  activeFiltersCount: number; onReset: () => void;
}

function shouldShowSection(id: string, search: string, options: FlowFilterOptions) {
  const query = search.toLowerCase();
  const matches = !query || id.includes(query);
  const optionMap: Record<string, string[]> = { cores: options.colors, categorias: options.categories, materiais: options.materials, fornecedores: options.suppliers, tecnicas: options.techniques, publico: options.publicoAlvo, datas: options.datasComemorativas, endomarketing: options.endomarketing, nichos: options.nichos, tags: options.tags };
  const sectionOptions = optionMap[id];
  return sectionOptions ? sectionOptions.length > 0 && matches : matches;
}

function sectionCount(id: string, filters: FlowFilterState) {
  const map: Record<string, number> = {
    preco: filters.priceMin || filters.priceMax ? 1 : 0, cores: filters.selectedColors.length,
    categorias: filters.selectedCategories.length, materiais: filters.selectedMaterials.length,
    genero: filters.selectedGenders.length, fornecedores: filters.selectedSuppliers.length,
    tecnicas: filters.selectedTechniques.length, publico: filters.selectedPublicos.length,
    datas: filters.selectedDatasComemorativas.length, endomarketing: filters.selectedEndomarketing.length,
    nichos: filters.selectedNichos.length, tags: filters.selectedTags.length,
    estoque: Number(filters.onlyInStock), rapidas: [filters.onlyNew, filters.onlyKit, filters.onlyBestseller, filters.onlyFeatured, filters.hasPersonalization].filter(Boolean).length,
  };
  return map[id] ?? 0;
}

function totalOptions(id: string, options: FlowFilterOptions) {
  const map: Record<string, number> = { cores: options.colors.length, categorias: options.categories.length, materiais: options.materials.length, genero: GENDER_OPTIONS.length, fornecedores: options.suppliers.length, tecnicas: options.techniques.length, publico: options.publicoAlvo.length, datas: options.datasComemorativas.length, endomarketing: options.endomarketing.length, nichos: options.nichos.length, tags: options.tags.length, estoque: 1, rapidas: 5, preco: PRICE_PRESETS_COUNT };
  return map[id] ?? 0;
}

interface DrawerProps extends FlowFilterPanelProps {
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
  openSections: Set<string>;
  toggle: (id: string) => void;
  update: (patch: Partial<FlowFilterState>) => void;
  toggleArray: (key: keyof FlowFilterState, value: string) => void;
}

function FilterDrawer(props: DrawerProps) {
  return <motion.div initial={{ x: "-100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "-100%", opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} className="absolute left-0 top-0 bottom-0 z-30 w-[310px] max-w-[90%] bg-card/98 backdrop-blur-xl border-r border-border/20 rounded-l-2xl flex flex-col shadow-2xl shadow-black/20">
    <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-border/10"><div className="flex items-center gap-2.5"><div className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm shadow-primary/5"><SlidersHorizontal className="h-3.5 w-3.5 text-primary" /></div><div><span className="text-sm font-semibold tracking-tight">Filtros</span>{props.activeFiltersCount > 0 ? <p className="text-[9px] text-primary font-bold leading-tight">{props.activeFiltersCount} ativo{props.activeFiltersCount > 1 ? "s" : ""}</p> : null}</div></div><div className="flex items-center gap-1">{props.activeFiltersCount > 0 ? <Button variant="ghost" size="sm" onClick={props.onReset} className="h-6 px-2 text-[9px] text-muted-foreground hover:text-destructive gap-1 rounded-lg"><RotateCcw className="h-2.5 w-2.5" />Limpar</Button> : null}<Button variant="ghost" size="sm" onClick={props.onClose} className="h-6 w-6 p-0 rounded-lg"><X className="h-3.5 w-3.5" /></Button></div></div>
    <div className="px-3 pt-2 pb-1"><div className="relative"><Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" /><input value={props.globalSearch} onChange={(event) => props.setGlobalSearch(event.target.value)} placeholder="Buscar seção de filtro…" className="w-full h-7 pl-7 pr-2 rounded-lg border border-border/15 bg-muted/10 text-[11px] placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" /></div></div>
    <ScrollArea className="flex-1 px-3"><div className="pb-3">{SECTION_GROUPS.map((group) => {
      const visible = group.sections.filter((section) => shouldShowSection(section.id, props.globalSearch, props.options));
      if (!visible.length) return null;
      return <div key={group.label}><GroupSeparator label={group.label} icon={group.icon} />{visible.map((section) => <div key={section.id}><SectionRow icon={section.icon} label={section.label} isOpen={props.openSections.has(section.id)} onToggle={() => props.toggle(section.id)} count={sectionCount(section.id, props.filters)} totalOptions={totalOptions(section.id, props.options)} /><CollapsibleContent isOpen={props.openSections.has(section.id)}><SectionContent id={section.id} filters={props.filters} options={props.options} update={props.update} toggleArray={props.toggleArray} /></CollapsibleContent></div>)}</div>;
    })}<div className="mt-4 pt-3 border-t border-border/10"><div className="flex items-center justify-between px-1 py-1"><div className="flex items-center gap-2.5"><div className="h-6 w-6 rounded-lg bg-muted/20 flex items-center justify-center"><Volume2 className="h-3 w-3 text-muted-foreground/40" /></div><div><span className="text-[11px] text-foreground/70 font-medium">Auto-play por voz</span><p className="text-[9px] text-muted-foreground/30 leading-tight">Reproduzir respostas automaticamente</p></div></div><Switch checked={props.autoPlayTts} onCheckedChange={props.onAutoPlayTtsChange} className="scale-[0.75] origin-right" /></div></div></div></ScrollArea>
    <div className="px-3 py-2.5 border-t border-border/10"><Button size="sm" onClick={props.onClose} className="w-full h-9 rounded-xl text-[11px] font-semibold gap-1.5 shadow-sm"><Sparkles className="h-3 w-3" />Aplicar filtros{props.activeFiltersCount > 0 ? <span className="ml-1 h-4.5 min-w-5 px-1.5 rounded-full bg-primary-foreground/20 text-[10px] font-bold flex items-center justify-center">{props.activeFiltersCount}</span> : null}</Button></div>
  </motion.div>;
}

// ─── Main Component ─────────────────────────────────────
export function FlowFilterPanel({ isOpen, onClose, filters, onFiltersChange, options, autoPlayTts, onAutoPlayTtsChange, activeFiltersCount, onReset }: FlowFilterPanelProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["preco"]));
  const [globalSearch, setGlobalSearch] = useState("");

  const toggle = (id: string) => setOpenSections(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const update = (patch: Partial<FlowFilterState>) => onFiltersChange({ ...filters, ...patch });
  const toggleArray = (key: keyof FlowFilterState, value: string) => { const arr = filters[key] as string[]; update({ [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }); };

  return (
    <AnimatePresence>
      {isOpen ? <><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 bg-black/50 backdrop-blur-[3px] z-20 rounded-2xl" onClick={onClose} /><FilterDrawer isOpen={isOpen} onClose={onClose} filters={filters} onFiltersChange={onFiltersChange} options={options} autoPlayTts={autoPlayTts} onAutoPlayTtsChange={onAutoPlayTtsChange} activeFiltersCount={activeFiltersCount} onReset={onReset} globalSearch={globalSearch} setGlobalSearch={setGlobalSearch} openSections={openSections} toggle={toggle} update={update} toggleArray={toggleArray} /></> : null}
    </AnimatePresence>
  );
}
