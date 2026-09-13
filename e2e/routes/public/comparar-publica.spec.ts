import { buildPublicTokenSuite } from "../_factories";
import { mockPublicRestResource } from "../_shared";

const comparison = {
  id: "cmp1",
  client_name: "Cooperativa E2E",
  share_expires_at: null,
  is_public: true,
  items: [],
};

buildPublicTokenSuite({
  name: "/comparar-publica/:token (comparador público)",
  buildPath: t => `/comparar-publica/${t}`,
  edgeFnName: "comparisons-public-react",
  successBody: comparison,
  successCopy: /Cooperativa E2E/,
  notFoundCopy: /link indisponível|não encontrada|inválido|expirado/i,
  mockLoad: (page, scenario) => mockPublicRestResource(
    page,
    "user_comparisons",
    scenario,
    comparison,
    { ...comparison, share_expires_at: "2000-01-01T00:00:00.000Z" },
  ),
});
