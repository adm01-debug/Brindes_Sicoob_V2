# Fechamento técnico do candidato de construção — 08/10/2026

## Escopo e referência

Este relatório registra a execução técnica do plano de encerramento sobre a branch `fix/hermes-h8111165-fechamento`, baseada no commit `a974d7732` de `main`. O candidato está no [PR #98](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/98).

O ambiente continua sendo de construção. Este documento não declara lançamento, compra real, aceite de marca ou estabilidade de 30 dias. Esses marcos dependem de decisão e tráfego reais, conforme T098–T100 do plano.

## Resultado do saneamento

| Gate | Situação anterior auditada | Resultado do candidato |
|---|---:|---:|
| TypeScript | 153 diagnósticos | 0 diagnósticos |
| ESLint | 3.247 erros | 0 erros e 864 avisos não bloqueantes |
| Dependências | 7 alertas altos | 0 vulnerabilidades no `npm audit` |
| Vitest | baseline parcial | 419 arquivos aprovados, 4 ignorados; 5.695 testes aprovados e 68 ignorados |
| Build | não certificado no lote | build de produção aprovado |
| Deno | cobertura incompleta | 108 unidades verificadas |
| Segredos no diff | não certificado | Gitleaks do diff sem achados |

Os avisos remanescentes do ESLint são 805 ocorrências de tamanho de função, 22 duplicações de string, 18 dependências de hooks, 9 asserções não nulas, 7 nomes e 3 funções com muitos parâmetros. Eles permanecem visíveis, sem erro bloqueante e sem elevação de baseline.

## Banco canônico

Projeto conferido: `cfmzkthhgliqelozlmwu`.

- As 16 migrations autorizadas constam no repositório e no ledger remoto, sem pendência.
- O conteúdo de `20261008010000_fix_plpgsql_lint_failures.sql` foi restaurado byte a byte a partir do ledger canônico. A diferença encontrada era apenas espaço em branco dentro de corpos PL/pgSQL, mas alterava o hash do artefato aplicado; o arquivo e o ledger voltaram ao mesmo SHA-256 (`4783e63b...`).
- `supabase db lint --linked --level error` concluiu sem erro de schema.
- As 236 tabelas públicas auditadas têm RLS habilitada e ao menos uma policy.
- A auditoria de ACL de funções `SECURITY DEFINER` não encontrou concessão proibida.
- O inventário vivo corresponde ao snapshot versionado: 222 relações, 237 funções e 14 buckets, sem diferença.
- As tabelas críticas `profiles`, `quote_history`, `quotes` e `workspace_notifications` não apresentaram RLS desabilitada, policy ausente ou policy permissiva irrestrita.
- As personas de QA foram conferidas no Auth e em `user_roles`: vendedor, gestor de compras, administrador, desenvolvedor e gerente de PA. Administrador e desenvolvedor possuem TOTP verificado e atingiram AAL2 em sessão real.

O repositório conserva 491 diferenças históricas de ledger já catalogadas. Elas não foram reaplicadas em massa, pois nome de arquivo local não comprova ausência do efeito no banco. O gate usa baseline versionada e bloqueia diferença nova.

## Edge Functions e contratos remotos

- 100 funções remotas estão `ACTIVE`.
- 106 fontes locais executáveis têm categoria explícita de autorização.
- Seis fontes locais não são publicáveis por decisão registrada: `e2e-auth-test`, `error-monitor`, `generate-mockup-nanobanana`, `migrate-helper`, `qa-block-monitor` e `sicoob-seed-debug`.
- Os contratos críticos de IA, aprovação, fila e health check responderam com os códigos esperados.
- 108 unidades Deno passaram por verificação de tipos.
- O catálogo externo permanece somente leitura e ganhou contrato compartilhado para normalização e validação de produto.

## CI, E2E e reconciliação de PRs

O workflow E2E agora roda em `ubuntu-latest`, exige credenciais em vez de concluir por skip, executa validações remotas de autorização/RLS e aceita uma branch, tag ou SHA em disparo manual. As contas de vendedor, gestor, administrador e desenvolvedor usam segredos separados no GitHub; os papéis privilegiados também exigem seus segredos TOTP. O segredo de serviço fica restrito ao passo técnico que o consome.

O Deno passou a usar o cache próprio sem reescrever `node_modules`; a sequência limpa `npm ci` → Vitest → `deno check` → Playwright preservou uma única instalação dos runtimes. A espera compartilhada do Playwright também passou a enviar timeouts no parâmetro correto da API, eliminando esperas até o limite global. O teste PWA de produção foi desacoplado da rota de demonstração e aprovou registro do Service Worker, cache do shell e fallback offline real. A QA visual aprovou login, demonstração e loja em 1440, 390 e 320 pixels, sem erro de página, violação WCAG ou overflow horizontal.

Os reparos úteis dos PRs #92, #93, #94 e #97 foram incorporados ao PR #98. Os PRs anteriores só devem ser encerrados como substituídos depois da aprovação dos gates do candidato consolidado.

Na estação local, a suíte de navegador autenticada anterior concluiu 277 casos com 185 aprovados, 92 skips explícitos e zero falhas. Uma rodada consolidada posterior revelou contratos frágeis e um conflito real entre o tour de onboarding e o gate MFA; ambos foram corrigidos. A autenticação canônica criou e validou os quatro estados de sessão em sequência, incluindo administrador e desenvolvedor com TOTP/AAL2. A regressão genérica foi coberta em lotes equivalentes a 55 aprovações e um skip declarado; as suítes específicas de gestor e desenvolvedor cobriram 17/17 casos; e o smoke autenticado terminou com 38/38 aprovações. Os cenários incluem sessão, loja, catálogo, favoritos, orçamento, estoque, kits, mockups, BI, rotas públicas e RLS. A CI do PR #98 repete os gates obrigatórios em ambiente hospedado e isolado.

## Limites honestos do encerramento

O candidato fecha o passivo técnico mensurável deste lote e publica suas provas no GitHub. O plano integral não pode ser marcado como 100% concluído enquanto faltarem os marcos de negócio que o próprio plano exige:

1. decisão formal de piloto e responsáveis operacionais;
2. execução autorizada de operações reais em duas cooperativas;
3. comprovação de recebimento e conciliação financeira;
4. observação de 30 dias de estabilidade com tráfego real;
5. aceite final independente de produto, marketing, compras, financeiro e operação.

Esses itens não são defeitos de código nem podem ser simulados como produção. Até sua autorização, o estado correto permanece **candidato de construção tecnicamente validado**, condicionado ao CI do PR #98.
