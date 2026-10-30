import * as React from 'react';
import { Package, AlertTriangle, XCircle, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'pre-order' | 'incoming';

interface StockBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StockStatus;
  quantity?: number;
  showQuantity?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  expectedDate?: string;
}

interface StatusConfigEntry {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortLabel: string;
  bgClass: string;
  className: string;
}

const statusConfig: Record<StockStatus, StatusConfigEntry> = {
  'in-stock': {
    icon: Package,
    label: 'Em estoque',
    shortLabel: 'Em estoque',
    bgClass: 'bg-primary/10',
    className: 'text-primary border-primary/20',
  },
  'low-stock': {
    icon: AlertTriangle,
    label: 'Estoque baixo',
    shortLabel: 'Baixo',
    bgClass: 'bg-warning/10',
    className: 'text-warning border-warning/20',
  },
  'out-of-stock': {
    icon: XCircle,
    label: 'Sem estoque',
    shortLabel: 'Esgotado',
    bgClass: 'bg-destructive/10',
    className: 'text-destructive border-destructive/20',
  },
  'pre-order': {
    icon: Clock,
    label: 'Pré-venda',
    shortLabel: 'Pré-venda',
    bgClass: 'bg-primary/10',
    className: 'text-primary border-primary/20',
  },
  'incoming': {
    icon: TrendingUp,
    label: 'A caminho',
    shortLabel: 'A caminho',
    bgClass: 'bg-primary/5',
    className: 'text-primary/80 border-primary/10',
  },
};

interface SizeConfigEntry {
  badge: string;
  icon: string;
}

const sizeConfig: Record<NonNullable<StockBadgeProps['size']>, SizeConfigEntry> = {
  sm: { badge: 'text-[10px] px-1.5 py-0 gap-1', icon: 'h-3 w-3' },
  md: { badge: 'text-xs px-2 py-0.5 gap-1', icon: 'h-3.5 w-3.5' },
  lg: { badge: 'text-sm px-2.5 py-1 gap-1.5', icon: 'h-4 w-4' },
};

function formatStockQuantity(quantity: number) {
  if (quantity >= 1000) return `${(quantity / 1000).toFixed(1)}k`;
  return quantity.toLocaleString('pt-BR');
}

function StockBadgeContent({ config, sizeStyles, showIcon, showQuantity, quantity }: {
  config: StatusConfigEntry;
  sizeStyles: SizeConfigEntry;
  showIcon: boolean;
  showQuantity: boolean;
  quantity: number | undefined;
}) {
  const Icon = config.icon;
  return <>{showIcon && <Icon className={sizeStyles.icon} />}<span>{showQuantity && quantity !== undefined ? <>{formatStockQuantity(quantity)} un.</> : config.shortLabel}</span></>;
}

function StockBadgeTooltip({ config, quantity, expectedDate, children }: {
  config: StatusConfigEntry;
  quantity: number | undefined;
  expectedDate: string | undefined;
  children: React.ReactNode;
}) {
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent><div className="text-xs space-y-1"><p className="font-medium">{config.label}</p>{quantity !== undefined && <p>Quantidade: {quantity.toLocaleString('pt-BR')} unidades</p>}{expectedDate && <p>Previsão: {new Date(expectedDate).toLocaleDateString('pt-BR')}</p>}</div></TooltipContent></Tooltip>;
}

export const StockBadge = React.forwardRef<HTMLDivElement, StockBadgeProps>(
  (
    {
      status,
      quantity,
      showQuantity = false,
      showIcon = true,
      size = 'md',
      expectedDate,
      className,
      ...props
    },
    ref
  ) => {
    const config = statusConfig[status];
    const sizeStyles = sizeConfig[size];
    const badgeContent = (
      <Badge
        ref={ref}
        variant="outline"
        className={cn(
          'font-medium inline-flex items-center border transition-all',
          config.bgClass,
          config.className,
          sizeStyles.badge,
          className
        )}
        {...props}
      >
        <StockBadgeContent config={config} sizeStyles={sizeStyles} showIcon={showIcon} showQuantity={showQuantity} quantity={quantity} />
      </Badge>
    );

    // Se tem informação adicional, mostrar tooltip
    if (expectedDate || (quantity !== undefined && !showQuantity)) {
      return <StockBadgeTooltip config={config} quantity={quantity} expectedDate={expectedDate}>{badgeContent}</StockBadgeTooltip>;
    }

    return badgeContent;
  }
);

StockBadge.displayName = "StockBadge";

// Função helper para determinar status com base na quantidade
export function getStockStatus(quantity: number, lowThreshold = 50): StockStatus {
  if (quantity === 0) return 'out-of-stock';
  if (quantity <= lowThreshold) return 'low-stock';
  return 'in-stock';
}

// Componente de indicador compacto para listas
interface StockIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StockStatus;
}

export const StockIndicator = React.forwardRef<HTMLSpanElement, StockIndicatorProps>(
  ({ status, className, ...props }, ref) => {
    const dotColor = {
      'in-stock': 'bg-primary',
      'low-stock': 'bg-warning',
      'out-of-stock': 'bg-destructive',
      'pre-order': 'bg-primary',
      'incoming': 'bg-primary/70',
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            ref={ref}
            className={cn(
              'inline-block w-2.5 h-2.5 rounded-full',
              dotColor[status],
              status === 'low-stock' && 'animate-pulse',
              className
            )}
            {...props}
          />
        </TooltipTrigger>
        <TooltipContent>{statusConfig[status].label}</TooltipContent>
      </Tooltip>
    );
  }
);

StockIndicator.displayName = "StockIndicator";
