/**
 * QuantityComparisonTable — Compare prices across quantities and techniques.
 */
import { useMemo, useCallback } from 'react';
import { useCustomizationPricing } from '@/hooks/useTecnicasUnificadas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type CalcProduct, type SelectedTechniqueConfig, availableSizes, calculateCustomizationTotal, formatCurrency, formatNumber, isPriceConfigurationSupported, minimumSupportedQuantity } from './types';

interface Props {
  product: CalcProduct;
  selectedConfigs: SelectedTechniqueConfig[];
  quantities: number[];
}

export function QuantityComparisonTable({ product, selectedConfigs, quantities }: Props) {
  const { calculatePrice, getTiers } = useCustomizationPricing();

  const calculateForConfig = useCallback((config: SelectedTechniqueConfig, quantity: number) => {
    if (!isPriceConfigurationSupported(config)) return null;
    const { technique } = config;
    const minimum = minimumSupportedQuantity(getTiers(technique.techniqueCode));
    if (minimum !== null && quantity < minimum) return null;
    const calc = calculatePrice(technique.techniqueCode, quantity);
    if (!calc) return null;

    const unitPrice = calc.unitPrice;
    const customizationTotal = calculateCustomizationTotal(calc, quantity);
    const productTotal = product.price * quantity;
    const grandTotal = productTotal + customizationTotal;
    return { unitPrice, customizationTotal, productTotal, grandTotal, unitTotal: grandTotal / quantity, slaDays: calc.slaDays };
  }, [calculatePrice, getTiers, product.price]);

  const calculateCombined = useCallback((quantity: number) => {
    const results = selectedConfigs.map((config) => calculateForConfig(config, quantity));
    // O total combinado deve ser integral: não exibe subtotal parcial se alguma
    // técnica estiver sem preço ou fora da faixa mínima cadastrada.
    if (results.some((result) => result === null)) return null;

    const productTotal = product.price * quantity;
    const customizationTotal = results.reduce((sum, result) => sum + (result?.customizationTotal ?? 0), 0);
    const grandTotal = productTotal + customizationTotal;
    return { productTotal, customizationTotal, grandTotal, unitTotal: grandTotal / quantity };
  }, [calculateForConfig, product.price, selectedConfigs]);

  const bestPricePerConfig = useMemo(() => {
    const map = new Map<string, number>();
    selectedConfigs.forEach(config => {
      let bestQty = -1, bestUnit = Infinity;
      quantities.forEach(qty => {
        const result = calculateForConfig(config, qty);
        if (result && result.unitTotal < bestUnit) { bestUnit = result.unitTotal; bestQty = qty; }
      });
      if (bestQty > 0) map.set(config.technique.id, bestQty);
    });
    return map;
  }, [selectedConfigs, quantities, calculateForConfig]);

  if (selectedConfigs.length === 0) return <div className="text-center py-8 text-muted-foreground"><Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Selecione técnicas para ver a comparação de preços</p></div>;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Técnica</TableHead>
              {quantities.map(qty => <TableHead key={qty} className="text-center min-w-[100px]">{formatNumber(qty)} un</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedConfigs.map((config) => (
              <TableRow key={config.technique.id}>
                <TableCell>
                  <div><p className="font-medium text-sm">{config.technique.techniqueName}</p><p className="text-xs text-muted-foreground">{config.colors} cor{config.colors > 1 ? 'es' : ''} • {availableSizes.find(s => s.value === config.sizeOption)?.label.split(' ')[0]}</p></div>
                </TableCell>
                {quantities.map(qty => {
                  const result = calculateForConfig(config, qty);
                  const minimum = minimumSupportedQuantity(getTiers(config.technique.techniqueCode));
                  const isBest = bestPricePerConfig.get(config.technique.id) === qty;
                  if (!result) return <TableCell key={qty} className="text-center text-xs text-muted-foreground">{minimum !== null && qty < minimum ? `Mín. ${formatNumber(minimum)}` : "N/D"}</TableCell>;
                  return (
                    <TableCell key={qty} className={cn("text-center relative", isBest && "bg-success/10 border border-success/30 rounded-lg")}>
                      {isBest && <Trophy className="w-3 h-3 text-success absolute top-1 right-1" />}
                      <div className="space-y-1"><p className={cn("font-bold text-sm", isBest ? "text-success" : "text-primary")}>{formatCurrency(result.unitTotal)}</p><p className="text-xs text-muted-foreground">Total: {formatCurrency(result.grandTotal)}</p></div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {selectedConfigs.length > 1 && (
              <TableRow className="bg-primary/5 font-semibold" data-testid="combined-techniques-row">
                <TableCell><div><p className="font-medium text-sm">Todas as técnicas</p><p className="text-xs text-muted-foreground">Produto + personalizações selecionadas</p></div></TableCell>
                {quantities.map(qty => {
                  const result = calculateCombined(qty);
                  return (
                    <TableCell key={qty} className="text-center" data-testid="combined-techniques-total">
                      {result
                        ? <div className="space-y-1"><p className="font-bold text-sm">{formatCurrency(result.unitTotal)}/un</p><p className="text-xs text-muted-foreground">Total: {formatCurrency(result.grandTotal)}</p></div>
                        : <span className="text-xs text-muted-foreground">N/D</span>}
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
            <TableRow className="bg-muted/30">
              <TableCell><div><p className="font-medium text-sm">Apenas Produto</p><p className="text-xs text-muted-foreground">Sem gravação</p></div></TableCell>
              {quantities.map(qty => <TableCell key={qty} className="text-center"><div className="space-y-1"><p className="font-bold text-sm">{formatCurrency(product.price)}</p><p className="text-xs text-muted-foreground">Total: {formatCurrency(product.price * qty)}</p></div></TableCell>)}
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
        <p className="font-medium mb-1">Valores incluem:</p>
        <ul className="list-disc list-inside space-y-0.5"><li>Preço do produto ({formatCurrency(product.price)}/un)</li><li>Custo de gravação por unidade</li><li>Setup e manuseio (quando aplicáveis)</li></ul>
      </div>
    </div>
  );
}
