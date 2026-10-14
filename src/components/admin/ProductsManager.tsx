/**
 * Consulta paginada do catálogo mestre, com modo somente leitura.
 * Refatorado: lógica extraída para useProductsManager hook.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Package, ImageIcon, RefreshCw, ChevronLeft, ChevronRight, X, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ProductFiltersBar } from "./products/ProductFiltersBar";
import { useProductsManager } from "./products/useProductsManager";

const PRIMARY_ICON_BACKGROUND = 'bg-primary/10';

type ProductsState = ReturnType<typeof useProductsManager>;
type ManagedProduct = ProductsState['products'][number];

function stockColor(stock: number): string {
  if (stock <= 0) return 'text-destructive';
  if (stock < 10) return 'text-warning dark:text-warning';
  return 'text-primary';
}

function ProductThumbnail({ product }: { product: ManagedProduct }) {
  if (!product.images || product.images.length === 0) {
    return <div className="w-12 h-12 bg-muted/50 rounded-lg border border-dashed border-border/60 flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground/50" /></div>;
  }
  return (
    <div className="relative">
      <img src={product.images[0]} alt={product.name} className="w-12 h-12 object-cover rounded-lg border border-border/50 group-hover:border-primary/30 transition-colors" loading="lazy" />
      {product.images.length > 1 && <span className="absolute -bottom-1 -right-1 text-[9px] bg-muted border border-border rounded-full h-4 w-4 flex items-center justify-center font-medium">+{product.images.length - 1}</span>}
    </div>
  );
}

function ProductFlags({ product }: { product: ManagedProduct }) {
  return (
    <div className="flex items-center gap-1 mt-0.5">
      {product.is_featured && <Badge variant="outline" className="text-[10px] h-4 px-1 border-warning/30 text-warning dark:text-warning">⭐ Destaque</Badge>}
      {product.is_new && <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/30 text-primary">Novo</Badge>}
      {product.is_kit && <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5 border-primary/30 bg-primary/10 text-primary"><Boxes className="h-2.5 w-2.5" />Kit</Badge>}
    </div>
  );
}

function ProductRow({ product }: { product: ManagedProduct }) {
  const stock = product.stock ?? 0;
  return (
    <TableRow key={product.id} className="group hover:bg-muted/40 transition-colors border-border/30">
      <TableCell><ProductThumbnail product={product} /></TableCell>
      <TableCell><span className="font-mono text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{product.sku}</span></TableCell>
      <TableCell>
        <div className="max-w-[280px]">
          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{product.name}</p>
          <ProductFlags product={product} />
        </div>
      </TableCell>
      <TableCell className="text-right"><span className="font-semibold tabular-nums text-sm">R$ {product.price.toFixed(2)}</span></TableCell>
      <TableCell className="text-center"><span className={`font-semibold tabular-nums text-sm ${stockColor(stock)}`}>{stock}</span></TableCell>
      <TableCell className="text-center">
        {product.is_active ? <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15">Ativo</Badge> : <Badge variant="secondary" className="text-[10px] opacity-60">Inativo</Badge>}
      </TableCell>
    </TableRow>
  );
}

function visiblePages(currentPage: number, totalPages: number): number[] {
  const count = Math.min(5, totalPages);
  return Array.from({ length: count }, (_, index) => {
    if (totalPages <= 5 || currentPage <= 3) return index + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + index;
    return currentPage - 2 + index;
  });
}

function ProductTableContent({ state }: { state: ProductsState }) {
  if (state.isLoading) {
    return <div className="flex items-center justify-center py-16"><div className="flex flex-col items-center gap-3"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Carregando produtos...</p></div></div>;
  }
  if (state.products.length === 0) {
    return <div className="text-center py-16 text-muted-foreground"><Package className="h-14 w-14 mx-auto mb-4 opacity-30" /><p className="font-medium">Nenhum produto encontrado</p><p className="text-sm mt-1">Tente ajustar os filtros ou o termo de busca</p></div>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="w-14">Foto</TableHead><TableHead className="w-28">SKU</TableHead><TableHead>Produto</TableHead>
            <TableHead className="w-28 text-right">Preço</TableHead><TableHead className="w-24 text-center">Estoque</TableHead>
            <TableHead className="w-24 text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{state.products.map((product) => <ProductRow key={product.id} product={product} />)}</TableBody>
      </Table>
    </div>
  );
}

function ProductPagination({ state }: { state: ProductsState }) {
  if (state.isLoading || state.products.length === 0) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border/40">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Mostrando <strong className="text-foreground">{state.products.length}</strong> de <strong className="text-foreground">{state.totalCount?.toLocaleString()}</strong> produtos</span>
        <Select value={String(state.pageSize)} onValueChange={state.handlePageSizeChange}>
          <SelectTrigger className="w-[90px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{state.PAGE_SIZE_OPTIONS.map((size) => <SelectItem key={size} value={String(size)}>{size} / pág</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={state.currentPage <= 1} onClick={() => state.handlePageChange(state.currentPage - 1)} className="h-8"><ChevronLeft className="h-4 w-4" /></Button>
        {visiblePages(state.currentPage, state.totalPages).map((page) => (
          <Button key={page} variant={page === state.currentPage ? "default" : "outline"} size="sm" className="w-8 h-8 p-0 text-xs" onClick={() => state.handlePageChange(page)}>{page}</Button>
        ))}
        <Button variant="outline" size="sm" disabled={state.currentPage >= state.totalPages} onClick={() => state.handlePageChange(state.currentPage + 1)} className="h-8"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export function ProductsManager() {
  const s = useProductsManager();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
            Consulta de Produtos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Dados sincronizados do catálogo mestre em modo somente leitura</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => s.fetchProducts()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      {(<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: s.totalCount?.toLocaleString() ?? '—', valueClass: '', icon: <Package className="h-5 w-5 text-primary" />, iconBg: PRIMARY_ICON_BACKGROUND },
          { label: 'Ativos', value: s.stats.active, valueClass: 'text-primary', icon: <div className="h-3 w-3 rounded-full bg-primary" />, iconBg: PRIMARY_ICON_BACKGROUND },
          { label: 'Sem Estoque', value: s.stats.noStock, valueClass: 'text-warning dark:text-warning', icon: <div className="h-3 w-3 rounded-full bg-warning" />, iconBg: 'bg-warning/10' },
          { label: 'Preço Médio', value: `R$ ${s.stats.avgPrice.toFixed(0)}`, valueClass: '', icon: <span className="text-sm font-bold text-primary">$</span>, iconBg: PRIMARY_ICON_BACKGROUND },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.08, ease: 'easeOut' }} whileHover={{ y: -2, transition: { duration: 0.2 } }}>
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm hover:border-border/70 hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className={cn("text-2xl font-bold tabular-nums mt-1", stat.valueClass)}>{stat.value}</p>
                  </div>
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", stat.iconBg)}>{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>)}

      {/* Search & Filters */}
      {(<Card className="border-border/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, SKU ou categoria..." value={s.searchTerm} onChange={(e) => s.setSearchTerm(e.target.value)} className="pl-10 h-10 bg-background" />
              {s.searchTerm && (
                <button aria-label="Fechar" onClick={() => s.setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <ProductFiltersBar filters={s.advancedFilters} onChange={s.handleFiltersChange} />
        </CardContent>
      </Card>)}

      {/* Table */}
      {(<Card className="border-border/40">
        <CardContent className="p-0">
          <ProductTableContent state={s} />
          <ProductPagination state={s} />
        </CardContent>
      </Card>)}

    </div>
  );
}
