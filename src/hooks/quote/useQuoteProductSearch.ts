
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import Fuse from "fuse.js";
import { findKnownHex } from "@/hooks/useProducts";
import { dedupeById, rankProductSearchResults, createProductFuseOptions } from "@/utils/product-search";
import type { Product, RawProductColor } from "@/types/quote-builder";
import { fetchPromobrindProducts, getProductImageUrl, type PromobrindProduct } from "@/lib/external-db";

// Mapeamento interno para simplificar o hook principal
export function mapQuoteSearchProduct(p: PromobrindProduct): Product {
  const imgUrl = getProductImageUrl(p);
  const images = (p.images && p.images.length > 0) ? p.images : (imgUrl ? [imgUrl] : []);

  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.sale_price ?? 0,
    costPrice: p.cost_price ?? 0,
    images,
    colors: (p.colors || []).map((c: string | RawProductColor) => {
      const name = typeof c === 'string' ? c : c.name || '';
      const hex = (typeof c === 'string' ? undefined : c.hex) || findKnownHex(name) || undefined;
      return { name, hex, stock: typeof c === 'string' ? undefined : c.stock };
    }),
    minQuantity: p.min_quantity ?? 1,
    totalStock: p.stock_quantity ?? (p.colors || []).reduce(
      (sum, color) => sum + (typeof color === 'object' ? (color.stock ?? 0) : 0),
      0,
    ),
    priceUpdatedAt: p.price_updated_at,
  };
}

export async function loadQuoteProductsByIds(productIds: string[]): Promise<Product[]> {
  const uniqueIds = [...new Set(productIds)].slice(0, 20);
  if (uniqueIds.length === 0) return [];
  const products = await fetchPromobrindProducts({
    filters: { id: uniqueIds, is_active: true },
    limit: uniqueIds.length,
  });
  const byId = new Map(products.map((product) => [product.id, mapQuoteSearchProduct(product)]));
  return uniqueIds.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

async function loadQuoteSearchProducts(search: string): Promise<Product[]> {
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    const productsData = await fetchPromobrindProducts({ limit: 20 });
    return productsData.map(mapQuoteSearchProduct);
  }

  const [prefixMatches, broadMatches] = await Promise.all([
    fetchPromobrindProducts({ filters: { _name_prefix: normalizedSearch }, limit: 200 }),
    fetchPromobrindProducts({ search: normalizedSearch, limit: 500 }),
  ]);

  const mergedProducts = dedupeById([...prefixMatches, ...broadMatches]).map((product) =>
    mapQuoteSearchProduct(product)
  );
  
  const fuse = new Fuse(mergedProducts, createProductFuseOptions<Product>());
  return rankProductSearchResults(mergedProducts, normalizedSearch, fuse);
}

export function useQuoteProductSearch() {
  const [productSearch, setProductSearch] = useState("");
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const debouncedProductSearch = useDebounce(productSearch, 400);

  const { data: products, isLoading } = useQuery({
    queryKey: ["quote-products-promobrind-search", debouncedProductSearch],
    queryFn: () => loadQuoteSearchProducts(debouncedProductSearch),
    enabled: productSearchOpen,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const filteredProducts = useMemo(() => products || [], [products]);

  return {
    productSearch,
    setProductSearch,
    productSearchOpen,
    setProductSearchOpen,
    filteredProducts,
    isLoading
  };
}
