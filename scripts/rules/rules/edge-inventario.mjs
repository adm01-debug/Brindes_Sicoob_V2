import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { edgeFunctions } from '../lib.mjs';

const INVENTORY = 'docs/INVENTARIO_FUNCIONALIDADES_v2.md';

export default [
  {
    id: 'edge-fora-do-inventario',
    kind: 'gap',
    severity: 'media',
    title: 'Edge functions no repositório que não constam no inventário de funcionalidades',
    fix: `documentar em ${INVENTORY} (seção 5); o gerador scripts/compare-edge-functions.mjs só reporta`,
    run(ctx) {
      const p = join(ctx.root, INVENTORY);
      if (!existsSync(p)) return { items: [], note: `${INVENTORY} ausente` };
      const doc = readFileSync(p, 'utf8');
      return { items: edgeFunctions(ctx.root).filter((fn) => !doc.includes('`' + fn + '`')).sort() };
    },
  },
  {
    id: 'edge-sem-teste',
    kind: 'melhoria',
    severity: 'baixa',
    title: 'Edge functions que nenhum teste referencia (pasta própria, supabase/functions/tests ou tests/)',
    fix: 'adicionar teste (priorizar as que escrevem no banco ou usam service role)',
    run(ctx) {
      // Testes ficam na pasta da função, em supabase/functions/tests (*_test.ts) e em tests/.
      const isTest = (f) => /(?:\.test|_test)\.(?:ts|tsx|mjs|js)$/.test(f);
      const files = [...ctx.walk(join(ctx.root, 'supabase')), ...ctx.walk(join(ctx.root, 'tests'))].filter(isTest);
      const corpus = files.map((f) => f.toLowerCase() + '\n' + readFileSync(f, 'utf8')).join('\n');
      const items = edgeFunctions(ctx.root).filter((fn) => !corpus.includes(`functions/${fn}`) && !corpus.includes(`'${fn}'`) && !corpus.includes(`"${fn}"`) && !corpus.includes(fn.replace(/-/g, '_') + '_test') && !corpus.includes(fn + '.test'));
      return { items: items.sort(), note: 'heurística: considera coberta a função citada por caminho ou nome em algum teste; não mede cobertura real' };
    },
  },
  {
    id: 'edge-config-orfa',
    kind: 'falha',
    severity: 'media',
    title: 'config.toml declara [functions.X] cuja pasta não existe',
    fix: 'remover a entrada do config.toml ou restaurar a função',
    run(ctx) {
      const p = join(ctx.root, 'supabase/config.toml');
      if (!existsSync(p)) return { items: [] };
      const real = new Set(edgeFunctions(ctx.root));
      const declared = [...readFileSync(p, 'utf8').matchAll(/^\[functions\.([\w-]+)\]/gm)].map((m) => m[1]);
      return { items: declared.filter((fn) => !real.has(fn)) };
    },
  },
];
