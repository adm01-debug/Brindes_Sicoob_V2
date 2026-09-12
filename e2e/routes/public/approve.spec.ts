import { buildPublicTokenSuite } from "../_factories";

buildPublicTokenSuite({
  name: "/approve/:token (aprovação pública de orçamento)",
  buildPath: t => `/approve/${t}`,
  edgeFnName: "quote-public-view",
  successBody: { quote: { id: "q-1", quote_number: "Q-001", items: [] }, seller: null, token: {} },
  notFoundCopy: /proposta não encontrada|inválido|expirado/i,
});
