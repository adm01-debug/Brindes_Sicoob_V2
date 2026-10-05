import { buildAuthedRouteSuite } from "../_factories";
import { mockRestTable } from "../_shared";

const quote = {
  id: "q-001",
  quote_number: "Q-E2E-001",
  status: "draft",
  subtotal: 0,
  discount_percent: 0,
  discount_amount: 0,
  total: 0,
  negotiation_markup_percent: 0,
  shipping_cost: 0,
  row_version: 1,
  created_at: "2026-01-01T12:00:00.000Z",
  updated_at: "2026-01-01T12:00:00.000Z",
};

buildAuthedRouteSuite({
  name: "/orcamentos/:id/editar",
  path: "/orcamentos/q-001/editar",
  primary: {
    kind: "rest",
    key: "quotes",
    successBodyForRequest: request => request.headers()["accept"]?.includes("application/vnd.pgrst.object+json")
      ? quote
      : [quote],
  },
  setupSuccessMocks: async page => {
    await mockRestTable(page, "quote_items", 200, []);
    await mockRestTable(page, "quote_templates", 200, []);
  },
});
