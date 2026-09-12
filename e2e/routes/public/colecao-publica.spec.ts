import { buildPublicTokenSuite } from "../_factories";
import { mockPublicRestResource } from "../_shared";

const collection = {
  id: "c1",
  name: "Coleção E2E",
  description: null,
  icon: null,
  icon_color: null,
  client_name: null,
  share_expires_at: null,
  is_public: true,
};

buildPublicTokenSuite({
  name: "/colecao-publica/:token (coleção pública)",
  buildPath: t => `/colecao-publica/${t}`,
  edgeFnName: "collections-public-react",
  successBody: collection,
  notFoundCopy: /link indisponível|não encontrada|inválido|expirado/i,
  mockLoad: (page, scenario) => mockPublicRestResource(
    page,
    "collections",
    scenario,
    collection,
    { ...collection, share_expires_at: "2000-01-01T00:00:00.000Z" },
  ),
});
