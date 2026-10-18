import { supabase, supabaseUrl } from '@/integrations/supabase/client';

export type PrivateStorageBucket =
  | 'personalization-images'
  | 'mockup-art-files'
  | 'supplier-logos'
  | 'product-videos';

// Mantém o mesmo contrato temporal já usado pelos anexos de arte. A assinatura
// evita exposição pública; registros duráveis ainda devem manter o caminho para
// permitir renovação sem ampliar indefinidamente o prazo do bearer token.
export const PRIVATE_STORAGE_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

const PRIVATE_STORAGE_SCHEME = 'supabase-storage:';
const PRIVATE_STORAGE_BUCKETS: readonly PrivateStorageBucket[] = [
  'personalization-images',
  'mockup-art-files',
  'supplier-logos',
  'product-videos',
];

interface PrivateStorageLocation {
  bucket: PrivateStorageBucket;
  path: string;
}

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function createPrivateStorageReference(
  bucket: PrivateStorageBucket,
  path: string,
): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${PRIVATE_STORAGE_SCHEME}//${bucket}/${encodedPath}`;
}

export function parsePrivateStorageReference(value: string): PrivateStorageLocation | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== PRIVATE_STORAGE_SCHEME) return null;
    if (!PRIVATE_STORAGE_BUCKETS.includes(parsed.hostname as PrivateStorageBucket)) return null;
    const path = parsed.pathname.slice(1).split('/').map(decodeURIComponent).join('/');
    return path ? { bucket: parsed.hostname as PrivateStorageBucket, path } : null;
  } catch {
    return null;
  }
}

function locationFromStorageUrl(value: string): PrivateStorageLocation | null {
  try {
    const parsed = new URL(value);
    if (parsed.origin !== new URL(supabaseUrl).origin) return null;
    const pathname = parsed.pathname;
    if (!/^\/storage\/v1\/object\/(?:sign|public|authenticated)\//.test(pathname)) return null;
    for (const bucket of PRIVATE_STORAGE_BUCKETS) {
      const marker = new RegExp(`^/storage/v1/object/(?:sign|public|authenticated)/${bucket}/`);
      const match = pathname.match(marker);
      if (!match) continue;
      const encodedPath = pathname.slice(match[0].length);
      if (encodedPath) return { bucket, path: decodeURIComponent(encodedPath) };
    }
  } catch {
    // Valores externos e caminhos inválidos permanecem sob responsabilidade do chamador.
  }
  return null;
}

export function isPrivateStorageUrl(value: string, expectedBucket: PrivateStorageBucket): boolean {
  const reference = parsePrivateStorageReference(value);
  if (reference) return reference.bucket === expectedBucket;
  const location = locationFromStorageUrl(value);
  return location?.bucket === expectedBucket;
}

export async function createPrivateStorageUrl(
  bucket: PrivateStorageBucket,
  path: string,
  expiresIn = PRIVATE_STORAGE_URL_TTL_SECONDS,
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error(`Storage não retornou URL assinada para ${bucket}/${path}.`);
  return data.signedUrl;
}

export async function resolvePrivateStorageUrl(
  value: string | null | undefined,
  expectedBucket?: PrivateStorageBucket,
): Promise<string | null> {
  if (!value) return null;
  const location = parsePrivateStorageReference(value) ?? locationFromStorageUrl(value);
  if (!location) return value;
  if (expectedBucket && location.bucket !== expectedBucket) return value;

  const cacheKey = `${location.bucket}/${location.path}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const url = await createPrivateStorageUrl(location.bucket, location.path);
  signedUrlCache.set(cacheKey, {
    url,
    expiresAt: Date.now() + (PRIVATE_STORAGE_URL_TTL_SECONDS - 60) * 1_000,
  });
  return url;
}

export function canonicalPrivateStorageValue(
  value: string | null | undefined,
  expectedBucket: PrivateStorageBucket,
): string | null {
  if (!value) return null;
  const location = parsePrivateStorageReference(value) ?? locationFromStorageUrl(value);
  if (!location || location.bucket !== expectedBucket) return value;
  return createPrivateStorageReference(location.bucket, location.path);
}

export function privateStoragePathFromUrl(
  bucket: PrivateStorageBucket,
  value: string,
): string | null {
  const location = parsePrivateStorageReference(value) ?? locationFromStorageUrl(value);
  return location?.bucket === bucket ? location.path : null;
}
