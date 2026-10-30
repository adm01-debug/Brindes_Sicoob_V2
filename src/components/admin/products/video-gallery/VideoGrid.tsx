import type { DragEvent, MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Film, Play, Link2, Trash2, Unlink, Loader2, ImagePlus, GripVertical, Type,
} from 'lucide-react';
import { type ExternalVideo, type VariantLink, type VideoVariant, VIDEO_TYPES, formatBytes } from "./types";
import { VideoMetaEditor } from './VideoMetaEditor';

interface Props {
  filteredVideos: ExternalVideo[];
  videoLinksMap: Map<string, VariantLink[]>;
  variantMap: Map<string, VideoVariant>;
  variants: VideoVariant[];
  linkingVideoId: string | null;
  setLinkingVideoId: (id: string | null) => void;
  editingVideoId: string | null;
  setEditingVideoId: (id: string | null) => void;
  regeneratingId: string | null;
  dragIndex: number | null;
  dragOverIndex: number | null;
  getThumbnail: (video: ExternalVideo) => string | null;
  setPreviewVideo: (video: ExternalVideo | null) => void;
  linkVideoToVariant: (videoId: string, variantId: string) => void;
  unlinkVideoFromVariant: (linkId: string) => void;
  regenerateThumbnail: (video: ExternalVideo) => void;
  requestRemove: (videoId: string) => void;
  updateVideoMeta: (videoId: string, data: { title?: string | null; description?: string | null; video_type?: string }) => void;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: DragEvent, index: number) => void;
  handleDrop: (e: DragEvent, index: number) => void;
  handleDragEnd: () => void;
}

function VideoThumbnail({ video, thumbnail }: { video: ExternalVideo; thumbnail: string | null }) {
  if (thumbnail) return <img src={thumbnail} alt={video.title || 'Vídeo'} className="w-full h-full object-cover" loading="lazy" />;
  return <div className="w-full h-full bg-muted/30 flex items-center justify-center"><Film className="h-8 w-8 text-muted-foreground/40" /></div>;
}

