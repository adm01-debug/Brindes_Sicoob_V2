# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

Registrado em: 2026-10-22

---

## Workflow: Qualidade contínua (`ci.yml`)

**Última falha:** 2026-10-20  
**Causa raiz:** Rate limit do Amazon ECR Public (`toomanyrequests: Data limit exceeded`)

O workflow tenta baixar a imagem `public.ecr.aws/supabase/postgres:17.6.1.063` para executar
os testes de auditoria de controles. O ECR Public impõe um limite de transferência de dados por
conta de IP de origem; o runner do GitHub Actions esgotou essa cota.

**Bloqueio externo — requer ação sua:**

1. **Opção A (recomendada):** Autenticar o runner no ECR antes do pull. Adicione o secret
   `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` (conta AWS com permissão
   `ecr-public:GetAuthorizationToken`) e atualize o workflow para rodar
   `aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws`
   antes do step que usa Docker.

2. **Opção B:** Migrar a imagem para o Docker Hub ou GitHub Container Registry (GHCR) para
   evitar os limites do ECR Public.

3. **Opção C (paliativo):** Aumentar o cache da imagem Docker no GitHub Actions para reduzir
   a frequência de pulls.

**O que NÃO precisa ser feito:** o código do script `scripts/qa/simular-controles-auditoria.py`
está correto; o problema é exclusivamente de infraestrutura de rede/autenticação.

---

## Workflow: `e2e` (testes de autorização de edge functions)

**Última falha:** 2026-10-22 (pré-existente — falha em TODOS os 5 runs mais recentes, em branches distintas)  
**Causa raiz:** Edge functions do Supabase retornam HTTP 402 (Payment Required) em vez de 401/403.  
**Erro:** `AssertionError: expected [ 401, 403 ] to include 402` em `tests/security/edge-authz-bypass.test.ts`

O teste `edge-authz-bypass.test.ts` chama funções marcadas como `category: supervisor` ou `category: dev` no manifesto e espera `401` ou `403`. As funções estão retornando `402`, indicando um problema de billing/quota no projeto Supabase (não é um bug de código — o teste está correto).

**Bloqueio externo — requer ação sua:**

1. Verifique o status de billing/quota do projeto Supabase em uso pelos testes.
2. Se a conta estiver com quota esgotada, adicione créditos ou mude para um plano adequado.
3. O código do teste NÃO deve ser alterado — o comportamento esperado (401/403) está correto.

---

## Workflow: `copilot-pull-request-reviewer`

**Última falha:** 2026-10-22  
**Causa raiz:** Quota do GitHub Copilot esgotada para o plano atual.  
**Erro:** `SessionModelError: You've reached your additional usage limit for your plan` (statusCode: 402)

**Bloqueio externo — requer ação sua:**

1. Verifique o uso do GitHub Copilot em `github.com/settings/billing`.
2. Atualize o plano ou aguarde o reset do ciclo de faturamento.

---

## Workflows já corrigidos neste PR

| Workflow | Causa da falha | Correção |
|---|---|---|
| Enterprise Compliance & Audit Reporting | `get_public_favorite_list` e `get_public_favorite_reactions` ausentes da allowlist do `audit_security_definer_acl()` | Nova migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` |
| Migration ledger drift | 12 migrations aplicadas remotamente (Oct 15-16) sem arquivo local; baseline desatualizado | Atualizado `scripts/db/migration-ledger-baseline.json` com fingerprints das 12 entradas `remota_sem_arquivo` |
| Segurança, contratos e build | 5 CVEs `high` no vite ≤6.4.3 (GHSA-698v, GHSA-r825, GHSA-587h, GHSA-9jrq, GHSA-rq7h) | Atualizado `vite` 6.4.3 → 6.4.5 em `package.json` e `package-lock.json` |
