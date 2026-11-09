/**
 * Comparação entre duas execuções do runner (usada por rotina.mjs).
 * Regra que errou (hoje ou antes) é INCONCLUSIVA: fica de fora nos dois lados, para nunca
 * anunciar "resolvido" um achado que simplesmente não foi verificado.
 */
export function comparar(cur, prev) {
  const inconclusivas = new Set([...cur.results, ...(prev?.results ?? [])].filter((r) => r.error).map((r) => r.id));
  const flat = (json) =>
    new Map(
      json.results
        .filter((r) => !inconclusivas.has(r.id))
        .flatMap((r) => r.items.map((i) => [`${r.id}|${i}`, { id: r.id, severity: r.severity, item: i }])),
    );
  const a = flat(cur);
  const b = prev ? flat(prev) : new Map();
  return {
    novos: prev ? [...a].filter(([k]) => !b.has(k)).map(([, v]) => v) : [],
    resolvidos: prev ? [...b].filter(([k]) => !a.has(k)).map(([, v]) => v) : [],
    inconclusivas: [...inconclusivas],
  };
}
