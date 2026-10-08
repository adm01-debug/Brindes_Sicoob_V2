/**
 * ImageWithFallback — Componente de imagem reutilizável com:
 * - Variantes CDN (card, thumbnail, large, etc.)
 * - srcSet para responsive images
 * - Fallback para url_original em caso de erro de rede
 * - Lazy loading nativo
 * - Propagação de alt_text e title_text
 */

import { type ImgHTMLAttributes, type SyntheticEvent, useState, forwardRef } from 'react';
import { getCdnUrl, getSrcSet, getImageSizes, type CdnVariant } from '@/utils/image-utils';
import { cn } from '@/lib/utils';

interface ImageWithFallbackProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** URL CDN da imagem (terminada em /public) */
  urlCdn: string;
  /** URL original do fornecedor (fallback para erro de rede) */
  urlOriginal?: string | null;
  /** Variante CDN a usar */
  variant?: CdnVariant;
  /** Contexto para sizes responsivo */
  context?: 'card' | 'gallery' | 'hero' | 'thumb';
  /** Habilitar srcSet responsivo */
  responsive?: boolean;
  /** Mostrar shimmer enquanto carrega */
  showShimmer?: boolean;
}

function resolveImageSource(
  error: boolean,
  urlCdn: string,
  urlOriginal: string | null | undefined,
  variant: CdnVariant,
) {
  if (error) return urlOriginal || '/placeholder.svg';
  return getCdnUrl(urlCdn, variant);
}

function responsiveImageProps(
  enabled: boolean,
  error: boolean,
  urlCdn: string,
  context: ImageWithFallbackProps['context'],
) {
  return {
    srcSet: enabled && !error ? getSrcSet(urlCdn) : undefined,
    sizes: enabled && context ? getImageSizes(context) : undefined,
  };
}

function LoadingBackground({ loaded }: { loaded: boolean }) {
  if (loaded) return null;
  return <div className="absolute inset-0 bg-muted/30" />;
}

function imageStateClass(loaded: boolean) {
  return loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-40 blur-md scale-105';
}

export const ImageWithFallback = forwardRef<HTMLImageElement, ImageWithFallbackProps>(
  function ImageWithFallback(
    {
      urlCdn,
      urlOriginal,
      variant = 'public',
      context,
      responsive = false,
      showShimmer = true,
      className,
      alt,
      title,
      onLoad,
      onError,
      ...props
    },
    ref,
  ) {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const src = resolveImageSource(error, urlCdn, urlOriginal, variant);
    const responsiveProps = responsiveImageProps(responsive, error, urlCdn, context);

    const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
      if (!error) {
        setError(true);
      }
      onError?.(e);
    };

    const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
      setLoaded(true);
      onLoad?.(e);
    };

    return (
      <div className={cn('relative overflow-hidden', className)}>
        {/* Background while loading */}
        {showShimmer && <LoadingBackground loaded={loaded} />}
        <img
          ref={ref}
          src={src}
          {...responsiveProps}
          alt={alt || ''}
          title={title || undefined}
          loading="lazy"
          onError={handleError}
          onLoad={handleLoad}
          className={cn(
            'h-full w-full object-cover transition-all duration-700 ease-out',
            imageStateClass(loaded),
          )}
          draggable={false}
          {...props}
        />
      </div>
    );
  },
);
