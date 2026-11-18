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
// Assinaturas em voo: duas montagens simultâneas da mesma imagem compartilham a
// mesma chamada ao Storage em vez de abrir duas.
const inFlightSignatures = new Map<string, Promise<string>>();

// Geracao do cache: cada limpeza invalida tambem as assinaturas que ainda
// estavam em voo, impedindo que a resposta emitida para a conta anterior
// repovoe o cache depois da troca de sessao.
let cacheGeneration = 0;

export function clearPrivateStorageUrlCache(): void {
  cacheGeneration += 1;
  signedUrlCache.clear();
  inFlightSignatures.clear();
}

// A assinatura é emitida para a sessão corrente. Trocar de conta na mesma aba
// precisa invalidar o cache, senão a nova conta reaproveitaria a autorização da
// anterior para objetos que ela não poderia assinar.
let lastAuthIdentity: string | null | undefined;
supabase.auth?.onAuthStateChange?.((_event, session) => {
  const identity = session?.user?.id ?? null;
  if (lastAuthIdentity !== undefined && lastAuthIdentity !== identity) {
    clearPrivateStorageUrlCache();
  }
  lastAuthIdentity = identity;
});

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

const MAX_SIGNATURE_RETRIES_ON_IDENTITY_CHANGE = 2;

export async function resolvePrivateStorageUrl(
  value: string | null | undefined,
  expectedBucket?: PrivateStorageBucket,
): Promise<string | null> {
  if (!value) return null;
  const location = parsePrivateStorageReference(value) ?? locationFromStorageUrl(value);
  if (!location) return value;
  if (expectedBucket && location.bucket !== expectedBucket) return value;
  return signLocation(location, 0);
}

async function signLocation(location: PrivateStorageLocation, attempt: number): Promise<string> {
  const cacheKey = `${location.bucket}/${location.path}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const pending = inFlightSignatures.get(cacheKey);
  if (pending) return pending;

  const generation = cacheGeneration;
  const request = createPrivateStorageUrl(location.bucket, location.path)
    .then((url) => {
      // A sessao mudou enquanto a assinatura estava em voo: a URL pertence a
      // conta anterior e nao pode ser cacheada nem devolvida.
      if (generation !== cacheGeneration) {
        if (attempt >= MAX_SIGNATURE_RETRIES_ON_IDENTITY_CHANGE) {
          throw new Error(
            `Sessao alterada durante a assinatura de ${cacheKey}; nao foi possivel emitir uma URL valida.`,
          );
        }
        return signLocation(location, attempt + 1);
      }
      signedUrlCache.set(cacheKey, {
        url,
        expiresAt: Date.now() + (PRIVATE_STORAGE_URL_TTL_SECONDS - 60) * 1_000,
      });
      return url;
    })
    .finally(() => {
      if (inFlightSignatures.get(cacheKey) === request) inFlightSignatures.delete(cacheKey);
    });
  inFlightSignatures.set(cacheKey, request);
  return request;
}

// Variante tolerante: um objeto removido ou sem permissão de leitura devolve
// `null` em vez de derrubar o lote inteiro de imagens que está sendo resolvido.
export async function resolvePrivateStorageUrlSafe(
  value: string | null | undefined,
  expectedBucket?: PrivateStorageBucket,
): Promise<string | null> {
  try {
    return await resolvePrivateStorageUrl(value, expectedBucket);
  } catch {
    return null;
  }
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
