# Auditoria de validação — 16/10/2026

## Escopo

Auditoria coordenada em cinco especialidades: banco/RLS, Edge Functions e
autenticação, frontend/UX, privacidade/IA e contratos E2E. O ambiente continua
em construção; nenhuma evidência deste documento equivale a tráfego real de
produção.

## Correções validadas

- Telemetria de busca rejeita termo vazio, resultado negativo e contexto JSON
  inválido; os três `CHECKs` estão validados no banco canônico.
- Quotas de IA cobrem os nove papéis, falham fechadas, impedem BOLA, reservam
  chamadas concorrentes e expiram reservas abandonadas após 15 minutos.
- `expert-chat` minimiza dados de CRM, remove fornecedor e identificadores,
  neutraliza filtros PostgREST, separa contexto não confiável do system prompt,
  registra acesso sensível e limita entrada e saída.
- `trends-insights` autentica antes de consultar segredo, mascara PII em buscas,
  valida a resposta com Zod, limita abuso e contabiliza uso.
- Streams de IA solicitam `include_usage` e finalizam o log com tokens e custo.
- Favoritos públicos usam RPC por token. `anon` não enumera as tabelas; tokens
  expirados ou inválidos não retornam dados; `user_id` e pseudônimos de terceiros
  não integram o payload público.
- Caches remotos de favoritos são particionados por usuário e a troca direta de
  conta limpa a cópia local sensível.
- Autosave descarrega a última edição ao desmontar, reinicia o baseline quando a
  chave muda e não restaura dados opcionais da cotação anterior.
- Falhas de favoritos e telemetria aparecem como erro acionável; não são
  convertidas em lista vazia ou indicador verde igual a zero.
- Busca de empresa descarta resposta obsoleta e o seletor de contato ganhou
  semântica e navegação por teclado.

## Banco canônico

Migrations aplicadas atomicamente e registradas com hash:

1. `20261016160000_validate_search_analytics_payload`
2. `20261016163000_harden_ai_usage_quotas`
3. `20261016170000_restore_public_favorite_shares`
4. `20261016171500_secure_public_favorite_share_rpc`
5. `20261016172000_minimize_public_favorite_share_payload`
6. `20261016173000_remove_redundant_pa_budget_select_policy`

A prova RLS criou três listas e dois itens dentro de uma transação, assumiu o
papel `anon`, confirmou visibilidade apenas pelo token válido e executou
`ROLLBACK`. A consulta posterior encontrou zero fixtures. O advisor de
performance terminou com `No issues found`.

## Evidências automatizadas

- PostgreSQL descartável: 7/7 contratos de quota e 17/17 contratos de busca.
- Deno: 11/11 testes compartilhados e `deno check` das funções alteradas.
- Vitest completo: 514 arquivos e 6.122 testes aprovados; 4 arquivos e 68
  testes ignorados pela dívida histórica já catalogada.
- Vitest focal final: 8 arquivos e 39/39 testes das áreas alteradas.
- Playwright das rotas alteradas: 11/11, um worker e zero retry, cobrindo a
  lista pública e os guards de favoritos e telemetria.
- Smoke remoto: `expert-chat` v12 e `trends-insights` v9 retornam 401 sem JWT e
  com JWT inválido; CORS reflete os domínios Vercel autorizados e bloqueia origem
  desconhecida no navegador.
- Build de produção concluído; gates de TypeScript e ESLint terminaram com zero
  erros e zero regressões em relação a `origin/main`.
- `npm audit` completo e limitado às dependências de produção: zero alerta em
  todos os níveis para 1.047 dependências instaladas.
- Gate de migrations confirmou os 37 artefatos autorizados e seus hashes; o gate
  de testes críticos confirmou 27/27 skips históricos, sem aumento silencioso.
- Graphify foi atualizado de forma incremental e reclusterizado: 32.642 nós,
  58.531 relações e 2.621 comunidades.
- Tipos Supabase regenerados diretamente do schema canônico.

## Pendências externas e dívida preexistente

- `LOVABLE_API_KEY` está ausente. Não é possível certificar uma resposta real do
  provedor de IA até o segredo ser cadastrado.
- O uso de dados de CRM pelo Lovable depende de decisão do DPO/jurídico sobre
  DPA, base legal, subprocessadores, opt-out e transferência internacional.
- O gate agora contabiliza 27 skips críticos históricos, incluindo 23 cenários
  Playwright P0. O lote impede aumento silencioso dessa dívida, mas não declara
  funcionalidades ainda não implementadas como aprovadas.
- O advisor de segurança ainda lista 150 avisos: duas RPCs públicas de favoritos
  deste lote, uma RPC pública histórica de convite, 146 funções autenticadas
  históricas e a configuração de proteção contra senhas vazadas. As duas RPCs
  de favoritos são
  `SECURITY DEFINER`; isso é intencional, limitado por token, payload mínimo,
  `search_path` fixo e ACL explícita. A proteção contra senhas vazadas precisa
  ser ativada no painel Auth quando o projeto for preparado para produção.
