import type { DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { GripVertical, ZoomIn, Star, X, Film, Type, CheckSquare, Square, CheckCircle2 } from 'lucide-react';
import { type ExternalImage, type VariantInfo, IMAGE_TYPES } from "./types";
import { ImageMetaEditor } from './ImageMetaEditor';

interface Props {
  filteredImages: string[];
  images: string[];
  extImageMap: Map<string, ExternalImage>;
  variantMap: Map<string, VariantInfo>;
  bulkMode: boolean;
  selectedUrls: Set<string>;
  editingIndex: number | null;
  dragIndex: number | null;
  dragOverIndex: number | null;
  toggleSelect: (url: string) => void;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: DragEvent, index: number) => void;
  handleDrop: (e: DragEvent, index: number) => void;
  handleDragEnd: () => void;
  setPreviewUrl: (url: string | null) => void;
  setEditingIndex: (index: number | null) => void;
  handleSetPrimary: (url: string) => void;
  requestRemove: (url: string) => void;
  updateExternalImageMeta: (url: string, data: { alt_text: string; image_type: string; caption: string }) => void;
}

type ImageTypeInfo = (typeof IMAGE_TYPES)[number] | null | undefined;

function ImageBadges({ first, typeInfo, variant }: { first: boolean; typeInfo: ImageTypeInfo; variant?: VariantInfo }) {
  return (
    <div className="absolute top-1 left-1 flex flex-col gap-0.5">
      {first && <Badge className="text-[9px] px-1 py-0 bg-primary text-primary-foreground leading-tight">Principal</Badge>}
      {typeInfo && !first && <Badge variant="secondary" className="text-[8px] px-1 py-0 leading-tight flex items-center gap-0.5"><typeInfo.icon className={cn("h-2 w-2", typeInfo.color)} />{typeInfo.label}</Badge>}
      {variant && <Badge variant="outline" className="text-[8px] px-1 py-0 leading-tight bg-background/80 backdrop-blur-sm flex items-center gap-0.5">
        {variant.color_hex && <div className="w-2 h-2 rounded-full border border-border/40" style={{ backgroundColor: variant.color_hex }} />}{variant.color_name || variant.name}
      </Badge>}
    </div>
  );
}

function MetaBadges({ image }: { image?: ExternalImage }) {
  return (
    <div className="absolute top-1 right-1 flex flex-col gap-0.5">
      {image?.is_og_image && <Badge variant="secondary" className="text-[8px] px-1 py-0 leading-tight">OG</Badge>}
      {image?.alt_text && <Tooltip><TooltipTrigger asChild><div className="w-3.5 h-3.5 rounded-full bg-primary/80 flex items-center justify-center"><CheckCircle2 className="h-2 w-2 text-white" /></div></TooltipTrigger><TooltipContent className="text-[10px] max-w-[180px]">Alt: {image.alt_text}</TooltipContent></Tooltip>}
    </div>
  );
}

function BulkCheckbox({ bulkMode, selected }: { bulkMode: boolean; selected: boolean }) {
  if (!bulkMode) return null;
  return <div className="absolute top-1 right-1 z-10"><div className={cn("w-5 h-5 rounded flex items-center justify-center transition-colors", selected ? "bg-primary text-primary-foreground" : "bg-black/50 text-white/70")}>{selected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}</div></div>;
}

interface HoverOverlayProps {
  editing: boolean;
  external?: ExternalImage;
  first: boolean;
  image: string;
  index: number;
  onEdit: (index: number) => void;
  onPrimary: (url: string) => void;
  onPreview: (url: string) => void;
  onRemove: (url: string) => void;
}

