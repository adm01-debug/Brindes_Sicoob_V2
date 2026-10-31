import type { ReactNode } from "react";
import { Scale, Box, ArrowUpDown, ArrowLeftRight, MoveHorizontal, Droplets } from "lucide-react";

interface ProductDimensionsProps {
  dimensions?: {
    height_cm?: number | null;
    width_cm?: number | null;
    length_cm?: number | null;
    diameter_cm?: number | null;
    weight_g?: number | null;
    capacity_ml?: number | null;
  };
  compact?: boolean;
}

interface SpecItemProps {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  iconBgClass?: string;
  iconColorClass?: string;
  compact?: boolean;
}

function SpecItem({ icon, label, value, unit, iconBgClass = "bg-primary/10", iconColorClass = "text-primary", compact }: SpecItemProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-secondary/40 border border-border/40">
        <div className={`w-8 h-8 rounded-lg ${iconBgClass} flex items-center justify-center shrink-0 [&_svg]:h-4 [&_svg]:w-4`}>
          <span className={iconColorClass}>{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground/70 leading-none mb-1">{label}</p>
          <p className="text-sm font-bold text-foreground leading-none">{value} <span className="text-[10px] font-normal text-muted-foreground">{unit}</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl bg-secondary/50 border border-border text-center">
      <div className={`w-10 h-10 rounded-lg ${iconBgClass} flex items-center justify-center shrink-0`}>
        <span className={iconColorClass}>{icon}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      <p className="text-base font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-none">{unit}</p>
    </div>
  );
}

function formatWeight(g: number) {
  if (g >= 1000) return { val: (g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }), unit: 'kg' };
  return { val: g.toLocaleString('pt-BR'), unit: 'g' };
}

function formatCapacity(ml: number) {
  if (ml >= 1000) return { val: (ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }), unit: 'L' };
  return { val: ml.toLocaleString('pt-BR'), unit: 'ml' };
}

function buildSpecs(dimensions: NonNullable<ProductDimensionsProps["dimensions"]>): SpecItemProps[] {
  const { height_cm, width_cm, length_cm, diameter_cm, weight_g, capacity_ml } = dimensions;
  const specs: SpecItemProps[] = [];
  if (diameter_cm) specs.push({ icon: <Box className="h-5 w-5" />, label: "Diâmetro", value: `${diameter_cm}`, unit: "cm" });
  if (height_cm) specs.push({ icon: <ArrowUpDown className="h-5 w-5" />, label: "Altura", value: `${height_cm}`, unit: "cm" });
  if (width_cm) specs.push({ icon: <ArrowLeftRight className="h-5 w-5" />, label: "Largura", value: `${width_cm}`, unit: "cm" });
  if (length_cm) specs.push({ icon: <MoveHorizontal className="h-5 w-5" />, label: "Profundidade", value: `${length_cm}`, unit: "cm" });
  if (capacity_ml) {
    const capacity = formatCapacity(capacity_ml);
    specs.push({ icon: <Droplets className="h-5 w-5" />, label: "Capacidade", value: capacity.val, unit: capacity.unit, iconBgClass: "bg-primary/10", iconColorClass: "text-primary" });
  }
  if (weight_g) {
    const weight = formatWeight(weight_g);
    specs.push({ icon: <Scale className="h-5 w-5" />, label: "Peso", value: weight.val, unit: weight.unit, iconBgClass: "bg-info/10", iconColorClass: "text-info" });
  }
  return specs;
}

export function ProductDimensions({ dimensions, compact }: ProductDimensionsProps) {
  if (!dimensions) return null;

  const specs = buildSpecs(dimensions);
  if (specs.length === 0) return null;

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {specs.map((spec, index) => (
          <SpecItem key={index} {...spec} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Especificações
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {specs.map((spec, index) => (
          <SpecItem key={index} {...spec} />
        ))}
      </div>
    </div>
  );
}
