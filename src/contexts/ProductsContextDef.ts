import { createContext, useContext } from "react";
import { type Product } from "@/hooks/useProducts";

export interface ProductsContextType {
  products: Product[];
  isLoading: boolean;
  getProductById: (id: string) => Product | undefined;
  getProductsByIds: (ids: string[]) => Product[];
  registerProducts: (products: Product[]) => void;
}

export const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function useProductsContext() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error("useProductsContext must be used within a ProductsProvider");
  }
  return context;
}

export function useProductsContextSafe() {
  return useContext(ProductsContext) ?? null;
}
