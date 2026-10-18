/**
 * Resumo logístico do kit. O portal não estima valores sem CEP, dimensões e
 * uma cotação real da transportadora.
 */

import { AlertCircle, Scale, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FreightEstimatorProps {
  totalWeightGrams: number;
  kitQuantity: number;
}

export function FreightEstimator({ totalWeightGrams, kitQuantity }: FreightEstimatorProps) {
  const safeQuantity = Math.max(1, kitQuantity);
  const totalWeightKg = (totalWeightGrams * safeQuantity) / 1000;
  const weightKnown = totalWeightGrams > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4 text-primary" />
          Planejamento de frete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-[11px] text-muted-foreground">Peso por kit</p>
            <p className="text-sm font-bold">
              {weightKnown ? `${(totalWeightGrams / 1000).toFixed(2)} kg` : 'Não informado'}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-2">
            <p className="text-[11px] text-muted-foreground">Peso total</p>
            <p className="text-sm font-bold">
              {weightKnown ? `${totalWeightKg.toFixed(2)} kg` : 'Não calculado'}
            </p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <p className="text-[11px] text-muted-foreground">Valor do frete</p>
            <p className="text-sm font-bold text-primary">Cotação pendente</p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 p-2.5 text-xs text-warning-foreground">
          {weightKnown
            ? <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>
            {weightKnown
              ? 'O valor depende do CEP, volumes e modalidade. Registre uma cotação real antes de aprovar a proposta.'
              : 'Informe o peso dos itens e registre CEP, volumes e uma cotação real antes de aprovar a proposta.'}
          </span>
        </div>

        <div className="flex justify-center">
          <Badge variant="outline" className="gap-1 text-[10px] font-normal text-muted-foreground">
            <AlertCircle className="h-2.5 w-2.5" />
            Nenhum valor estimado é somado ao orçamento
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
