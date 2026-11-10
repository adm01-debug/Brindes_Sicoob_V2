#!/usr/bin/env node
/**
 * check-smoke-tags — Garante que todo `test(...)` em
 * `e2e/flows/20-all-features-smoke.spec.ts` está dentro de um
 * `test.describe(...)` cujo título contenha a tag `@smoke`.
 *
 * Por quê: o project Playwright `chromium-smoke` usa `grep: /@smoke/`
 * (vide playwright.config.ts). Tests fora de um describe `@smoke` são
 * silenciosamente IGNORADOS pelo gate — bug invisível.
 *
 * Estratégia (AST do TypeScript — o parser por linha anterior perdia `test(` com o título na linha
 * seguinte, título em variável, alias `const it = test`, `test.fail()` e tratava
 * `test.describe.serial/parallel` como se não fosse describe):
 *   1. Percorre a árvore; cada `test.describe[.serial|.parallel|.skip|.only|.fixme](título, fn)` empilha o título
 *      enquanto visita `fn` (`test.describe.configure` não é bloco).
 *   2. Cada registro de teste — `test|test.skip|test.only|test.fixme|test.fail(título, [detalhes,] fn)` ou o
 *      mesmo por alias — precisa ter ALGUM describe ativo com `@smoke` no título.
 *      `test.skip(condição, motivo)` dentro de um teste (sem função) não é registro e é ignorado.
 *   3. Falha hard (exit 1) se houver violações OU se o array `SMOKE_COVERAGE` estiver vazio (sanity).
 *
 * Uso:
 *   node scripts/check-smoke-tags.mjs           # local
 *   npm run check:smoke-tags                    # alias
 *   (CI: roda no workflow E2E antes do gate)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = resolve(ROOT, "e2e/flows/20-all-features-smoke.spec.ts");

const C = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};
const isCI = process.env.CI === "true" || process.env.CI === "1";

const DESCRIBE_MODIFIERS = new Set(["serial", "parallel", "skip", "only", "fixme", "fail"]);
const TEST_MODIFIERS = new Set(["skip", "only", "fixme", "fail"]);

/** "a.b.c" de uma cadeia de acessos (`test.describe.serial`); null se não for só identificadores. */
function chain(expression) {
  if (ts.isIdentifier(expression)) return [expression.text];
  if (ts.isPropertyAccessExpression(expression)) {
    const base = chain(expression.expression);
    return base ? [...base, expression.name.text] : null;
  }
  return null;
}

/** Título legível do primeiro argumento (literal, template ou o texto da expressão). */
function titleOf(node, sf) {
  if (!node) return "";
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) return node.getText(sf).slice(1, -1);
  return `<${node.getText(sf)}>`;
}
const isFunction = (node) => node && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));

/**
 * Analisa o fonte do spec. Devolve os testes registrados, as violações (fora de describe @smoke)
 * e a quantidade de entradas de SMOKE_COVERAGE.
 */
