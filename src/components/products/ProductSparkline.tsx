import { type MouseEvent, useMemo, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useSparklineData } from "@/hooks/useSparklineSales";
import { TrendingUp, TrendingDown, Minus, Zap, Activity } from "lucide-react";

interface ProductSparklineProps {
  productId: string;
  className?: string;
}

/**
 * Mini sparkline SVG com a depleção diária do estoque do fornecedor.
 * Exibe somente dados reais do SparklineSalesProvider.
 */
type RealData = NonNullable<ReturnType<typeof useSparklineData>>;
type Summary = ReturnType<typeof buildSummary>;

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]) {
  return values.length ? sum(values) / values.length : 0;
}

function percentageChange(previous: number, current: number) {
  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

function maximumOrZero(values: number[]) {
  return values.length ? Math.max(...values) : 0;
}

function buildSummary(points: number[], data?: RealData) {
  const midpoint = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, midpoint);
  const secondHalf = points.slice(midpoint);
  const firstHalfTotal = sum(firstHalf);
  const secondHalfTotal = sum(secondHalf);
  const totalSales = data?.totalQty ?? 0;
  return {
    totalSales,
    availableStock: data?.availableStock ?? 0,
    trend: percentageChange(average(firstHalf), average(secondHalf)),
    dailyAvg: points.length ? totalSales / points.length : 0,
    peakDay: maximumOrZero(points),
    activeDays: points.filter((value) => value > 0).length,
    firstHalfTotal,
    secondHalfTotal,
    periodChange: percentageChange(firstHalfTotal, secondHalfTotal),
  };
}

function buildGeometry(points: number[]) {
  const width = 200;
  const height = 28;
  const allZero = points.every((point) => point === 0);
  const maximum = allZero ? 1 : Math.max(...points);
  const minimum = allZero ? 0 : Math.min(...points);
  const range = maximum - minimum || 1;
  const coords = points.map((value, index) => ({ x: (index / (points.length - 1)) * width, y: allZero ? height / 2 : height - 2 - ((value - minimum) / range) * (height - 4) }));
  const linePath = coords.map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x},${coord.y}`).join(" ");
  return { width, height, allZero, coords, linePath, areaPath: `${linePath} L${width},${height} L0,${height} Z` };
}

function useSparklineHover(pointCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const element = containerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const index = Math.min(pointCount - 1, Math.max(0, Math.round(((event.clientX - rect.left) / rect.width) * (pointCount - 1))));
    setHoverIndex(index);
    setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, [pointCount]);
  const handleMouseEnter = useCallback(() => {
    if (hoverIndex !== null || !containerRef.current) return;
    setHoverIndex(Math.floor(pointCount / 2));
    setTooltipPos({ x: containerRef.current.getBoundingClientRect().width / 2, y: 0 });
  }, [hoverIndex, pointCount]);
  return { containerRef, hoverIndex, tooltipPos, handleMouseMove, handleMouseEnter, handleMouseLeave: () => setHoverIndex(null) };
}

function SparklineSvg({ productId, geometry, color, hoverIndex }: { productId: string; geometry: ReturnType<typeof buildGeometry>; color: string; hoverIndex: number | null }) {
  const hoverCoord = hoverIndex === null ? undefined : geometry.coords[hoverIndex];
  const lastCoord = geometry.coords[geometry.coords.length - 1];
  const gradientId = `spark-fill-${productId.slice(0, 8)}`;
  return <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="none" className="w-full h-7" aria-hidden="true"><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={geometry.allZero ? "0.05" : "0.3"} /><stop offset="100%" stopColor={color} stopOpacity="0.02" /></linearGradient></defs><path d={geometry.areaPath} fill={`url(#${gradientId})`} /><path d={geometry.linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={geometry.allZero ? 0.3 : 1} />{hoverCoord && <><line x1={hoverCoord.x} y1={0} x2={hoverCoord.x} y2={geometry.height} stroke={color} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" /><circle cx={hoverCoord.x} cy={hoverCoord.y} r="3.5" fill={color} stroke="hsl(var(--card))" strokeWidth="1.5" /></>}{hoverIndex === null && !geometry.allZero && lastCoord && <circle cx={lastCoord.x} cy={lastCoord.y} r="2" fill={color} />}</svg>;
}

function changeTextClass(change: number) {
  if (change > 0) return "text-success";
  if (change < 0) return "text-warning";
  return "text-muted-foreground";
}

function Comparison({ summary, color }: { summary: Summary; color: string }) {
  const maximum = Math.max(summary.firstHalfTotal, summary.secondHalfTotal);
  const firstWidth = maximum > 0 ? Math.min(100, (summary.firstHalfTotal / maximum) * 100) : 0;
  const secondWidth = maximum > 0 ? Math.min(100, (summary.secondHalfTotal / maximum) * 100) : 0;
  const TrendIcon = summary.periodChange > 2 ? TrendingUp : summary.periodChange < -2 ? TrendingDown : Minus;
  return <div className="px-3 py-2 border-t border-border/40 bg-muted/30"><div className="flex items-center justify-between text-[10px]"><span className="text-muted-foreground">1ª metade vs 2ª metade</span><div className="flex items-center gap-1"><TrendIcon className={cn("h-3 w-3", changeTextClass(summary.periodChange))} /><span className={cn("font-bold text-[11px]", changeTextClass(summary.periodChange))}>{summary.periodChange > 0 ? '+' : ''}{summary.periodChange.toFixed(0)}%</span></div></div><div className="flex gap-1 mt-1.5"><ComparisonBar width={firstWidth} value={summary.firstHalfTotal} /><ComparisonBar width={secondWidth} value={summary.secondHalfTotal} color={color} /></div></div>;
}