function HoverOverlay(props: HoverOverlayProps) {
  if (props.editing) return null;
  return (
    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
      <GripVertical className="absolute top-1 left-1 h-4 w-4 text-white/70 cursor-grab" />
      <Button type="button" variant="ghost" size="icon" aria-label="Ampliar" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => props.onPreview(props.image)}><ZoomIn className="h-3.5 w-3.5" /></Button>
      {props.external && <Button type="button" variant="ghost" size="icon" aria-label="Type" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => props.onEdit(props.index)} title="Editar metadados"><Type className="h-3.5 w-3.5" /></Button>}
      {!props.first && <Button type="button" variant="ghost" size="icon" aria-label="Favoritar" className="h-7 w-7 text-warning hover:bg-white/20" onClick={() => props.onPrimary(props.image)} title="Definir como principal"><Star className="h-3.5 w-3.5" /></Button>}
      <Button type="button" variant="ghost" size="icon" aria-label="Fechar" className="h-7 w-7 text-destructive hover:bg-white/20" onClick={() => props.onRemove(props.image)}><X className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

function tileClassName(grid: Props, globalIndex: number, first: boolean, selected: boolean): string {
  return cn(
    'relative group rounded-lg border-2 overflow-hidden aspect-square transition-all',
    first && !grid.bulkMode ? 'border-primary ring-1 ring-primary/30' : 'border-border/60',
    grid.dragIndex === globalIndex && 'opacity-50 scale-95',
    grid.dragOverIndex === globalIndex && grid.dragIndex !== globalIndex && 'border-primary border-dashed',
    grid.bulkMode && 'cursor-pointer',
    selected && 'border-primary ring-2 ring-primary/40',
  );
}

function TileMedia({ external, image, index }: { external?: ExternalImage; image: string; index: number }) {
  if (external?.image_type === 'video') {
    return <div className="w-full h-full bg-muted/30 flex items-center justify-center"><Film className="h-8 w-8 text-muted-foreground/40" /></div>;
  }
  return <img src={image} alt={external?.alt_text || `Imagem ${index + 1}`} className="w-full h-full object-contain bg-muted/30" loading="lazy" />;
}

function TileEditor({ editing, external, image, grid }: { editing: boolean; external?: ExternalImage; image: string; grid: Props }) {
  if (!editing || !external) return null;
  return <ImageMetaEditor image={external} onSave={(data) => grid.updateExternalImageMeta(image, data)} onCancel={() => grid.setEditingIndex(null)} />;
}

function tileVariant(grid: Props, external?: ExternalImage): VariantInfo | undefined {
  const code = external?.supplier_code || external?.variant_id;
  return code ? grid.variantMap.get(code) : undefined;
}

function ImageTile({ grid, image, index }: { grid: Props; image: string; index: number }) {
  const external = grid.extImageMap.get(image);
  const typeInfo = external?.image_type ? IMAGE_TYPES.find((type) => type.value === external.image_type) : null;
  const globalIndex = grid.images.indexOf(image);
  const first = globalIndex === 0;
  const variant = tileVariant(grid, external);
  const selected = grid.selectedUrls.has(image);
  const editing = grid.editingIndex === globalIndex;
  return (
    <div draggable={!grid.bulkMode} onDragStart={() => { if (!grid.bulkMode) grid.handleDragStart(globalIndex); }}
      onDragOver={(event) => { if (!grid.bulkMode) grid.handleDragOver(event, globalIndex); }}
      onDrop={(event) => { if (!grid.bulkMode) grid.handleDrop(event, globalIndex); }} onDragEnd={grid.handleDragEnd}
      onClick={grid.bulkMode ? () => grid.toggleSelect(image) : undefined}
      className={tileClassName(grid, globalIndex, first, selected)}>
      <TileMedia external={external} image={image} index={index} />
      <ImageBadges first={first} typeInfo={typeInfo} variant={variant} /><MetaBadges image={external} />
      <TileEditor editing={editing} external={external} image={image} grid={grid} />
      <BulkCheckbox bulkMode={grid.bulkMode} selected={selected} />
      {!grid.bulkMode && <HoverOverlay editing={editing} external={external} first={first} image={image} index={globalIndex}
        onEdit={grid.setEditingIndex} onPrimary={grid.handleSetPrimary} onPreview={grid.setPreviewUrl} onRemove={grid.requestRemove} />}
    </div>
  );
}

export function ImageGrid(props: Props) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
      {props.filteredImages.map((image, index) => <ImageTile key={`${image}-${index}`} grid={props} image={image} index={index} />)}
    </div>
  );
}
