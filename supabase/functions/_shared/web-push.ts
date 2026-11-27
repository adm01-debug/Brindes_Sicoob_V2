/**
 * Envio de Web Push (RFC 8030/8291/8292) sem dependencia externa.
 *
 * Usa apenas WebCrypto (HMAC-SHA256 para o VAPID, ECDH P-256 + HKDF +
 * AES-128-GCM para a carga). Roda tanto no Deno quanto no Node >= 18, o que
 * permite testar o payload sem subir a edge function.
 *
 * A chave privada VAPID vem de `VAPID_PRIVATE_KEY` (base64url do segredo EC
 * P-256) e a publica de `VAPID_PUBLIC_KEY`. Sem as duas, `enviarPush` devolve
 * `{ok:false, motivo:'sem-chave'}` e nada e enviado.
 */

export type InscricaoPush = {
  id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type CargaPush = {
  title: string;
  body: string;
  url?: string | null;
  tag?: string | null;
};

export type ResultadoEnvio =
  | { ok: true; status: number }
  | { ok: false; status: number; expirada: boolean; motivo: string };

const encoder = new TextEncoder();

export function base64UrlParaBytes(valor: string): Uint8Array<ArrayBuffer> {
  const normalizado = valor.replace(/-/g, '+').replace(/_/g, '/');
  const comPadding = normalizado + '='.repeat((4 - (normalizado.length % 4)) % 4);
  const binario = atob(comPadding);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

export function bytesParaBase64Url(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** WebCrypto exige `ArrayBuffer` (não `ArrayBufferLike`); copia para garantir o tipo. */
function copiarBuffer(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const saida = new Uint8Array(new ArrayBuffer(bytes.length));
  saida.set(bytes);
  return saida;
}

function concatenar(...partes: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = partes.reduce((soma, p) => soma + p.length, 0);
  const saida = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const parte of partes) {
    saida.set(parte, offset);
    offset += parte.length;
  }
  return saida;
}

/** Cabeçalho `Authorization: vapid ...` do RFC 8292. */
export async function montarCabecalhoVapid(params: {
  endpoint: string;
  publicKey: string;
  privateKey: string;
  subject: string;
  expiracaoSegundos?: number;
  agoraSegundos?: number;
}): Promise<string> {
  const { endpoint, publicKey, privateKey, subject } = params;
  const agora = params.agoraSegundos ?? Math.floor(Date.now() / 1000);
  const exp = agora + (params.expiracaoSegundos ?? 12 * 60 * 60);

  const header = bytesParaBase64Url(
    encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })),
  );
  const payload = bytesParaBase64Url(
    encoder.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp, sub: subject })),
  );
  const assinaturaBase = `${header}.${payload}`;

  const chavePublicaBytes = base64UrlParaBytes(publicKey);
  if (chavePublicaBytes.length !== 65 || chavePublicaBytes[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY invalida: esperado ponto EC P-256 nao comprimido (65 bytes)');
  }
  const privadaBytes = base64UrlParaBytes(privateKey);
  if (privadaBytes.length !== 32) {
    throw new Error('VAPID_PRIVATE_KEY invalida: esperado segredo EC P-256 (32 bytes)');
  }

  const chave = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: bytesParaBase64Url(privadaBytes),
      x: bytesParaBase64Url(chavePublicaBytes.slice(1, 33)),
      y: bytesParaBase64Url(chavePublicaBytes.slice(33, 65)),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const assinatura = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      chave,
      encoder.encode(assinaturaBase),
    ),
  );

  const jwt = `${assinaturaBase}.${bytesParaBase64Url(assinatura)}`;
  return `vapid t=${jwt}, k=${publicKey}`;
}

