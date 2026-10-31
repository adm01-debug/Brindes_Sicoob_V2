import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type ExpectedRegistration,
  getDocumentCleanupPlan,
  getVerifiedRegistrationState,
  matchesExpectedRegistration,
} from "./registration-state.ts";

const expected: ExpectedRegistration = {
  id: "document-1",
  order_id: "order-1",
  purpose: "invoice_pdf",
  uploaded_by: "actor-1",
  final_path: "order-1/invoices/document-1.pdf",
  quarantine_path: "actor-1/order-1/invoice_pdf/document-1.pdf",
  sha256: "a".repeat(64),
  detected_mime: "application/pdf",
  byte_size: 1234,
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
    matchesExpectedRegistration({
      ...expected,
      purpose: "invoice_xml",
      status: "clean",
    }, expected),
    false,
  );
  assertEquals(
    matchesExpectedRegistration({
      ...expected,
      uploaded_by: "other-actor",
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

Deno.test("registro ausente ou divergente após RPC permanece inconclusivo", () => {
  assertEquals(getVerifiedRegistrationState(null, expected), "unknown");
  assertEquals(
    getVerifiedRegistrationState({
      ...expected,
      status: "clean",
      sha256: "b".repeat(64),
    }, expected),
    "unknown",
  );
});

Deno.test("registro confirmado preserva o arquivo final e limpa a quarentena", () => {
  assertEquals(getDocumentCleanupPlan("confirmed"), {
    removeFinal: false,
    removeQuarantine: true,
  });
});

Deno.test("falha anterior à tentativa de registro permite limpar objetos", () => {
  assertEquals(getDocumentCleanupPlan("not_attempted"), {
    removeFinal: true,
    removeQuarantine: true,
  });
});
