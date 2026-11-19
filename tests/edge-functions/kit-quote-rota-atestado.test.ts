/**
 * O atesto de preço é servido por `sicoob-kit-quote` enquanto o projeto Supabase
 * estiver no teto de edge functions do plano. Estes testes travam o contrato da
 * rota: o desvio só acontece com `op: "price-attestation"`, não consome o corpo
 * do fluxo de kit, e a hospedagem está declarada no front.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROTA_ATESTADO_DE_PRECO } from '@/services/QuoteService';

const ROOT = resolve(__dirname, '../..');
const kitQuote = readFileSync(resolve(ROOT, 'supabase/functions/sicoob-kit-quote/index.ts'), 'utf8');
const atestadoHandler = readFileSync(resolve(ROOT, 'supabase/functions/quote-price-attestation/handler.ts'), 'utf8');
const atestadoEntrada = readFileSync(resolve(ROOT, 'supabase/functions/quote-price-attestation/index.ts'), 'utf8');
const quoteService = readFileSync(resolve(ROOT, 'src/services/QuoteService.ts'), 'utf8');

describe('rota do atesto de preço dentro de sicoob-kit-quote', () => {
  it('o front chama a função que realmente hospeda o atesto', () => {
    expect(ROTA_ATESTADO_DE_PRECO).toBe('sicoob-kit-quote');
    expect(quoteService).toContain("op: 'price-attestation'");
  });

  it('o handler do atesto é exportado, para poder ser servido dos dois lugares', () => {
    expect(atestadoHandler).toContain('export async function handleQuotePriceAttestation');
  });

  it('o módulo importado pela hospedeira NÃO sobe servidor', () => {
    // Regressão: o handler morava no `index.ts`, que chama `Deno.serve` no topo.
    // Importá-lo de `sicoob-kit-quote` subia DOIS servidores no mesmo processo,
    // disputando o listener padrão — nem o atesto nem o kit subiam.
    expect(atestadoHandler).not.toContain('Deno.serve');
    expect(kitQuote).toContain("from '../quote-price-attestation/handler.ts'");
    expect(kitQuote).not.toContain("from '../quote-price-attestation/index.ts'");
  });

  it('cada ponto de entrada tem exatamente um Deno.serve', () => {
    const conta = (fonte: string) => fonte.match(/Deno\.serve\(/g)?.length ?? 0;
    expect(conta(atestadoEntrada)).toBe(1);
    expect(conta(kitQuote)).toBe(1);
    // A função original segue publicável: quando houver vaga, nada muda nela.
    expect(atestadoEntrada).toContain("Deno.serve(withStructuredLogging('quote-price-attestation', handleQuotePriceAttestation))");
    expect(atestadoEntrada).toContain("from './handler.ts'");
  });

  it('o desvio acontece antes de qualquer trabalho de kit', () => {
    const posDesvio = kitQuote.indexOf('desviarParaAtestadoDePreco(req)');
    const posTrabalhoDeKit = kitQuote.indexOf("Deno.env.get('SUPABASE_URL')");
    expect(posDesvio).toBeGreaterThan(0);
    expect(posTrabalhoDeKit).toBeGreaterThan(posDesvio);
  });

  it('o corpo é lido de um clone, para o handler do atesto poder lê-lo de novo', () => {
    expect(kitQuote).toContain('req.clone()');
    expect(kitQuote).toContain('return await handleQuotePriceAttestation(req)');
  });

  it('a inspeção do corpo é limitada, não só conferida pelo Content-Length', () => {
    // Conferir só o cabeçalho deixaria passar requisição SEM `Content-Length`,
    // que seria bufferizada inteira antes de qualquer autenticação.
    expect(kitQuote).toContain('readBoundedBody(req.clone(), LIMITE_CORPO_ATESTADO)');
    expect(kitQuote).not.toContain('req.clone().json()');
  });

  it('hospedeira e hóspede têm a MESMA autorização — hospedar não pode afrouxar o acesso', () => {
    const manifesto = readFileSync(
      resolve(ROOT, 'supabase/functions/_shared/edge-authz-manifest.ts'),
      'utf8',
    );
    const entrada = (nome: string) => {
      const inicio = manifesto.indexOf(`"${nome}": {`);
      expect(inicio).toBeGreaterThan(0);
      const bloco = manifesto.slice(inicio, manifesto.indexOf('},', inicio));
      const campo = (chave: string) => bloco.match(new RegExp(`${chave}:\\s*([^,\n]+)`))?.[1]?.trim();
      return { category: campo('category'), enforcedBy: campo('enforcedBy'), jwt: campo('gatewayVerifyJwt') };
    };

    const hospedeira = entrada('sicoob-kit-quote');
    const hospede = entrada('quote-price-attestation');

    expect(hospedeira).toEqual(hospede);
    expect(hospedeira.category).toBe('"authenticated"');
    expect(hospedeira.jwt).toBe('true');
  });

  it('sem o marcador op, o fluxo de kit segue intocado', () => {
    const trecho = kitQuote.slice(
      kitQuote.indexOf('async function desviarParaAtestadoDePreco'),
      kitQuote.indexOf('Deno.serve(withStructuredLogging("sicoob-kit-quote"'),
    );
    expect(trecho).toContain("!== 'price-attestation') return null");
  });
});
