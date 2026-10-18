/**
 * CartCompanyPickerDialog - Modal de seleção de empresa com Recentes/Favoritas/Buscar.
 * Substitui o picker inline que empurrava conteúdo. Usa localStorage para persistência leve.
 */
import { type MouseEvent, useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { Building2, Search, Loader2, Star, Clock, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSellerCartContext, type CreateCartInput } from "@/contexts/SellerCartContext";
import { useAuth } from "@/contexts/AuthContext";
import { buildCartCompanyAccessScope, fetchCartCompanyOptions, type CartCompanyOption as CompanyItem } from "./cart-company-options";
import { CartCompanyDirectoryResults } from "./CartCompanyDirectoryResults";

const RECENT_KEY = "cart-companies-recent";
const FAV_KEY = "cart-companies-favorites";
const MAX_RECENT = 5;

function readList(key: string): CompanyItem[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function writeList(key: string, list: CompanyItem[]) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* ignore */ }
}

interface CartCompanyPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CartCompanyPickerDialog({ open, onOpenChange, onCreated }: CartCompanyPickerDialogProps) {
  const [tab, setTab] = useState<"recent" | "favorites" | "search">("recent");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [recents, setRecents] = useState<CompanyItem[]>([]);
  const [favorites, setFavorites] = useState<CompanyItem[]>([]);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { createCart, canCreateCart } = useSellerCartContext();
  const { user, roles } = useAuth();
  const accessScope = buildCartCompanyAccessScope(user?.id, roles);
  const recentStorageKey = `${RECENT_KEY}:${accessScope}`;
  const favoriteStorageKey = `${FAV_KEY}:${accessScope}`;
  const hasLoadedCurrentScope = loadedScope === accessScope;
  const scopedRecents = useMemo(() => hasLoadedCurrentScope ? recents : [], [hasLoadedCurrentScope, recents]);
  const scopedFavorites = useMemo(() => hasLoadedCurrentScope ? favorites : [], [hasLoadedCurrentScope, favorites]);

