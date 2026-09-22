import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../components/render-helpers';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from './_helpers/render-hook-providers';
import { supabase } from '@/integrations/supabase/client';
import { use2FA } from '@/hooks/use2FA';

const listFactors = vi.fn();

beforeEach(() => {
  listFactors.mockReset();
  Object.assign(supabase.auth, { mfa: { listFactors } });
});

describe('use2FA', () => {
  it('reconhece apenas fator TOTP verificado pelo Supabase Auth', async () => {
    listFactors.mockResolvedValue({ data: { totp: [{ id: 'f1', status: 'verified' }] }, error: null });
    const { result } = renderHookWithProviders(() => use2FA());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.is2FAEnabled).toBe(true);
    expect(listFactors).toHaveBeenCalledOnce();
  });

  it('não considera um fator pendente como MFA ativo', async () => {
    listFactors.mockResolvedValue({ data: { totp: [{ id: 'f1', status: 'unverified' }] }, error: null });
    const { result } = renderHookWithProviders(() => use2FA());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.is2FAEnabled).toBe(false);
  });

  it('não consulta fatores de outro usuário pela sessão atual', async () => {
    const { result } = renderHookWithProviders(() => use2FA('outro-usuario'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(listFactors).not.toHaveBeenCalled();
  });

  it('expõe falha de consulta para não informar falsamente que MFA está inativo', async () => {
    listFactors.mockResolvedValue({ data: null, error: new Error('indisponível') });
    const { result } = renderHookWithProviders(() => use2FA());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('indisponível');
  });
});
