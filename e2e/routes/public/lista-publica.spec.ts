import { buildPublicTokenSuite, type PublicTokenScenario } from "../_factories";
import type { Page } from "@playwright/test";
import { mockRestTable } from "../_shared";

const list = {
  id: "list1",
  name: "Lista E2E",
  description: null,
  color: "#0B8F48",
  shared_expires_at: null,
};

/**
 * A página consome a lista pública via RPC (get_public_favorite_list),
 * não mais via REST direto nas tabelas favorite_lists/favorite_items.
 */
async function mockPublicFavoriteListRpc(page: Page, scenario: PublicTokenScenario) {
  const status =
    scenario === "invalidPayload" ? 400
    : scenario === "timeout" ? 504
    : scenario === "serviceUnavailable" ? 503
    : 200;
  const delayMs = scenario === "timeout" ? 6000 : undefined;
  const body =
    scenario === "success"
      ? { list, items: [] }
      : scenario === "notFound" || scenario === "expired"
        ? null
        : scenario === "invalidPayload"
          ? { message: "Requisição inválida" }
          : scenario === "timeout"
            ? {}
            : { message: "Serviço indisponível" };
  await mockRestTable(page, "rpc/get_public_favorite_list", status, body, { delayMs });
}

buildPublicTokenSuite({
  name: "/lista-publica/:token (favoritos público)",
  buildPath: t => `/lista-publica/${t}`,
  edgeFnName: "favorites-public-react",
  successBody: { list, items: [] },
  successCopy: /Lista E2E/,
  notFoundCopy: /lista não encontrada|inválido|expirado/i,
  mockLoad: mockPublicFavoriteListRpc,
});