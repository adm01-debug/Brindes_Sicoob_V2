import { describe, expect, it, vi } from 'vitest';
import {
  base64UrlParaBytes,
  bytesParaBase64Url,
  cifrarCarga,
  enviarPush,
  montarCabecalhoVapid,
} from '../../supabase/functions/_shared/web-push.ts';

const b64 = (b: Uint8Array) => bytesParaBase64Url(b);

/** Receptor simulado: faz exatamente o que o navegador faz ao receber o push. */
async function decifrarComoNavegador(corpo: Uint8Array, chavePrivadaUa: CryptoKey, publicaUa: Uint8Array, auth: Uint8Array) {
  const salt = corpo.slice(0, 16);
  const idLen = corpo[20];
  const publicaServidor = corpo.slice(21, 21 + idLen);
  const cifrado = corpo.slice(21 + idLen);

  const ecdh = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: await crypto.subtle.importKey('raw', publicaServidor, { name: 'ECDH', namedCurve: 'P-256' }, false, []) },
    chavePrivadaUa,
    256,
  );
  const enc = new TextEncoder();
  const info = new Uint8Array([...enc.encode('WebPush: info\0'), ...publicaUa, ...publicaServidor]);
  const prkK = await crypto.subtle.importKey('raw', auth, 'HKDF', false, ['deriveBits']);
  const ikm = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(ecdh), info }, prkK, 256);

  const prk2 = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const chaveAes = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array([...enc.encode('Content-Encoding: aes128gcm\0'), 1]) },
    prk2, 128,
  );
  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array([...enc.encode('Content-Encoding: nonce\0'), 1]) },
    prk2, 96,
  );
  const chaveDec = await crypto.subtle.importKey('raw', chaveAes, { name: 'AES-GCM' }, false, ['decrypt']);
  const texto = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, chaveDec, cifrado));
  return { texto, delimitador: texto.charCodeAt(texto.length - 1) };
}

async function parUa() {
  const par = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    inscricao: { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: b64(publica), auth: b64(auth) },
    chavePrivada: par.privateKey,
    publica,
    auth,
  };
}

async function chavesVapid() {
  const par = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey);
  return { publicKey: b64(publica), privateKey: jwk.d as string, publicaBytes: publica };
}

describe('web-push', () => {
  it('monta o cabecalho VAPID com assinatura verificavel', async () => {
    const { publicKey, privateKey, publicaBytes } = await chavesVapid();

    const cabecalho = await montarCabecalhoVapid({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      publicKey,
      privateKey,
      subject: 'mailto:dev@example.com',
      agoraSegundos: 1_700_000_000,
    });

    const partes = cabecalho.match(/^vapid t=([^,]+), k=(.+)$/);
    expect(partes).not.toBeNull();
    const [header, payload, assinatura] = partes![1].split('.');
    expect(partes![2]).toBe(publicKey);

    const corpo = JSON.parse(new TextDecoder().decode(base64UrlParaBytes(payload)));
    expect(corpo.aud).toBe('https://fcm.googleapis.com');
    expect(corpo.sub).toBe('mailto:dev@example.com');
    expect(corpo.exp).toBe(1_700_000_000 + 12 * 60 * 60);

    const chave = await crypto.subtle.importKey('raw', publicaBytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const valido = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      chave,
      base64UrlParaBytes(assinatura),
      new TextEncoder().encode(`${header}.${payload}`),
    );
    expect(valido).toBe(true);
  });

  it('cifra a carga de forma que o navegador consiga decifrar', async () => {
    const { inscricao, chavePrivada, publica, auth } = await parUa();

    const corpo = await cifrarCarga({ title: 'Alerta', body: 'Corpo', url: '/x', tag: 't' }, inscricao);
    const { texto, delimitador } = await decifrarComoNavegador(corpo, chavePrivada, publica, auth);

    // 0x02 marca o ultimo registro (RFC 8188).
    expect(delimitador).toBe(2);
    expect(JSON.parse(texto.slice(0, -1))).toEqual({ title: 'Alerta', body: 'Corpo', url: '/x', tag: 't' });
  });

  it('rejeita chave VAPID publica com formato invalido', async () => {
    await expect(
      montarCabecalhoVapid({
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        publicKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        privateKey: b64(new Uint8Array(32)),
        subject: 'mailto:dev@example.com',
      }),
    ).rejects.toThrow(/VAPID_PUBLIC_KEY/);
  });

  it('marca como expirada a inscricao removida no provedor (410)', async () => {
    const { inscricao } = await parUa();
    const { publicKey, privateKey } = await chavesVapid();
    const fetchFalso = vi.fn(async () => new Response('gone', { status: 410 }));

    const resultado = await enviarPush(inscricao, { title: 'a', body: 'b' }, { publicKey, privateKey, subject: 'mailto:d@e.com' }, fetchFalso as unknown as typeof fetch);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.expirada).toBe(true);
      expect(resultado.status).toBe(410);
    }
  });

  it('nao lanca quando o provedor esta inacessivel', async () => {
    const { inscricao } = await parUa();
    const { publicKey, privateKey } = await chavesVapid();
    const fetchFalso = vi.fn(async () => { throw new Error('ECONNREFUSED'); });

    const resultado = await enviarPush(inscricao, { title: 'a', body: 'b' }, { publicKey, privateKey, subject: 'mailto:d@e.com' }, fetchFalso as unknown as typeof fetch);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toContain('ECONNREFUSED');
  });

  it('envia os cabecalhos exigidos pelo provedor quando da certo', async () => {
    const { inscricao } = await parUa();
    const { publicKey, privateKey } = await chavesVapid();
    const fetchFalso = vi.fn(async () => new Response('', { status: 201 }));

    const resultado = await enviarPush(inscricao, { title: 'a', body: 'b' }, { publicKey, privateKey, subject: 'mailto:d@e.com' }, fetchFalso as unknown as typeof fetch);

    expect(resultado).toEqual({ ok: true, status: 201 });
    const opcoes = fetchFalso.mock.calls[0][1] as RequestInit;
    const headers = opcoes.headers as Record<string, string>;
    expect(headers['Content-Encoding']).toBe('aes128gcm');
    expect(headers.Authorization).toMatch(/^vapid t=/);
    expect(headers.TTL).toBe('3600');
  });
});
