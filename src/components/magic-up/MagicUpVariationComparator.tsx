import { type KeyboardEvent, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariationItem } from "@/hooks/useMagicUpState";

interface MagicUpVariationComparatorProps {
  variations: VariationItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onSelectWinner: (index: number) => void;
  loadingWinnerIndex?: number | null;
}

function resolveScore(variation: VariationItem): number | null {
  if (typeof variation.qualityDiagnosis?.total === "number") return variation.qualityDiagnosis.total;
  if (typeof variation.qualityScore === "number") return variation.qualityScore;
  return null;
}

function nextIndexForKey(key: string, currentIndex: number, total: number): number | null {
  if (key === "ArrowRight" || key === "ArrowDown") return (currentIndex + 1) % total;
  if (key === "ArrowLeft" || key === "ArrowUp") return (currentIndex - 1 + total) % total;
  if (key === "Home") return 0;
  if (key === "End") return total - 1;
  return null;
}

function focusVariation(card: HTMLButtonElement | null | undefined) {
  card?.focus();
  if (!card || typeof card.scrollIntoView !== "function") return;
  const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  card.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
}

function WinnerButton({ index, loading, onSelect }: { index: number; loading: boolean; onSelect: () => void }) {
  return <Button size="sm" variant="ghost" data-testid={`variation-winner-button-${index + 1}`} data-variation-index={index} className="h-6 w-full text-[11px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100" aria-label={`Marcar variação ${index + 1} como vencedora`} aria-busy={loading || undefined} disabled={loading} onClick={onSelect}>{loading ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /><span className="sr-only">Marcando vencedora…</span>Marcar vencedora</span> : "Marcar vencedora"}</Button>;
}

function VariationImage({ variation, index, winner }: { variation: VariationItem; index: number; winner: boolean }) {
  return <div className="relative aspect-square bg-muted"><img src={variation.imageUrl} alt={`Variação ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />{winner && <Badge className="absolute left-1 top-1 text-[10px]" aria-label="Melhor score">Melhor score</Badge>}</div>;
}

function VariationScore({ index, score }: { index: number; score: number | null | undefined }) {
  if (score === null || score === undefined) return <div className="space-y-1 p-2"><div className="flex items-center justify-between gap-1"><span className="text-xs font-medium">Variação {index + 1}</span><span className="text-xs font-semibold text-primary" aria-label="Score indisponível">—</span></div></div>;
  return <div className="space-y-1 p-2"><div className="flex items-center justify-between gap-1"><span className="text-xs font-medium">Variação {index + 1}</span><span className="text-xs font-semibold text-primary" aria-label={`Score ${score} de 100`}>{score}</span></div></div>;
}

function variationAriaLabel(index: number, score: number | null | undefined, winner: boolean): string {
  let label = `Selecionar variação ${index + 1}`;
  if (score !== null && score !== undefined) label += `, score ${score}`;
  if (winner) label += ", melhor score";
  return label;
}

function VariationCard({ variation, index, score, active, winner, loading, cardRef, onSelect, onKeyDown, onSelectWinner }: { variation: VariationItem; index: number; score: number | null | undefined; active: boolean; winner: boolean; loading: boolean; cardRef: (element: HTMLButtonElement | null) => void; onSelect: () => void; onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void; onSelectWinner: () => void }) {
  const activeValue = String(active);
  const winnerValue = String(winner);
  return <div role="listitem" data-testid={`variation-item-${index + 1}`} data-variation-index={index} className={cn("overflow-hidden rounded-lg border", active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40")}><button ref={cardRef} type="button" data-testid={`variation-card-${index + 1}`} data-variation-index={index} data-active={activeValue} data-winner={winnerValue} aria-pressed={active} aria-current={active ? "true" : undefined} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End" aria-label={variationAriaLabel(index, score, winner)} onClick={onSelect} onKeyDown={onKeyDown} className="group block w-full text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><VariationImage variation={variation} index={index} winner={winner} /><VariationScore index={index} score={score} /></button><div className="px-2 pb-2"><WinnerButton index={index} loading={loading} onSelect={onSelectWinner} /></div></div>;
}

export function MagicUpVariationComparator({ variations, activeIndex, onSelect, onSelectWinner, loadingWinnerIndex = null }: MagicUpVariationComparatorProps) {
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  if (variations.length < 2) return null;
  const scores = variations.map(resolveScore);
  const numericScores = scores.filter((s): s is number => s !== null);
  const bestScore: number | null = numericScores.length > 0 ? Math.max(...numericScores) : null;
  const explicitWinnerIndex = variations.findIndex((variation) => variation.isWinner);
  const winnerIndex = explicitWinnerIndex >= 0
    ? explicitWinnerIndex
    : (bestScore !== null ? scores.findIndex((s) => s === bestScore) : -1);

  const handleArrowKey = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const nextIndex = nextIndexForKey(event.key, currentIndex, variations.length);
    if (nextIndex === null) return;
    event.preventDefault();
    onSelect(nextIndex);
    focusVariation(cardRefs.current[nextIndex]);
  };

  return (
    <section data-testid="magic-up-variation-comparator" className="rounded-lg border bg-card p-3" aria-label="Comparador de variações">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Comparar variações</p>
        <Badge variant="secondary" aria-label={`Melhor score entre variações: ${bestScore !== null ? bestScore : "indisponível"}`}>Melhor score: {bestScore !== null ? bestScore : "—"}</Badge>
      </div>
      <div role="list" data-testid="variation-list" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {variations.map((variation, index) => <VariationCard key={`${variation.id || variation.imageUrl}-${index}`} variation={variation} index={index} score={scores[index]} active={index === activeIndex} winner={index === winnerIndex} loading={loadingWinnerIndex === index} cardRef={element => { cardRefs.current[index] = element; }} onSelect={() => onSelect(index)} onKeyDown={event => handleArrowKey(event, index)} onSelectWinner={() => onSelectWinner(index)} />)}
      </div>
    </section>
  );
}
