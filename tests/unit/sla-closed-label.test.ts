import { describe, expect, it } from 'vitest';
import { slaClosedLabel } from '@/pages/sicoob/orders/OrderDetailPage';

const DESFECHOS = ['approved', 'rejected', 'cancelled', 'escalated'];
const base = {
  sla_closed_status: 'normal',
  sla_closed_at: '2026-03-10T12:00:00.000Z',
  sla_deadline: '2026-03-10T10:00:00.000Z',
};

const esperadoNoPrazo: Record<string, string> = {
  approved: 'Aprovado no limite do prazo',
  rejected: 'Recusado no limite do prazo',
  cancelled: 'Cancelado no limite do prazo',
  escalated: 'Escalado no limite do prazo',
};

const esperadoComAtraso: Record<string, string> = {
  approved: 'Aprovado com 2 h de atraso',
  rejected: 'Recusado com 2 h de atraso',
  cancelled: 'Cancelado com 2 h de atraso',
  escalated: 'Escalado com 2 h de atraso',
};

describe('slaClosedLabel', () => {
  it('descreve o fechamento de cada desfecho dentro do prazo', () => {
    for (const outcome of DESFECHOS) {
      expect(slaClosedLabel({ ...base, sla_closed_outcome: outcome }))
        .toBe(esperadoNoPrazo[outcome]);
    }
  });

  it('descreve o fechamento critico com as horas de atraso', () => {
    for (const outcome of DESFECHOS) {
      expect(slaClosedLabel({ ...base, sla_closed_status: 'critical', sla_closed_outcome: outcome }))
        .toBe(esperadoComAtraso[outcome]);
    }
  });

  it('trata desfecho ausente ou desconhecido como aprovado', () => {
    const semDesfecho = { ...base, sla_closed_at: base.sla_closed_at };
    expect(slaClosedLabel(semDesfecho)).toBe('Aprovado no limite do prazo');
    expect(slaClosedLabel({ ...semDesfecho, sla_closed_outcome: 'outro' }))
      .toBe('Aprovado no limite do prazo');
    expect(slaClosedLabel({ ...semDesfecho, sla_closed_status: 'critical', sla_closed_outcome: 'outro' }))
      .toBe('Aprovado com 2 h de atraso');
  });

  it('nao busca desfecho no prototype do Object', () => {
    for (const herdado of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      expect(slaClosedLabel({ ...base, sla_closed_outcome: herdado }))
        .toBe('Aprovado no limite do prazo');
    }
  });

  it('rotula como no prazo o status real exibido na tela', () => {
    for (const status of ['normal', 'warning'] as const) {
      expect(slaClosedLabel({ ...base, sla_closed_status: status, sla_closed_outcome: 'approved' }))
        .toBe('Aprovado no limite do prazo');
    }
  });

  it('aplica atraso minimo de 1h e usa o fechamento quando falta o prazo', () => {
    // Fechou no prazo exato (0h) em status critico: o rotulo mostra 1h.
    expect(slaClosedLabel({
      sla_closed_status: 'critical',
      sla_closed_outcome: 'approved',
      sla_closed_at: '2026-03-10T10:00:00.000Z',
      sla_deadline: '2026-03-10T10:00:00.000Z',
    })).toBe('Aprovado com 1 h de atraso');
    // Sem `sla_deadline`, o prazo e o proprio fechamento: mesmo resultado.
    expect(slaClosedLabel({
      sla_closed_status: 'critical',
      sla_closed_outcome: 'rejected',
      sla_closed_at: '2026-03-10T10:00:00.000Z',
    })).toBe('Recusado com 1 h de atraso');
  });

  it('nao rotula quando a data de fechamento e invalida ou ausente', () => {
    expect(slaClosedLabel({ sla_closed_status: 'normal', sla_closed_outcome: 'approved' })).toBeNull();
    expect(slaClosedLabel({ ...base, sla_closed_at: 'data-invalida' })).toBeNull();
  });
});
