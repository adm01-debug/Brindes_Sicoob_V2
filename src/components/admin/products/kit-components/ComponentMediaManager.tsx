/**
 * ComponentMediaManager — Mini gallery per kit component
 * Uses external-db-bridge (kit_component_media table) — no local storage
 */
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, Video, Trash2, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import {
  fetchComponentMedia,
  updateComponentMedia,
  deleteComponentMedia,
  type ComponentMedia,
} from './api';

interface Props {
  componentId: string;
  productId: string;
  componentName: string;
}

function MediaItem({ item, onDelete, onSetCover }: { item: ComponentMedia; onDelete: (item: ComponentMedia) => void; onSetCover: (item: ComponentMedia) => void }) {
  return (
    <div className={cn('relative group rounded-lg border overflow-hidden aspect-square bg-muted/30', item.is_cover && 'ring-2 ring-primary ring-offset-1 ring-offset-background')}>
      {item.media_type === 'image'
        ? <img src={item.url} alt={item.title || ''} className="w-full h-full object-cover" loading="lazy" />
        : <div className="w-full h-full flex items-center justify-center bg-muted"><Video className="h-5 w-5 text-warning" /></div>}
      <div className="absolute top-1 left-1">
        {item.media_type === 'video' && <Badge className="text-[8px] px-1 py-0 h-3.5 bg-warning/80 text-primary-foreground border-0">Vídeo</Badge>}
        {item.is_cover && <Badge className="text-[8px] px-1 py-0 h-3.5 bg-primary/80 text-primary-foreground border-0">Capa</Badge>}
      </div>
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
        {item.media_type === 'image' && !item.is_cover && (
          <button type="button" onClick={() => onSetCover(item)} className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 text-primary-foreground transition-colors" title="Definir como capa"><Star className="h-3 w-3" /></button>
        )}
        <button type="button" onClick={() => onDelete(item)} className="p-1.5 rounded-md bg-destructive/60 hover:bg-destructive/80 text-primary-foreground transition-colors" title="Excluir"><Trash2 className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

function useComponentMedia(componentId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const { data: media = [], isLoading } = useQuery({ queryKey: ['component-media', componentId], queryFn: () => fetchComponentMedia(componentId), enabled: enabled && Boolean(componentId), staleTime: 5 * 60 * 1000 });
  const invalidate = useCallback(() => { queryClient.invalidateQueries({ queryKey: ['component-media', componentId] }); }, [queryClient, componentId]);
  const handleDelete = async (item: ComponentMedia) => {
    try { await deleteComponentMedia(item.id); toast.success('Mídia removida'); invalidate(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao remover'); }
  };
  const handleSetCover = async (item: ComponentMedia) => {
    try {
      await Promise.all(media.filter(current => current.is_cover).map(current => updateComponentMedia(current.id, { is_cover: false })));
      await updateComponentMedia(item.id, { is_cover: true });
      toast.success('Capa definida');
      invalidate();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao definir capa'); }
  };
  return { media, isLoading, handleDelete, handleSetCover };
}

function MediaContent({ media, loading, onDelete, onSetCover }: { media: ComponentMedia[]; loading: boolean; onDelete: (item: ComponentMedia) => void; onSetCover: (item: ComponentMedia) => void }) {
  if (loading) return <div className="flex items-center justify-center py-4 text-muted-foreground text-xs"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando mídia...</div>;
  if (media.length === 0) return <div className="text-center py-4 text-muted-foreground text-[11px]">Nenhuma mídia adicionada a este componente</div>;
  return <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">{media.map(item => <MediaItem key={item.id} item={item} onDelete={onDelete} onSetCover={onSetCover} />)}</div>;
}

export function ComponentMediaManager({ componentId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { media, isLoading, handleDelete, handleSetCover } = useComponentMedia(componentId, isOpen);

  const imageCount = media.filter(m => m.media_type === 'image').length;
  const videoCount = media.filter(m => m.media_type === 'video').length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 w-full px-3 py-1.5 text-[10px] rounded-b-lg border border-t-0 transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-accent/30',
            isOpen && 'bg-accent/20 text-foreground',
          )}
        >
          <Image className="h-3 w-3" />
          <span>Mídia</span>
          {(imageCount > 0 || videoCount > 0) && (
            <div className="flex items-center gap-1 ml-1">
              {imageCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                  {imageCount} <Image className="h-2 w-2 ml-0.5" />
                </Badge>
              )}
              {videoCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-warning/15 text-warning border-warning/30">
                  {videoCount} <Video className="h-2 w-2 ml-0.5" />
                </Badge>
              )}
            </div>
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 rounded-b-lg p-3 space-y-3">
          <MediaContent media={media} loading={isLoading} onDelete={handleDelete} onSetCover={handleSetCover} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
