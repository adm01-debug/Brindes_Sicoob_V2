/**
 * O catálogo externo é somente leitura **imposta por código**
 * (`AGENTS.md`: "NÃO escrever no catálogo externo doufsxqlfjyuvxuezpln").
 *
 * `tests/scenarios/catalogo-somente-leitura.mjs` cobre o TRANSPORTE:
 * `createReadOnlyCatalogFetch` recusa POST/PUT/PATCH/DELETE e exige GET. Falta
 * a camada de cima — a integração com `supabase-js`. RPC no PostgREST é POST
 * por padrão; só com `{ get: true }` o cliente emite GET e serializa os
 * parâmetros na query string. Sem catraca aqui, uma troca de versão do
 * cliente, ou um `get: true` esquecido numa chamada nova, faz o transporte
 * barrar com CATALOG_READ_ONLY e o catálogo parar — e o teste de transporte
 * continua verde, porque ele nunca passa pelo `supabase-js`.
 *
 * Recuperado de `tests/edge-functions/catalog-readonly-rpc.test.ts`, que ficou
 * em `fix/quote-price-authority-311333` (PR #175, fechada sem merge).
 */
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createReadOnlyCatalogFetch } from '../../supabase/functions/_shared/external-read-only';

const CATALOGO = 'https://doufsxqlfjyuvxuezpln.supabase.co';

function clienteDeCatalogo() {
  const requisicoes: Request[] = [];
  const transporte = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const requisicao = input instanceof Request ? input : new Request(input, init);
    requisicoes.push(requisicao);
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const catalogo = createClient(CATALOGO, 'chave-publicavel-de-teste', {
    global: { fetch: createReadOnlyCatalogFetch(transporte) },
  });
  return { catalogo, requisicoes, transporte };
}

describe('RPC do catálogo passa pelo supabase-js sem virar POST', () => {
  it('com { get: true } o cliente emite GET e põe o parâmetro na query string', async () => {
    const { catalogo, requisicoes } = clienteDeCatalogo();

    const resultado = await catalogo.rpc(
      'fn_get_product_customization_options',
      { p_product_id: 'produto-teste' },
      { get: true },
    );

    expect(resultado.error).toBeNull();
    expect(requisicoes).toHaveLength(1);
    expect(requisicoes[0]?.method).toBe('GET');
    expect(new URL(requisicoes[0]?.url ?? '').searchParams.get('p_product_id')).toBe('produto-teste');
  });

  it('sem { get: true } o cliente emite POST e o transporte barra — é a regressão que isto trava', async () => {
    const { catalogo, requisicoes } = clienteDeCatalogo();

    // O `supabase-js` não propaga a exceção do fetch: ele a captura e devolve
    // em `error`. Então a falha chega como dado, não como throw — e por isso
    // uma chamada sem `get: true` quebraria em produção EM SILÊNCIO para quem
    // só olha o happy path.
    const resultado = await catalogo.rpc('fn_get_customization_price', {
      p_product_id: 'produto-teste',
    });

    expect(resultado.data).toBeNull();
    expect(String(resultado.error?.details ?? resultado.error?.message)).toMatch(/CATALOG_READ_ONLY/);
    expect(requisicoes).toHaveLength(0); // barrado antes de sair
  });
});
