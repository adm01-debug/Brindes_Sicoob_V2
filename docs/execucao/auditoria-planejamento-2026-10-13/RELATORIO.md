# Auditoria de funcionalidades planejadas — Brindes Sicoob V2

**Data:** 13/10/2026. **Referência GitHub:** `fff0b4cb60b23715661d5782cdf747df4ef0027d` (main). **Banco consultado:** `cfmzkthhgliqelozlmwu`. **Ambiente:** construção, conforme informado pelo responsável.

**Conclusão: o planejamento ainda não está integralmente implementado.** Existem entregas técnicas aproveitáveis, funcionalidades parciais, componentes sem integração, configurações ausentes, conflitos de escopo e falhas reais em operações centrais. Não é correto dizer que falta apenas autorizar o piloto, aguardar 30 dias ou marcar checklists.

## Como ler esta auditoria

- [56 frentes consolidadas em CSV](achados-consolidados.csv): diagnóstico, prioridade, evidências, etapas relacionadas e o que falta. São agrupamentos de trabalho; um grupo pode conter várias lacunas.
- [682 registros históricos reconciliados](revisao-682-registros.csv): preserva TODOS os itens do levantamento de 11/10, acrescentando ressalvas/atualizações. Não são 682 defeitos únicos confirmados: há duplicidade entre planos, dependências de negócio, propostas e itens superados. Registros apenas preservados estão explicitamente identificados.
- [Matriz das 100 etapas](matriz-100-etapas.csv) e [1.000 subetapas](checklist-1000-subetapas.csv): mantêm requisito, aceite esperado, estado documental e ligação com os achados. Checklist vazio não equivale a código ausente.
- [Cobertura de 511 documentos](cobertura-documentos.csv) e [inventário de 4.038 arquivos](cobertura-repositorio.csv): caminho, hash e método, incluindo todos os 463 arquivos de docs. Foram extraídos os 14 PDFs e todas as planilhas do XLSX; as dez imagens documentais foram abertas e inspecionadas.
- [Consulta pesquisável offline](consulta.html): filtros por texto, prioridade e camada de levantamento.

## Alcance e limites verificáveis

O inventário leu integralmente os arquivos versionados para extração de texto, hashes, referências e marcadores. A inspeção semântica concentrou-se nos planos, trilhas de execução, contratos e fluxos com evidência de lacuna, cruzando a auditoria anterior com o código atual. **Inventário integral não significa revisão humana linha a linha de todas as 4.038 unidades nem homologação dinâmica de cada funcionalidade.** A coluna de nível de prova evita essa confusão. Não atribuo nota 10/10 ou percentual de produto concluído.

A revisão cobre os planos original de 100 etapas, de 150, de encerramento de 100, de workflows de 100, planos de 50 etapas, benchmark/backlog, ADRs, guias funcionais, schema, rotas, funções, testes e relatórios históricos. Não foi localizado diff de código em src/supabase/scripts/tests/e2e/.github entre o fechamento técnico dc08200 e a referência auditada: o commit posterior acrescentou a auditoria. Isso permite reaproveitar rastreabilidade estática, mas não torna provas antigas equivalentes a novas execuções.

O checkout original foi preservado: encontra-se 66 commits atrás da main consultada, tem quatro arquivos alterados e documentos locais não rastreados. AUDITORIA.md e PLANO_100.md locais foram lidos separadamente; este último contém 36 etapas, apesar do nome. Seus diagnósticos não foram adicionados automaticamente como 36 defeitos novos, pois se referem a outra base. Não foram auditados semanticamente todos os worktrees históricos, todos os dados de negócio, todos os binários externos ou serviços de terceiros. O catálogo mestre externo permanece somente leitura; sua ACL de origem não foi certificada nesta rodada.

As consultas remotas foram somente leitura. Os MCPs disponíveis recusaram acesso, mas o token da CLI local permitiu consultar o Management API com read_only=true, sem depender do MCP. Não foram aplicadas migrations, alteradas contas, confirmados e-mails, disparadas mensagens, feitos deploys ou modificados dados do banco. A API de leitura não comprova por si só autorização operacional de escrita. Não se publicou qualquer segredo.

## Evidências atuais e reproduções

| Verificação | Resultado | Evidência |
|---|---|---|
| Conversão orçamento → pedido, com o guard vigente | Falhou: alteração de governança recusada; zero pedidos persistidos | [simulação](simular-conversao-pedido-sicoob.py.json) |
| Aprovação pública com assinatura válida na fixture e guard vigente | Falhou: alteração de governança recusada; zero respostas persistidas | [simulação](simular-aprovacao-publica.py.json) |
| Chave HMAC no banco atual | Uma chave ativa; zero correspondências no Vault | [consulta agregada](bd-hmac-pronto.json) |
| Verbas de duas cooperativas | Gestor consultou ambas e alterou a de outra; gerente elevou o próprio limite; gestor inativo continuou lendo | [simulação RLS](simulacao-rls-verbas.json) |
| Sete filtros de produto | Contador ativo = 1, conjunto de resultados inalterado; busca por nome funcionou como controle positivo | [simulação dos predicados reais](simulacao-filtros.json) |
| Supabase Realtime | Publicação sem tabelas, sem puballtables | [publicação](bd-publication-config.json) |
| Worker de aprovação | 620 falhas / 1.440 execuções na janela de 24h, por request_id duplicado | [cron](bd-cron-falhas-agrupadas.json) |
| Ledger atual | 491 diferenças conhecidas, zero novas e zero resolvidas | [comparação](ledger-comparado.json) |
| Confirmação alternativa de e-mail | Bundle remoto contém uso de UUID como token seguido de confirmação administrativa; nenhuma conta foi modificada para provar isso | [metadados/hash](edge-verify-email-paridade.json) |
| GitHub | Main sem checks obrigatórios; E2E de Dependabot falhou por secrets; outros workflows executam com sucesso | [proteção](github-protecao.json), [falha delimitada](github-e2e-falha-resumo.json) |
| HTTP público | Raiz sem CSP/nosniff; relatório interno Markdown acessível; URL de manifest consultada entrega HTML | [respostas](http-publico.json) |

As simulações de banco usaram PostgreSQL 16 descartável, rede desabilitada, dados sintéticos e as policies/helpers/guard coletados do canônico, sobre fixtures mínimas. **Não são um clone integral nem uma alteração do banco remoto.** A suíte completa de TypeScript, lint, Vitest, Deno e navegador não foi reexecutada nesta rodada de auditoria. Nenhuma jornada autenticada integral é certificada por este documento.

## Correções necessárias no diagnóstico anterior

1. **CI não está globalmente impedido de executar.** Há resultados recentes aprovados de CodeQL, segurança e ledger. A falha E2E consultada é preflight do Dependabot sem credenciais, não evidência de bug de toda a aplicação nem inexistência de todas as personas.
2. **continue-on-error não basta para concluir falso verde.** O workflow E2E tem etapa final que reprova quando o resultado do teste foi failure. A revisão de shards vazios/skip continua pertinente.
3. **Credenciais de CRM existem.** Foram confirmados nomes/presença no cofre da aplicação; isso ainda não prova conectividade e privilégio mínimo.
4. **Auth possui controles ativos.** Cadastro público e autoconfirmação estão desativados; TOTP habilitado. Passkeys ausentes não significam MFA inteiro ausente. Domínios/callbacks e requisitos adicionais precisam revisão.
5. **Supply chain teve implementação.** Actions fixadas por SHA e scanners existem. Não cabe classificar o tema inteiro como não iniciado.
6. **Há cron em execução.** São 17 jobs ativos; o problema é a ausência de algumas rotinas de negócio e a falha concreta do worker existente.
7. **491 diferenças não são 491 migrations a aplicar.** São 462 arquivos ativos sem ledger, 19 conteúdos não verificáveis, nove nomes divergentes e um conteúdo divergente, aceitos como passivo pela baseline. Só o efeito real decide a reconciliação.
8. **Escrita no catálogo mestre é proibida por requisito.** Corrigir a interface incompatível, sem remover o bloqueio CATALOG_READ_ONLY.
9. **Documentos de escopo se contradizem.** Bitrix, passkeys, gamificação, white-label e ADRs propostas exigem precedência/decisão, não ativação automática.
10. **Dívida técnica antiga foi saneada no lote de 08/10.** O relatório do código atual registra zero erros TypeScript/lint/audit, com 872 avisos. Não repetir 153/3.247/sete altos como medição atual; também não apresentar o resultado de 08/10 como teste executado hoje.
11. **Função ACTIVE não prova paridade e negócio.** Existem 100 funções ativas e seis exclusões locais documentadas. Contagem não comprova limite do plano comercial nem justifica upgrade automático.
12. **Código existente não implica aceite.** A antiga classificação técnica de T032 precisa revisão porque dois escritores conflitam com o guard. As 100 etapas ainda não têm encerramento formal no plano estruturado.

## Frentes de trabalho consolidadas

P0 indica segurança/integridade ou bloqueio central a tratar antes de homologar o fluxo afetado. P1 indica jornada/integração/confiabilidade; P2, completude e operação. Prioridade é proposta técnica, sem confundir item de escopo disputado com obrigação contratada.

