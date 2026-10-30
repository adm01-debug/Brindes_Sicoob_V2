// src/components/simulator/ScenarioComparison.tsx
// Comparativo de Cenários A vs B

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GitCompare, 
  Save, 
  Trash2, 
  ArrowRight,
  Trophy,
  TrendingDown,
  Clock,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import type { SimulationOption, Product } from "@/types/simulation";

export interface SimulationScenario {
  id: string;
  name: string;
  productName: string;
  quantity: number;
  options: SimulationOption[];
  bestOption: SimulationOption | null;
  createdAt: Date;
}

interface ScenarioComparisonProps {
  scenarioA: SimulationScenario | null;
  scenarioB: SimulationScenario | null;
  currentSimulation: {
    options: SimulationOption[];
    product: Product | undefined;
    quantity: number;
    bestOption: SimulationOption | null;
  };
  onSaveAsScenario: (name: 'A' | 'B') => void;
  onClearScenario: (name: 'A' | 'B') => void;
}

function ScenarioSlot({ name, scenario, canSave, onSave, onClear }: { name: "A" | "B"; scenario: SimulationScenario | null; canSave: boolean; onSave: () => void; onClear: () => void }) {
  return <div className="space-y-2"><div className="flex items-center justify-between"><span className="font-semibold text-sm">Cenário {name}</span>{scenario ? <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={onClear}><Trash2 className="h-3 w-3 mr-1" />Limpar</Button> : null}</div>{scenario ? <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-3 rounded-lg bg-primary/10 border border-primary/30"><p className="font-medium text-sm truncate">{scenario.productName}</p><p className="text-xs text-muted-foreground">{scenario.quantity} un</p><div className="mt-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">Melhor:</span><span className="font-bold text-primary">{formatCurrency(scenario.bestOption?.grandTotal || 0)}</span></div></motion.div> : <Button variant="outline" className="w-full h-20 border-dashed" onClick={onSave} disabled={!canSave}><Save className="h-4 w-4 mr-2" />Salvar como {name}</Button>}</div>;
}

function optionTotal(scenario: SimulationScenario) {
  return scenario.bestOption?.grandTotal ?? 0;
}

function optionDays(scenario: SimulationScenario) {
  return scenario.bestOption?.estimatedDays ?? 0;
}

function calculateComparison(scenarioA: SimulationScenario, scenarioB: SimulationScenario) {
  const totalA = optionTotal(scenarioA);
  const totalB = optionTotal(scenarioB);
  return { priceDiff: totalB - totalA, priceDiffPercent: totalA ? ((totalB - totalA) / totalA) * 100 : 0, daysDiff: optionDays(scenarioB) - optionDays(scenarioA), winner: totalA <= totalB ? "A" as const : "B" as const };
}

type Comparison = ReturnType<typeof calculateComparison>;

function WinnerCard({ name, scenario, winner }: { name: "A" | "B"; scenario: SimulationScenario; winner: "A" | "B" }) {
  const isWinner = winner === name;
  return <div className={cn("p-3 rounded-lg transition-all", isWinner && "bg-success/20 ring-2 ring-success")}><p className="text-xs text-muted-foreground mb-1">Cenário {name}</p><p className="font-bold text-lg">{formatCurrency(scenario.bestOption?.grandTotal || 0)}</p><p className="text-xs text-muted-foreground">{scenario.bestOption?.estimatedDays}d</p>{isWinner ? <Badge className="mt-2 bg-success text-success-foreground"><Trophy className="h-3 w-3 mr-1" />Vencedor</Badge> : null}</div>;
}

function ComparisonDifference({ comparison }: { comparison: Comparison }) {
  let priceLabel = "Mesmo preço";
  if (comparison.priceDiff > 0) priceLabel = `A é ${Math.abs(comparison.priceDiffPercent).toFixed(1)}% mais barato`;
  else if (comparison.priceDiff < 0) priceLabel = `B é ${Math.abs(comparison.priceDiffPercent).toFixed(1)}% mais barato`;
  const daysLabel = comparison.daysDiff > 0 ? `A é ${comparison.daysDiff}d mais rápido` : `B é ${Math.abs(comparison.daysDiff)}d mais rápido`;
  return <div className="flex flex-col items-center justify-center"><ArrowRight className="h-6 w-6 text-muted-foreground" /><div className={cn("mt-2 px-3 py-1 rounded-full text-sm font-medium", comparison.priceDiff > 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>{comparison.priceDiff !== 0 ? <TrendingDown className="h-3 w-3 inline mr-1" /> : null}{priceLabel}</div>{comparison.daysDiff !== 0 ? <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{daysLabel}</div> : null}</div>;
}

function ComparisonResult({ scenarioA, scenarioB, comparison }: { scenarioA: SimulationScenario; scenarioB: SimulationScenario; comparison: Comparison }) {
  return <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-primary/10 border border-success/30"><div className="flex items-center gap-2 mb-3"><Trophy className="h-5 w-5 text-success" /><span className="font-semibold">Resultado da Comparação</span></div><div className="grid grid-cols-3 gap-4 text-center"><WinnerCard name="A" scenario={scenarioA} winner={comparison.winner} /><ComparisonDifference comparison={comparison} /><WinnerCard name="B" scenario={scenarioB} winner={comparison.winner} /></div>{comparison.priceDiff !== 0 ? <div className="mt-4 p-3 rounded-lg bg-card/50 text-center"><p className="text-sm text-muted-foreground">Economia escolhendo {comparison.winner}:</p><p className="text-2xl font-bold text-success">{formatCurrency(Math.abs(comparison.priceDiff))}</p></div> : null}</div></motion.div>;
}

function ComparisonHeader() {
  return <CardHeader className="pb-4"><div className="flex items-center justify-between flex-wrap gap-3"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><GitCompare className="h-5 w-5 text-muted-foreground" /></div><div><CardTitle className="text-lg flex items-center gap-2">Comparar Cenários<Badge variant="outline" className="text-xs gap-1"><Sparkles className="h-3 w-3" />Beta</Badge></CardTitle><CardDescription>Salve simulações para comparar lado a lado</CardDescription></div></div></div></CardHeader>;
}

export function ScenarioComparison({
  scenarioA,
  scenarioB,
  currentSimulation,
  onSaveAsScenario,
  onClearScenario,
}: ScenarioComparisonProps) {

  const canSave = currentSimulation.options.length > 0;

  const comparison = scenarioA && scenarioB ? calculateComparison(scenarioA, scenarioB) : null;

  return (
    <Card className="border-2 border-dashed border-muted-foreground/30">
      <ComparisonHeader />
      <CardContent className="space-y-4">
        {/* Save Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <ScenarioSlot name="A" scenario={scenarioA} canSave={canSave} onSave={() => onSaveAsScenario("A")} onClear={() => onClearScenario("A")} />
          <ScenarioSlot name="B" scenario={scenarioB} canSave={canSave} onSave={() => onSaveAsScenario("B")} onClear={() => onClearScenario("B")} />
        </div>

        {/* Comparison Result */}
        <AnimatePresence>
          {comparison && scenarioA && scenarioB ? <ComparisonResult scenarioA={scenarioA} scenarioB={scenarioB} comparison={comparison} /> : null}
        </AnimatePresence>

        {/* Empty state hint */}
        {!scenarioA && !scenarioB && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <p>Salve duas simulações diferentes para comparar qual oferece melhor custo-benefício</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
