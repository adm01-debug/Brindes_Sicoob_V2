/**
 * GalleryVideoPlayer — Dialog para reprodução de vídeos do produto
 */

import { useState } from "react";
import { Play, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getCloudflareEmbedUrl, getCloudflareThumbnailUrl } from "@/utils/cloudflare-stream";

interface ProductVideo {
  id: string;
  url_stream: string | null;
  url_hls: string | null;
  url_thumbnail: string | null;
  url_original: string | null;
  source_youtube_id: string | null;
  video_type: string | null;
  display_order: number;
  is_primary: boolean;
  title: string | null;
}

interface GalleryVideoPlayerProps {
  productVideos: ProductVideo[];
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function VideoFrame({ video, productName }: { video: ProductVideo | undefined; productName: string }) {
  const poster = getCloudflareThumbnailUrl(video?.url_stream, { time: "1s", height: 720 }) ?? video?.url_thumbnail ?? null;
  const embed = getCloudflareEmbedUrl(video?.url_stream, { autoplay: true, poster });
  if (!embed) return null;
  return <iframe src={embed} title={video?.title || `Vídeo do produto ${productName}`} className="w-full h-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
}

function VideoThumbnails({ videos, activeIndex, onSelect }: { videos: ProductVideo[]; activeIndex: number; onSelect: (index: number) => void }) {
  if (videos.length <= 1) return null;
  return (
    <div className="flex gap-2 p-3 bg-black/95 overflow-x-auto">
      {videos.map((video, index) => {
        const thumbnail = getCloudflareThumbnailUrl(video.url_stream, { time: "1s", height: 270 }) ?? video.url_thumbnail;
        return <button key={video.id} onClick={() => onSelect(index)} className={cn("relative shrink-0 w-24 aspect-video rounded-lg overflow-hidden transition-all duration-200", activeIndex === index ? "ring-2 ring-primary scale-105" : "opacity-60 hover:opacity-100")}>{thumbnail ? <img src={thumbnail} alt={video.title || `Vídeo ${index + 1}`} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><Play className="h-4 w-4 text-foreground" /></div>}<div className="absolute inset-0 flex items-center justify-center"><Play className="h-5 w-5 text-primary-foreground drop-shadow-lg fill-white/50" /></div></button>;
      })}
    </div>
  );
}

export function GalleryVideoPlayer({ productVideos, productName, open, onOpenChange }: GalleryVideoPlayerProps) {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black border-none overflow-hidden [&>button.absolute]:hidden">
        <div className="relative w-full">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              {productVideos.length > 1 && (
                <span className="text-primary-foreground/80 text-sm font-medium">
                  Vídeo {activeVideoIndex + 1} de {productVideos.length}
                </span>
              )}
              {productVideos[activeVideoIndex]?.title && (
                <span className="text-primary-foreground/60 text-sm">
                  — {productVideos[activeVideoIndex].title}
                </span>
              )}
            </div>
            <button
              aria-label="Fechar"
              className="h-9 w-9 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Video player */}
          <div className="aspect-video w-full bg-black"><VideoFrame video={productVideos[activeVideoIndex]} productName={productName} /></div>
          <VideoThumbnails videos={productVideos} activeIndex={activeVideoIndex} onSelect={setActiveVideoIndex} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
