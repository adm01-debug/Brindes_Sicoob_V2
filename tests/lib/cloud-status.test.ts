import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase client + pingHealth ANTES de importar o módulo testado.
const getSessionMock = vi.fn();
const invokeMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabaseUrl: 'https://test.supabase.co',
  supabasePublishableKey: 'test-anon-key',
  supabase: {
    auth: { getSession: () => getSessionMock() },
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

const pingHealthMock = vi.fn();
vi.mock('@/lib/external-db/health-check', () => ({
  pingHealth: (...args: unknown[]) => pingHealthMock(...args),
}));

// fetch global (REST HEAD)
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import {
  probeCloudStatus,
  invalidateCloudStatus,
  ensureCloudReady,
  CloudNotReadyError,
} from '@/lib/cloud-status';

beforeEach(() => {
  invalidateCloudStatus();
  getSessionMock.mockReset();
  pingHealthMock.mockReset();
  fetchMock.mockReset();
  invokeMock.mockReset();
  invokeMock.mockResolvedValue({ data: null, error: new Error('no health fn') });
});

describe('cloud-status', () => {
  it('returns healthy when all 3 signals pass with low latency', async () => {
    getSessionMock.mockResolvedValue({ error: null });
    pingHealthMock.mockResolvedValue({ ok: true, ms: 100 });
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);

    const snap = await probeCloudStatus(true);
    expect(snap.status).toBe('healthy');
  });

  it('treats a protected REST root (401) as reachable', async () => {
    getSessionMock.mockResolvedValue({ error: null });
    pingHealthMock.mockResolvedValue({ ok: true, ms: 100 });
    fetchMock.mockResolvedValue({ ok: false, status: 401 } as Response);

    const snap = await probeCloudStatus(true);
    expect(snap.signals.rest.ok).toBe(true);
    expect(snap.status).toBe('healthy');
  });

  it('treats a REST 5xx as unreachable', async () => {
    getSessionMock.mockResolvedValue({ error: null });
    pingHealthMock.mockResolvedValue({ ok: true, ms: 100 });
    fetchMock.mockResolvedValue({ ok: false, status: 503 } as Response);

    const snap = await probeCloudStatus(true);
    expect(snap.signals.rest.ok).toBe(false);
    expect(snap.status).toBe('warming');
  });

  it('stops polling system-healthcheck after a 403 and retries after invalidate', async () => {
    getSessionMock.mockResolvedValue({ error: null });
    pingHealthMock.mockResolvedValue({ ok: true, ms: 100 });
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);
    const forbidden = Object.assign(new Error('forbidden'), { context: { status: 403 } });
    invokeMock.mockResolvedValue({ data: null, error: forbidden });

    await probeCloudStatus(true);
    await probeCloudStatus(true);
    await probeCloudStatus(true);
    expect(invokeMock).toHaveBeenCalledTimes(1);

    invalidateCloudStatus();
    await probeCloudStatus(true);
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });

  it('returns warming when 2 of 3 signals pass', async () => {
    getSessionMock.mockResolvedValue({ error: null });
    pingHealthMock.mockResolvedValue({ ok: false, ms: 2500, error: 'boom' });
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);

    const snap = await probeCloudStatus(true);
    expect(snap.status).toBe('warming');
  });

  it('returns degraded when only 1 of 3 signals passes', async () => {
    getSessionMock.mockResolvedValue({ error: null });
    pingHealthMock.mockResolvedValue({ ok: false, ms: 0, error: 'x' });
    fetchMock.mockRejectedValue(new Error('net'));

    const snap = await probeCloudStatus(true);
    expect(snap.status).toBe('degraded');
  });

  it('returns down when all signals fail', async () => {
    getSessionMock.mockResolvedValue({ error: new Error('x') });
    pingHealthMock.mockResolvedValue({ ok: false, ms: 0, error: 'x' });
    fetchMock.mockRejectedValue(new Error('net'));

    const snap = await probeCloudStatus(true);
    expect(snap.status).toBe('down');
  });

  it('caches result for 15s (no extra signal calls)', async () => {
    getSessionMock.mockResolvedValue({ error: null });
    pingHealthMock.mockResolvedValue({ ok: true, ms: 100 });
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);

    await probeCloudStatus(true);
    await probeCloudStatus(false);
    await probeCloudStatus(false);

    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(pingHealthMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ensureCloudReady throws CloudNotReadyError when persistently degraded', async () => {
    getSessionMock.mockResolvedValue({ error: new Error('x') });
    pingHealthMock.mockResolvedValue({ ok: false, ms: 0, error: 'x' });
    fetchMock.mockRejectedValue(new Error('net'));

    await expect(ensureCloudReady(500, false)).rejects.toBeInstanceOf(CloudNotReadyError);
  });

  it('ensureCloudReady resolves when status is warming and acceptWarming=true', async () => {
    getSessionMock.mockResolvedValue({ error: null });
    pingHealthMock.mockResolvedValue({ ok: false, ms: 0, error: 'x' });
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);

    const snap = await ensureCloudReady(2000, true);
    expect(snap.status).toBe('warming');
  });
});
