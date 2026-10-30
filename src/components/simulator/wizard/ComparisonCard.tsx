/**
 * ComparisonCard — Card individual de técnica no comparativo
 * Extraído de StepComparison.tsx
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Clock, DollarSign, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { TechniqueComparisonResult } from '@/types/domain/simulator-wizard';

interface ComparisonCardProps {
  result: TechniqueComparisonResult;
  onSelect: (r: TechniqueComparisonResult) => void;
  quantity: number;
  isFirst: boolean;
  maxPrice: number;
  isSelected: boolean;
}

function SelectionIndicator({ selected }: { selected: boolean }) {
  return <motion.div className={cn("mt-0.5 w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all", selected ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50")} animate={selected ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 0.25 }}>{selected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}><Check className="h-5 w-5 text-primary-foreground" /></motion.div>}</motion.div>;
}

function TechniqueBadges({ result, savingsPercent }: { result: TechniqueComparisonResult; savingsPercent: number }) {
  return <div className="flex items-center gap-3 flex-wrap mb-1"><h4 className="font-bold text-xl">{result.techniqueName}</h4><Badge variant="outline" className="text-xs font-mono">{result.techniqueCode}</Badge>{result.isCheapest && <Badge className="bg-gradient-to-r from-warning to-orange text-primary-foreground border-0 gap-1.5 px-3 py-1 shadow-lg shadow-amber-500/25 text-sm"><Trophy className="h-4 w-4" />Melhor Custo-Benefício</Badge>}{result.isFastest && <Badge variant="secondary" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Mais Rápido</Badge>}{savingsPercent > 0 && <Badge variant="outline" className="gap-1 text-primary border-primary dark:text-primary dark:border-primary">↓ {savingsPercent}% vs mais caro</Badge>}</div>;
}

function TechniquePrice({ result }: { result: TechniqueComparisonResult }) {
  return <div className="flex items-center gap-6 mt-3"><div className="flex items-baseline gap-1.5"><DollarSign className="h-5 w-5 text-primary self-center" /><span className="font-extrabold text-2xl text-primary">{formatCurrency(result.unitPrice)}</span><span className="text-muted-foreground text-sm font-medium">/un</span></div>{result.productionDays && <div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" /><span className="font-semibold">{result.productionDays}</span><span className="text-sm">dias</span></div>}</div>;
}

function TechnicalBadges({ result }: { result: TechniqueComparisonResult }) {
  return <div className="flex flex-wrap gap-2 mt-2">{result.budgetCode && <Badge variant="secondary" className="text-xs font-mono gap-1">📋 {result.budgetCode}</Badge>}{result.minimumApplied && <Badge variant="outline" className="text-xs text-warning border-warning/30 dark:text-warning dark:border-warning/40">Faturamento mínimo aplicado</Badge>}{result.maxColors !== null && <Badge variant="outline" className="text-xs">Máx {result.maxColors} cores</Badge>}<Badge variant="outline" className="text-xs">Faixa {result.tierUsed} ({result.tierMinQty}-{result.tierMaxQty || "∞"} un.)</Badge>{result.setupPrice > 0 && <Badge variant="outline" className="text-xs">Setup: {formatCurrency(result.setupPrice)}</Badge>}</div>;
}

function TechnicalDetails({ result, open, onToggle }: { result: TechniqueComparisonResult; open: boolean; onToggle: () => void }) {
  return <div className="mt-3"><button type="button" onClick={event => { event.stopPropagation(); onToggle(); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"><ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />Detalhes técnicos</button><AnimatePresence>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"><TechnicalBadges result={result} /></motion.div>}</AnimatePresence></div>;
}

function TotalPrice({ result }: { result: TechniqueComparisonResult }) {
  return <div className="text-right shrink-0"><div className="p-4 rounded-2xl bg-muted/50 group-hover:bg-primary/5 transition-colors min-w-[140px]"><p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Total</p><p className="text-2xl font-bold text-primary">{formatCurrency(result.totalPrice)}</p><p className="text-xs text-muted-foreground mt-1">{formatCurrency(result.costPerUnit)}/un</p></div></div>;
}

function calculateSavings(result: TechniqueComparisonResult, maxPrice: number): number {
  if (maxPrice <= 0 || result.totalPrice >= maxPrice) return 0;
  return Math.round(((maxPrice - result.totalPrice) / maxPrice) * 100);
}

export function ComparisonCard({ result, onSelect, isFirst, maxPrice, isSelected }: ComparisonCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isBestValue = result.isCheapest;
  const savingsPercent = calculateSavings(result, maxPrice);

  return (
    <div className="relative">
      {isBestValue && !isSelected && <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-warning/40 via-primary/30 to-warning/40 blur-sm pointer-events-none" />}
      <button
        onClick={() => onSelect(result)}
        className={cn(
          'relative w-full p-6 rounded-2xl text-left transition-all duration-300 group',
          'bg-card border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10',
          isSelected && 'ring-2 ring-primary border-primary/50 shadow-lg shadow-primary/10',
          !isSelected && isBestValue && 'ring-2 ring-warning/50 border-warning/30 shadow-lg shadow-warning/10',
          !isSelected && !isBestValue && isFirst && 'ring-1 ring-primary/20'
        )}
      >
        <div className="flex items-start justify-between gap-5">
          <SelectionIndicator selected={isSelected} />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <TechniqueBadges result={result} savingsPercent={savingsPercent} />
            <TechniquePrice result={result} />
            <TechnicalDetails result={result} open={showDetails} onToggle={() => setShowDetails(open => !open)} />
          </div>

          <TotalPrice result={result} />
        </div>
      </button>
    </div>
  );
}
