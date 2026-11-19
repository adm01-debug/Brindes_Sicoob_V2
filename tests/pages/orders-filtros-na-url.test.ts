/**
 * Leitura e escrita dos filtros de pedidos na querystring.
 *
 * Recuperado da PR #100 (`devin/1791190000-ux-onda1`), fechada sem merge: a
 * `main` nunca recebeu esta parte. Sem ela o vendedor perde busca, status,
 * empresa, período e página toda vez que abre um pedido e volta.
 *
 * Os dois casos que justificam o código, e que um `new Date`/`Number()` ingênuo
 * erraria em silêncio:
 *   - data lida como dia LOCAL, não UTC (fuso negativo andaria um dia);
 *   - `pagina` só inteiro positivo finito (o resto chega ao `range()` do
 *     PostgREST e a listagem aparece vazia, sem erro).
 */
import { describe, expect, it } from 'vitest';
import { filtersFromSearchParams, filtersToSearchParams } from '@/pages/OrdersPage';

const ler = (query: string) => filtersFromSearchParams(new URLSearchParams(query));

describe('filtros de pedidos na URL', () => {
  it('lê busca, status, empresa e página', () => {
    const filtros = ler('q=nota&status=shipped&empresa=Acme&pagina=3');

    expect(filtros).toMatchObject({
      search: 'nota',
      status: 'shipped',
      clientCompany: 'Acme',
      page: 3,
    });
  });

  it('sem query, devolve o padrão e a primeira página', () => {
    expect(ler('')).toMatchObject({ search: '', status: 'all', clientCompany: '', page: 1 });
    expect(ler('').dateRange).toBeUndefined();
  });

  /**
   * ATENÇÃO, limite conhecido: este caso só discrimina em fuso NEGATIVO.
   * Trocar `parseISO` por `new Date` o derruba sob `TZ=America/Sao_Paulo`
   * (verificado), mas passa em UTC, que é o fuso do runner da CI — lá as duas
   * implementações coincidem. Ou seja, a CI não protege esta regra hoje; quem
   * roda a suíte no fuso do time, sim.
   */
  it('data é lida como dia local — fuso negativo não pode andar um dia', () => {
    const { dateRange } = ler('de=2026-11-19');

    expect(dateRange?.from?.getFullYear()).toBe(2026);
    // getMonth é base zero: 10 = novembro.
    expect(dateRange?.from?.getMonth()).toBe(10);
    expect(dateRange?.from?.getDate()).toBe(19);
  });

  it('data inválida é descartada em vez de virar Invalid Date', () => {
    expect(ler('de=19/11/2026').dateRange).toBeUndefined();
    expect(ler('de=sem-data').dateRange).toBeUndefined();
  });

  for (const pagina of ['1.5', 'Infinity', '-2', '0', 'abc', '']) {
    it(`pagina=${pagina || '(vazia)'} cai para 1, não vaza para o range() do PostgREST`, () => {
      expect(ler(`pagina=${pagina}`).page).toBe(1);
    });
  }

  it('escreve só o que difere do padrão', () => {
    const query = filtersToSearchParams({
      search: '',
      status: 'all',
      clientCompany: '',
      dateRange: undefined,
      page: 1,
    }).toString();

    expect(query).toBe('');
  });

  it('ida e volta preserva o filtro inteiro', () => {
    const original = 'q=nota&status=shipped&empresa=Acme&de=2026-11-01&ate=2026-11-19&pagina=4';

    expect(filtersToSearchParams(ler(original)).toString()).toBe(
      new URLSearchParams(original).toString(),
    );
  });
});
