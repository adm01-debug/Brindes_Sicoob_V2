/**
 * Flags / Status section — boolean toggles with expiration selectors
 */
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionCard } from '../ProductFormHelpers';
import { ShieldCheck, Info, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays } from "date-fns";
import type { UseFormSetValue } from 'react-hook-form';
import type { ProductFormData } from '../ProductFormSchema';

interface Props {
  setValue: UseFormSetValue<ProductFormData>;
  flags: Record<string, boolean>;
  expirations: Record<string, string | null>;
}

const EXPIRY_OPTIONS = [
  { value: '7', label: '7 dias' },
  { value: '15', label: '15 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: 'none', label: 'Sem limite' },
] as const;

/** Convert days-string to ISO date or null */
function daysToExpiry(days: string): string | null {
  if (days === 'none') return null;
  return addDays(new Date(), Number(days)).toISOString();
}

/** Find the closest option for an existing expiry date */
function expiryToOption(expiresAt: string | null): string {
  if (!expiresAt) return 'none';
  const diff = Math.round((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return '7';
  if (diff <= 10) return '7';
  if (diff <= 20) return '15';
  if (diff <= 60) return '30';
  if (diff <= 120) return '90';
  return 'none';
}

/** Format remaining days for display */
function formatRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const diff = Math.round((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Expirado';
  return `${diff}d restantes`;
}

type ExpiryKey = 'is_featured_expires_at' | 'is_bestseller_expires_at' | 'is_new_expires_at' | 'is_on_sale_expires_at';

const FLAG_CONFIG: { key: keyof ProductFormData; label: string; hint: string; expiryKey?: ExpiryKey; activeClass?: string }[] = [
  { key: 'is_active', label: 'Produto Ativo', hint: 'Define se o produto aparece no catálogo e pode ser adicionado a orçamentos', activeClass: 'bg-success/10 border-success/40' },
  { key: 'is_featured', label: 'Destaque', hint: 'Exibe o produto em posições de destaque no catálogo', expiryKey: 'is_featured_expires_at', activeClass: 'bg-primary/10 border-primary/40' },
  { key: 'is_bestseller', label: 'Mais Vendido', hint: 'Marca o produto como best-seller para filtros e exibição especial', expiryKey: 'is_bestseller_expires_at', activeClass: 'bg-warning/10 border-warning/40' },
  { key: 'is_new', label: 'Lançamento', hint: 'Indica que o produto é um lançamento recente no catálogo', expiryKey: 'is_new_expires_at', activeClass: 'bg-info/10 border-info/40' },
  { key: 'is_on_sale', label: 'Em Promoção', hint: 'Sinaliza o produto com badge de promoção', expiryKey: 'is_on_sale_expires_at', activeClass: 'bg-destructive/10 border-destructive/40' },
];

type FlagConfig = (typeof FLAG_CONFIG)[number];

function FlagExpiry({ expiryKey, expiresAt, remaining, setValue }: { expiryKey: ExpiryKey; expiresAt: string | null; remaining: string | null; setValue: UseFormSetValue<ProductFormData> }) {
  return <div className="px-3 pb-2.5 pt-0"><div className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-muted-foreground/60 shrink-0" /><Select value={expiryToOption(expiresAt)} onValueChange={value => setValue(expiryKey, daysToExpiry(value))}><SelectTrigger className="h-6 text-[10px] bg-background/50 border-border/30 w-full"><SelectValue /></SelectTrigger><SelectContent>{EXPIRY_OPTIONS.map(option => <SelectItem key={option.value} value={option.value} className="text-xs">{option.label}</SelectItem>)}</SelectContent></Select>{remaining && <span className={cn('text-[10px] whitespace-nowrap font-medium', remaining === 'Expirado' ? 'text-destructive' : 'text-muted-foreground/60')}>{remaining}</span>}</div></div>;
}

function ProductFlagCard({ config, value, expiresAt, setValue }: { config: FlagConfig; value: boolean; expiresAt: string | null; setValue: UseFormSetValue<ProductFormData> }) {
  const { key, label, hint, expiryKey, activeClass } = config;
  const toggle = () => {
    const nextValue = !value;
    setValue(key, nextValue);
    if (expiryKey) setValue(expiryKey, nextValue ? daysToExpiry('30') : null);
  };
  const remaining = expiryKey && value ? formatRemaining(expiresAt) : null;
  return <div className={cn('flex flex-col rounded-lg border transition-all duration-200', value ? (activeClass || 'bg-primary/5 border-primary/20') : 'border-border/50')}><div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 rounded-t-lg" onClick={toggle} role="switch" aria-checked={value} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } }}><div className="flex items-center gap-1.5"><Label className="cursor-pointer text-xs font-medium">{label}</Label><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground/40 cursor-help shrink-0" /></TooltipTrigger><TooltipContent className="text-xs max-w-[220px]">{hint}</TooltipContent></Tooltip></div><div onClick={event => event.stopPropagation()}><Switch checked={value} onCheckedChange={toggle} /></div></div>{expiryKey && value && <FlagExpiry expiryKey={expiryKey} expiresAt={expiresAt} remaining={remaining} setValue={setValue} />}</div>;
}

export function ProductFlagsSection({ setValue, flags, expirations }: Props) {
  const flagCount = Object.values(flags).filter(Boolean).length;

  return (
    <SectionCard id="flags" title="Status" icon={ShieldCheck} subtitle={`${flagCount} ativos`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {FLAG_CONFIG.map(config => <ProductFlagCard key={config.key} config={config} value={Boolean(flags[config.key])} expiresAt={config.expiryKey ? (expirations[config.expiryKey] ?? null) : null} setValue={setValue} />)}
      </div>
    </SectionCard>
  );
}
