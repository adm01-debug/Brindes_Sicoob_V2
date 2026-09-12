import { buildPublicTokenSuite } from "../_factories";
buildPublicTokenSuite({
  name: "/kit/:token",
  buildPath: (t) => `/kit/${t}`,
  edgeFnName: "kit-public-view",
  successBody: {
    kit: { name: "[E2E] Kit Demo", kit_type: "simples", kit_quantity: 1, volume_usage_percent: 0, box: null, items: [] },
    seller: null,
    organization: null,
    token: { id: "t1", client_name: null },
  },
  successCopy: /\[E2E\] Kit Demo/,
  notFoundCopy: /link indisponível|inválido|expirado/i,
});
