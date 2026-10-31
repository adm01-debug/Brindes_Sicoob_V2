import React from "react";
import { QuoteBuilderProductSearch } from "./QuoteBuilderProductSearch";
import { type ExternalVariantStock } from "@/hooks/useExternalVariantStock";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  images: string[] | null;
  colors?: { name: string; hex?: string; stock?: number }[];
  totalStock?: number;
}

interface QuoteProductSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productSearch: string;
  setProductSearch: (v: string) => void;
  filteredProducts: Product[];
  selectedProductForColor: Product | null;
  setSelectedProductForColor: (p: Product | null) => void;
  onProductClick: (p: Product) => void;
  onAddWithColor: (p: Product, v: ExternalVariantStock | null) => void;
  formatCurrency: (v: number) => string;
}

/**
 * Seletor de produtos para orçamentos.
 * Interface unificada para busca e seleção de variantes/cores.
 */
export function QuoteProductSelector(props: QuoteProductSelectorProps) {
  return <QuoteBuilderProductSearch {...props} />;
}
