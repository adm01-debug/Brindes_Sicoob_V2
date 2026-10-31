import type { ChangeEvent, DragEvent, RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Upload, Loader2, ImageIcon, Palette, FileImage, Plus } from 'lucide-react';
import { type VariantInfo, IMAGE_TYPES } from "./types";

interface Props {
  productId?: string;
  variants: VariantInfo[];
  variantMap: Map<string, VariantInfo>;
  variantImageCounts: Map<string, number>;
  uploadVariant: string;
  setUploadVariant: (v: string) => void;
  uploadImageType: string;
  setUploadImageType: (v: string) => void;
  isUploading: boolean;
  uploadCount: number;
  uploadProgress: number;
  isDragOverZone: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  handleFilesChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleDropZone: (e: DragEvent) => void;
  handleDropZoneDragOver: (e: DragEvent) => void;
  handleDropZoneDragLeave: (e: DragEvent) => void;
}

function VariantSelect({ productId, variants, counts, value, onChange }: {
  productId?: string;
  variants: VariantInfo[];
  counts: Map<string, number>;
  value: string;
  onChange: (value: string) => void;
}) {
  if (!productId || variants.length === 0) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-[180px] gap-1.5 text-xs rounded-md bg-background/60 border-border/40 hover:bg-background/80 transition-colors">
        <Palette className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><SelectValue placeholder="Sem variação" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-xs"><span className="flex items-center gap-1.5"><ImageIcon className="h-3 w-3 text-muted-foreground" />Imagem geral (sem cor)</span></SelectItem>
        {variants.map(variant => {
          const variantId = variant.supplier_code || variant.id;
          const count = counts.get(variantId) || 0;
          return (
            <SelectItem key={variant.id} value={variantId} className="text-xs">
              <span className="flex items-center gap-1.5">
                {variant.color_hex ? <div className="w-3 h-3 rounded-full border border-border/60 shrink-0" style={{ backgroundColor: variant.color_hex }} /> : <Palette className="h-3 w-3 text-muted-foreground" />}
                {variant.color_name || variant.name}
                {count > 0 && <span className="text-[9px] text-muted-foreground/70">({count})</span>}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function ImageTypeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-[140px] gap-1.5 text-xs rounded-md bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border border-primary/30 hover:border-primary/50 hover:from-primary/20 hover:via-primary/15 hover:to-primary/10 shadow-[0_0_8px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_12px_hsl(var(--primary)/0.25)] transition-all duration-300 text-foreground/90">
        <span className="text-muted-foreground/70 font-normal">Tipo:</span><SelectValue />
      </SelectTrigger>
      <SelectContent>
        {IMAGE_TYPES.filter(type => type.value !== 'video').map(type => <SelectItem key={type.value} value={type.value} className="text-xs"><span className="flex items-center gap-1.5"><type.icon className={cn("h-3.5 w-3.5", type.color)} />{type.label}</span></SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function UploadContextBadge({ variant, imageType }: { variant: VariantInfo | null | undefined; imageType: string }) {
  const activeType = IMAGE_TYPES.find(type => type.value === imageType);
  if (!variant && imageType === 'gallery') return null;
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-[10px] text-primary/80 font-medium">
      {variant && <span className="flex items-center gap-1">{variant.color_hex && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: variant.color_hex }} />}{variant.color_name || variant.name}</span>}
      {variant && imageType !== 'gallery' && <span className="opacity-50">·</span>}
      {imageType !== 'gallery' && activeType?.label}
    </div>
  );
}

function ImageDropZone({ isUploading, uploadCount, uploadProgress, isDragOver, fileInputRef, handleFilesChange, handleDrop, handleDragOver, handleDragLeave }: {
  isUploading: boolean; uploadCount: number; uploadProgress: number; isDragOver: boolean; fileInputRef: RefObject<HTMLInputElement>;
  handleFilesChange: (event: ChangeEvent<HTMLInputElement>) => void; handleDrop: (event: DragEvent) => void; handleDragOver: (event: DragEvent) => void; handleDragLeave: (event: DragEvent) => void;
}) {
  const progress = uploadCount > 0 ? (uploadProgress / uploadCount) * 100 : 0;
  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={cn('py-6 px-4 flex flex-col items-center justify-center gap-3 transition-all duration-200 cursor-pointer', isDragOver ? 'bg-primary/8' : 'bg-background/30 hover:bg-muted/20', isUploading && 'bg-muted/20 pointer-events-none')} onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesChange} className="hidden" />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2.5"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="text-sm font-medium text-foreground/70">Enviando {uploadProgress}/{uploadCount} imagem(ns)...</span><div className="w-48 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div></div>
      ) : (
        <>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-colors", isDragOver ? "bg-primary/15" : "bg-muted/30")}>{isDragOver ? <FileImage className="h-5 w-5 text-primary" /> : <Upload className="h-5 w-5 text-muted-foreground/50" />}</div>
          <div className="text-center"><p className="text-sm text-muted-foreground">{isDragOver ? <span className="text-primary font-medium">Solte as imagens aqui</span> : 'Arraste imagens aqui ou clique para enviar'}</p><p className="text-[11px] text-muted-foreground/50 mt-0.5">PNG, JPG até 5MB • Mín. 200×200px • Múltiplas imagens</p></div>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/40"><Plus className="h-3.5 w-3.5" /> Selecionar imagens</Button>
        </>
      )}
    </div>
  );
}

export function ImageUploadArea({
  productId, variants, variantMap, variantImageCounts, uploadVariant, setUploadVariant,
  uploadImageType, setUploadImageType, isUploading, uploadCount, uploadProgress,
  isDragOverZone, fileInputRef, handleFilesChange, handleDropZone, handleDropZoneDragOver, handleDropZoneDragLeave,
}: Props) {
  const activeVariant = (uploadVariant !== 'none' ? variantMap.get(uploadVariant) : null);

  return (
    <div className={cn(
      "rounded-xl border border-border/40 overflow-hidden transition-all duration-200",
      isDragOverZone ? "border-primary/60 ring-2 ring-primary/20 shadow-lg shadow-primary/5" : "hover:border-border/60",
    )}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/30">
        <VariantSelect productId={productId} variants={variants} counts={variantImageCounts} value={uploadVariant} onChange={setUploadVariant} />
        <ImageTypeSelect value={uploadImageType} onChange={setUploadImageType} />
        <UploadContextBadge variant={activeVariant} imageType={uploadImageType} />
      </div>
      <ImageDropZone
        isUploading={isUploading}
        uploadCount={uploadCount}
        uploadProgress={uploadProgress}
        isDragOver={isDragOverZone}
        fileInputRef={fileInputRef}
        handleFilesChange={handleFilesChange}
        handleDrop={handleDropZone}
        handleDragOver={handleDropZoneDragOver}
        handleDragLeave={handleDropZoneDragLeave}
      />
    </div>
  );
}