| ID | Prioridade | Frente | Situação |
|---|---|---|---|
| [G01](#g01) | P0 | Isolamento e autoridade sobre verbas | PARCIAL COM FALHA |
| [G02](#g02) | P0 | Conversão de orçamento em pedido | PARCIAL COM FALHA |
| [G03](#g03) | P0 | Resposta de aprovação pública e chave de evidência | PARCIAL COM FALHA |
| [G04](#g04) | P0 | Congelamento de itens e preços após aprovação | PARCIAL COM FALHA |
| [G05](#g05) | P0 | Confirmação de e-mail por UUID | FALHA EM FUNÇÃO PUBLICADA |
| [G06](#g06) | P0 | Ingestão segura de documentos e arte | PARCIAL E CONFIGURAÇÃO AUSENTE |
| [G07](#g07) | P1 | Realtime de dados do negócio | PARCIAL SEM PUBLICAÇÃO |
| [G08](#g08) | P1 | Agendamento e reconciliação do worker de aprovação | PARCIAL COM FALHA OPERACIONAL |
| [G09](#g09) | P1 | E-mail transacional e demais canais | PARCIAL / STUB |
| [G10](#g10) | P1 | Acesso ao detalhe completo da proposta | PARCIAL / SEM ENTRADA NORMAL |
| [G11](#g11) | P1 | Filtros que a interface anuncia mas não aplica | PARCIAL |
| [G12](#g12) | P1 | Seleção comercial perdida entre módulos | PARCIAL |
| [G13](#g13) | P1 | Persistência de kit pronto | PARCIAL COM CONTRATO INVÁLIDO |
| [G14](#g14) | P1 | Indicadores fictícios e modo de demonstração | STUB / PARCIAL |
| [G15](#g15) | P1 | Geração de mockups, IA e voz | PARCIAL E CONFIGURAÇÃO AUSENTE |
| [G16](#g16) | P1 | Políticas de compra, alçadas e comparação institucional | PARCIAL / NÃO LOCALIZADO |
| [G17](#g17) | P1 | Ciclo financeiro da verba e competência | PARCIAL / NÃO LOCALIZADO |
| [G18](#g18) | P1 | Autoridade da proposta: frete, tributos e prazo | PARCIAL / ESTIMATIVAS |
| [G19](#g19) | P1 | Rascunhos, concorrência e sessão | PARCIAL |
| [G20](#g20) | P1 | Embalagem física e previsão de kits | PARCIAL / NÃO LOCALIZADO |
| [G21](#g21) | P1 | Recompra com diferenças comerciais e arte | PARCIAL |
| [G22](#g22) | P1 | Arte, prova técnica e competência de marketing | PARCIAL |
| [G23](#g23) | P1 | Storage, retenção e dossiê documental | PARCIAL / NÃO LOCALIZADO |
| [G24](#g24) | P1 | Distribuição, expedição parcial e importação de destinos | PARCIAL / NÃO LOCALIZADO |
| [G25](#g25) | P1 | Rastreio, recebimento e ocorrências até a solução | PARCIAL / NÃO LOCALIZADO |
| [G26](#g26) | P1 | Campanha institucional com cronograma regressivo | NÃO LOCALIZADO COMO JORNADA COMPLETA |
| [G27](#g27) | P1 | Hierarquia, identidade institucional e vínculos | PARCIAL |
| [G28](#g28) | P1 | Convites e configuração de Auth por ambiente | PARCIAL |
| [G29](#g29) | P1 | Catálogo mestre somente leitura e coerência administrativa | PARCIAL NA UI; BLOQUEIO DE ESCRITA CORRETO |
| [G30](#g30) | P2 | Descoberta, comparação, curadoria e histórico de catálogo | PARCIAL / CÓDIGO SEM INTEGRAÇÃO |
| [G31](#g31) | P2 | Páginas administrativas e funcionalidades inacessíveis | CÓDIGO SEM INTEGRAÇÃO / PARCIAL |
| [G32](#g32) | P2 | Minha conta, ajuda, onboarding e navegação móvel | PARCIAL / NÃO LOCALIZADO |
| [G33](#g33) | P2 | BI, metas e dossiê do cliente | PARCIAL / CÓDIGO SEM INTEGRAÇÃO |
| [G34](#g34) | P2 | Magic Up colaborativo e construtores de workflow | PARCIAL / STUB |
| [G35](#g35) | P1 | Webhooks, eventos e reconciliação externa | PARCIAL |
| [G36](#g36) | P2 | Rotinas periódicas de negócio | PARCIAL / SEM AGENDAMENTO IDENTIFICADO |
| [G37](#g37) | P1 | Autorização, limites e observabilidade das Edge Functions | PARCIAL |
| [G38](#g38) | P1 | Paridade de migrations e baseline | PARCIAL; PASSIVO CONHECIDO |
| [G39](#g39) | P1 | Qualidade dos testes e cobertura funcional | PARCIAL |
| [G40](#g40) | P1 | Proteção de main e publicação | PARCIAL |
| [G41](#g41) | P1 | CI autenticada e isolamento de homologação | PARCIAL |
| [G42](#g42) | P2 | Pipeline, supply chain e reprodutibilidade | PARCIAL COM ENTREGAS EXISTENTES |
| [G43](#g43) | P1 | Domínio publicado, cabeçalhos e exposição de relatórios | PARCIAL COM DIVERGÊNCIAS |
| [G44](#g44) | P2 | PWA, offline e push real | PARCIAL / NÃO LOCALIZADO |
| [G45](#g45) | P1 | Alertas operacionais, observabilidade e suporte | PARCIAL / STUB |
| [G46](#g46) | P1 | Backup, restauração e recuperação | ACEITE NÃO DEMONSTRADO |
| [G47](#g47) | P1 | Privacidade, auditoria de acesso e credenciais | PARCIAL / ACEITE NÃO DEMONSTRADO |
| [G48](#g48) | P2 | Qualidade visual e acessibilidade da jornada real | PARCIAL |
| [G49](#g49) | P2 | Pós-venda e integração financeira externa | NÃO LOCALIZADO COMO FLUXO COMPLETO / DECISÃO |
| [G50](#g50) | P2 | Conflitos de escopo: Bitrix, passkeys, white-label e legado | DECISÃO DOCUMENTAL NECESSÁRIA |
| [G51](#g51) | P1 | Plano, responsáveis e evidências de encerramento | PARCIAL DOCUMENTAL |
| [G52](#g52) | P2 | Local, GitHub e PRs ainda não reconciliados | PARCIAL |
| [G53](#g53) | P2 | Documentação, inventários e relatórios obsoletos | PARCIAL / DIVERGENTE |
| [G54](#g54) | P2 | Banco: recursos desconectados, schema e performance | PARCIAL / CÓDIGO SEM INTEGRAÇÃO |
| [G55](#g55) | P2 | Manutenção e dívida técnica residual | PARCIAL COM SANEAMENTO REGISTRADO |
| [G56](#g56) | P2 | Piloto, marca, pesquisa e aceite operacional | DEPENDÊNCIA DE NEGÓCIO / TEMPO REAL |

<a id="g01"></a>

### G01 — Isolamento e autoridade sobre verbas

**P0 · PARCIAL COM FALHA**. Nível de prova: Reproduzido localmente com policies e helpers remotos.

As policies de pa_budgets contêm permissões alternativas sem cooperativa. Na simulação, gestor da cooperativa A consultou dois PAs de cooperativas distintas e alterou o orçamento de B; gerente elevou o próprio limite. Gestor inativo continuou lendo ambos porque is_gestor_compras não verifica atividade.

**Falta:** Restringir todas as alternativas das policies pelo escopo; negar ajuste de limite ao beneficiário; concentrar concessão, consumo e estorno em operações autorizadas e auditadas. Reexecutar matriz de papéis ativos/inativos, unidades e concorrência.

Etapas: T024, T056, T057, T087, T095. Origens: SIC-021, SIC-023, PLA-X03, DB-19, SIC-140.

Evidências: [simulacao-rls-verbas.json](simulacao-rls-verbas.json); [bd-policies.json](bd-policies.json); [bd-escopo-helpers.json](bd-escopo-helpers.json); [bd-acl-direta.json](bd-acl-direta.json).

<a id="g02"></a>

### G02 — Conversão de orçamento em pedido

**P0 · PARCIAL COM FALHA**. Nível de prova: Reproduzido em PostgreSQL descartável.

convert_quote_to_sicoob_order altera status sem estabelecer o contexto aceito por guard_quote_governance_write. A fixture versionada, acrescida do trigger vigente, falhou e não persistiu pedido. A simulação original omitia esse guard posterior.

**Falta:** Compatibilizar a operação autorizada com o guard sem ampliar escrita direta; testar transação completa com todos os triggers vigentes, replay, edição concorrente e saldo.

Etapas: T032, T038, T039, T040. Origens: SIC-040, PLA-T038.

Evidências: [simular-conversao-pedido-sicoob.py.json](simular-conversao-pedido-sicoob.py.json); [supabase/migrations/20260922224500_convert_quote_to_sicoob_order.sql:250](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/migrations/20260922224500_convert_quote_to_sicoob_order.sql#L250); [guard_quote_governance_write.sql](guard_quote_governance_write.sql).

<a id="g03"></a>

### G03 — Resposta de aprovação pública e chave de evidência

**P0 · PARCIAL COM FALHA**. Nível de prova: Banco vivo e reprodução isolada.

Há uma chave de evidência ativa, mas nenhuma corresponde a um segredo existente no Vault. O fluxo pode falhar por evidência não configurada. Mesmo fornecendo chave válida na fixture, apply_local_quote_approval_response é barrada pelo guard de status; efeitos persistidos foram zero.

**Falta:** Provisionar e versionar a chave de assinatura de evidência por canal seguro; ajustar o escritor autorizado; testar consumo único, observação, hash, expiração, resposta duplicada, revogação e rotação.

Etapas: T032, T040, T053, T095. Origens: SIC-060, DB-12, EDG-29.

Evidências: [bd-hmac-pronto.json](bd-hmac-pronto.json); [simular-aprovacao-publica.py.json](simular-aprovacao-publica.py.json); [supabase/migrations/20260922225000_secure_public_quote_approval.sql:260](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/migrations/20260922225000_secure_public_quote_approval.sql#L260); [apply_local_quote_approval_response.sql](apply_local_quote_approval_response.sql).

<a id="g04"></a>

### G04 — Congelamento de itens e preços após aprovação

**P0 · PARCIAL COM FALHA**. Nível de prova: Policies, grants e funções do banco vivo.

As policies de quote_items permitem escrita por proprietário/supervisor sem condicionar ao estado do orçamento. Não há trigger de imutabilidade dos itens aprovado equivalente ao guard do cabeçalho. save_quote_atomic recebe preços/custos do cliente; cálculo de totais não comprova autoridade da origem comercial.

**Falta:** Definir preço e descontos autorizados no servidor, bloquear mutação direta de proposta aprovada e criar revisão versionada que invalide aprovações e artes afetadas.

Etapas: T024, T036, T037, T052, T072. Origens: SIC-041, SIC-053, PLA-T037, FE-081, FE-090, QA-08.

Evidências: [bd-policies.json](bd-policies.json); [bd-triggers.json](bd-triggers.json); [bd-acl-direta.json](bd-acl-direta.json); [save_quote_atomic.sql](save_quote_atomic.sql).

<a id="g05"></a>

### G05 — Confirmação de e-mail por UUID

**P0 · FALHA EM FUNÇÃO PUBLICADA**. Nível de prova: Código local e bundle remoto recuperado; sem executar alteração de conta.

verify-email está ACTIVE, verify_jwt=false, e usa o campo token como ID de usuário em getUserById antes de email_confirm=true. O bundle remoto contém esse mesmo fluxo. UUID não comprova posse da caixa de e-mail.

**Falta:** Retirar a rota alternativa ou adotar a verificação assinada do Auth; exigir token de uso único apropriado e cobrir expiração/replay. Não ativar clientes órfãos desse endpoint.

Etapas: T025, T030, T095. Origens: EDG-32.

Evidências: [supabase/functions/verify-email/index.ts:39](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/functions/verify-email/index.ts#L39); [edge-verify-email-paridade.json](edge-verify-email-paridade.json); [bd-edges.json](bd-edges.json).

<a id="g06"></a>

### G06 — Ingestão segura de documentos e arte

**P0 · PARCIAL E CONFIGURAÇÃO AUSENTE**. Nível de prova: Inventário remoto de segredos e código.

SICOOB_MALWARE_SCANNER_URL/TOKEN não estão configurados no runtime inventariado. A ingestão de documentos exige scanner e recusa indisponibilidade; a existência da Edge não encerra a entrega. Há fluxo de arte por upload direto a reconciliar com a quarentena e validação do resultado do scanner.

**Falta:** Configurar scanner real e vínculo entre veredito e hash do arquivo; unificar arte/documentos na quarentena; testar conteúdo malicioso, timeout, resultado inconclusivo, escopo e compensação. Preservar a recusa segura.

Etapas: T072, T074, T075, T080. Origens: PLA-T075, PLC-40, EDG-28, EDG-34, SIC-072, SIC-100, ADM-23.

Evidências: [bd-segredos.json](bd-segredos.json); [supabase/functions/sicoob-document-ingest/index.ts:34](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/functions/sicoob-document-ingest/index.ts#L34); [supabase/functions/sicoob-document-ingest/scanner.ts:24](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/functions/sicoob-document-ingest/scanner.ts#L24).

<a id="g07"></a>

### G07 — Realtime de dados do negócio

**P1 · PARCIAL SEM PUBLICAÇÃO**. Nível de prova: Configuração do banco vivo e consumidores locais.

A publicação supabase_realtime está sem tabelas e puballtables=false. Consumidores de postgres_changes existem para pedidos, notificações, kits, comentários e outros módulos. Abrir um canal não torna as alterações das tabelas publicadas.

**Falta:** Publicar apenas as tabelas necessárias com RLS verificada; testar atualização entre sessões e isolamento. Distinguir Postgres Changes de Broadcast/Presence, que não foram invalidados por esta consulta.

Etapas: T030, T047, T067, T084. Origens: DB-25, SIC-048.

Evidências: [bd-realtime.json](bd-realtime.json); [bd-publication-config.json](bd-publication-config.json); [src/hooks/useCustomKitsRealtime.ts:21](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/hooks/useCustomKitsRealtime.ts#L21); [src/services/sicoob/commonService.ts:20](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/services/sicoob/commonService.ts#L20).

<a id="g08"></a>

### G08 — Agendamento e reconciliação do worker de aprovação

**P1 · PARCIAL COM FALHA OPERACIONAL**. Nível de prova: Histórico real de cron das últimas 24 horas.

O cron existe. Na janela coletada, 620 de 1.440 execuções do job do worker falharam por request_id duplicado em sicoob_approval_worker_dispatches. Há 819 respostas HTTP 200 registradas e uma entrada queued; a fila de entregas estava vazia. Isso não demonstra perda de mensagens já enviadas, mas evidencia falha de agendamento e lacuna de monitoramento.

**Falta:** Investigar a origem dos IDs repetidos, tornar o registro compatível com a identidade da tentativa e incluir falhas de inserção/cron nos alertas. Não concluir saúde apenas pelas linhas que conseguiram ser gravadas.

Etapas: T047, T048, T049, T050. Origens: PLC-29, SIC-112, EDG-21.

Evidências: [bd-cron-resumo.json](bd-cron-resumo.json); [bd-cron-falhas-agrupadas.json](bd-cron-falhas-agrupadas.json); [bd-dispatch-resultados.json](bd-dispatch-resultados.json); [bd-fila-agregada.json](bd-fila-agregada.json).

<a id="g09"></a>

### G09 — E-mail transacional e demais canais

**P1 · PARCIAL / STUB**. Nível de prova: Código atual e segredos remotos.

send-transactional-email responde 501 para eventos suportados após autenticação. O transporte de aprovações é separado, mas não há RESEND_API_KEY no runtime coletado. Preferências de resumo, DND, SMS, WhatsApp e Web Push não constituem entregadores implementados. E-mails do Supabase Auth são outro serviço.

**Falta:** Fechar contrato evento/destinatário/canal, configuração do provedor, fila, recibos e falhas; distinguir entrega de negócio de Auth; homologar com destinatários de teste autorizados.

Etapas: T046, T048, T050, T051. Origens: FE-086, DOC-27, DOC-28, EDG-20, EDG-21, EDG-22, EDG-23, DB-22, PLC-41, PLB-50, ADM-27, ADM-28, SIC-110, SIC-111, SIC-113, SIC-114, DB-17, DB-23, DB-24.

Evidências: [supabase/functions/send-transactional-email/index.ts:49](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/functions/send-transactional-email/index.ts#L49); [supabase/functions/_shared/approval-delivery.ts:55](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/functions/_shared/approval-delivery.ts#L55); [bd-segredos.json](bd-segredos.json).

<a id="g10"></a>

### G10 — Acesso ao detalhe completo da proposta

**P1 · PARCIAL / SEM ENTRADA NORMAL**. Nível de prova: Rotas e componentes atuais.

O caminho normal /orcamentos/:id monta o detalhe reduzido. PDF e link público estão em /orcamentos/:id/visualizar, sem entrada normal identificada. Copiar link/WhatsApp da lista usa URL interna autenticada. Produto aponta para /kit-builder embora a rota real seja /montar-kit; há links para /catalogo sem rota correspondente.

**Falta:** Estabelecer detalhe canônico completo; conectar geração de PDF e token público; corrigir destinos e preservação dos parâmetros de seleção; testar navegação pelo menu e pelo produto.

Etapas: T038, T040, T060. Origens: FE-001, DOC-01, FE-002, FE-003, DOC-02, PLB-31, DB-11, FE-080, FE-083, FE-085.

Evidências: [src/routes/config/quotes.ts:37](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/routes/config/quotes.ts#L37); [src/pages/QuoteDetailPage.tsx:118](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/pages/QuoteDetailPage.tsx#L118); [src/pages/QuoteViewPage.tsx:91](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/pages/QuoteViewPage.tsx#L91); [src/components/quotes/QuoteRowQuickActions.tsx:33](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/components/quotes/QuoteRowQuickActions.tsx#L33); [src/components/products/ProductCategoryBadges.tsx:77](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/components/products/ProductCategoryBadges.tsx#L77).

<a id="g11"></a>

### G11 — Filtros que a interface anuncia mas não aplica

**P1 · PARCIAL**. Nível de prova: Reproduzido executando os predicados reais com dados sintéticos.

O estado/contador serializa técnicas, tags, gênero, tamanhos, novidades, destaque e personalização; o pipeline applyProductFilters não implementa todos esses predicados. O catálogo possui outro pipeline com cobertura diferente. Ter o chip selecionado não comprova filtragem. A execução isolada confirmou os sete filtros sem efeito; o controle positivo de busca por nome reduziu os resultados.

**Falta:** Unificar semântica dos filtros, aliases de URL e estado de carregamento; provar cada predicado com produtos contrastantes e manter filtro ao navegar/voltar.

Etapas: T059, T060. Origens: FE-020, FE-021, FE-022, DOC-09.

Evidências: [simulacao-filtros.json](simulacao-filtros.json); [src/pages/filters/filters-page-helpers.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/pages/filters/filters-page-helpers.ts); [src/hooks/useCatalogFiltering.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/hooks/useCatalogFiltering.ts); [src/hooks/useAdvancedFilters.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/hooks/useAdvancedFilters.ts).

<a id="g12"></a>

### G12 — Seleção comercial perdida entre módulos

**P1 · PARCIAL**. Nível de prova: Contratos de navegação atuais e trilha documental.

Coleções, simulador, BI e tendências transmitem state/query de produtos e clientes que não são consumidos de modo uniforme pelo construtor de orçamento. Há recursos implementados em origem e destino, mas a passagem de intenção fica incompleta.

**Falta:** Criar contrato de entrada único validado, resolver IDs reais do catálogo/CRM, preservar quantidades/personalização e apresentar diferenças comerciais antes de salvar.

Etapas: T038, T060, T061, T069. Origens: FE-060, FE-087, ADM-38, FE-131.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md); [src/components/bi/ConfirmQuoteSuggestionsModal.tsx:83](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/components/bi/ConfirmQuoteSuggestionsModal.tsx#L83).

<a id="g13"></a>

### G13 — Persistência de kit pronto

**P1 · PARCIAL COM CONTRATO INVÁLIDO**. Nível de prova: Reproduzido em PostgreSQL descartável com trigger remoto.

buildKitPayload grava complete para kit válido; validate_status_fields no banco aceita draft, ready, shared e archived. O trigger está associado a custom_kits. O contrato rejeita o estado que a UI tenta salvar.

**Falta:** Alinhar máquina de estados, criar transições de compartilhar/arquivar e testar salvar, reabrir, duplicar, compartilhar e exportar com RLS.

Etapas: T066, T067, T070. Origens: FE-110, PLA-T067.

Evidências: [simulacao-status-kit.json](simulacao-status-kit.json); [src/hooks/useCustomKitPersistence.ts:63](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/hooks/useCustomKitPersistence.ts#L63); [bd-funcoes.json](bd-funcoes.json); [bd-triggers.json](bd-triggers.json).

<a id="g14"></a>

### G14 — Indicadores fictícios e modo de demonstração

**P1 · STUB / PARCIAL**. Nível de prova: Código atual e imagens documentais.

GestorCompras contém valores fixos e aprovação em lote sem ação. Tendências liga demo por padrão. useClientBI usa fallback de dados sintéticos e topCategories mockadas mesmo com outros dados reais. Alguns módulos mostram selo ilustrativo, outros não; não é correto afirmar que todos ocultam a simulação.

**Falta:** Separar indisponível, vazio, estimado e demo; calcular métricas na origem correta; impedir alertas de negócio baseados em mock; conectar ações reais e manter demo apenas opt-in.

Etapas: T089, T092. Origens: FE-095, FE-100, FE-140, ADM-34, ADM-35, ADM-40, ADM-43, ADM-44, SIC-028, SIC-042, PLB-34, FE-030, FE-132, FE-142, FE-191, ADM-08, ADM-32, ADM-41, ADM-47, SIC-115.

Evidências: [src/pages/GestorCompras.tsx:54](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/pages/GestorCompras.tsx#L54); [src/pages/trends/is-demo-mode.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/pages/trends/is-demo-mode.ts); [src/hooks/bi/useClientBI.ts:54](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/hooks/bi/useClientBI.ts#L54); [src/hooks/bi/useClientBI.ts:125](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/hooks/bi/useClientBI.ts#L125).

<a id="g15"></a>

### G15 — Geração de mockups, IA e voz

**P1 · PARCIAL E CONFIGURAÇÃO AUSENTE**. Nível de prova: Código e nomes dos segredos remotos.

Não há LOVABLE_API_KEY nem ELEVENLABS_API_KEY no runtime inventariado; os handlers correspondentes dependem dessas variáveis. Parte da interface de assistente usa respostas locais simuladas; outros fluxos reais existem, mas não estão ligados à mesma experiência.

**Falta:** Configurar os provedores escolhidos, ligar interface ao contrato real, propagar indisponibilidade/custos/limites e provar voz, análise de logo e geração com dados autorizados.

Etapas: T030, T073, T079. Origens: EDG-01, EDG-02, EDG-51, FE-130, ADM-55, ADM-56, ADM-30, ADM-51, ADM-52, ADM-54, EDG-04, DOC-17.

Evidências: [bd-segredos.json](bd-segredos.json); [supabase/functions/generate-mockup/index.ts:45](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/functions/generate-mockup/index.ts#L45); [supabase/functions/elevenlabs-tts/index.ts:47](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/functions/elevenlabs-tts/index.ts#L47); [supabase/functions/elevenlabs-scribe-token/index.ts:31](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/functions/elevenlabs-scribe-token/index.ts#L31).

<a id="g16"></a>

### G16 — Políticas de compra, alçadas e comparação institucional

**P1 · PARCIAL / NÃO LOCALIZADO**. Nível de prova: Trilha de requisitos e contratos de banco/código.

Há estruturas para aprovação e política, mas gestão versionada utilizável, alçadas coerentes no servidor, propostas concorrentes comparáveis e justificativa de fornecedor único não estão fechadas. Comparar produtos não substitui comparar propostas de fornecedores. Delegação não está plenamente acessível ao titular.

**Falta:** Versionar regras e vigência, aplicar alçada/saldo/escopo no servidor, construir gestão de propostas e exceções e registrar decisão com documentos, responsável e política histórica.

Etapas: T052, T053, T054, T055, T057. Origens: SIC-026, SIC-054, SIC-061, SIC-062, SIC-063, SIC-064, PLB-30, PLB-36, PLB-56, PLB-35, PLB-37, FE-092, DB-16, SIC-044, SIC-141, PLA-X04, PLC-60.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md); [docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json).

<a id="g17"></a>

### G17 — Ciclo financeiro da verba e competência

**P1 · PARCIAL / NÃO LOCALIZADO**. Nível de prova: Schema atual e rastreabilidade dos planos.

Limite/saldo e consumo não equivalem ao livro de reserva, compromisso, consumo e liberação. Pedido de aumento não fecha decisão; faltam remanejamento, centro de custo/rateio, fechamento de competência e conciliação reproduzível.

**Falta:** Modelar eventos financeiros e vínculo documental; bloquear competência fechada; permitir ajuste por evento auditável; reconciliar agregado com lançamentos independentes.

Etapas: T056, T087, T088, T090. Origens: SIC-020, SIC-022, SIC-024, SIC-025, SIC-027, PLB-29, PLB-32, PLB-33.

Evidências: [bd-colunas.json](bd-colunas.json); [bd-objetos.json](bd-objetos.json); [docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md).

<a id="g18"></a>

### G18 — Autoridade da proposta: frete, tributos e prazo

**P1 · PARCIAL / ESTIMATIVAS**. Nível de prova: Código e requisitos históricos sem homologação nova.

Múltiplo/mínimo, validade do estoque, origem do preço, frete por destino, tributos e prazo decomposto ainda não compõem um contrato uniforme. Há frete por tabela fixa e previsões que não equivalem a compromisso do fornecedor.

**Falta:** Definir entradas comerciais autorizadas e cálculo independente; explicitar estimativa vs valor fechado; tratar dado insuficiente com análise manual; revalidar na aprovação e expedição.

Etapas: T037, T059, T065, T066. Origens: PLB-01, PLB-02, PLB-04, PLB-09, PLB-10, PLB-11, PLB-58, FE-111, FE-120, DOC-08, DOC-24, PLB-12, PLC-65.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/02-plano-original-benchmark.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/02-plano-original-benchmark.md); [docs/execucao/lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md).

<a id="g19"></a>

### G19 — Rascunhos, concorrência e sessão

**P1 · PARCIAL**. Nível de prova: Código e critérios do plano; sem jornada multissessão nesta rodada.

Há salvamento atômico/versionamento e autosave, mas identidade de criação, contexto cooperativa/PA, disputa entre abas, TTL, logout e versão observada pela tela não estão certificados como conjunto. Corrigir a RPC não encerra a concorrência do editor.

**Falta:** Persistir intenção de criação, proteger versão lida originalmente, avisar conflito entre abas, limpar/escopar rascunhos e bloquear gravação tardia após troca de sessão/unidade.

Etapas: T033, T035, T041, T042, T043, T044, T045. Origens: SIC-051, SIC-055, PLA-T033, PLA-T035, PLC-59, PLB-47, SIC-050, SIC-052.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/01-plano-encerramento.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/01-plano-encerramento.md); [save_quote_atomic.sql](save_quote_atomic.sql).

<a id="g20"></a>

### G20 — Embalagem física e previsão de kits

**P1 · PARCIAL / NÃO LOCALIZADO**. Nível de prova: Código e critérios do plano.

Há cálculo monetário/demanda e previsão, mas não certificação física de acomodação por dimensões/peso/fragilidade no servidor. Margem fixa de reposição não informa confiança. Medidas de personalização não são dimensões do objeto.

**Falta:** Modelar atributos físicos e capacidade, validar composição no servidor, sinalizar dados ausentes e calcular prazo por cobertura real da demanda; completar modelos por ocasião e reordenação acessível.

Etapas: T062, T063, T064, T065, T066, T070. Origens: SIC-090, SIC-091, PLB-20, PLB-21, PLB-22, PLA-T063, PLA-T064, PLB-07, PLB-17, PLC-57, PLC-58, FE-112, ADM-16, ADM-48.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/02-plano-original-benchmark.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/02-plano-original-benchmark.md); [docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json).

<a id="g21"></a>

### G21 — Recompra com diferenças comerciais e arte

**P1 · PARCIAL**. Nível de prova: Implementação e requisitos históricos.

Intenção idempotente de recompra existe. Falta certificar diferenças por item, indisponibilidade, preço/personalização e revalidação de arte antes de gerar nova obrigação.

**Falta:** Exibir e aceitar diferenças item a item, reconstruir arte/versão quando necessário e provar replay, mudança de estoque/preço e perda de acesso.

Etapas: T068, T069, T070, T072. Origens: SIC-080, PLB-45, PLA-T068, PLA-T069.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md); [bd-objetos.json](bd-objetos.json).

<a id="g22"></a>

### G22 — Arte, prova técnica e competência de marketing

**P1 · PARCIAL**. Nível de prova: Fluxos de código e requisitos documentados.

Arte ligada ao pedido não fecha vínculo por item/especificação/versão. Aprovação financeira e aprovação de marca precisam responsabilidades distintas. Biblioteca institucional, prova técnica e invalidação por alteração comercial não estão completas.

**Falta:** Vincular arquivo/hash/versão à proposta e ao item, criar competência de marca, revisão/devolução e dossiê único; tratar troca de item e de arte sem herdar aprovação silenciosamente.

Etapas: T071, T072, T073, T077, T080. Origens: SIC-070, SIC-071, SIC-073, PLB-18, PLB-19, PLB-38, PLB-16, DOC-18, ADM-49, ADM-50.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md); [docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json).

<a id="g23"></a>

### G23 — Storage, retenção e dossiê documental

**P1 · PARCIAL / NÃO LOCALIZADO**. Nível de prova: Schema/buckets e trilha documental.

Existem buckets e metadados, mas falta demonstrar ciclo de quarentena, retenção, revogação, descarte autorizado, recuperação e limpeza de órfãos por finalidade. PDF em bucket privado não pode ser tratado como URL pública permanente.

**Falta:** Aplicar acesso temporário e escopo ao binário e aos metadados; estabelecer retenção e descarte por finalidade, validar compensações e conciliar proposta/entrega/documento no dossiê.

Etapas: T074, T076, T077, T080, T095. Origens: SIC-101, SIC-102, DB-18, DB-41, PLB-43, DOC-48.

Evidências: [bd-buckets.json](bd-buckets.json); [docs/execucao/lacunas-funcionalidades-2026-10-11/07-edge-functions-integracoes.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/07-edge-functions-integracoes.md); [docs/adr/0001-nomes-de-buckets-storage.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/adr/0001-nomes-de-buckets-storage.md).

<a id="g24"></a>

### G24 — Distribuição, expedição parcial e importação de destinos

**P1 · PARCIAL / NÃO LOCALIZADO**. Nível de prova: Código e requisitos dos planos.

Distribuição e remessas têm implementação, mas faltam jornada de importação assistida CSV/XLSX, paginação integral, saldo por item/destino e reconfirmação de estoque com evidência antes de expedir.

**Falta:** Importar com prévia, validação e atomicidade definida; impedir expedição superior ao saldo; distinguir pedido agregado de cada entrega e manter fonte externa somente leitura.

Etapas: T081, T082, T083, T090. Origens: SIC-130, SIC-132, SIC-135, SIC-136, PLB-23, PLB-24, PLB-44, PLC-61, SIC-046, SIC-120.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md); [bd-colunas.json](bd-colunas.json).

<a id="g25"></a>

### G25 — Rastreio, recebimento e ocorrências até a solução

**P1 · PARCIAL / NÃO LOCALIZADO**. Nível de prova: Código e requisitos dos planos.

Código de rastreio e comprovante não encerram eventos da transportadora, previsão por destino, conferência parcial, avaria, falta, troca/devolução, cancelamento parcial e crédito conciliado.

**Falta:** Criar ocorrência com responsável/prazo/resolução, status por destino/quantidade, revisão pós-aprovação e efeitos financeiros; homologar recebimento incompleto e encerramento da pendência.

Etapas: T084, T085, T090. Origens: SIC-045, SIC-131, SIC-133, SIC-134, PLB-25, PLB-26, PLB-27, PLB-39, PLC-63, SIC-043, DB-13.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md); [docs/order-workflow.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/order-workflow.md).

<a id="g26"></a>

### G26 — Campanha institucional com cronograma regressivo

**P1 · NÃO LOCALIZADO COMO JORNADA COMPLETA**. Nível de prova: Schema, rotas e planos.

As tabelas campaigns/magic_up_campaigns e página administrativa existente não comprovam campanha institucional vinculando briefing, evento, orçamento, verba, arte, destinos e marcos regressivos. A página administrativa não está no caminho normal.

**Falta:** Implementar entidade e jornada institucional, modelos reutilizáveis por cooperativa, marcos e alerta de prazo; relacionar entregas e conciliação à campanha.

Etapas: T086, T090. Origens: SIC-031, PLB-13, PLB-14, PLB-15, PLC-62.

Evidências: [bd-objetos.json](bd-objetos.json); [src/pages/admin/AdminCampanhasPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/pages/admin/AdminCampanhasPage.tsx); [src/routes/config/admin.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/routes/config/admin.ts); [docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json).

<a id="g27"></a>

### G27 — Hierarquia, identidade institucional e vínculos

**P1 · PARCIAL**. Nível de prova: Schema e rotas atuais.

Coexistem organizations, cooperativas e estruturas legadas. Há dois vocabulários/fontes de papel, abas que não seguem a rota, papel da Central e múltiplos vínculos/contexto ativo não fechados. Tema por instituição cadastrado não significa aplicado.

**Falta:** Consolidar autoridade de vínculo/papel, visibilidade da unidade ativa, acesso da Singular/Central e navegação por papel; impedir troca silenciosa de contexto e cadastros com papéis inválidos.

Etapas: T024, T043, T051, T057, T092. Origens: SIC-001, SIC-002, SIC-005, SIC-007, SIC-010, SIC-011, SIC-013, SIC-014, SIC-015, SIC-017, PLB-40, DOC-07, DB-29, DB-35, SIC-003, SIC-004, SIC-006.

Evidências: [src/routes/config/admin.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/routes/config/admin.ts); [src/pages/admin/sicoob/SicoobManagementPage.tsx](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/pages/admin/sicoob/SicoobManagementPage.tsx); [bd-colunas.json](bd-colunas.json); [docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/09-fluxos-sicoob.md).

<a id="g28"></a>

### G28 — Convites e configuração de Auth por ambiente

**P1 · PARCIAL**. Nível de prova: Configuração remota e código.

Cadastro público está desativado e confirmação automática está desativada; TOTP está habilitado. O site_url ainda aponta para domínio Lovable antigo e a allowlist contém o domínio juca1, não o endereço principal consultado. Isso exige revisar links de recuperação/convite. Não foram enviados e-mails a usuários nesta auditoria.

**Falta:** Alinhar domínio/callbacks autorizados e convite com escopo/expiração/replay; testar conta, MFA, recuperação e troca de unidade em ambiente próprio. HIBP/CAPTCHA/SSO não estão habilitados; tratar conforme requisito aprovado, sem presumir contratação.

Etapas: T005, T007, T043, T051, T095. Origens: DOC-06, SIC-016, DOC-15, DOC-04, DOC-14, FE-160, ADM-21.

Evidências: [bd-auth.json](bd-auth.json); [http-publico.json](http-publico.json); [docs/adr/0004-closed-platform-policy.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/adr/0004-closed-platform-policy.md).

<a id="g29"></a>

### G29 — Catálogo mestre somente leitura e coerência administrativa

**P1 · PARCIAL NA UI; BLOQUEIO DE ESCRITA CORRETO**. Nível de prova: Contrato explícito do usuário e código atual.

O bridge rejeita gravações por CATALOG_READ_ONLY conforme a regra do projeto. Formulários de produto, fornecedor, imagem e importação ainda tentam escrever. A falha do formulário deve ser corrigida sem abrir escrita no catálogo mestre. A ACL da credencial na origem não foi certificada nesta rodada.

**Falta:** Remover/desabilitar ações incompatíveis ou apontar manutenção para o sistema de origem; provar menor privilégio da identidade de consulta e esclarecer quem mantém preços/estoque.

Etapas: T058, T059, T060. Origens: PLA-X01, PLC-47, EDG-05, ADM-02, DOC-20, PLB-59, SIC-033, PLC-46, EDG-06.

Evidências: [supabase/functions/external-db-bridge/index.ts:479](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/functions/external-db-bridge/index.ts#L479); [supabase/functions/_shared/external-read-only.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/supabase/functions/_shared/external-read-only.ts); [src/hooks/useProductRegistration.ts:156](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/hooks/useProductRegistration.ts#L156).

<a id="g30"></a>

### G30 — Descoberta, comparação, curadoria e histórico de catálogo

**P2 · PARCIAL / CÓDIGO SEM INTEGRAÇÃO**. Nível de prova: Trilha documental e análise de imports; sem E2E novo.

Busca visual, histórico de preço, comprados juntos, listas por campanha, dimensões Sicoob do comparador, sinônimos e curadoria por cooperativa têm cobertura desigual, código sem consumidor ou requisito sem fluxo. Busca semântica corrigida não encerra todas essas modalidades.

**Falta:** Ligar apenas os recursos mantidos no escopo; alimentar histórico real, comparar critérios relevantes de compra e explicar curadoria; certificar RPC de busca visual e agendamento de alertas.

Etapas: T059, T060, T061, T092. Origens: FE-031, FE-040, FE-042, FE-050, FE-061, FE-070, PLB-03, PLB-05, PLB-06, PLB-08, SIC-030, DOC-19, FE-032, FE-043, FE-062, FE-194, DB-08.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md); [grafo-importacoes.json](grafo-importacoes.json).

<a id="g31"></a>

### G31 — Páginas administrativas e funcionalidades inacessíveis

**P2 · CÓDIGO SEM INTEGRAÇÃO / PARCIAL**. Nível de prova: Rotas, referências e análise estática.

Há páginas de auditoria, evidências, campanhas, newsletter, metas, promoção de usuário e estrutura institucional sem rota ou sem entrada. A análise conservadora detectou 367 módulos não alcançáveis a partir de main.tsx; esse número é de candidatos, não de funcionalidades faltantes.

**Falta:** Decidir recurso a recurso entre integrar, manter biblioteca e retirar legado; aplicar guard adequado e teste de navegação. Não ligar páginas de diagnóstico ou criação de usuário indiscriminadamente.

Etapas: T053, T061, T089, T092. Origens: ADM-01, ADM-03, ADM-04, ADM-05, ADM-06, ADM-07, ADM-09, ADM-10, ADM-11, FE-004, FE-009, FE-016, PLC-49, PLC-50, PLC-51, FE-005, FE-006, FE-093, FE-096, FE-097, FE-193, ADM-12, ADM-14, ADM-33, ADM-57, SIC-029, SIC-047, PLA-X02, PLA-D10.

Evidências: [grafo-importacoes.json](grafo-importacoes.json); [rotas-registradas.json](rotas-registradas.json); [src/routes/config/admin.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/routes/config/admin.ts); [src/routes/config/dev.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/routes/config/dev.ts).

<a id="g32"></a>

### G32 — Minha conta, ajuda, onboarding e navegação móvel

**P2 · PARCIAL / NÃO LOCALIZADO**. Nível de prova: Código e documentação.

Autosserviço de conta/preferências, ajuda, tour, atalhos e menus por papel têm lacunas; há entradas para destinos inexistentes e home pós-login que não coincide com a permissão. A demonstração visual não certifica o fluxo autenticado de cada papel.

**Falta:** Conectar preferências e ajuda reais; corrigir destinos, contadores e home por papel; oferecer controles por teclado e menus móveis com as áreas institucionais permitidas.

Etapas: T043, T060, T091, T092, T093. Origens: FE-008, FE-010, FE-011, FE-012, FE-013, FE-015, FE-171, FE-172, FE-173, DOC-52, PLB-28, PLB-46, PLB-48, PLB-49, FE-007, FE-041, FE-091, ADM-15.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md); [destinos-candidatos-sem-rota.json](destinos-candidatos-sem-rota.json).

<a id="g33"></a>

### G33 — BI, metas e dossiê do cliente

**P2 · PARCIAL / CÓDIGO SEM INTEGRAÇÃO**. Nível de prova: Código e inventário remoto de configuração.

Metas, segmentação, oportunidades, exportação de dossiê e criação de link público têm implementação desconectada. O diagnóstico antigo de CRM sem credenciais está superado: existem configurações de URL/anon/service do CRM no cofre da aplicação; a conectividade e permissões ainda não foram homologadas aqui.

**Falta:** Ligar KPIs a dados e janela temporal verificáveis, manter demo explícito, concluir exportação/compartilhamento e editar curadoria com IDs de produtos reais; validar fonte CRM sem migrar por suposição.

Etapas: T061, T077, T089. Origens: DOC-11, DOC-12, DOC-21, ADM-36, ADM-37, ADM-39, ADM-42, ADM-45, FE-143, DOC-03, FE-082, FE-121, FE-141, FE-192, ADM-46, EDG-38, SIC-121, SIC-123, PLB-51.

Evidências: [bd-integracoes-configuradas.json](bd-integracoes-configuradas.json); [src/hooks/bi/useClientBI.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/hooks/bi/useClientBI.ts); [docs/execucao/lacunas-funcionalidades-2026-10-11/06-frontend-admin-bi-ia.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/06-frontend-admin-bi-ia.md).

<a id="g34"></a>

### G34 — Magic Up colaborativo e construtores de workflow

**P2 · PARCIAL / STUB**. Nível de prova: Schema, código e decisão pendente.

Tabelas de colaboração, comentários e reações não encerram uma jornada utilizável. O canvas de workflows em memória não constitui automação persistida/executada. Preferências/feature flags e abas do CMS também têm consumidores incompletos; controles anunciados precisam demonstrar efeito no site, e não apenas salvar configuração.

**Falta:** Concluir persistência, permissões, compartilhamento, comentários e notificações dos recursos aprovados, ou registrar retirada formal e ajustar todos os requisitos herdados.

Etapas: T078, T079. Origens: ADM-31, ADM-53, DB-36, PLC-52, PLA-D09, ADM-19, ADM-26, ADM-29, DOC-37, FE-180.

Evidências: [bd-objetos.json](bd-objetos.json); [docs/execucao/decisoes_pendentes.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/decisoes_pendentes.md); [docs/execucao/lacunas-funcionalidades-2026-10-11/06-frontend-admin-bi-ia.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/06-frontend-admin-bi-ia.md).

<a id="g35"></a>

### G35 — Webhooks, eventos e reconciliação externa

**P1 · PARCIAL**. Nível de prova: Código e contratos documentados.

Cadastro de endpoint/segredo não fecha disparo autorizado, processamento de inbound, fila durável, retry limitado, deduplicação e reconciliação. Há caminhos cujo consumidor não acessa a configuração cadastrada e rotinas que apenas registram eventos.

**Falta:** Escolher contrato único para segredo/assinatura e destino, processar após persistir, separar tentativa de recibo e ligar métrica/alerta; homologar timeout, duplicata e replay.

Etapas: T047, T049, T079. Origens: EDG-15, EDG-16, EDG-17, EDG-18, EDG-19, PLC-45, DB-38, ADM-25.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/07-edge-functions-integracoes.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/07-edge-functions-integracoes.md); [docs/OBSERVABILITY.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/OBSERVABILITY.md).

<a id="g36"></a>

### G36 — Rotinas periódicas de negócio

**P2 · PARCIAL / SEM AGENDAMENTO IDENTIFICADO**. Nível de prova: Cron real e fontes locais.

Há 17 jobs ativos; portanto a afirmação geral de ausência de cron está errada. Porém funções de digest, follow-up, relatórios, alertas de preço e outras rotinas não possuem correspondente no conjunto de agendamentos observado. Marcar enviado não equivale a entregar.

**Falta:** Inventariar cada rotina por gatilho, frequência, identidade, recibo e dono; agendar apenas funções homologadas e monitorar atraso/erro/ausência de execução.

Etapas: T048, T049, T065, T089. Origens: EDG-24, EDG-25, EDG-41, DB-40, FE-061, FE-151, DOC-29, DOC-34, DOC-25, DB-37, EDG-26, SIC-056.

Evidências: [bd-cron.json](bd-cron.json); [docs/execucao/lacunas-funcionalidades-2026-10-11/07-edge-functions-integracoes.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/07-edge-functions-integracoes.md).

<a id="g37"></a>

### G37 — Autorização, limites e observabilidade das Edge Functions

**P1 · PARCIAL**. Nível de prova: Inventário remoto e revisão de handlers.

verify_jwt=false pode ser correto quando há autenticação própria, mas vários handlers legados classificados como autenticados não demonstram a guarda correspondente. Logging estruturado, validação de entrada, CORS e limites não são uniformes. O caso verify-email foi confirmado no bundle publicado (G05); os demais exigem paridade individual.

**Falta:** Auditar rota por rota; provar identidade e escopo no handler, limitar endpoints públicos e remover rotas inertes de privilégio elevado. Publicar e comparar hashes sem inferir paridade por ACTIVE.

Etapas: T025, T030, T095. Origens: EDG-03, EDG-11, EDG-27, EDG-39, EDG-40, PLC-36, PLC-38, EDG-08, EDG-09, EDG-14, EDG-35, EDG-37, EDG-54, PLA-D03.

Evidências: [bd-edges.json](bd-edges.json); [docs/execucao/lacunas-funcionalidades-2026-10-11/07-edge-functions-integracoes.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/07-edge-functions-integracoes.md).

<a id="g38"></a>

### G38 — Paridade de migrations e baseline

**P1 · PARCIAL; PASSIVO CONHECIDO**. Nível de prova: Comparação atual somente leitura.

Comparação atual: 597 arquivos (577 ativos/20 arquivados), 115 registros remotos, 86 alinhados, 462 locais sem ledger, 19 conteúdos não verificáveis, 9 nomes divergentes e 1 conteúdo divergente. As 491 diferenças estão na baseline: zero novas, zero resolvidas. Nome ausente no ledger não demonstra efeito ausente no schema.

**Falta:** Classificar cada diferença por efeito real, dependência e origem; resolver com baseline consolidada/reparo justificado ou migration nova específica. Nunca executar 462 arquivos em massa ou marcar aplicado sem prova.

Etapas: T021, T022, T023, T027, T028, T029, T030. Origens: DB-01, DB-03, PLC-24, PLA-T022, PLC-19, PLC-25, PLC-28, DOC-45, PLA-X05, PLA-T006.

Evidências: [ledger-comparado.json](ledger-comparado.json); [scripts/db/migration-ledger-baseline.json](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/scripts/db/migration-ledger-baseline.json); [scripts/db/check-migration-ledger-drift.mjs](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/scripts/db/check-migration-ledger-drift.mjs).

<a id="g39"></a>

### G39 — Qualidade dos testes e cobertura funcional

**P1 · PARCIAL**. Nível de prova: Configuração e simulações atuais.

O limite de cobertura de 80% incide em nove arquivos configurados, não no repositório inteiro. Specs institucionais não estão no testMatch principal; muitos testes verificam fixtures/lógica copiada. As simulações anteriores de aprovação/conversão omitiram o guard real e passaram sem cobrir a composição que falha.

**Falta:** Ampliar cobertura por risco e jornada, executar testes Deno relevantes e simulações com schema cumulativo, remover tautologias e produzir compra sintética autenticada com duas cooperativas e negativas.

Etapas: T012, T014, T018, T024, T096. Origens: QA-01, QA-02, QA-03, QA-09, QA-12, QA-13, QA-14, QA-15, QA-18, QA-51, PLC-15, PLC-16, PLC-17, QA-05, QA-06, QA-10, QA-19, QA-21, QA-23, QA-49, QA-07, DOC-57, EDG-56, SIC-012, DB-32, DB-33.

Evidências: [vitest.config.ts:39](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/vitest.config.ts#L39); [playwright.config.ts](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/playwright.config.ts); [.github/workflows/ci.yml:75](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/.github/workflows/ci.yml#L75); [simular-conversao-pedido-sicoob.py.json](simular-conversao-pedido-sicoob.py.json); [simular-aprovacao-publica.py.json](simular-aprovacao-publica.py.json).

<a id="g40"></a>

### G40 — Proteção de main e publicação

**P1 · PARCIAL**. Nível de prova: Configuração atual do GitHub.

Existe revisão obrigatória, mas required_status_checks está nulo e enforce_admins=false. Portanto revisão configurada não comprova checks mandatórios para merge. O sentinel detecta estado posterior, não substitui proteção preventiva.

**Falta:** Exigir os checks corretos e revisar bypass/publicadores com responsáveis; testar recusa de merge e amarrar artefato, migrations e Edge ao mesmo candidato aprovado.

Etapas: T012, T019, T097. Origens: PLC-02, QA-56, QA-57, QA-59, DOC-38, PLC-03, QA-38, QA-58, PLA-D11.

Evidências: [github-protecao.json](github-protecao.json); [github-rulesets.json](github-rulesets.json); [.github/workflows/branch-protection-sentinel.yml](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/.github/workflows/branch-protection-sentinel.yml).

<a id="g41"></a>

### G41 — CI autenticada e isolamento de homologação

**P1 · PARCIAL**. Nível de prova: GitHub atual e logs de falha.

Actions não está globalmente bloqueado: há sucessos atuais de ledger, segurança e CodeQL. O E2E de 13/10 no PR Dependabot falhou no preflight por credenciais ausentes; isso não prova que todas as contas inexistem, nem certifica a jornada. Falta homologação segregada e resultado integral do candidato.

**Falta:** Definir execução segura para PRs sem secrets, prover fixtures/personas no ambiente de teste e concluir E2E autenticado; distinguir falha de infraestrutura, teste e requisito ausente.

Etapas: T005, T011, T015, T018, T096. Origens: PLC-01, QA-11, QA-16, QA-17, QA-20, QA-31, PLC-04, PLC-07, PLC-26, PLC-30, QA-04, QA-39, QA-54, QA-60, EDG-31, FE-162.

Evidências: [github-main-runs.json](github-main-runs.json); [github-e2e-falha-resumo.json](github-e2e-falha-resumo.json); [.github/workflows/e2e.yml](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/.github/workflows/e2e.yml).

<a id="g42"></a>

### G42 — Pipeline, supply chain e reprodutibilidade

**P2 · PARCIAL COM ENTREGAS EXISTENTES**. Nível de prova: Workflows e execução atual.

Actions já usam SHAs fixados e há CodeQL/Gitleaks; não cabe declarar endurecimento não iniciado. Ainda há cobertura desigual de deploy/compare de Edge, inventário com validade, baseline de bundle e gates propostos sem execução contínua.

**Falta:** Fechar matriz de gatilhos/checks, integrar comparador de artefato publicado, atualizar inventário antes do vencimento e definir política de rollback/retensão/custo. Não adicionar ferramentas sem requisito ou benefício demonstrado.

Etapas: T015, T016, T017, T020, T027, T030. Origens: PLC-05, PLC-06, PLC-09, QA-35, QA-40, QA-42, QA-44, EDG-30, EDG-53, EDG-55, PLC-32, QA-26, QA-41.

Evidências: [github-main-runs.json](github-main-runs.json); [.github/workflows](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/.github/workflows); [docs/execucao/fechamento-tecnico-2026-10-08.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/fechamento-tecnico-2026-10-08.md).

<a id="g43"></a>

### G43 — Domínio publicado, cabeçalhos e exposição de relatórios

**P1 · PARCIAL COM DIVERGÊNCIAS**. Nível de prova: Consultas HTTP atuais.

Na consulta pública, / responde 200 sem CSP/nosniff, enquanto /login inclui ambos. Um relatório Markdown interno está acessível sem autenticação. /manifest.webmanifest retorna HTML, mas essa URL isolada não basta para afirmar que toda a PWA falhou. O domínio juca1 redireciona ao login da Vercel.

**Falta:** Cobrir raiz e rotas nos headers, retirar relatórios internos do public, identificar artefato servido e validar manifest efetivamente referenciado/Service Worker/instalação no endereço correto.

Etapas: T016, T095, T097. Origens: PLC-39, QA-33, QA-30, FE-170, QA-32.

Evidências: [http-publico.json](http-publico.json); [vercel.json](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/vercel.json); [public/reports/AUDIT_REPORT_20a6b98b1.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/public/reports/AUDIT_REPORT_20a6b98b1.md).

<a id="g44"></a>

### G44 — PWA, offline e push real

**P2 · PARCIAL / NÃO LOCALIZADO**. Nível de prova: Código, documentação e evidência histórica delimitada.

Service Worker e fallback offline têm evidência histórica local; isso não equivale a fila de gravação offline com reconciliação nem a Web Push. /instalar não está registrado. A rota de manifest consultada retorna HTML; verificar a URL real no HTML antes de fechar diagnóstico de instalação.

**Falta:** Conectar instalação e ícones/manifest corretos, especificar limitações offline e implementar sincronização/assinaturas apenas se mantidas no escopo, com permissão e deduplicação.

Etapas: T045, T048, T092, T093. Origens: FE-150, FE-170, QA-28, QA-29, QA-30, DOC-23, DOC-51, ADM-22.

Evidências: [src/components/layout/Header.tsx:118](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/src/components/layout/Header.tsx#L118); [public/sw.js](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/public/sw.js); [http-publico.json](http-publico.json); [docs/execucao/fechamento-tecnico-2026-10-08.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/fechamento-tecnico-2026-10-08.md).

<a id="g45"></a>

### G45 — Alertas operacionais, observabilidade e suporte

**P1 · PARCIAL / STUB**. Nível de prova: Código, cron e requisitos documentados.

Painel com valor fixo e health check não demonstram SLI/SLO, error budget ou alerta entregue. O worker apresenta erros reais que escapam à leitura apenas das linhas gravadas. Há telas de observabilidade/auditoria sem integração.

**Falta:** Medir fila, falha, idade e latência por serviço; entregar alertas a responsáveis definidos; ligar logs e métricas reais aos painéis e testar incidente/recuperação sem inventar saúde.

Etapas: T020, T049, T089, T094, T095, T098. Origens: DOC-30, DOC-31, DOC-32, DOC-33, EDG-43, EDG-44, EDG-46, EDG-47, QA-61, QA-63, QA-64, PLC-10, PLC-31, PLC-34, PLC-35, FE-181, EDG-42, EDG-45, EDG-48, QA-43, QA-62, DB-28, PLA-D04.

Evidências: [bd-cron-falhas-agrupadas.json](bd-cron-falhas-agrupadas.json); [docs/OBSERVABILITY.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/OBSERVABILITY.md); [docs/SLO.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/SLO.md); [docs/execucao/lacunas-funcionalidades-2026-10-11/10-testes-ci-infra.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/10-testes-ci-infra.md).

<a id="g46"></a>

### G46 — Backup, restauração e recuperação

**P1 · ACEITE NÃO DEMONSTRADO**. Nível de prova: Busca integral dos documentos versionados; sem restore nesta rodada.

Não foi localizada prova atual de restore completo medido de banco, Storage e Auth. Runbook e eventual backup da plataforma não demonstram recuperação. Também não cabe afirmar que o provedor não mantém backups sem consultar o contrato correspondente.

**Falta:** Ensaiar restauração em destino isolado, registrar RPO/RTO observados, dependências, acesso e limitações; definir modo de manutenção e contingência.

Etapas: T008, T028, T098. Origens: PLC-27, DOC-35, QA-65, QA-66.

Evidências: [docs/DR.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/DR.md); [docs/RUNBOOK.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/RUNBOOK.md); [docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json).

<a id="g47"></a>

### G47 — Privacidade, auditoria de acesso e credenciais

**P1 · PARCIAL / ACEITE NÃO DEMONSTRADO**. Nível de prova: Documentação, código e configuração delimitada.

Há trilhas e hardening, mas atendimento de titular, retenção por finalidade, revogação, log de acesso sensível e evidência de rotação histórica não estão encerrados. Não foi inferida rotação a partir de uma chave funcionar hoje.

**Falta:** Definir fluxos e responsáveis de acesso/revogação/exportação/descarte, preservar rastreabilidade e verificar rotação por evidência redigida; aplicar reautenticação às operações sensíveis mantidas.

Etapas: T007, T076, T095, T098. Origens: PLB-63, DB-26, DB-31, DB-41, PLC-33, QA-37, DOC-39, DOC-41, DOC-42, DOC-40, FE-182, QA-34, QA-36.

Evidências: [docs/RUNBOOKS/CREDENTIAL_ROTATION.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/RUNBOOKS/CREDENTIAL_ROTATION.md); [docs/security/RLS_MATRIX.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/security/RLS_MATRIX.md); [docs/SECURITY_RUNBOOK.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/SECURITY_RUNBOOK.md).

<a id="g48"></a>

### G48 — Qualidade visual e acessibilidade da jornada real

**P2 · PARCIAL**. Nível de prova: Dez imagens documentais inspecionadas e histórico de testes.

Há trabalho visual significativo em login, loja e demo, inclusive imagens desktop/mobile. As próprias prévias de loja/painel informam dados fictícios. A evidência visual histórica não certifica seleção, orçamento, aprovação, arte e recebimento conectados por todos os papéis.

**Falta:** Aplicar identidade à jornada real, testar teclado/leitor/zoom/contraste e desempenho autenticado em aparelhos representativos; validar com compradores e marketing e registrar problemas por tarefa.

Etapas: T091, T092, T093, T094. Origens: PLB-53, PLB-54, PLB-57, SIC-032, PLA-T092, PLA-T093, PLA-T094, PLB-52, PLC-08, QA-24, QA-25, QA-27, PLC-37.

Evidências: [docs/execucao/evidencias/visual](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/evidencias/visual); [docs/execucao/fechamento-tecnico-2026-10-08.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/fechamento-tecnico-2026-10-08.md); [docs/ACCESSIBILITY.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/ACCESSIBILITY.md).

<a id="g49"></a>

### G49 — Pós-venda e integração financeira externa

**P2 · NÃO LOCALIZADO COMO FLUXO COMPLETO / DECISÃO**. Nível de prova: Planos e inventário de código.

Gateway de pagamento, WhatsApp Business, ERP/SISBR, passagem formal ao fornecedor e controle de produção/qualidade aparecem em planos legados ou de expansão, mas não estão certificados como jornada integrada. Ter tabela de pagamento não comprova gateway/conciliação.

**Falta:** Separar requisitos obrigatórios do portal de orçamento das opções futuras; para os mantidos, definir contrato, credenciais/custo, webhook, conciliação e aceite institucional. Não contratar nem integrar por mera menção antiga.

Etapas: T079, T085, T088, T090. Origens: PLC-43, PLC-44, PLB-41, PLB-42, PLB-61, SIC-122, FE-190, EDG-36.

Evidências: [docs/execucao/lacunas-funcionalidades-2026-10-11/02-plano-original-benchmark.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/02-plano-original-benchmark.md); [docs/execucao/lacunas-funcionalidades-2026-10-11/03-planos-melhorias-correcoes.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/03-planos-melhorias-correcoes.md).

<a id="g50"></a>

### G50 — Conflitos de escopo: Bitrix, passkeys, white-label e legado

**P2 · DECISÃO DOCUMENTAL NECESSÁRIA**. Nível de prova: Documentos contraditórios.

SCOPE_ALIGNMENT exclui Bitrix, WebAuthn/2FA e gamificação do escopo inicial, enquanto documentos posteriores requisitam parte desses recursos; TOTP já existe. ADR de soft-delete é proposta. Componentes órfãos não devem ser ligados automaticamente para cumprir inventário antigo.

**Falta:** Registrar precedência/decisão por requisito, manter retiradas rastreáveis e eliminar promessas falsas da UI/docs. Não confundir passkey ausente com MFA TOTP inexistente; não reabrir escrita no catálogo.

Etapas: T004, T051, T078, T079, T100. Origens: DOC-13, DOC-16, DOC-22, DOC-44, DOC-56, PLA-D01, PLA-D06, PLA-D07, PLA-D08, PLA-D09, DOC-05, FE-084, FE-051, FE-161, FE-195, ADM-18, ADM-20, ADM-24, EDG-10, EDG-12, EDG-13, EDG-33, EDG-50, DB-15, DB-30, PLC-42, PLC-48, PLC-53, PLC-54.

Evidências: [docs/SCOPE_ALIGNMENT.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/SCOPE_ALIGNMENT.md); [docs/AUTH_PASSKEYS.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/AUTH_PASSKEYS.md); [docs/adr/0008-unified-soft-delete-policy.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/adr/0008-unified-soft-delete-policy.md); [docs/execucao/decisoes_pendentes.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/decisoes_pendentes.md).

<a id="g51"></a>

### G51 — Plano, responsáveis e evidências de encerramento

**P1 · PARCIAL DOCUMENTAL**. Nível de prova: Leitura integral do plano estruturado.

O plano vigente possui 100 etapas/1.000 subetapas, todas formalmente Planejada/desmarcadas, sem responsáveis/revisores nominais ou evidências anexadas. Há implementação em vários módulos; checklist vazio não significa 100% de código ausente. Relatórios históricos de fechamento técnico não substituem aceite de produto.

**Falta:** Atualizar uma matriz única com implementação, integração, validação e aceite separados; ligar cada requisito herdado à prova atual ou retirada formal; atribuir dono/revisor e invalidar provas afetadas pelo novo código.

Etapas: T001, T003, T004, T009, T100. Origens: PLA-T003, PLA-T004, PLA-D14, PLB-55, PLC-55.

Evidências: [docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json); [docs/execucao/fechamento-tecnico-2026-10-08.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/fechamento-tecnico-2026-10-08.md).

<a id="g52"></a>

### G52 — Local, GitHub e PRs ainda não reconciliados

**P2 · PARCIAL**. Nível de prova: Estado Git e GitHub atual.

Checkout original está em 6b71bdc09, 66 commits atrás de origin/main no instante consultado, com quatro arquivos alterados e documentos locais não rastreados. Main auditada é fff0b4cb6. PRs 94, 97, 100, 103 e 104 permanecem abertos. Não foi feito merge ou descartada mudança nesta auditoria.

**Falta:** Reconciliar cada diff/PR por conteúdo e proveniência; fechar substituídos somente após confirmar absorção e gates; preservar trabalhos locais. Não somar planos locais antigos como pendências novas automaticamente.

Etapas: T002, T010, T097. Origens: PLA-T002, PLA-T010, PLC-12, QA-46.

Evidências: [github-prs.json](github-prs.json); [local-AUDITORIA.md](local-AUDITORIA.md); [local-PLANO_100.md](local-PLANO_100.md).

<a id="g53"></a>

### G53 — Documentação, inventários e relatórios obsoletos

**P2 · PARCIAL / DIVERGENTE**. Nível de prova: Inventário completo e reconciliação documental.

README, índice de docs, rotas, APIs, papéis, Edge, exemplos e auditorias históricas divergem entre si. Existem links/arquivos anunciados inexistentes e afirmações de completude sem prova. PDFs são versões históricas extraídas, não certificação atual.

**Falta:** Gerar inventários a partir de contratos reais, preservar históricos como históricos, remover promessas falsas e corrigir links. Vincular relatório à data/SHA/ambiente e não servir documentação interna em public.

Etapas: T003, T009, T021, T023, T089, T100. Origens: DOC-10, DOC-26, DOC-43, DOC-49, DOC-50, DOC-53, DOC-54, DOC-55, DOC-58, DOC-59, DOC-60, DOC-61, DOC-62, DOC-63, DOC-64, PLC-11, PLC-56, DOC-46, FE-014, ADM-13, EDG-52, SIC-049, QA-22, QA-45, QA-47.

Evidências: [cobertura-documentos.csv](cobertura-documentos.csv); [docs/README.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/README.md); [docs/ROUTES.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/ROUTES.md); [docs/EDGE_FUNCTIONS.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/EDGE_FUNCTIONS.md); [docs/INVENTARIO_FUNCIONALIDADES_v2.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/INVENTARIO_FUNCIONALIDADES_v2.md).

<a id="g54"></a>

### G54 — Banco: recursos desconectados, schema e performance

**P2 · PARCIAL / CÓDIGO SEM INTEGRAÇÃO**. Nível de prova: Metadados remotos e rastreabilidade histórica.

Há tabelas/enum/functions legados sem consumidor, placeholders de migrações, trilhas sem tela, exportação que não comprova arquivo, busca visual/alertas que dependem de contratos ausentes e numeração a homologar sob concorrência. Contar todos os objetos do catálogo não é comparável a snapshot com escopo menor.

**Falta:** Verificar efeito real/consumidor por objeto, testar contratos e concorrência, medir desempenho por papel/dados representativos, remover legado somente após decisão e prova de ausência de dependência.

Etapas: T021, T023, T026, T028, T089. Origens: DB-02, DB-04, DB-05, DB-06, DB-07, DB-09, DB-10, DB-14, DB-20, DB-21, DB-27, DB-34, DB-39, DB-42, DOC-47, EDG-07, EDG-49.

Evidências: [bd-objetos.json](bd-objetos.json); [bd-funcoes.json](bd-funcoes.json); [bd-colunas.json](bd-colunas.json); [docs/execucao/lacunas-funcionalidades-2026-10-11/08-banco-migrations.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/lacunas-funcionalidades-2026-10-11/08-banco-migrations.md).

<a id="g55"></a>

### G55 — Manutenção e dívida técnica residual

**P2 · PARCIAL COM SANEAMENTO REGISTRADO**. Nível de prova: Histórico do mesmo código; suíte completa não reexecutada aqui.

O relatório de 08/10 registra TypeScript zero, lint zero erros/872 avisos e audit zero, além de testes aprovados. Não houve alteração de código entre esse merge e a main auditada. Esses resultados são históricos, não novos testes desta rodada. A antiga contagem 153/3.247/sete altos não deve ser repetida como atual.

**Falta:** Manter os gates e revalidar dependências no próximo lote de código; tratar avisos por risco, scripts quebrados e políticas de qualidade aprovadas. Não confundir estilo, código extenso e requisito de produto ausente.

Etapas: T013, T014, T017, T020. Origens: PLC-13, PLC-14, PLC-18, PLC-20, PLC-21, PLC-22, PLC-23, QA-48, QA-50, QA-55, FE-122, FE-123, ADM-17, QA-52, QA-53.

Evidências: [docs/execucao/fechamento-tecnico-2026-10-08.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/execucao/fechamento-tecnico-2026-10-08.md); [github-main-runs.json](github-main-runs.json).

<a id="g56"></a>

### G56 — Piloto, marca, pesquisa e aceite operacional

**P2 · DEPENDÊNCIA DE NEGÓCIO / TEMPO REAL**. Nível de prova: Ausência de aceite localizado nos planos e relatórios.

Marca, observação com compradores/marketing, primeira compra, segunda cooperativa, recebimento/financeiro e estabilidade por 30 dias não foram comprovados. O sistema permanece em construção conforme instrução do usuário; simulação não é operação real.

**Falta:** Após corrigir e homologar os bloqueios técnicos, obter aceites específicos, responsáveis, limites de piloto e evidências reais. Não reduzir as pendências atuais apenas a autorização e espera de 30 dias.

Etapas: T071, T091, T096, T098, T099, T100. Origens: PLB-54, PLB-55, PLB-57, PLB-60, PLB-62, SIC-074, SIC-142, PLA-T099, PLC-64, DOC-36.

Evidências: [docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json); [docs/pesquisa/2026-09-11/dossie.md](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/fff0b4cb60b23715661d5782cdf747df4ef0027d/docs/pesquisa/2026-09-11/dossie.md).

## Ordem técnica sugerida para a correção

1. Conter e corrigir confirmação de e-mail, isolamento de verbas e escrita de proposta aprovada; incluir negativas por papel/escopo/estado.
2. Corrigir chave de evidência e integração dos escritores com o guard; provar orçamento → aprovação → pedido com o schema cumulativo.
3. Fechar scanner/quarentena, registro do worker, entrega de notificações e configuração de Auth/Realtime.
4. Recuperar a jornada de compra: detalhe/PDF/token público, links, filtros, seleção entre módulos, persistência de kit e estados reais no BI.
5. Concluir governança institucional, arte por item/versão, capacidade dos kits, logística por destino, ocorrências, campanha e ciclo financeiro.
6. Reconciliar CI, artefatos, migrations por efeito e documentação; homologar em ambiente segregado; obter aceites de negócio e executar piloto autorizado.

Esta é uma ordem de dependência dos achados, não um novo plano artificial de 50/100/150 etapas. O plano existente já tem critérios suficientes; o trabalho necessário é ligar cada requisito a uma implementação e prova atual, resolvendo antes as contradições.

## Critério para encerrar uma pendência

Para cada requisito mantido: caminho acessível pela interface ou consumidor previsto; autorização no servidor; estado persistido correto; tratamento de vazio/erro/retry; teste positivo e negativo com dependências vigentes; publicação no destino de construção/homologação correto; evidência com SHA/data/ambiente e aceite do responsável. Retirada de escopo precisa decisão explícita, sem apagar a origem. Auditoria e simulação não substituem operação real onde o plano a exige.

Os arquivos brutos de inventário/metadata permanecem locais para inspeção técnica. Os entregáveis de consulta não contêm valores de credenciais. Nenhuma alteração de implementação foi feita durante esta auditoria.
