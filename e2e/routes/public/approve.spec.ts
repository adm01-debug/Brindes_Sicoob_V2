import { buildPublicTokenSuite } from "../_factories";
import { mockEdgeFn } from "../_shared";

buildPublicTokenSuite({
  name: "/approve/:token (aprovação pública de orçamento)",
  buildPath: t => `/approve/${t}`,
  edgeFnName: "quote-approval",
  successBody: { quote: { id: "q-1", quote_number: "Q-001", items: [] }, approval: { status: "pending", response: null, responded_at: null }, seller: null },
  successCopy: /Q-001/,
  notFoundCopy: /proposta não encontrada|inválido|expirado/i,
  mockLoad: async (page, scenario) => {
    if (["notFound", "expired", "invalidPayload"].includes(scenario)) {
      await mockEdgeFn(page, "quote-approval", 200, { quote: null });
      return;
    }
    if (scenario === "timeout") {
      await mockEdgeFn(page, "quote-approval", 504, {}, { delayMs: 6000 });
      return;
    }
    if (scenario === "serviceUnavailable") {
      await mockEdgeFn(page, "quote-approval", 503, { error: "Serviço indisponível" });
      return;
    }
    await mockEdgeFn(page, "quote-approval", 200, {
      quote: { id: "q-1", quote_number: "Q-001", items: [] },
      approval: { status: "pending", response: null, responded_at: null },
      seller: null,
    });
  },
});
