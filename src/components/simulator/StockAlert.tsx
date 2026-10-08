// src/components/simulator/StockAlert.tsx
// Melhoria #7: Alertas de estoque/disponibilidade

import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  AlertTriangle, 
  PackageX, 
  Package, 
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { Product } from "@/types/simulation";

interface StockInfo {
  available: number;
  reserved: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
}

interface StockAlertProps {
  product: Product | undefined;
  quantity: number;
  className?: string;
}

type AlertLevel = 'unknown' | 'critical' | 'warning' | 'caution' | 'ok';

// Simula informação de estoque (em produção, viria da API Promobrind)
function getStockInfo(product: Product | undefined): StockInfo {
  if (!product) {
    return { available: 0, reserved: 0, status: 'unknown' };
  }
  
  // Simulação baseada em padrões do produto
  // Em produção, isso viria de uma API real
  const hash = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseStock = (hash % 500) + 50;
  const reserved = Math.floor(baseStock * 0.1);
  const available = baseStock - reserved;
  
  let status: StockInfo['status'] = 'in_stock';
  if (available <= 0) status = 'out_of_stock';
  else if (available < 100) status = 'low_stock';
  
  return { available, reserved, status };
}

function getAlertLevel(stockInfo: StockInfo, quantity: number): AlertLevel {
  if (stockInfo.status === 'unknown') return 'unknown';
  if (stockInfo.status === 'out_of_stock') return 'critical';
  if (quantity > stockInfo.available) return 'warning';
  if (stockInfo.status === 'low_stock') return 'caution';
  return 'ok';
}

function StockAlertDescription({ level, stockInfo, quantity }: { level: AlertLevel; stockInfo: StockInfo; quantity: number }) {
  if (level === 'critical') return <p>Este produto está indisponível no momento. Entre em contato com o fornecedor.</p>;
  if (level === 'warning') return <><p>Disponível: <strong>{stockInfo.available}</strong> unidades. Você precisa de mais <strong>{quantity - stockInfo.available}</strong> unidades.</p><p className="text-xs opacity-80">Considere reduzir a quantidade ou consultar previsão de reposição.</p></>;
  if (level === 'caution') return <p>Estoque limitado: <strong>{stockInfo.available}</strong> unidades disponíveis. Confirme disponibilidade antes de fechar o pedido.</p>;
  return null;
}

function getAlertTitle(level: AlertLevel): string {
  if (level === 'critical') return 'Produto sem estoque';
  if (level === 'warning') return 'Estoque insuficiente';
  if (level === 'caution') return 'Estoque baixo';
  return '';
}

export function StockAlert({
  product,
  quantity,
  className,
}: StockAlertProps) {
  const stockInfo = useMemo(() => getStockInfo(product), [product]);
  const alertLevel = useMemo(() => getAlertLevel(stockInfo, quantity), [stockInfo, quantity]);

  // Não mostrar alerta se estoque OK ou desconhecido
  if (alertLevel === 'ok' || alertLevel === 'unknown') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Alert 
        variant={alertLevel === 'critical' ? 'destructive' : 'default'}
        className={cn(
          alertLevel === 'warning' && "border-warning/50 bg-warning/10",
          alertLevel === 'caution' && "border-warning/30 bg-warning/5"
        )}
      >
        {alertLevel === 'critical' ? <PackageX className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <AlertTitle className="flex items-center gap-2">{getAlertTitle(alertLevel)}</AlertTitle>
        <AlertDescription className="mt-1 space-y-2">
          <StockAlertDescription level={alertLevel} stockInfo={stockInfo} quantity={quantity} />
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}

const STOCK_BADGE_CONFIG = {
  ok: { className: "bg-success/10 text-success border-success/30", label: null, icon: CheckCircle2 },
  caution: { className: "bg-warning/10 text-warning border-warning/30", label: "Estoque baixo", icon: Info },
  warning: { className: "bg-warning/15 text-warning border-warning/40", label: "Verificar", icon: AlertTriangle },
  critical: { className: "bg-destructive/10 text-destructive border-destructive/30", label: "Sem estoque", icon: PackageX },
};

// Badge compacto para exibição em lista
export function StockBadge({
  product,
  quantity,
  className,
}: StockAlertProps) {
  const stockInfo = useMemo(() => getStockInfo(product), [product]);
  const alertLevel = useMemo(() => getAlertLevel(stockInfo, quantity), [stockInfo, quantity]);

  if (alertLevel === 'unknown') return null;
  const config = STOCK_BADGE_CONFIG[alertLevel];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 text-[10px] cursor-help",
              config.className,
              className
            )}
          >
            <Icon className="h-3 w-3" />
            {config.label ?? `${stockInfo.available} un`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Estoque: {stockInfo.available} disponíveis
            </p>
            {stockInfo.reserved > 0 && (
              <p className="text-xs text-muted-foreground">
                {stockInfo.reserved} unidades reservadas
              </p>
            )}
            {quantity > stockInfo.available && (
              <p className="text-xs text-destructive">
                Faltam {quantity - stockInfo.available} unidades
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