  useEffect(() => {
    if (!open) return;
    setLoadedScope(null);
    setRecents(readList(recentStorageKey));
    setFavorites(readList(favoriteStorageKey));
    setLoadedScope(accessScope);
    // Sempre abre na aba "Todas" (busca) para o usuário poder digitar imediatamente.
    setTab("search");
    // Aguarda a aba "search" montar para garantir que inputRef.current exista.
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 120);
    return () => clearTimeout(t);
  }, [open, accessScope, recentStorageKey, favoriteStorageKey]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: localCompanies = [], isLoading: loadingLocal, isError: directoryError, refetch } = useQuery<CompanyItem[]>({
    queryKey: ["cart-sicoob-company-options", accessScope, debouncedSearchTerm],
    queryFn: () => fetchCartCompanyOptions(debouncedSearchTerm),
    staleTime: 15 * 60 * 1000,
    enabled: open,
  });

  const fuse = useMemo(() =>
    new Fuse(localCompanies, { keys: ["name", "razao_social", "nome_fantasia", "cnpj", "ramo"], threshold: 0.4 })
  , [localCompanies]);

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return localCompanies.slice(0, 30);
    if (debouncedSearchTerm.length >= 2 && debouncedSearchTerm === searchTerm.trim()) return localCompanies.slice(0, 40);
    return fuse.search(searchTerm).map(result => result.item).slice(0, 40);
  }, [searchTerm, debouncedSearchTerm, fuse, localCompanies]);

  const isFavorite = useCallback((id: string) => scopedFavorites.some(f => f.id === id), [scopedFavorites]);

  const toggleFavorite = useCallback((company: CompanyItem, e: MouseEvent) => {
    e.stopPropagation();
    if (!hasLoadedCurrentScope) return;
    setFavorites(prev => {
      const next = prev.some(f => f.id === company.id)
        ? prev.filter(f => f.id !== company.id)
        : [company, ...prev].slice(0, 20);
      writeList(favoriteStorageKey, next);
      return next;
    });
  }, [favoriteStorageKey, hasLoadedCurrentScope]);

  const handleSelect = useCallback(async (company: CompanyItem) => {
    const input: CreateCartInput = {
      company_id: company.id,
      company_name: company.name,
      company_location: company.ramo || undefined,
      company_logo_url: company.logo_url || undefined,
    };
    const result = await createCart(input);
    if (result) {
      const nextRecents = [company, ...scopedRecents.filter(r => r.id !== company.id)].slice(0, MAX_RECENT);
      writeList(recentStorageKey, nextRecents);
      setRecents(nextRecents);
      onCreated?.();
      onOpenChange(false);
    }
  }, [createCart, onCreated, onOpenChange, scopedRecents, recentStorageKey]);

  const isLoading = loadingLocal;

  const renderRow = (company: CompanyItem) => (
    <div key={company.id} className="group flex items-center rounded-lg transition-colors hover:bg-accent/60">
      <button
        type="button"
        data-testid="cart-company-picker-select"
        data-company-id={company.id}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => handleSelect(company)}
        disabled={!canCreateCart || !hasLoadedCurrentScope}
      >
        {company.logo_url ? (
          <img src={company.logo_url} alt="" className="w-9 h-9 rounded-lg object-contain bg-background border border-border/40 flex-shrink-0" loading="lazy" />
        ) : (
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{company.name}</span>
          {company.ramo && <span className="block truncate text-[11px] text-muted-foreground">{company.ramo}</span>}
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => toggleFavorite(company, e)}
        disabled={!hasLoadedCurrentScope}
        className={cn(
          "mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isFavorite(company.id)
            ? "text-warning"
            : "text-muted-foreground/50 hover:text-warning"
        )}
        aria-label={isFavorite(company.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        <Star className={cn("h-4 w-4", isFavorite(company.id) && "fill-current")} />
      </button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="font-display text-lg">Vincular à cooperativa ou unidade</DialogTitle>
          <DialogDescription className="text-xs">Escolha para quem este orçamento será preparado.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
          <div className="px-5">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="recent" className="text-xs gap-1.5"><Clock className="h-3.5 w-3.5" />Recentes</TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs gap-1.5"><Star className="h-3.5 w-3.5" />Favoritas</TabsTrigger>
              <TabsTrigger value="search" className="text-xs gap-1.5"><Globe className="h-3.5 w-3.5" />Todas</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="recent" className="m-0 px-3 pt-3 pb-4">
            <ScrollArea className="h-[340px] pr-2">
              {scopedRecents.length > 0 ? (
                <div className="space-y-0.5">{scopedRecents.map(renderRow)}</div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-12">Nenhuma cooperativa ou unidade recente.</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="favorites" className="m-0 px-3 pt-3 pb-4">
            <ScrollArea className="h-[340px] pr-2">
              {scopedFavorites.length > 0 ? (
                <div className="space-y-0.5">{scopedFavorites.map(renderRow)}</div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-12">Marque cooperativas ou unidades como favoritas usando a estrela.</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="m-0 px-3 pt-3 pb-4 space-y-3">
            <div className="relative px-2">
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, CNPJ ou segmento..."
                className="h-9 pl-8 text-sm"
              />
              {isLoading && <Loader2 className="absolute right-4.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            <ScrollArea className="h-[290px] pr-2">
              <CartCompanyDirectoryResults
                error={directoryError}
                empty={filteredCompanies.length === 0}
                loading={isLoading}
                emptyMessage="Nenhuma cooperativa ou unidade encontrada."
                emptyClassName="py-12"
                onRetry={() => void refetch()}
              >
                <div className="space-y-0.5">{filteredCompanies.map(renderRow)}</div>
              </CartCompanyDirectoryResults>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border/40">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
