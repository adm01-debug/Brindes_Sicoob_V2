import { useMemo, useState } from 'react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown, Truck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupplierSelectProps {
  value: string;
  onChange: (id: string, name?: string, markupPercent?: number | null) => void;
  error?: string;
}

type Supplier = ReturnType<typeof useSuppliers>['suppliers'][number];

function SupplierOptions({ suppliers, value, onSelect }: { suppliers: Supplier[]; value: string; onSelect: (supplier: Supplier) => void }) {
  if (suppliers.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Nenhum fornecedor encontrado</p>;
  return <>{suppliers.map(supplier => <button key={supplier.id} type="button" className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left', value === supplier.id && 'bg-accent')} onClick={() => onSelect(supplier)}><Check className={cn('h-4 w-4 shrink-0', value === supplier.id ? 'opacity-100' : 'opacity-0')} /><span className="truncate">{supplier.name}</span></button>)}</>;
}

function SupplierPopoverContent({ suppliers, value, search, setSearch, loading, onSelect }: { suppliers: Supplier[]; value: string; search: string; setSearch: (value: string) => void; loading: boolean; onSelect: (supplier: Supplier) => void }) {
  return <PopoverContent className="w-[350px] p-0" align="start"><div className="p-2 border-b"><Input placeholder="Buscar fornecedor..." value={search} onChange={event => setSearch(event.target.value)} className="h-8" autoFocus /></div><ScrollArea className="h-[240px]"><div className="p-1">{loading ? <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p> : <SupplierOptions suppliers={suppliers} value={value} onSelect={onSelect} />}</div></ScrollArea></PopoverContent>;
}

function SupplierTrigger({ open, value, error, selectedName, onClear }: { open: boolean; value: string; error?: string; selectedName?: string; onClear: () => void }) {
  return <PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={open} className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', error && 'border-destructive')}><span className="flex items-center gap-2 truncate"><Truck className="h-4 w-4 shrink-0 text-muted-foreground" />{selectedName || 'Selecionar fornecedor...'}</span>{value ? <X className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100" onClick={event => { event.stopPropagation(); onClear(); }} /> : <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />}</Button></PopoverTrigger>;
}

export function SupplierSelect({ value, onChange, error }: SupplierSelectProps) {
  const { suppliers, isLoading } = useSuppliers();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q));
  }, [suppliers, search]);

  const selected = useMemo(
    () => suppliers.find(s => s.id === value),
    [suppliers, value]
  );
  const handleSelect = (supplier: Supplier) => {
    onChange(supplier.id, supplier.name, supplier.defaultMarkupPercent);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <SupplierTrigger open={open} value={value} error={error} selectedName={selected?.name} onClear={() => onChange('', '', null)} />
        <SupplierPopoverContent suppliers={filtered} value={value} search={search} setSearch={setSearch} loading={isLoading} onSelect={handleSelect} />
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
