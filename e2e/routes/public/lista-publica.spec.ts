import { buildPublicTokenSuite } from "../_factories";
import { mockPublicRpcResource, mockRestTable } from "../_shared";

const list = {
  id: "list1",
  name: "Lista E2E",
  description: null,
  color: "#0B8F48",
  shared_expires_at: null,
};

buildPublicTokenSuite({
  name: "/lista-publica/:token (favoritos público)",
  buildPath: t => `/lista-publica/${t}`,
  edgeFnName: "favorites-public-react",
  successBody: list,
  successCopy: /Lista E2E/,
  notFoundCopy: /lista não encontrada|inválido|expirado/i,
  mockLoad: async (page, scenario) => {
    await mockRestTable(page, "rpc/get_public_favorite_reactions", 200, []);
    await mockPublicRpcResource(
      page,
      "get_public_favorite_list",
      scenario,
      { list, items: [] },
    );
  },
});
