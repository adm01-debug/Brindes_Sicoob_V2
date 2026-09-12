# Revalidação corretiva do plano — 12/09/2026

Esta rodada voltou aos 20 achados da auditoria, simulou falhas de concorrência, adulteração de payload, troca de sessão, erro silencioso, acesso fora de escopo e gravação parcial, e implementou as correções que podem ser demonstradas localmente. O resultado é **15 achados corrigidos localmente e cinco ainda dependentes de implementação complementar ou validação externa**. O portal não deve ser declarado 10/10 nem pronto em produção antes das condições finais deste documento.

O checklist original de 100 etapas e 1.000 subetapas permanece como inventário histórico. A classificação anterior não é reescrita retroativamente: esta é a evidência delta produzida depois daquela revisão.

Uma revisão complementar reavaliou os **62 apontamentos de código recebidos no PR**, conferindo cada um contra a implementação atual. O candidato passou a cobrir, entre outros pontos, escopo organizacional no versionamento, invariância da versão vigente, idempotência semântica, autorização financeira, estorno auditável, URLs assinadas renováveis, isolamento de recebimentos por PA, sincronização logística, preço e estoque agregados por variante, registro de login inválido e fallback PWA executado sobre build de produção. As 62 discussões foram resolvidas no GitHub. Os gates remotos do predecessor `06bf7021d` passaram, exceto o bloqueio explícito das credenciais E2E ausentes; o delta de conversão de kit exige nova execução remota após o push.

## Resultado por achado

| Achado | Situação atual | Evidência e limite |
|---|---|---|
| A01 — logística canônica | Corrigido localmente | Fluxo canônico e documentos privados já estavam corrigidos; falta aplicação e operação real. |
| A02 — financeiro e piloto | Corrigido localmente | Tabelas Sicoob próprias para notas, parcelas e versões de arte; RPCs protegem autorização, soma, liquidação, versão, decisão e produção sem arte aprovada. |
| A03 — recompra | Corrigido localmente | A consulta de preço/estoque saiu do navegador e foi para `sicoob-reorder`; a RPC é exclusiva de `service_role`, atômica e idempotente. Catálogo e produção ainda precisam estar publicados. |
| A04 — autosave | Corrigido localmente | Zero linhas é erro; gravações concorrentes são serializadas; respostas de outro usuário/kit são descartadas. |
| A05 — estoque de kit | Parcial | A conversão agora passa pela Edge Function autenticada `sicoob-kit-quote`: demanda duplicada é agregada por produto/variante, preço/estoque/técnica são reconsultados, e orçamento, itens e personalizações são gravados por RPC atômica e idempotente. O catálogo externo somente leitura ainda não reserva estoque; a semântica operacional dessa reserva depende de contrato externo. |
| A06 — indicadores | Corrigido localmente | Dashboards consultam fontes reais, propagam erro, distinguem ausência de configuração e removeram lotes, GPS, metas e percentuais fabricados. |
| A07 — versionamento | Corrigido localmente | RPC transacional, raiz de família, bloqueio de ciclos e testes já estavam implementados. |
| A08 — contexto | Corrigido localmente | Geração de requisição descarta respostas obsoletas, falha fecha o contexto e organização persistida é segregada por usuário. |
| A09 — histórico de busca | Corrigido localmente | Histórico segmentado e coberto por regressão. |
| A10 — redação comercial | Corrigido localmente | Redação recursiva e contrato somente leitura cobertos por regressão. |
| A11 — exportação | Corrigido localmente | CSV de campanhas já estava corrigido; exportação Sicoob também deixou de expor colunas fictícias e passou a escapar células. |
| A12 — eventos | Corrigido localmente | Mudanças de status e notificações in-app são transacionais. |
| A13 — CodeQL | Código corrigido; painel externo pendente | O CodeQL remoto analisou o predecessor `06bf7021d` e preservou um SARIF com zero resultados; o delta atual aguarda o novo gate remoto. A primeira varredura havia identificado um `js/user-controlled-bypass` no tratamento de erro do callback SSO, já corrigido com motivos fechados e mensagens fixas. O painel recusou a publicação porque code scanning está desabilitado no repositório privado; o workflow publica quando `CODEQL_UPLOAD_ENABLED=true`. |
| A14 — CI autenticada | Configurado; execução externa pendente | O workflow agora falha se as quatro credenciais E2E não existirem e não pula silenciosamente o gate autenticado. Falta executar com secrets e dados de homologação. |
| A15 — política institucional | Parcial | Snapshot, precedência, vínculo ativo, alçada e autoaprovação estão protegidos. Delegações e aceite formal da política por cooperativa dependem dos responsáveis Sicoob. |
| A16 — distribuição | Corrigido localmente | Consolidação vincula pedidos atomicamente, distribui por PA/item, exige alocação antes do despacho e registra recebimento parcial, avaria e falta em eventos imutáveis. |
| A17 — política imutável | Corrigido localmente | Fotografia de política, precedência específica e referências protegidas foram testadas em PostgreSQL descartável. |
| A18 — itens aprovados | Corrigido localmente | Guardas verificam origem e destino e congelam composição/valor nos estados protegidos. |
| A19 — poder dos E2E | Parcial | Happy paths exigem conteúdo específico e timeouts exigem estado observável; o fluxo 26 verifica catálogo e composição. Ainda falta comprovar o efeito persistido da compra completa em homologação. |
| A20 — vistos recentemente | Corrigido localmente | Store, storage e debounce são segregados por usuário/organização e limpos na troca de sessão. |

