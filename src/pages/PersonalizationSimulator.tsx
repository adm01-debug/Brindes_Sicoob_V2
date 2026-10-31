/**
 * PersonalizationSimulator — simulador para visualizar cálculos de personalização sem criar mockup real.
 * Útil para vendedores estimarem custos rapidamente.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";
import { PageSEO } from "@/components/seo/PageSEO";

export default function PersonalizationSimulator() {
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(5);
  const [colors, setColors] = useState(1);
  const [quantity, setQuantity] = useState(100);
  const [unitCost, setUnitCost] = useState(0.5);
  const [setupCost, setSetupCost] = useState(50);

  const area = width * height;
  const total = setupCost + unitCost * area * colors * quantity;

  return (
    <div className="container mx-auto max-w-3xl p-6 space-y-6">
      <PageSEO title="Simulador de Personalização" description="Estime custos de personalização rapidamente." />
      <header className="space-y-1">
        <h1 data-testid="page-title-simulador-personalizacao" className="font-display text-2xl font-semibold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" /> Simulador de Personalização
        </h1>
        <p className="text-sm text-muted-foreground">Calcule estimativas de custo de gravação por área, cores e quantidade.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Largura (cm)</Label>
            <Input type="number" min={1} value={width} onChange={(e) => setWidth(+e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Altura (cm)</Label>
            <Input type="number" min={1} value={height} onChange={(e) => setHeight(+e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nº de cores</Label>
            <Input type="number" min={1} max={8} value={colors} onChange={(e) => setColors(+e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(+e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Custo unitário (R$/cm²/cor)</Label>
            <Input type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(+e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Setup (R$)</Label>
            <Input type="number" value={setupCost} onChange={(e) => setSetupCost(+e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardHeader>
          <CardTitle>Resultado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Área: <strong>{area} cm²</strong></p>
          <p>Total estimado: <strong className="text-2xl text-primary">R$ {total.toFixed(2)}</strong></p>
          <p className="text-muted-foreground text-xs">
            Estimativa didática — não consulta as tabelas oficiais de gravação. Para o cálculo
            real (áreas, técnicas, faixas e valores cadastrados), use o Simulador (wizard).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
