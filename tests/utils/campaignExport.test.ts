import { describe, expect, it } from 'vitest';
import { campaignRowsToCsv } from '@/utils/campaignExport';

describe('campaignRowsToCsv', () => {
  it('preserva vírgulas, aspas e quebras de linha em campos de campanha', () => {
    const csv = campaignRowsToCsv([
      {
        Nome: 'Campanha "Coop, 2026"',
        'Público-Alvo': 'Gerentes\ne cooperados',
        Orçamento: 1250,
      },
    ]);

    expect(csv).toBe(
      '\uFEFF"Nome","Público-Alvo","Orçamento"\r\n"Campanha ""Coop, 2026""","Gerentes\ne cooperados","1250"',
    );
  });

  it('gera um arquivo UTF-8 válido mesmo sem campanhas', () => {
    expect(campaignRowsToCsv([])).toBe('\uFEFF');
  });
});
