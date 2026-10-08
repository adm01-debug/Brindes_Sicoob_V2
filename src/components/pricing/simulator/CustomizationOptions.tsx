import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette, Ruler, Loader2, AlertCircle } from 'lucide-react';
import { useTechniquePricing } from '@/hooks/useTechniquePricing';
import type { ProductTechnique } from './types';

interface CustomizationOptionsProps {
  technique: ProductTechnique;
  colors: number;
  onColorsChange: (colors: number) => void;
  sizeOption: string | null;
  onSizeChange: (size: string | null) => void;
  onTableCodeChange?: (tableCode: string | null) => void;
}

type PricingResult = ReturnType<typeof useTechniquePricing>;
type ColorOption = PricingResult['colorOptions'][number];
type SizeOption = PricingResult['sizeOptions'][number];

function LoadingOptions() {
  return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" />Carregando opções...</div>;
}

function OptionsError({ message }: { message: string }) {
  return <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive"><AlertCircle className="w-5 h-5 mb-2" /><p className="text-sm">{message}</p></div>;
}

function ColorOptions({ options, value, maxColors, onChange }: { options: ColorOption[]; value: number; maxColors?: number | null; onChange: (value: number) => void }) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium flex items-center gap-2"><Palette className="w-4 h-4 text-primary" />Número de Cores</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => <Button key={option.value} variant={value === option.value ? 'default' : 'outline'} size="sm" onClick={() => onChange(option.value)} className="min-w-12">{option.label}</Button>)}
      </div>
      {maxColors ? <p className="text-xs text-muted-foreground">Máximo suportado nesta área: {maxColors} cores</p> : null}
    </div>
  );
}

function SizeOptions({ options, value, onChange }: { options: SizeOption[]; value: string | null; onChange: (value: string | null) => void }) {
  if (options.length > 1) {
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2"><Ruler className="w-4 h-4 text-primary" />Tamanho da Gravação</label>
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Selecione o tamanho" /></SelectTrigger>
          <SelectContent>{options.map((size) => <SelectItem key={size.value} value={size.value}>{size.label}<span className="text-muted-foreground ml-2">({size.areaCm2} cm²)</span></SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  }
  const onlyOption = options[0];
  if (!onlyOption) return null;
  return <div className="p-3 rounded-lg bg-muted/50 text-sm"><p className="text-muted-foreground flex items-center gap-2"><Ruler className="w-4 h-4" />Tamanho da gravação: <strong>{onlyOption.label} ({onlyOption.areaCm2} cm²)</strong></p></div>;
}

function TechniqueArea({ technique, hasSizes }: { technique: ProductTechnique; hasSizes: boolean }) {
  if (hasSizes || !technique.maxWidth || !technique.maxHeight) return null;
  return (
    <div className="p-3 rounded-lg bg-muted/50 text-sm">
      <p className="text-muted-foreground">Área máxima de gravação: <strong>{technique.maxWidth} x {technique.maxHeight} mm</strong>{technique.maxArea ? <span> ({technique.maxArea} cm²)</span> : null}</p>
    </div>
  );
}

function EmptyOptions({ technique }: { technique: ProductTechnique }) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 text-center">
      <p className="text-sm text-muted-foreground">Esta técnica não possui opções configuráveis de cores ou tamanho.</p>
      {technique.maxWidth && technique.maxHeight ? <p className="text-sm mt-2">Área de gravação: <strong>{technique.maxWidth} x {technique.maxHeight} mm</strong></p> : null}
    </div>
  );
}

export function CustomizationOptions({
  technique,
  colors,
  onColorsChange,
  sizeOption,
  onSizeChange,
  onTableCodeChange,
}: CustomizationOptionsProps) {
  const { colorOptions, sizeOptions, hasPriceByColor, isLoading, error, findMatchingTable } = useTechniquePricing(technique.techniqueCode);

  // Atualizar tabela de preços quando muda cores ou tamanho
  useEffect(() => {
    if (onTableCodeChange) {
      const table = findMatchingTable(colors, sizeOption || '');
      onTableCodeChange(table?.tableCode || null);
    }
  }, [colors, sizeOption, findMatchingTable, onTableCodeChange]);

  // Definir valores iniciais quando opções carregam
  useEffect(() => {
    const firstColor = colorOptions[0];
    const firstSize = sizeOptions[0];
    if (firstColor && colors === 0) onColorsChange(firstColor.value);
    if (firstSize && !sizeOption) onSizeChange(firstSize.value);
  }, [colorOptions, sizeOptions, colors, sizeOption, onColorsChange, onSizeChange]);

  if (isLoading) return <LoadingOptions />;
  if (error) return <OptionsError message={error} />;
  if (!hasPriceByColor && sizeOptions.length === 0) return <EmptyOptions technique={technique} />;

  return (
    <div className="space-y-6">
      {hasPriceByColor ? <ColorOptions options={colorOptions} value={colors} maxColors={technique.maxColors} onChange={onColorsChange} /> : null}
      <SizeOptions options={sizeOptions} value={sizeOption} onChange={onSizeChange} />
      <TechniqueArea technique={technique} hasSizes={sizeOptions.length > 0} />
    </div>
  );
}
