/**
 * FlowFilterPrimitives — Shared UI components for FlowFilterPanel.
 */
import { type ElementType, type ReactNode, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function GroupSeparator({ label, icon }: { label: string; icon: ElementType }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-2 px-1 pt-5 pb-1.5">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold text-muted-foreground/35 select-none">
        <Icon className="h-2.5 w-2.5" />{label}
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
    </div>
  );
}

function getSectionIconClass(isOpen: boolean, hasCount: boolean): string {
  if (isOpen) return "bg-primary/15 text-primary shadow-sm shadow-primary/10";
  if (hasCount) return "bg-primary/10 text-primary";
  return "bg-muted/20 text-muted-foreground/40 group-hover/sec:bg-muted/40";
}

export function SectionRow({ icon, label, isOpen, onToggle, count, totalOptions }: {
  icon: ElementType; label: string; isOpen: boolean; onToggle: () => void;
  count?: number; totalOptions?: number;
}) {
  const Icon = icon;
  const hasCount = Number(count) > 0;
  const hasOptions = Number(totalOptions) > 0;
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between px-1 py-2 group/sec">
      <div className="flex items-center gap-2.5">
        <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center transition-all duration-200", getSectionIconClass(isOpen, hasCount))}><Icon className="h-3 w-3" /></div>
        <span className={cn("text-xs font-medium transition-colors", hasCount ? "text-foreground" : "text-foreground/70 group-hover/sec:text-foreground")}>{label}</span>
        {hasCount && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 rounded-md bg-primary/10 text-primary border-primary/20 font-bold">{count}</Badge>}
        {hasOptions && !hasCount && <span className="text-[9px] text-muted-foreground/30 font-medium">{totalOptions}</span>}
      </div>
      <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.15 }}>
        <ChevronDown className={cn("h-3 w-3 transition-colors", isOpen ? "text-primary/50" : "text-muted-foreground/25")} />
      </motion.div>
    </button>
  );
}

export function CollapsibleContent({ isOpen, children }: { isOpen: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
          <div className="pb-2 pl-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function filterItems(items: string[], search: string): string[] {
  if (!search) return items;
  const query = search.toLowerCase();
  return items.filter(item => item.toLowerCase().includes(query));
}

function ChipSearch({ search, placeholder, onChange }: { search: string; placeholder: string; onChange: (value: string) => void }) {
  return <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" /><input value={search} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full h-6 pl-7 pr-2 rounded-md text-[10px] bg-background/30 border border-border/15 placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all" /></div>;
}

function ChipButtons({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-border/20 pr-0.5">{items.map((item) => { const isSelected = selected.includes(item); return <button key={item} onClick={() => onToggle(item)} className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all duration-150 flex items-center gap-1", isSelected ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/5" : "bg-muted/5 border-border/15 text-muted-foreground/55 hover:border-primary/20 hover:text-foreground hover:bg-accent/20")}>{isSelected && <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />}<span className="truncate max-w-[120px]">{item}</span></button>; })}</div>;
}

function ChipGridContent({ items, filtered, selected, search, searchable, maxVisible, showAll, placeholder, onSearch, onShowAll, onToggle }: { items: string[]; filtered: string[]; selected: string[]; search: string; searchable: boolean; maxVisible: number; showAll: boolean; placeholder: string; onSearch: (value: string) => void; onShowAll: () => void; onToggle: (value: string) => void }) {
  const visible = showAll ? filtered : filtered.slice(0, maxVisible);
  const remaining = filtered.length - maxVisible;
  return <div className="space-y-1.5">{searchable && items.length > 8 && <ChipSearch search={search} placeholder={placeholder} onChange={onSearch} />}<ChipButtons items={visible} selected={selected} onToggle={onToggle} />{remaining > 0 && !showAll && <button onClick={onShowAll} className="text-[9px] text-primary/60 hover:text-primary font-medium px-1 transition-colors">+{remaining} mais…</button>}{search && filtered.length === 0 && <p className="text-[9px] text-muted-foreground/30 px-1 italic">Nenhum resultado</p>}</div>;
}

export function MultiChipGrid({ items, selected, onToggle, maxVisible = 24, searchable = false, placeholder = "Buscar…" }: {
  items: string[]; selected: string[]; onToggle: (v: string) => void;
  maxVisible?: number; searchable?: boolean; placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => filterItems(items, search), [items, search]);

  if (items.length === 0) return <p className="text-[10px] text-muted-foreground/30 px-1 py-1 italic">Nenhuma opção disponível</p>;
  return <ChipGridContent items={items} filtered={filtered} selected={selected} search={search} searchable={searchable} maxVisible={maxVisible} showAll={showAll} placeholder={placeholder} onSearch={setSearch} onShowAll={() => setShowAll(true)} onToggle={onToggle} />;
}
