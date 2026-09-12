import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DevInfraGate } from '@/lib/system/dev-gate/DevInfraGate';
import { GateFlagProvider } from '@/lib/system/dev-gate/types';

describe('DevInfraGate', () => {
  let gate: DevInfraGate;
  let mockProvider: GateFlagProvider;

  beforeEach(() => {
    mockProvider = {
      getFlag: vi.fn().mockReturnValue('auto')
    };
    gate = new DevInfraGate([mockProvider]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should notify listeners when invalidateCache is called', () => {
    const listener = vi.fn();
    gate.subscribe(listener);
    
    gate.invalidateCache();
    vi.advanceTimersByTime(50);
    
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should invalidate cache when storage event triggers with relevant key', () => {
    const listener = vi.fn();
    gate.subscribe(listener);
    
    // Simular evento de storage
    const event = new StorageEvent('storage', {
      key: 'show_dev_infra_messages',
      newValue: 'true'
    });
    window.dispatchEvent(event);
    vi.advanceTimersByTime(50);
    
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should NOT invalidate cache when storage event triggers with irrelevant key', () => {
    const listener = vi.fn();
    gate.subscribe(listener);
    
    const event = new StorageEvent('storage', {
      key: 'some_other_key',
      newValue: 'true'
    });
    window.dispatchEvent(event);
    
    expect(listener).not.toHaveBeenCalled();
  });

  it('should return cached value until invalidated', () => {
    gate.shouldShow(['dev']);
    expect(mockProvider.getFlag).toHaveBeenCalledTimes(1);
    
    gate.shouldShow(['dev']);
    expect(mockProvider.getFlag).toHaveBeenCalledTimes(1); // Cached
    
    gate.invalidateCache();
    vi.advanceTimersByTime(50);
    gate.shouldShow(['dev']);
    expect(mockProvider.getFlag).toHaveBeenCalledTimes(2); // Re-evaluated
  });
});
