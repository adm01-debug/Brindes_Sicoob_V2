/**
 * KitPersonalizationPreview — Card que exibe um toggle "com/sem personalização"
 * e mostra um sumário visual de quais itens/caixa terão gravação aplicada,
 * com badges semânticos. Reaproveitável junto ao preview isométrico.
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KitState } from '@/lib/kit-builder/types';
import { formatCurrency } from '@/lib/kit-builder';

interface KitPersonalizationPreviewProps {
  kitState: KitState;
  className?: string;
}

type PersonalizationConfig = NonNullable<KitState["personalization"]["box"]>;

interface PersonalizationRowProps {
  name: string;
  config: PersonalizationConfig;
  showPersonalization: boolean;
  isBox?: boolean;
}

function PersonalizationRow({ name, config, showPersonalization, isBox = false }: PersonalizationRowProps) {
  return (
    <div className={cn("flex items-center justify-between rounded-md border p-2 transition-opacity", !showPersonalization && "opacity-30")}>
      <div className="flex items-center gap-2 text-sm min-w-0">
        {isBox && <Package className="h-3.5 w-3.5 text-primary" />}
        <span className="font-medium truncate">{name}</span>
        {config.techniqueName && <Badge variant="outline" className="text-[10px] shrink-0">{config.techniqueName}</Badge>}
      </div>
      {config.estimatedPrice ? <span className="text-xs text-primary font-medium shrink-0">+{formatCurrency(config.estimatedPrice)}</span> : null}
    </div>
  );
}

interface PersonalizationSummaryProps {
  kitState: KitState;
  entries: Array<[string, PersonalizationConfig]>;
  showPersonalization: boolean;
}

function PersonalizationSummary({ kitState, entries, showPersonalization }: PersonalizationSummaryProps) {
  const boxConfig = kitState.personalization.box;
  return (
    <div className="space-y-2">
      {boxConfig?.enabled && <PersonalizationRow name="Caixa" config={boxConfig} showPersonalization={showPersonalization} isBox />}
      {entries.map(([itemId, config]) => {
        const item = kitState.items.find(candidate => candidate.id === itemId);
        if (!item) return null;
        return <PersonalizationRow key={itemId} name={item.name} config={config} showPersonalization={showPersonalization} />;
      })}
      <div className="flex items-center justify-between pt-2 border-t text-xs">
        <span className="text-muted-foreground">Acréscimo total/kit</span>
        <span className="font-semibold text-primary">{formatCurrency(kitState.personalizationPrice)}</span>
      </div>
    </div>
  );
}

function PreviewHeader({ enabled, checked, onCheckedChange }: { enabled: boolean; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-display font-semibold text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Personalização ao vivo</h3>
      <div className="flex items-center gap-2">
        <Label htmlFor="pers-toggle" className="text-xs text-muted-foreground cursor-pointer">{checked ? "Com logo" : "Sem logo"}</Label>
        <Switch id="pers-toggle" checked={checked} onCheckedChange={onCheckedChange} disabled={!enabled} />
      </div>
    </div>
  );
}

export function KitPersonalizationPreview({ kitState, className }: KitPersonalizationPreviewProps) {
  const [showPersonalization, setShowPersonalization] = useState(true);

  const itemPersEntries = Object.entries(kitState.personalization.items).filter((entry): entry is [string, PersonalizationConfig] => Boolean(entry[1]?.enabled));
  const hasAnyPersonalization = Boolean(kitState.personalization.box?.enabled || itemPersEntries.length > 0);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 space-y-3">
        <PreviewHeader enabled={hasAnyPersonalization} checked={showPersonalization} onCheckedChange={setShowPersonalization} />
        {!hasAnyPersonalization && <p className="text-xs text-muted-foreground">Configure gravação na etapa de personalização para ver o preview aqui.</p>}
        {hasAnyPersonalization && <PersonalizationSummary kitState={kitState} entries={itemPersEntries} showPersonalization={showPersonalization} />}
      </CardContent>
    </Card>
  );
}
