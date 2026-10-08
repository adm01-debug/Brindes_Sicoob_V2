# Rotação de credenciais — Brindes Sicoob V2

- **Projeto:** `adm01-debug/Brindes_Sicoob_V2`
- **Supabase canônico:** `cfmzkthhgliqelozlmwu`
- **Ambiente atual:** construção
- **Última revisão:** 07/10/2026
- **Responsável operacional:** administrador do projeto

Este runbook separa chaves públicas de credenciais privadas, registra os
consumidores conhecidos e define uma rotação verificável. Nunca copie valores
de credenciais para este arquivo, issues, PRs, logs ou artefatos de CI.

## Classificação

| Item                                         | Sigilo                     | Escopo conhecido                                 | Rotação ordinária                            |
| -------------------------------------------- | -------------------------- | ------------------------------------------------ | -------------------------------------------- |
| URL e project ref do Supabase                | Público                    | Aplicação, CI e documentação                     | Não se aplica                                |
| `anon`/publishable key                       | Público e limitado por RLS | Frontend e testes                                | Somente em incidente ou reemissão do projeto |
| `SUPABASE_ACCESS_TOKEN`                      | Privado                    | Management API e workflows de construção         | 90 dias                                      |
| `SUPABASE_SERVICE_ROLE_KEY` ou `sb_secret_*` | Privado e privilegiado     | Auditoria, testes RLS e automação administrativa | 180 dias ou incidente                        |
| `SUPABASE_DB_URL`/senha PostgreSQL           | Privado e privilegiado     | Aplicador e auditoria de migrations              | 180 dias ou incidente                        |
| Contas `E2E_*`                               | Privado, homologação       | Playwright e jornadas autenticadas               | 90 dias                                      |
| Segredos de integrações externas             | Privado                    | Edge Functions e provedores                      | Conforme o provedor, no máximo 180 dias      |

Chaves públicas continuam exigindo RLS, autorização de Edge Functions e
limites de uso. O rótulo “pública” não permite gravar ou ler dados fora dessas
políticas.

## Estado verificado em 07/10/2026

- O `SUPABASE_ACCESS_TOKEN` está no environment protegido `construction`, e
  não no escopo geral do repositório.
- O environment aceita somente branches protegidas.
- Os secrets de E2E, banco, service role e configuração pública existem no
  GitHub; seus valores não foram copiados para evidências.
- O histórico completo foi varrido pelo Gitleaks: 14.566 commits, zero achados
  depois da classificação explícita dos falsos positivos.
- Todas as ocorrências históricas de JWT presentes na baseline foram
  decodificadas localmente sem exibir os tokens. Todas declaravam `role=anon`;
  nenhuma era `service_role`.
- As ocorrências adicionais eram hashes SHA-256 de manifesto ou UUIDs
  sintéticos de idempotência. A `.gitleaksignore` contém fingerprints exatos,
  sem regra ampla por arquivo ou tipo.
- Credenciais privadas informadas fora dos cofres devem ser tratadas como
  expostas. A revogação exige primeiro inventariar e atualizar todos os
  consumidores para evitar interrupção de outros agentes e automações.

## Consumidores conhecidos

| Credencial                   | Consumidores versionados                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `SUPABASE_ACCESS_TOKEN`      | `apply-sicoob-migrations.yml`, `deploy-sicoob-functions.yml`, `migration-ledger-drift.yml` |
| `SUPABASE_SERVICE_ROLE_KEY`  | `e2e.yml`, `security-compliance.yml`, `db-performance-audit.yml`                           |
| `SUPABASE_DB_URL`            | automações administrativas que usam conexão PostgreSQL direta                              |
| `VITE_SUPABASE_*`            | build do frontend, E2E e clientes públicos                                                 |
| `E2E_USER_*` e `E2E_ADMIN_*` | `e2e.yml` e fixtures do Playwright                                                         |

Antes de rotacionar, procure consumidores externos no Supabase, Cloudflare,
n8n, Vercel e nas estações dos operadores. O inventário só está completo
quando o responsável por cada serviço confirmar o uso.

