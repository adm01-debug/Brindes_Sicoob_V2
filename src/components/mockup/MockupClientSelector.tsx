/**
 * MockupClientSelector — Campo unificado de busca + seleção de empresa
 * Um único input que filtra e mostra resultados inline (sem botão separado)
 */

import { useState, useRef, useEffect, type RefObject } from "react";
import { useClientFuzzySearch } from "@/hooks/useGenericFuzzySearch";
import { X, Building2, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCrmCompanySelector, type CrmSelectorResult } from "@/hooks/useCrmCompanies";
import { motion, AnimatePresence } from "framer-motion";
import type { MockupClient } from "./MockupConfigPanel";

interface MockupClientSelectorProps {
  selectedClient: MockupClient | null;
  onClientSelect: (client: MockupClient | null) => void;
}

function CompanyAvatar({ name, logoUrl, size = "md" }: { name: string; logoUrl?: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs";
  
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn(dim, "rounded object-contain bg-background border border-border flex-shrink-0")} loading="lazy" />
    );
  }
  
  return (
    <div className={cn(dim, "rounded-full flex items-center justify-center font-bold text-primary-foreground bg-primary flex-shrink-0")}>
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
}

function useDismissOnOutside(ref: RefObject<HTMLDivElement>, dismiss: () => void) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) dismiss();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dismiss, ref]);
}

function SelectedClientChip({ client, onClear }: { client: MockupClient; onClear: () => void }) {
  return <div className="flex items-center gap-3 w-full rounded-md border border-border bg-background px-3 py-2 min-h-[44px] cursor-pointer group hover:border-primary/50 transition-colors" onClick={onClear}><CompanyAvatar name={client.name} logoUrl={client.logo_url} /><div className="flex flex-col flex-1 min-w-0"><span className="font-medium text-sm truncate">{client.name}</span><div className="flex items-center gap-2">{client.ramo && <span className="text-xs text-muted-foreground truncate">{client.ramo}</span>}{client.cnpj && <>{client.ramo && <span className="text-xs text-muted-foreground">·</span>}<span className="text-xs text-muted-foreground font-mono">{client.cnpj}</span></>}</div></div><X className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" /></div>;
}

function toMockupClient(company: CrmSelectorResult): MockupClient {
  return { id: company.id, name: company.name, razao_social: company.razao_social ?? undefined, nome_fantasia: company.nome_fantasia ?? undefined, ramo: company.ramo ?? undefined, logo_url: company.logo_url ?? undefined, cnpj: company.cnpj ?? undefined };
}

function CompanyResult({ company, isLast, onSelect }: { company: CrmSelectorResult; isLast: boolean; onSelect: (client: MockupClient) => void }) {
  const hasLegalName = company.razao_social && company.razao_social !== company.name;
  return <button type="button" className={cn("flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors duration-150", "hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none", !isLast && "border-b border-border/30")} onClick={() => onSelect(toMockupClient(company))}><CompanyAvatar name={company.name} logoUrl={company.logo_url} size="sm" /><div className="flex flex-col flex-1 min-w-0"><span className="text-sm font-medium truncate">{company.name}</span><div className="flex items-center gap-1.5">{hasLegalName && <span className="text-xs text-muted-foreground truncate">{company.razao_social}</span>}{company.cnpj && <>{hasLegalName && <span className="text-xs text-muted-foreground/50">·</span>}<span className="text-[11px] text-muted-foreground/70 font-mono truncate">{company.cnpj}</span></>}</div></div></button>;
}

function ResultsList({ companies, height, onSelect }: { companies: CrmSelectorResult[]; height: number; onSelect: (client: MockupClient) => void }) {
  if (companies.length === 0) return <div className="flex flex-col items-center justify-center gap-2 py-6 text-center px-4"><div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center"><Building2 className="h-5 w-5 text-muted-foreground/60" /></div><div><p className="text-sm font-medium text-muted-foreground">Nenhuma empresa encontrada</p><p className="text-xs text-muted-foreground/60 mt-0.5">Tente buscar por nome, CNPJ ou ramo de atividade</p></div></div>;
  return <ScrollArea style={{ height: `${height}px` }}><div className="py-1">{companies.map((company, index) => <CompanyResult key={company.id} company={company} isLast={index === companies.length - 1} onSelect={onSelect} />)}</div></ScrollArea>;
}

interface DropdownProps {
  visible: boolean;
  companies: CrmSelectorResult[];
  isLoading: boolean;
  query: string;
  onSelect: (client: MockupClient) => void;
}

function CompanyDropdown(props: DropdownProps) {
  if (!props.visible) return null;
  const height = props.companies.length === 0 ? 80 : Math.max(Math.min(props.companies.length, 5) * 56, 80);
  const noun = props.query.trim().length >= 2 ? "resultado" : "empresa";
  const suffix = props.companies.length !== 1 ? "s" : "";
  const availability = noun === "empresa" ? ` disponíve${props.companies.length !== 1 ? "is" : "l"}` : "";
  const label = props.isLoading ? "Carregando..." : `${props.companies.length} ${noun}${suffix}${availability}`;
  return <motion.div initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.2, ease: "easeOut" }} className="absolute z-50 w-full mt-1 rounded-lg border border-primary/30 bg-popover shadow-xl shadow-black/25 overflow-hidden ring-1 ring-primary/10"><div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30"><span className="text-xs text-muted-foreground font-medium">{label}</span></div><div className="relative"><ResultsList companies={props.companies} height={height} onSelect={props.onSelect} />{props.companies.length > 5 && <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-popover to-transparent pointer-events-none" />}</div></motion.div>;
}

function SearchField({ inputRef, query, setQuery, onFocus, isLoading }: { inputRef: RefObject<HTMLInputElement>; query: string; setQuery: (query: string) => void; onFocus: () => void; isLoading: boolean }) {
  return <div className="relative z-50 isolate"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input ref={inputRef} placeholder="Buscar empresa..." value={query} onChange={(event) => setQuery(event.target.value)} onFocus={onFocus} className="pl-9 h-11 bg-background" />{isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />}</div>;
}

function DropdownBackdrop({ visible, dismiss }: { visible: boolean; dismiss: () => void }) {
  return <AnimatePresence>{visible && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]" onClick={dismiss} />}</AnimatePresence>;
}

export function MockupClientSelector({ selectedClient, onClientSelect }: MockupClientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: companies = [], isLoading } = useCrmCompanySelector();
  const { results: filteredCompanies } = useClientFuzzySearch(companies, searchQuery);
  const dismiss = () => setIsFocused(false);
  useDismissOnOutside(containerRef, dismiss);
  const showDropdown = isFocused && !selectedClient;
  if (selectedClient) {
    const clear = () => { onClientSelect(null); setTimeout(() => inputRef.current?.focus(), 50); };
    return <SelectedClientChip client={selectedClient} onClear={clear} />;
  }
  const select = (client: MockupClient) => { onClientSelect(client); setSearchQuery(""); dismiss(); };

  return (
    <div ref={containerRef} className="relative w-full z-40">
      <SearchField inputRef={inputRef} query={searchQuery} setQuery={setSearchQuery} onFocus={() => setIsFocused(true)} isLoading={isLoading} />
      <DropdownBackdrop visible={showDropdown} dismiss={dismiss} />
      <AnimatePresence>
        <CompanyDropdown visible={showDropdown} companies={filteredCompanies} isLoading={isLoading} query={searchQuery} onSelect={select} />
      </AnimatePresence>
    </div>
  );
}
