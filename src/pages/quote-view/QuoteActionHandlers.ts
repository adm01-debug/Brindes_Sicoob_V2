/**
 * QuoteViewPage action handlers — extracted for modularity
 */
import { formatCurrency, formatCNPJ } from "@/lib/format";

export { formatCurrency, formatCNPJ };

export function calcPersTotal(totalCost: number, qty: number): number {
  if (qty <= 0) return totalCost;
  const roundedUnit = Math.round((totalCost / qty) * 100) / 100;
  return Math.round(roundedUnit * qty * 100) / 100;
}
