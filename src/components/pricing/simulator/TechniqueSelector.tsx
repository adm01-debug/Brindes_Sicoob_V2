import { useState, useMemo, useEffect } from 'react';
import { useExternalPrintAreas } from '@/hooks/useExternalSimulator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Package,
  Ruler,
  Paintbrush,
  Palette,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { ProductTechnique, ComponentData, LocationData, TechniqueData } from './types';

interface TechniqueSelectorProps {
  productId: string;
  onSelect: (technique: ProductTechnique | null) => void;
  selectedTechnique: ProductTechnique | null;
}

function StepIndicator({ step }: { readonly step: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {['Componente', 'Local', 'Técnica'].map((label, index) => (
        <span key={label} className="contents">
          {index > 0 && <ChevronRight className="w-3 h-3" />}
          <span className={cn('px-2 py-1 rounded', step >= index + 1 ? 'bg-primary/20 text-primary font-medium' : 'bg-muted')}>{label}</span>
        </span>
      ))}
    </div>
  );
}

function ComponentStep({ components, onSelect }: { readonly components: readonly ComponentData[]; readonly onSelect: (component: ComponentData) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Qual parte do produto será personalizada?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {components.map((component, index) => (
          <button key={`${component.code}-${index}`} onClick={() => onSelect(component)} className="p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"><Package className="w-5 h-5 text-primary" /></div>
              <div><p className="font-medium">{component.name}</p><p className="text-xs text-muted-foreground">{component.locations.length} {component.locations.length === 1 ? 'local' : 'locais'} disponíveis</p></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LocationStep({ component, onBack, onSelect }: { readonly component: ComponentData; readonly onBack: () => void; readonly onSelect: (location: LocationData) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between"><p className="text-sm font-medium">Onde será a gravação em &quot;{component.name}&quot;?</p><Button variant="ghost" size="sm" onClick={onBack}><X className="w-3 h-3 mr-1" /> Voltar</Button></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {component.locations.map((location, index) => {
          const firstTechnique = location.techniques[0];
          const dimensions = firstTechnique?.maxWidth && firstTechnique.maxHeight ? `${firstTechnique.maxWidth}x${firstTechnique.maxHeight}mm` : 'Área variável';
          return (
            <button key={`${location.code}-${index}`} onClick={() => onSelect(location)} className="p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange/10 flex items-center justify-center group-hover:bg-orange/20 transition-colors"><Ruler className="w-5 h-5 text-orange" /></div>
                <div><p className="font-medium">{location.name}</p><p className="text-xs text-muted-foreground">{dimensions} • {location.techniques.length} {location.techniques.length === 1 ? 'técnica' : 'técnicas'}</p></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TechniqueStep({ location, onBack, onSelect }: { readonly location: LocationData; readonly onBack: () => void; readonly onSelect: (technique: TechniqueData) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between"><p className="text-sm font-medium">Qual técnica de gravação?</p><Button variant="ghost" size="sm" onClick={onBack}><X className="w-3 h-3 mr-1" /> Voltar</Button></div>
      <div className="grid gap-2">
        {location.techniques.map(technique => (
          <button key={technique.id} onClick={() => onSelect(technique)} className="p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors"><Paintbrush className="w-5 h-5 text-success" /></div><div><p className="font-medium">{technique.areaName || technique.techniqueCode}</p><p className="text-xs text-muted-foreground">{technique.techniqueCode && `Código: ${technique.techniqueCode}`}{technique.maxColors && ` • Até ${technique.maxColors} cores`}{technique.areaCm2 && ` • ${technique.areaCm2}cm²`}</p></div></div>
              {technique.isPrimary && <Badge className="bg-success/20 text-success border-success/30"><Sparkles className="w-3 h-3 mr-1" />Recomendado</Badge>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectedTechniqueSummary({ technique, onReset }: { readonly technique: ProductTechnique; readonly onReset: () => void }) {
  return (
    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Check className="w-5 h-5 text-success" /><span className="font-medium">Técnica selecionada</span></div><Button variant="ghost" size="sm" onClick={onReset}>Alterar</Button></div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div><p className="text-muted-foreground text-xs">Componente</p><p className="font-medium">{technique.componentName}</p></div>
        <div><p className="text-muted-foreground text-xs">Local</p><p className="font-medium">{technique.locationName}</p></div>
        <div><p className="text-muted-foreground text-xs">Técnica</p><p className="font-medium">{technique.techniqueName}</p></div>
      </div>
      {(technique.maxWidth || technique.maxColors) && <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">{technique.maxWidth && technique.maxHeight && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />Área máx: {technique.maxWidth}x{technique.maxHeight}mm</span>}{technique.maxColors && <span className="flex items-center gap-1"><Palette className="w-3 h-3" />Até {technique.maxColors} cores</span>}</div>}
    </div>
  );
}

interface TechniqueWizardProps {
  readonly components: readonly ComponentData[];
  readonly selectedComponent: ComponentData | null;
  readonly selectedLocation: LocationData | null;
  readonly selectedTechnique: ProductTechnique | null;
  readonly onComponentSelect: (component: ComponentData) => void;
  readonly onComponentBack: () => void;
  readonly onLocationSelect: (location: LocationData) => void;
  readonly onLocationBack: () => void;
  readonly onTechniqueSelect: (technique: TechniqueData) => void;
  readonly onReset: () => void;
}

function currentWizardStep(props: TechniqueWizardProps) {
  if (!props.selectedComponent) return 1;
  if (!props.selectedLocation) return 2;
  return props.selectedTechnique ? 4 : 3;
}

function TechniqueWizard(props: TechniqueWizardProps) {
  const wizardStep = currentWizardStep(props);
  return (
    <div className="space-y-4">
      <StepIndicator step={wizardStep} />
      {!props.selectedComponent && <ComponentStep components={props.components} onSelect={props.onComponentSelect} />}
      {props.selectedComponent && !props.selectedLocation && <LocationStep component={props.selectedComponent} onBack={props.onComponentBack} onSelect={props.onLocationSelect} />}
      {props.selectedComponent && props.selectedLocation && !props.selectedTechnique && <TechniqueStep location={props.selectedLocation} onBack={props.onLocationBack} onSelect={props.onTechniqueSelect} />}
      {props.selectedTechnique && <SelectedTechniqueSummary technique={props.selectedTechnique} onReset={props.onReset} />}
    </div>
  );
}

export function TechniqueSelector({
  productId,
  onSelect,
  selectedTechnique,
}: TechniqueSelectorProps) {
  const [selectedComponent, setSelectedComponent] = useState<ComponentData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  const { data: printAreas, isLoading, error } = useExternalPrintAreas(productId);

  const components = useMemo(() => {
    if (!printAreas) return [];
    return printAreas.map((area) => ({
      name: area.componentName,
      code: area.componentCode,
      locations: area.locations.map((loc) => ({
        name: loc.locationName,
        code: loc.locationCode,
        techniques: loc.techniques,
      })),
    }));
  }, [printAreas]);

  // Reset quando produto muda
  useEffect(() => {
    setSelectedComponent(null);
    setSelectedLocation(null);
    onSelect(null);
  }, [productId, onSelect]);

  const handleComponentSelect = (comp: ComponentData) => {
    setSelectedComponent(comp);
    setSelectedLocation(null);
    onSelect(null);
    if (comp.locations.length === 1) {
      const onlyLocation = comp.locations[0];
      if (onlyLocation) handleLocationSelect(onlyLocation, comp);
    }
  };

  const handleLocationSelect = (loc: LocationData, component?: ComponentData) => {
    const comp = component ?? selectedComponent;
    if (!comp) return;
    setSelectedLocation(loc);
    onSelect(null);
    const primaryTech = loc.techniques.find((t) => t.isPrimary);
    if (loc.techniques.length === 1 || primaryTech) {
      const techToSelect = primaryTech ?? loc.techniques[0];
      if (techToSelect) handleTechniqueSelect(techToSelect, loc, comp);
    }
  };

  const handleTechniqueSelect = (
    tech: TechniqueData,
    location?: LocationData,
    component?: ComponentData,
  ) => {
    const loc = location ?? selectedLocation;
    const comp = component ?? selectedComponent;
    if (!loc || !comp) return;
    const fullTechnique: ProductTechnique = {
      id: tech.id,
      techniqueCode: tech.techniqueCode,
      techniqueName: tech.areaName || tech.techniqueCode,
      componentName: comp.name,
      locationName: loc.name,
      locationCode: loc.code,
      composedCode: tech.servCode || `${comp.code}.${loc.code}.${tech.techniqueCode}`,
      maxWidth: tech.maxWidth,
      maxHeight: tech.maxHeight,
      maxArea: tech.areaCm2,
      maxColors: tech.maxColors,
      isCurved: tech.isCurved,
      isPrimary: tech.isPrimary,
    };
    onSelect(fullTechnique);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
        <AlertCircle className="w-5 h-5 mb-2" />
        <p>Erro ao carregar técnicas</p>
      </div>
    );
  }

  if (!components?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Paintbrush className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Este produto não possui técnicas de personalização cadastradas</p>
      </div>
    );
  }

  const resetSelection = () => {
    setSelectedComponent(null);
    setSelectedLocation(null);
    onSelect(null);
  };

  return <TechniqueWizard components={components} selectedComponent={selectedComponent} selectedLocation={selectedLocation} selectedTechnique={selectedTechnique} onComponentSelect={handleComponentSelect} onComponentBack={() => setSelectedComponent(null)} onLocationSelect={handleLocationSelect} onLocationBack={() => setSelectedLocation(null)} onTechniqueSelect={handleTechniqueSelect} onReset={resetSelection} />;
}
