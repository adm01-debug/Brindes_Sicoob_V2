# Correção da rota de instalação do PWA — 29/10/2026

## Lacuna

A auditoria de 11/10 registrou `/instalar` como destino quebrado. A página `PWAInstallPage` e o item do menu do cabeçalho já existiam, mas a rota não estava conectada ao roteador nem descrita na matriz RBAC.

## Alteração

- `/instalar` foi registrada entre as rotas autenticadas de ferramentas.
- A matriz RBAC declara acesso para qualquer usuário autenticado.
- O texto de desempenho da página foi localizado para pt-BR.
- O teste cobre a chamada do prompt nativo, as instruções manuais e a proteção indicada na matriz.

## Validação

- `npx vitest run tests/pages/PWAInstallPage.test.tsx tests/sicoob/rbac-routes-integrity.test.ts`: **4 testes aprovados**.
- `npm run typecheck`: **aprovado**, sem erros.
- Build, lint e suíte completa: serão repetidos após o commit segundo o gate antirregressão da branch.
- `npm run build`

Esta correção não altera o schema nem acessa o Supabase.
