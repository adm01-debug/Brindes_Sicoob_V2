/**
 * IdentitySuggestionButton — Bloco discreto que ativa sugestão IA de
 * tag+cor+ícone. Usado quando a identidade está vazia ou genérica.
 */
import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Sparkles, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useKitIdentitySuggestion } from '@/hooks/useKitIdentitySuggestion';
import type { KitIdentity } from '@/lib/kit-builder';

interface Props {
  kitName: string;
  items: Array<{ name?: string; sku?: string }>;
  description?: string | null;
  current?: KitIdentity;
  onApply: (identity: Partial<KitIdentity>) => void;
}

function getIcon(name: string) {
  const I = (Lucide as unknown as Record<string, Lucide.LucideIcon>)[name];
  return I ?? Lucide.Package;
}

interface SuggestIdentityButtonProps {
  isLoading: boolean;
  onSuggest: () => void;
}

function SuggestIdentityButton({ isLoading, onSuggest }: SuggestIdentityButtonProps) {
  return (
    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-primary hover:text-primary" onClick={onSuggest} disabled={isLoading}>
      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      {isLoading ? "Pensando..." : "Sugerir identidade"}
    </Button>
  );
}

interface SuggestionCardProps {
  suggestion: NonNullable<ReturnType<typeof useKitIdentitySuggestion>["suggestion"]>;
  onApply: () => void;
  onDismiss: () => void;
}

function SuggestionCard({ suggestion, onApply, onDismiss }: SuggestionCardProps) {
  const SuggestionIcon = getIcon(suggestion.icon);
  return (
    <Card className="border-primary/40 bg-primary/5 animate-fade-in">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${suggestion.color}22`, color: suggestion.color }}>
            <SuggestionIcon className="h-4 w-4" />
          </div>
          <Badge style={{ backgroundColor: suggestion.color, color: "white" }} className="text-[10px]">{suggestion.tag}</Badge>
          {suggestion.rationale && <p className="text-[10px] text-muted-foreground line-clamp-1 flex-1">{suggestion.rationale}</p>}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" className="h-7 text-xs flex-1" onClick={onApply}><Check className="h-3 w-3 mr-1" /> Aplicar</Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDismiss} aria-label="Dispensar sugestão"><X className="h-3 w-3" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function canSuggestIdentity(kitName: string, itemCount: number, current: KitIdentity | undefined, dismissed: boolean): boolean {
  const hasIdentity = Boolean(current?.tag && current.color && current.icon);
  return !hasIdentity && !dismissed && (Boolean(kitName.trim()) || itemCount > 0);
}

export function IdentitySuggestionButton({ kitName, items, description, current, onApply }: Props) {
  const { suggest, suggestion, isLoading, clear } = useKitIdentitySuggestion();
  const [dismissed, setDismissed] = useState(false);

  if (!canSuggestIdentity(kitName, items.length, current, dismissed)) return null;

  if (!suggestion) return <SuggestIdentityButton isLoading={isLoading} onSuggest={() => suggest({ name: kitName, items, description })} />;

  const dismiss = () => { clear(); setDismissed(true); };
  const apply = () => {
    onApply({ tag: suggestion.tag, color: suggestion.color, icon: suggestion.icon });
    dismiss();
  };
  return <SuggestionCard suggestion={suggestion} onApply={apply} onDismiss={dismiss} />;
}
