import { describe, expect, it, vi } from 'vitest';
import { KitPersistenceCoordinator } from '@/lib/kit-builder/persistence-coordinator';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

// Os cenários cobrem, em conjunto, a mesma máquina de fila e geração.
// eslint-disable-next-line max-lines-per-function
describe('KitPersistenceCoordinator', () => {
  it('serializa autosave e salvamento manual no mesmo alvo', async () => {
    const coordinator = new KitPersistenceCoordinator();
    coordinator.activateScope('usuario:novo', null, 'inicial');
    const first = deferred<{ targetId: string }>();
    const autoExecute = vi.fn(() => first.promise);
    const manualExecute = vi.fn(async (targetId: string | null) => ({ targetId }));

    const automatic = coordinator.enqueue({ snapshot: 'A', execute: autoExecute });
    const manual = coordinator.enqueue({ snapshot: 'B', execute: manualExecute });
    await Promise.resolve();

    expect(autoExecute).toHaveBeenCalledWith(null);
    expect(manualExecute).not.toHaveBeenCalled();

    first.resolve({ targetId: 'kit-1' });
    await automatic;
    await manual;

    expect(manualExecute).toHaveBeenCalledWith('kit-1');
    expect(coordinator.getTargetId()).toBe('kit-1');
    expect(coordinator.getPersistedSnapshot()).toBe('B');
  });

  it('descarta resposta antiga mesmo no ciclo A para B para A', async () => {
    const coordinator = new KitPersistenceCoordinator();
    coordinator.activateScope('A', 'kit-a', 'A0');
    const requestA = deferred<{ targetId: string }>();
    const oldA = coordinator.enqueue({ snapshot: 'A1', execute: () => requestA.promise });
    await Promise.resolve();

    coordinator.activateScope('B', 'kit-b', 'B0');
    coordinator.activateScope('A', 'kit-a', 'A2');
    requestA.resolve({ targetId: 'kit-a-antigo' });

    await expect(oldA).resolves.toMatchObject({ stale: true, executed: true });
    expect(coordinator.getTargetId()).toBe('kit-a');
    expect(coordinator.getPersistedSnapshot()).toBe('A2');
  });

  it('não deixa uma gravação pendente de A bloquear o salvamento de B', async () => {
    const coordinator = new KitPersistenceCoordinator();
    coordinator.activateScope('A', 'kit-a', 'A0');
    const requestA = deferred<{ targetId: string }>();
    const oldA = coordinator.enqueue({ snapshot: 'A1', execute: () => requestA.promise });
    await Promise.resolve();

    coordinator.activateScope('B', 'kit-b', 'B0');
    const executeB = vi.fn(async () => ({ targetId: 'kit-b' }));
    const saveB = coordinator.enqueue({ snapshot: 'B1', execute: executeB });
    await expect(saveB).resolves.toMatchObject({ stale: false, executed: true });
    expect(executeB).toHaveBeenCalledWith('kit-b');

    requestA.resolve({ targetId: 'kit-a' });
    await expect(oldA).resolves.toMatchObject({ stale: true, executed: true });
  });

  it('mantém o baseline sujo após falha e permite que a fila continue', async () => {
    const coordinator = new KitPersistenceCoordinator();
    coordinator.activateScope('A', 'kit-a', 'A0');
    const error = new Error('falha controlada');

    await expect(coordinator.enqueue({
      snapshot: 'A1',
      execute: async () => { throw error; },
    })).rejects.toBe(error);
    expect(coordinator.isDirty('A1')).toBe(true);

    await expect(coordinator.enqueue({
      snapshot: 'A2',
      execute: async (targetId) => ({ targetId }),
    })).resolves.toMatchObject({ stale: false, snapshot: 'A2' });
    expect(coordinator.getPersistedSnapshot()).toBe('A2');
  });

  it('preserva como suja uma edição feita durante o salvamento', async () => {
    const coordinator = new KitPersistenceCoordinator();
    coordinator.activateScope('A', 'kit-a', 'A0');
    const request = deferred<{ targetId: string }>();
    const saving = coordinator.enqueue({ snapshot: 'A1', execute: () => request.promise });
    await Promise.resolve();

    expect(coordinator.isDirty('A2')).toBe(true);
    request.resolve({ targetId: 'kit-a' });
    await saving;

    expect(coordinator.getPersistedSnapshot()).toBe('A1');
    expect(coordinator.isDirty('A2')).toBe(true);
  });

  it('adota baseline somente na geração ainda ativa', () => {
    const coordinator = new KitPersistenceCoordinator();
    const generationA = coordinator.activateScope('A', 'kit-a', 'A0');
    coordinator.activateScope('B', 'kit-b', 'B0');

    expect(coordinator.adoptBaseline('A-carregado', generationA)).toBe(false);
    expect(coordinator.getPersistedSnapshot()).toBe('B0');
    expect(coordinator.adoptBaseline('B-carregado')).toBe(true);
    expect(coordinator.isDirty('B-carregado')).toBe(false);
  });

  it('serializa uma cópia sem trocar alvo nem limpar a sujeira do kit', async () => {
    const coordinator = new KitPersistenceCoordinator();
    coordinator.activateScope('A', 'kit-a', 'A0');

    await coordinator.enqueue({
      snapshot: 'A1',
      adoptTarget: false,
      adoptBaseline: false,
      execute: async () => ({ targetId: 'template-criado' }),
    });

    expect(coordinator.getTargetId()).toBe('kit-a');
    expect(coordinator.getPersistedSnapshot()).toBe('A0');
    expect(coordinator.isDirty('A1')).toBe(true);
  });
});
