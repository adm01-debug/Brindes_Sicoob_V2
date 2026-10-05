import { buildAuthedRouteSuite } from "../_factories";
import { mockRestTable } from "../_shared";
import { SAMPLE_ID } from "../_catalog";

buildAuthedRouteSuite({
  name: "/pedidos/:id",
  path: `/pedidos/${SAMPLE_ID}`,
  primary: {
    kind: "rest",
    key: "orders",
    successBody: {
      id: SAMPLE_ID,
      order_number: "PED-E2E-001",
      status: "rascunho",
      fulfillment_status: "pending",
      total: 0,
      subtotal: 0,
      discount_amount: 0,
      shipping_cost: 0,
      shipping_type: null,
      tracking_number: null,
      delivery_time: null,
      payment_terms: null,
      client_id: null,
      client_name: "Cliente E2E",
      client_company: "Cooperativa E2E",
      client_email: "e2e@example.com",
      client_phone: null,
      notes: null,
      internal_notes: null,
      quote_id: null,
      seller_id: "e2e-user-id",
      organization_id: null,
      created_at: "2026-01-01T12:00:00.000Z",
      updated_at: "2026-01-01T12:00:00.000Z",
    },
  },
  setupSuccessMocks: async page => {
    await mockRestTable(page, "order_items", 200, []);
    await mockRestTable(page, "order_approval_history", 200, []);
  },
});
