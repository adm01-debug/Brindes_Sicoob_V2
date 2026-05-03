
import { useState, useMemo } from 'react';
import { 
  Package, 
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { 
  type ProductStockSummary, 
} from '@/types/stock';
import { ProductRow } from './rows/ProductRow';
import { VariantRow } from './rows/VariantRow';

interface VariantStockTableProps {
  products: ProductStockSummary[];
  isLoading?: boolean;
}

export function VariantStockTable({ products, isLoading }: VariantStockTableProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.productName.toLowerCase().includes(query) || 
      p.productSku.toLowerCase().includes(query) ||
      p.variants.some(v => v.variantSku.toLowerCase().includes(query) || v.colorName?.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const toggleProduct = (productId: string) => {
    const next = new Set(expandedProducts);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    setExpandedProducts(next);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
        <Package className="h-10 w-10 mb-4 opacity-20" />
        <p>Carregando dados de estoque...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por nome, SKU ou cor..."
          className="pl-9 pr-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[300px]">Produto / SKU</TableHead>
              <TableHead className="hidden md:table-cell">Cód. Variante</TableHead>
              <TableHead>Estoque Atual</TableHead>
              <TableHead className="hidden sm:table-cell w-[140px]">Nível</TableHead>
              <TableHead className="hidden lg:table-cell">Reservado</TableHead>
              <TableHead>Disponível</TableHead>
              <TableHead className="hidden md:table-cell">Em Trânsito</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Previsão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  Nenhum produto encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <React.Fragment key={product.productId}>
                  <ProductRow 
                    product={product} 
                    isExpanded={expandedProducts.has(product.productId)}
                    onToggle={() => toggleProduct(product.productId)}
                  />
                  {expandedProducts.has(product.productId) && product.variants.map((variant) => (
                    <VariantRow key={variant.id} variant={variant} isNested />
                  ))}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import React from 'react';
