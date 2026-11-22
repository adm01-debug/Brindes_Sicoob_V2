import { describe, expect, it } from 'vitest';
import { buildTogglePatch } from '@/hooks/useScheduledReports';

const NOW = '2026-11-22T18:00:00.000Z';

describe('buildTogglePatch', () => {
  it('reativar envia o e-mail atual no payload', () => {
    // O teste antigo só procurava a atribuição no código-fonte: ele passava
    // mesmo se o e-mail nunca chegasse ao banco. Este verifica o payload que a
    // chamada realmente envia.
    expect(buildTogglePatch(true, 'novo@exemplo.com', NOW)).toEqual({
      is_active: true,
      updated_at: NOW,
      email_to: 'novo@exemplo.com',
    });
  });

  it('pausar não mexe no destinatário', () => {
    // Pausar não deve tocar `email_to`: o trigger exige que ele case com o
    // perfil, e escrever e-mail desatualizado levantaria exceção.
    expect(buildTogglePatch(false, 'novo@exemplo.com', NOW)).toEqual({
      is_active: false,
      updated_at: NOW,
    });
  });

  it('sem e-mail conhecido reativa sem enviar a coluna', () => {
    expect(buildTogglePatch(true, undefined, NOW)).toEqual({
      is_active: true,
      updated_at: NOW,
    });
    expect(buildTogglePatch(true, '', NOW)).toEqual({
      is_active: true,
      updated_at: NOW,
    });
  });
});
