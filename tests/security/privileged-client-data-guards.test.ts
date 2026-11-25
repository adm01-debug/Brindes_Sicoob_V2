import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

/** Trecho entre dois marcadores; falha cedo se o marcador sumir numa refatoração. */
function sliceBetween(source: string, from: string, to: string): string {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start + from.length);
  if (start === -1 || end === -1) return "";
  return source.slice(start, end);
}

/**
 * O trecho a partir de `index` comeca com `needle`? Compara ignorando espacos para
 * a tag de abertura poder ser reformatada (um atributo por linha).
 */
function startsWithCollapsed(source: string, index: number, needle: string): boolean {
  let matched = 0;
  for (let i = index; i < source.length && matched < needle.length; i += 1) {
    if (/\s/.test(source[i])) continue;
    if (source[i] !== needle[matched]) return false;
    matched += 1;
  }
  return matched === needle.length;
}

type RouteToken = { kind: "open" | "close"; index: number };

/**
 * Tokeniza as tags `<Route ...>` do arquivo. O fim da tag e achado no nivel zero de
 * chaves, porque os atributos contem JSX (`element={<AdminRoute />}`) e arrow
 * functions — o primeiro `>` cru nao serve. `<RouteSuspense>`/`</RouteSuspense>` nao
 * contam como rota.
 */
function commentRanges(source: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let cursor = 0;
  while (cursor < source.length) {
    const char = source[cursor];
    // String literal: `//` dentro de URL nao abre comentario.
    if (char === '"' || char === "'" || char === "`") {
      cursor += 1;
      while (cursor < source.length && source[cursor] !== char) {
        cursor += source[cursor] === "\\" ? 2 : 1;
      }
      cursor += 1;
      continue;
    }
    if (char === "/" && (source[cursor + 1] === "/" || source[cursor + 1] === "*")) {
      const start = cursor;
      if (source[cursor + 1] === "/") {
        while (cursor < source.length && source[cursor] !== "\n") cursor += 1;
      } else {
        const end = source.indexOf("*/", cursor + 2);
        cursor = end === -1 ? source.length : end + 2;
      }
      ranges.push([start, cursor]);
      continue;
    }
    cursor += 1;
  }
  return ranges;
}

const insideComment = (ranges: Array<[number, number]>, index: number) =>
  ranges.some(([start, end]) => index >= start && index < end);

function routeTokens(source: string): RouteToken[] {
  const tokens: RouteToken[] = [];
  const comments = commentRanges(source);
  const re = /<\/?Route(?![A-Za-z])/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    // Comentario que cita a tag nao e rota: sem isso o teste contaria uma abertura fantasma.
    if (insideComment(comments, match.index)) continue;
    if (match[0] === "</Route") {
      tokens.push({ kind: "close", index: match.index });
      continue;
    }
    let depth = 0;
    let cursor = match.index + match[0].length;
    for (; cursor < source.length; cursor += 1) {
      const char = source[cursor];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      else if (char === ">" && depth === 0) break;
    }
    const selfClosing = source.slice(match.index, cursor).trimEnd().endsWith("/");
    if (!selfClosing) tokens.push({ kind: "open", index: match.index });
    re.lastIndex = cursor;
  }
  return tokens;
}

const lineIndex = (source: string, index: number) => source.slice(0, index).split("\n").length - 1;

/**
 * Faixa [abertura, fechamento] de um `<Route ...>` de layout, contando aninhamento.
 * A guarda de rota so vale para os filhos: por isso o teste precisa do range, nao
 * apenas da linha de abertura. A busca do marcador ignora espacos e quebras de
 * linha, entao reformatar a tag de abertura (um atributo por linha) nao reprova o
 * teste sem mudanca de comportamento.
 */
function routeBlockRange(source: string, opener: string): { start: number; end: number } {
  const needle = opener.replace(/\s+/g, "");
  const tokens = routeTokens(source);
  // A abertura precisa ser uma tag de rota de verdade: comentario que cita a tag nao
  // conta, senao a busca aceitaria a proxima rota — que pode ser outro bloco.
  const opened = tokens.findIndex(
    (token) => token.kind === "open" && startsWithCollapsed(source, token.index, needle),
  );
  if (opened === -1) return { start: -1, end: -1 };
  const start = lineIndex(source, tokens[opened].index);
  let depth = 0;
  for (let i = opened; i < tokens.length; i += 1) {
    if (tokens[i].kind === "open") depth += 1;
    else if (tokens[i].kind === "close") {
      depth -= 1;
      if (depth === 0) return { start, end: lineIndex(source, tokens[i].index) };
    }
  }
  return { start, end: -1 };
}

