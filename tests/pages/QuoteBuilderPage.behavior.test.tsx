import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import {
  buildQuoteDraftData,
  QuoteEditableSection,
  restoreQuoteDraft,
} from '@/pages/QuoteBuilderPage';

describe('rascunho do orçamento', () => {
  it('preserva cliente, contato e todas as condições comerciais no roundtrip', () => {
    const deliveryDate = new Date('2026-10-20T12:00:00.000Z');
    const draft = buildQuoteDraftData({
      clientId: 'empresa-1',
      contactId: 'contato-1',
      companyInfo: { id: 'empresa-1', name: 'Cooperativa' },
      contactInfo: { id: 'contato-1', name: 'Maria' },
      validityDays: '30',
      validUntil: '2026-11-14',
      discountType: 'amount',
      discountValue: 50,
      negotiationMarkup: 8,
      paymentTerms: '28 dias',
      deliveryTime: '10 dias úteis',
      deliveryMode: 'data',
      deliveryDate,
      shippingType: 'cif',
      shippingCost: 120,
      notes: 'Cliente prioritário',
      internalNotes: 'Validar arte',
      items: [{ product_id: 'produto-1', product_name: 'Caneca', quantity: 10, unit_price: 20 }],
      tags: ['evento'],
    } as never);
    const calls = new Map<string, ReturnType<typeof vi.fn>>();
    const state = new Proxy({}, {
      get: (_target, property: string) => {
        if (!calls.has(property)) calls.set(property, vi.fn());
        return calls.get(property);
      },
    });

    restoreQuoteDraft(state as never, draft);

    expect(calls.get('setContactId')).toHaveBeenCalledWith('contato-1');
    expect(calls.get('setCompanyInfo')).toHaveBeenCalledWith({ id: 'empresa-1', name: 'Cooperativa' });
    expect(calls.get('setContactInfo')).toHaveBeenCalledWith({ id: 'contato-1', name: 'Maria' });
    expect(calls.get('setNegotiationMarkup')).toHaveBeenCalledWith(8);
    expect(calls.get('setPaymentTerms')).toHaveBeenCalledWith('28 dias');
    expect(calls.get('setDeliveryMode')).toHaveBeenCalledWith('data');
    expect(calls.get('setDeliveryDate')).toHaveBeenCalledWith(deliveryDate);
    expect(calls.get('setShippingType')).toHaveBeenCalledWith('cif');
    expect(calls.get('setShippingCost')).toHaveBeenCalledWith(120);
  });
});

describe('modo somente leitura do orçamento', () => {
  it('remove controles internos da interação por mouse e teclado de forma semântica', () => {
    const view = render(
      <QuoteEditableSection canEdit={false} label="Itens do orçamento">
        <button type="button">Adicionar produto</button>
        <input aria-label="Quantidade" />
      </QuoteEditableSection>,
    );

    expect(screen.getByRole('group', { name: 'Itens do orçamento' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Adicionar produto' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Quantidade' })).toBeDisabled();

    view.rerender(
      <QuoteEditableSection canEdit label="Itens do orçamento">
        <button type="button">Adicionar produto</button>
      </QuoteEditableSection>,
    );
    expect(screen.getByRole('button', { name: 'Adicionar produto' })).toBeEnabled();
  });
});
