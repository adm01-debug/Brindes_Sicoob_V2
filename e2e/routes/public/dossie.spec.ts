import { buildPublicTokenSuite } from "../_factories";

buildPublicTokenSuite({
  name: "/dossie/:token (dossiê BI público)",
  buildPath: t => `/dossie/${t}`,
  edgeFnName: "bi-share-dossier",
  successBody: {
    valid: true,
    payload: { clientId: "c1", clientName: "Cooperativa E2E", ramoAtividade: null, sellerId: "s1", iat: 1, exp: 4_102_444_800 },
  },
  notFoundCopy: /link inválido|expirado/i,
});
