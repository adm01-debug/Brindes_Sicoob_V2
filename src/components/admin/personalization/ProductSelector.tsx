import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Loader2, Search } from "lucide-react";
import type { Product, ProductGroup } from "./usePersonalizationData";

interface ProductSelectorProps {
  products: Product[] | undefined;
  productsLoading: boolean;
  productGroups: ProductGroup[] | undefined;
  allMemberships: { product_id: string; product_group_id: string }[] | undefined;
  selectedProduct: string | null;
  onSelectProduct: (id: string) => void;
}

type Membership = NonNullable<ProductSelectorProps["allMemberships"]>[number];

function findGroup(productId: string, memberships: Membership[] | undefined, groups: ProductGroup[] | undefined) {
  const membership = memberships?.find((item) => item.product_id === productId);
  return membership ? groups?.find((group) => group.id === membership.product_group_id) : undefined;
}

function filterProducts(products: Product[] | undefined, query: string, memberships: Membership[] | undefined, groups: ProductGroup[] | undefined) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return products || [];
  return products?.filter((product) => {
    const group = findGroup(product.id, memberships, groups);
    return product.name.toLowerCase().includes(normalizedQuery)
      || product.sku.toLowerCase().includes(normalizedQuery)
      || Boolean(group?.group_name.toLowerCase().includes(normalizedQuery))
      || Boolean(group?.group_code.toLowerCase().includes(normalizedQuery));
  }) || [];
}

function ProductOptions({ products, productsLoading, productGroups, memberships }: {
  products: Product[];
  productsLoading: boolean;
  productGroups: ProductGroup[] | undefined;
  memberships: Membership[] | undefined;
}) {
  if (productsLoading) return <div className="flex items-center justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (products.length === 0) return <div className="p-4 text-center text-sm text-muted-foreground">Nenhum produto encontrado</div>;
  return products.map((product) => {
    const group = findGroup(product.id, memberships, productGroups);
    return (
      <SelectItem key={product.id} value={product.id}>
        <div className="flex items-center gap-2">
          <span>{product.name}</span><span className="text-xs text-muted-foreground font-mono">({product.sku})</span>
          {group && <Badge variant="outline" className="text-xs ml-1">{group.group_code}</Badge>}
        </div>
      </SelectItem>
    );
  });
}

export function ProductSelector({
  products, productsLoading, productGroups, allMemberships,
  selectedProduct, onSelectProduct,
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = filterProducts(products, searchQuery, allMemberships, productGroups);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Personalização por Produto
        </CardTitle>
        <CardDescription>Configure regras específicas de personalização para cada produto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, SKU ou grupo..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedProduct || ""} onValueChange={onSelectProduct}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Selecione um produto..." />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <ProductOptions products={filteredProducts} productsLoading={productsLoading} productGroups={productGroups} memberships={allMemberships} />
          </SelectContent>
        </Select>
        {searchQuery && (
          <p className="text-xs text-muted-foreground">{filteredProducts.length} de {products?.length || 0} produtos</p>
        )}
      </CardContent>
    </Card>
  );
}
