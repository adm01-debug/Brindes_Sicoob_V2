/**
 * Fixtures de QA por Papel
 * Baseado no CHECKLIST_EXECUCAO_PREVIEW_POR_PAPEL.md
 */

export const QA_CONFIG = {
  PASSWORD: "Qa@Test2026",
  BASE_SINGULAR_ID: "00000000-0000-0000-0000-0000000000c1",
  BASE_PA_ID: "00000000-0000-0000-0000-0000000000b1",
};

export const FIXTURES_GERENTE_PA = {
  id: "00000000-0000-0000-0000-0000000000a1",
  email: "qa+gerente@sicoob.test",
  pa_id: QA_CONFIG.BASE_PA_ID,
  cooperativa_id: QA_CONFIG.BASE_SINGULAR_ID,
  budget_total: 50000,
  alcada_limite: 5000,
  initial_verba_consumida: 0,
};

export const FIXTURES_GESTOR_COMPRAS = {
  id: "00000000-0000-0000-0000-0000000000a2",
  email: "qa+gestor@sicoob.test",
  singular_id: QA_CONFIG.BASE_SINGULAR_ID,
  alcada_limite: 100000,
};

export const FIXTURES_VENDEDOR = {
  id: "00000000-0000-0000-0000-0000000000a3",
  email: "qa+vendedor@sicoob.test",
};

export const FIXTURES_ADMIN = {
  id: "00000000-0000-0000-0000-0000000000a4",
  email: "qa+admin@sicoob.test",
};

export const QA_PASSWORD = QA_CONFIG.PASSWORD;

export const SCENARIOS = {
  CONSOLIDACAO: "consolidacao",
  ALCADA_GESTOR: "alcada-gestor",
  RLS_CROSS: "rls-cross",
  PILOTO: "piloto",
};

