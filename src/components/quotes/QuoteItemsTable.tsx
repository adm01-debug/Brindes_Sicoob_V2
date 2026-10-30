/**
 * QuoteItemsTable — Items table with kit grouping for QuoteViewPage
 */
import React from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { QuoteItemDetailSheet } from "./QuoteItemDetailSheet";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";

/** Recalculate personalization total using rounded unit price to match UI display */
function calcPersTotal(totalCost: number, qty: number): number {
  if (qty <= 0) return totalCost;
  const roundedUnit = Math.round((totalCost / qty) * 100) / 100;
  return Math.round(roundedUnit * qty * 100) / 100;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface QuoteItem {
  id?: string;
  product_id?: string;
  product_name: string;
  product_sku?: string | null;
  product_image_url?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  quantity: number;
  unit_price: number;
  kit_group_id?: string | null;
  kit_name?: string | null;
  /** Optional: ISO timestamp from the external catalog (SSOT) for freshness badge. */
  price_updated_at?: string | null;
  /** Optional: per-product threshold (days) for the stale-price warning. */
  price_freshness_threshold_days?: number | null;
  personalizations?: ItemPersonalization[];
  [key: string]: unknown;
}

interface ItemPersonalization {
  total_cost?: number;
  notes?: string;
  width_cm?: number;
  height_cm?: number;
  technique_name?: string;
  colors_count?: number;
  [key: string]: unknown;
}

interface QuoteItemsTableProps {
  items: QuoteItem[];
}

function groupQuoteItems(items: QuoteItem[]) {
  const kitGroups = new Map<string, { name: string; items: QuoteItem[] }>();
  const looseItems: QuoteItem[] = [];
  items.forEach(item => {
    if (!item.kit_group_id || !item.kit_name) { looseItems.push(item); return; }
    const group = kitGroups.get(item.kit_group_id) || { name: item.kit_name, items: [] };
    group.items.push(item);
    kitGroups.set(item.kit_group_id, group);
  });
  return { kitGroups, looseItems };
}

function personalizationLabels(personalization: ItemPersonalization): { location: string | null; dimensions: string | null } {
  const [locationPart, dimensionPart] = (personalization.notes || "").split(" | ");
  const location = locationPart ? locationPart.split(" — ")[0] ?? null : null;
  if (dimensionPart) return { location, dimensions: dimensionPart.replace("cm", " cm") };
  if (personalization.width_cm && personalization.height_cm) return { location, dimensions: `${personalization.width_cm} × ${personalization.height_cm} cm` };
  return { location, dimensions: null };
}

function ProductCell({ item }: { item: QuoteItem }) {
  return <td className="p-3"><div className="flex items-center gap-3">{item.product_image_url && <img src={item.product_image_url} alt={item.product_name} className="w-16 h-16 object-cover rounded border border-border print:hidden" loading="lazy" />}<div>{item.product_sku && <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-md border mb-1" style={{ backgroundColor: item.color_hex ? `${item.color_hex}22` : undefined, borderColor: item.color_hex || 'hsl(var(--border))', color: item.color_hex || 'hsl(var(--foreground))' }}>{item.color_hex && <span className="w-2.5 h-2.5 rounded-full border border-border/50" style={{ backgroundColor: item.color_hex }} />}{item.product_sku}{item.color_name ? `-${item.color_name}` : ''}</span>}<p className="font-medium">{item.product_name}</p></div></div></td>;
}

function PersonalizationBadge({ personalization, index }: { personalization: ItemPersonalization; index: number }) {
  const labels = personalizationLabels(personalization);
  const colorCount = personalization.colors_count || 1;
  return <div className={index > 0 ? 'pt-1.5 border-t border-border/30' : ''}><div className="inline-flex flex-col gap-0.5 bg-primary/8 border border-primary/20 rounded-md px-2 py-1.5"><span className="text-xs font-semibold text-primary flex items-center gap-1">✦ {personalization.technique_name}</span><div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">{labels.location && <span className="font-medium text-foreground/70">{labels.location}</span>}{labels.dimensions && <span className="font-medium text-foreground/80">{labels.dimensions}</span>}<span>{colorCount} cor{colorCount > 1 ? "es" : ""}</span></div></div></div>;
}

function PersonalizationsCell({ personalizations }: { personalizations: ItemPersonalization[] }) {
  if (personalizations.length === 0) return <td className="p-3"><span className="text-muted-foreground text-sm">—</span></td>;
  return <td className="p-3"><div className="space-y-1.5">{personalizations.map((personalization, index) => <PersonalizationBadge key={`${personalization.technique_name}-${index}`} personalization={personalization} index={index} />)}</div></td>;
}

function personalizationUnitCost(personalizations: ItemPersonalization[], quantity: number): number {
  return personalizations.reduce((sum, personalization) => {
    const total = personalization.total_cost || 0;
    return sum + (quantity > 0 ? Math.round((total / quantity) * 100) / 100 : 0);
  }, 0);
}

function QuoteItemRow({ item, index, hasPersonalizations }: { item: QuoteItem; index: number; hasPersonalizations: boolean }) {
  const personalizations = item.personalizations || [];
  const personalizationCost = personalizations.reduce((sum, personalization) => sum + calcPersTotal(personalization.total_cost || 0, item.quantity), 0);
  const itemTotal = item.quantity * item.unit_price + personalizationCost;
  return <tr className={`border-b border-border/50 transition-colors hover:bg-muted/40 ${index % 2 === 1 ? 'bg-muted/20' : ''}`}><ProductCell item={item} />{hasPersonalizations && <PersonalizationsCell personalizations={personalizations} />}<td className="p-3 text-center font-semibold text-sm w-20">{item.quantity}</td><td className="p-3 text-left text-muted-foreground tabular-nums w-28"><div className="flex flex-col gap-0.5"><span>{formatCurrency(item.unit_price + personalizationUnitCost(personalizations, item.quantity))}</span><PriceFreshnessBadge priceUpdatedAt={item.price_updated_at} thresholdDays={item.price_freshness_threshold_days} variant="compact" /></div></td><td className="p-3 text-left font-bold text-base tabular-nums w-32">{formatCurrency(itemTotal)}</td><td className="p-3 text-center print:hidden"><QuoteItemDetailSheet item={item} /></td></tr>;
}

function QuoteItemsBody({ kitGroups, looseItems, columnCount, hasPersonalizations }: { kitGroups: Map<string, { name: string; items: QuoteItem[] }>; looseItems: QuoteItem[]; columnCount: number; hasPersonalizations: boolean }) {
  return <tbody>{Array.from(kitGroups.entries()).map(([groupId, group]) => <React.Fragment key={groupId}><tr className="bg-accent/60 border-b border-border"><td colSpan={columnCount} className="p-3"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-primary" /><span className="font-bold text-sm text-primary">Kit: {group.name}</span><Badge variant="outline" className="text-xs ml-1">{group.items.length} itens</Badge></div></td></tr>{group.items.map((item, index) => <QuoteItemRow key={item.id || `item-${index}`} item={item} index={index} hasPersonalizations={hasPersonalizations} />)}</React.Fragment>)}{kitGroups.size > 0 && looseItems.length > 0 && <tr className="bg-muted/30 border-b border-border"><td colSpan={columnCount} className="p-2 px-3"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens Avulsos</span></td></tr>}{looseItems.map((item, index) => <QuoteItemRow key={item.id || `item-${index}`} item={item} index={index} hasPersonalizations={hasPersonalizations} />)}</tbody>;
}

export function QuoteItemsTable({ items }: QuoteItemsTableProps) {
  const hasPersonalizations = items.some(item => Boolean(item.personalizations?.length));
  const { kitGroups, looseItems } = groupQuoteItems(items);
  const columnCount = hasPersonalizations ? 6 : 5;
  return (
    <div>
      <h3 className="font-display font-semibold mb-4">Itens do Orçamento</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse">
          <thead><tr className="bg-primary/15"><th className="text-left p-3 font-semibold text-primary text-sm">Produto</th>{hasPersonalizations && <th className="text-left p-3 font-semibold text-primary text-sm">Personalização</th>}<th className="text-center p-3 font-semibold text-primary text-sm w-20">Qtd</th><th className="text-left p-3 font-semibold text-primary text-sm w-28">Unitário</th><th className="text-left p-3 font-semibold text-primary text-sm w-32">Total</th><th className="text-center p-3 font-semibold text-primary text-sm print:hidden w-24"></th></tr></thead>
          <QuoteItemsBody kitGroups={kitGroups} looseItems={looseItems} columnCount={columnCount} hasPersonalizations={hasPersonalizations} />
        </table>
      </div>
    </div>
  );
}
