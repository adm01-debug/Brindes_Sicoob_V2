/**
 * Kit Identity Picker — popover para definir cor, ícone e tag do kit
 */
import { type ComponentType, useState } from 'react';
import * as Lucide from 'lucide-react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { KitIdentity } from '@/lib/kit-builder';

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#22C55E', '#6366F1',
];

const PRESET_ICONS = [
  'Package', 'Gift', 'Heart', 'Star', 'Crown', 'Sparkles',
  'Briefcase', 'Coffee', 'Laptop', 'Leaf', 'Trophy', 'Users',
] as const;

interface Props {
  identity?: KitIdentity;
  onChange: (next: KitIdentity) => void;
}

const ICONS = Lucide as unknown as Record<string, ComponentType<{ className?: string }>>;

function valueOrDefault<T>(value: T | undefined, fallback: T): T {
  if (value === undefined) return fallback;
  return value;
}

function resolveIdentity(identity?: KitIdentity): KitIdentity {
  return {
    color: valueOrDefault(identity?.color, '#3B82F6'),
    icon: valueOrDefault(identity?.icon, 'Package'),
    tag: valueOrDefault(identity?.tag, ''),
    description: valueOrDefault(identity?.description, ''),
    isFavorite: valueOrDefault(identity?.isFavorite, false),
  };
}

function ColorPicker({ current, onChange }: { current: KitIdentity; onChange: Props["onChange"] }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Cor</Label>
      <div className="grid grid-cols-8 gap-2">
        {PRESET_COLORS.map((color) => (
          <button key={color} type="button" aria-label={`Cor ${color}`} onClick={() => onChange({ ...current, color })} className={cn('w-7 h-7 rounded-full border-2 transition-transform hover:scale-110', current.color === color ? 'border-foreground ring-2 ring-primary/30' : 'border-border')} style={{ background: color }} />
        ))}
      </div>
    </div>
  );
}

function IconChoice({ name, current, onChange }: { name: string; current: KitIdentity; onChange: Props["onChange"] }) {
  const Icon = ICONS[name];
  if (!Icon) return null;
  const active = current.icon === name;
  return (
    <button type="button" aria-label={name} onClick={() => onChange({ ...current, icon: name })} className={cn('h-9 rounded-md border flex items-center justify-center transition-colors', active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted')}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

function IconPicker({ current, onChange }: { current: KitIdentity; onChange: Props["onChange"] }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Ícone</Label>
      <div className="grid grid-cols-6 gap-2">{PRESET_ICONS.map((name) => <IconChoice key={name} name={name} current={current} onChange={onChange} />)}</div>
    </div>
  );
}

function TagEditor({ current, onChange }: { current: KitIdentity; onChange: Props["onChange"] }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="kit-tag" className="text-xs">Etiqueta</Label>
      <Input id="kit-tag" value={current.tag} onChange={(event) => onChange({ ...current, tag: event.target.value })} placeholder="ex: Cliente VIP, Natal, Onboarding" maxLength={32} className="h-9" />
    </div>
  );
}

export function KitIdentityPicker({ identity, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = resolveIdentity(identity);

  const Icon = ICONS[current.icon] || Lucide.Package;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label="Editar identidade do kit">
          <span
            className="w-4 h-4 rounded-full border border-border"
            style={{ background: current.color }}
            aria-hidden
          />
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">Identidade</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Identidade do kit</h4>
        </div>

        {/* Color */}
        <ColorPicker current={current} onChange={onChange} />

        {/* Icon */}
        <IconPicker current={current} onChange={onChange} />

        {/* Tag */}
        <TagEditor current={current} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