const ADMIN_BLOCK = "<Route element={<AdminRoute />}>";
const SHELL_BLOCK = "<Route element={<RouteSuspense><AuthenticatedShell /></RouteSuspense>}>";
const PROTECTED_BLOCK = "<Route element={<ProtectedRoute />}>";

const crmBridge = read("supabase/functions/crm-db-bridge/index.ts");
const expertChat = read("supabase/functions/expert-chat/index.ts");
const appRoutes = read("src/App.tsx");
const quoteRoutes = read("src/routes/config/quotes.ts");
const clientRoutes = read("src/routes/clientRoutes.ts");
const companySearch = read("src/components/quotes/company-contact/CompanySearchDropdown.tsx");
const companyContactSelector = read("src/components/quotes/CompanyContactSelector.tsx");
const cartCompanyOptions = read("src/components/cart/cart-company-options.ts");
const cartCompanyPicker = read("src/components/cart/CartCompanyPicker.tsx");
const cartCompanyPickerDialog = read("src/components/cart/CartCompanyPickerDialog.tsx");

describe("barreiras estaticas para dados privilegiados de clientes", () => {
  it("carrega todos os papeis e falha fechado para vinculo invalido", () => {
    expect(crmBridge).toContain('.from("user_roles").select("role").eq("user_id", user.id)');
    expect(crmBridge).not.toContain(
      '.from("user_roles").select("role").eq("user_id", user.id).single()',
    );
    expect(crmBridge).toContain("hasActivePortalMembership(profileResult.data, userRoles)");
  });

  it("autoriza o shape completo antes de resolver a credencial service-role externa", () => {
    const code = crmBridge
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("import "))
      .join("\n");
    const authorization = code.indexOf("if (!canAccessCrmRequest(auth.userRoles, body))");
    const credentialResolution = code.indexOf("const [urlRes, svcRes, anonRes]");
    const batchDispatch = code.indexOf('if (operation === "batch")');
    const serviceClient = code.indexOf("const adminClient = createClient(supabaseUrl, supabaseServiceKey)");

    expect(authorization).toBeGreaterThan(-1);
    // Primeira ocorrência do arquivo, não a partir da autorização: nada de credencial
    // ou despacho em lote antes da checagem de papel.
    expect(credentialResolution).toBeGreaterThan(authorization);
    expect(batchDispatch).toBeGreaterThan(authorization);
    // Cliente criado com `createClient(url, key)` só existe dentro do helper interno,
    // alimentado pelas credenciais resolvidas depois da autorização.
    expect(code).not.toMatch(/createClient\(\s*["'`]/);
    expect(serviceClient).toBeGreaterThan(-1);
    // O caminho de dados obtem o client cacheado do helper de credencial DEPOIS da
    // autorizacao; o aquecimento do boot usa o mesmo helper (sem dado de tenant) e
    // roda antes — por isso a assercao mira a ultima chamada, no handler, e nao a
    // declaracao do warm-up (renomear a variavel do pre-aquecimento nao invalida nada).
    const callSites = [...code.matchAll(/await\s+getCrmClient\s*\(\)/g)];
    expect(callSites.length).toBeGreaterThan(1);
    expect(callSites[callSites.length - 1].index).toBeGreaterThan(authorization);
    expect(crmBridge).toContain("const parsed = CrmRequestSchema.safeParse(rawBody)");
  });

  it("ignora comentario que cita a tag de rota ao medir o bloco", () => {
    const fonte = [
      "const toque = 1;",
      "// <Route element={<RouteSuspense><AuthenticatedShell /></RouteSuspense>}>",
      "<Route element={<RouteSuspense><AuthenticatedShell /></RouteSuspense>}>",
      "  <Route element={<ProtectedRoute />}>",
      "  </Route>",
      "</Route>",
      'const link = "https://exemplo.test/x"; <Route element={<AdminRoute />}>',
      "</Route>",
    ].join("\n");

    // A abertura citada dentro do comentario nao conta: o bloco comeca na tag real.
    expect(routeBlockRange(fonte, SHELL_BLOCK)).toEqual({ start: 2, end: 5 });
    // `//` dentro de string nao engole o resto da linha (a tag na mesma linha continua valendo).
    expect(routeBlockRange(fonte, ADMIN_BLOCK)).toEqual({ start: 6, end: 7 });

    // Abertura citada so em comentario nao pode virar "a proxima rota qualquer".
    const soComentario = [
      "// <Route element={<AdminRoute />}>",
      "<Route element={<ProtectedRoute />}>",
      "</Route>",
    ].join("\n");
    expect(routeBlockRange(soComentario, ADMIN_BLOCK)).toEqual({ start: -1, end: -1 });
    expect(routeBlockRange(soComentario, PROTECTED_BLOCK)).toEqual({ start: 1, end: 2 });
  });

  it("protege diagnosticos detalhados e mantem ping agregado", () => {
    expect(crmBridge).toContain('if (!diagnosticAuth.userRoles.includes("dev"))');
    expect(crmBridge).not.toContain("svc_last4");
    expect(crmBridge).not.toContain("anon_last4");

    // Contrato do ping sem autenticação: só `ok` e `status`, nunca o snapshot.
    const ping = crmBridge.indexOf('if (diagOp === "ping") {');
    const pingResponse = crmBridge.slice(ping, crmBridge.indexOf("if (diagOp) {", ping));
    expect(ping).toBeGreaterThan(-1);
    expect(pingResponse).toContain(
      'jsonResponse({ ok: true, status: crmWarmupCompleted ? "ready" : "starting" })',
    );
    expect(pingResponse).not.toContain("buildDiagSnapshot");
  });

  it("nao registra valores de filtros nem previews de registros do CRM", () => {
    expect(crmBridge).not.toContain("filters=${JSON.stringify(filters)}");
    expect(crmBridge).not.toContain("preview: diagnostic.preview");
    expect(crmBridge).toContain('preview: "[redacted]"');
  });

  it("nega clientId antes da primeira busca de PII no expert-chat", () => {
    const authorization = expertChat.indexOf("if (clientId && !canUseClientContext(auth.userRoles))");
    const auditInsert = expertChat.indexOf("if (clientId) {");
    const clientDataFetch = expertChat.indexOf("// ── Client data fetch ──");
    const credentialResolution = expertChat.indexOf('resolveCredential("EXTERNAL_CRM_URL")');

    expect(authorization).toBeGreaterThan(-1);
    expect(auditInsert).toBeGreaterThan(authorization);
    // O `if (clientId)` logo após a autorização só registra auditoria: o que prova
    // a barreira é o bloco de dados e a resolução da credencial do CRM externo.
    expect(clientDataFetch).toBeGreaterThan(authorization);
    expect(credentialResolution).toBeGreaterThan(clientDataFetch);
    expect(expertChat).toContain("hasActivePortalMembership(membershipProfile, auth.userRoles)");
  });

  it("monta as rotas de clientes uma unica vez, na area autenticada e fora do bloco AdminRoute", () => {
    const lines = appRoutes.split(/\r?\n/);
    const admin = routeBlockRange(appRoutes, ADMIN_BLOCK);
    const shell = routeBlockRange(appRoutes, SHELL_BLOCK);
    const clientsRoutes = lines.filter((line) => line.includes('path="/clientes"'));
    const detailRoutes = lines.filter((line) => line.includes("path={CLIENT_DETAIL_ROUTE}"));
    const clientsRoute = lines.indexOf(clientsRoutes[0] ?? "");
    const clientDetailRoute = lines.findIndex((line) => line.includes("path={CLIENT_DETAIL_ROUTE}"));

    expect(admin.start).toBeGreaterThan(-1);
    expect(admin.end).toBeGreaterThan(admin.start);
    expect(shell.start).toBeGreaterThan(-1);
    expect(shell.end).toBeGreaterThan(shell.start);
    // Contrato: `/clientes` e `/clientes/:id` NAO pertencem ao bloco AdminRoute.
    // Sao rotas compartilhadas (MainLayout) e vivem dentro do shell autenticado;
    // duplicar a rota criaria um segundo caminho sem a guarda aplicada ao primeiro.
    expect(clientsRoutes.length).toBe(1);
    expect(detailRoutes.length).toBe(1);
    expect(clientsRoute).toBeGreaterThan(shell.start);
    expect(clientsRoute).toBeLessThan(shell.end);
    expect(clientDetailRoute).toBeGreaterThan(shell.start);
    expect(clientDetailRoute).toBeLessThan(shell.end);
    expect(clientsRoute > admin.start && clientsRoute < admin.end).toBe(false);
    expect(clientDetailRoute > admin.start && clientDetailRoute < admin.end).toBe(false);
    expect(clientRoutes).toContain('CLIENT_DETAIL_ROUTE = "/clientes/:id"');
  });

  it("mantem a criacao de orcamento dentro do shell autenticado", () => {
    const lines = appRoutes.split(/\r?\n/);
    const protectedRange = routeBlockRange(appRoutes, PROTECTED_BLOCK);
    const shell = routeBlockRange(appRoutes, SHELL_BLOCK);
    const admin = routeBlockRange(appRoutes, ADMIN_BLOCK);
    const quoteRoutesMount = lines.findIndex((line) => line.includes("{quoteRoutes.map"));

    expect(quoteRoutes).toContain('path: "/orcamentos/novo"');
    expect(quoteRoutesMount).toBeGreaterThan(-1);
    expect(admin.start).toBeGreaterThan(-1);
    expect(admin.end).toBeGreaterThan(admin.start);
    expect(protectedRange.start).toBeGreaterThan(-1);
    expect(shell.start).toBeGreaterThan(protectedRange.start);
    expect(shell.end).toBeLessThan(protectedRange.end);
    // A protecao vem do aninhamento: a montagem precisa ficar entre a abertura e o
    // fechamento do shell autenticado — e nunca dentro do bloco exclusivo de admin.
    expect(quoteRoutesMount).toBeGreaterThan(shell.start);
    expect(quoteRoutesMount).toBeLessThan(shell.end);
    expect(quoteRoutesMount > admin.start && quoteRoutesMount < admin.end).toBe(false);
  });

  it("seletores de orcamento usam somente o DTO dedicado do bridge", () => {
    expect(companySearch).toContain("fetchQuoteDirectoryCompanies");
    expect(companySearch).not.toContain("searchCrm(");
    expect(companyContactSelector).toContain("fetchQuoteDirectoryCompanies");
    expect(companyContactSelector).toContain("fetchQuoteDirectoryContacts");
    expect(companyContactSelector).not.toContain("contact_emails");
    expect(companyContactSelector).not.toContain("contact_phones");
    // Filtros repetidos em varias consultas escondem regressao: cada bloco e verificado sozinho.
    const companies = sliceBetween(
      crmBridge,
      "async function handleQuoteCompanies(",
      "async function handleQuoteContacts(",
    );
    const contacts = sliceBetween(
      crmBridge,
      "async function handleQuoteContacts(",
      "async function handleIndustryPeers(",
    );

    expect(companies).not.toBe("");
    expect(contacts).not.toBe("");
    expect(companies).toContain('.eq("is_customer", true)');
    expect(companies).toContain('.is("deleted_at", null)');
    expect(companies).toContain('"cnpj", "ramo_atividade"');
    expect(contacts).toContain('.eq("is_customer", true)');
    expect(contacts).toContain('.is("deleted_at", null)');
    expect(contacts).toContain('.in("contact_id", contactIds)');
    // O DTO de empresa nao carrega e-mail nem telefone.
    expect(companies).not.toMatch(/contact_(emails|phones)/);
    expect(companies).not.toContain("contact_id");
  });

  it("seletores de carrinho usam o diretorio restrito e nao o CRM generico", () => {
    expect(cartCompanyOptions).toContain("fetchQuoteDirectoryCompanies");
    expect(cartCompanyOptions).not.toContain("selectCrm(");
    expect(cartCompanyOptions).not.toContain("searchCrm(");
    for (const picker of [cartCompanyPicker, cartCompanyPickerDialog]) {
      expect(picker).toContain("fetchCartCompanyOptions");
      expect(picker).not.toContain("selectCrm(");
      expect(picker).not.toContain("searchCrm(");
      expect(picker).toContain('queryKey: ["cart-sicoob-company-options"]');
      expect(picker).toContain('role="alert"');
      expect(picker).toContain("Tentar novamente");
    }
  });
});