/** Corpo cifrado `aes128gcm` do RFC 8291. */
export async function cifrarCarga(
  carga: CargaPush,
  inscricao: InscricaoPush,
  saltFixo?: Uint8Array,
): Promise<Uint8Array<ArrayBuffer>> {
  const textoPlano = encoder.encode(JSON.stringify(carga));

  const chaveServidor = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const publicaServidor = new Uint8Array(await crypto.subtle.exportKey('raw', chaveServidor.publicKey));

  const publicaCliente = base64UrlParaBytes(inscricao.p256dh);
  const authSecret = base64UrlParaBytes(inscricao.auth);

  const chaveCliente = await crypto.subtle.importKey(
    'raw',
    publicaCliente,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  const segredoEcdh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: chaveCliente }, chaveServidor.privateKey, 256),
  );

  const salt = copiarBuffer(saltFixo ?? crypto.getRandomValues(new Uint8Array(16)));

  // PRK = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public)
  const info = concatenar(
    encoder.encode('WebPush: info\0'),
    publicaCliente,
    publicaServidor,
  );
  const prk = await crypto.subtle.importKey('raw', authSecret, 'HKDF', false, ['deriveBits']);
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: segredoEcdh, info }, prk, 256),
  );

  const chavePrk = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const aesInfo = concatenar(encoder.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1]));
  const chaveAes = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: aesInfo },
    chavePrk,
    128,
  );
  const nonceInfo = concatenar(encoder.encode('Content-Encoding: nonce\0'), new Uint8Array([1]));
  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    chavePrk,
    96,
  );

  const chaveCifra = await crypto.subtle.importKey('raw', chaveAes, { name: 'AES-GCM' }, false, ['encrypt']);
  // RFC 8188: o delimitador (0x02 = ultimo registro) vai NO FIM do registro,
  // seguido do padding opcional. A carga nao pode terminar com 0x02 fora do
  // pad, por isso o delimitador e sempre o ultimo byte de um registro sem pad.
  const registro = concatenar(textoPlano, new Uint8Array([0x02]));
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(nonce) },
      chaveCifra,
      registro,
    ),
  );

  const tamanhoRegistro = new Uint8Array(4);
  new DataView(tamanhoRegistro.buffer).setUint32(0, 4096);

  return concatenar(salt, tamanhoRegistro, new Uint8Array([publicaServidor.length]), publicaServidor, cifrado);
}

export function cargaPadrao(carga: CargaPush): string {
  return JSON.stringify({
    title: carga.title,
    body: carga.body,
    url: carga.url ?? '/',
    tag: carga.tag ?? 'sicoob',
  });
}

/** Envia o push; nunca lanca — devolve o resultado para o chamador decidir. */
export async function enviarPush(
  inscricao: InscricaoPush,
  carga: CargaPush,
  config: { publicKey: string; privateKey: string; subject: string; ttlSegundos?: number },
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoEnvio> {
  let cabecalho: string;
  let corpo: Uint8Array<ArrayBuffer>;
  try {
    cabecalho = await montarCabecalhoVapid({
      endpoint: inscricao.endpoint,
      publicKey: config.publicKey,
      privateKey: config.privateKey,
      subject: config.subject,
    });
    corpo = await cifrarCarga(carga, inscricao);
  } catch (erro) {
    return {
      ok: false,
      status: 0,
      expirada: false,
      motivo: erro instanceof Error ? erro.message : 'falha ao montar payload',
    };
  }

  try {
    const resposta = await fetchImpl(inscricao.endpoint, {
      method: 'POST',
      headers: {
        Authorization: cabecalho,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(config.ttlSegundos ?? 3600),
        Urgency: 'normal',
      },
      body: corpo,
    });

    if (resposta.ok) return { ok: true, status: resposta.status };

    // 404/410 = inscricao morta no provedor (navegador desinstalado, permissao revogada).
    const expirada = resposta.status === 404 || resposta.status === 410;
    const texto = await resposta.text().catch(() => '');
    return {
      ok: false,
      status: resposta.status,
      expirada,
      motivo: texto.slice(0, 300) || `HTTP ${resposta.status}`,
    };
  } catch (erro) {
    return {
      ok: false,
      status: 0,
      expirada: false,
      motivo: erro instanceof Error ? erro.message : 'falha de rede',
    };
  }
}
