import * as React from "react";
import { cn } from "@/lib/utils";
import { getCdnUrl, getSrcSet, getImageSizes, type CdnVariant } from "@/utils/image-utils";
import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  urlCdn: string;
  variant?: CdnVariant;
  context?: 'card' | 'gallery' | 'hero' | 'thumb';
  priority?: boolean;
  aspectRatio?: string;
  fallbackUrl?: string;
  showSkeleton?: boolean;
  generateSrcSet?: boolean;
}

function OptimizedImageSkeleton({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <Skeleton className="absolute inset-0 z-0" />;
}

function loadingMode(priority: boolean) {
  return priority ? "eager" : "lazy";
}

function decodingMode(priority: boolean) {
  return priority ? "sync" : "async";
}

function fetchPriority(priority: boolean) {
  return priority ? "high" : "low";
}

function imageSizes(context: OptimizedImageProps['context'], error: boolean) {
  return error ? undefined : getImageSizes(context ?? 'card');
}

function skeletonVisible(showSkeleton: boolean, loaded: boolean, error: boolean) {
  return showSkeleton && !loaded && !error;
}

function imageVisualClass(loaded: boolean, error: boolean) {
  const loadClass = loaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]";
  return cn(loadClass, error && "object-center p-4 opacity-50");
}

function imageSource(url: string, variant: CdnVariant, error: boolean, fallbackUrl: string): string {
  return error ? fallbackUrl : getCdnUrl(url, variant);
}

function imageSourceSet(url: string, error: boolean, enabled: boolean): string | undefined {
  if (error || !enabled) return undefined;
  return getSrcSet(url) || undefined;
}

function useImageLoadState(urlCdn: string, variant: CdnVariant) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const currentSource = React.useRef(`${urlCdn}:${variant}`);
  currentSource.current = `${urlCdn}:${variant}`;
  React.useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [urlCdn, variant]);
  return { loaded, error, setLoaded, setError, currentSource };
}

function imageLoadHandler(
  source: string,
  currentSource: React.MutableRefObject<string>,
  setLoaded: (loaded: boolean) => void,
  callback: React.ReactEventHandler<HTMLImageElement> | undefined,
): React.ReactEventHandler<HTMLImageElement> {
  return (event) => {
    if (currentSource.current !== source) return;
    setLoaded(true);
    callback?.(event);
  };
}

function imageErrorHandler(
  source: string,
  currentSource: React.MutableRefObject<string>,
  setError: (error: boolean) => void,
  callback: React.ReactEventHandler<HTMLImageElement> | undefined,
): React.ReactEventHandler<HTMLImageElement> {
  return (event) => {
    if (currentSource.current !== source) return;
    setError(true);
    callback?.(event);
  };
}

/**
 * OptimizedImage — Componente de alta performance para imagens do catálogo.
 * 
 * Implementa:
 * - srcset e sizes automáticos via image-utils
 * - Fetchpriority="high" para LCP (quando priority={true})
 * - Skeleton integrado e transição suave de opacidade
 * - Formatos modernos via CDN (WebP/AVIF implícito pela CDN)
 * - Lazy loading nativo para imagens non-priority
 */
export const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({ 
    urlCdn, 
    variant = 'public', 
    context = 'card', 
    priority = false, 
    aspectRatio = "4/5",
    fallbackUrl = "/placeholder.svg",
    className,
    onLoad,
    onError,
    showSkeleton = true,
    generateSrcSet = true,
    ...props 
  }, ref) => {
    const { loaded, error, setLoaded, setError, currentSource } = useImageLoadState(urlCdn, variant);

    const src = React.useMemo(
      () => imageSource(urlCdn, variant, error, fallbackUrl),
      [urlCdn, variant, error, fallbackUrl],
    );

    const srcSet = React.useMemo(
      () => imageSourceSet(urlCdn, error, generateSrcSet),
      [urlCdn, error, generateSrcSet],
    );

    const sizes = imageSizes(context, error);
    const sourceKey = `${urlCdn}:${variant}`;
    const handleLoad = imageLoadHandler(sourceKey, currentSource, setLoaded, onLoad);
    const handleError = imageErrorHandler(sourceKey, currentSource, setError, onError);

    return (
      <div 
        className={cn("relative overflow-hidden bg-muted/20", className)}
        style={{ aspectRatio }}
      >
        <OptimizedImageSkeleton visible={skeletonVisible(showSkeleton, loaded, error)} />

        <img
          key={sourceKey}
          ref={ref}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          loading={loadingMode(priority)}
          decoding={decodingMode(priority)}
          {...{ fetchpriority: fetchPriority(priority) }}
          className={cn(
            "h-full w-full object-contain transition-all duration-500",
            imageVisualClass(loaded, error)
          )}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      </div>
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";
