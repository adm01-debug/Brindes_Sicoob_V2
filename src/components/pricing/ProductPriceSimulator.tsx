import { type ElementType, useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Package, Paintbrush, Palette, Check, Plus, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  ProductSearch,
  ProductVariantSelector,
  TechniqueSelector,
  CustomizationOptions,
  formatCurrency,
  type Product,
  type ProductTechnique,
  type ConfiguredEngraving,
  type ProductColor,
  type ProductVariant,
} from './simulator';
import { EngravingList } from './simulator/EngravingList';
import { MultiEngravingResult } from './simulator/MultiEngravingResult';
import { invokeExternalDb } from '@/lib/external-db';

interface ProductPriceSimulatorProps {
  className?: string;
}

type SimulatorMode = 'list' | 'adding';

// ── Progress bar conectada (#4) ──
function StepProgressBar({
  steps,
  currentStep,
}: {
  steps: { number: number; label: string; icon: ElementType }[];
  currentStep: number;
}) {
  return (
    <div className="flex items-center w-full pb-4 border-b border-border overflow-x-auto gap-0">
      {steps.map((step, idx) => {
        const isComplete = step.number < currentStep;
        const isActive = step.number === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.number} className="flex items-center flex-1 min-w-0 last:flex-none">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                  isComplete
                    ? 'bg-success text-success-foreground'
                    : isActive
                    ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium hidden md:block transition-colors whitespace-nowrap',
                  isActive ? 'text-foreground' : isComplete ? 'text-success' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300"
                style={{
                  background: isComplete
                    ? 'hsl(var(--success))'
                    : 'hsl(var(--border))',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductStep({ product, onSelect }: { readonly product: Product | null; readonly onSelect: (product: Product | null) => void }) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between"><h3 className="font-display font-medium flex items-center gap-2"><Package className="w-4 h-4 text-primary" />1. Selecione o Produto</h3>{product && <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>Alterar</Button>}</div>
      {!product && <ProductSearch onSelect={onSelect} selectedProduct={product} />}
      {product && <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3"><Check className="w-5 h-5 text-success shrink-0" /><div className="flex-1 min-w-0"><span className="font-medium truncate block">{product.name}</span><span className="text-xs text-muted-foreground">SKU: {product.sku}</span></div><Badge variant="secondary">{formatCurrency(product.price)}</Badge></div>}
    </div>
  );
}

interface VariantStepProps {
  readonly visible: boolean;
  readonly hasSizes: boolean;
  readonly variants: readonly ProductVariant[];
  readonly selected: ProductVariant | null;
  readonly onSelect: (variant: ProductVariant | null) => void;
}

function VariantStep({ visible, hasSizes, variants, selected, onSelect }: VariantStepProps) {
  if (!visible) return null;
  return <div className="space-y-3 animate-fade-in"><div className="flex items-center justify-between"><h3 className="font-display font-medium flex items-center gap-2"><Palette className="w-4 h-4 text-primary" />2. {hasSizes ? 'Selecione Cor e Tamanho' : 'Selecione a Cor do Produto'}</h3></div><ProductVariantSelector variants={[...variants]} selectedVariant={selected} onSelect={onSelect} label="" /></div>;
}

interface EngravingStepProps {
  readonly product: Product | null;
  readonly visible: boolean;
  readonly hasVariants: boolean;
  readonly mode: SimulatorMode;
  readonly engravings: readonly ConfiguredEngraving[];
  readonly canAddMore: boolean;
  readonly currentTechnique: ProductTechnique | null;
  readonly currentColors: number;
  readonly currentSizeOption: string | null;
  readonly onRemove: (id: string) => void;
  readonly onStartAdd: () => void;
  readonly onCancel: () => void;
  readonly onTechniqueSelect: (technique: ProductTechnique | null) => void;
  readonly onColorsChange: (colors: number) => void;
  readonly onSizeChange: (size: string | null) => void;
  readonly onTableCodeChange: (code: string | null) => void;
  readonly onConfirm: () => void;
}

function EngravingStep(props: EngravingStepProps) {
  if (!props.visible || !props.product) return null;
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between"><h3 className="font-display font-medium flex items-center gap-2"><Paintbrush className="w-4 h-4 text-primary" />{props.hasVariants ? '3' : '2'}. Personalizações</h3></div>
      {props.mode === 'list' && <EngravingList engravings={[...props.engravings]} onRemove={props.onRemove} onAddNew={props.onStartAdd} canAddMore={props.canAddMore} maxEngravings={5} />}
      {props.mode === 'adding' && <div className="space-y-4 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 animate-scale-in">
        <div className="flex items-center justify-between"><h4 className="text-sm font-medium">Nova Gravação</h4><Button variant="ghost" size="sm" onClick={props.onCancel}><X className="w-4 h-4 mr-1" />Cancelar</Button></div>
        {!props.currentTechnique && <TechniqueSelector productId={props.product.id} onSelect={props.onTechniqueSelect} selectedTechnique={props.currentTechnique} />}
        {props.currentTechnique && <div className="space-y-4 animate-fade-in">
          <div className="p-3 rounded-lg bg-background border flex items-center gap-3"><Check className="w-5 h-5 text-success shrink-0" /><div className="flex-1 min-w-0"><p className="font-medium text-sm">{props.currentTechnique.techniqueName}</p><p className="text-xs text-muted-foreground">{props.currentTechnique.componentName} → {props.currentTechnique.locationName}</p></div><Button variant="ghost" size="sm" onClick={() => props.onTechniqueSelect(null)}>Alterar</Button></div>
          <div className="space-y-3"><h4 className="text-sm font-medium flex items-center gap-2"><Palette className="w-4 h-4 text-primary" />Opções de Personalização</h4><CustomizationOptions technique={props.currentTechnique} colors={props.currentColors} onColorsChange={props.onColorsChange} sizeOption={props.currentSizeOption} onSizeChange={props.onSizeChange} onTableCodeChange={props.onTableCodeChange} /></div>
          <Button className="w-full" onClick={props.onConfirm}><Plus className="w-4 h-4 mr-2" />Adicionar Gravação</Button>
        </div>}
      </div>}
    </div>
  );
}

interface ResultStepProps {
  readonly visible: boolean;
  readonly product: Product | null;
  readonly hasVariants: boolean;
  readonly engravings: readonly ConfiguredEngraving[];
  readonly quantity: number;
  readonly onQuantityChange: (quantity: number) => void;
  readonly onCreateQuote: () => void;
}

function ResultStep(props: ResultStepProps) {
  if (!props.visible || !props.product) return null;
  return <div className="space-y-4 animate-fade-in"><h3 className="font-display font-medium flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" />{props.hasVariants ? '4' : '3'}. Quantidade e Resultado</h3><MultiEngravingResult product={props.product} engravings={[...props.engravings]} quantity={props.quantity} onQuantityChange={props.onQuantityChange} /><Button size="lg" className="w-full gap-2 font-display font-semibold" onClick={props.onCreateQuote}><FileText className="w-5 h-5" />Criar Orçamento a partir desta Simulação</Button></div>;
}

interface SimulatorVisibilityOptions {
  readonly product: Product | null;
  readonly hasVariants: boolean;
  readonly selectedVariant: ProductVariant | null;
  readonly hasEngravings: boolean;
  readonly mode: SimulatorMode;
}

function simulatorVisibility({ product, hasVariants, selectedVariant, hasEngravings, mode }: SimulatorVisibilityOptions) {
  const productReady = Boolean(product);
  const variantReady = !hasVariants || Boolean(selectedVariant);
  return {
    needsVariantSelection: hasVariants && !selectedVariant,
    showVariantStep: productReady && hasVariants,
    showEngravingStep: productReady && variantReady,
    showResults: productReady && hasEngravings && variantReady && mode === 'list',
  };
}

export function ProductPriceSimulator({ className }: ProductPriceSimulatorProps) {
  const navigate = useNavigate();

  // Estado do produto
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  
  // Lista de gravações configuradas
  const [engravings, setEngravings] = useState<ConfiguredEngraving[]>([]);
  
  // Estado para adicionar nova gravação
  const [mode, setMode] = useState<SimulatorMode>('list');
  const [currentTechnique, setCurrentTechnique] = useState<ProductTechnique | null>(null);
  const [currentColors, setCurrentColors] = useState(1);
  const [currentSizeOption, setCurrentSizeOption] = useState<string | null>(null);
  const [currentTableCode, setCurrentTableCode] = useState<string | null>(null);
  
  // Quantidade
  const [quantity, setQuantity] = useState(100);

  const MAX_ENGRAVINGS = 5;

  // Fetch real variants from external DB
  const { data: dbVariants } = useQuery({
    queryKey: ['simulator-variants', selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct) return [];
      const result = await invokeExternalDb<{
        id: string;
        color_name: string | null;
        color_hex: string | null;
        color_code: string | null;
        size_code: string | null;
        stock_quantity: number | null;
        sale_price: number | null;
        sku: string | null;
      }>({
        table: 'product_variants',
        operation: 'select',
        select: 'id, color_name, color_hex, color_code, size_code, stock_quantity, sale_price, sku',
        filters: { product_id: selectedProduct.id, is_active: true },
        limit: 200,
        orderBy: { column: 'color_name', ascending: true },
      });
      return (result.records ?? []).filter(v => v.color_name);
    },
    enabled: !!selectedProduct?.id,
    staleTime: 5 * 60 * 1000,
  });

  const productVariants: ProductVariant[] = useMemo(() => {
    if (dbVariants && dbVariants.length > 0) {
      return dbVariants.map(v => ({
        code: v.id,
        name: v.color_name || 'Padrão',
        hex: v.color_hex || undefined,
        stock: v.stock_quantity ?? undefined,
        size_code: v.size_code,
        sale_price: v.sale_price,
      }));
    }
    if (!selectedProduct?.colors) return [];
    return (selectedProduct.colors as ProductColor[]).map((c) => ({
      code: c.code,
      name: c.name,
      hex: c.hex,
      stock: c.stock,
    }));
  }, [dbVariants, selectedProduct]);

  const hasSizes = useMemo(() => productVariants.some(v => v.size_code), [productVariants]);
  const hasVariants = productVariants.length > 0;

  const handleProductSelect = useCallback((product: Product | null) => {
    setSelectedProduct(product);
    setSelectedVariant(null);
    setEngravings([]);
    setMode('list');
    setCurrentTechnique(null);
  }, []);

  const handleVariantSelect = useCallback((variant: ProductVariant | null) => {
    setSelectedVariant(variant);
  }, []);

  const handleStartAddEngraving = useCallback(() => {
    setMode('adding');
    setCurrentTechnique(null);
    setCurrentColors(1);
    setCurrentSizeOption(null);
    setCurrentTableCode(null);
  }, []);

  const handleCancelAddEngraving = useCallback(() => {
    setMode('list');
    setCurrentTechnique(null);
  }, []);

  const handleTechniqueSelect = useCallback((technique: ProductTechnique | null) => {
    setCurrentTechnique(technique);
    if (technique) {
      setCurrentColors(1);
      setCurrentSizeOption(null);
    }
  }, []);

  const handleConfirmEngraving = useCallback(() => {
    if (!currentTechnique) return;

    const newEngraving: ConfiguredEngraving = {
      id: crypto.randomUUID(),
      technique: currentTechnique,
      colors: currentColors,
      sizeOption: currentSizeOption,
      tableCode: currentTableCode,
    };

    setEngravings((prev) => [...prev, newEngraving]);
    setMode('list');
    setCurrentTechnique(null);
  }, [currentTechnique, currentColors, currentSizeOption, currentTableCode]);

  const handleRemoveEngraving = useCallback((id: string) => {
    setEngravings((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const canAddMore = engravings.length < MAX_ENGRAVINGS;
  const hasEngravings = engravings.length > 0;
  const visibility = simulatorVisibility({ product: selectedProduct, hasVariants, selectedVariant, hasEngravings, mode });

  const getCurrentStep = () => {
    if (!selectedProduct) return 1;
    if (visibility.needsVariantSelection) return 2;
    if (mode === 'adding') {
      if (!currentTechnique) return 3;
      return 4;
    }
    if (hasEngravings) return 5;
    return 3;
  };

  const currentStep = getCurrentStep();

  const steps = [
    { number: 1, label: 'Produto', icon: Package },
    { number: 2, label: hasSizes ? 'Cor/Tam' : 'Cor', icon: Palette },
    { number: 3, label: 'Gravação', icon: Paintbrush },
    { number: 4, label: 'Opções', icon: Palette },
    { number: 5, label: 'Resultado', icon: Calculator },
  ];

  // #9 — CTA para criar orçamento
  const handleCreateQuote = useCallback(() => {
    navigate('/orcamentos', {
      state: {
        fromSimulator: true,
        product: selectedProduct,
        engravings,
        quantity,
      },
    });
  }, [navigate, selectedProduct, engravings, quantity]);

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle className="font-display">Simulador por Produto</CardTitle>
        </div>
        <CardDescription>
          Configure produto, cores e personalizações para simular o orçamento
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* #4 — Progress bar conectada */}
        <StepProgressBar steps={steps} currentStep={currentStep} />

        <ProductStep product={selectedProduct} onSelect={handleProductSelect} />
        <VariantStep visible={visibility.showVariantStep} hasSizes={hasSizes} variants={productVariants} selected={selectedVariant} onSelect={handleVariantSelect} />
        <EngravingStep product={selectedProduct} visible={visibility.showEngravingStep} hasVariants={hasVariants} mode={mode} engravings={engravings} canAddMore={canAddMore} currentTechnique={currentTechnique} currentColors={currentColors} currentSizeOption={currentSizeOption} onRemove={handleRemoveEngraving} onStartAdd={handleStartAddEngraving} onCancel={handleCancelAddEngraving} onTechniqueSelect={handleTechniqueSelect} onColorsChange={setCurrentColors} onSizeChange={setCurrentSizeOption} onTableCodeChange={setCurrentTableCode} onConfirm={handleConfirmEngraving} />
        <ResultStep visible={visibility.showResults} product={selectedProduct} hasVariants={hasVariants} engravings={engravings} quantity={quantity} onQuantityChange={setQuantity} onCreateQuote={handleCreateQuote} />
      </CardContent>
    </Card>
  );
}

export default ProductPriceSimulator;
