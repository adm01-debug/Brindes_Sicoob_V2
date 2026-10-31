import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type ExpectedRegistration,
  getDocumentCleanupPlan,
  matchesExpectedRegistration,
} from "./registration-state.ts";

const expected: ExpectedRegistration = {
  id: "document-1",
  final_path: "order-1/invoices/document-1.pdf",
  quarantine_path: "actor-1/order-1/invoice_pdf/document-1.pdf",
  sha256: "a".repeat(64),
};

Deno.test("a correspondência exige id, caminhos, hash e estado limpo", () => {
  assertEquals(
    matchesExpectedRegistration({ ...expected, status: "clean" }, expected),
    true,
  );
  assertEquals(
    matchesExpectedRegistration({
      ...expected,
      final_path: "other",
      status: "clean",
    }, expected),
    false,
  );
  assertEquals(
    matchesExpectedRegistration({ ...expected, status: "pending" }, expected),
    false,
  );
});

Deno.test("resultado ambíguo preserva os dois objetos para reconciliação", () => {
  assertEquals(getDocumentCleanupPlan("unknown"), {
    removeFinal: false,
    removeQuarantine: false,
  });
});

Deno.test("registro confirmado preserva o arquivo final e limpa a quarentena", () => {
  assertEquals(getDocumentCleanupPlan("confirmed"), {
    removeFinal: false,
    removeQuarantine: true,
  });
});

Deno.test("falha anterior ao registro ou rejeição confirmada permite limpar objetos", () => {
  assertEquals(getDocumentCleanupPlan("not_attempted"), {
    removeFinal: true,
    removeQuarantine: true,
  });
  assertEquals(getDocumentCleanupPlan("rejected"), {
    removeFinal: true,
    removeQuarantine: true,
  });
});
