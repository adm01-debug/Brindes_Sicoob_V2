/**
 * CompanySearchDropdown — Dropdown de busca de empresas com Fuse.js + server-side
 */
import { useState, useMemo, useEffect, useRef, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { Building2, Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { selectCrm, searchCrm } from "@/lib/crm-db";
import { getCompanyDisplayName, type CrmCompany } from "@/types/crm";
import { CompanyAvatar, type CompanyOption } from "./shared-types";

interface CompanySearchDropdownProps {
  companyId: string;
  selectedCompany: CompanyOption | null;
  onSelectCompany: (id: string) => void;
  onClearCompany: () => void;
}

const COMPANY_FIELDS = "id, razao_social, nome_fantasia, ramo_atividade, cnpj, logo_url";

function toCompanyOption(company: CrmCompany): CompanyOption {
  return { id: company.id, name: getCompanyDisplayName(company), razao_social: company.razao_social, nome_fantasia: company.nome_fantasia, ramo_atividade: company.ramo_atividade || null, cnpj: company.cnpj, logo_url: company.logo_url || null };
}

async function fetchCompanies(): Promise<CompanyOption[]> {
  const data = await selectCrm<CrmCompany>("companies", { select: COMPANY_FIELDS, filters: { deleted_at: null }, orderBy: { column: "razao_social", ascending: true }, limit: 500 });
  return data.map(toCompanyOption);
}

async function searchCompanies(search: string): Promise<CompanyOption[]> {
  if (search.length < 2) return [];
  const options = { select: COMPANY_FIELDS, limit: 50 };
  const [byRazao, byNomeFantasia] = await Promise.all([searchCrm<CrmCompany>("companies", "razao_social", search, options), searchCrm<CrmCompany>("companies", "nome_fantasia", search, options)]);
  const seen = new Set<string>();
  return [...byRazao, ...byNomeFantasia].reduce<CompanyOption[]>((result, company) => {
    if (!seen.has(company.id)) { seen.add(company.id); result.push(toCompanyOption(company)); }
    return result;
  }, []);
}

function mergeCompanyResults(companies: CompanyOption[] | undefined, serverResults: CompanyOption[] | undefined, fuse: Fuse<CompanyOption> | null, search: string): CompanyOption[] {
  if (!search.trim()) return companies || [];
  const localResults = fuse?.search(search).map(result => result.item) ?? [];
  const seen = new Set<string>();
  return [...(serverResults ?? []), ...localResults].reduce<CompanyOption[]>((result, company) => {
    if (!seen.has(company.id)) { seen.add(company.id); result.push(company); }
    return result;
  }, []).slice(0, 100);
}

function CompanyDetails({ company, compact = false }: { company: CompanyOption; compact?: boolean }) {
  const showRazao = Boolean(company.razao_social && company.razao_social !== company.name);
  return <div className="flex flex-col flex-1 min-w-0"><span className={cn("font-medium truncate", compact ? "text-sm" : "text-sm")}>{company.name}</span><div className="flex items-center gap-1.5">{showRazao && <span className="text-xs text-muted-foreground truncate">{company.razao_social}</span>}{company.cnpj && <>{showRazao && <span className="text-xs text-muted-foreground/50">·</span>}<span className="text-[11px] text-muted-foreground/70 font-mono truncate">{company.cnpj}</span></>}</div></div>;
}

function SelectedCompanyView({ company, onClear }: { company: CompanyOption; onClear: () => void }) {
  return <div className="flex items-center gap-3 w-full rounded-md border border-border bg-background px-3 py-2 min-h-[44px] cursor-pointer group hover:border-primary/50 transition-colors" onClick={onClear}><CompanyAvatar name={company.name} logoUrl={company.logo_url} /><CompanyDetails company={company} /><X className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" /></div>;
}

function SearchInput({ open, search, loading, onSearch, onOpen, onClose }: { open: boolean; search: string; loading: boolean; onSearch: (value: string) => void; onOpen: () => void; onClose: () => void }) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Escape') onClose(); };
  return <div className="relative z-50 isolate"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" /><Input aria-label="Buscar empresa por nome ou CNPJ" autoFocus={open} placeholder="Buscar empresa por nome, CNPJ..." value={search} onChange={event => onSearch(event.target.value)} onFocus={onOpen} className="pl-9 h-11 bg-background" onKeyDown={handleKeyDown} />{loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />}</div>;
}

function ResultsHeader({ loadingCompanies, loadingSearch, search, count }: { loadingCompanies: boolean; loadingSearch: boolean; search: string; count: number }) {
  let label = `${count} empresa${count !== 1 ? 's' : ''} disponíve${count !== 1 ? 'is' : 'l'}`;
  if (loadingCompanies) label = 'Carregando...';
  else if (search.trim().length >= 2) label = `${count} resultado${count !== 1 ? 's' : ''}`;
  return <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30"><span className="text-xs text-muted-foreground font-medium">{label}</span>{loadingSearch && search.length >= 2 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />servidor...</span>}</div>;
}

function CompanyResults({ companies, companyId, loading, onSelect }: { companies: CompanyOption[]; companyId: string; loading: boolean; onSelect: (id: string) => void }) {
  const height = Math.min(Math.max(companies.length + 1, 2) * 56, 280);
  return <div className="relative"><ScrollArea style={{ height: `${height}px` }}><button type="button" className={cn("flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors duration-150 hover:bg-primary/10 border-b border-border/30", !companyId && "bg-primary/5")} onClick={() => onSelect("")}><span className="text-sm text-muted-foreground">Sem empresa</span></button>{companies.length === 0 && !loading ? <div className="flex flex-col items-center justify-center gap-2 py-6 text-center px-4"><div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center"><Building2 className="h-5 w-5 text-muted-foreground/60" /></div><div><p className="text-sm font-medium text-muted-foreground">Nenhuma empresa encontrada</p><p className="text-xs text-muted-foreground/60 mt-0.5">Tente buscar por nome, CNPJ ou ramo de atividade</p></div></div> : <div>{companies.map((company, index) => <button key={company.id} type="button" className={cn("flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors duration-150 hover:bg-primary/10", index < companies.length - 1 && "border-b border-border/30", companyId === company.id && "bg-primary/5")} onClick={() => onSelect(company.id)}><CompanyAvatar name={company.name} logoUrl={company.logo_url} size="sm" /><CompanyDetails company={company} compact /></button>)}</div>}</ScrollArea>{companies.length > 4 && <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-popover to-transparent pointer-events-none" />}</div>;
}

function ResultsDropdown({ open, companies, companyId, loadingCompanies, loadingSearch, search, onSelect }: { open: boolean; companies: CompanyOption[]; companyId: string; loadingCompanies: boolean; loadingSearch: boolean; search: string; onSelect: (id: string) => void }) {
  if (!open) return null;
  return <motion.div initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.2, ease: "easeOut" }} className="absolute z-50 w-full mt-1 rounded-lg border border-primary/30 bg-popover shadow-xl shadow-black/25 overflow-hidden ring-1 ring-primary/10"><ResultsHeader loadingCompanies={loadingCompanies} loadingSearch={loadingSearch} search={search} count={companies.length} /><CompanyResults companies={companies} companyId={companyId} loading={loadingCompanies} onSelect={onSelect} /></motion.div>;
}

