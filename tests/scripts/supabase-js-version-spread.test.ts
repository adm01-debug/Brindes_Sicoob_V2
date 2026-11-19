/**
 * Catraca: o espalhamento de versões do supabase-js nas edge functions só encolhe.
 *
 * Hoje 83 funções importam `@supabase/supabase-js` em CINCO versões diferentes
 * (2.42.7, 2.45.0, 2.49.4, 2.95.0, 2.119.0). Isso não é defeito de uma função —
 * é dívida acumulada: cada agente que criou uma função copiou o import da função
 * que tinha em mãos.
 *
 * Por que uma catraca e não um bump em massa: não há Deno neste repositório para
 * exercitar as funções, e só 13 delas publicam pelo
 * `deploy-sicoob-functions.yml`. Trocar a versão nas 83 às cegas seria mudança de
 * comportamento ampla sem nenhum teste que a pegue. Entre as que publicam, aliás,
 * a divergência é pequena: 8 de 9 usam 2.49.4, como todo o `_shared`; só
 * `auth-integrity-check` está em 2.119.0.
 *
 * A regra travada aqui:
 *   1. Nenhuma versão NOVA entra — o conjunto só pode encolher.
 *   2. As três versões ANTIGAS (2.42.7, 2.45.0, 2.49.4) não podem ganhar
 *      adeptos. Função nova nasce numa versão moderna.
 *
 * Consolidar é sempre permitido: qualquer contagem pode cair. Ao unificar de
 * verdade, baixe os números daqui — a catraca só aperta.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const RAIZ = "supabase/functions";
const IMPORTE = /@supabase\/supabase-js@(\d+\.\d+\.\d+)/g;

/** Versões antigas: congeladas, não podem ganhar novos usos. */
const TETO_POR_VERSAO_ANTIGA: Readonly<Record<string, number>> = {
  "2.42.7": 4,
  "2.45.0": 9,
  "2.49.4": 54,
};

/** Versões modernas: podem crescer; é para cá que função nova deve ir. */
const VERSOES_MODERNAS = ["2.95.0", "2.119.0"] as const;

const VERSOES_CONHECIDAS = new Set<string>([
  ...Object.keys(TETO_POR_VERSAO_ANTIGA),
  ...VERSOES_MODERNAS,
]);

function arquivosDe(dir: string): string[] {
  const saida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const caminho = path.join(dir, entrada);
    if (statSync(caminho).isDirectory()) saida.push(...arquivosDe(caminho));
    else if (/\.(ts|tsx|js|mjs)$/.test(entrada)) saida.push(caminho);
  }
  return saida;
}

/** Uma ocorrência por import encontrado, com o arquivo que o traz. */
const OCORRENCIAS: ReadonlyArray<{ versao: string; arquivo: string }> = arquivosDe(RAIZ).flatMap(
  (arquivo) => {
    const texto = readFileSync(arquivo, "utf8");
    // `m[1]` é tipado como `string | undefined` porque o grupo de captura pode,
    // em tese, não casar. Aqui ele sempre casa — o grupo é obrigatório no padrão
    // —, mas filtrar é mais honesto que afirmar com `!`.
    return [...texto.matchAll(IMPORTE)]
      .map((m) => m[1])
      .filter((versao): versao is string => typeof versao === "string")
      .map((versao) => ({ versao, arquivo }));
  },
);

const contagem = OCORRENCIAS.reduce<Record<string, number>>((acc, { versao }) => {
  acc[versao] = (acc[versao] ?? 0) + 1;
  return acc;
}, {});

describe("espalhamento de versões do supabase-js nas edge functions", () => {
  it("encontra os imports — se esta suíte parar de ver, a catraca vira decoração", () => {
    expect(OCORRENCIAS.length).toBeGreaterThan(50);
  });

  it("nenhuma versão nova entra: o conjunto só pode encolher", () => {
    const desconhecidas = Object.keys(contagem).filter((v) => !VERSOES_CONHECIDAS.has(v));
    expect(
      desconhecidas,
      `Versão de supabase-js fora do conjunto congelado: ${desconhecidas.join(", ")}. ` +
        `Use uma das modernas (${VERSOES_MODERNAS.join(" ou ")}) ou, se o bump for ` +
        `intencional, atualize este arquivo no mesmo PR explicando por quê.`,
    ).toEqual([]);
  });

  it("as versões antigas não ganham adeptos: função nova nasce moderna", () => {
    for (const [versao, teto] of Object.entries(TETO_POR_VERSAO_ANTIGA)) {
      const atual = contagem[versao] ?? 0;
      expect(
        atual,
        `supabase-js ${versao} passou de ${teto} para ${atual} usos. ` +
          `Versão antiga não cresce — adote ${VERSOES_MODERNAS.join(" ou ")} na função nova. ` +
          `Se você consolidou e o número caiu, baixe o teto aqui: a catraca só aperta.`,
      ).toBeLessThanOrEqual(teto);
    }
  });

  it("o módulo compartilhado fala uma versão só", () => {
    const noShared = OCORRENCIAS.filter((o) => o.arquivo.startsWith(`${RAIZ}/_shared/`));
    const versoes = [...new Set(noShared.map((o) => o.versao))];
    expect(noShared.length).toBeGreaterThan(0);
    expect(
      versoes,
      `_shared é empacotado dentro de TODA função; duas versões aqui significam ` +
        `duas versões no mesmo bundle. Encontradas: ${versoes.join(", ")}.`,
    ).toHaveLength(1);
  });
});
