# Guia de testes

## Pré-requisitos

- Node.js `>=24 <25` e npm, conforme `package.json`.
- Execute `npm ci` para instalar as dependências do lockfile.
- Testes autenticados de navegador podem exigir URL e contas/segredos de QA.
  Não aponte esses testes para o banco canônico nem grave credenciais no repo.

## Suíte Vitest

Os testes unitários, de componentes e de integração ficam principalmente em
`tests/` e são executados por:

```bash
npm test
```

Para cobertura local, use `npm run test:coverage`. O gate de cobertura usado
no CI é `npm run test:coverage:ci`. Outros gates locais executados pelo CI:

```bash
npm run typecheck:baseline
npm run lint:baseline
npm run check:npm-audit
npm run check:critical-test-skips
npm run test:scenarios
npm run build
```

`npm run typecheck` e `npm run lint` executam os verificadores diretos; os
comandos `*:baseline` comparam os resultados com os baselines versionados.

## Playwright (navegador)

Os testes Playwright estão em `e2e/` (`playwright.config.ts`, `testDir: ./e2e`).
O diretório `tests/e2e/`, quando existente, contém testes Vitest; não é a suíte
Playwright.

```bash
npm run test:e2e          # exclui tags @smoke e @header-sticky
npm run test:e2e:smoke    # smoke Playwright filtrado
npm run test:e2e:header-sticky
npm run test:e2e:pwa
npm run test:e2e:all
```

`npm run test:e2e` não inclui os testes `@smoke` nem `@header-sticky`; rode os
comandos específicos ou `test:e2e:all` para incluí-los. Os fluxos autenticados
dependem das credenciais e do ambiente configurados. Sem essa configuração, a
execução local não certifica a jornada autenticada completa. Para instalação
do Chromium, use `npm run test:e2e:install`.

## Critério de evidência

Registre comando, commit, ambiente, resultado e skips explícitos. Um teste
passando localmente valida aquele código e ambiente; não prova configuração de
segredos, estado de produção ou comportamento de integrações remotas.
