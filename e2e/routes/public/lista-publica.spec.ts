import { buildPublicTokenSuite } from "../_factories";
import { mockPublicRestResource, mockRestTable } from "../_shared";

const list = {
  id: "list1",
  name: "Lista E2E",
  description: null,
  color: "#0B8F48",
  shared_expires_at: null,
  user_id: "user1",
};

buildPublicTokenSuite({
  name: "/lista-publica/:token (favoritos público)",
  buildPath: t => `/lista-publica/${t}`,
  edgeFnName: "favorites-public-react",
  successBody: list,
  notFoundCopy: /lista não encontrada|inválido|expirado/i,
  mockLoad: async (page, scenario) => {
    await mockRestTable(page, "favorite_items", 200, []);
    await mockPublicRestResource(
      page,
      "favorite_lists",
      scenario,
      list,
      { ...list, shared_expires_at: "2000-01-01T00:00:00.000Z" },
    );
  },
});
