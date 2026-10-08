/**
 * Hook: All state and handlers for ProductVideoGallery.
 */
import { isNullish } from "@/components/admin/utils/nullish";
import { useState, useCallback, useMemo, useRef, type ChangeEvent, type DragEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { type ExternalVideo, type VariantLink, type VideoVariant, ACCEPTED_VIDEO_TYPES, MAX_FILE_SIZE, extractThumbnailFromVideo, parseYouTubeId } from "./types";

const VIDEO_STORAGE_BUCKET = 'product-videos';
const EXTERNAL_VIDEOS_QUERY_KEY = 'product-videos-ext';
const EXTERNAL_DB_BRIDGE = 'external-db-bridge';
const VIDEO_VARIANT_LINKS_QUERY_KEY = 'video-variant-links';

function videoValidationError(file: File): string | null {
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) return `"${file.name}" não é um formato suportado`;
  if (file.size > MAX_FILE_SIZE) return `"${file.name}" excede 100MB`;
  return null;
}

async function createVideoThumbnail(file: File, productId: string | undefined, baseName: string): Promise<string | null> {
  try {
    const thumbnail = await extractThumbnailFromVideo(file);
    if (!thumbnail) return null;
    const path = `thumbnails/${productId || 'new'}/${baseName}.jpg`;
    const { data, error } = await supabase.storage.from(VIDEO_STORAGE_BUCKET).upload(path, thumbnail, {
      contentType: 'image/jpeg', cacheControl: '86400', upsert: false,
    });
    if (error || !data) return null;
    return supabase.storage.from(VIDEO_STORAGE_BUCKET).getPublicUrl(data.path).data.publicUrl;
  } catch (error) {
    logger.warn('Thumbnail generation failed:', error);
    return null;
  }
}

async function linkVideoVariant(videoId: string | null, variantCode: string, variants: Map<string, VideoVariant>, productId: string): Promise<void> {
  if (!videoId || variantCode === 'none') return;
  const variant = variants.get(variantCode);
  if (!variant) return;
  await supabase.from('video_variant_links').insert({
    video_id: videoId,
    variant_id: variant.id,
    variant_name: variant.color_name || variant.name,
    variant_color_hex: variant.color_hex,
    supplier_code: variant.supplier_code || null,
    product_id: productId,
  });
}

interface VideoRecordInput {
  url: string;
  size: number;
  name: string;
  thumbnail: string | null;
  youtubeId?: string;
}

interface ProcessVideoFilesInput {
  files: File[];
  upload: (file: File) => Promise<{ url: string; size: number; thumbnailUrl: string | null } | null>;
  createRecord: (input: VideoRecordInput) => Promise<string | null>;
  variantCode: string;
  variants: Map<string, VideoVariant>;
  productId: string;
  onProgress: (value: number) => void;
}

async function processVideoFiles({
  files, upload, createRecord, variantCode, variants, productId, onProgress,
}: ProcessVideoFilesInput): Promise<number> {
  let successCount = 0;
  for (let index = 0; index < files.length; index++) {
    onProgress(index + 1);
    const file = files[index];
    if (!file) continue;
    const uploaded = await upload(file);
    if (!uploaded) continue;
    const videoId = await createRecord({ url: uploaded.url, size: uploaded.size, name: file.name, thumbnail: uploaded.thumbnailUrl });
    await linkVideoVariant(videoId, variantCode, variants, productId);
    successCount++;
  }
  return successCount;
}

function videoSource(video: ExternalVideo): string | null {
  return video.url_original || video.url_stream || null;
}

