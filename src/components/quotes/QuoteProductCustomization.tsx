/**
 * QuoteProductCustomization — Personalização de produto dentro do orçamento
 * 
 * Usa ProductCustomizationOptions v6 com o novo fluxo:
 * Local → Técnica → Dimensões/Cores → Preço → AUTO-CONFIRMA
 * 
 * A personalização é confirmada automaticamente quando o preço é calculado,
 * sem necessidade de clicar em "Adicionar" — evitando perda de dados.
 */

import { useCallback, useEffect, useRef } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCustomizationOptions } from "@/components/products/ProductCustomizationOptions";
import type { QuoteItemPersonalization } from "@/hooks/quotes/useQuotes";
import type { PersonalizationItem } from "@/types/customization";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface QuoteProductCustomizationProps {
  productId: string;
  quantity: number;
  existingPersonalizations?: QuoteItemPersonalization[];
  onPersonalizationsChange: (personalizations: QuoteItemPersonalization[]) => void;
}

function toQuotePersonalization(item: PersonalizationItem, quantity: number): QuoteItemPersonalization | null {
  if (!item.price?.success) return null;
  return {
    technique_id: item.techniqueId, technique_name: item.techniqueName, colors_count: item.numberOfColors,
    positions_count: 1, width_cm: item.width, height_cm: item.height, personalized_quantity: quantity,
    setup_cost: item.price.setup_total, unit_cost: item.price.preco_unitario, total_cost: item.price.total_cobrado,
    notes: item.width && item.height ? `${item.locationName} — ${item.codigoTabela} | ${item.width}×${item.height}cm`
      : `${item.locationName} — ${item.codigoTabela}`,
  };
}

function ConfirmedPersonalizations({ items, onRemove }: { items: QuoteItemPersonalization[]; onRemove: (index: number) => void }) {
  if (!items.length) return null;
  const total = items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
  return <div className="space-y-1.5"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gravações adicionadas</p>
    {items.map((item, index) => <div key={index} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-center gap-2 min-w-0"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /><div className="min-w-0">
        <span className="text-xs font-semibold text-primary block truncate">{item.technique_name}</span><span className="text-xs text-muted-foreground">
          {item.width_cm && item.height_cm ? `${item.width_cm}×${item.height_cm}cm · ` : ""}{item.colors_count || 1} cor{(item.colors_count || 1) > 1 ? "es" : ""}</span>
      </div></div><div className="flex items-center gap-2 shrink-0"><Badge variant="secondary" className="text-xs font-semibold">{fmt(item.total_cost || 0)}</Badge>
        <Button variant="ghost" size="icon" aria-label="Excluir" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onRemove(index)}>
          <Trash2 className="h-3 w-3" /></Button></div>
    </div>)}
    <div className="flex justify-between text-xs text-muted-foreground pt-1 px-1"><span>Total gravação:</span><span className="font-semibold text-primary">{fmt(total)}</span></div>
  </div>;
}

function usePersonalizationEditor(existing: QuoteItemPersonalization[], quantity: number,
  onChange: (personalizations: QuoteItemPersonalization[]) => void) {
  const personalizationsRef = useRef(existing);
  useEffect(() => { personalizationsRef.current = existing; }, [existing]);
  const select = useCallback((items: PersonalizationItem[]) => {
    const updated = [...personalizationsRef.current];
    items.forEach((item) => {
      const next = toQuotePersonalization(item, quantity);
      if (!next?.notes) return;
      const index = updated.findIndex((current) => current.notes === next.notes || current.technique_id === next.technique_id);
      if (index >= 0) updated[index] = next;
      else updated.push(next);
    });
    personalizationsRef.current = updated;
    onChange(updated);
  }, [quantity, onChange]);
  const remove = useCallback((index: number) => {
    const updated = personalizationsRef.current.filter((_, currentIndex) => currentIndex !== index);
    personalizationsRef.current = updated;
    onChange(updated);
  }, [onChange]);
  return { select, remove };
}

export function QuoteProductCustomization({
  productId,
  quantity,
  existingPersonalizations = [],
  onPersonalizationsChange,
}: QuoteProductCustomizationProps) {
  const { select: handleSelectionChange, remove: handleRemove } = usePersonalizationEditor(
    existingPersonalizations, quantity, onPersonalizationsChange,
  );

  if (!productId) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Selecione um produto para ver as opções de personalização
      </div>
    );
  }

  const confirmed = existingPersonalizations;

  return (
    <div className="space-y-4">
      <ConfirmedPersonalizations items={confirmed} onRemove={handleRemove} />

      {/* Configurador — auto-confirms on price calculation */}
      <ProductCustomizationOptions
        productId={productId}
        quantity={quantity}
        onSelectionChange={handleSelectionChange}
      />

      {confirmed.length === 0 && (
        <p className="text-xs text-center text-muted-foreground/70 pt-1">
          Configure a técnica acima — o preço será adicionado automaticamente ao orçamento.
        </p>
      )}
    </div>
  );
}
