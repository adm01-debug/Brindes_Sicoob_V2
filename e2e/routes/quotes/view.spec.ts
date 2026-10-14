import { buildAuthedRouteSuite } from "../_factories";
import { SAMPLE_ID } from "../_catalog";

const quote = {
  id: SAMPLE_ID,
  quote_number: "Q-E2E-001",
  status: "draft",
  items: [],
  subtotal: 0,
  discount_percent: 0,
  discount_amount: 0,
  total: 0,
  shipping_cost: 0,
  row_version: 1,
  created_at: "2026-01-01T12:00:00.000Z",
  updated_at: "2026-01-01T12:00:00.000Z",
};

buildAuthedRouteSuite({
  name: "/orcamentos/:id (visualização)",
  path: `/orcamentos/${SAMPLE_ID}/visualizar`,
  primary: {
    kind: "rest",
    key: "quotes",
    successBody: quote,
  },
});