export function CompanySearchDropdown({ companyId, selectedCompany, onSelectCompany, onClearCompany }: CompanySearchDropdownProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300); return () => clearTimeout(timer); }, [searchTerm]);
  const { data: companies, isLoading: loadingCompanies } = useQuery<CompanyOption[]>({ queryKey: ["quote-companies-selector"], queryFn: fetchCompanies, staleTime: 15 * 60 * 1000 });
  const { data: serverResults, isLoading: loadingSearch } = useQuery<CompanyOption[]>({ queryKey: ["quote-companies-search", debouncedSearch], queryFn: () => searchCompanies(debouncedSearch), enabled: debouncedSearch.length >= 2, staleTime: 2 * 60 * 1000 });
  const fuse = useMemo(() => companies ? new Fuse(companies, { keys: ["name", "razao_social", "nome_fantasia", "cnpj", "ramo_atividade"], threshold: 0.4, distance: 100 }) : null, [companies]);
  const filteredCompanies = useMemo(() => mergeCompanyResults(companies, serverResults, fuse, searchTerm), [companies, serverResults, fuse, searchTerm]);
  useEffect(() => {
    const handler = (event: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const close = () => { setIsOpen(false); setSearchTerm(""); };
  const handleSelect = (id: string) => { onSelectCompany(id); close(); };
  if (selectedCompany && !isOpen) return <SelectedCompanyView company={selectedCompany} onClear={() => { onClearCompany(); setTimeout(() => setIsOpen(true), 50); }} />;
  return (
    <div ref={wrapperRef} className="relative z-40">
      <SearchInput open={isOpen} search={searchTerm} loading={loadingCompanies || loadingSearch} onSearch={setSearchTerm} onOpen={() => setIsOpen(true)} onClose={close} />
      <AnimatePresence>{isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]" onClick={close} />}</AnimatePresence>
      <AnimatePresence><ResultsDropdown open={isOpen} companies={filteredCompanies} companyId={companyId} loadingCompanies={loadingCompanies} loadingSearch={loadingSearch} search={searchTerm} onSelect={handleSelect} /></AnimatePresence>
    </div>
  );
}
