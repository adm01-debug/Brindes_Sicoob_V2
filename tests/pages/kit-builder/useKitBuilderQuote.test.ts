import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KitState } from '@/hooks/useKitBuilder';
import { buildKitQuotePayload } from '@/pages/kit-builder/kitQuoteRequest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const USER_ID = '11111111-1111-1111-1111-111111111111';

const KIT_STATE: KitState = {
  isValid: true,
  kitType: 'montado',
  name: 'Kit teste',
  identity: { color: '#fff', icon: 'star', tag: 'PROMO' },
  box: {
    id: 'box-1',
    name: 'Caixa A',
    sku: 'BOX-A',
    imageUrl: 'https://catalogo.invalid/caixa.webp',
    price: 50,
    internalWidth: 30,
    internalHeight: 20,
    internalDepth: 10,
  } as KitState['box'],
  items: [
    {
      id: 'item-1',
      name: 'Caneta adulterável no navegador',
      sku: 'PEN-CLIENTE',
      imageUrl: 'https://catalogo.invalid/caneta.webp',
      price: 0.01,
      quantity: 5,
      isOptional: false,
      selectedVariantId: 'variant-1',
      selectedColor: { name: 'Verde', hex: '#00A091' },
    } as KitState['items'][number],
  ],
  personalization: {
    box: { enabled: false },
    items: {
      'item-1': {
        enabled: true,
        techniqueId: 'tech-1',
        techniqueName: 'Nome do cliente',
        colors: 2,
        width: 3,
        height: 2,
        estimatedPrice: 0.01,
      },
    },
  },
  volumeUsagePercent: 80,
} as KitState;

describe('contrato de conversão do Kit Builder', () => {
  it('envia somente IDs, quantidades e parâmetros; preço e descrição vêm do servidor', () => {
    const payload = buildKitQuotePayload(KIT_STATE, 3, 'idempotencia-0001');
    expect(payload.lines).toEqual([
      expect.objectContaining({ lineId: 'box', productId: 'box-1', unitsPerKit: 1, kind: 'box' }),
      expect.objectContaining({
        lineId: 'item:0',
        productId: 'item-1',
        variantId: 'variant-1',
        unitsPerKit: 5,
        kind: 'item',
        personalization: { techniqueId: 'tech-1', colors: 2, width: 3, height: 2 },
      }),
    ]);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('0.01');
    expect(serialized).not.toContain('Caneta adulterável');
    expect(serialized).not.toContain('PEN-CLIENTE');
    expect(serialized).not.toContain('catalogo.invalid');
  });

  it('recusa personalização habilitada sem técnica', () => {
    const invalid = {
      ...KIT_STATE,
      personalization: { ...KIT_STATE.personalization, items: { 'item-1': { enabled: true } } },
    } as KitState;
    expect(() => buildKitQuotePayload(invalid, 1, 'idempotencia-0002')).toThrow('Selecione a técnica');
  });
});

describe('useKitBuilderQuote', () => {
  const navigate = vi.fn();
  let invoke: ReturnType<typeof vi.fn>;
  let from: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    navigate.mockReset();
    invoke = vi.fn().mockResolvedValue({
      data: { quoteId: 'quote-1', quoteNumber: 'ORC-001', stockReserved: false },
      error: null,
    });
    from = vi.fn();
  });

  afterEach(() => {
    vi.doUnmock('@/integrations/supabase/client');
    vi.doUnmock('@/contexts/AuthContext');
    vi.doUnmock('react-router-dom');
    vi.clearAllMocks();
  });

  async function loadHook(user: { id: string } | null) {
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: { functions: { invoke }, from },
    }));
    vi.doMock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }));
    vi.doMock('react-router-dom', () => ({ useNavigate: () => navigate }));
    const mod = await import('@/pages/kit-builder/useKitBuilderQuote');
    return mod.useKitBuilderQuote;
  }

  it('usa a Edge Function e não grava tabelas diretamente', async () => {
    const useHook = await loadHook({ id: USER_ID });
    const { result } = renderHook(() => useHook());

    await act(async () => result.current.handleAddToQuote(KIT_STATE, 3));

    expect(invoke).toHaveBeenCalledWith('sicoob-kit-quote', {
      body: expect.objectContaining({ kitName: 'Kit teste', kitQuantity: 3 }),
    });
    expect(from).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/orcamentos/quote-1');
  });

  it('reutiliza a chave após perda de resposta para impedir orçamento duplicado', async () => {
    invoke
      .mockResolvedValueOnce({ data: null, error: new Error('Falha de rede após commit') })
      .mockResolvedValueOnce({ data: { quoteId: 'quote-1', quoteNumber: 'ORC-001' }, error: null });
    const useHook = await loadHook({ id: USER_ID });
    const { result } = renderHook(() => useHook());

    await act(async () => result.current.handleAddToQuote(KIT_STATE, 3));
    await act(async () => result.current.handleAddToQuote(KIT_STATE, 3));

    const firstKey = invoke.mock.calls[0][1].body.idempotencyKey;
    const secondKey = invoke.mock.calls[1][1].body.idempotencyKey;
    expect(secondKey).toBe(firstKey);
  });

  it('não chama a Edge Function sem sessão', async () => {
    const useHook = await loadHook(null);
    const { result } = renderHook(() => useHook());

    await act(async () => result.current.handleAddToQuote(KIT_STATE, 1));

    expect(invoke).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
