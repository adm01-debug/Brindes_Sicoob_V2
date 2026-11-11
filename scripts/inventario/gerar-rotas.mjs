#!/usr/bin/env node
/**
 * Inventario das rotas do front -> inventario/estado/rotas.json (fonte de consulta dos agentes).
 *
 * Le o codigo, nao documentacao:
 *  - Rotas:  src/routes/config/*.ts (`defineRoute({ path, component: lazyWithRetry(() => import(...)) })`)
 *  - Montagem: src/App.tsx (qual grupo entra sob qual guarda — ProtectedRoute / AdminRoute /
 *    SicoobRoute / DevRoute —, as rotas declaradas inline e os `<Navigate>` de redirecionamento)
 *  - Menu:   src/components/layout/SidebarReorganized.tsx (`navGroups`: rotulo, grupo, href,
 *            allowedRoles, atalho)
 *  - Para cada rota: segue os imports a partir do arquivo da pagina (mesma pasta, src/hooks/,
 *    src/services/, src/lib/, src/stores/, src/contexts/) e lista hooks, edge functions invocadas,
 *    RPCs, tabelas (.from e /rest/v1) e buckets de storage (storage.from).
 *  - `problemas`: item de menu sem rota, rota sem item de menu, rota sem arquivo, grupo de rota
 *    que o App.tsx nao monta e import local que nao resolve.
 *
 * Uso:
 *   node scripts/inventario/gerar-rotas.mjs           grava inventario/estado/rotas.json
 *   node scripts/inventario/gerar-rotas.mjs --check    exit 1 se o arquivo commitado esta desatualizado
 * Saida deterministica (sem data): o mesmo codigo gera o mesmo arquivo.
 *
 * Replicado do Zapp Web V2 (scripts/inventario/gerar-rotas.mjs) e adaptado ao roteamento deste
 * repo: la o front tem AppRoutes.tsx + ViewRouter/lazyViews + navigation.service.ts; aqui as rotas
 * vivem em arrays de src/routes/config/ e o menu no SidebarReorganized.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ_PADRAO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA_REL = 'inventario/estado/rotas.json';
const CONFIG_DIR = 'src/routes/config';
const APP = 'src/App.tsx';
const SIDEBAR = 'src/components/layout/SidebarReorganized.tsx';
const EXTENSOES = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];
// Componentes que embrulham a rota sem ser a tela nem uma guarda de acesso.
const NEUTROS = new Set(['RouteSuspense', 'Suspense', 'Fragment', 'Outlet', 'ErrorBoundary', 'Navigate', 'Route', 'Routes']);
// Pastas que o fecho de imports percorre sem limite (onde vive a logica chamada pela tela).
const PASTAS_LIVRES = ['src/hooks', 'src/services', 'src/lib', 'src/stores', 'src/contexts', 'src/utils', 'src/data'];
export const MAX_SALTOS_FEATURE = 2;

const ler = (raiz, rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
const rel = (raiz, abs) => path.relative(raiz, abs).split(path.sep).join('/');
const unico = (lista) => [...new Set(lista)].sort();

/** Resolve um especificador de import para um arquivo do repo (ou null se externo/inexistente). */
export function resolverImport(raiz, deArquivoAbs, especificador) {
  let base;
  if (especificador.startsWith('@/')) base = path.join(raiz, 'src', especificador.slice(2));
  else if (especificador.startsWith('.')) base = path.resolve(path.dirname(deArquivoAbs), especificador);
  else return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTENSOES) if (fs.existsSync(base + ext)) return base + ext;
  return undefined; // local, mas nao existe
}

