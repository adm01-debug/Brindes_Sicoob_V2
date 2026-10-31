import { decodeLimitedBody, readLimitedBody } from "./read-limited-body.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("lê corpo até o limite sem marcar truncamento", async () => {
  const result = await readLimitedBody(new Response("abc").body, 3);

  assert(
    decodeLimitedBody(result) === "abc",
    "deve preservar o corpo dentro do limite",
  );
  assert(!result.truncated, "não deve marcar corpo completo como truncado");
});

Deno.test("limita bytes mesmo sem Content-Length e cancela o restante", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("abcdef"));
    },
    cancel() {
      cancelled = true;
    },
  });

  const result = await readLimitedBody(body, 4);

  assert(
    decodeLimitedBody(result) === "abcd",
    "deve reter apenas os bytes permitidos",
  );
  assert(result.truncated, "deve indicar que há bytes adicionais");
  assert(cancelled, "deve cancelar a leitura do restante");
});

Deno.test("conta o limite em bytes para texto multibyte", async () => {
  const result = await readLimitedBody(new Response("é").body, 1);

  assert(result.bytes.byteLength === 1, "o limite deve ser medido em bytes");
  assert(result.truncated, "deve detectar truncamento de caracteres multibyte");
});

Deno.test("aceita body nulo e rejeita limites inválidos", async () => {
  const empty = await readLimitedBody(null, 0);
  assert(
    empty.bytes.byteLength === 0 && !empty.truncated,
    "body nulo deve ser vazio",
  );
  let invalidLimitRejected = false;
  try {
    await readLimitedBody(null, -1);
  } catch (error) {
    invalidLimitRejected = error instanceof RangeError;
  }
  assert(invalidLimitRejected, "limites negativos devem ser rejeitados");
});
