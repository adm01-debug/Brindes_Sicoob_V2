import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn(() => ({
  upsert: mockUpsert,
  select: (...args: unknown[]) => mockSelect(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
}));

/** Encadeamento do PostgREST: eq(...).eq(...)…maybeSingle() devolve `resultado`. */
function encadeamento(resultado: unknown) {
  const no: Record<string, unknown> = {};
  no.eq = (...args: unknown[]) => {
    mockEq(...args);
    return no;
  };
  no.maybeSingle = async () => resultado;
  // O builder do PostgREST é thenable: `await update().eq().eq()` resolve em
  // { error }. O mock precisa expor `then` para reproduzir isso.
  no.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resultado).then(resolve);
  return no;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

type Modulo = typeof import('@/lib/push-subscription');

async function carregarModulo(chave = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8'): Promise<Modulo> {
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', chave);
  vi.resetModules();
  return import('@/lib/push-subscription');
}

const subscription = {
  endpoint: 'https://push.exemplo/abc',
  getKey: (nome: string) =>
    nome === 'p256dh' ? new Uint8Array([1, 2, 3]).buffer : new Uint8Array([4, 5]).buffer,
  unsubscribe: vi.fn(async () => true),
};

function instalarNavegador(opcoes: {
  existente?: unknown;
  permissao?: NotificationPermission;
} = {}) {
  const subscribe = vi.fn(async () => subscription);
  const getSubscription = vi.fn(async () => opcoes.existente ?? null);

  // pushSuportadoNoNavegador() checa o navegador real; o harness troca as três
  // APIs por objetos controlados, sem recriar globalThis (isso quebraria o import).
  const pushManager = { subscribe, getSubscription };
  const sw = { ready: Promise.resolve({ pushManager }) };
  const notification = { permission: opcoes.permissao ?? 'granted' };

  Object.defineProperty(window, 'PushManager', { value: function PushManager() {}, configurable: true });
  Object.defineProperty(window, 'Notification', { value: notification, configurable: true });
  Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', configurable: true });
  Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });

  return { subscribe, getSubscription };
}

