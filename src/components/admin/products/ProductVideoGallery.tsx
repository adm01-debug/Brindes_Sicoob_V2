/**
 * ProductVideoGallery — Refactored orchestrator.
 * Logic extracted to useProductVideoGallery hook.
 * UI decomposed into VideoGrid, VideoUploadArea, VideoMetaEditor sub-components.
 */
import { Loader2, Film, Filter, Palette, Video, Link2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { getCloudflareEmbedUrl } from '@/utils/cloudflare-stream';
import { useProductVideoGallery } from './video-gallery/useProductVideoGallery';
import { VideoGrid } from './video-gallery/VideoGrid';
import { VideoUploadArea } from './video-gallery/VideoUploadArea';
import { ConfirmDeleteDialog } from './image-gallery/ConfirmDeleteDialog';
import { VIDEO_TYPES, formatBytes } from './video-gallery/types';

interface ProductVideoGalleryProps {
  productId?: string;
}

type GalleryState = ReturnType<typeof useProductVideoGallery>;
type PreviewVideo = NonNullable<GalleryState['previewVideo']>;

function VariantFilter({ gallery }: { gallery: GalleryState }) {
  if (gallery.variants.length === 0) return null;
  return (
    <Select value={gallery.filterVariant} onValueChange={gallery.setFilterVariant}>
      <SelectTrigger className="h-7 w-[160px] text-[11px]"><SelectValue placeholder="Variação" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs"><span className="flex items-center gap-1.5"><Palette className="h-3 w-3 text-muted-foreground" />Todas as variações</span></SelectItem>
        <SelectItem value="general" className="text-xs"><span className="flex items-center gap-1.5"><Video className="h-3 w-3 text-muted-foreground" />Sem variação (geral)</span></SelectItem>
        {gallery.variants.map(variant => <SelectItem key={variant.id} value={variant.id} className="text-xs"><span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-border/60 shrink-0" style={{ backgroundColor: variant.color_hex || '#999' }} />{variant.color_name || variant.name}</span></SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ThumbnailButton({ gallery }: { gallery: GalleryState }) {
  const missingCount = gallery.videos.filter(video => !video.url_thumbnail && !video.source_youtube_id).length;
  if (missingCount === 0) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground hover:text-primary" onClick={gallery.bulkRegenerateThumbnails} disabled={gallery.isBulkRegenerating}>
          {gallery.isBulkRegenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />} Gerar thumbnails
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">Gerar thumbnails para {missingCount} vídeo(s)</TooltipContent>
    </Tooltip>
  );
}

function GalleryFilters({ gallery }: { gallery: GalleryState }) {
  if (gallery.videos.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/30">
      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <Select value={gallery.filterType} onValueChange={gallery.setFilterType}>
        <SelectTrigger className="h-7 w-[120px] text-[11px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
        <SelectContent><SelectItem value="all" className="text-xs">Todos os tipos</SelectItem>{VIDEO_TYPES.map(type => <SelectItem key={type.value} value={type.value} className="text-xs"><span className="flex items-center gap-1.5"><type.icon className={`h-3 w-3 ${type.color}`} />{type.label}</span></SelectItem>)}</SelectContent>
      </Select>
      <VariantFilter gallery={gallery} />
      {gallery.hasFilters && <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground" onClick={() => { gallery.setFilterVariant('all'); gallery.setFilterType('all'); }}>Limpar filtros</Button>}
      <ThumbnailButton gallery={gallery} />
      <span className="ml-auto text-[10px] text-muted-foreground">{gallery.filteredVideos.length}/{gallery.videos.length}</span>
    </div>
  );
}

function VideoPreviewMeta({ video, gallery }: { video: PreviewVideo; gallery: GalleryState }) {
  const typeLabel = video.video_type ? VIDEO_TYPES.find(type => type.value === video.video_type)?.label : undefined;
  const links = gallery.videoLinksMap.get(video.id) || [];
  return (
    <div className="flex flex-wrap gap-2 px-2 pb-1 text-[11px] text-muted-foreground">
      {video.title && <span className="font-medium text-foreground/70">{video.title}</span>}
      {video.video_type && <Badge variant="secondary" className="text-[10px]">{typeLabel || video.video_type}</Badge>}
      {links.map(link => <Badge key={link.id} variant="outline" className="text-[10px] flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: link.variant_color_hex || '#999' }} />{link.variant_name}</Badge>)}
      {video.file_size_bytes && video.file_size_bytes > 0 && <span>{formatBytes(video.file_size_bytes)}</span>}
    </div>
  );
}

function VideoPreviewDialog({ gallery }: { gallery: GalleryState }) {
  const video = gallery.previewVideo;
  const embedUrl = video ? getCloudflareEmbedUrl(video.url_stream, { autoplay: true }) : null;
  return (
    <Dialog open={Boolean(video)} onOpenChange={() => gallery.setPreviewVideo(null)}>
      <DialogContent className="max-w-3xl p-2">
        {video && (
          <div className="space-y-2">
            <div className="aspect-video rounded-md overflow-hidden bg-black">
              {embedUrl ? <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Film className="h-8 w-8 opacity-40" /></div>}
            </div>
            <VideoPreviewMeta video={video} gallery={gallery} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VideoGalleryContent({ gallery, productId }: { gallery: GalleryState; productId?: string }) {
  return <div className="space-y-4"><GalleryFilters gallery={gallery} />{gallery.filteredVideos.length > 0 && <VideoGrid filteredVideos={gallery.filteredVideos} videoLinksMap={gallery.videoLinksMap} variantMap={gallery.variantMap} variants={gallery.variants} linkingVideoId={gallery.linkingVideoId} setLinkingVideoId={gallery.setLinkingVideoId} editingVideoId={gallery.editingVideoId} setEditingVideoId={gallery.setEditingVideoId} regeneratingId={gallery.regeneratingId} dragIndex={gallery.dragIndex} dragOverIndex={gallery.dragOverIndex} getThumbnail={gallery.getThumbnail} setPreviewVideo={gallery.setPreviewVideo} linkVideoToVariant={gallery.linkVideoToVariant} unlinkVideoFromVariant={gallery.unlinkVideoFromVariant} regenerateThumbnail={gallery.regenerateThumbnail} requestRemove={gallery.setDeleteConfirm} updateVideoMeta={gallery.updateVideoMeta} handleDragStart={gallery.handleVideoDragStart} handleDragOver={gallery.handleVideoDragOver} handleDrop={gallery.handleVideoDrop} handleDragEnd={gallery.handleVideoDragEnd} />}{gallery.videos.length > 0 && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground px-1 py-1.5 rounded-lg bg-muted/20 border border-border/30"><span className="font-medium text-foreground/70">{gallery.stats.total} vídeo(s)</span><span className="flex items-center gap-1"><Link2 className="h-2.5 w-2.5" />{gallery.stats.linked} vinculado(s)</span></div>}<VideoUploadArea productId={productId} variants={gallery.variants} uploadVideoType={gallery.uploadVideoType} setUploadVideoType={gallery.setUploadVideoType} uploadVariant={gallery.uploadVariant} setUploadVariant={gallery.setUploadVariant} isUploading={gallery.isUploading} uploadCount={gallery.uploadCount} uploadProgress={gallery.uploadProgress} isDragOver={gallery.isDragOver} fileInputRef={gallery.fileInputRef} handleFileSelect={gallery.handleFileSelect} handleDragOverZone={gallery.handleDragOverZone} handleDragLeaveZone={gallery.handleDragLeaveZone} handleDropZone={gallery.handleDropZone} youtubeUrl={gallery.youtubeUrl} setYoutubeUrl={gallery.setYoutubeUrl} addYoutubeVideo={gallery.addYoutubeVideo} isAddingYoutube={gallery.isAddingYoutube} /><VideoPreviewDialog gallery={gallery} /><ConfirmDeleteDialog open={Boolean(gallery.deleteConfirm)} onCancel={() => gallery.setDeleteConfirm(null)} onConfirm={() => { if (gallery.deleteConfirm) gallery.handleRemove(gallery.deleteConfirm); gallery.setDeleteConfirm(null); }} title="Remover vídeo" description="Tem certeza que deseja remover este vídeo? Esta ação não pode ser desfeita." /></div>;
}

export function ProductVideoGallery({ productId }: ProductVideoGalleryProps) {
  const g = useProductVideoGallery(productId);

  if (g.isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando vídeos...
      </div>
    );
  }

  return <VideoGalleryContent gallery={g} productId={productId} />;
}