export function analyzeSmokeSpec(source) {
  const sf = ts.createSourceFile("smoke.spec.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  // `const it = test;` / `const t = test;` — o alias registra testes igual.
  const aliases = new Set(["test"]);
  (function findAliases(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isIdentifier(node.initializer) && aliases.has(node.initializer.text)) {
      aliases.add(node.name.text);
    }
    ts.forEachChild(node, findAliases);
  })(sf);

  const testsSeen = [];
  const violations = [];

  function visit(node, describes, insideTest) {
    if (ts.isCallExpression(node)) {
      const path = chain(node.expression);
      const args = node.arguments;
      if (path && aliases.has(path[0])) {
        const [, second, third] = path;
        if (second === "describe" && path.length <= 3 && (path.length === 2 || DESCRIBE_MODIFIERS.has(third))) {
          const callback = args.find(isFunction);
          if (callback) {
            const next = [...describes, titleOf(args[0], sf)];
            ts.forEachChild(node, (child) => visit(child, child === callback || callback.pos <= child.pos ? next : describes, insideTest));
            return;
          }
        } else if (!insideTest && (path.length === 1 || (path.length === 2 && TEST_MODIFIERS.has(second))) && args.length >= 2 && isFunction(args[args.length - 1])) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          const title = titleOf(args[0], sf);
          const hasSmoke = describes.some((t) => /@smoke\b/.test(t));
          testsSeen.push({ line, title, describes: [...describes], hasSmoke });
          if (!hasSmoke) {
            violations.push({ line, test: title, describes: describes.length > 0 ? [...describes] : ["(top-level — sem describe)"] });
          }
          ts.forEachChild(node, (child) => visit(child, describes, true));
          return;
        }
      }
    }
    ts.forEachChild(node, (child) => visit(child, describes, insideTest));
  }
  visit(sf, [], false);

  const covMatch = source.match(/const\s+SMOKE_COVERAGE\s*=\s*\[([\s\S]*?)\]\s*as const/);
  const covCount = covMatch ? [...covMatch[1].matchAll(/(?:"[^"]+"|'[^']+'|`[^`]+`)/g)].length : 0;
  return { testsSeen, violations, covCount };
}

function main() {
  if (!existsSync(SPEC)) {
    console.error(`${C.red}❌ Spec do smoke não encontrado: ${SPEC}${C.reset}`);
    process.exit(2);
  }
  const { testsSeen, violations, covCount } = analyzeSmokeSpec(readFileSync(SPEC, "utf8"));

  console.log(`${C.bold}═══ check-smoke-tags ═══${C.reset}`);
  console.log(`${C.dim}Spec:${C.reset} e2e/flows/20-all-features-smoke.spec.ts`);
  console.log(
    `${C.dim}Tests detectados:${C.reset} ${testsSeen.length}  ${C.dim}|${C.reset}  ` +
      `${C.dim}SMOKE_COVERAGE:${C.reset} ${covCount} entradas`,
  );

  let exitCode = 0;

  if (covCount === 0) {
    console.error(`\n${C.red}❌ SMOKE_COVERAGE está vazio ou ausente.${C.reset}`);
    exitCode = 1;
  }
  // Zero testes detectados num spec de smoke é falha do analisador/do spec, não "tudo sob @smoke".
  if (testsSeen.length === 0) {
    console.error(`\n${C.red}❌ Nenhum test() detectado no spec do smoke (spec vazio ou padrão não reconhecido).${C.reset}`);
    exitCode = 1;
  }

  if (violations.length === 0) {
    if (testsSeen.length > 0) {
      console.log(`\n${C.green}✅ Todos os ${testsSeen.length} test() estão sob describe @smoke.${C.reset}\n`);
    }
  } else {
    console.error(`\n${C.red}❌ ${violations.length} test(s) FORA de describe @smoke:${C.reset}\n`);
    for (const v of violations) {
      console.error(`  ${C.red}✗${C.reset} ${C.bold}${SPEC.replace(ROOT + "/", "")}:${v.line}${C.reset}`);
      console.error(`      test: "${v.test}"`);
      console.error(`      describes ativos: ${v.describes.map((d) => `"${d}"`).join(" › ") || "—"}`);
      if (isCI) {
        // Annotation clicável no PR (aba "Files Changed").
        const safeMsg = `Test "${v.test}" não está sob describe @smoke — ficará INVISÍVEL ao gate (grep /@smoke/ no chromium-smoke).`;
        console.log(
          `::error file=e2e/flows/20-all-features-smoke.spec.ts,line=${v.line},title=Smoke tag missing::${safeMsg}`,
        );
      }
    }
    console.error(
      `\n${C.yellow}→ Solução:${C.reset} envolver o(s) test(s) em ` +
        `${C.bold}test.describe("@smoke ...", () => { ... })${C.reset} ` +
        `ou mover para fora do spec do smoke.\n`,
    );
    exitCode = 1;
  }

  process.exit(exitCode);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
