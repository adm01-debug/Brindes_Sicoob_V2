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
  const textoPlano = encoder.encode(cargaQueCabe(carga));

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

  // O salt tem 16 bytes por RFC 8188 §2.1 e o teste usa um fixo para tornar a
  // decifra reproduzivel. Tamanho diferente desloca o cabecalho do registro.
  const salt = copiarBuffer(saltFixo ?? crypto.getRandomValues(new Uint8Array(16)));
  if (salt.length !== 16) throw new Error('salt do Web Push precisa ter 16 bytes');

  // RFC 8291 §3.4: PRK_key = HKDF-Extract(auth_secret, ecdh_secret).
  // O ecdh_secret e o IKM e o auth_secret da inscricao e o salt — antes estavam
  // trocados, entao o navegador derivava outra chave e descartava a mensagem.
  const info = concatenar(
    encoder.encode('WebPush: info\0'),
    publicaCliente,
    publicaServidor,
  );
  const chaveEcdh = await crypto.subtle.importKey('raw', segredoEcdh, 'HKDF', false, ['deriveBits']);
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: authSecret, info }, chaveEcdh, 256),
  );

  // RFC 8188 §2.3: o `\0` de separacao vai no info; o salt fica sem ele. O
  // WebCrypto ja acrescenta o `\0` final do RFC 5869 quando info nao e nulo,
  // entao acrescentar aqui gerava `\0\0` e outra chave/nonce.
  const chavePrk = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const aesInfo = encoder.encode('Content-Encoding: aes128gcm');
  const chaveAes = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: aesInfo },
    chavePrk,
    128,
  );
  const nonceInfo = encoder.encode('Content-Encoding: nonce');
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

/**
 * O corpo vai em um unico registro de 4096 bytes (RFC 8188 §4), dos quais 103
 * sao cabecalho e 16 a tag do GCM. O schema de `send-notification` aceita 5000
 * caracteres de mensagem, entao um alerta longo nao caberia e o AES-GCM
 * lancaria erro — o push inteiro se perderia. Aqui a mensagem e truncada ate
 * o JSON final caber, preservando titulo, url e tag.
 */
const LIMITE_CARGA_BYTES = 4096 - 103 - 16 - 4;

export function cargaQueCabe(carga: CargaPush): string {
  const completa = cargaPadrao(carga);
  if (encoder.encode(completa).length <= LIMITE_CARGA_BYTES) return completa;

  // Trunca por code point para nao partir um par substituto.
  const caracteres = Array.from(carga.body);
  let baixo = 0;
  let alto = caracteres.length;
  let melhor = cargaPadrao({ ...carga, body: '' });
  while (baixo <= alto) {
    const meio = Math.floor((baixo + alto) / 2);
    const tentativa = cargaPadrao({ ...carga, body: `${caracteres.slice(0, meio).join('')}...` });
    if (encoder.encode(tentativa).length <= LIMITE_CARGA_BYTES) {
      melhor = tentativa;
      baixo = meio + 1;
    } else {
      alto = meio - 1;
    }
  }
  return melhor;
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
