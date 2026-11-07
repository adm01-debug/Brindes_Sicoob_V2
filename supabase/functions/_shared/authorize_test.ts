import { authorize } from "./authorize.ts";

Deno.test("JWT malformado é rejeitado sem chamada ao Auth remoto", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = () => {
    fetchCalls += 1;
    return Promise.reject(
      new Error("A validação local não deve chamar a rede"),
    );
  };

  try {
    const result = await authorize(
      new Request("https://local.test", {
        headers: { Authorization: "Bearer invalid.jwt.token" },
      }),
    );

    if (result.ok) throw new Error("Esperava rejeição de token malformado");
    if (!result.ok) {
      if (result.response.status !== 401) {
        throw new Error(`Esperava HTTP 401, recebi ${result.response.status}`);
      }
      const body = await result.response.json();
      if (body.error !== "invalid_token") {
        throw new Error("O código de erro da resposta não corresponde");
      }
      if (body.message !== "Token is invalid or expired") {
        throw new Error("A mensagem da resposta não corresponde");
      }
    }
    if (fetchCalls !== 0) {
      throw new Error(`Esperava zero chamadas de rede, recebi ${fetchCalls}`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
