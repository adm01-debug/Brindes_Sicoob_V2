import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/**
 * Base da comparação: o relatório JÁ existente de hoje (repetição no mesmo dia compara com a execução imediatamente
 * anterior); se ainda não houver, o último dia anterior com relatório legível. Retorna { rotulo, json } ou null.
 */
export function carregarBase(out, day) {
  const ler = (d) => {
    const f = join(out, d, 'latest.json');
    if (!existsSync(f)) return null;
    try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; }
  };
  const hoje = ler(day);
  if (hoje) return { rotulo: `${day} (execução anterior de hoje)`, json: hoje };
  const anteriores = readdirSync(out).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d < day).sort().reverse();
  for (const d of anteriores) { const json = ler(d); if (json) return { rotulo: d, json }; }
  return null;
}
