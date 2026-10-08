/**
 * Proxy de imagens externas para evitar CORS
 * Reescreve URLs de domínios bloqueados para passar pelo edge function proxy
 */

const PROXIED_DOMAINS = [
  'www.spotgifts.com.br',
  'spotgifts.com.br',
];

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'origin';
}

function appendProxyOptions(url: string, options?: ImageTransformOptions): string {
  if (!options) return url;
  const params = new URLSearchParams();
  if (options.width) params.set('w', String(options.width));
  if (options.height) params.set('h', String(options.height));
  if (options.quality) params.set('q', String(options.quality));
  if (options.format) params.set('fm', options.format);
  const suffix = params.toString();
  return suffix ? `${url}&${suffix}` : url;
}

function storageTransform(options?: ImageTransformOptions): string {
  if (!options) return '';
  const width = options.width || '';
  const height = options.height || '';
  const quality = options.quality || 80;
  return `?width=${width}&height=${height}&quality=${quality}&resize=contain`;
}

/**
 * Retorna a URL proxiada e otimizada via CDN
 */
export function getProxiedImageUrl(url: string | null | undefined, options?: ImageTransformOptions): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    const isProxied = PROXIED_DOMAINS.includes(parsed.hostname);
    if (isProxied) {
      const proxyUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
      return appendProxyOptions(proxyUrl, options);
    }

    // Otimização para imagens do Supabase Storage
    if (url.includes('supabase.co/storage/v1/object/public/')) {
      return `${url}${storageTransform(options)}`;
    }
  } catch {
    // URL inválida
  }
  
  return url;
}

/**
 * Verifica se uma URL precisa de proxy
 */
export function needsProxy(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return PROXIED_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}
