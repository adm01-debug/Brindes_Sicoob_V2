import React from "react";
import { DraggableQuoteItems } from "./DraggableQuoteItems";
import { QuoteItem } from "@/hooks/quotes/quoteTypes";

interface QuoteItemsListProps {
  items: QuoteItem[];
  onItemsChange?: (items: QuoteItem[]) => void;
  onEditItem?: (item: QuoteItem) => void;
  onRemoveItem?: (index: number) => void;
  isEditable?: boolean;
  selectedIndexes?: Set<number>;
  onToggleSelection?: (index: number) => void;
  onUngroup?: (groupId: string) => void;
}

/**
 * Componente para exibição e gestão da lista de itens de um orçamento.
 * Suporta reordenação (drag and drop) quando editável.
 */
export function QuoteItemsList({
  items,
  onItemsChange,
  onEditItem,
  onRemoveItem,
  isEditable = true,
  selectedIndexes,
  onToggleSelection,
  onUngroup,
}: QuoteItemsListProps) {
  if (isEditable && onItemsChange) {
    return (
      <DraggableQuoteItems
        items={items}
        onReorder={onItemsChange}
        onUpdateQuantity={(idx, qty) => {
          const newItems = [...items];
          newItems[idx]!.quantity = qty;
          onItemsChange(newItems);
        }}
        onUpdatePrice={(idx, price) => {
          const newItems = [...items];
          newItems[idx]!.unit_price = price;
          onItemsChange(newItems);
        }}
        onRemove={onRemoveItem || (() => {})}
        formatCurrency={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)}
        selectedIndexes={selectedIndexes}
        onToggleSelection={onToggleSelection}
        onUngroup={onUngroup}
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div 
          key={item.id || index} 
          className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-card/50"
        >
          {item.product_image_url && (
            <img 
              src={item.product_image_url} 
              alt={item.product_name} 
              className="h-12 w-12 object-cover rounded-lg"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold truncate">{item.product_name}</h4>
            <p className="text-xs text-muted-foreground tabular-nums">
              {item.quantity} un × {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_price)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.subtotal || (item.quantity * item.unit_price))}
            </p>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
          Nenhum item adicionado
        </div>
      )}
    </div>
  );
}