function ComparisonBar({ width, value, color }: { width: number; value: number; color?: string }) {
  return <div className="flex-1"><div className="h-1.5 rounded-full bg-muted-foreground/15 overflow-hidden"><div className={cn("h-full rounded-full", color ? "transition-all" : "bg-muted-foreground/40")} style={{ width: `${width}%`, backgroundColor: color }} /></div><span className="text-[9px] text-muted-foreground/70">{value} un</span></div>;
}

function TrendFooter({ summary, pointCount }: { summary: Summary; pointCount: number }) {
  const TrendIcon = summary.trend > 2 ? TrendingUp : summary.trend < -2 ? TrendingDown : Minus;
  const tone = summary.trend > 0 ? "bg-success/10 text-success" : summary.trend < 0 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";
  return <div className="px-3 py-1.5 border-t border-border/40 flex items-center justify-between"><div className="flex items-center gap-1"><Zap className="h-3 w-3 text-warning" /><span className="text-[10px] text-muted-foreground">{summary.activeDays}/{pointCount} dias ativos</span></div><div className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold", tone)}><TrendIcon className="h-3 w-3" />{summary.trend > 0 ? '+' : ''}{summary.trend.toFixed(1)}%</div></div>;
}

function SparklineTooltip({ index, point, points, position, summary, color }: { index: number; point: number; points: number[]; position: { x: number; y: number }; summary: Summary; color: string }) {
  const percentage = index / (points.length - 1);
  const align = percentage < 0.2 ? 'left' : percentage > 0.8 ? 'right' : 'center';
  const style = { left: align === 'left' ? 0 : align === 'right' ? 'auto' : position.x, right: align === 'right' ? 0 : 'auto', bottom: '100%', transform: align === 'center' ? 'translateX(-50%)' : 'none', marginBottom: 6 } as const;
  const peakWidth = summary.peakDay > 0 ? (point / summary.peakDay) * 100 : 0;
  return <div className="absolute z-50 pointer-events-none" style={style}><div className="bg-popover/95 backdrop-blur-md border border-border/60 rounded-xl shadow-2xl shadow-black/20 overflow-hidden min-w-[220px]"><div className="px-3 py-2 bg-gradient-to-r from-muted/80 to-transparent border-b border-border/40"><div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-muted-foreground" /><span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Estoque do fornecedor · Dia {index + 1}</span></div><span className="text-sm font-bold text-foreground">{point} un</span></div><div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${peakWidth}%`, backgroundColor: color }} /></div></div><div className="px-3 py-2 grid grid-cols-2 gap-x-3 gap-y-1.5"><TooltipMetric label="Saídas de estoque 30d" value={`${summary.totalSales.toLocaleString('pt-BR')} un`} /><TooltipMetric label="Disponível" value={`${summary.availableStock.toLocaleString('pt-BR')} un`} /><TooltipMetric label="Média/dia" value={`${Math.round(summary.dailyAvg)} un`} /><TooltipMetric label="Pico" value={`${summary.peakDay} un`} highlight /></div><Comparison summary={summary} color={color} /><TrendFooter summary={summary} pointCount={points.length} /><div className="border-t border-border/40 bg-muted/40 px-3 py-1.5"><span className="block text-[9px] italic leading-tight text-muted-foreground/70">Fonte: variação do estoque do fornecedor; não representa pedidos Sicoob.</span></div></div></div>;
}

export function ProductSparkline({ productId, className }: ProductSparklineProps) {
  const realData = useSparklineData(productId);
  const points = useMemo(() => realData?.totalQty ? realData.dailyQty : [], [realData]);
  const summary = useMemo(() => buildSummary(points, realData), [points, realData]);
  const geometry = useMemo(() => buildGeometry(points), [points]);
  const hover = useSparklineHover(points.length);
  if (!realData?.totalQty || points.length < 2) return null;
  const color = summary.trend >= 0 ? "hsl(var(--success))" : "hsl(var(--warning))";
  const hoverPoint = hover.hoverIndex === null ? undefined : points[hover.hoverIndex];
  return <div ref={hover.containerRef} className={cn("w-full relative group/spark", className)} onMouseEnter={hover.handleMouseEnter} onMouseMove={hover.handleMouseMove} onMouseLeave={hover.handleMouseLeave}><SparklineSvg productId={productId} geometry={geometry} color={color} hoverIndex={hover.hoverIndex} />{hover.hoverIndex !== null && hoverPoint !== undefined && <SparklineTooltip index={hover.hoverIndex} point={hoverPoint} points={points} position={hover.tooltipPos} summary={summary} color={color} />}</div>;
}

function TooltipMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={cn(
        "text-[11px] font-semibold",
        highlight ? "text-warning" : "text-foreground"
      )}>
        {value}
      </span>
    </div>
  );
}
