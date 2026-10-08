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

type CatalogProduct = NonNullable<ReturnType<typeof useProducts>["data"]>[number];
type CatalogCategory = NonNullable<ReturnType<typeof useCategories>["data"]>[number];

interface ProductFiltersProps {
  categories: CatalogCategory[] | undefined;
  categoryId: string;
  search: string;
  onCategoryChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

function ProductFilters({ categories, categoryId, search, onCategoryChange, onSearchChange }: ProductFiltersProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select value={categoryId} onValueChange={onCategoryChange}>
          <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas as Categorias</SelectItem>{categories?.map((category) => <SelectItem key={String(category.id)} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Buscar Produto</Label>
        <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Nome ou SKU..." className="pl-8" value={search} onChange={(event) => onSearchChange(event.target.value)} /></div>
      </div>
    </div>
  );
}

interface ProductPickerProps {
  products: CatalogProduct[] | undefined;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function ProductPicker({ products, isLoading, selectedId, onSelect }: ProductPickerProps) {
  let content = <div className="p-4 text-center text-sm text-muted-foreground">Nenhum produto encontrado</div>;
  if (isLoading) content = <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>;
  else if (products?.length) {
    content = <div className="grid grid-cols-1 divide-y">{products.map((product) => (
      <button key={product.id} type="button" className={`p-2 text-left text-sm hover:bg-muted transition-colors ${selectedId === product.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`} onClick={() => onSelect(product.id)}>
        <div className="font-medium">{product.name}</div><div className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'} • R$ {product.price.toLocaleString('pt-BR')}</div>
      </button>
    ))}</div>;
  }
  return <div className="space-y-2"><Label>Selecione o Produto</Label><div className="border rounded-md max-h-48 overflow-y-auto">{content}</div></div>;
}

function VariantPicker({ product, selected, onSelect }: { product: CatalogProduct | undefined; selected: string | null; onSelect: (color: string) => void }) {
  if (!product?.colors?.length) return null;
  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
      <Label>Cor/Variante</Label>
      <div className="flex flex-wrap gap-2">{product.colors.map((color) => <button key={color.name} type="button" className={`px-3 py-1 text-xs rounded-full border transition-all ${selected === color.name ? 'bg-primary text-white border-primary' : 'bg-background hover:border-primary'}`} onClick={() => onSelect(color.name)}>{color.name}</button>)}</div>
    </div>
  );
}

interface AddItemContentProps {
  categories: CatalogCategory[] | undefined;
  products: CatalogProduct[] | undefined;
  selectedProduct: CatalogProduct | undefined;
  categoryId: string;
  search: string;
  selectedProductId: string | null;
  selectedColor: string | null;
  quantity: number;
  isLoading: boolean;
  onCategoryChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onProductChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
}

function AddItemContent(props: AddItemContentProps) {
  return (
    <div className="space-y-4 py-4">
      <ProductFilters categories={props.categories} categoryId={props.categoryId} search={props.search} onCategoryChange={props.onCategoryChange} onSearchChange={props.onSearchChange} />
      <ProductPicker products={props.products} isLoading={props.isLoading} selectedId={props.selectedProductId} onSelect={props.onProductChange} />
      <VariantPicker product={props.selectedProduct} selected={props.selectedColor} onSelect={props.onColorChange} />
      <div className="space-y-2">
        <Label>Quantidade</Label>
        <Input type="number" min={1} value={props.quantity} onChange={(event) => props.onQuantityChange(parseInt(event.target.value) || 1)} />
      </div>
    </div>
  );
}

function useAddItemDialog(onAdd: OrderAddItemDialogProps["onAdd"]) {
  const [isOpen, setIsOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantColor, setSelectedVariantColor] = useState<string | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const { data: categories } = useCategories();
  const category = selectedCategoryId !== "all" ? selectedCategoryId : undefined;
  const { data: products, isLoading: isLoadingProducts } = useProducts({ search: productSearch, category, limit: 20 }, { enabled: isOpen });
  const selectedProduct = products?.find((product) => product.id === selectedProductId);
  const reset = () => {
    setProductSearch(""); setSelectedCategoryId("all"); setSelectedProductId(null);
    setSelectedVariantColor(null); setItemQuantity(1);
  };
  const confirm = () => {
    if (!selectedProduct) return;
    const variantLabel = selectedVariantColor ? ` (${selectedVariantColor})` : "";
    onAdd({ productId: selectedProduct.id, productName: `${selectedProduct.name}${variantLabel}`, quantity: itemQuantity, unitPrice: selectedProduct.price });
    setIsOpen(false); reset();
  };
  return { isOpen, setIsOpen, productSearch, setProductSearch, selectedCategoryId, setSelectedCategoryId, selectedProductId, setSelectedProductId, selectedVariantColor, setSelectedVariantColor, itemQuantity, setItemQuantity, categories, products, isLoadingProducts, selectedProduct, confirm };
}

export function OrderAddItemDialog({ onAdd, isPending }: OrderAddItemDialogProps) {
  const dialog = useAddItemDialog(onAdd);
  const { isOpen, setIsOpen, productSearch, setProductSearch, selectedCategoryId, setSelectedCategoryId, selectedProductId, setSelectedProductId, selectedVariantColor, setSelectedVariantColor, itemQuantity, setItemQuantity, categories, products, isLoadingProducts, selectedProduct, confirm } = dialog;
  const needsVariant = Boolean(selectedProduct?.colors?.length);
  const confirmDisabled = !selectedProductId || (needsVariant && !selectedVariantColor) || isPending;

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
        <AddItemContent categories={categories} products={products} selectedProduct={selectedProduct} categoryId={selectedCategoryId} search={productSearch} selectedProductId={selectedProductId} selectedColor={selectedVariantColor} quantity={itemQuantity} isLoading={isLoadingProducts} onCategoryChange={setSelectedCategoryId} onSearchChange={setProductSearch} onProductChange={setSelectedProductId} onColorChange={setSelectedVariantColor} onQuantityChange={setItemQuantity} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button disabled={confirmDisabled} onClick={confirm}>
            {isPending ? "Adicionando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
