import { buildPublicTokenSuite } from "../_factories";

buildPublicTokenSuite({
  name: "/approve/:token (aprovação pública de orçamento)",
  buildPath: t => `/approve/${t}`,
  edgeFnName: "quote-approval",
  successBody: { quote: { id: "q-1", quote_number: "Q-001", items: [] }, approval: { status: "pending", response: null, responded_at: null }, seller: null },
  successCopy: /Q-001/,
  notFoundCopy: /proposta não encontrada|inválido|expirado/i,
});
