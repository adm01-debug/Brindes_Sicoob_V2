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
    ...props 
  }, ref) => {
    const [loaded, setLoaded] = React.useState(false);
    const [error, setError] = React.useState(false);

    const src = React.useMemo(() => {
      if (error) return fallbackUrl;
      return getCdnUrl(urlCdn, variant);
    }, [urlCdn, variant, error, fallbackUrl]);

    const srcSet = React.useMemo(() => {
      if (error) return undefined;
      return getSrcSet(urlCdn);
    }, [urlCdn, error]);

    const sizes = React.useMemo(() => {
      if (error) return undefined;
      return getImageSizes(context);
    }, [context, error]);

    return (
      <div 
        className={cn("relative overflow-hidden bg-muted/20", className)}
        style={{ aspectRatio }}
      >
        {showSkeleton && !loaded && !error && (
          <Skeleton className="absolute inset-0 z-0" />
        )}

        <img
          ref={ref}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          {...{ fetchpriority: priority ? "high" : "low" }}
          className={cn(
            "h-full w-full object-contain transition-all duration-500",
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]",
            error && "object-center p-4 opacity-50"
          )}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setError(true);
            onError?.(e);
          }}
          {...props}
        />
      </div>
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";