/** Imports de um arquivo: [{ especificador, nomes[] }] (estaticos e import() dinamico). */
export function extrairImports(texto) {
  const out = [];
  for (const m of texto.matchAll(/import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    if (m[1]) continue;
    const nomes = [...m[2].matchAll(/\b([A-Za-z_$][\w$]*)\b(?!\s*as\b)/g)].map((x) => x[1])
      .filter((n) => !['type', 'as', 'default'].includes(n));
    out.push({ especificador: m[3], nomes });
  }
  for (const m of texto.matchAll(/(?:import|export)\s*(?:\*\s*from\s*)?['"]([^'"]+)['"]/g)) out.push({ especificador: m[1], nomes: [] });
  for (const m of texto.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push({ especificador: m[1], nomes: [] });
  for (const m of texto.matchAll(/export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g)) out.push({ especificador: m[1], nomes: [] });
  return out;
}

/**
 * Mapa nome -> valor dos `const NOME = 'literal'` de nivel de modulo. So resolve o caso comum de
 * identificador passado direto pra `.from`/`rpc`/`invoke`/`storage.from`. Conta profundidade de
 * chave linha a linha e so aceita o `const` em profundidade zero (nivel de modulo de verdade):
 * coluna zero sozinha nao basta em arquivo que nao passou pelo Prettier.
 */
function constantesDeString(texto) {
  const mapa = new Map();
  let profundidade = 0;
  for (const linha of texto.split('\n')) {
    if (profundidade === 0) {
      const m = linha.match(/^(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[^=]+)?=\s*['"`]([A-Za-z0-9_.-]+)['"`]\s*[;,]?\s*$/);
      if (m) mapa.set(m[1], m[2]);
    }
    for (const ch of linha) {
      if (ch === '{') profundidade++;
      else if (ch === '}') profundidade--;
    }
  }
  return mapa;
}

/**
 * Chamadas ao Supabase num texto: tabelas (`.from` do cliente e `/rest/v1/<tabela>`), buckets
 * (`storage.from`), RPCs (`.rpc`) e edges (`functions.invoke`, `/functions/v1/<edge>`).
 */
export function extrairChamadas(texto) {
  const pegar = (re) => [...texto.matchAll(re)].map((m) => m[1]);
  const consts = constantesDeString(texto);
  const tabelas = [];
  const buckets = [];
  for (const m of texto.matchAll(/(\bstorage\s*)?\.from\(\s*['"`]([A-Za-z0-9_-]+)['"`]/g)) (m[1] ? buckets : tabelas).push(m[2]);
  for (const m of texto.matchAll(/(\bstorage\s*)?\.from\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
    if (consts.has(m[2])) (m[1] ? buckets : tabelas).push(consts.get(m[2]));
  }
  tabelas.push(...pegar(/\/rest\/v1\/([A-Za-z0-9_]+)/g).filter((t) => t !== 'rpc'));
  return {
    tabelas,
    buckets,
    rpcs: [...pegar(/(?:\.|\b)rpc\(\s*['"`]([A-Za-z0-9_]+)['"`]/g), ...pegar(/\/rest\/v1\/rpc\/([A-Za-z0-9_]+)/g)],
    edges: [
      ...pegar(/(?:functions\s*\.\s*invoke|\binvokeEdge|\binvokeFunction)(?:<[^>()]*>)?\(\s*['"`]([A-Za-z0-9_-]+)(?:\/[^'"`]*)?['"`]/g),
      ...pegar(/['"`][^'"`\n]*\/functions\/v1\/([A-Za-z0-9_-]+)/g),
    ],
  };
}

const ehTeste = (p) => /(\.test\.|\.spec\.|__tests__|\.stories\.)/.test(p);

/**
 * Fecho de imports a partir do arquivo da pagina. Segue sem limite a pasta da propria pagina e as
 * PASTAS_LIVRES; componente de outra feature em src/components/ entra ate MAX_SALTOS_FEATURE
 * saltos. Fica de fora o kit de UI (src/components/ui/) e teste. Import local que nao resolve vira
 * problema.
 */
export function fechoDaTela(raiz, arquivoTelaAbs) {
  const pastaPagina = path.dirname(arquivoTelaAbs);
  const dentro = (abs, rel_) => abs.startsWith(path.join(raiz, rel_) + path.sep);
  const livre = (abs) => abs.startsWith(pastaPagina + path.sep) || PASTAS_LIVRES.some((d) => dentro(abs, d));
  const outraFeature = (abs) => dentro(abs, 'src/components') && !dentro(abs, 'src/components/ui');
  const saltosVistos = new Map(); // arquivo -> menor numero de saltos com que foi visitado
  const hooks = new Map();
  const quebrados = new Set();
  const chamadas = { tabelas: [], buckets: [], rpcs: [], edges: [] };
  const fila = [[arquivoTelaAbs, 0]];
  while (fila.length) {
    const [atual, saltos] = fila.shift();
    if (saltosVistos.has(atual) && saltosVistos.get(atual) <= saltos) continue;
    const primeiraVez = !saltosVistos.has(atual);
    saltosVistos.set(atual, saltos);
    const texto = fs.readFileSync(atual, 'utf8');
    if (primeiraVez) {
      const c = extrairChamadas(texto);
      for (const k of Object.keys(chamadas)) chamadas[k].push(...c[k]);
    }
    for (const imp of extrairImports(texto)) {
      const alvo = resolverImport(raiz, atual, imp.especificador);
      if (alvo === undefined && !/\.(css|scss|svg|png|jpe?g|webp|gif|json)(\?.*)?$|\?/.test(imp.especificador)) {
        quebrados.add(`${rel(raiz, atual)} -> ${imp.especificador}`);
      }
      if (!alvo || ehTeste(alvo)) continue;
      for (const nome of imp.nomes) if (/^use[A-Z]/.test(nome) && !hooks.has(nome)) hooks.set(nome, rel(raiz, alvo));
      if (livre(alvo)) fila.push([alvo, saltos]);
      else if (outraFeature(alvo) && saltos < MAX_SALTOS_FEATURE) fila.push([alvo, saltos + 1]);
    }
  }
  return {
    arquivos_lidos: saltosVistos.size,
    hooks: [...hooks.entries()].map(([nome, arquivo]) => ({ nome, arquivo })).sort((a, b) => a.nome.localeCompare(b.nome)),
    buckets: unico(chamadas.buckets),
    edges: unico(chamadas.edges),
    rpcs: unico(chamadas.rpcs),
    tabelas: unico(chamadas.tabelas),
    imports_quebrados: [...quebrados].sort(),
  };
}

/**
 * Rotas declaradas em src/routes/config/*.ts. Cada arquivo exporta um array de `defineRoute`;
 * a chave do mapa e o nome do export (como o App.tsx o usa).
 */
export function lerGruposDeRotas(raiz) {
  const dir = path.join(raiz, CONFIG_DIR);
  const grupos = {};
  for (const arquivo of fs.readdirSync(dir).filter((f) => f.endsWith('.ts')).sort()) {
    const relArquivo = `${CONFIG_DIR}/${arquivo}`;
    const abs = path.join(dir, arquivo);
    const texto = fs.readFileSync(abs, 'utf8');
    const exports_ = [...texto.matchAll(/export\s+const\s+(\w+)\s*(?::[^=]+)?=\s*\[/g)].map((m) => ({ nome: m[1], pos: m.index }));
    // `export const x = [...otherRoutes, defineRoute(...)]`: o espalhamento mantem o grupo de origem.
    const espalhados = [...texto.matchAll(/\.\.\.(\w+)/g)].map((m) => m[1]);
    const rotas = [...texto.matchAll(/path:\s*["']([^"']+)["']\s*,\s*\n?\s*component:\s*(?:[A-Za-z_$][\w$]*\(\s*)?\(\)\s*=>\s*import\(\s*["']([^"']+)["']\s*\)/g)]
      .map((m) => {
        const alvo = resolverImport(raiz, abs, m[2]);
        return {
          caminho: m[1],
          importado: m[2],
          arquivo: alvo ? rel(raiz, alvo) : null,
          // Rota embrulhada por `__ENABLE_DEMO_PAGES__ ? [...] : []` nao existe em producao.
          condicional: /__ENABLE_DEMO_PAGES__[\s\S]{0,400}?path:\s*["']/.test(texto.slice(0, m.index + m[0].length))
            && texto.slice(0, m.index).lastIndexOf('__ENABLE_DEMO_PAGES__') > texto.slice(0, m.index).lastIndexOf('] :'),
        };
      });
    for (const e of exports_) {
      grupos[e.nome] = {
        arquivo: relArquivo,
        espalha: unico(espalhados.filter((n) => n !== e.nome)),
        rotas: exports_.length === 1 ? rotas : rotas.filter((r) => {
          const posRota = texto.indexOf(`"${r.caminho}"`) >= 0 ? texto.indexOf(`"${r.caminho}"`) : texto.indexOf(`'${r.caminho}'`);
          const proximo = exports_.find((x) => x.pos > e.pos);
          return posRota > e.pos && (!proximo || posRota < proximo.pos);
        }),
      };
    }
  }
  return grupos;
}

/**
 * Como o App.tsx monta as rotas: para cada `{grupo.map(` e para cada `<Route path=...>` inline,
 * a pilha de guardas/layouts em que ele esta. A varredura de `<Route>` usa a mesma expressao do
 * gerador de contexto (scripts/ai-context/gerar.mjs): atributo com `{...}` pode conter `>`.
 */
export function lerMontagem(raiz) {
  const texto = ler(raiz, APP);
  const corpo = texto.slice(texto.indexOf('<Routes>'), texto.lastIndexOf('</Routes>'));
  const re = /<Route\b((?:[^>{/]|\/(?!>)|\{(?:[^{}]|\{[^{}]*\})*\})*)(\/?)>|<\/Route\s*>|\{\s*(\w+)\s*\.map\(/g;
  const pilha = [];
  const grupos = {};
  const inline = [];
  let m;
  while ((m = re.exec(corpo))) {
    if (m[3]) { // {grupoRoutes.map(
      grupos[m[3]] = [...pilha];
      continue;
    }
    if (m[0].startsWith('</')) { pilha.pop(); continue; }
    const attrs = m[1] || '';
    const autoFechado = m[2] === '/';
    const componentes = [...attrs.matchAll(/<([A-Z]\w*)/g)].map((x) => x[1]).filter((n) => !NEUTROS.has(n));
    const caminho = (attrs.match(/\bpath=["']([^"']*)["']/) || [])[1];
    const redireciona = (attrs.match(/<Navigate\s+to=["']([^"']+)["']/) || [])[1] ?? null;
    if (caminho !== undefined) {
      inline.push({ caminho, componente: componentes[0] ?? null, guardas: [...pilha], redireciona });
    }
    if (!autoFechado) pilha.push(componentes[0] ?? '(sem componente)');
  }
  return { grupos, inline };
}

/**
 * Blocos `{...}` balanceados de um texto, sem entrar nos aninhados: devolve os objetos do nivel
 * mais externo. Usado para ler `navGroups` sem depender da indentacao do arquivo.
 */
export function blocosBalanceados(texto) {
  const blocos = [];
  for (let i = 0; i < texto.length; i += 1) {
    if (texto[i] !== '{') continue;
    let profundidade = 0;
    let j = i;
    for (; j < texto.length; j += 1) {
      if (texto[j] === '{') profundidade += 1;
      else if (texto[j] === '}') { profundidade -= 1; if (profundidade === 0) break; }
    }
    if (profundidade !== 0) break; // texto truncado
    blocos.push({ inicio: i, texto: texto.slice(i, j + 1) });
    i = j;
  }
  return blocos;
}

const campo = (bloco, nome) => (bloco.match(new RegExp(`${nome}:\\s*['"\`]([^'"\`]*)['"\`]`)) || [])[1] ?? null;
const papeisDe = (bloco) => ((bloco.match(/allowedRoles:\s*\[([^\]]*)\]/) || [])[1]?.match(/['"]([^'"]+)['"]/g) || [])
  .map((s) => s.slice(1, -1));

/**
 * Itens de menu do SidebarReorganized (`navGroups`): rotulo, grupo, href, papeis, atalho. Item com
 * `children` entra junto com os filhos; `href: ''` e cabecalho de submenu, nao link.
 */
export function lerMenu(raiz) {
  const texto = ler(raiz, SIDEBAR);
  const inicio = texto.indexOf('export const navGroups');
  if (inicio < 0) return [];
  const corpo = texto.slice(inicio);
  const itens = [];
  const push = (bloco, grupo, pai) => {
    const proprio = bloco.replace(/children:\s*\[[\s\S]*$/, '');
    itens.push({
      href: campo(proprio, 'href') ?? '',
      rotulo: campo(proprio, 'label'),
      grupo: grupo.label,
      grupo_id: grupo.id,
      pai,
      papeis: papeisDe(proprio),
      atalho: campo(proprio, 'shortcut'),
      exato: /exact:\s*true/.test(proprio),
      so_admin: /adminOnly:\s*true/.test(proprio),
      so_dev: /devOnly:\s*true/.test(proprio),
      cabecalho: (campo(proprio, 'href') ?? '') === '',
    });
  };
  for (const grupoBloco of blocosBalanceados(corpo)) {
    const grupo = {
      id: campo(grupoBloco.texto.replace(/items:\s*\[[\s\S]*$/, ''), 'id'),
      label: campo(grupoBloco.texto.replace(/items:\s*\[[\s\S]*$/, ''), 'label'),
    };
    const posItens = grupoBloco.texto.indexOf('items:');
    if (posItens < 0) continue;
    for (const item of blocosBalanceados(grupoBloco.texto.slice(posItens))) {
      push(item.texto, grupo, null);
      const posFilhos = item.texto.indexOf('children:');
      if (posFilhos < 0) continue;
      for (const filho of blocosBalanceados(item.texto.slice(posFilhos))) {
        push(filho.texto, grupo, campo(item.texto.replace(/children:\s*\[[\s\S]*$/, ''), 'label'));
      }
    }
  }
  return itens.sort((a, b) => a.href.localeCompare(b.href) || String(a.rotulo).localeCompare(String(b.rotulo)));
}

/** Monta o inventario inteiro a partir de uma raiz de repo. */
export function gerarRotas(raiz = RAIZ_PADRAO) {
  const grupos = lerGruposDeRotas(raiz);
  const { grupos: montagem, inline } = lerMontagem(raiz);
  const menu = lerMenu(raiz);
  const porHref = new Map();
  for (const item of menu) {
    if (!porHref.has(item.href)) porHref.set(item.href, []);
    porHref.get(item.href).push(item);
  }

  // Grupo espalhado dentro de outro (`export const sicoobRoutes = [...sicoobRbacRoutes, ...]`) e
  // montado pelas guardas de quem o espalha — o App.tsx nunca chama `.map` nele.
  const guardasDoGrupo = (nome, visto = new Set()) => {
    if (montagem[nome]) return montagem[nome];
    if (visto.has(nome)) return null;
    visto.add(nome);
    for (const [outro, g] of Object.entries(grupos)) {
      if (!g.espalha.includes(nome)) continue;
      const herdadas = guardasDoGrupo(outro, visto);
      if (herdadas) return herdadas;
    }
    return null;
  };

  const rotas = [];
  for (const [nome, grupo] of Object.entries(grupos)) {
    const guardas = guardasDoGrupo(nome);
    for (const r of grupo.rotas) {
      rotas.push({
        caminho: r.caminho,
        origem: grupo.arquivo,
        grupo: nome,
        guardas: guardas ?? [],
        montada_no_app: guardas !== null,
        condicional: r.condicional,
        arquivo: r.arquivo,
        importado: r.importado,
        redireciona: null,
        menu: porHref.get(r.caminho) ?? null,
        ...(r.arquivo
          ? fechoDaTela(raiz, path.join(raiz, r.arquivo))
          : { arquivos_lidos: 0, hooks: [], buckets: [], edges: [], rpcs: [], tabelas: [], imports_quebrados: [] }),
      });
    }
  }
  for (const r of inline) {
    rotas.push({
      caminho: r.caminho,
      origem: APP,
      grupo: null,
      guardas: r.guardas,
      montada_no_app: true,
      condicional: false,
      arquivo: null,
      importado: null,
      redireciona: r.redireciona,
      menu: porHref.get(r.caminho) ?? null,
      arquivos_lidos: 0,
      hooks: [],
      buckets: [],
      edges: [],
      rpcs: [],
      tabelas: [],
      imports_quebrados: [],
      componente: r.componente,
    });
  }
  rotas.sort((a, b) => a.caminho.localeCompare(b.caminho) || String(a.origem).localeCompare(String(b.origem)));

  const hooks = {};
  for (const r of rotas) for (const h of r.hooks) {
    hooks[h.nome] ??= { arquivo: h.arquivo, rotas: [] };
    hooks[h.nome].rotas.push(r.caminho);
  }
  // Na rota fica so o NOME do hook; o arquivo de cada um sai uma vez em `hooks` (o arquivo
  // repetido por rota levava o JSON a mais de 1 MB por semana no git).
  for (const r of rotas) r.hooks = r.hooks.map((h) => h.nome);

  const caminhos = new Set(rotas.map((r) => r.caminho));
  // Menu pode apontar para rota com parametro (`/pedidos/:id`) ou com querystring.
  const casa = (href) => {
    const limpo = href.split('?')[0].replace(/\/$/, '') || '/';
    if (caminhos.has(limpo) || caminhos.has(href)) return true;
    const partes = limpo.split('/');
    return rotas.some((r) => {
      const alvo = r.caminho.split('/');
      return alvo.length === partes.length && alvo.every((p, i) => p.startsWith(':') || p === '*' || p === partes[i]);
    });
  };

  const problemas = [
    ...Object.entries(grupos).filter(([nome]) => guardasDoGrupo(nome) === null).map(([nome, g]) => ({
      tipo: 'grupo_nao_montado', id: nome,
      detalhe: `${g.arquivo} exporta ${nome} com ${g.rotas.length} rota(s), mas ${APP} nao renderiza ${nome}.map(...) nem outro grupo o espalha`,
    })),
    ...rotas.filter((r) => r.grupo && !r.arquivo).map((r) => ({
      tipo: 'rota_sem_arquivo', id: r.caminho, detalhe: `import ${r.importado} nao resolve a partir de ${r.origem}`,
    })),
    ...menu.filter((i) => !i.cabecalho && !casa(i.href)).map((i) => ({
      tipo: 'menu_sem_rota', id: i.href, detalhe: `item "${i.rotulo}" (grupo ${i.grupo}) aponta para rota que nao existe`,
    })),
    // Rota com parametro (`/pedidos/:id`) ou curinga nunca aparece no menu: nao e problema.
    ...rotas.filter((r) => r.grupo && !r.menu && !r.condicional && !/[:*]/.test(r.caminho)).map((r) => ({
      tipo: 'rota_sem_menu', id: r.caminho, detalhe: `${r.origem} declara a rota, mas nenhum item do menu aponta para ela`,
    })),
    ...rotas.flatMap((r) => r.imports_quebrados.map((q) => ({ tipo: 'import_quebrado', id: r.caminho, detalhe: q }))),
    ...(menu.length === 0 ? [{ tipo: 'menu_nao_lido', id: SIDEBAR, detalhe: 'nenhum item de menu reconhecido — o formato de navGroups mudou' }] : []),
  ];

  return {
    format_version: 1,
    fonte: `scripts/inventario/gerar-rotas.mjs (le ${CONFIG_DIR}/*.ts, ${APP}, ${SIDEBAR} e os imports de cada pagina)`,
    resumo: {
      rotas: rotas.length,
      grupos: Object.keys(grupos).length,
      grupos_nao_montados: Object.keys(grupos).filter((n) => guardasDoGrupo(n) === null).length,
      itens_de_menu: menu.length,
      hooks_distintos: Object.keys(hooks).length,
      problemas: problemas.length,
    },
    rotas,
    menu,
    hooks: Object.fromEntries(Object.keys(hooks).sort().map((k) => [k, { arquivo: hooks[k].arquivo, rotas: unico(hooks[k].rotas) }])),
    problemas,
  };
}

export const serializar = (inv) => JSON.stringify(inv, null, 2) + '\n';

function main(argv) {
  const saida = path.join(RAIZ_PADRAO, SAIDA_REL);
  const conteudo = serializar(gerarRotas(RAIZ_PADRAO));
  if (argv.includes('--check')) {
    const atual = fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8') : '';
    if (atual !== conteudo) {
      console.error(`${SAIDA_REL} desatualizado: rode node scripts/inventario/gerar-rotas.mjs e commite o resultado.`);
      process.exit(1);
    }
    console.log(`${SAIDA_REL} em dia.`);
    return;
  }
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, conteudo);
  const r = JSON.parse(conteudo).resumo;
  console.log(`rotas.json: ${r.rotas} rotas, ${r.grupos} grupos, ${r.itens_de_menu} itens de menu, `
    + `${r.hooks_distintos} hooks, ${r.problemas} problemas.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
