import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CheckSquare, Trash2, Loader2, Type } from 'lucide-react';
import { type VariantInfo, IMAGE_TYPES } from "./types";

interface Props {
  bulkMode: boolean;
  setBulkMode: (v: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  filteredImagesCount: number;
  selectedUrls: Set<string>;
  setSelectedUrls: (v: Set<string>) => void;
  bulkUpdateType: (type: string) => void;
  bulkUpdateVariant: (code: string) => void;
  bulkUpdateAltText: (template: string) => void;
  requestBulkDelete: () => void;
  isBulkUpdating: boolean;
  variants: VariantInfo[];
}

function AltTextPopover({ count, value, setValue, onApply, disabled }: { count: number; value: string; setValue: (value: string) => void; onApply: (value: string) => void; disabled: boolean }) {
  return <Popover><PopoverTrigger asChild><Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] gap-1" disabled={disabled}><Type className="h-3 w-3" /> Alt text</Button></PopoverTrigger><PopoverContent className="w-72 p-3 space-y-2" align="start"><p className="text-[11px] text-muted-foreground">Template para {count} imagem(ns). Use: <code className="text-[10px] bg-muted px-1 rounded">{'{tipo}'}</code> <code className="text-[10px] bg-muted px-1 rounded">{'{cor}'}</code> <code className="text-[10px] bg-muted px-1 rounded">{'{n}'}</code></p><Input value={value} onChange={event => setValue(event.target.value)} placeholder="Ex: Produto X - {tipo} - {cor}" className="h-7 text-xs" /><Button type="button" size="sm" className="h-7 text-[11px] w-full" disabled={!value.trim() || disabled} onClick={() => onApply(value)}>Aplicar a {count} imagem(ns)</Button></PopoverContent></Popover>;
}

function SelectedImageActions({ props, altTemplate, setAltTemplate }: { props: Props; altTemplate: string; setAltTemplate: (value: string) => void }) {
  const { selectedUrls, bulkUpdateType, bulkUpdateVariant, bulkUpdateAltText, requestBulkDelete, isBulkUpdating, variants } = props;
  if (selectedUrls.size === 0) return null;
  const applyAltText = (template: string) => { bulkUpdateAltText(template); setAltTemplate(''); };
  return <><div className="h-5 w-px bg-border/50" /><Select onValueChange={bulkUpdateType}><SelectTrigger className="h-7 w-[130px] text-[11px]" disabled={isBulkUpdating}><SelectValue placeholder="Alterar tipo" /></SelectTrigger><SelectContent>{IMAGE_TYPES.filter(type => type.value !== 'video').map(type => <SelectItem key={type.value} value={type.value} className="text-xs"><span className="flex items-center gap-1.5"><type.icon className={cn("h-3 w-3", type.color)} />{type.label}</span></SelectItem>)}</SelectContent></Select>{variants.length > 0 && <Select onValueChange={bulkUpdateVariant}><SelectTrigger className="h-7 w-[150px] text-[11px]" disabled={isBulkUpdating}><SelectValue placeholder="Alterar variação" /></SelectTrigger><SelectContent><SelectItem value="none" className="text-xs">Sem variação (geral)</SelectItem>{variants.map(variant => <SelectItem key={variant.id} value={variant.supplier_code || variant.id} className="text-xs"><span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-border/60 shrink-0" style={{ backgroundColor: variant.color_hex || '#999' }} />{variant.color_name || variant.name}</span></SelectItem>)}</SelectContent></Select>}<AltTextPopover count={selectedUrls.size} value={altTemplate} setValue={setAltTemplate} onApply={applyAltText} disabled={isBulkUpdating} /><Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] text-destructive hover:text-destructive gap-1" onClick={requestBulkDelete} disabled={isBulkUpdating}><Trash2 className="h-3 w-3" /> Remover ({selectedUrls.size})</Button>{isBulkUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}</>;
}

export function ImageBulkToolbar({ bulkMode, setBulkMode, clearSelection, selectAll, filteredImagesCount, selectedUrls, setSelectedUrls, bulkUpdateType, bulkUpdateVariant, bulkUpdateAltText, requestBulkDelete, isBulkUpdating, variants }: Props) {
  const [altTemplate, setAltTemplate] = useState('');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant={bulkMode ? "default" : "outline"} size="sm" className="h-7 text-[11px] gap-1.5"
        onClick={() => { setBulkMode(!bulkMode); if (bulkMode) clearSelection(); }}>
        <CheckSquare className="h-3 w-3" />
        {bulkMode ? 'Sair da seleção' : 'Selecionar'}
      </Button>

      {bulkMode && (
        <>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={selectAll}>
            Selecionar tudo ({filteredImagesCount})
          </Button>
          {selectedUrls.size > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setSelectedUrls(new Set())}>
              Limpar ({selectedUrls.size})
            </Button>
          )}
          <SelectedImageActions props={{ bulkMode, setBulkMode, clearSelection, selectAll, filteredImagesCount, selectedUrls, setSelectedUrls, bulkUpdateType, bulkUpdateVariant, bulkUpdateAltText, requestBulkDelete, isBulkUpdating, variants }} altTemplate={altTemplate} setAltTemplate={setAltTemplate} />
        </>
      )}
    </div>
  );
}
