/**
 * AIComparisonAdvisor — Botão que chama edge function `comparison-ai-advisor` (Lovable AI).
 * Cache: sessionStorage por 30 min para combinação de IDs.
 */
import { useState } from "react";
import { Brain, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Product } from "@/hooks/useProducts";

interface AIComparisonAdvisorProps {
  products: Product[];
}

interface AdvisorResult {
  bullets: string[];
  bestFor: { highVolume?: string; fastDelivery?: string; premium?: string };
  rationale?: string;
}

const CACHE_TTL_MS = 30 * 60 * 1000;

function cacheKey(products: Product[]): string {
  return "cmp-ai-" + products.map(p => p.id).sort().join("|");
}

function readCache(key: string): AdvisorResult | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.t > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch { return null; }
}

function writeCache(key: string, data: AdvisorResult) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
  } catch { /* ignore */ }
}

async function requestAdvice(products: Product[]): Promise<AdvisorResult> {
  const slim = products.map(product => ({
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    minQuantity: product.minQuantity,
    colorsCount: product.colors?.length ?? 0,
    stockStatus: product.stockStatus,
    category: product.category?.name,
    supplier: product.supplier?.name,
  }));
  const { data, error } = await supabase.functions.invoke("comparison-ai-advisor", { body: { products: slim } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return { bullets: data.bullets ?? [], bestFor: data.bestFor ?? {}, rationale: data.rationale };
}

function reportAdviceError(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha ao consultar IA";
  if (message.includes("429") || message.toLowerCase().includes("rate")) {
    toast.error("Muitas requisições. Tente novamente em 1 minuto.");
  } else if (message.includes("402")) {
    toast.error("Créditos de IA esgotados. Contate o administrador.");
  } else {
    toast.error("Não foi possível obter recomendação da IA.");
  }
}

function AdvisorHeader({ loading, hasResult, onRequest }: { loading: boolean; hasResult: boolean; onRequest: () => void }) {
  let buttonContent = <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Analisar com IA</>;
  if (loading) buttonContent = <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Analisando...</>;
  else if (hasResult) buttonContent = <>Re-analisar</>;
  return <div className="flex items-start justify-between gap-3 flex-wrap"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary shadow-md"><Brain className="h-5 w-5 text-primary-foreground" /></div><div><div className="flex items-center gap-2"><h3 className="font-semibold text-sm">Conselheiro IA</h3><Badge variant="outline" className="text-[10px] gap-1"><Sparkles className="h-2.5 w-2.5" /> Lovable AI</Badge></div><p className="text-xs text-muted-foreground">Análise contextual da sua comparação</p></div></div><Button size="sm" variant={hasResult ? "outline" : "default"} onClick={onRequest} disabled={loading}>{buttonContent}</Button></div>;
}

function AdvisorResultView({ result }: { result: AdvisorResult }) {
  const recommendations = [
    { label: "Para alto volume", value: result.bestFor.highVolume },
    { label: "Para entrega rápida", value: result.bestFor.fastDelivery },
    { label: "Para premium", value: result.bestFor.premium },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));
  return <div className="mt-4 space-y-3">{result.bullets.length > 0 && <ul className="space-y-1.5 text-sm">{result.bullets.map((bullet) => <li key={bullet} className="flex gap-2"><span className="text-accent mt-0.5">•</span><span className="text-foreground/90">{bullet}</span></li>)}</ul>}{recommendations.length > 0 && <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">{recommendations.map((item) => <BestForCard key={item.label} label={item.label} value={item.value} />)}</div>}{result.rationale && <p className="text-xs text-muted-foreground italic mt-2 flex gap-1.5"><AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />{result.rationale}</p>}</div>;
}

export function AIComparisonAdvisor({ products }: AIComparisonAdvisorProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdvisorResult | null>(() =>
    products.length >= 2 ? readCache(cacheKey(products)) : null
  );

  const fetchAdvice = async () => {
    if (products.length < 2) return;
    const key = cacheKey(products);
    const cached = readCache(key);
    if (cached) { setResult(cached); return; }

    setLoading(true);
    try {
      const advice = await requestAdvice(products);
      writeCache(key, advice);
      setResult(advice);
    } catch (error: unknown) {
      reportAdviceError(error);
    } finally {
      setLoading(false);
    }
  };

  if (products.length < 2) return null;

  return (
    <div className="rounded-2xl border-[1.5px] border-accent/40 bg-gradient-to-br from-accent/10 via-background to-background p-4">
      <AdvisorHeader loading={loading} hasResult={Boolean(result)} onRequest={() => { void fetchAdvice(); }} />
      {result && <AdvisorResultView result={result} />}
    </div>
  );
}

function BestForCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground line-clamp-2 mt-0.5">{value}</p>
    </div>
  );
}
