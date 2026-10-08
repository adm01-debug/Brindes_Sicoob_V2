/**
 * PriceSparkline — mini gráfico de linha (60×24) sem eixos, com badge de variação 30d.
 * Consulta tabela `price_history` do Supabase para um produto.
 */
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  productId: string;
  className?: string;
}

interface PricePoint {
  date: string;
  price: number;
}

async function fetchPricePoints(productId: string): Promise<PricePoint[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabase
    .from("price_history")
    .select("recorded_at,price")
    .eq("product_id", productId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(60);

  return (rows ?? []).map((row) => ({
    date: row.recorded_at,
    price: Number(row.price ?? 0),
  }));
}

function trendStroke(down: boolean, up: boolean) {
  if (down) return "hsl(var(--success))";
  if (up) return "hsl(var(--destructive))";
  return "hsl(var(--muted-foreground))";
}

function TrendIcon({ down, up }: { down: boolean; up: boolean }) {
  if (down) return <TrendingDown className="h-3 w-3" />;
  if (up) return <TrendingUp className="h-3 w-3" />;
  return null;
}

function priceEndpoints(data: PricePoint[]) {
  const first = data[0]?.price ?? 0;
  return { first, last: data[data.length - 1]?.price ?? first };
}

function SparklineResult({ data, className }: { data: PricePoint[]; className?: string }) {
  const { first, last } = priceEndpoints(data);
  const pct = first > 0 ? ((last - first) / first) * 100 : 0;
  const down = pct < -0.5;
  const up = pct > 0.5;
  return <div className={cn("inline-flex items-center gap-1.5", className)}>
    <div className="w-[60px] h-6"><ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Line type="monotone" dataKey="price" stroke={trendStroke(down, up)} strokeWidth={1.5}
          dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer></div>
    <span className={cn("text-[10px] font-medium tabular-nums inline-flex items-center gap-0.5",
      down && "text-success", up && "text-destructive", !down && !up && "text-muted-foreground")}>
      <TrendIcon down={down} up={up} />{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  </div>;
}

export function PriceSparkline({ productId, className }: Props) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchPricePoints(productId)
      .then((points) => { if (!cancelled) setData(points); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  if (loading) {
    return <div className={cn("h-6 w-16 bg-muted/50 rounded animate-pulse", className)} />;
  }

  if (data.length < 2) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[10px] text-muted-foreground", className)}>
        <Minus className="h-3 w-3" /> sem histórico
      </span>
    );
  }

  return <SparklineResult data={data} className={className} />;
}