async function regenerateVideoThumbnail(videoUrl: string, productId: string): Promise<string | null> {
  const response = await fetch(videoUrl);
  if (!response.ok) throw new Error('Falha ao baixar vídeo');
  const blob = await response.blob();
  const file = new File([blob], 'video.mp4', { type: blob.type || 'video/mp4' });
  const thumbnail = await extractThumbnailFromVideo(file);
  if (!thumbnail) return null;
  const path = `thumbnails/${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  const { data, error } = await supabase.storage.from(VIDEO_STORAGE_BUCKET).upload(path, thumbnail, {
    contentType: 'image/jpeg', cacheControl: '86400', upsert: false,
  });
  if (error || !data) throw new Error('Erro ao salvar thumbnail');
  return supabase.storage.from(VIDEO_STORAGE_BUCKET).getPublicUrl(data.path).data.publicUrl;
}

export function useProductVideoGallery(productId?: string) {
  const queryClient = useQueryClient();
  const [previewVideo, setPreviewVideo] = useState<ExternalVideo | null>(null);
  const [uploadVideoType, setUploadVideoType] = useState('product_video');
  const [uploadVariant, setUploadVariant] = useState('none');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterVariant, setFilterVariant] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [linkingVideoId, setLinkingVideoId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [isBulkRegenerating, setIsBulkRegenerating] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isAddingYoutube, setIsAddingYoutube] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch videos
  const { data: videos = [], isLoading } = useQuery<ExternalVideo[]>({
    queryKey: [EXTERNAL_VIDEOS_QUERY_KEY, productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
        body: { table: 'product_videos', operation: 'select', filters: { product_id: productId, is_active: true }, orderBy: { column: 'display_order', ascending: true }, limit: 50 },
      });
      if (error) return [];
      return data?.data?.records || [];
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch variants
  const { data: variants = [] } = useQuery<VideoVariant[]>({
    queryKey: ['product-variants-for-videos', productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
        body: { table: 'product_variants', operation: 'select', select: 'id, name, color_name, color_hex, color_code', filters: { product_id: productId, is_active: true }, limit: 200, orderBy: { column: 'name', ascending: true } },
      });
      if (error) return [];
      const records = data?.data?.records || [];
      return records.map((record: Record<string, unknown>) => {
        const colorName = typeof record.color_name === 'string' ? record.color_name : null;
        const colorHex = typeof record.color_hex === 'string' ? record.color_hex : null;
        return {
          id: String(record.id),
          name: String(record.name ?? colorName ?? 'Variação'),
          color_name: colorName,
          color_hex: colorHex,
          supplier_code: !isNullish(record.color_code) ? String(record.color_code) : undefined,
        };
      });
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch variant links
  const { data: variantLinks = [] } = useQuery<VariantLink[]>({
    queryKey: [VIDEO_VARIANT_LINKS_QUERY_KEY, productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase.from('video_variant_links').select('*').eq('product_id', productId);
      if (error) return [];
      return data || [];
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  // Lookup maps
  const videoLinksMap = useMemo(() => {
    const map = new Map<string, VariantLink[]>();
    variantLinks.forEach(link => {
      const existing = map.get(link.video_id) || [];
      existing.push(link);
      map.set(link.video_id, existing);
    });
    return map;
  }, [variantLinks]);

  const variantMap = useMemo(() => {
    const map = new Map<string, VideoVariant>();
    variants.forEach(v => { map.set(v.id, v); if (v.supplier_code) map.set(v.supplier_code, v); });
    return map;
  }, [variants]);

  // Filtered videos
  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      if (filterType !== 'all' && (video.video_type || 'product_video') !== filterType) return false;
      if (filterVariant === 'all') return true;
      if (filterVariant === 'general') return (videoLinksMap.get(video.id)?.length || 0) === 0;
      const links = videoLinksMap.get(video.id) || [];
      return links.some(l => l.variant_id === filterVariant || l.supplier_code === filterVariant);
    });
  }, [videos, filterType, filterVariant, videoLinksMap]);

  // Stats
  const stats = useMemo(() => {
    const linkedCount = videos.filter((video) => (videoLinksMap.get(video.id)?.length || 0) > 0).length;
    return { total: videos.length, linked: linkedCount, unlinked: videos.length - linkedCount };
  }, [videos, videoLinksMap]);

  const hasFilters = filterVariant !== 'all' || filterType !== 'all';

  // Link/unlink
  const linkVideoToVariant = useCallback(async (videoId: string, variantId: string) => {
    if (!productId) return;
    const variant = variantMap.get(variantId);
    if (!variant) return;
    try {
      const { error } = await supabase.from('video_variant_links').insert({
        video_id: videoId, variant_id: variant.id,
        variant_name: variant.color_name || variant.name,
        variant_color_hex: variant.color_hex,
        supplier_code: variant.supplier_code || null,
        product_id: productId,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: [VIDEO_VARIANT_LINKS_QUERY_KEY, productId] });
      toast.success(`Vídeo vinculado a ${variant.color_name || variant.name}`);
    } catch { toast.error('Erro ao vincular vídeo'); }
    setLinkingVideoId(null);
  }, [productId, variantMap, queryClient]);

  const unlinkVideoFromVariant = useCallback(async (linkId: string) => {
    try {
      const { error } = await supabase.from('video_variant_links').delete().eq('id', linkId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: [VIDEO_VARIANT_LINKS_QUERY_KEY, productId] });
      toast.success('Vínculo removido');
    } catch { toast.error('Erro ao desvincular'); }
  }, [productId, queryClient]);

  // Upload
  const uploadFile = useCallback(async (file: File): Promise<{ url: string; size: number; thumbnailUrl: string | null } | null> => {
    const validationError = videoValidationError(file);
    if (validationError) { toast.error(validationError); return null; }
    const fileExt = file.name.split('.').pop() || 'mp4';
    const baseName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const videoPath = `videos/${productId || 'new'}/${baseName}.${fileExt}`;
    const { data, error } = await supabase.storage.from(VIDEO_STORAGE_BUCKET).upload(videoPath, file, { cacheControl: '3600', upsert: false });
    if (error) { toast.error(`Erro no upload de "${file.name}"`); return null; }
    const { data: urlData } = supabase.storage.from(VIDEO_STORAGE_BUCKET).getPublicUrl(data.path);
    const thumbnailUrl = await createVideoThumbnail(file, productId, baseName);
    return { url: urlData.publicUrl, size: file.size, thumbnailUrl };
  }, [productId]);

  const createExternalVideoRecord = useCallback(async ({ url, size, name, thumbnail, youtubeId }: VideoRecordInput): Promise<string | null> => {
    if (!productId) return null;
    const nextOrder = videos.length > 0 ? Math.max(...videos.map(v => v.display_order || 0)) + 1 : 0;
    const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
      body: { table: 'product_videos', operation: 'insert', data: {
        product_id: productId, url_original: url, url_stream: url, url_thumbnail: thumbnail,
        source_youtube_id: youtubeId || null,
        video_type: uploadVideoType, display_order: nextOrder,
        is_primary: videos.length === 0, is_active: true, title: name, file_size_bytes: size,
      }},
    });
    if (error || !data?.success) return null;
    return data?.data?.id || null;
  }, [productId, uploadVideoType, videos]);

  const processUploadBatch = useCallback(async (files: File[]) => {
    if (!files.length) return;
    if (!productId) { toast.error('Salve o produto antes de enviar vídeos'); return; }
    setIsUploading(true);
    setUploadCount(files.length);
    setUploadProgress(0);
    try {
      const successCount = await processVideoFiles({
        files, upload: uploadFile, createRecord: createExternalVideoRecord, variantCode: uploadVariant,
        variants: variantMap, productId, onProgress: setUploadProgress,
      });
      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: [EXTERNAL_VIDEOS_QUERY_KEY, productId] });
        queryClient.invalidateQueries({ queryKey: [VIDEO_VARIANT_LINKS_QUERY_KEY, productId] });
        toast.success(`${successCount} vídeo(s) enviado(s)!`);
      }
    } catch { toast.error('Erro ao enviar vídeos'); } finally {
      setIsUploading(false);
      setUploadCount(0);
      setUploadProgress(0);
    }
  }, [productId, uploadFile, createExternalVideoRecord, uploadVariant, variantMap, queryClient]);

  // Add YouTube video
  const addYoutubeVideo = useCallback(async () => {
    const ytId = parseYouTubeId(youtubeUrl);
    if (!ytId) { toast.error('URL ou ID do YouTube inválido'); return; }
    if (!productId) { toast.error('Salve o produto antes de adicionar vídeos'); return; }
    setIsAddingYoutube(true);
    try {
      const thumbUrl = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
      const videoId = await createExternalVideoRecord({
        url: `https://www.youtube.com/watch?v=${ytId}`,
        size: 0,
        name: `YouTube: ${ytId}`,
        thumbnail: thumbUrl,
        youtubeId: ytId,
      });
      if (videoId && uploadVariant !== 'none') {
        const variant = variantMap.get(uploadVariant);
        if (variant) {
          await supabase.from('video_variant_links').insert({
            video_id: videoId, variant_id: variant.id,
            variant_name: variant.color_name || variant.name,
            variant_color_hex: variant.color_hex,
            supplier_code: variant.supplier_code || null,
            product_id: productId,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: [EXTERNAL_VIDEOS_QUERY_KEY, productId] });
      queryClient.invalidateQueries({ queryKey: [VIDEO_VARIANT_LINKS_QUERY_KEY, productId] });
      toast.success('Vídeo do YouTube adicionado!');
      setYoutubeUrl('');
    } catch { toast.error('Erro ao adicionar vídeo do YouTube'); } finally { setIsAddingYoutube(false); }
  }, [youtubeUrl, productId, createExternalVideoRecord, uploadVariant, variantMap, queryClient]);

  // Remove
  const handleRemove = useCallback(async (videoId: string) => {
    try {
      await supabase.from('video_variant_links').delete().eq('video_id', videoId);
      await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
        body: { table: 'product_videos', operation: 'update', id: videoId, data: { is_active: false } },
      });
      queryClient.invalidateQueries({ queryKey: [EXTERNAL_VIDEOS_QUERY_KEY, productId] });
      queryClient.invalidateQueries({ queryKey: [VIDEO_VARIANT_LINKS_QUERY_KEY, productId] });
      toast.success('Vídeo removido');
    } catch { toast.error('Erro ao remover vídeo'); }
  }, [productId, queryClient]);

  // Update video metadata
  const updateVideoMeta = useCallback(async (videoId: string, data: { title?: string | null; description?: string | null; video_type?: string }) => {
    try {
      await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
        body: { table: 'product_videos', operation: 'update', id: videoId, data },
      });
      queryClient.invalidateQueries({ queryKey: [EXTERNAL_VIDEOS_QUERY_KEY, productId] });
      toast.success('Metadados do vídeo atualizados');
      setEditingVideoId(null);
    } catch { toast.error('Erro ao atualizar metadados'); }
  }, [productId, queryClient]);

  // Reorder
  const handleVideoDragStart = useCallback((index: number) => setDragIndex(index), []);
  const handleVideoDragOver = useCallback((e: DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); }, []);
  const handleVideoDrop = useCallback(async (e: DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setDragOverIndex(null); return; }
    const reordered = [...filteredVideos];
    const [moved] = reordered.splice(dragIndex, 1);
    if (!moved) return;
    reordered.splice(dropIndex, 0, moved);
    setDragIndex(null);
    setDragOverIndex(null);
    // Persist order
    try {
      await Promise.all(reordered.map((v, i) =>
        supabase.functions.invoke(EXTERNAL_DB_BRIDGE, { body: { table: 'product_videos', operation: 'update', id: v.id, data: { display_order: i } } })
      ));
      queryClient.invalidateQueries({ queryKey: [EXTERNAL_VIDEOS_QUERY_KEY, productId] });
      toast.success('Ordem dos vídeos salva');
    } catch { toast.error('Erro ao salvar ordem'); }
  }, [dragIndex, filteredVideos, productId, queryClient]);
  const handleVideoDragEnd = useCallback(() => { setDragIndex(null); setDragOverIndex(null); }, []);

  // Regenerate thumbnail
  const regenerateThumbnail = useCallback(async (video: ExternalVideo) => {
    const videoUrl = videoSource(video);
    if (!videoUrl || !productId) { toast.error('URL do vídeo não disponível'); return; }
    setRegeneratingId(video.id);
    try {
      const thumbnailUrl = await regenerateVideoThumbnail(videoUrl, productId);
      if (!thumbnailUrl) { toast.error('Não foi possível extrair frame'); return; }
      await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
        body: { table: 'product_videos', operation: 'update', id: video.id, data: { url_thumbnail: thumbnailUrl } },
      });
      queryClient.invalidateQueries({ queryKey: [EXTERNAL_VIDEOS_QUERY_KEY, productId] });
      toast.success('Thumbnail regenerada!');
    } catch (error: unknown) {
      const message = (error instanceof Error ? error.message : 'desconhecido');
      toast.error(`Erro ao regenerar thumbnail: ${message}`);
    } finally { setRegeneratingId(null); }
  }, [productId, queryClient]);

  const bulkRegenerateThumbnails = useCallback(async () => {
    const withoutThumb = videos.filter(v => !v.url_thumbnail && !v.source_youtube_id && (v.url_original || v.url_stream));
    if (withoutThumb.length === 0) { toast.info('Todos os vídeos já possuem thumbnail'); return; }
    setIsBulkRegenerating(true);
    let successCount = 0;
    for (const video of withoutThumb) {
      try {
        await regenerateThumbnail(video);
        successCount++;
      } catch (error: unknown) {
        logger.warn('Falha inesperada ao regenerar thumbnail:', error);
      }
    }
    setIsBulkRegenerating(false);
    if (successCount > 0) toast.success(`${successCount} thumbnail(s) regenerada(s)`);
  }, [videos, regenerateThumbnail]);

  const getThumbnail = (video: ExternalVideo): string | null => {
    if (video.url_thumbnail) return video.url_thumbnail;
    if (video.source_youtube_id) return `https://img.youtube.com/vi/${video.source_youtube_id}/mqdefault.jpg`;
    return null;
  };

  // Drop zone handlers
  const handleDragOverZone = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeaveZone = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
  const handleDropZone = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => ACCEPTED_VIDEO_TYPES.includes(f.type));
    if (files.length > 0) processUploadBatch(files);
    else toast.error('Nenhum arquivo de vídeo válido encontrado');
  }, [processUploadBatch]);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) processUploadBatch(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processUploadBatch]);

  return {
    // State
    previewVideo, setPreviewVideo, uploadVideoType, setUploadVideoType,
    uploadVariant, setUploadVariant, isUploading, uploadCount, uploadProgress,
    filterVariant, setFilterVariant, filterType, setFilterType,
    linkingVideoId, setLinkingVideoId, isDragOver, regeneratingId,
    isBulkRegenerating, editingVideoId, setEditingVideoId,
    deleteConfirm, setDeleteConfirm,
    dragIndex, dragOverIndex, youtubeUrl, setYoutubeUrl, isAddingYoutube,
    fileInputRef,
    // Data
    videos, isLoading, variants, variantLinks, videoLinksMap, variantMap,
    filteredVideos, stats, hasFilters,
    // Handlers
    linkVideoToVariant, unlinkVideoFromVariant, handleRemove, updateVideoMeta,
    handleVideoDragStart, handleVideoDragOver, handleVideoDrop, handleVideoDragEnd,
    regenerateThumbnail, bulkRegenerateThumbnails, getThumbnail,
    handleDragOverZone, handleDragLeaveZone, handleDropZone, handleFileSelect,
    processUploadBatch, addYoutubeVideo,
  };
}
