/**
 * Comportamento da leitura do corpo em `sicoob-kit-quote`, que hospeda o atesto
 * de preço. O desvio já usou `req.clone()`: um clone divide o corpo em dois
 * ramos do mesmo stream, e cancelar um ramo passa a depender do outro — num
 * corpo acima do limite **sem `Content-Length`** a inspeção e o fluxo de kit
 * podiam ficar esperando um ao outro, sem resposta até o timeout.
 *
 * Aqui o desenho é exercitado de verdade (sem Deno): uma leitura única do corpo
 * original, com limite, e remontagem do pedido para quem vai atender.
 */
import { describe, expect, it } from 'vitest';
import { readBoundedBody } from '../../supabase/functions/quote-price-attestation/contract.ts';

const LIMITE = 524_288;

function corpoEmStream(texto: string): ReadableStream<Uint8Array> {
  let enviado = false;
  return new ReadableStream({
    pull(controller) {
      if (enviado) {
        controller.close();
        return;
      }
      enviado = true;
      controller.enqueue(new TextEncoder().encode(texto));
    },
  });
}

/** Pedido sem `Content-Length`, como o de um cliente que envia em stream. */
function pedidoSemTamanho(texto: string): Request {
  return new Request('http://local/sicoob-kit-quote', {
    method: 'POST',
    headers: { authorization: 'Bearer token-de-teste' },
    body: corpoEmStream(texto),
    // @ts-expect-error duplex é exigido pelo runtime para corpo em stream
    duplex: 'half',
  });
}

/** Mesma remontagem do `sicoob-kit-quote/index.ts`. */
function remontarComCorpo(req: Request, bruto: string): Request {
  const headers = new Headers(req.headers);
  headers.delete('content-length');
  return new Request(req.url, { method: req.method, headers, body: bruto });
}

const comPrazo = <T>(promessa: Promise<T>, ms = 4_000) =>
  Promise.race([promessa, new Promise<'TRAVOU'>((r) => setTimeout(() => r('TRAVOU'), ms))]);

describe('leitura do corpo na hospedeira do atesto', () => {
  it('corpo acima do limite SEM content-length responde, não trava', async () => {
    const pedido = pedidoSemTamanho('y'.repeat(600 * 1024));
    expect(pedido.headers.get('content-length')).toBeNull();

    const lido = await comPrazo(readBoundedBody(pedido, LIMITE));

    expect(lido).not.toBe('TRAVOU');
    expect(lido).toBeNull();
  });

  it('o pedido remontado preserva a autorização e pode ser lido de novo', async () => {
    const enviado = JSON.stringify({ op: 'price-attestation', quoteId: 'q1' });
    const pedido = pedidoSemTamanho(enviado);

    const bruto = await readBoundedBody(pedido, LIMITE);
    expect(bruto).toBe(enviado);

    const remontado = remontarComCorpo(pedido, bruto as string);
    expect(remontado.headers.get('authorization')).toBe('Bearer token-de-teste');
    expect(remontado.method).toBe('POST');

    // É isto que o handler do atesto faz com o pedido que recebe.
    const relido = await comPrazo(readBoundedBody(remontado, LIMITE));
    expect(relido).toBe(enviado);
  });

  it('corpo dentro do limite continua passando', async () => {
    const enviado = JSON.stringify({ kitName: 'Kit A', kitType: 'montado' });
    const pedido = new Request('http://local/sicoob-kit-quote', { method: 'POST', body: enviado });

    await expect(readBoundedBody(pedido, LIMITE)).resolves.toBe(enviado);
  });

  it('content-length mentindo acima do limite é recusado sem ler o corpo', async () => {
    const pedido = new Request('http://local/sicoob-kit-quote', {
      method: 'POST',
      headers: { 'content-length': String(LIMITE + 1) },
      body: 'curto',
    });

    await expect(readBoundedBody(pedido, LIMITE)).resolves.toBeNull();
  });
});