describe('pushSubscriptions', () => {
  beforeEach(async () => {
    mockUpsert.mockReset();
    mockUpsert.mockResolvedValue({ error: null });
    mockFrom.mockClear();
    mockSelect.mockReset();
    mockUpdate.mockReset();
    mockEq.mockReset();
    // A chave é lida no import do módulo; definir antes de carregá-lo.
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(window, 'PushManager');
    Reflect.deleteProperty(window, 'Notification');
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('reporta navegador sem suporte quando PushManager não existe', async () => {
    const { pushSuportadoNoNavegador } = await carregarModulo();
    expect(pushSuportadoNoNavegador()).toBe(false);
  });

  it('não inscreve quando a permissão foi negada', async () => {
    const mod = await carregarModulo();
    instalarNavegador({ permissao: 'denied' });

    const resultado = await mod.inscreverPush('user-1');

    expect(resultado).toEqual({ ok: false, motivo: 'permissao-negada' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('cria a inscrição e persiste com a chave natural (user_id, endpoint)', async () => {
    const mod = await carregarModulo();
    const { subscribe } = instalarNavegador();

    const resultado = await mod.inscreverPush('user-1');

    expect(resultado).toEqual({ ok: true, endpoint: 'https://push.exemplo/abc' });
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('push_subscriptions');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        endpoint: 'https://push.exemplo/abc',
        is_active: true,
      }),
      { onConflict: 'user_id,endpoint' },
    );
  });

  it('reaproveita a inscrição existente em vez de criar outra', async () => {
    const mod = await carregarModulo();
    const { subscribe } = instalarNavegador({ existente: subscription });

    await mod.inscreverPush('user-1');

    expect(subscribe).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('devolve falha de persistência quando o upsert erra', async () => {
    const mod = await carregarModulo();
    instalarNavegador();
    mockUpsert.mockResolvedValue({ error: { message: 'permission denied' } });

    const resultado = await mod.inscreverPush('user-1');

    expect(resultado).toEqual({
      ok: false,
      motivo: 'falha-persistencia',
      detalhe: 'permission denied',
    });
  });

  it('reporta falta de chave configurada sem tocar no navegador', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    instalarNavegador();
    vi.resetModules();
    const mod = await import('@/lib/push-subscription');

    const resultado = await mod.inscreverPush('user-1');

    expect(resultado).toEqual({ ok: false, motivo: 'sem-chave' });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('converte base64url do VAPID para bytes', async () => {
    const mod = await carregarModulo();
    const bytes = mod.base64UrlParaBytes('-_8');
    expect(Array.from(bytes)).toEqual([0xfb, 0xff]);
  });

  it('inscricaoAtiva só confirma quando existe linha ativa daquela conta', async () => {
    const mod = await carregarModulo();
    instalarNavegador({ existente: subscription });
    mockSelect.mockReturnValue(encadeamento({ data: { id: 'linha-1' }, error: null }));

    await expect(mod.inscricaoAtiva('user-1')).resolves.toBe(true);
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockEq).toHaveBeenCalledWith('endpoint', 'https://push.exemplo/abc');
    expect(mockEq).toHaveBeenCalledWith('is_active', true);
  });

  it('inscricaoAtiva é false quando a conta atual não gravou o endpoint', async () => {
    const mod = await carregarModulo();
    instalarNavegador({ existente: subscription });
    mockSelect.mockReturnValue(encadeamento({ data: null, error: null }));

    await expect(mod.inscricaoAtiva('outra-conta')).resolves.toBe(false);
  });

  it('inscricaoAtiva é false sem inscrição no navegador', async () => {
    const mod = await carregarModulo();
    instalarNavegador();

    await expect(mod.inscricaoAtiva('user-1')).resolves.toBe(false);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('desinscreverPush desativa o banco antes de descartar a inscrição local', async () => {
    const mod = await carregarModulo();
    instalarNavegador({ existente: subscription });
    mockUpdate.mockReturnValue(encadeamento({ error: null }));
    const ordem: string[] = [];
    // Resolve só depois de um tick: se o código cancelasse a inscrição local
    // antes de esperar o banco, 'navegador' apareceria primeiro.
    let liberarBanco: () => void = () => {};
    const respostaPendente = new Promise<void>((r) => { liberarBanco = r; });
    let marcarInicio: () => void = () => {};
    const updateIniciado = new Promise<void>((r) => { marcarInicio = r; });
    mockUpdate.mockImplementation(() => {
      ordem.push('banco');
      marcarInicio();
      const enc = encadeamento({ error: null }) as Record<string, unknown> & {
        then: (res: (v: unknown) => unknown) => Promise<unknown>;
      };
      enc.then = (resolve: (v: unknown) => unknown) =>
        respostaPendente.then(() => resolve({ error: null }));
      return enc;
    });
    subscription.unsubscribe.mockImplementation(async () => {
      ordem.push('navegador');
      return true;
    });

    const desinscricao = mod.desinscreverPush('user-1');
    // Promise.race com diagnóstico: se o update nunca for chamado, a falha diz
    // isso em vez de estourar o timeout do vitest.
    const disparou = await Promise.race([
      updateIniciado.then(() => 'ok' as const),
      desinscricao.then(() => 'terminou' as const),
    ]);
    expect(disparou, 'desinscreverPush terminou sem chamar o update do banco').toBe('ok');
    expect(ordem).toEqual(['banco']);

    liberarBanco();
    await expect(desinscricao).resolves.toBe(true);
    expect(ordem).toEqual(['banco', 'navegador']);
  });

  it('desinscreverPush mantém a inscrição local quando o banco rejeita', async () => {
    const mod = await carregarModulo();
    instalarNavegador({ existente: subscription });
    mockUpdate.mockReturnValue(encadeamento({ error: { message: 'negado' } }));
    const unsubscribe = vi.fn(async () => true);
    subscription.unsubscribe = unsubscribe;

    await expect(mod.desinscreverPush('user-1')).resolves.toBe(false);
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});
