/**
 * AIRecommendationsPanel — Painel completo de recomendações de IA.
 *
 * Consome o hook `useAIRecommendations` (já existente) e apresenta:
 * - Form de perfil do cliente (colapsável)
 * - Lista de produtos selecionada (resumo)
 * - Botão para gerar recomendações
 * - Grid de cards com produto, score (%), motivo
 * - Bloco de insights gerais
 * - Estados: loading, error, empty
 *
 * Tokens: Outfit, var(--primary), border-[1.5px], rounded-xl, animate-fade-in.
 */
import { useState, useCallback, useMemo, type ChangeEvent } from "react";
import { Sparkles, AlertCircle, RefreshCcw, TrendingUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSection } from "@/components/ui/FormSection";
import { cn } from "@/lib/utils";
import {
  useAIRecommendations,
  type ClientProfile,
  type ProductForRecommendation,
  type Recommendation,
} from "@/hooks/useAIRecommendations";

// ============================================
// PROPS
// ============================================

export interface AIRecommendationsPanelProps {
  /** Lista de produtos disponíveis para serem rankeados pela IA. */
  products: ProductForRecommendation[];
  /** Perfil inicial do cliente (opcional, pode ser editado pelo usuário). */
  initialClient?: Partial<ClientProfile>;
  /** Callback quando usuário clica num produto recomendado. */
  onProductClick?: (productId: string) => void;
  /** Esconde o formulário (modo "auto" — usa initialClient direto). */
  hideClientForm?: boolean;
  className?: string;
}

// ============================================
// SUB-COMPONENTES
// ============================================

interface RecommendationCardProps {
  product: ProductForRecommendation;
  score: number;
  reason: string;
  rank: number;
  onClick?: () => void;
}

