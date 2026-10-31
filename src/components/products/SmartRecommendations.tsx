/**
 * SmartRecommendations — Carrossel contextual de produtos recomendados pela IA.
 *
 * Uso típico: páginas de detalhe/catálogo. Recebe `currentProductId` + `category`
 * e produtos candidatos, dispara `useAIRecommendations` automaticamente e exibe
 * um carrossel horizontal compacto.
 *
 * - Skeleton elegante durante carregamento
 * - Fallback silencioso se IA falhar (não polui UX)
 * - Limite configurável (`maxResults`)
 */
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useAIRecommendations,
  type ClientProfile,
  type ProductForRecommendation,
} from "@/hooks/useAIRecommendations";

// ============================================
// PROPS
// ============================================

export interface SmartRecommendationsProps {
  /** ID do produto sendo visualizado (será excluído das recomendações). */
  currentProductId?: string;
  /** Lista de produtos candidatos (mesma categoria, marca, etc). */
  candidateProducts: ProductForRecommendation[];
  /** Perfil do cliente (opcional — sem ele, recomendações são genéricas). */
  client?: ClientProfile;
  /** Quantidade máxima de cards. Default: 4. */
  maxResults?: number;
  /** Título exibido no header. */
  title?: string;
  /** Callback ao clicar em um produto. */
  onProductClick?: (productId: string) => void;
  className?: string;
}

// ============================================
// SUB-COMPONENTES
// ============================================

interface MiniCardProps {
  product: ProductForRecommendation;
  score: number;
  reason: string;
  onClick?: () => void;
}

function MiniCard({ product, score, reason, onClick }: MiniCardProps) {
  const scorePct = Math.round(score * 100);
  const interactive = Boolean(onClick);

  return (
    <Card
      className={cn(
        "min-w-[240px] max-w-[240px] shrink-0 border-[1.5px] border-border rounded-xl overflow-hidden",
        "animate-fade-in transition-all duration-200",
        interactive && "cursor-pointer hover:border-primary hover:shadow-md hover:-translate-y-0.5"
      )}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      aria-label={interactive ? `Ver ${product.name}` : undefined}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold font-display line-clamp-2 flex-1">{product.name}</h4>
          <span
            className="shrink-0 rounded-full border-[1.5px] border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] font-bold text-primary font-display"
            aria-label={`Score ${scorePct} por cento`}
          >
            {scorePct}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-display line-clamp-3">{reason}</p>
      </CardContent>
    </Card>
  );
}

function CarouselSkeleton({ count }: { count: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="min-w-[240px] max-w-[240px] shrink-0 border-[1.5px] border-border rounded-xl">
          <CardContent className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type Recommendation = ReturnType<typeof useAIRecommendations>["recommendations"][number];

function CarouselControls({ visible, scrollBy }: { visible: boolean; scrollBy: (delta: number) => void }) {
  if (!visible) return null;
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollBy(-260)} aria-label="Rolar para a esquerda"><ChevronLeft className="h-4 w-4" /></Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollBy(260)} aria-label="Rolar para a direita"><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );
}

function RecommendationList({ isLoading, maxResults, recommendations, productMap, onProductClick }: { isLoading: boolean; maxResults: number; recommendations: Recommendation[]; productMap: Map<string, ProductForRecommendation>; onProductClick?: (productId: string) => void }) {
  if (isLoading) return <CarouselSkeleton count={Math.min(maxResults, 4)} />;
  return recommendations.map((recommendation) => {
    const product = productMap.get(recommendation.productId);
    if (!product) return null;
    const onClick = onProductClick ? () => onProductClick(recommendation.productId) : undefined;
    return <div key={recommendation.productId} className="snap-start" role="listitem"><MiniCard product={product} score={recommendation.score} reason={recommendation.reason} onClick={onClick} /></div>;
  });
}

interface RecommendationVisibility {
  candidateCount: number;
  isLoading: boolean;
  hasError: boolean;
  hasData: boolean;
  visibleCount: number;
}

function shouldHideRecommendations({ candidateCount, isLoading, hasError, hasData, visibleCount }: RecommendationVisibility) {
  if (candidateCount === 0) return true;
  if (!isLoading && hasError) return true;
  return !isLoading && hasData && visibleCount === 0;
}

interface RecommendationCarouselProps {
  title: string;
  className?: string;
  isLoading: boolean;
  maxResults: number;
  recommendations: Recommendation[];
  productMap: Map<string, ProductForRecommendation>;
  onProductClick?: (productId: string) => void;
  scrollerRef: RefObject<HTMLDivElement>;
}

function RecommendationCarousel({ title, className, isLoading, maxResults, recommendations, productMap, onProductClick, scrollerRef }: RecommendationCarouselProps) {
  const scrollBy = (delta: number) => scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  return (
    <section className={cn("space-y-3 font-display animate-fade-in", className)} aria-label={title}>
      <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /><h3 className="text-base font-semibold text-foreground">{title}</h3></div><CarouselControls visible={!isLoading && recommendations.length > 1} scrollBy={scrollBy} /></div>
      <div ref={scrollerRef} className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin" role="list"><RecommendationList isLoading={isLoading} maxResults={maxResults} recommendations={recommendations} productMap={productMap} onProductClick={onProductClick} /></div>
    </section>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function SmartRecommendations({ currentProductId, candidateProducts, client, maxResults = 4, title = "Recomendações inteligentes", onProductClick, className }: SmartRecommendationsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { data, recommendations, isLoading, error, fetchRecommendations } = useAIRecommendations();

  // Filtra o produto atual da lista de candidatos
  const filteredCandidates = useMemo(
    () => candidateProducts.filter((p) => p.id !== currentProductId),
    [candidateProducts, currentProductId]
  );

  // Mapa rápido para resolver produto por ID
  const productMap = useMemo(() => {
    const map = new Map<string, ProductForRecommendation>();
    filteredCandidates.forEach((p) => map.set(p.id, p));
    return map;
  }, [filteredCandidates]);
  const candidateIds = useMemo(() => filteredCandidates.map((product) => product.id).join(","), [filteredCandidates]);

  // Dispara IA quando candidatos mudam
  useEffect(() => {
    if (filteredCandidates.length === 0) return;

    const profile: ClientProfile = client ?? {
      name: "Cliente genérico",
      industry: filteredCandidates[0]?.category,
    };

    fetchRecommendations(profile, filteredCandidates);
  }, [candidateIds, client, fetchRecommendations, filteredCandidates]);

  const visibleRecs = useMemo(
    () => recommendations.slice(0, maxResults),
    [recommendations, maxResults]
  );

  // Fallback silencioso: nada para mostrar
  if (shouldHideRecommendations({ candidateCount: filteredCandidates.length, isLoading, hasError: Boolean(error), hasData: Boolean(data), visibleCount: visibleRecs.length })) return null;

  return <RecommendationCarousel title={title} className={className} isLoading={isLoading} maxResults={maxResults} recommendations={visibleRecs} productMap={productMap} onProductClick={onProductClick} scrollerRef={scrollerRef} />;
}