function VideoBadges({ video }: { video: ExternalVideo }) {
  const typeInfo = VIDEO_TYPES.find(type => type.value === video.video_type);
  return (
    <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
      {video.is_primary && <Badge className="text-[9px] px-1 py-0 bg-primary text-primary-foreground">Principal</Badge>}
      {typeInfo && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-background/80 backdrop-blur-sm">{typeInfo.label}</Badge>}
    </div>
  );
}

function VariantDots({ links }: { links: VariantLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="absolute bottom-7 left-1.5 flex gap-0.5">
      {links.map(link => <Tooltip key={link.id}><TooltipTrigger asChild><span className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-sm" style={{ backgroundColor: link.variant_color_hex || '#999' }} /></TooltipTrigger><TooltipContent className="text-[10px]">{link.variant_name || 'Variação'}</TooltipContent></Tooltip>)}
    </div>
  );
}

function VideoInfoBar({ video }: { video: ExternalVideo }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-primary-foreground/80 truncate max-w-[70%]">{video.title || 'Vídeo'}</span>
        {video.file_size_bytes && video.file_size_bytes > 0 && <span className="text-[9px] text-primary-foreground/60">{formatBytes(video.file_size_bytes)}</span>}
      </div>
    </div>
  );
}

function VideoActions({ video, context }: { video: ExternalVideo; context: Props }) {
  const { variants, editingVideoId, setEditingVideoId, linkingVideoId, setLinkingVideoId, regeneratingId, regenerateThumbnail, requestRemove } = context;
  const needsThumbnail = !video.url_thumbnail && !video.source_youtube_id;
  const stopAndRun = (event: MouseEvent, action: () => void) => { event.stopPropagation(); action(); };
  return (
    <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <GripVertical className="h-4 w-4 text-primary-foreground/70 cursor-grab" />
      <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" aria-label="Type" variant="ghost" className="h-6 w-6 bg-foreground/50 hover:bg-primary text-primary-foreground" onClick={(event) => stopAndRun(event, () => setEditingVideoId(editingVideoId === video.id ? null : video.id))}><Type className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent className="text-xs">Editar metadados</TooltipContent></Tooltip>
      {variants.length > 0 && <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" aria-label="Link2" variant="ghost" className="h-6 w-6 bg-foreground/50 hover:bg-primary text-primary-foreground" onClick={(event) => stopAndRun(event, () => setLinkingVideoId(linkingVideoId === video.id ? null : video.id))}><Link2 className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent className="text-xs">Vincular a variação</TooltipContent></Tooltip>}
      {needsThumbnail && <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" aria-label="Carregando" variant="ghost" className="h-6 w-6 bg-foreground/50 hover:bg-warning text-primary-foreground" disabled={regeneratingId === video.id} onClick={(event) => stopAndRun(event, () => regenerateThumbnail(video))}>{regeneratingId === video.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}</Button></TooltipTrigger><TooltipContent className="text-xs">Gerar thumbnail</TooltipContent></Tooltip>}
      <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" aria-label="Excluir" variant="ghost" className="h-6 w-6 bg-foreground/50 hover:bg-destructive text-primary-foreground" onClick={(event) => stopAndRun(event, () => requestRemove(video.id))}><Trash2 className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent className="text-xs">Remover vídeo</TooltipContent></Tooltip>
    </div>
  );
}

function LinkingPanel({ video, links, context }: { video: ExternalVideo; links: VariantLink[]; context: Props }) {
  if (context.linkingVideoId !== video.id) return null;
  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm p-2 flex flex-col gap-1 z-10" onClick={(event) => event.stopPropagation()}>
      <span className="text-[10px] text-primary-foreground/80 font-medium">Vincular a variação:</span>
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {context.variants.map(variant => {
          const existingLink = links.find(link => link.variant_id === variant.id);
          const isLinked = Boolean(existingLink);
          const toggle = () => existingLink ? context.unlinkVideoFromVariant(existingLink.id) : context.linkVideoToVariant(video.id, variant.id);
          return <button key={variant.id} type="button" className={cn("w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] transition-colors", isLinked ? "bg-primary/30 text-primary-foreground" : "hover:bg-white/10 text-primary-foreground/70")} onClick={toggle}><span className="w-3 h-3 rounded-full border border-white/40 shrink-0" style={{ backgroundColor: variant.color_hex || '#999' }} /><span className="truncate">{variant.color_name || variant.name}</span>{isLinked && <Unlink className="h-2.5 w-2.5 ml-auto shrink-0 text-primary-foreground/60" />}</button>;
        })}
      </div>
      <Button type="button" size="sm" variant="ghost" className="h-5 text-[9px] text-primary-foreground/60 hover:text-primary-foreground" onClick={() => context.setLinkingVideoId(null)}>Fechar</Button>
    </div>
  );
}

function VideoCard({ video, index, context }: { video: ExternalVideo; index: number; context: Props }) {
  const links = context.videoLinksMap.get(video.id) || [];
  const editing = context.editingVideoId === video.id;
  return (
    <div draggable onDragStart={() => context.handleDragStart(index)} onDragOver={(event) => context.handleDragOver(event, index)} onDrop={(event) => context.handleDrop(event, index)} onDragEnd={context.handleDragEnd}
      className={cn('relative group rounded-lg border-2 overflow-hidden aspect-video transition-all cursor-pointer', video.is_primary ? 'border-primary ring-1 ring-primary/30' : 'border-border/60', context.dragIndex === index && 'opacity-50 scale-95', context.dragOverIndex === index && context.dragIndex !== index && 'border-primary border-dashed')}
      onClick={() => { if (!editing) context.setPreviewVideo(video); }}>
      <VideoThumbnail video={video} thumbnail={context.getThumbnail(video)} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"><Play className="h-5 w-5 text-primary-foreground ml-0.5" /></div></div>
      <VideoBadges video={video} />
      <VariantDots links={links} />
      <VideoInfoBar video={video} />
      <VideoActions video={video} context={context} />
      {editing && <VideoMetaEditor video={video} onSave={(data) => context.updateVideoMeta(video.id, data)} onCancel={() => context.setEditingVideoId(null)} />}
      <LinkingPanel video={video} links={links} context={context} />
    </div>
  );
}

export function VideoGrid(props: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {props.filteredVideos.map((video, index) => <VideoCard key={video.id} video={video} index={index} context={props} />)}
    </div>
  );
}
