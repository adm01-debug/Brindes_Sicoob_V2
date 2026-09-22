import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useWebAuthn } from '../../src/hooks/useWebAuthn';

describe('passkeys enquanto a verificação no servidor não existe', () => {
  it('não declara autenticação concluída por uma credencial apenas identificada', async () => {
    const { result } = renderHook(() => useWebAuthn());
    expect(result.current.isSupported).toBe(false);
    expect(await result.current.authenticateWithPasskey('conta@example.invalid'))
      .toEqual({ success: false });
    expect(await result.current.registerPasskey('id', 'conta@example.invalid')).toBe(false);
    expect(await result.current.fetchPasskeys('id')).toEqual([]);
  });
});
