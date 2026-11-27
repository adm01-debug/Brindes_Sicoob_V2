import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));

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

  it('inscricaoAtiva reflete a presença de subscription no navegador', async () => {
    const mod = await carregarModulo();
    instalarNavegador({ existente: subscription });
    await expect(mod.inscricaoAtiva()).resolves.toBe(true);

    instalarNavegador();
    await expect(mod.inscricaoAtiva()).resolves.toBe(false);
  });
});
