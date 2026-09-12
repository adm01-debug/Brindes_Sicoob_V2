import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  onBridgeStatus: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@/lib/external-db/bridge-status-events', () => ({
  onBridgeStatus: mocks.onBridgeStatus,
}));

describe('ciclo de vida do gravador de cold start', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.onBridgeStatus.mockReturnValue(mocks.unsubscribe);
  });

  it('permite iniciar novamente depois que o shell autenticado é desmontado', async () => {
    const { startColdStartRecorder } = await import('@/lib/external-db/cold-start-recorder');
    const stop = startColdStartRecorder();
    startColdStartRecorder();
    expect(mocks.onBridgeStatus).toHaveBeenCalledOnce();

    stop();
    const stopAgain = startColdStartRecorder();
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.onBridgeStatus).toHaveBeenCalledTimes(2);
    stopAgain();
  });
});
