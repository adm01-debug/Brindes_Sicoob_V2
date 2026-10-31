/**
 * StepComparison - Passo 4: Comparativo de Técnicas
 * Refatorado: ComparisonCard e ConfirmedSummary extraídos
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, ChevronLeft, AlertTriangle, Check, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';
import type { TechniqueComparisonResult } from '@/types/domain/simulator-wizard';
import { ComparisonCard } from './ComparisonCard';
import { ConfirmedSummary } from './ConfirmedSummary';

interface StepComparisonProps {
  wizard: UseSimulatorWizardReturn;
}

function useComparisonSelection(wizard: UseSimulatorWizardReturn, availableResults: TechniqueComparisonResult[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleTechnique = useCallback((result: TechniqueComparisonResult) => {
    if (!result.isAvailable) return;
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(result.techniqueId)) next.delete(result.techniqueId);
      else next.add(result.techniqueId);
      return next;
    });
  }, []);
  const selectAll = useCallback(() => {
    setSelectedIds((previous) => previous.size === availableResults.length ? new Set() : new Set(availableResults.map((result) => result.techniqueId)));
  }, [availableResults]);
  const confirm = useCallback(() => {
    const selected = availableResults.filter((result) => selectedIds.has(result.techniqueId));
    if (selected.length === 0) return;
    selected.forEach((result) => wizard.confirmTechnique(result));
    setSelectedIds(new Set());
  }, [availableResults, selectedIds, wizard]);
  return { selectedIds, toggleTechnique, selectAll, confirm };
}

function ComparisonHeader({ available, unavailable, selectedIds, onSelectAll, onChangeSpecs }: { available: TechniqueComparisonResult[]; unavailable: TechniqueComparisonResult[]; selectedIds: Set<string>; onSelectAll: () => void; onChangeSpecs: () => void }) {
  const availableLabel = available.length === 1 ? "opção disponível" : "opções disponíveis";
  return (
    <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5"><BarChart3 className="h-6 w-6 text-primary" /></div><div><h3 className="font-display text-xl font-bold">Comparativo de Técnicas</h3><p className="text-muted-foreground">{available.length} {availableLabel}{unavailable.length > 0 ? ` • ${unavailable.length} indisponível` : ""}{selectedIds.size > 0 ? ` • ${selectedIds.size} selecionada${selectedIds.size > 1 ? "s" : ""}` : ""}</p></div></div>
      <div className="flex items-center gap-2">{available.length > 1 ? <Button variant="outline" size="sm" className="gap-2" onClick={onSelectAll}>{selectedIds.size === available.length ? "Desmarcar Todas" : "Selecionar Todas"}</Button> : null}<Button variant="ghost" size="sm" className="gap-2" onClick={onChangeSpecs}><RefreshCw className="h-4 w-4" />Alterar Specs</Button></div>
    </div>
  );
}

function AvailableComparisons({ results, selectedIds, quantity, onSelect }: { results: TechniqueComparisonResult[]; selectedIds: Set<string>; quantity: number; onSelect: (result: TechniqueComparisonResult) => void }) {
  const maxPrice = results.length > 1 ? Math.max(...results.map((result) => result.totalPrice)) : 0;
  return <AnimatePresence mode="popLayout">{results.map((result, index) => <motion.div key={result.techniqueId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}><ComparisonCard result={result} onSelect={onSelect} quantity={quantity} isFirst={index === 0} maxPrice={maxPrice} isSelected={selectedIds.has(result.techniqueId)} /></motion.div>)}</AnimatePresence>;
}

function UnavailableComparisons({ results }: { results: TechniqueComparisonResult[] }) {
  if (results.length === 0) return null;
  return <><div className="flex items-center gap-4 pt-4"><div className="flex-1 h-px bg-border" /><span className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Indisponíveis</span><div className="flex-1 h-px bg-border" /></div>{results.map((result) => <motion.div key={result.techniqueId} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} className="p-5 rounded-2xl bg-muted/30 border border-dashed"><div className="flex items-center justify-between"><div><p className="font-semibold text-muted-foreground">{result.techniqueName}</p><Badge variant="outline" className="text-xs font-mono mt-1">{result.techniqueCode}</Badge></div><Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{result.unavailableReason}</Badge></div></motion.div>)}</>;
}

function SelectionBar({ selectedIds, results, onConfirm }: { selectedIds: Set<string>; results: TechniqueComparisonResult[]; onConfirm: () => void }) {
  if (selectedIds.size === 0) return null;
  const total = results.filter((result) => selectedIds.has(result.techniqueId)).reduce((sum, result) => sum + result.totalPrice, 0);
  const suffix = selectedIds.size > 1 ? "s" : "";
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="sticky bottom-4 z-10"><div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-2xl shadow-primary/40 border border-primary/30"><div><p className="font-bold text-base">{selectedIds.size} técnica{suffix} selecionada{suffix}</p><p className="text-sm text-primary-foreground/80">Total combinado: {formatCurrency(total)}</p></div><Button size="lg" className="gap-2 font-bold bg-white text-primary hover:bg-primary/5 shadow-lg" onClick={onConfirm}><Check className="h-5 w-5" />Confirmar Seleção</Button></div></motion.div>;
}

async function copyComparisonResult(wizard: UseSimulatorWizardReturn) {
  const personalizations = wizard.personalizations.map((personalization, index) => `${index + 1}. ${personalization.technique.name} | ${personalization.location.locationName} | ${personalization.specs.colors} ${personalization.specs.colors === 1 ? "cor" : "cores"} | ${personalization.specs.width}×${personalization.specs.height}cm | ${formatCurrency(personalization.pricing.totalPrice)} (${formatCurrency(personalization.pricing.costPerUnit)}/un) | Cód: ${personalization.pricing.budgetCode}`).join("\n");
  const deadline = wizard.totals.maxDays > 0 ? `~${wizard.totals.maxDays} dias úteis` : "A consultar";
  const text = `📦 SIMULAÇÃO DE PERSONALIZAÇÃO\n━━━━━━━━━━━━━━━━━━━━━━\n🏷️ ${wizard.selectedProduct?.name} (${wizard.selectedProduct?.sku})\n📊 ${wizard.quantity} unidades × ${formatCurrency(wizard.effectivePrice)}\n\n🎨 PERSONALIZAÇÕES:\n${personalizations}\n\n💰 Produto: ${formatCurrency(wizard.totals.productTotal)}\n🎨 Gravações: ${formatCurrency(wizard.totals.customizationTotal)}\n━━━━━━━━━━━━━━━━━━━━━━\n✅ TOTAL: ${formatCurrency(wizard.totals.grandTotal)} (${formatCurrency(wizard.totals.grandTotalPerUnit)}/un)\n⏱️ Prazo: ${deadline}`;
  await navigator.clipboard.writeText(text);
  toast.success("Copiado!");
}

function ConfirmedComparison({ wizard, onGenerateQuote }: { wizard: UseSimulatorWizardReturn; onGenerateQuote: () => void }) {
  return <div className="max-w-5xl mx-auto space-y-8"><ConfirmedSummary wizard={wizard} onAddAnother={() => wizard.startNewPersonalization()} onGenerateQuote={onGenerateQuote} onCopy={() => copyComparisonResult(wizard)} /></div>;
}

function EmptyComparison({ onBack }: { onBack: () => void }) {
  return <div className="max-w-4xl mx-auto text-center py-16"><BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" /><p className="text-muted-foreground text-lg mb-4">Nenhum comparativo disponível</p><Button onClick={onBack} variant="outline">Voltar para Especificações</Button></div>;
}

export function StepComparison({ wizard }: StepComparisonProps) {
  const navigate = useNavigate();
  const { comparisonResults } = wizard;
  const availableResults = comparisonResults.filter(r => r.isAvailable);
  const unavailableResults = comparisonResults.filter(r => !r.isAvailable);
  const selection = useComparisonSelection(wizard, availableResults);

  const handleGenerateQuote = () => {
    const quoteData = {
      product: wizard.selectedProduct, quantity: wizard.quantity,
      personalizations: wizard.personalizations, totals: wizard.totals,
    };
    navigate('/orcamentos/novo', { state: { fromSimulator: true, simulationData: quoteData } });
    toast.success('Redirecionando para o orçamento...');
  };

  const hasPersonalizations = wizard.personalizations.length > 0;

  if (hasPersonalizations && comparisonResults.length === 0) return <ConfirmedComparison wizard={wizard} onGenerateQuote={handleGenerateQuote} />;
  if (comparisonResults.length === 0) return <EmptyComparison onBack={() => wizard.setStep("specs")} />;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <ComparisonHeader available={availableResults} unavailable={unavailableResults} selectedIds={selection.selectedIds} onSelectAll={selection.selectAll} onChangeSpecs={() => wizard.setStep("specs")} />

      {/* Results */}
      <div className="space-y-4">
        <AvailableComparisons results={availableResults} selectedIds={selection.selectedIds} quantity={wizard.quantity} onSelect={selection.toggleTechnique} />
        <UnavailableComparisons results={unavailableResults} />
      </div>

      {/* Confirm Selection Bar */}
      <AnimatePresence>
        <SelectionBar selectedIds={selection.selectedIds} results={availableResults} onConfirm={selection.confirm} />
      </AnimatePresence>

      {/* Navigation */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-between pt-6">
        <Button variant="ghost" size="lg" onClick={wizard.previousStep} className="gap-2">
          <ChevronLeft className="h-5 w-5" />Alterar Especificações
        </Button>
      </motion.div>
    </div>
  );
}
