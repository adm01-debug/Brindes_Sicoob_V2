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

/**
 * Retorna a URL proxiada e otimizada via CDN
 */
export function getProxiedImageUrl(url: string | null | undefined, options?: ImageTransformOptions): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    const isProxied = PROXIED_DOMAINS.includes(parsed.hostname);
    
    // Se precisar de proxy ou se quisermos otimização CDN (ex: Cloudflare/Supabase Image Transformation)
    if (isProxied) {
      let proxyUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
      
      // Adicionar parâmetros de transformação se disponíveis no proxy
      if (options) {
        if (options.width) proxyUrl += `&w=${options.width}`;
        if (options.height) proxyUrl += `&h=${options.height}`;
        if (options.quality) proxyUrl += `&q=${options.quality}`;
        if (options.format) proxyUrl += `&fm=${options.format}`;
      }
      
      return proxyUrl;
    }

    // Otimização para imagens do Supabase Storage
    if (url.includes('supabase.co/storage/v1/object/public/')) {
      const transform = options ? `?width=${options.width || ''}&height=${options.height || ''}&quality=${options.quality || 80}&resize=contain` : '';
      return `${url}${transform}`;
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
