import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildCompanySearchOr } from "./search-query.ts";

Deno.test("buildCompanySearchOr: monta busca por nome, CNPJ e cidade", () => {
  assertEquals(
    buildCompanySearchOr(["title", "razao_social", "cnpj", "cidade"], "Sicoob DF"),
    'title.ilike."%Sicoob DF%",razao_social.ilike."%Sicoob DF%",cnpj.ilike."%Sicoob DF%",cidade.ilike."%Sicoob DF%"',
  );
});

Deno.test("buildCompanySearchOr: escapa caracteres do filtro em vez de aceitar cláusulas PostgREST", () => {
  assertEquals(
    buildCompanySearchOr(["razao_social"], 'A%_,"),cnpj.eq.*'),
    'razao_social.ilike."%A\\%\\_,\\\"),cnpj.eq.*%"',
  );
});

Deno.test("buildCompanySearchOr: rejeita nomes de coluna fora da allow-list", () => {
  assertThrows(() => buildCompanySearchOr(["razao_social", "email"], "teste"), Error, "Unsupported CRM search");
});
