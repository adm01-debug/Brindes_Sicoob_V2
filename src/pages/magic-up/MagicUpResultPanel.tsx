/**
 * MagicUp Result Panel — Right side with generated image variations
 */
import { useRef, type KeyboardEvent, type MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AdImageResult } from '@/components/magic-up/AdImageResult';
import { MagicUpVariationComparator } from '@/components/magic-up/MagicUpVariationComparator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { useMagicUpState } from '@/hooks/useMagicUpState';

type MagicUpStateReturn = ReturnType<typeof useMagicUpState>;

interface MagicUpResultPanelProps {
  m: MagicUpStateReturn;
}

function nextVariationIndex(key: string, currentIndex: number, total: number) {
  if (key === 'ArrowRight' || key === 'ArrowDown')
    return currentIndex < total - 1 ? currentIndex + 1 : null;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return currentIndex > 0 ? currentIndex - 1 : null;
  if (key === 'Home') return 0;
  if (key === 'End') return total - 1;
  return undefined;
}

function handleVariationKey(
  event: KeyboardEvent<HTMLButtonElement>,
  currentIndex: number,
  refs: MutableRefObject<(HTMLButtonElement | null)[]>,
  state: MagicUpStateReturn,
) {
  if (state.variations.length < 2) return;
  const nextIndex = nextVariationIndex(event.key, currentIndex, state.variations.length);
  if (nextIndex === undefined) return;
  event.preventDefault();
  if (nextIndex === null) return;
  state.setActiveVariation(nextIndex);
  refs.current[nextIndex]?.focus();
}

function VariationDots({ state }: { state: MagicUpStateReturn }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex flex-wrap items-center justify-center gap-3"
        role="tablist"
        aria-label="Variações geradas"
        data-testid="magic-up-dots-container"
      >
        {state.variations.map((_, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <button
                ref={(element) => {
                  refs.current[index] = element;
                }}
                onClick={() => state.setActiveVariation(index)}
                onKeyDown={(event) => handleVariationKey(event, index, refs, state)}
                aria-label={`Selecionar variação ${index + 1}`}
                aria-describedby={`magic-up-dot-tooltip-${index}`}
                aria-current={index === state.activeVariation ? 'true' : undefined}
                aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
                role="tab"
                aria-selected={index === state.activeVariation}
                tabIndex={index === state.activeVariation ? 0 : -1}
                className="group relative -mx-[18px] -my-[18px] inline-flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'block h-2 rounded-full transition-all',
                    index === state.activeVariation
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-muted-foreground/30 group-hover:bg-muted-foreground/50',
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent id={`magic-up-dot-tooltip-${index}`} side="top">
              Variação {index + 1}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

function VariationNavigation({ state }: { state: MagicUpStateReturn }) {
  if (state.variations.length <= 1) return null;
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="icon"
        aria-label="Voltar"
        className="h-8 w-8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
        disabled={state.activeVariation === 0}
        onClick={() => state.setActiveVariation(state.activeVariation - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <VariationDots state={state} />
      <Button
        variant="outline"
        size="icon"
        aria-label="Avançar"
        className="h-8 w-8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
        disabled={state.activeVariation === state.variations.length - 1}
        onClick={() => state.setActiveVariation(state.activeVariation + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function VariationThumbnails({ state }: { state: MagicUpStateReturn }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  if (state.variations.length <= 1) return null;
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Miniaturas das variações"
    >
      {state.variations.map((variation, index) => (
        <button
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          onClick={() => state.setActiveVariation(index)}
          onKeyDown={(event) => handleVariationKey(event, index, refs, state)}
          aria-label={`Abrir miniatura da variação ${index + 1}`}
          aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
          role="tab"
          aria-selected={index === state.activeVariation}
          tabIndex={index === state.activeVariation ? 0 : -1}
          className={cn(
            'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            index === state.activeVariation
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-primary/40',
          )}
        >
          <img
            src={variation.imageUrl}
            alt={`Variação ${index + 1}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
}

function currentImageUrl(state: MagicUpStateReturn) {
  return state.currentVariation?.imageUrl || null;
}

function favoriteAction(state: MagicUpStateReturn) {
  return state.currentVariation?.id ? state.handleToggleFavorite : undefined;
}

function currentFavorite(state: MagicUpStateReturn) {
  return state.currentVariation?.isFavorite;
}

function currentQualityDiagnosis(state: MagicUpStateReturn) {
  return state.currentVariation?.qualityDiagnosis || state.qualityDiagnosis;
}

function currentCurationStatus(state: MagicUpStateReturn) {
  return state.currentVariation?.curationStatus || state.curationStatus;
}

function MagicImageResult({ state }: { state: MagicUpStateReturn }) {
  return (
    <AdImageResult
      imageUrl={currentImageUrl(state)}
      isLoading={state.generating}
      productName={state.selectedProduct?.name}
      sceneName={state.selectedScene?.title}
      onDownload={state.handleDownload}
      onShare={state.handleShare}
      onRegenerate={state.handleGenerate}
      onToggleFavorite={favoriteAction(state)}
      isFavorite={currentFavorite(state)}
      history={state.history}
      onSelectHistory={state.handleSelectHistory}
      onDeleteHistory={state.handleDeleteHistory}
      onToggleHistoryFavorite={state.handleToggleHistoryFavorite}
      qualityScore={state.qualityScore}
      qualityDiagnosis={currentQualityDiagnosis(state)}
      curationStatus={currentCurationStatus(state)}
      onSetCurationStatus={state.handleSetCurationStatus}
      onRunQualityScore={state.handleRunQualityScore}
      copyPack={state.copyPack}
      aspectRatio={state.creativeControls.aspectRatio}
    />
  );
}

export function MagicUpResultPanel({ m }: MagicUpResultPanelProps) {
  const totalVariations = m.variations.length;
  const liveAnnouncement =
    totalVariations > 1
      ? `Variação ${m.activeVariation + 1} de ${totalVariations} selecionada`
      : '';

  return (
    <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
      {/* Live region para leitores de tela: anuncia troca de variação (WCAG 4.1.3) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="magic-up-variation-live-region"
      >
        {liveAnnouncement}
      </div>

      <VariationNavigation state={m} />
      <MagicImageResult state={m} />

      <MagicUpVariationComparator
        variations={m.variations}
        activeIndex={m.activeVariation}
        onSelect={m.setActiveVariation}
        onSelectWinner={m.handleSelectWinningVariation}
      />

      <VariationThumbnails state={m} />
    </div>
  );
}