function RecommendationCard({ product, score, reason, rank, onClick }: RecommendationCardProps) {
  const scorePct = Math.round(score * 100);
  const interactive = Boolean(onClick);

  return (
    <Card
      className={cn(
        "border-[1.5px] border-border rounded-xl overflow-hidden animate-fade-in transition-all duration-200",
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
      aria-label={interactive ? `Ver produto ${product.name}` : undefined}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-bold font-display",
                rank <= 3
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border"
              )}
              aria-label={`Posição ${rank}`}
            >
              {rank}
            </span>
            <CardTitle className="text-base font-display truncate">{product.name}</CardTitle>
          </div>
          <div
            className="flex items-center gap-1 rounded-full border-[1.5px] border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-bold text-primary font-display"
            aria-label={`Score ${scorePct} por cento`}
          >
            <TrendingUp className="h-3 w-3" />
            {scorePct}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-2">
        <p className="text-xs text-muted-foreground font-display">{product.category}</p>
        <p className="text-sm text-foreground/90 font-display leading-relaxed">{reason}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="border-[1.5px] border-border rounded-xl">
          <CardHeader className="p-4 pb-2">
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ClientFormProps {
  readonly visible: boolean;
  readonly client: ClientProfile;
  readonly onFieldChange: (field: keyof ClientProfile) => (event: ChangeEvent<HTMLInputElement>) => void;
}

function ClientForm({ visible, client, onFieldChange }: ClientFormProps) {
  if (!visible) return null;
  return (
    <Card className="border-[1.5px] border-border rounded-2xl">
      <CardContent className="p-5 space-y-4">
        <FormSection title="Perfil do cliente" description="Quanto mais detalhes, melhores as recomendações.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nome do cliente *" value={client.name} onChange={onFieldChange("name")} aria-label="Nome do cliente" required />
            <Input placeholder="Empresa" value={client.company ?? ""} onChange={onFieldChange("company")} aria-label="Empresa" />
            <Input placeholder="Segmento (ex: tecnologia)" value={client.industry ?? ""} onChange={onFieldChange("industry")} aria-label="Segmento" />
            <Input placeholder="Orçamento (ex: até R$ 5.000)" value={client.budget ?? ""} onChange={onFieldChange("budget")} aria-label="Orçamento" />
            <Input className="sm:col-span-2" placeholder="Preferências separadas por vírgula" value={(client.preferences ?? []).join(", ")} onChange={onFieldChange("preferences")} aria-label="Preferências" />
          </div>
        </FormSection>
      </CardContent>
    </Card>
  );
}

interface RecommendationActionsProps {
  readonly productCount: number;
  readonly hasData: boolean;
  readonly isLoading: boolean;
  readonly canGenerate: boolean;
  readonly onReset: () => void;
  readonly onGenerate: () => void;
}

function RecommendationActions(props: RecommendationActionsProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Package className="h-4 w-4" aria-hidden="true" /><span>{props.productCount} {props.productCount === 1 ? "produto disponível" : "produtos disponíveis"}</span></div>
      <div className="flex items-center gap-2">
        {props.hasData && <Button type="button" variant="ghost" size="sm" onClick={props.onReset} aria-label="Limpar resultados"><RefreshCcw className="h-4 w-4" />Limpar</Button>}
        <Button type="button" variant="premium" onClick={props.onGenerate} disabled={!props.canGenerate} aria-label="Gerar recomendações"><Sparkles className="h-4 w-4" />{props.isLoading ? "Analisando..." : "Gerar Recomendações"}</Button>
      </div>
    </div>
  );
}

function RecommendationError({ message, visible }: { readonly message: string | null; readonly visible: boolean }) {
  if (!visible || !message) return null;
  return <div role="alert" className="flex items-start gap-2 rounded-xl border-[1.5px] border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" /><span>{message}</span></div>;
}

interface RecommendationResultsProps {
  readonly visible: boolean;
  readonly recommendations: readonly Recommendation[];
  readonly productMap: ReadonlyMap<string, ProductForRecommendation>;
  readonly insights: string;
  readonly onProductClick?: (productId: string) => void;
}

function RecommendationResults({ visible, recommendations, productMap, insights, onProductClick }: RecommendationResultsProps) {
  if (!visible) return null;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid gap-3 sm:grid-cols-2">
        {recommendations.map((recommendation, index) => {
          const product = productMap.get(recommendation.productId);
          if (!product) return null;
          const handleClick = onProductClick ? () => onProductClick(recommendation.productId) : undefined;
          return <RecommendationCard key={recommendation.productId} product={product} score={recommendation.score} reason={recommendation.reason} rank={index + 1} onClick={handleClick} />;
        })}
      </div>
      {insights && <Card className="border-[1.5px] border-primary/30 bg-primary/5 rounded-2xl"><CardHeader className="p-5 pb-2"><CardTitle className="text-base font-display flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />Insights da IA</CardTitle></CardHeader><CardContent className="p-5 pt-2"><p className="text-sm leading-relaxed text-foreground/90">{insights}</p></CardContent></Card>}
    </div>
  );
}

function RecommendationEmpty({ visible }: { readonly visible: boolean }) {
  if (!visible) return null;
  return <div className="flex flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed border-border py-10 text-center text-muted-foreground"><Sparkles className="h-10 w-10 mb-3 opacity-40" aria-hidden="true" /><p className="text-sm">Preencha o perfil e clique em &quot;Gerar Recomendações&quot;</p></div>;
}

function valueOrDefault<T>(value: T | undefined, fallback: T) {
  return value === undefined ? fallback : value;
}

function initialClientProfile(initialClient: Partial<ClientProfile> = {}): ClientProfile {
  return {
    name: valueOrDefault(initialClient.name, ""),
    company: valueOrDefault(initialClient.company, ""),
    industry: valueOrDefault(initialClient.industry, ""),
    budget: valueOrDefault(initialClient.budget, ""),
    preferences: valueOrDefault(initialClient.preferences, []),
    purchaseHistory: valueOrDefault(initialClient.purchaseHistory, []),
  };
}

function normalizeClientField(field: keyof ClientProfile, value: string) {
  if (field !== "preferences") return value;
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

function canGenerateRecommendations(client: ClientProfile, productCount: number, isLoading: boolean) {
  return Boolean(client.name.trim()) && productCount > 0 && !isLoading;
}

function recommendationVisibility(isLoading: boolean, error: string | null, recommendationCount: number, hasData: boolean) {
  return {
    showResults: !isLoading && recommendationCount > 0,
    showEmpty: !isLoading && !error && recommendationCount === 0 && !hasData,
  };
}

function RecommendationLoading({ visible }: { readonly visible: boolean }) {
  return visible ? <LoadingSkeleton /> : null;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AIRecommendationsPanel({
  products,
  initialClient,
  onProductClick,
  hideClientForm = false,
  className,
}: AIRecommendationsPanelProps) {
  const [client, setClient] = useState<ClientProfile>(() => initialClientProfile(initialClient));

  const { data, recommendations, insights, isLoading, error, fetchRecommendations, reset } =
    useAIRecommendations();

  const productMap = useMemo(() => {
    const map = new Map<string, ProductForRecommendation>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const handleField = useCallback(
    (field: keyof ClientProfile) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setClient((prev) => ({
        ...prev,
        [field]: normalizeClientField(field, value),
      }));
    },
    []
  );

  const handleGenerate = useCallback(() => {
    if (!client.name.trim() || products.length === 0) return;
    fetchRecommendations(client, products);
  }, [client, products, fetchRecommendations]);

  const canGenerate = canGenerateRecommendations(client, products.length, isLoading);
  const visibility = recommendationVisibility(isLoading, error, recommendations.length, Boolean(data));

  return (
    <div className={cn("space-y-4 font-display", className)}>
      <ClientForm visible={!hideClientForm} client={client} onFieldChange={handleField} />
      <RecommendationActions productCount={products.length} hasData={Boolean(data)} isLoading={isLoading} canGenerate={canGenerate} onReset={reset} onGenerate={handleGenerate} />
      <RecommendationError message={error} visible={!isLoading} />
      <RecommendationLoading visible={isLoading} />
      <RecommendationResults visible={visibility.showResults} recommendations={recommendations} productMap={productMap} insights={insights} onProductClick={onProductClick} />
      <RecommendationEmpty visible={visibility.showEmpty} />
    </div>
  );
}
