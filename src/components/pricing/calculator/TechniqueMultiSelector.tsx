/**
 * TechniqueMultiSelector — Grid of available techniques to toggle.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalRpc } from '@/lib/external-rpc';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Package, Paintbrush, Palette, Ruler, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { ProductTechnique, SelectedTechniqueConfig } from './types';
import type { CustomizationOptionsResponse } from '@/types/customization';

interface Props {
  productId: string;
  selectedTechniques: SelectedTechniqueConfig[];
  onToggleTechnique: (technique: ProductTechnique, add: boolean) => void;
}

function mapTechniques(result: CustomizationOptionsResponse): ProductTechnique[] {
  const techniques: ProductTechnique[] = [];
  for (const location of result.locations || []) {
    for (const option of location.options || []) {
      techniques.push({
        id: option.technique_id,
        techniqueId: option.technique_id,
        techniqueName: option.tecnica_nome || 'Técnica',
        techniqueCode: option.codigo_tabela || '',
        componentName: location.location_name,
        locationName: location.location_name,
        locationCode: location.location_code,
        composedCode: option.codigo_tabela,
        maxWidth: null,
        maxHeight: null,
        maxArea: null,
        maxColors: option.max_cores ?? null,
        isDefault: false,
      });
    }
  }
  return techniques;
}

async function fetchProductTechniques(productId: string): Promise<ProductTechnique[]> {
  try {
    const result = await invokeExternalRpc<CustomizationOptionsResponse>(
      'fn_get_product_customization_options',
      { p_product_id: productId },
    );
    if (!result) return [];
    return mapTechniques(result);
  } catch (error) {
    logger.warn('Error fetching techniques via v6:', error);
    return [];
  }
}

export function TechniqueMultiSelector({ productId, selectedTechniques, onToggleTechnique }: Props) {
  const { data: techniques, isLoading, error } = useQuery({
    queryKey: ['product-techniques-multi', productId],
    queryFn: () => fetchProductTechniques(productId),
    enabled: !!productId,
  });

  if (isLoading) return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>;
  if (error) return <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive"><AlertCircle className="w-5 h-5 mb-2" /><p>Erro ao carregar técnicas</p></div>;
  if (!techniques?.length) return <div className="text-center py-8 text-muted-foreground"><Paintbrush className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Este produto não possui técnicas de personalização cadastradas</p></div>;

  const grouped = techniques.reduce((acc, tech) => { (acc[tech.componentName] ??= []).push(tech); return acc; }, {} as Record<string, ProductTechnique[]>);
  const isSelected = (techId: string) => selectedTechniques.some(st => st.technique.id === techId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Selecione uma ou mais técnicas de gravação para comparar</p>
      {Object.entries(grouped).map(([componentName, techs]) => (
        <div key={componentName} className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" />{componentName}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {techs.map(tech => {
              const selected = isSelected(tech.id);
              return (
                <button key={tech.id} onClick={() => onToggleTechnique(tech, !selected)}
                  className={cn("p-3 rounded-lg border text-left transition-all", selected ? "bg-primary/10 border-primary ring-1 ring-primary" : "bg-card hover:bg-accent border-border")}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2"><Checkbox checked={selected} className="pointer-events-none" /><span className="font-medium">{tech.techniqueName}</span></div>
                    {tech.isDefault && <Badge variant="secondary" className="text-xs"><Sparkles className="w-3 h-3 mr-1" />Padrão</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 ml-6">
                    <p>Local: {tech.locationName}</p>
                    <div className="flex items-center gap-3">
                      {tech.maxWidth && tech.maxHeight && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{tech.maxWidth}x{tech.maxHeight}cm</span>}
                      {tech.maxColors && <span className="flex items-center gap-1"><Palette className="w-3 h-3" />{tech.maxColors} cor{tech.maxColors > 1 ? 'es' : ''}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
