/**
 * CompanySearchDropdown — Dropdown de busca de empresas com Fuse.js + server-side
 */
import { useState, useMemo, useEffect, useRef, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { Building2, Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { listQuoteDirectoryCompanies } from '@/lib/crm-db';
import { CompanyAvatar, type CompanyOption } from './shared-types';

interface CompanySearchDropdownProps {
  companyId: string;
  selectedCompany: CompanyOption | null;
  onSelectCompany: (company: CompanyOption | null) => void;
  onClearCompany: () => void;
}

async function fetchCompanies(): Promise<CompanyOption[]> {
  return listQuoteDirectoryCompanies({ limit: 100 });
}

async function searchCompanies(search: string): Promise<CompanyOption[]> {
  const term = search.trim();
  if (term.length < 2) return [];
  return listQuoteDirectoryCompanies({ term, limit: 50 });
}

function mergeCompanyResults(
  companies: CompanyOption[] | undefined,
  serverResults: CompanyOption[] | undefined,
  fuse: Fuse<CompanyOption> | null,
  search: string,
): CompanyOption[] {
  if (!search.trim()) return companies || [];
  const localResults = fuse?.search(search).map((result) => result.item) ?? [];
  const seen = new Set<string>();
  return [...(serverResults ?? []), ...localResults]
    .reduce<CompanyOption[]>((result, company) => {
      if (!seen.has(company.id)) {
        seen.add(company.id);
        result.push(company);
      }
      return result;
    }, [])
    .slice(0, 100);
}

function CompanyDetails({
  company,
  compact = false,
}: {
  company: CompanyOption;
  compact?: boolean;
}) {
  const showRazao = Boolean(company.razao_social && company.razao_social !== company.name);
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <span className={cn('truncate font-medium', compact ? 'text-xs' : 'text-sm')}>
        {company.name}
      </span>
      <div className="flex items-center gap-1.5">
        {showRazao && (
          <span className="truncate text-xs text-muted-foreground">{company.razao_social}</span>
        )}
        {company.cnpj && (
          <>
            {showRazao && <span className="text-xs text-muted-foreground/50">·</span>}
            <span className="truncate font-mono text-[11px] text-muted-foreground/70">
              {company.cnpj}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function SelectedCompanyView({
  company,
  onClear,
}: {
  company: CompanyOption;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Alterar empresa selecionada: ${company.name}`}
      className="group flex min-h-[44px] w-full items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClear}
    >
      <CompanyAvatar name={company.name} logoUrl={company.logo_url} />
      <CompanyDetails company={company} />
      <X className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function SearchInput({
  open,
  search,
  loading,
  onSearch,
  onOpen,
  onClose,
}: {
  open: boolean;
  search: string;
  loading: boolean;
  onSearch: (value: string) => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') onClose();
  };
  return (
    <div className="relative isolate z-50">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label="Buscar empresa por nome ou CNPJ"
        autoFocus={open}
        placeholder="Buscar empresa por nome, CNPJ..."
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        onFocus={onOpen}
        className="h-11 bg-background pl-9"
        onKeyDown={handleKeyDown}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

function ResultsHeader({
  loadingCompanies,
  loadingSearch,
  search,
  count,
}: {
  loadingCompanies: boolean;
  loadingSearch: boolean;
  search: string;
  count: number;
}) {
  let label = `${count} empresa${count !== 1 ? 's' : ''} disponíve${count !== 1 ? 'is' : 'l'}`;
  if (loadingCompanies) label = 'Carregando...';
  else if (search.trim().length >= 2) label = `${count} resultado${count !== 1 ? 's' : ''}`;
  return (
    <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {loadingSearch && search.length >= 2 && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          servidor...
        </span>
      )}
    </div>
  );
}

function CompanyResults({
  companies,
  companyId,
  loading,
  hasError,
  onRetry,
  onSelect,
}: {
  companies: CompanyOption[];
  companyId: string;
  loading: boolean;
  hasError: boolean;
  onRetry: () => void;
  onSelect: (company: CompanyOption | null) => void;
}) {
  const height = Math.min(Math.max(companies.length + 1, 2) * 56, 280);
  return (
    <div className="relative">
      <ScrollArea style={{ height: `${height}px` }}>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 border-b border-border/30 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-primary/10',
            !companyId && 'bg-primary/5',
          )}
          onClick={() => onSelect(null)}
        >
          <span className="text-sm text-muted-foreground">Sem empresa</span>
        </button>
        {hasError ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center">
            <p className="text-sm font-medium text-destructive">Não foi possível carregar empresas</p>
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              onClick={onRetry}
            >
              Tentar novamente
            </button>
          </div>
        ) : companies.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
              <Building2 className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma empresa encontrada
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                Tente buscar por nome ou CNPJ
              </p>
            </div>
          </div>
        ) : (
          <div>
            {companies.map((company, index) => (
              <button
                key={company.id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-primary/10',
                  index < companies.length - 1 && 'border-b border-border/30',
                  companyId === company.id && 'bg-primary/5',
                )}
                onClick={() => onSelect(company)}
              >
                <CompanyAvatar name={company.name} logoUrl={company.logo_url} size="sm" />
                <CompanyDetails company={company} compact />
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
      {companies.length > 4 && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-popover to-transparent" />
      )}
    </div>
  );
}

function ResultsDropdown({
  open,
  companies,
  companyId,
  loadingCompanies,
  loadingSearch,
  hasError,
  hasRecoverableError,
  search,
  onRetry,
  onSelect,
}: {
  open: boolean;
  companies: CompanyOption[];
  companyId: string;
  loadingCompanies: boolean;
  loadingSearch: boolean;
  hasError: boolean;
  hasRecoverableError: boolean;
  search: string;
  onRetry: () => void;
  onSelect: (company: CompanyOption | null) => void;
}) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-primary/30 bg-popover shadow-xl shadow-black/25 ring-1 ring-primary/10"
    >
      <ResultsHeader
        loadingCompanies={loadingCompanies}
        loadingSearch={loadingSearch}
        search={search}
        count={companies.length}
      />
      {hasRecoverableError && !hasError && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          <span>Resultados locais exibidos; a atualização falhou.</span>
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={onRetry}
          >
            Tentar novamente
          </button>
        </div>
      )}
      <CompanyResults
        companies={companies}
        companyId={companyId}
        loading={loadingCompanies}
        hasError={hasError}
        onRetry={onRetry}
        onSelect={onSelect}
      />
    </motion.div>
  );
}

export function CompanySearchDropdown({
  companyId,
  selectedCompany,
  onSelectCompany,
  onClearCompany,
}: CompanySearchDropdownProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const {
    data: companies,
    isLoading: loadingCompanies,
    isError: companiesError,
    refetch: refetchCompanies,
  } = useQuery<CompanyOption[]>({
    queryKey: ['quote-companies-selector'],
    queryFn: fetchCompanies,
    staleTime: 15 * 60 * 1000,
  });
  const {
    data: serverResults,
    isLoading: loadingSearch,
    isError: searchError,
    refetch: refetchSearch,
  } = useQuery<CompanyOption[]>({
    queryKey: ['quote-companies-search', debouncedSearch],
    queryFn: () => searchCompanies(debouncedSearch),
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 2 * 60 * 1000,
  });
  const fuse = useMemo(
    () =>
      companies
        ? new Fuse(companies, {
            keys: ['name', 'razao_social', 'nome_fantasia', 'cnpj', 'ramo_atividade'],
            threshold: 0.4,
            distance: 100,
          })
        : null,
    [companies],
  );
  const filteredCompanies = useMemo(
    () => mergeCompanyResults(companies, serverResults, fuse, searchTerm),
    [companies, serverResults, fuse, searchTerm],
  );
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node))
        setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const close = () => {
    setIsOpen(false);
    setSearchTerm('');
  };
  const handleSelect = (company: CompanyOption | null) => {
    onSelectCompany(company);
    close();
  };
  const hasVisibleCompanies = filteredCompanies.length > 0;
  const fatalError = (companiesError || searchError) && !hasVisibleCompanies;
  const recoverableError = (companiesError || searchError) && hasVisibleCompanies;
  const retry = () => {
    void refetchCompanies();
    if (debouncedSearch.trim().length >= 2) void refetchSearch();
  };
  if (selectedCompany && !isOpen)
    return (
      <SelectedCompanyView
        company={selectedCompany}
        onClear={() => {
          onClearCompany();
          setTimeout(() => setIsOpen(true), 50);
        }}
      />
    );
  return (
    <div ref={wrapperRef} className="relative z-40">
      <SearchInput
        open={isOpen}
        search={searchTerm}
        loading={loadingCompanies || loadingSearch}
        onSearch={setSearchTerm}
        onOpen={() => setIsOpen(true)}
        onClose={close}
      />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]"
            onClick={close}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        <ResultsDropdown
          open={isOpen}
          companies={filteredCompanies}
          companyId={companyId}
          loadingCompanies={loadingCompanies}
          loadingSearch={loadingSearch}
          hasError={fatalError}
          hasRecoverableError={recoverableError}
          search={searchTerm}
          onRetry={retry}
          onSelect={handleSelect}
        />
      </AnimatePresence>
    </div>
  );
}
