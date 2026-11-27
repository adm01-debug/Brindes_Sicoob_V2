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
  // RFC 8291 §3.4: IKM e o segredo ECDH derivado do par do servidor; o
  // auth_secret da inscricao e o salt do HKDF-Extract.
  const chaveEcdh = await crypto.subtle.importKey('raw', new Uint8Array(ecdh), 'HKDF', false, ['deriveBits']);
  const ikm = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: auth, info }, chaveEcdh, 256);

  // RFC 8188 §2.1: o `\0` de separacao vai no info; o WebCrypto acrescenta o
  // `\0` final do RFC 5869 sozinho.
  const prk2 = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const chaveAes = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: aes128gcm') },
    prk2, 128,
  );
  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: nonce') },
    prk2, 96,
  );
  const chaveDec = await crypto.subtle.importKey('raw', chaveAes, { name: 'AES-GCM' }, false, ['decrypt']);
  const texto = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, chaveDec, cifrado));
  return { texto, delimitador: texto.charCodeAt(texto.length - 1) };
}

function concat(...partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((n, p) => n + p.length, 0);
  const saida = new Uint8Array(total);
  let o = 0;
  for (const p of partes) {
    saida.set(p, o);
    o += p.length;
  }
  return saida;
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

  it('o navegador decifra mesmo sem saber que a chave veio do nosso codigo', async () => {
    // Decifrador independente, escrito a partir do RFC 8291 §3.4 / RFC 8188
    // §2.1 sem olhar a implementacao. Se o HKDF do emissor trocar salt e IKM,
    // duplicar o \0 ou usar outro info, a decifra falha aqui.
    const { inscricao, chavePrivada, publica, auth } = await parUa();
    const corpo = await cifrarCarga(
      { title: 'Alerta', body: 'Corpo', url: '/x', tag: 't' },
      inscricao,
    );

    const salt = corpo.slice(0, 16);
    const idLen = corpo[20];
    const asPublica = corpo.slice(21, 21 + idLen);
    const cifrado = corpo.slice(21 + idLen);

    const ecdh = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: await crypto.subtle.importKey(
          'raw', asPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
        ),
      },
      chavePrivada,
      256,
    );

    const enc = new TextEncoder();
    // RFC 8291: HKDF-Extract(salt=auth_secret, IKM=ecdh_secret)
    const ikmKey = await crypto.subtle.importKey('raw', new Uint8Array(ecdh), 'HKDF', false, ['deriveBits']);
    const ikm = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: auth,
        info: concat(enc.encode('WebPush: info\0'), publica, asPublica),
      },
      ikmKey,
      256,
    );

    const prk = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const cek = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: aes128gcm') },
      prk,
      128,
    );
    const nonce = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: nonce') },
      prk,
      96,
    );

    const chave = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['decrypt']);
    const claro = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(nonce) }, chave, cifrado),
    );

    // RFC 8188 §2: 0x02 = ultimo registro, seguido de padding.
    const fim = claro.lastIndexOf(2);
    expect(fim).toBeGreaterThanOrEqual(0);
    expect(claro.slice(fim + 1).every((b) => b === 0)).toBe(true);
    expect(JSON.parse(new TextDecoder().decode(claro.slice(0, fim)))).toEqual({
      title: 'Alerta', body: 'Corpo', url: '/x', tag: 't',
    });
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
