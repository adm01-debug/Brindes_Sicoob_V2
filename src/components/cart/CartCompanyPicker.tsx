/**
 * CartCompanyPicker - Seletor compacto de empresa para criação de carrinho
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { Building2, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSellerCartContext, type CreateCartInput } from "@/contexts/SellerCartContext";
import { useAuth } from "@/contexts/AuthContext";
import { buildCartCompanyAccessScope, fetchCartCompanyOptions, type CartCompanyOption as CompanyItem } from "./cart-company-options";
import { CartCompanyDirectoryResults } from "./CartCompanyDirectoryResults";

interface CartCompanyPickerProps {
  onCreated?: () => void;
  onCancel?: () => void;
}

export function CartCompanyPicker({ onCreated, onCancel }: CartCompanyPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { createCart, canCreateCart } = useSellerCartContext();
  const { user, roles } = useAuth();
  const accessScope = buildCartCompanyAccessScope(user?.id, roles);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Local companies cache
  const { data: localCompanies = [], isLoading: loadingLocal, isError: directoryError, refetch } = useQuery<CompanyItem[]>({
    queryKey: ["cart-sicoob-company-options", accessScope, debouncedSearchTerm],
    queryFn: () => fetchCartCompanyOptions(debouncedSearchTerm),
    staleTime: 15 * 60 * 1000,
  });

  // Fuse.js for local fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(localCompanies, {
      keys: ["name", "razao_social", "nome_fantasia", "cnpj", "ramo"],
      threshold: 0.4,
    });
  }, [localCompanies]);

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return localCompanies.slice(0, 20);
    if (debouncedSearchTerm.length >= 2 && debouncedSearchTerm === searchTerm.trim()) return localCompanies.slice(0, 40);
    return fuse.search(searchTerm).map(result => result.item).slice(0, 30);
  }, [searchTerm, debouncedSearchTerm, fuse, localCompanies]);

  const handleSelect = useCallback(async (company: CompanyItem) => {
    const input: CreateCartInput = {
      company_id: company.id,
      company_name: company.name,
      company_location: company.ramo || undefined,
      company_logo_url: company.logo_url || undefined,
    };
    const result = await createCart(input);
    if (result) onCreated?.();
  }, [createCart, onCreated]);

  const isLoading = loadingLocal;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <h4 className="text-sm font-semibold flex-1">Selecione a cooperativa ou unidade</h4>
        {onCancel && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar cooperativa ou unidade…"
          className="h-8 pl-8 text-sm"
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      <ScrollArea className="h-[200px]">
        <div className="space-y-0.5">
          <CartCompanyDirectoryResults
            error={directoryError}
            empty={filteredCompanies.length === 0}
            loading={isLoading}
            emptyMessage="Nenhuma cooperativa ou unidade encontrada"
            onRetry={() => void refetch()}
          >
            {filteredCompanies.map((company) => (
            <button
              key={company.id}
              type="button"
              data-testid="cart-company-picker-select"
              data-company-id={company.id}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left",
                "hover:bg-accent/50 transition-colors text-sm"
              )}
              onClick={() => handleSelect(company)}
              disabled={!canCreateCart}
            >
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt="Logo da cooperativa ou unidade"
                  className="w-6 h-6 rounded object-contain bg-background border border-border flex-shrink-0" loading="lazy" />
              ) : (
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate font-medium">{company.name}</p>
                {company.ramo && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {company.ramo}
                  </p>
                )}
              </div>
            </button>
            ))}
          </CartCompanyDirectoryResults>
        </div>
      </ScrollArea>
    </div>
  );
}
