/**
 * ItemsListEditor — editor de linha de itens de orçamento (qtd, preço unitário, observações).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Package } from "lucide-react";

export interface QuoteItemRow {
  id?: string;
  product_name: string;
  product_sku?: string | null;
  quantity: number;
  unit_price: number;
  unit_cost?: number; // Preço de custo
  notes?: string | null;
  stock_available?: number; // Disponibilidade simulada/real
}

interface ItemsListEditorProps {
  items: QuoteItemRow[];
  onChange: (next: QuoteItemRow[]) => void;
}

export function ItemsListEditor({ items, onChange }: ItemsListEditorProps) {
  const update = (idx: number, patch: Partial<QuoteItemRow>) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Itens ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p>
        ) : (
          items.map((item, idx) => {
            const margin = item.unit_price > 0 && item.unit_cost 
              ? ((item.unit_price - item.unit_cost) / item.unit_price) * 100 
              : 0;
            
            const marginColor = margin < 15 ? "text-destructive" : margin < 25 ? "text-warning" : "text-success";

            return (
              <div key={item.id ?? idx} className="grid grid-cols-12 gap-3 items-start border-b pb-4 pt-2 last:border-0">
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  <Input
                    placeholder="Produto"
                    className="font-medium"
                    value={item.product_name}
                    onChange={(e) => update(idx, { product_name: e.target.value })}
                  />
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      SKU: {item.product_sku || "N/A"}
                    </span>
                    {item.stock_available !== undefined && (
                      <span className={`font-semibold ${item.stock_available < item.quantity ? "text-destructive" : "text-success"}`}>
                        Estoque: {item.stock_available}
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-span-3 sm:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1 px-1">Qtd</label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => update(idx, { quantity: +e.target.value })}
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1 px-1">Unitário</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => update(idx, { unit_price: +e.target.value })}
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1 px-1">Custo</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unit_cost || 0}
                    onChange={(e) => update(idx, { unit_cost: +e.target.value })}
                  />
                </div>

                <div className="col-span-3 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1 px-1">Margem</label>
                  <div className={`h-10 flex items-center px-3 border rounded-md bg-muted/30 font-bold text-sm ${marginColor}`}>
                    {margin.toFixed(1)}%
                  </div>
                </div>

                <div className="col-span-1 flex justify-end pt-6">
                  <Button variant="ghost" size="icon" onClick={() => remove(idx)} aria-label="Remover item">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
