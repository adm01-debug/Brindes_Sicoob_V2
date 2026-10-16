import type { PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KitState } from '@/lib/kit-builder';
import { useDirtyGuard } from '@/hooks/useDirtyGuard';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'usuario-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import { useKitPersistenceCoordinator } from '@/hooks/useKitPersistenceCoordinator';

function kitState(name: string, withContent = true): KitState {
  return {
    name,
    kitType: 'montado',
    box: withContent ? {
      id: 'caixa-1', name: 'Caixa', sku: 'CX', imageUrl: null, price: 10,
      internalWidth: 10, internalHeight: 10, internalDepth: 10, internalVolume: 1_000,
    } : null,
    items: [],
    personalization: { box: { enabled: false }, items: {} },
    identity: { color: '#003641', icon: 'Package', tag: 'Corporativo', description: 'Completo', isFavorite: true },
    totalItemsVolume: 0,
    availableVolume: 1_000,
    volumeUsagePercent: 0,
    totalWeight: 0,
    boxPrice: withContent ? 10 : 0,
    itemsPrice: 0,
    personalizationPrice: 0,
    totalPrice: withContent ? 10 : 0,
    isValid: withContent,
    validationErrors: [],
  };
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function useGuardedPersistence(state: KitState) {
  const persistence = useKitPersistenceCoordinator({
    kitState: state,
    kitQuantity: 20,
    mode: { kind: 'custom', sessionKey: 0 },
  });
  useDirtyGuard('kit-builder', persistence.isDirty);
  return persistence;
}

// Os dois cenários compartilham os mesmos relógio, cliente e mocks de fronteira.
// eslint-disable-next-line max-lines-per-function
describe('useKitPersistenceCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useNavigationGuardStore.getState().clearAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executa o autosave após o debounce no modo customizado', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'kit-criado' }, error: null });
    const insert = vi.fn(() => ({ select: () => ({ single }) }));
    mocks.from.mockImplementation((table: string) => {
      expect(table).toBe('custom_kits');
      return { insert };
    });

    const { result, rerender } = renderHook(
      ({ state }) => useGuardedPersistence(state),
      { initialProps: { state: kitState('', false) }, wrapper: wrapper() },
    );

    expect(result.current.isDirty).toBe(false);
    expect(useNavigationGuardStore.getState().hasDirty()).toBe(false);
    rerender({ state: kitState('Kit alterado') });
    expect(useNavigationGuardStore.getState().hasDirty()).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(result.current.resolvedKitId).toBe('kit-criado');
    expect(result.current.lastSaveError).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(useNavigationGuardStore.getState().hasDirty()).toBe(false);
  });

  it('adota o conteúdo carregado como baseline sem disparar autosave', async () => {
    const { result, rerender } = renderHook(
      ({ state, enabled }) => useKitPersistenceCoordinator({
        kitState: state,
        kitQuantity: 20,
        mode: { kind: 'custom', kitId: 'kit-a', sessionKey: 0 },
        enabled,
      }),
      {
        initialProps: { state: kitState('Estado anterior'), enabled: false },
        wrapper: wrapper(),
      },
    );

    rerender({ state: kitState('Kit A carregado'), enabled: true });
    expect(result.current.isDirty).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(mocks.from).not.toHaveBeenCalled();

    rerender({ state: kitState('Kit A editado'), enabled: true });
    expect(result.current.isDirty).toBe(true);
  });

  it('mantém baselines independentes ao navegar A para B para A', async () => {
    const { result, rerender } = renderHook(
      ({ id, state, enabled }) => useKitPersistenceCoordinator({
        kitState: state,
        kitQuantity: 20,
        mode: { kind: 'custom', kitId: id, sessionKey: 0 },
        enabled,
      }),
      {
        initialProps: { id: 'kit-a', state: kitState('Anterior'), enabled: false },
        wrapper: wrapper(),
      },
    );

    rerender({ id: 'kit-a', state: kitState('Kit A'), enabled: true });
    expect(result.current.isDirty).toBe(false);
    rerender({ id: 'kit-b', state: kitState('Kit A'), enabled: false });
    rerender({ id: 'kit-b', state: kitState('Kit B'), enabled: true });
    expect(result.current.isDirty).toBe(false);
    rerender({ id: 'kit-a', state: kitState('Kit B'), enabled: false });
    rerender({ id: 'kit-a', state: kitState('Kit A atualizado'), enabled: true });
    expect(result.current.isDirty).toBe(false);

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('não grava custom_kits no modo template e salva apenas sob ação manual', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'template-1' }, error: null });
    const update = vi.fn(() => ({
      eq: () => ({ select: () => ({ maybeSingle }) }),
    }));
    mocks.from.mockImplementation((table: string) => {
      expect(table).toBe('kit_templates');
      return { update };
    });

    const { result, rerender } = renderHook(
      ({ state }) => useKitPersistenceCoordinator({
        kitState: state,
        kitQuantity: 20,
        mode: { kind: 'template', templateId: 'template-1' },
      }),
      { initialProps: { state: kitState('Template inicial') }, wrapper: wrapper() },
    );

    rerender({ state: kitState('Template alterado') });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(mocks.from).not.toHaveBeenCalled();

    await act(async () => { await result.current.saveNow(); });
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Template do sistema salvo!');
  });

  it('cria template pela fila sem limpar alterações do kit customizado', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'template-copia' }, error: null });
    const insert = vi.fn(() => ({ select: () => ({ single }) }));
    mocks.from.mockImplementation((table: string) => {
      expect(table).toBe('kit_templates');
      return { insert };
    });

    const { result, rerender } = renderHook(
      ({ state }) => useKitPersistenceCoordinator({
        kitState: state,
        kitQuantity: 20,
        mode: { kind: 'custom', kitId: 'kit-a', sessionKey: 0 },
      }),
      { initialProps: { state: kitState('Kit salvo') }, wrapper: wrapper() },
    );

    rerender({ state: kitState('Kit ainda não salvo') });
    expect(result.current.isDirty).toBe(true);
    await act(async () => { await result.current.saveAsTemplate(); });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(result.current.resolvedKitId).toBe('kit-a');
    expect(result.current.isDirty).toBe(true);
  });

  it('mantém erro visível e permite repetir uma atualização rejeitada', async () => {
    const maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('banco indisponível') })
      .mockResolvedValueOnce({ data: { id: 'kit-a' }, error: null });
    const update = vi.fn((payload: unknown) => ({
      eq: () => ({ eq: () => ({ select: () => ({ maybeSingle }) }) }),
      payload,
    }));
    mocks.from.mockImplementation(() => ({ update }));

    const { result, rerender } = renderHook(
      ({ state }) => useKitPersistenceCoordinator({
        kitState: state,
        kitQuantity: 20,
        mode: { kind: 'custom', kitId: 'kit-a', sessionKey: 0 },
      }),
      { initialProps: { state: kitState('Kit salvo') }, wrapper: wrapper() },
    );
    rerender({ state: kitState('Kit alterado') });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(result.current.lastSaveError).toContain('banco indisponível');
    expect(result.current.lastSavedAt).toBeNull();

    await act(async () => {
      result.current.retry();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.lastSaveError).toBeNull();
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('trata uma atualização sem linha retornada como falha', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn(() => ({
      eq: () => ({ eq: () => ({ select: () => ({ maybeSingle }) }) }),
    }));
    mocks.from.mockImplementation(() => ({ update }));

    const { result, rerender } = renderHook(
      ({ state }) => useKitPersistenceCoordinator({
        kitState: state,
        kitQuantity: 20,
        mode: { kind: 'custom', kitId: 'kit-a', sessionKey: 0 },
      }),
      { initialProps: { state: kitState('Kit salvo') }, wrapper: wrapper() },
    );
    rerender({ state: kitState('Alteração não persistida') });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(result.current.lastSaveError).toContain('não foi encontrado');
    expect(result.current.lastSavedAt).toBeNull();
  });

  it('serializa uma edição feita enquanto o primeiro salvamento está em andamento', async () => {
    let resolveFirst: ((value: { data: { id: string }; error: null }) => void) | undefined;
    const maybeSingle = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ data: { id: 'kit-a' }, error: null });
    const update = vi.fn((payload: unknown) => ({
      eq: () => ({ eq: () => ({ select: () => ({ maybeSingle }) }) }),
      payload,
    }));
    mocks.from.mockImplementation(() => ({ update }));

    const { result, rerender } = renderHook(
      ({ state }) => useKitPersistenceCoordinator({
        kitState: state,
        kitQuantity: 20,
        mode: { kind: 'custom', kitId: 'kit-a', sessionKey: 0 },
      }),
      { initialProps: { state: kitState('Kit salvo') }, wrapper: wrapper() },
    );
    rerender({ state: kitState('Primeira alteração') });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).toHaveBeenCalledTimes(1);

    rerender({ state: kitState('Estado mais recente') });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst?.({ data: { id: 'kit-a' }, error: null });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1]?.[0]).toMatchObject({ name: 'Estado mais recente' });
    expect(result.current.lastSaveError).toBeNull();
  });

  it('adota o ID criado antes de persistir uma edição já enfileirada', async () => {
    let resolveCreation: ((value: { data: { id: string }; error: null }) => void) | undefined;
    const single = vi.fn().mockImplementationOnce(
      () => new Promise((resolve) => { resolveCreation = resolve; }),
    );
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'kit-criado' }, error: null });
    const insert = vi.fn(() => ({ select: () => ({ single }) }));
    const update = vi.fn((payload: unknown) => ({
      eq: () => ({ eq: () => ({ select: () => ({ maybeSingle }) }) }),
      payload,
    }));
    mocks.from.mockImplementation(() => ({ insert, update }));

    const { result, rerender } = renderHook(
      ({ state }) => useKitPersistenceCoordinator({
        kitState: state,
        kitQuantity: 20,
        mode: { kind: 'custom', sessionKey: 0 },
      }),
      { initialProps: { state: kitState('', false) }, wrapper: wrapper() },
    );
    rerender({ state: kitState('Estado inicial') });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(insert).toHaveBeenCalledTimes(1);

    rerender({ state: kitState('Edição durante a criação') });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreation?.({ data: { id: 'kit-criado' }, error: null });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.resolvedKitId).toBe('kit-criado');
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toMatchObject({ name: 'Edição durante a criação' });
  });
});