## Falhas adversariais simuladas

- Edição retroativa e troca da política depois da submissão.
- Autoaprovação, aprovador sem vínculo, precedência global/específica e transferência de item entre pedidos.
- Recompra repetida, payload divergente, ator fora do escopo, catálogo vencido e falha no insert do item.
- Adulteração direta de parcela, soma acima do pedido, alteração de pagamento liquidado, autoaprovação de arte e início de produção sem arte vigente aprovada.
- Consolidação repetida, pedido inelegível, lote sem alocação, recebimento em excesso, recebimento por outra PA e divergência sem justificativa.
- Autosave com zero linhas, duas gravações fora de ordem, retorno antigo após troca de contexto e memória de produtos entre sessões.
- Página pública com resposta correta, conteúdo errado, backend lento e erro acionável.
- Conversão de kit com preço do navegador adulterado, duas linhas consumindo o mesmo saldo, técnica de outro produto, perda de resposta após commit e falha forçada entre cabeçalho e item.
- Preview Vercel legítimo e tentativa de origem `*.vercel.app` pertencente a outro projeto.

## Evidências executadas

| Verificação | Resultado local |
|---|---|
| Build de produção e `npm audit` do gate | Aprovado. |
| Performance do login | Bundle público reduzido de ~92 KB para ~57 KB gzip; Lighthouse local 3/3 aprovado, LCP entre 2.128 ms e 2.264 ms, performance 0,97 e TBT 0 ms. |
| ESLint por baseline | Aprovado; 59 erros a menos que `origin/main` nos arquivos avaliados. |
| TypeScript por baseline | Aprovado; baseline reduzido de 1.214 para 1.189 diagnósticos, sem regressões nos arquivos alterados. |
| Testes unitários alterados | 66/66 aprovados na rodada corretiva final dos três arquivos legados. |
| Regressões complementares do fechamento | 38/38 aprovadas em oito arquivos de teste. |
| Suíte ampliada do Kit Builder | 167/167 aprovados em 12 arquivos. |
| Regressões dirigidas da auditoria | 44/44 aprovadas. |
| Sanitização PostgREST em Deno | 5/5 aprovadas. |
| Autorização de Edge Functions | 103/103 funções declaradas e com mecanismo de enforcement. |
| CodeQL remoto | Varredura do predecessor `06bf7021d` concluída e SARIF preservado com zero resultados; o delta atual aguarda novo gate remoto. A publicação no painel permanece indisponível enquanto code scanning estiver desabilitado no repositório. |
| Simulações PostgreSQL | Oito cenários aprovados: verba, eventos de status, política, versionamento, recompra, conversão de kit, financeiro/arte e consolidação. |
| Catálogo do Kit Builder | Falha de consulta deixa de carregar produtos fictícios; a UI informa o erro e oferece nova tentativa. CORS aceita somente os domínios Vercel do projeto. |
| PWA em produção local | 1/1 aprovado em Chromium: Service Worker ativo, shell precacheado e fallback offline real. |
| E2E público reforçado | 6/6 happy paths e 6/6 estados de timeout aprovados em Chromium. |
| Regressão funcional do login otimizado | 8/8 em Vitest e 3/3 em Chromium; validação acessível e recuperação de senha sob demanda. |
| Suíte Vitest global | Aprovada: 1.427/1.427 arquivos; 5.401 testes aprovados, zero falhas, 113 condicionais ignorados e 34/34 snapshots íntegros. |

Os JSONs em [evidências](evidencias/) registram os cenários SQL. Nenhuma simulação acessou os bancos remotos, aplicou migration, publicou Edge Function ou alterou dados reais.

## Checklist obrigatório de conclusão

- [x] Diagnóstico e simulações adversariais executados antes do fechamento.
- [x] A01, A02, A03, A04, A06–A12, A16–A18 e A20 corrigidos no candidato local.
- [x] Build, lint, tipos, testes dirigidos, Deno, autorização de edges e SQL executados.
- [x] Dívida executável da suíte Vitest global corrigida: zero falhas em 1.427 arquivos e 5.401 testes aprovados.
- [x] Todos os 62 apontamentos de revisão de código reavaliados e seus achados ainda válidos tratados no candidato local.
- [x] Fallback offline da PWA validado sem atalho ou skip em build de produção.
- [x] Projeto Supabase local apontado para o banco próprio `cfmzkthhgliqelozlmwu`.
- [x] Implementar validação servidor, preço vigente e persistência atômica da conversão de kit em orçamento (A05).
- [ ] Definir e implementar a semântica de reserva no catálogo externo somente leitura (A05).
- [ ] Publicar migrations e Edge Functions no projeto próprio e repetir os testes via API/RLS reais.
- [ ] Configurar os quatro secrets E2E e executar as jornadas autenticadas com duas cooperativas segregadas (A14/A19).
- [ ] Habilitar code scanning no repositório, definir `CODEQL_UPLOAD_ENABLED=true` e encerrar os alertas do SARIF no painel (A13).
- [ ] Obter aceite de marca, alçadas, delegações, jurídico/LGPD e operação logística/financeira com responsáveis nominais (A15).
- [ ] Homologar compra completa com catálogo, orçamento, aprovação, arte, pagamento, produção, distribuição e recebimento persistidos.
- [ ] Fazer deploy controlado, smoke pós-deploy, observabilidade e aceite com tráfego real.

Enquanto qualquer caixa acima permanecer aberta, “pronto”, “10/10” e “produção concluída” não são afirmações sustentadas pela evidência.
