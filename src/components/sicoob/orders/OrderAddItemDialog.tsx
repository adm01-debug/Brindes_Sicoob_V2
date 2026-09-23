import { useState } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";

interface OrderAddItemDialogProps {
  onAdd: (data: { productId: string; productName: string; quantity: number; unitPrice: number }) => void;
  isPending: boolean;
}

export function OrderAddItemDialog({ onAdd, isPending }: OrderAddItemDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantColor, setSelectedVariantColor] = useState<string | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);

  const { data: categories } = useCategories();
  const { data: products, isLoading: isLoadingProducts } = useProducts(
    { 
      search: productSearch, 
      category: selectedCategoryId !== "all" ? selectedCategoryId : undefined,
      limit: 20 
    }, 
    { enabled: isOpen }
  );

  const selectedProduct = products?.find(p => p.id === selectedProductId);

  const handleConfirm = () => {
    if (!selectedProduct) return;
    const variantLabel = selectedVariantColor ? ` (${selectedVariantColor})` : "";
    
    onAdd({
      productId: selectedProduct.id,
      productName: `${selectedProduct.name}${variantLabel}`,
      quantity: itemQuantity,
      unitPrice: selectedProduct.price,
    });
    setIsOpen(false);
    reset();
  };

  const reset = () => {
    setProductSearch("");
    setSelectedCategoryId("all");
    setSelectedProductId(null);
    setSelectedVariantColor(null);
    setItemQuantity(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" /> Adicionar Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Item ao Pedido</DialogTitle>
          <DialogDescription>Busque produtos do catálogo Sicoob para adicionar a este pedido.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories?.map(c => (
                    <SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buscar Produto</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nome ou SKU..." 
                  className="pl-8" 
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Selecione o Produto</Label>
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {isLoadingProducts ? (
                <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
              ) : products?.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Nenhum produto encontrado</div>
              ) : (
                <div className="grid grid-cols-1 divide-y">
                  {products?.map(p => (
                    <button
                      key={p.id}
                      className={`p-2 text-left text-sm hover:bg-muted transition-colors ${selectedProductId === p.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                      onClick={() => setSelectedProductId(p.id)}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">SKU: {p.sku || 'N/A'} • R$ {p.price.toLocaleString('pt-BR')}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedProduct && selectedProduct.colors && selectedProduct.colors.length > 0 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label>Cor/Variante</Label>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.colors.map((color) => (
                  <button
                    key={color.name}
                    className={`px-3 py-1 text-xs rounded-full border transition-all ${selectedVariantColor === color.name ? 'bg-primary text-white border-primary' : 'bg-background hover:border-primary'}`}
                    onClick={() => setSelectedVariantColor(color.name)}
                  >
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input 
              type="number" 
              min={1} 
              value={itemQuantity}
              onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button disabled={!selectedProductId || ((selectedProduct?.colors?.length ?? 0) > 0 && !selectedVariantColor) || isPending} onClick={handleConfirm}>
            {isPending ? "Adicionando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