## Procedimento para credencial privada

1. Abra uma janela de mudança e registre responsável, credencial, consumidores
   e horário, sem registrar o valor.
2. Confirme que existe acesso administrativo alternativo e backup válido.
3. Gere a credencial sucessora no provedor. Não revogue a anterior ainda.
4. Atualize primeiro GitHub Environments/Secrets e depois cada consumidor
   externo inventariado.
5. Execute os testes de leitura, autenticação, RLS, migrations e Edge Functions
   adequados ao escopo.
6. Consulte logs por uso da credencial anterior durante a janela de observação.
7. Revogue a anterior somente depois de zero consumidores pendentes.
8. Repita os testes e registre data, executor e resultado sanitizado.
9. Remova arquivos temporários e confirme que o Gitleaks continua verde.

## Validação mínima por tipo

### Access token da Management API

```bash
SUPABASE_ACCESS_TOKEN='<cofre>' \
  node scripts/db/check-migration-ledger-drift.mjs \
  --baseline-file scripts/db/migration-ledger-baseline.json
```

O resultado deve identificar o projeto canônico, aceitar a baseline revisada e
não criar, alterar ou reaplicar migrations.

### Service role ou secret key

```bash
VITE_SUPABASE_URL='https://cfmzkthhgliqelozlmwu.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='<cofre>' \
  node scripts/scan-rls-security.mjs
```

Depois, execute `npm run check:security-definer-acl` e os testes remotos de RLS.
Nunca use a credencial privilegiada no bundle do navegador.

### Senha do banco

Execute o preflight do aplicador em modo somente leitura e confirme TLS,
project ref, allowlist, hashes e ledger. A rotação não autoriza reaplicar o
passivo histórico de migrations.

### Contas E2E

Execute a configuração autenticada e ao menos uma jornada de usuário e uma de
administrador. As contas devem ser dedicadas à homologação e não podem
representar pessoas reais.

## Calendário

| Item                                                  | Última ação comprovada              | Próxima revisão máxima                |
| ----------------------------------------------------- | ----------------------------------- | ------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` do environment `construction` | 07/10/2026                          | 05/01/2027                            |
| Secrets administrativos do Supabase                   | revisão de presença em 07/10/2026   | 05/01/2027; rotacionar até 05/04/2027 |
| Senha PostgreSQL                                      | revisão de presença em 07/10/2026   | 05/01/2027; rotacionar até 05/04/2027 |
| Contas E2E                                            | revisão de presença em 07/10/2026   | 05/01/2027                            |
| Chaves públicas `VITE_*`                              | validação de contrato em 07/10/2026 | 05/04/2027                            |

“Revisão de presença” confirma somente que o secret existe no cofre. Ela não
comprova a data da última rotação; quando essa data não estiver disponível, o
responsável deve assumir a data mais antiga e antecipar a troca.

## Resposta a incidente

1. Desabilite o consumidor suspeito e preserve logs.
2. Gere sucessora e atualize consumidores conhecidos.
3. Revogue a credencial comprometida.
4. Investigue o período entre exposição e revogação.
5. Revise RLS, grants, logs administrativos e ações no GitHub.
6. Registre o incidente sem incluir tokens, senhas ou URLs com segredo.

Uma chave `service_role`, `sb_secret_*`, senha de banco ou token de conta
exposto exige rotação. Uma chave `anon`/publishable exposta exige validar RLS e
uso; sua presença no cliente é esperada e não prova, sozinha, incidente.

## Checklist de fechamento

- [ ] Consumidores internos e externos inventariados.
- [ ] Sucessora criada e armazenada somente no cofre.
- [ ] GitHub e serviços externos atualizados.
- [ ] Testes de autenticação, RLS e banco aprovados.
- [ ] Edge Functions e automações críticas validadas.
- [ ] Credencial anterior sem uso na janela de observação.
- [ ] Credencial anterior revogada.
- [ ] Gitleaks executado no histórico completo e no candidato de release.
- [ ] Evidência sanitizada registrada com data e responsável.
