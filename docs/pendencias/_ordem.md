# Ordem de execucao (backlog)

Prioridade por dependencia (fundacao antes) e impacto de negocio.

| Ordem | ID | Prioridade | Status | Item |
|---|---|---|---|---|
| 1 | ADM-34 | P0 | PRONTO | BI 360 apresenta números fictícios como reais |
| 2 | DOC-01 | P0 | PRONTO | PDF, link público de aprovação e versões do orçamento sem caminho na interface |
| 3 | EDG-28 | P0 | BLOQUEADA_EXTERNA | Envio de NF-e e comprovante de entrega bloqueado pelo antivírus ausente |
| 4 | FE-001 | P0 | PRONTO | Detalhe do orçamento reduzido; página completa sem acesso |
| 5 | PLA-T075 | P0 | BLOQUEADA_EXTERNA | Scanner antimalware real |
| 6 | PLA-T098 | P0 | BLOQUEADA_EXTERNA | Preparar operação e autorizar piloto |
| 7 | PLB-56 | P0 | BLOQUEADA_EXTERNA | Políticas institucionais por cooperativa (alçada, cotação, arte, cancelamento, c |
| 8 | PLB-58 | P0 | BLOQUEADA_EXTERNA | Dados comerciais: SLA e origem de preço, estoque e prazo; regras de tributo, fre |
| 9 | PLB-59 | P0 | BLOQUEADA_EXTERNA | Privilégio somente leitura da identidade no catálogo mestre |
| 10 | PLB-60 | P0 | BLOQUEADA_EXTERNA | Homologação real, piloto, primeira compra e segunda cooperativa |
| 11 | PLC-01 | P0 | BLOQUEADA_EXTERNA | CI hospedada não executa na `main` (startup_failure) |
| 12 | PLC-02 | P0 | NAO_INICIADA | Proteção da `main` sem checks obrigatórios, com bypass de admin e ajustes de rep |
| 13 | PLC-40 | P0 | BLOQUEADA_EXTERNA | Scanner antimalware de documentos não configurado: ingestão de NF e comprovante  |
| 14 | QA-11 | P0 | PARCIAL | Gate E2E praticamente nunca verde: 2 sucessos em 677 execuções |
| 15 | QA-38 | P0 | PARCIAL | HEAD `dc08200` entrou na `main` sem CI concluído (PR #98 mesclado com gates verm |
| 16 | QA-56 | P0 | NAO_INICIADA | `main` sem status checks obrigatórios; validação pós-configuração nunca feita |
| 17 | SIC-021 | P0 | CONFIRMADO | RLS de pa_budgets permite autoalteração e acesso entre cooperativas |
| 18 | SIC-040 | P0 | PARCIAL | Conversão de orçamento em pedido barrada pelo guard de governança |
| 19 | SIC-041 | P0 | PARCIAL | Orçamento aprovado não congela itens nem valores |
| 20 | SIC-060 | P0 | PARCIAL | Resposta pelo link público barrada pelo guard |
| 21 | ADM-01 | P1 | ORFA | Gestão de catálogo admin (produtos, fornecedores, gravação) desligada do menu |
| 22 | ADM-02 | P1 | BLOQUEADA_EXTERNA | Escrita no catálogo bloqueada pelo contrato somente-leitura |
| 23 | ADM-15 | P1 | RESOLVIDO | Links internos quebrados nos componentes da fatia |
| 24 | ADM-19 | P1 | ORFA | Feature flags do sistema sem efeito |
| 25 | ADM-27 | P1 | ORFA | Preferências de notificação (canais, Não Perturbe, resumo) não são aplicadas |
| 26 | ADM-35 | P1 | STUB/MOCK | Notificação de "pico sazonal" disparada por dado simulado |
| 27 | ADM-38 | P1 | PARCIAL | "Criar orçamento com sugestões" perde cliente e itens |
| 28 | ADM-42 | P1 | BLOQUEADA_EXTERNA | BI depende do CRM externo sem credencial e não tem a rota anunciada |
| 29 | ADM-43 | P1 | STUB/MOCK | Tendências abre em modo demo para todos |
| 30 | ADM-54 | P1 | BLOQUEADA_EXTERNA | Credenciais de IA e voz pendentes (Lovable AI Gateway e ElevenLabs) |
| 31 | DB-01 | P1 | PARCIAL | Passivo de 491 divergências de ledger (repositório × banco) |
| 32 | DB-19 | P1 | PARCIAL | Verba por cooperativa, checagem de saldo e conciliação de verba |
| 33 | DB-22 | P1 | PARCIAL | Pipeline de notificações omnichannel nunca acionado (DND, resumo e canais sem ef |
| 34 | DB-40 | P1 | PARCIAL | Rotinas documentadas como agendadas sem `cron.schedule` |
| 35 | DB-43 | P1 | PARCIAL | IDs do `pg_net` reciclados colidem com a constraint global da outbox |
| 36 | DOC-02 | P1 | STUB/MOCK | "Copiar link" e "WhatsApp" na lista enviam URL interna, não o link de aprovação |
| 37 | DOC-05 | P1 | PARCIAL | Restrição por IP/geolocalização: validação no cliente, depois do login, e libera |
| 38 | DOC-06 | P1 | BLOQUEADA_EXTERNA | Configuração do Supabase Auth (plataforma fechada, HIBP no servidor, verificação |
| 39 | DOC-24 | P1 | ORFA | Aviso visual de preço estimado no simulador |
| 40 | DOC-27 | P1 | STUB/MOCK | Sistema de notificações multicanal (e-mail, SMS, WhatsApp, push, "Não perturbe", |
| 41 | DOC-28 | P1 | STUB/MOCK | E-mail transacional (status de pedido, orçamento enviado/aprovado) |
| 42 | DOC-29 | P1 | ORFA | Funções de rotina declaradas como "pg_cron" sem agendamento |
| 43 | DOC-32 | P1 | BLOQUEADA_EXTERNA | Sentry: DSN em produção e regras de alerta |
| 44 | DOC-36 | P1 | BLOQUEADA_EXTERNA | Checklist de Go-Live sem nenhum item cumprido ou evidenciado |
| 45 | DOC-38 | P1 | BLOQUEADA_EXTERNA | Proteção da branch `main` |
| 46 | DOC-42 | P1 | BLOQUEADA_EXTERNA | Pós-incidente `migrate-helper`: rotação de credenciais e revisão de logs |
| 47 | EDG-01 | P1 | BLOQUEADA_EXTERNA | Gateway de IA Lovable sem credencial confirmada (17 funções) |
| 48 | EDG-03 | P1 | PARCIAL | Funções de IA "authenticated" sem validação de JWT no handler |
| 49 | EDG-05 | P1 | PARCIAL | Telas de administração do catálogo escrevem num catálogo somente leitura |
| 50 | EDG-12 | P1 | PARCIAL | `sync-quote-bitrix`: fluxo ativo, porém incompleto |
| 51 | EDG-15 | P1 | PARCIAL | Disparo de webhooks de saída sempre rejeitado |
| 52 | EDG-16 | P1 | PARCIAL | Segredos HMAC criados pela UI não chegam às funções |
| 53 | EDG-20 | P1 | STUB/MOCK | E-mail transacional responde 501 |
| 54 | EDG-21 | P1 | BLOQUEADA_EXTERNA | Entrega via Resend não confirmada (aprovações Sicoob e OTP do step-up) |
| 55 | EDG-32 | P1 | ORFA | `verify-email` confirma e-mail de qualquer conta pelo UUID |
| 56 | EDG-41 | P1 | ORFA | 13 rotinas "de cron" sem agendamento |
| 57 | FE-002 | P1 | PRONTO | "Monte seu Kit" leva a rota inexistente `/kit-builder` |
| 58 | FE-003 | P1 | PRONTO | Links para `/catalogo` (rota inexistente) |
| 59 | FE-005 | P1 | ORFA | `/admin/cadastros` aponta para a página errada; submenu e "novo produto" quebrad |
| 60 | FE-010 | P1 | PRONTO | Sidebar ignora o controle de acesso Sicoob (itens levam a 403; gestor sem o próp |
| 61 | FE-012 | P1 | PRONTO | Admin/supervisor cai em "acesso negado" logo após o login |
| 62 | FE-015 | P1 | PRONTO | Link compartilhado de carrinho e `/carrinhos/novo` dão 404 |
| 63 | FE-020 | P1 | PARCIAL | Filtros exibidos e contados, mas não aplicados |
| 64 | FE-030 | P1 | STUB/MOCK | Selos de inteligência de mercado com dados fictícios na página do produto |
| 65 | FE-041 | P1 | PRONTO | Resultado "Cliente" da busca global leva a 404 |
| 66 | FE-060 | P1 | PARCIAL | Coleção → Orçamento abre o construtor vazio |
| 67 | FE-086 | P1 | STUB/MOCK | E-mails transacionais (orçamento e pedido) não implementados |
| 68 | FE-087 | P1 | PRONTO | Simulador de Preços e Tendências → Orçamento sem pré-carga |
| 69 | FE-095 | P1 | STUB/MOCK | "Gestão de Compras" com indicadores inventados e aprovação em lote sem ação |
| 70 | FE-100 | P1 | STUB/MOCK | Tela de Clientes com KPIs fictícios e botões sem ação |
| 71 | FE-110 | P1 | PARCIAL | Salvar kit completo grava status inválido; ciclo de vida do kit não implementado |
| 72 | FE-130 | P1 | STUB/MOCK | "Assistente IA" do Gerador de Mockup é simulado |
| 73 | FE-140 | P1 | STUB/MOCK | Tendências abre com dados fictícios para todos |
| 74 | PLA-D11 | P1 | BLOQUEADA_EXTERNA | Regras de branch e rastreabilidade de commits |
| 75 | PLA-D14 | P1 | BLOQUEADA_EXTERNA | Decisões transversais exigidas pela T004, ainda sem registro |
| 76 | PLA-T001 | P1 | PARCIAL | Manifesto de referência e ambientes |
| 77 | PLA-T004 | P1 | NAO_INICIADA | Atribuir responsáveis e resolver decisões |
| 78 | PLA-T005 | P1 | PARCIAL | Homologação segregada e personas de duas cooperativas |
| 79 | PLA-T006 | P1 | BLOQUEADA_EXTERNA | Acesso administrativo verificável ao banco canônico |
| 80 | PLA-T007 | P1 | PARCIAL | Inventário de credenciais e configuração pública |
| 81 | PLA-T008 | P1 | NAO_INICIADA | Ensaiar backup e recuperação |
| 82 | PLA-T009 | P1 | PARCIAL | Proveniência das evidências (herança de `producao_verificada`) |
| 83 | PLA-T012 | P1 | PARCIAL | Gates honestos e obrigatórios |
| 84 | PLA-T018 | P1 | PARCIAL | Homologar E2E, visual e desempenho |
| 85 | PLA-T019 | P1 | NAO_INICIADA | Proteger revisão, merge e publicação |
| 86 | PLA-T024 | P1 | PARCIAL | RLS por papel e unidade (matriz positiva e negativa) |
| 87 | PLA-T035 | P1 | PARCIAL | Criação idempotente: tabela e chave persistente |
| 88 | PLA-T037 | P1 | PARCIAL | Validar o contrato comercial no servidor |
| 89 | PLA-T039 | P1 | PARCIAL | Publicar o lote de orçamentos corrigido (frontend correspondente) |
| 90 | PLA-T040 | P1 | PARCIAL | Homologar a jornada de orçamento |
| 91 | PLA-T043 | P1 | PARCIAL | Logout, revogação e troca de unidade |
| 92 | PLA-T044 | P1 | PARCIAL | Autosave ligado à intenção confirmada |
| 93 | PLA-T048 | P1 | BLOQUEADA_EXTERNA | Homologar provedores, templates e cron |
| 94 | PLA-T056 | P1 | PARCIAL | Verba na aprovação (servidor e exceção) |
| 95 | PLA-T058 | P1 | PARCIAL | Catálogo mestre somente leitura (prova de ACL na origem) |
| 96 | PLA-T080 | P1 | NAO_INICIADA | Homologar arte e documentos no canônico |
| 97 | PLA-T087 | P1 | PARCIAL | Ciclo financeiro da verba |
| 98 | PLA-T088 | P1 | NAO_INICIADA | Fechamento de competência e conciliação financeira |
| 99 | PLA-T095 | P1 | PARCIAL | Segurança e privacidade integradas |
| 100 | PLA-T096 | P1 | NAO_INICIADA | Regressão e compra sintética integral |
| 101 | PLA-T097 | P1 | PARCIAL | Reconciliar e publicar candidato de release |
| 102 | PLA-T099 | P1 | BLOQUEADA_EXTERNA | Piloto e operação real (30 dias) |
| 103 | PLB-04 | P1 | STUB/MOCK | Comparação nas dimensões de decisão Sicoob (prazo inventado) |
| 104 | PLB-09 | P1 | STUB/MOCK | Frete por destino (tabela fixa) |
| 105 | PLB-10 | P1 | NAO_INICIADA | Tributos incluídos ou pendentes na proposta |
| 106 | PLB-13 | P1 | NAO_INICIADA | Campanha institucional com briefing |
| 107 | PLB-18 | P1 | PARCIAL | Prova técnica ligada ao item, à especificação e à proposta |
| 108 | PLB-19 | P1 | NAO_INICIADA | Competência de marca e fila de aprovação de artes |
| 109 | PLB-23 | P1 | PARCIAL | Distribuição por destino definida pelo comprador |
| 110 | PLB-27 | P1 | PARCIAL | Ocorrências de avaria, falta e troca até a solução |
| 111 | PLB-29 | P1 | NAO_INICIADA | Centro de custo e rateio |
| 112 | PLB-32 | P1 | NAO_INICIADA | Verba com quatro estados, competência e centro de custo |
| 113 | PLB-33 | P1 | ORFA | Pedido de aumento de limite sem fila de decisão |
| 114 | PLB-40 | P1 | PARCIAL | Dois domínios de pedido e comentários Sicoob na tabela legada |
| 115 | PLB-43 | P1 | PARCIAL | Conciliação de proposta, entrega e documento financeiro |
| 116 | PLB-54 | P1 | BLOQUEADA_EXTERNA | Pesquisa e usabilidade com compradores e marketing |
| 117 | PLB-55 | P1 | BLOQUEADA_EXTERNA | Responsáveis nominais, revisores e aceite das 100 etapas |
| 118 | PLB-57 | P1 | BLOQUEADA_EXTERNA | Aceite da marca Sicoob (guia vigente, logo, tipografia, contraste) |
| 119 | PLB-62 | P1 | BLOQUEADA_EXTERNA | Operação: suporte, treinamento e incidente controlado |
| 120 | PLC-03 | P1 | NAO_INICIADA | Publicação em produção sem gate de CI e "quem é produção" indefinido |
| 121 | PLC-24 | P1 | PARCIAL | Paridade GitHub × banco: 491 divergências históricas de migrations |
| 122 | PLC-26 | P1 | NAO_INICIADA | Ambiente de homologação (staging), preview de banco por PR e E2E fora do banco c |
| 123 | PLC-27 | P1 | NAO_INICIADA | Backup lógico e teste de restauração nunca executados |
| 124 | PLC-29 | P1 | PARCIAL | Rotinas declaradas como cron sem agendamento no repositório |
| 125 | PLC-33 | P1 | BLOQUEADA_EXTERNA | Rotação de credenciais históricas não comprovada |
| 126 | PLC-34 | P1 | STUB/MOCK | Sentry inativo na produção publicada |
| 127 | PLC-35 | P1 | NAO_INICIADA | Alertas operacionais inexistentes |
| 128 | PLC-38 | P1 | PARCIAL | Rate limiting só em parte das funções e ausente nas RPCs públicas |
| 129 | PLC-39 | P1 | PARCIAL | CSP e cabeçalhos de segurança ausentes na raiz do domínio publicado |
| 130 | PLC-41 | P1 | BLOQUEADA_EXTERNA | Entrega real de notificações (e-mail e Slack) e reconciliação não homologadas |
| 131 | PLC-47 | P1 | STUB/MOCK | Telas de cadastro e edição de catálogo gravam no catálogo externo somente leitur |
| 132 | PLC-64 | P1 | BLOQUEADA_EXTERNA | Homologação integral, gate de release e piloto |
| 133 | QA-01 | P1 | PARCIAL | Gate de cobertura de 80% restrito a 9 arquivos |
| 134 | QA-02 | P1 | STUB/MOCK | Cerca de 40 arquivos e 1.150 casos de teste tautológicos (lógica copiada para de |
| 135 | QA-03 | P1 | STUB/MOCK | Testes de RLS "estáticos" que dizem detectar drift do banco, mas comparam a fixt |
| 136 | QA-09 | P1 | ORFA | 25 de 26 testes Deno das Edge Functions nunca executam |
| 137 | QA-12 | P1 | ORFA | Specs `e2e/routes/sicoob/*.spec.ts` não pertencem a nenhum projeto Playwright |
| 138 | QA-13 | P1 | NAO_INICIADA | 16 cenários P0 de resiliência com `test.skip` permanente (UX de degradação não i |
| 139 | QA-14 | P1 | NAO_INICIADA | Nenhuma jornada E2E transacional (orçamento → aprovação → pedido) |
| 140 | QA-15 | P1 | NAO_INICIADA | Portal Sicoob sem nenhum E2E executável (13 rotas) |
| 141 | QA-16 | P1 | BLOQUEADA_EXTERNA | Personas e fixtures por papel Sicoob não provisionadas para CI |
| 142 | QA-17 | P1 | BLOQUEADA_EXTERNA | E2E roda contra o Supabase canônico, sem projeto de homologação |
| 143 | QA-31 | P1 | BLOQUEADA_EXTERNA | CodeQL sem upload ao Code Scanning e vermelho na `main` |
| 144 | QA-32 | P1 | STUB/MOCK | Dossiê "Enterprise Compliance" com alegações fixas e resultados descartados |
| 145 | QA-33 | P1 | NAO_INICIADA | Relatórios de auditoria com métricas fabricadas publicados na URL de produção |
| 146 | QA-39 | P1 | NAO_INICIADA | Otimização de custo e minutos de Actions não executada (runners voltaram a ser h |
| 147 | QA-40 | P1 | NAO_INICIADA | Pipeline de entrega incompleto (migrations, funções, produção, gate do Vercel) |
| 148 | QA-44 | P1 | PARCIAL | Inventário de runtime expira em 07/11/2026 sem rotina de atualização |
| 149 | QA-51 | P1 | ORFA | 5 simulações PostgreSQL prontas fora do CI |
| 150 | QA-57 | P1 | BLOQUEADA_EXTERNA | `enforce_admins` desligado e CODEOWNER único: todo merge é bypass de administrad |
| 151 | QA-61 | P1 | BLOQUEADA_EXTERNA | Regras de alerta do Sentry e canais Slack/PagerDuty sem implementação verificáve |
| 152 | QA-62 | P1 | NAO_INICIADA | `error-monitor` não publicado nem agendado; alerta só dentro do app |
| 153 | QA-65 | P1 | NAO_INICIADA | Restore nunca testado; backup lógico e runbooks de recuperação não criados |
| 154 | QA-66 | P1 | BLOQUEADA_EXTERNA | Alegações de DR não verificadas (PITR, versionamento de buckets, replicação) |
| 155 | SIC-010 | P1 | STUB/MOCK | A aba "Vínculos" grava papéis inexistentes em profiles.role |
| 156 | SIC-017 | P1 | PARCIAL | Gestor da Singular sem acesso às configurações do próprio escopo |
| 157 | SIC-020 | P1 | PARCIAL | Verba validada só no navegador na etapa de orçamento |
| 158 | SIC-022 | P1 | PARCIAL | Ciclo de verba incompleto (reserva, compromisso, consumo), sem fechamento nem li |
| 159 | SIC-024 | P1 | PARCIAL | Pedido de aumento de verba quebrado e sem decisão |
| 160 | SIC-026 | P1 | PARCIAL | Alçadas configuráveis que o servidor ignora |
| 161 | SIC-031 | P1 | NAO_INICIADA | Campanha institucional ligada a verba, arte, destinos e data do evento |
| 162 | SIC-042 | P1 | STUB/MOCK | /gestor/compras com indicadores fixos e botão sem ação |
| 163 | SIC-051 | P1 | PARCIAL | Idempotência do salvamento incompleta |
| 164 | SIC-053 | P1 | PRONTO | Preços do orçamento sem autoridade no servidor |
| 165 | SIC-054 | P1 | PARCIAL | Aprovação da Singular imposta só pelo navegador |
| 166 | SIC-061 | P1 | PARCIAL | Política de aprovação por cooperativa sem regras de alçada e sem tela |
| 167 | SIC-071 | P1 | NAO_INICIADA | Aprovação de arte sem papel de marketing/marca separado da despesa |
| 168 | SIC-072 | P1 | PARCIAL | Upload de arte sem quarentena nem scanner |
| 169 | SIC-100 | P1 | BLOQUEADA_EXTERNA | Scanner de malware não configurado |
| 170 | SIC-111 | P1 | PARCIAL | Link do e-mail/Slack de alçada leva para /admin/sicoob |
| 171 | SIC-112 | P1 | BLOQUEADA_EXTERNA | Provedores de notificação não configurados nem homologados |
| 172 | SIC-140 | P1 | STUB/MOCK | Isolamento entre cooperativas sem prova integrada |
| 173 | SIC-142 | P1 | BLOQUEADA_EXTERNA | Piloto, primeira compra real e segunda cooperativa |
| 174 | ADM-03 | P2 | ORFA | Marketing: Newsletter e Campanhas (menu leva a 404) |
| 175 | ADM-04 | P2 | ORFA | QA: Evidências de release, Auditoria RLS e detalhe de execução sem rota |
| 176 | ADM-05 | P2 | PARCIAL | Estrutura Sicoob: Singulares, PAs, Parceiros e Centrais |
| 177 | ADM-06 | P2 | ORFA | "Promover Agente" leva a 404 |
| 178 | ADM-07 | P2 | ORFA | Trilha de auditoria administrativa sem tela |
| 179 | ADM-09 | P2 | NAO_INICIADA | Views `sicoob_budget_audit` e `v_full_scope_grants` sem tela |
| 180 | ADM-10 | P2 | ORFA | Dashboard Executivo e metas de vendas desligados |
| 181 | ADM-11 | P2 | ORFA | Rotas administrativas sem ponto de entrada |
| 182 | ADM-13 | P2 | PARCIAL | Matriz RBAC exibida em "Auditoria RBAC" diverge das rotas reais |
| 183 | ADM-14 | P2 | PARCIAL | "Skins" no menu do usuário bloqueado para quem não é admin |
| 184 | ADM-18 | P2 | STUB/MOCK | Cupons: histórico "em breve" e uso nunca contabilizado |
| 185 | ADM-21 | P2 | ORFA | Central de segurança da própria conta inacessível para usuários comuns |
| 186 | ADM-23 | P2 | BLOQUEADA_EXTERNA | Varredura antivírus de uploads depende de chave ausente |
| 187 | ADM-26 | P2 | ORFA | CMS: abas SEO, Visual e Seções sem efeito no site |
| 188 | ADM-30 | P2 | PARCIAL | Consumo e cota de IA não cobre todas as funções |
| 189 | ADM-36 | P2 | ORFA | Exportar dossiê do cliente em PDF desligado |
| 190 | ADM-37 | P2 | PARCIAL | Compartilhamento público do dossiê: link nunca é gerado |
| 191 | ADM-44 | P2 | STUB/MOCK | Gráfico "Inteligência de Mercado" gera dados aleatórios sem histórico |
| 192 | ADM-45 | P2 | ORFA | Segmentação, Top clientes, Oportunidades e Tendência de receita não ligados |
| 193 | ADM-46 | P2 | NAO_INICIADA | Exportação de relatórios da Inteligência Comercial não existe |
| 194 | ADM-47 | P2 | STUB/MOCK | Detalhe de risco do produto usa dados gerados sem histórico |
| 195 | ADM-49 | P2 | ORFA | Templates de mockup (salvar e reaplicar configuração) |
| 196 | ADM-50 | P2 | ORFA | Anexo de arquivo de arte vetorial ao mockup |
| 197 | ADM-51 | P2 | PARCIAL | Erros de crédito/limite de IA não traduzidos (Mockup e Magic Up); lote engole fa |
| 198 | ADM-57 | P2 | ORFA | Dashboard pessoal (`/dashboard`) sem entrada na navegação |
| 199 | DB-03 | P2 | NAO_INICIADA | 35 migrations ativas sem ledger cujo efeito não existe no banco |
| 200 | DB-05 | P2 | ORFA | Alertas de queda de preço (favoritos e coleções) leem tabela inexistente |
| 201 | DB-06 | P2 | ORFA | Busca visual por imagem chama RPC com assinatura inexistente |
| 202 | DB-07 | P2 | NAO_INICIADA | Previsão de estoque futuro (reposição) |
| 203 | DB-09 | P2 | ORFA | Trilha de auditoria de ações do orçamento não ligada |
| 204 | DB-10 | P2 | PARCIAL | Numeração anual de orçamento à prova de concorrência |
| 205 | DB-13 | P2 | PARCIAL | Módulo de pedido genérico incompleto (pagamento, rastreio, modelos, entrega parc |
| 206 | DB-15 | P2 | NAO_INICIADA | Política unificada de soft-delete (lixeira) para entidades de negócio |
| 207 | DB-16 | P2 | PARCIAL | Política de aprovação versionada por cooperativa sem gestão |
| 208 | DB-23 | P2 | NAO_INICIADA | Web Push, SMS e WhatsApp |
| 209 | DB-25 | P2 | PARCIAL | Assinaturas Realtime sem publicação correspondente |
| 210 | DB-26 | P2 | NAO_INICIADA | Log de acesso a dados sensíveis (LGPD) |
| 211 | DB-29 | P2 | PARCIAL | Helpers semânticos de RBAC não adotados e papéis legados não removidos |
| 212 | DB-31 | P2 | PARCIAL | Step-up para promover/rebaixar dev e rotacionar/revogar segredos |
| 213 | DB-32 | P2 | STUB/MOCK | Checks de hardening dependem de job inexistente e de MFA "assumido" |
| 214 | DB-35 | P2 | PARCIAL | Isolamento multi-tenant por `organization_id` prometido e não implementado |
| 215 | DB-41 | P2 | PARCIAL | Política de retenção de dados incompleta |
| 216 | DOC-03 | P2 | ORFA | Flow em "modo CRM" (análise do cliente) inalcançável |
| 217 | DOC-04 | P2 | ORFA | Login social Google |
| 218 | DOC-07 | P2 | DOC_DIVERGENTE | Multi-tenancy por `organization_id` "com isolamento completo" |
| 219 | DOC-08 | P2 | STUB/MOCK | Estimativa de frete SEDEX/PAC do montador de kits é tabela fixa |
| 220 | DOC-11 | P2 | ORFA | BI: dossiê em PDF de 5 páginas e link público de dossiê sem acesso |
| 221 | DOC-12 | P2 | STUB/MOCK | BI mostra dados simulados quando falta histórico real |
| 222 | DOC-15 | P2 | NAO_INICIADA | Perfil e configurações do próprio usuário |
| 223 | DOC-16 | P2 | ORFA | Integração Bitrix24 (sincronização de empresas/negócios) sem interface nem agend |
| 224 | DOC-18 | P2 | ORFA | Gerador de mockups: templates de posicionamento e upload de arquivo de arte |
| 225 | DOC-20 | P2 | STUB/MOCK | Cadastros administrativos (produtos, fornecedores, preços de gravação) não grava |
| 226 | DOC-21 | P2 | ORFA | Metas de vendas |
| 227 | DOC-23 | P2 | PARCIAL | Notificações push (Web Push) |
| 228 | DOC-30 | P2 | STUB/MOCK | Botão "Executar auditoria agora" (auditoria de propriedade) sempre falha |
| 229 | DOC-31 | P2 | DOC_DIVERGENTE | Métricas de entrega de webhooks e painel `/admin/observabilidade` |
| 230 | DOC-33 | P2 | NAO_INICIADA | SLO/SLI sem medição |
| 231 | DOC-34 | P2 | STUB/MOCK | Relatório mensal de performance por e-mail e alertas por SMS |
| 232 | DOC-35 | P2 | NAO_INICIADA | Plano de recuperação de desastres (modo leitura, página de manutenção, teste de  |
| 233 | DOC-37 | P2 | STUB/MOCK | Feature flags e toggles do sistema sem efeito |
| 234 | DOC-39 | P2 | BLOQUEADA_EXTERNA | Secret scanning e push protection |
| 235 | DOC-41 | P2 | BLOQUEADA_EXTERNA | Pentests trimestrais e monitoramento externo de disponibilidade |
| 236 | DOC-43 | P2 | DOC_DIVERGENTE | ADR 0003: "100% das edge functions com Zod" |
| 237 | DOC-48 | P2 | BLOQUEADA_EXTERNA | ADR 0001 (buckets): PDF de proposta em bucket privado enviado ao Bitrix por URL  |
| 238 | DOC-49 | P2 | DOC_DIVERGENTE | Auditorias "enterprise": criptografia em repouso e "cold storage" dados como con |
| 239 | DOC-50 | P2 | ORFA | ROUTES.md desatualizado e páginas planejadas sem rota |
| 240 | DOC-51 | P2 | ORFA | "Instalar App" leva a rota inexistente (`/instalar` → 404) |
| 241 | DOC-54 | P2 | DOC_DIVERGENTE | order-workflow.md: testes citados não existem e status divergem |
| 242 | DOC-55 | P2 | DOC_DIVERGENTE | SICOOB_TESTING.md: papéis de teste não existem no RBAC |
| 243 | DOC-56 | P2 | BLOQUEADA_EXTERNA | SCOPE_ALIGNMENT contradiz README e inventário |
| 244 | EDG-06 | P2 | PARCIAL | Seis funções leem o catálogo só por variável de ambiente |
| 245 | EDG-07 | P2 | PARCIAL | Funções que leem `products` local (inexistente) e `price_history` não alimentado |
| 246 | EDG-10 | P2 | ORFA | `bitrix-sync` sem chamador e com ações de deal não implementadas |
| 247 | EDG-11 | P2 | ORFA | `quote-sync` legado: sem uso, sem autenticação e lendo a base errada |
| 248 | EDG-13 | P2 | NAO_INICIADA | Recebimento de eventos do Bitrix (leads/negócios) |
| 249 | EDG-17 | P2 | PARCIAL | `webhook-inbound` registra, mas não processa |
| 250 | EDG-18 | P2 | NAO_INICIADA | n8n: gatilhos de workflow por evento e enriquecimento de pedidos |
| 251 | EDG-19 | P2 | PARCIAL | Sem fila durável de webhooks: retry dentro da própria requisição |
| 252 | EDG-22 | P2 | STUB/MOCK | Digest de notificações configurável na UI, mas nunca enviado |
| 253 | EDG-23 | P2 | NAO_INICIADA | Omnichannel de notificações e canais push/SMS/WhatsApp |
| 254 | EDG-24 | P2 | ORFA | Relatórios agendados: UI cria, ninguém envia |
| 255 | EDG-25 | P2 | PARCIAL | Lembrete de follow-up marca "enviado" sem enviar |
| 256 | EDG-27 | P2 | PARCIAL | Alerta de novo dispositivo sem e-mail e sem autenticação |
| 257 | EDG-29 | P2 | PARCIAL | Aprovação pública descarta a observação do cliente |
| 258 | EDG-30 | P2 | PARCIAL | Pipeline de publicação cobre 7 de 100 funções |
| 259 | EDG-33 | P2 | NAO_INICIADA | Desafio WebAuthn no servidor (`webauthn-challenge`) |
| 260 | EDG-34 | P2 | PARCIAL | `secure-upload` não varre arquivos de fato |
| 261 | EDG-35 | P2 | BLOQUEADA_EXTERNA | `dropbox-list`: credencial ausente, sem renovação e sem autenticação |
| 262 | EDG-36 | P2 | BLOQUEADA_EXTERNA | `cnpj-lookup` depende de `CNPJA_API_KEY` não configurada |
| 263 | EDG-38 | P2 | PARCIAL | Dossiê BI compartilhável sem criação de link e sem conteúdo |
| 264 | EDG-39 | P2 | PARCIAL | Padrão de CORS não aplicado |
| 265 | EDG-40 | P2 | PARCIAL | `config.toml` não declara gateway das funções com autenticação própria |
| 266 | EDG-42 | P2 | PARCIAL | Auditoria de órfãos: botão "Executar agora" sempre falha |
| 267 | EDG-43 | P2 | PARCIAL | Monitores de erro sem execução e sem substituto |
| 268 | EDG-44 | P2 | NAO_INICIADA | Alertas Sentry e gates de observabilidade das Edge Functions |
| 269 | EDG-45 | P2 | ORFA | `health-check` sem monitor de disponibilidade |
| 270 | EDG-47 | P2 | STUB/MOCK | `connections-hub-audit` aprova sem verificar e executa rotinas |
| 271 | EDG-50 | P2 | PARCIAL | `mcp-server` expõe só 4 ferramentas de leitura |
| 272 | EDG-54 | P2 | PARCIAL | Inventário de segredos incompleto e verificador não criado |
| 273 | EDG-55 | P2 | PARCIAL | Capacidade esgotada: 106 fontes para 100 vagas |
| 274 | FE-004 | P2 | ORFA | Itens da sidebar sem rota |
| 275 | FE-006 | P2 | ORFA | "Estrutura SICOOB" sem páginas dedicadas |
| 276 | FE-007 | P2 | STUB/MOCK | Command palette (⌘K) com destinos e ações sem efeito |
| 277 | FE-008 | P2 | NAO_INICIADA | Central de Ajuda inexistente |
| 278 | FE-009 | P2 | ORFA | 35 rotas sem nenhum ponto de entrada na navegação |
| 279 | FE-011 | P2 | PARCIAL | Contadores de pendência da sidebar nunca aparecem |
| 280 | FE-013 | P2 | NAO_INICIADA | "Minha conta" / perfil do usuário não existe (redirects temporários) |
| 281 | FE-014 | P2 | PARCIAL | "SSOT" de rotas divergente: matriz RBAC e `docs/ROUTES.md` |
| 282 | FE-021 | P2 | STUB/MOCK | Chips de categoria ativa usam lista mockada |
| 283 | FE-022 | P2 | PARCIAL | Deep links para o Super Filtro com parâmetros não reconhecidos |
| 284 | FE-031 | P2 | ORFA | Histórico de preço do produto não exibido |
| 285 | FE-040 | P2 | PARCIAL | Busca global só procura produtos e clientes |
| 286 | FE-042 | P2 | ORFA | Busca visual por foto e busca avançada não ligadas |
| 287 | FE-050 | P2 | ORFA | Sugestão "comprados juntos" pronta e não exibida |
| 288 | FE-061 | P2 | PARCIAL | Alertas de queda de preço sem agendamento |
| 289 | FE-070 | P2 | ORFA | "Onda C6" do comparador praticamente toda órfã |
| 290 | FE-080 | P2 | PARCIAL | Kanban de orçamentos cobre 5 de 13 status |
| 291 | FE-081 | P2 | STUB/MOCK | Limite de desconto exibido fixo em 10% |
| 292 | FE-082 | P2 | ORFA | Insight de margem vs. histórico do vendedor não exibido |
| 293 | FE-084 | P2 | BLOQUEADA_EXTERNA | Sincronização com Bitrix24 no orçamento |
| 294 | FE-090 | P2 | STUB/MOCK | Painel financeiro do pedido com margem fixa de 32% |
| 295 | FE-092 | P2 | ORFA | Alçada superior (diretoria) calculada e nunca usada |
| 296 | FE-111 | P2 | STUB/MOCK | Estimativa de frete do kit com tabela fixa |
| 297 | FE-120 | P2 | STUB/MOCK | Simulador de Preços, aba "Por Tiragem": preço do produto e seleção ignorados |
| 298 | FE-121 | P2 | ORFA | Recursos do simulador antigo (cenários A×B, nicho, upsell) desligados |
| 299 | FE-131 | P2 | PARCIAL | "Visualizar com Logo" não pré-seleciona o produto no gerador |
| 300 | FE-132 | P2 | STUB/MOCK | Match recorre a 24 produtos fictícios e analisa no máximo 500 produtos |
| 301 | FE-141 | P2 | ORFA | Inteligência Comercial: oportunidades e tendência de receita sem tela |
| 302 | FE-143 | P2 | ORFA | Metas de vendas prontas e não exibidas |
| 303 | FE-150 | P2 | NAO_INICIADA | Push e sincronização offline do PWA não implementados |
| 304 | FE-151 | P2 | PARCIAL | Relatórios agendados sem disparo |
| 305 | FE-160 | P2 | ORFA | Login social (Google/SSO) desligado |
| 306 | FE-170 | P2 | PARCIAL | PWA não instalável e "Instalar App" leva a 404 |
| 307 | FE-181 | P2 | BLOQUEADA_EXTERNA | Variáveis de ambiente usadas e não documentadas (Sentry desligado) |
| 308 | FE-191 | P2 | STUB/MOCK | Painel "Saúde dos Testes & CI" com números fixos |
| 309 | PLA-D01 | P2 | BLOQUEADA_EXTERNA | Sync Bitrix24 ativa ou abandonada |
| 310 | PLA-D04 | P2 | BLOQUEADA_EXTERNA | Telemetria de erros: Sentry e entrega real |
| 311 | PLA-D10 | P2 | BLOQUEADA_EXTERNA | Views de auditoria em tela |
| 312 | PLA-T003 | P2 | PARCIAL | Rastreabilidade integral com aceite |
| 313 | PLA-T011 | P2 | PARCIAL | Runners, cotas, custo e artefatos |
| 314 | PLA-T014 | P2 | PARCIAL | Testes ignorados e cobertura real |
| 315 | PLA-T015 | P2 | PARCIAL | Reorganizar execução e custo da CI |
| 316 | PLA-T016 | P2 | PARCIAL | Artefato único e reproduzível |
| 317 | PLA-T017 | P2 | PARCIAL | Endurecer Actions e dependências |
| 318 | PLA-T020 | P2 | PARCIAL | Operação observável da CI |
| 319 | PLA-T021 | P2 | PARCIAL | Inventário completo de schema |
| 320 | PLA-T022 | P2 | PARCIAL | Reconciliar migrations e baseline |
| 321 | PLA-T023 | P2 | PARCIAL | Tipos, APIs e inventário de runtime |
| 322 | PLA-T030 | P2 | PARCIAL | Certificar banco e recursos Edge |
| 323 | PLA-T033 | P2 | PARCIAL | Versão observada pela tela na transição de status |
| 324 | PLA-T036 | P2 | PARCIAL | Identidade dos itens: remoção com vínculos |
| 325 | PLA-T038 | P2 | PARCIAL | Editor e conversão transacional (homologação) |
| 326 | PLA-T041 | P2 | PARCIAL | Identidade e recuperação de rascunhos |
| 327 | PLA-T042 | P2 | PARCIAL | Formato, retenção e concorrência entre abas |
| 328 | PLA-T045 | P2 | NAO_INICIADA | Homologar edição resiliente |
| 329 | PLA-T046 | P2 | PARCIAL | Eventos e outbox de notificações |
| 330 | PLA-T047 | P2 | PARCIAL | Deduplicação e elegibilidade do destinatário |
| 331 | PLA-T049 | P2 | PARCIAL | Falhas de entrega e alertas |
| 332 | PLA-T050 | P2 | NAO_INICIADA | Homologar notificações ponta a ponta |
| 333 | PLA-T051 | P2 | PARCIAL | Convites institucionais (homologação) |
| 334 | PLA-T052 | P2 | PARCIAL | Políticas e alçadas versionadas |
| 335 | PLA-T053 | P2 | PARCIAL | Fila de aprovação e delegação (homologação) |
| 336 | PLA-T054 | P2 | NAO_INICIADA | Propostas institucionais comparáveis |
| 337 | PLA-T055 | P2 | NAO_INICIADA | Escolha e fornecedor único |
| 338 | PLA-T057 | P2 | NAO_INICIADA | Homologar governança entre cooperativas |
| 339 | PLA-T059 | P2 | PARCIAL | Normalizar produto, preço, estoque e validade |
| 340 | PLA-T060 | P2 | PARCIAL | Homologar descoberta e seleção na loja |
| 341 | PLA-T063 | P2 | NAO_INICIADA | Modelar embalagem e capacidade física |
| 342 | PLA-T064 | P2 | NAO_INICIADA | Validar embalagem no servidor |
| 343 | PLA-T065 | P2 | PARCIAL | Previsão e prazo de reposição |
| 344 | PLA-T066 | P2 | PARCIAL | Cotação e publicação de kit |
| 345 | PLA-T069 | P2 | PARCIAL | Diferenças comerciais da recompra (homologação) |
| 346 | PLA-T070 | P2 | NAO_INICIADA | Homologar catálogo, kits e recompra conectados |
| 347 | PLA-T071 | P2 | BLOQUEADA_EXTERNA | Marca e ativos institucionais |
| 348 | PLA-T072 | P2 | PARCIAL | Vincular arte ao item e à versão |
| 349 | PLA-T073 | P2 | PARCIAL | Prova técnica e decisão de arte |
| 350 | PLA-T074 | P2 | PARCIAL | Ingestão e quarentena documental |
| 351 | PLA-T076 | P2 | NAO_INICIADA | Retenção, revogação e recuperação de anexos |
| 352 | PLA-T077 | P2 | PARCIAL | Arte, exportações e dossiê |
| 353 | PLA-T079 | P2 | BLOQUEADA_EXTERNA | Webhooks, Bitrix e serviços externos (decisão D01) |
| 354 | PLA-T081 | P2 | PARCIAL | Paginação e distribuição logística |
| 355 | PLA-T082 | P2 | NAO_INICIADA | Importação assistida de destinos (CSV/XLSX) |
| 356 | PLA-T083 | P2 | PARCIAL | Reconfirmar estoque e registrar expedição |
| 357 | PLA-T085 | P2 | NAO_INICIADA | Avarias, devoluções e cancelamentos |
| 358 | PLA-T086 | P2 | PARCIAL | Campanha e cronograma regressivo |
| 359 | PLA-T089 | P2 | PARCIAL | Auditoria, indicadores e suporte (decisão D10) |
| 360 | PLA-T090 | P2 | NAO_INICIADA | Homologar fechamento de campanha distribuída |
| 361 | PLA-T091 | P2 | BLOQUEADA_EXTERNA | Pesquisa com compradores e marketing |
| 362 | PLA-T092 | P2 | PARCIAL | Experiência de loja e identidade visual |
| 363 | PLA-T093 | P2 | PARCIAL | Acessibilidade e dispositivos |
| 364 | PLA-T094 | P2 | PARCIAL | Desempenho por jornada |
| 365 | PLA-T100 | P2 | BLOQUEADA_EXTERNA | Encerrar requisitos e instituir evolução |
| 366 | PLA-X01 | P2 | STUB/MOCK | UI administrativa grava no catálogo externo, que agora é somente leitura |
| 367 | PLB-01 | P2 | PARCIAL | Múltiplo de compra e mínimo uniforme |
| 368 | PLB-02 | P2 | PARCIAL | Horário da consulta de estoque e condição de reconfirmação |
| 369 | PLB-11 | P2 | PARCIAL | Prazo decomposto (análise, arte, produção, transporte) e promessa de prazo |
| 370 | PLB-14 | P2 | ORFA | Tela de campanhas sem rota |
| 371 | PLB-15 | P2 | NAO_INICIADA | Marcos de campanha e planejamento regressivo |
| 372 | PLB-16 | P2 | PARCIAL | Biblioteca institucional de marcas e ativos |
| 373 | PLB-20 | P2 | PARCIAL | Capacidade de embalagem validada no servidor |
| 374 | PLB-21 | P2 | PARCIAL | Modelos de kit por ocasião Sicoob, público e faixa de orçamento |
| 375 | PLB-24 | P2 | PARCIAL | Expedição parcial por destino com saldo a expedir |
| 376 | PLB-25 | P2 | PARCIAL | Rastreio com eventos e previsão por destino |
| 377 | PLB-26 | P2 | PARCIAL | Estado "parcialmente entregue" e itens em estágios diferentes |
| 378 | PLB-28 | P2 | PARCIAL | Solicitação institucional distinta do construtor do vendedor |
| 379 | PLB-30 | P2 | NAO_INICIADA | Cotações externas, fornecedor único e comparação exigida na decisão |
| 380 | PLB-31 | P2 | STUB/MOCK | PDF da proposta: "Versão" mostra o status e selo de autenticidade sem verificaçã |
| 381 | PLB-34 | P2 | STUB/MOCK | Verba inventada (R$ 50.000) e selo "Análise em Tempo Real" |
| 382 | PLB-35 | P2 | PARCIAL | Fila de aprovações orientada à decisão e devolução para correção |
| 383 | PLB-36 | P2 | NAO_INICIADA | Exceções governadas com validade e limites |
| 384 | PLB-38 | P2 | PARCIAL | Dossiê completo e linha do tempo única do pedido |
| 385 | PLB-39 | P2 | NAO_INICIADA | Revisão depois da aprovação e cancelamento parcial |
| 386 | PLB-41 | P2 | NAO_INICIADA | Passagem formal do pedido ao fornecedor |
| 387 | PLB-42 | P2 | NAO_INICIADA | Produção e controle de qualidade |
| 388 | PLB-44 | P2 | BLOQUEADA_EXTERNA | Reconfirmação de disponibilidade com evidência e reserva |
| 389 | PLB-45 | P2 | PARCIAL | Recompra sem revalidar arte e sem diferenças por item |
| 390 | PLB-46 | P2 | PARCIAL | Início orientado às pendências |
| 391 | PLB-48 | P2 | PARCIAL | Navegação por papel: comprador vê ferramentas de vendedor e markup |
| 392 | PLB-49 | P2 | STUB/MOCK | Central de ajuda e suporte com links mortos e botões sem ação |
| 393 | PLB-50 | P2 | PARCIAL | Avisos por evento: só aprovação sai do portal |
| 394 | PLB-51 | P2 | PARCIAL | Indicadores de ciclo, retrabalho, entrega e funil |
| 395 | PLB-53 | P2 | PARCIAL | Jornada completa por teclado, zoom e leitor de tela |
| 396 | PLB-63 | P2 | BLOQUEADA_EXTERNA | Privacidade (LGPD): atendimento a titular e revogação |
| 397 | PLC-04 | P2 | PARCIAL | Ambientes e segredos do GitHub sem segregação nem inventário completo |
| 398 | PLC-05 | P2 | PARCIAL | Pipeline de entrega de migrations e Edge Functions incompleto |
| 399 | PLC-06 | P2 | ORFA | Comparador "código publicado × repositório" das Edge Functions não está ligado |
| 400 | PLC-07 | P2 | PARCIAL | Custo e eficiência da esteira em runners hospedados |
| 401 | PLC-08 | P2 | PARCIAL | Defeitos residuais nos workflows e cobertura de performance só em `/login` |
| 402 | PLC-10 | P2 | NAO_INICIADA | Alertas de falha de CI e de "commit sem PR" |
| 403 | PLC-15 | P2 | PARCIAL | Cobertura de testes medida só em 9 arquivos |
| 404 | PLC-19 | P2 | PARCIAL | Drift de `types.ts` e inventário vivo do banco fora do CI |
| 405 | PLC-25 | P2 | NAO_INICIADA | Schema baseline versionado, tag e documento de baseline |
| 406 | PLC-28 | P2 | NAO_INICIADA | Congelamento e caminho único de escrita no banco |
| 407 | PLC-30 | P2 | BLOQUEADA_EXTERNA | Seed determinístico de homologação bloqueado |
| 408 | PLC-31 | P2 | NAO_INICIADA | Runbooks operacionais previstos não escritos |
| 409 | PLC-32 | P2 | BLOQUEADA_EXTERNA | Limite de 100 Edge Functions do plano Supabase esgotado |
| 410 | PLC-36 | P2 | PARCIAL | Logging estruturado ausente em 77 Edge Functions legadas |
| 411 | PLC-42 | P2 | BLOQUEADA_EXTERNA | Bitrix24: decisão de produto e homologação pendentes |
| 412 | PLC-43 | P2 | NAO_INICIADA | Gateway de pagamento (Mercado Pago), webhooks e conciliação automática |
| 413 | PLC-44 | P2 | NAO_INICIADA | WhatsApp Business API (envio de link de aprovação, notificações de status, chat) |
| 414 | PLC-46 | P2 | BLOQUEADA_EXTERNA | Catálogo externo: credencial somente leitura certificada e semântica de reserva  |
| 415 | PLC-48 | P2 | STUB/MOCK | Login por passkey/WebAuthn exposto na UI, mas desativado |
| 416 | PLC-49 | P2 | ORFA | Páginas administrativas prontas e não roteadas |
| 417 | PLC-50 | P2 | ORFA | RPCs e tabelas prontas sem nenhuma tela |
| 418 | PLC-51 | P2 | ORFA | Views de auditoria sem painel (`sicoob_budget_audit`, `v_full_scope_grants`) |
| 419 | PLC-55 | P2 | NAO_INICIADA | Decisões pendentes e backlog sem dono, prazo ou rastreio |
| 420 | PLC-56 | P2 | PARCIAL | Documentação legada contradiz o estado real |
| 421 | PLC-57 | P2 | NAO_INICIADA | Capacidade física da embalagem do kit não validada |
| 422 | PLC-58 | P2 | PARCIAL | Previsão de estoque do kit sem níveis de confiança (buffer fixo de 3 dias) |
| 423 | PLC-60 | P2 | NAO_INICIADA | Cotações institucionais (2–3 propostas de fornecedores) e exceção de fornecedor  |
| 424 | PLC-61 | P2 | NAO_INICIADA | Importação assistida da distribuição (destinos e quantidades por planilha) |
| 425 | PLC-62 | P2 | NAO_INICIADA | Campanhas: marcos regressivos e modelos salvos por cooperativa |
| 426 | PLC-63 | P2 | PARCIAL | Ciclo pós-venda incompleto (cancelamento por item/destino, avaria, crédito, conc |
| 427 | QA-04 | P2 | BLOQUEADA_EXTERNA | Suítes remotas que dependem de credenciais nunca criadas |
| 428 | QA-05 | P2 | ORFA | `no-empty-rls-policies` nunca é ligado ao CI |
| 429 | QA-06 | P2 | PARCIAL | Gate de "skips críticos" com escopo cego |
| 430 | QA-08 | P2 | NAO_INICIADA | Markup padrão para resposta de preço sem markup (teste desligado aguardando impl |
| 431 | QA-10 | P2 | PARCIAL | Matriz de cobertura funcional por módulo: lacunas |
| 432 | QA-18 | P2 | STUB/MOCK | Testes E2E que sempre passam ou se pulam por falta de dados |
| 433 | QA-20 | P2 | PARCIAL | Gate E2E incompatível com PRs do Dependabot |
| 434 | QA-23 | P2 | NAO_INICIADA | Testes de contrato Pact (frontend ↔ n8n/webhooks) |
| 435 | QA-24 | P2 | PARCIAL | WCAG 2.1 AA sem gate nas páginas autenticadas |
| 436 | QA-25 | P2 | PARCIAL | Lighthouse só em `/login`, sem backend e instável |
| 437 | QA-34 | P2 | PARCIAL | `security-compliance` roda a cada push na `main` com service role no banco canôn |
| 438 | QA-35 | P2 | NAO_INICIADA | Endurecimento da cadeia de suprimentos dos workflows não iniciado |
| 439 | QA-36 | P2 | NAO_INICIADA | Verificação automática do inventário de secrets ("a criar") e documento desatual |
| 440 | QA-41 | P2 | NAO_INICIADA | Lint SQL de migrations e runbook de migrations |
| 441 | QA-43 | P2 | NAO_INICIADA | Falhas de CI e rotinas agendadas sem notificação nem issue |
| 442 | QA-49 | P2 | ORFA | Gates de qualidade prontos que nunca rodam contra o código real |
| 443 | QA-54 | P2 | ORFA | Runner self-hosted abandonado, mas ainda registrado no repositório |
| 444 | QA-58 | P2 | NAO_INICIADA | Ruleset com bypass do Lovable e configurações do repositório pendentes |
| 445 | QA-63 | P2 | ORFA | Gates de observabilidade documentados que não existem ou não rodam |
| 446 | QA-64 | P2 | NAO_INICIADA | Alertas operacionais de banco e deploy (Etapa 48) |
| 447 | SIC-001 | P2 | ORFA | Telas de Centrais/Singulares/PAs/Cooperativas órfãs |
| 448 | SIC-002 | P2 | NAO_INICIADA | Papel e escopo da Central (visão consolidada das Singulares) |
| 449 | SIC-005 | P2 | ORFA | Tema e identidade por Central/Singular cadastrados mas nunca aplicados |
| 450 | SIC-011 | P2 | PARCIAL | Vocabulário legado de papéis em código e RLS vivos |
| 451 | SIC-012 | P2 | STUB/MOCK | Seed e login de teste com papéis inexistentes |
| 452 | SIC-013 | P2 | PARCIAL | Duas fontes de verdade para papel e vínculo |
| 453 | SIC-015 | P2 | NAO_INICIADA | Múltiplos vínculos e contexto ativo (cooperativa/PA) visível |
| 454 | SIC-016 | P2 | PARCIAL | Convite institucional sem e-mail e dependente de conta criada pelo admin |
| 455 | SIC-023 | P2 | ORFA | budgetService.updateBudget grava consumo absoluto pelo cliente |
| 456 | SIC-025 | P2 | ORFA | Verba da cooperativa (cooperativa_budgets) sem uso |
| 457 | SIC-027 | P2 | NAO_INICIADA | Remanejamento de verba entre PAs |
| 458 | SIC-028 | P2 | STUB/MOCK | Indicadores de verba com competência errada e valor fixo |
| 459 | SIC-029 | P2 | ORFA | Auditoria de verba e concessões sem tela |
| 460 | SIC-030 | P2 | NAO_INICIADA | Catálogo, curadoria e preço contratado por cooperativa |
| 461 | SIC-033 | P2 | BLOQUEADA_EXTERNA | Certificação do catálogo mestre somente leitura na origem |
| 462 | SIC-043 | P2 | ORFA | SLA de pedido inerte |
| 463 | SIC-044 | P2 | PARCIAL | Carrinho mostra alçada mas não saldo de verba; alçada por categoria com tipo inc |
| 464 | SIC-045 | P2 | PARCIAL | Cancelamento parcial e regra pós-produção |
| 465 | SIC-046 | P2 | ORFA | Consolidação de orçamentos sem desdobramento |
| 466 | SIC-050 | P2 | PARCIAL | Autorização de status por escopo: corrigida no SQL, falta a versão da tela |
| 467 | SIC-052 | P2 | PARCIAL | Preservação de IDs de itens: resolvida para itens, com resíduos |
| 468 | SIC-062 | P2 | PARCIAL | Alçada superior ("Diretoria") sem papel próprio e com regra divergente |
| 469 | SIC-063 | P2 | PARCIAL | Delegação de aprovação inacessível ao titular pela UI |
| 470 | SIC-064 | P2 | NAO_INICIADA | Propostas institucionais comparáveis e escolha de fornecedor |
| 471 | SIC-070 | P2 | PARCIAL | Arte ligada ao pedido, não ao item, sem invalidação por mudança comercial |
| 472 | SIC-073 | P2 | PARCIAL | Biblioteca institucional de marca por cooperativa |
| 473 | SIC-074 | P2 | BLOQUEADA_EXTERNA | Aceite formal de marca e ativos Sicoob |
| 474 | SIC-080 | P2 | PARCIAL | Intenção de recompra persistida, com resíduos de validação |
| 475 | SIC-090 | P2 | NAO_INICIADA | Capacidade física da embalagem do kit |
| 476 | SIC-101 | P2 | NAO_INICIADA | Retenção, revogação, descarte e órfãos no Storage |
| 477 | SIC-102 | P2 | PARCIAL | Finalidades de documento restritas |
| 478 | SIC-110 | P2 | PARCIAL | Decisão da Singular não notifica o PA; destinatários sem filtro de ativo |
| 479 | SIC-113 | P2 | PARCIAL | Notificações de desconto e comentários gravadas pelo navegador |
| 480 | SIC-114 | P2 | NAO_INICIADA | Eventos de arte, documento, remessa e avaria sem notificação |
| 481 | SIC-120 | P2 | PARCIAL | Relatório Sicoob sem paginação e sem os recortes planejados |
| 482 | SIC-130 | P2 | PARCIAL | Expedição parcial por item e destino |
| 483 | SIC-131 | P2 | PARCIAL | Recebimento e conferência de pedido avulso |
| 484 | SIC-132 | P2 | NAO_INICIADA | Importação assistida de distribuição |
| 485 | SIC-133 | P2 | NAO_INICIADA | Ocorrências (avaria, falta, devolução) e atendimento ligado ao pedido |
| 486 | SIC-136 | P2 | BLOQUEADA_EXTERNA | Reconfirmação de disponibilidade antes da expedição |
| 487 | SIC-141 | P2 | NAO_INICIADA | Parâmetros operacionais por cooperativa |
| 488 | ADM-08 | P3 | STUB/MOCK | Painéis "Auditoria Enterprise" e "Evidências" com números fixos |
| 489 | ADM-12 | P3 | ORFA | Página dedicada de status de conexões substituída |
| 490 | ADM-16 | P3 | ORFA | Métricas de templates de kit sem rota |
| 491 | ADM-17 | P3 | ORFA | Página de exemplos de desafio MFA (dev) sem rota |
| 492 | ADM-20 | P3 | STUB/MOCK | Passkeys/WebAuthn: UI exposta, função desligada |
| 493 | ADM-22 | P3 | PARCIAL | Push de segurança só com a aba aberta (sem Web Push) |
| 494 | ADM-24 | P3 | BLOQUEADA_EXTERNA | Aba Bitrix24 depende de decisão de escopo |
| 495 | ADM-25 | P3 | PARCIAL | n8n: credenciais de API configuráveis, sem consumidor |
| 496 | ADM-28 | P3 | STUB/MOCK | Painel "Omnichannel": métrica fixa e filas que nunca andam |
| 497 | ADM-29 | P3 | STUB/MOCK | Fila de otimização "executa" sem otimizar nada |
| 498 | ADM-31 | P3 | STUB/MOCK | "Workflows IA": canvas só em memória |
| 499 | ADM-32 | P3 | STUB/MOCK | "Qualidade do catálogo" com percentuais inventados (e órfão) |
| 500 | ADM-33 | P3 | ORFA | Componentes legados ou duplicados órfãos |
| 501 | ADM-39 | P3 | NAO_INICIADA | Recomendações por ramo de atividade: curadoria fixa, editor não feito |
| 502 | ADM-40 | P3 | PARCIAL | Tendência setorial sempre "estável" e categoria adivinhada pelo nome |
| 503 | ADM-41 | P3 | STUB/MOCK | "Alertas inteligentes" com lista fixa (e órfão) |
| 504 | ADM-48 | P3 | PARCIAL | Reposições limitadas a 200 registros e progresso fictício |
| 505 | ADM-52 | P3 | BLOQUEADA_EXTERNA | Motor alternativo de mockup (NanoBanana) não publicável |
| 506 | ADM-53 | P3 | NAO_INICIADA | Colaboração no Magic Up (comentários, link público, reações) |
| 507 | ADM-55 | P3 | PARCIAL | TTS sem fallback e com mensagem de erro enganosa |
| 508 | ADM-56 | P3 | PARCIAL | Entrada por voz do Flow: indicador não acionado e STT diferente do agente |
| 509 | DB-02 | P3 | STUB/MOCK | Migrations-esqueleto de dez/2025 (10 tabelas placeholder) |
| 510 | DB-04 | P3 | PARCIAL | Documentação de schema desatualizada em relação ao banco |
| 511 | DB-08 | P3 | PARCIAL | Objetos do catálogo externo documentados e não ligados à interface |
| 512 | DB-11 | P3 | NAO_INICIADA | Assinatura digitalizada do vendedor nos PDFs |
| 513 | DB-12 | P3 | PARCIAL | Evidência de aprovação pública: verificação e rotação de chave sem uso |
| 514 | DB-14 | P3 | ORFA | Enums de status de pedido sem coluna |
| 515 | DB-17 | P3 | NAO_INICIADA | Alertas de gestor por Slack/e-mail |
| 516 | DB-18 | P3 | ORFA | Templates de mockup, mídia de componente e buckets de arte planejados |
| 517 | DB-20 | P3 | STUB/MOCK | Relatório de performance Sicoob (EXPLAIN por papel) |
| 518 | DB-21 | P3 | ORFA | Hierarquia legada (`singulares`, `pontos_atendimento`, `pa_singularidades`) |
| 519 | DB-24 | P3 | ORFA | RPCs de notificação duplicadas e não usadas |
| 520 | DB-27 | P3 | PARCIAL | Trilhas de auditoria gravadas sem tela de consulta |
| 521 | DB-28 | P3 | STUB/MOCK | Painel de saúde de segurança com status fixo |
| 522 | DB-30 | P3 | STUB/MOCK | Login por passkey (WebAuthn) |
| 523 | DB-33 | P3 | STUB/MOCK | Seed e provisionamento de cenários QA fictícios |
| 524 | DB-34 | P3 | STUB/MOCK | Processador de exportação v3 marca job concluído sem gerar arquivo |
| 525 | DB-36 | P3 | NAO_INICIADA | Colaboração no Magic Up (comentários, reações, links públicos) |
| 526 | DB-37 | P3 | NAO_INICIADA | Expurgo do cache de insights de IA |
| 527 | DB-38 | P3 | PARCIAL | Monitoramento de entrega de webhooks com alerta |
| 528 | DB-39 | P3 | NAO_INICIADA | Blog e portfólio (CMS) sem tela |
| 529 | DB-42 | P3 | BLOQUEADA_EXTERNA | Decisões de arquitetura pendentes sobre objetos de schema |
| 530 | DOC-09 | P3 | PARCIAL | Deep linking do catálogo não inclui o modo de visualização |
| 531 | DOC-10 | P3 | DOC_DIVERGENTE | Divergências descritivas do README |
| 532 | DOC-13 | P3 | STUB/MOCK | Passkeys/WebAuthn: hook com retorno fixo |
| 533 | DOC-14 | P3 | NAO_INICIADA | CAPTCHA, reautenticação e página `Security.tsx` |
| 534 | DOC-17 | P3 | ORFA | Painel de recomendações de IA e chat reutilizável |
| 535 | DOC-19 | P3 | ORFA | Gráfico de histórico de preços do produto |
| 536 | DOC-22 | P3 | DOC_DIVERGENTE | Gamificação e loja de recompensas |
| 537 | DOC-25 | P3 | PARCIAL | Inteligência de mercado: limpeza diária do cache e validação Zod |
| 538 | DOC-26 | P3 | DOC_DIVERGENTE | Inventário de funcionalidades desatualizado (arquivos inexistentes e órfãos) |
| 539 | DOC-40 | P3 | NAO_INICIADA | Inventário de segredos: script de conferência e coluna "Configurado em" |
| 540 | DOC-44 | P3 | PARCIAL | ADR 0008: soft-delete unificado |
| 541 | DOC-45 | P3 | NAO_INICIADA | ADR 0009: migrations "expand & contract" |
| 542 | DOC-46 | P3 | DOC_DIVERGENTE | Regra dos helpers RBAC não cumprida nas policies novas |
| 543 | DOC-47 | P3 | BLOQUEADA_EXTERNA | Lacunas conhecidas na matriz RLS (admin não enxerga coleções e campanhas alheias |
| 544 | DOC-52 | P3 | STUB/MOCK | Menu do usuário: item "Ajuda" sem ação |
| 545 | DOC-53 | P3 | DOC_DIVERGENTE | INVENTARIO v2: rotas e perfis inexistentes |
| 546 | DOC-57 | P3 | NAO_INICIADA | Testes de contrato (Pact) com o n8n |
| 547 | DOC-58 | P3 | PARCIAL | Configuração global de locale e fuso (pt-BR / America/Sao_Paulo) |
| 548 | DOC-59 | P3 | PARCIAL | Exportação Excel: componente reutilizável e lista de clientes |
| 549 | DOC-60 | P3 | DOC_DIVERGENTE | HOOKS_USAGE_GUIDE: `useCRUD` inexistente |
| 550 | DOC-61 | P3 | DOC_DIVERGENTE | Documentos de performance contraditórios e auditoria trimestral vencida |
| 551 | DOC-62 | P3 | DOC_DIVERGENTE | Documentos e memórias referenciados que não existem no repositório |
| 552 | DOC-63 | P3 | DOC_DIVERGENTE | Edge functions documentadas como ativas, mas desativadas (410/501) |
| 553 | DOC-64 | P3 | DOC_DIVERGENTE | SECURITY_RUNBOOK: Security Center "somente admins", mas a rota exige `dev` |
| 554 | EDG-02 | P3 | STUB/MOCK | Respostas determinísticas/fixas quando a IA falha |
| 555 | EDG-04 | P3 | ORFA | `generate-mockup-nanobanana` mantida como fonte morta |
| 556 | EDG-08 | P3 | ORFA | Endpoints inertes (410) ainda publicados e página morta chamando um deles |
| 557 | EDG-09 | P3 | PARCIAL | Diagnóstico `creds_health` não expandido |
| 558 | EDG-14 | P3 | ORFA | Segredos cadastráveis na UI que nenhuma função usa |
| 559 | EDG-26 | P3 | STUB/MOCK | `cleanup-notifications` e `process-queue` redundantes/vazias |
| 560 | EDG-31 | P3 | ORFA | Seeds e diagnóstico de QA sem caminho de uso |
| 561 | EDG-37 | P3 | ORFA | Utilitários órfãos publicados |
| 562 | EDG-46 | P3 | STUB/MOCK | `system-healthcheck` com resultado fixo |
| 563 | EDG-48 | P3 | STUB/MOCK | Teste de conexão "MCP" fingido |
| 564 | EDG-49 | P3 | ORFA | `migration-health-check` sem chamador |
| 565 | EDG-51 | P3 | BLOQUEADA_EXTERNA | Voz depende de ElevenLabs e do gateway de IA |
| 566 | EDG-52 | P3 | PARCIAL | `docs/EDGE_FUNCTIONS.md` desatualizado |
| 567 | EDG-53 | P3 | PARCIAL | Relatório de divergência obsoleto e scripts fora do CI |
| 568 | EDG-56 | P3 | STUB/MOCK | Testes e scripts de integração placeholder |
| 569 | FE-016 | P3 | ORFA | Páginas existentes em `src/pages` sem rota |
| 570 | FE-032 | P3 | ORFA | Componentes de produto planejados e não ligados |
| 571 | FE-043 | P3 | STUB/MOCK | Componentes de busca com resultados mock (órfãos) |
| 572 | FE-051 | P3 | ORFA | Mini-carrinho com checkout e cupom (modelo e-commerce) órfão |
| 573 | FE-062 | P3 | ORFA | Componentes de favoritos e coleções não ligados |
| 574 | FE-083 | P3 | ORFA | Componentes de orçamento de versões anteriores sem uso |
| 575 | FE-085 | P3 | STUB/MOCK | "Editar" item no resumo do construtor sem ação |
| 576 | FE-091 | P3 | STUB/MOCK | Filtro de pedidos: botão "Aplicar" sem ação |
| 577 | FE-093 | P3 | ORFA | Componentes de pedido órfãos |
| 578 | FE-096 | P3 | ORFA | Página antiga de aprovações do gestor (com canais e-mail/Slack) órfã |
| 579 | FE-097 | P3 | ORFA | Histórico de aprovações Sicoob (página) órfão |
| 580 | FE-112 | P3 | ORFA | Comparar kits e dados mock do construtor sem uso |
| 581 | FE-122 | P3 | ORFA | Calculadora didática de personalização sem rota |
| 582 | FE-123 | P3 | ORFA | Camada service/repository de personalização sem uso |
| 583 | FE-142 | P3 | STUB/MOCK | BI com cliente de demonstração |
| 584 | FE-161 | P3 | STUB/MOCK | Passkeys/biometria: hook stub |
| 585 | FE-162 | P3 | ORFA | Login rápido de personas de teste órfão (com senha padrão) |
| 586 | FE-171 | P3 | STUB/MOCK | Atalhos de teclado anunciados que não funcionam ou conflitam |
| 587 | FE-172 | P3 | PARCIAL | Tour de onboarding aponta para elementos inexistentes |
| 588 | FE-173 | P3 | PARCIAL | Navegação mobile sem as áreas Sicoob |
| 589 | FE-180 | P3 | ORFA | Registro de feature flags inteiro órfão |
| 590 | FE-182 | P3 | ORFA | Criptografia de PII no cliente órfã (e com segredo público) |
| 591 | FE-190 | P3 | BLOQUEADA_EXTERNA | Navegador Dropbox depende de token, só lista e não está no menu |
| 592 | FE-192 | P3 | NAO_INICIADA | Exportação Excel da lista de clientes (guia de integração não executado) |
| 593 | FE-193 | P3 | ORFA | Utilitários de infraestrutura planejados sem uso |
| 594 | FE-194 | P3 | ORFA | Cadastro de ramos e segmentos de atividade sem tela |
| 595 | FE-195 | P3 | PARCIAL | Bloqueio geográfico por país gravado como cidade ("provisório") |
| 596 | PLA-D03 | P3 | BLOQUEADA_EXTERNA | `mcp-keys-revoke`: publicação e trilha atômica |
| 597 | PLA-D06 | P3 | BLOQUEADA_EXTERNA | Módulo white-label (`companies`) |
| 598 | PLA-D07 | P3 | BLOQUEADA_EXTERNA | `roles`, `user_2fa_settings`, `personalization_techniques`, `user_passkeys`, `co |
| 599 | PLA-D08 | P3 | BLOQUEADA_EXTERNA | Candidatos a remoção (`pontos_atendimento`, `singulares`, `pa_singularidades`, ` |
| 600 | PLA-D09 | P3 | BLOQUEADA_EXTERNA | Magic Up colaborativo: terminar ou remover |
| 601 | PLA-T002 | P3 | BLOQUEADA_EXTERNA | Preservar e reconciliar trabalhos locais (worktrees) |
| 602 | PLA-T010 | P3 | PARCIAL | Reconciliação de PRs pendentes |
| 603 | PLA-T013 | P3 | PARCIAL | Dívida técnica residual |
| 604 | PLA-T026 | P3 | PARCIAL | Integridade e desempenho do banco |
| 605 | PLA-T028 | P3 | PARCIAL | Ensaiar evolução e compatibilidade |
| 606 | PLA-T061 | P3 | PARCIAL | Templates, favoritos e coleções |
| 607 | PLA-T067 | P3 | PARCIAL | Persistência e compartilhamento de kits |
| 608 | PLA-T078 | P3 | NAO_INICIADA | Colaboração Magic Up (decisão D09) |
| 609 | PLA-T084 | P3 | PARCIAL | Rastreio e recebimento |
| 610 | PLA-X02 | P3 | ORFA | `AuditEvidenceDashboard` órfão e com evidências fixas no código |
| 611 | PLA-X03 | P3 | ORFA | `sicoobBudgetService.updateBudget` órfão que grava verba pelo cliente |
| 612 | PLA-X04 | P3 | ORFA | Alçada de diretoria fixa no cliente e sem uso |
| 613 | PLA-X05 | P3 | PARCIAL | Allowlist de referências de runtime desatualizada |
| 614 | PLB-03 | P3 | NAO_INICIADA | Correção sugerida explícita e vocabulário de sinônimos |
| 615 | PLB-05 | P3 | PARCIAL | Listas por campanha e colaboração por cooperativa |
| 616 | PLB-06 | P3 | PARCIAL | Recomendações explicáveis por regra |
| 617 | PLB-07 | P3 | PARCIAL | Estoque futuro com nível de confiança |
| 618 | PLB-08 | P3 | PARCIAL | Catálogo personalizado por cooperativa sem bifurcar código |
| 619 | PLB-12 | P3 | NAO_INICIADA | Análise manual quando o catálogo não tem dado suficiente |
| 620 | PLB-17 | P3 | PARCIAL | Assistente de briefing estruturado para kits e campanhas |
| 621 | PLB-22 | P3 | PARCIAL | Reordenar itens do kit por botões |
| 622 | PLB-37 | P3 | PARCIAL | Delegação restrita (sem arte e só no painel admin) |
| 623 | PLB-47 | P3 | NAO_INICIADA | Troca de cooperativa sem aviso de trabalho não salvo |
| 624 | PLB-52 | P3 | PARCIAL | Core Web Vitals das jornadas autenticadas no domínio de homologação |
| 625 | PLB-61 | P3 | BLOQUEADA_EXTERNA | Exportação ou integração ERP/SISBR |
| 626 | PLC-09 | P3 | NAO_INICIADA | Endurecimento da cadeia de suprimentos dos workflows |
| 627 | PLC-11 | P3 | NAO_INICIADA | Higiene e documentação da esteira |
| 628 | PLC-12 | P3 | PARCIAL | PRs absorvidos pelo #98 continuam abertos |
| 629 | PLC-13 | P3 | NAO_INICIADA | Convenção de commits (commitlint) e isolamento das edições do Lovable |
| 630 | PLC-14 | P3 | NAO_INICIADA | Versionamento semântico e CHANGELOG automático |
| 631 | PLC-16 | P3 | NAO_INICIADA | Três diretórios de teste em paralelo |
| 632 | PLC-17 | P3 | NAO_INICIADA | Política de testes instáveis (flaky) com quarentena e prazo |
| 633 | PLC-18 | P3 | PARCIAL | `eslint-disable` sem justificativa e arquivos acima de 700 linhas |
| 634 | PLC-20 | P3 | NAO_INICIADA | Painel de dívida técnica com tendência semanal |
| 635 | PLC-21 | P3 | PARCIAL | Varredura de segredos no pre-commit |
| 636 | PLC-22 | P3 | NAO_INICIADA | Lint de SQL das migrations no CI |
| 637 | PLC-23 | P3 | PARCIAL | Orçamento de bundle só por chunk |
| 638 | PLC-37 | P3 | NAO_INICIADA | Analytics de produto (PostHog) |
| 639 | PLC-45 | P3 | PARCIAL | Workflows n8n (aprovado → e-mail, pedido → notificação, pagamento → Bitrix) |
| 640 | PLC-52 | P3 | ORFA | Magic Up colaborativo (comentários, compartilhamento público, reações) |
| 641 | PLC-53 | P3 | ORFA | Módulo white-label de comparação sem importador |
| 642 | PLC-54 | P3 | BLOQUEADA_EXTERNA | Objetos candidatos à remoção sem decisão |
| 643 | PLC-59 | P3 | PARCIAL | Rascunho automático do orçamento sem controle entre abas e sem limpeza no logout |
| 644 | PLC-65 | P3 | PARCIAL | Dados de catálogo incompletos no mapeamento (campos fiscais e materiais) |
| 645 | QA-07 | P3 | ORFA | Gate "Strict ref-warning" documentado, mas desligado (setups órfãos) |
| 646 | QA-19 | P3 | PARCIAL | Regressão E2E com `continue-on-error` e `--pass-with-no-tests` |
| 647 | QA-21 | P3 | ORFA | Spec Playwright perdido em `tests/e2e/rbac-dev-technical-routes.test.ts` |
| 648 | QA-22 | P3 | PARCIAL | Documentação e exemplos de E2E desatualizados |
| 649 | QA-26 | P3 | PARCIAL | Orçamento de bundle sem comparação com a `main` |
| 650 | QA-27 | P3 | ORFA | Teste de carga não operacional |
| 651 | QA-28 | P3 | NAO_INICIADA | Notificações push da PWA |
| 652 | QA-29 | P3 | STUB/MOCK | Sincronização em segundo plano de orçamentos offline |
| 653 | QA-30 | P3 | PARCIAL | Manifest PWA incompleto |
| 654 | QA-37 | P3 | PARCIAL | Gitleaks: checklist de rotação e evidência em aberto |
| 655 | QA-42 | P3 | PARCIAL | Higiene do `deploy-sicoob-functions.yml` |
| 656 | QA-45 | P3 | ORFA | Templates e CODEOWNERS com referências quebradas |
| 657 | QA-46 | P3 | PARCIAL | PRs substituídos ainda abertos (#94, #97) |
| 658 | QA-47 | P3 | NAO_INICIADA | Documentação de CI e runbook "CI vermelha" desatualizados ou inexistentes |
| 659 | QA-48 | P3 | ORFA | Scripts npm quebrados ou ilusórios |
| 660 | QA-50 | P3 | PARCIAL | Hooks Husky contraditos pela regra `--no-verify` |
| 661 | QA-52 | P3 | ORFA | Cerca de 20 scripts utilitários órfãos e o diretório `scripts/revisao/` históric |
| 662 | QA-53 | P3 | NAO_INICIADA | Infraestrutura como código (Terraform) não aplicável |
| 663 | QA-55 | P3 | PARCIAL | `braces` vendorizado como mitigação temporária, sem critério de saída |
| 664 | QA-59 | P3 | PARCIAL | Branch Protection Sentinel só audita depois do fato |
| 665 | QA-60 | P3 | PARCIAL | Environments órfãos ou sem proteção e secret duplicado |
| 666 | SIC-003 | P3 | PARCIAL | Rotas /admin/singulares, /admin/pas e /admin/cooperativas não selecionam a aba |
| 667 | SIC-004 | P3 | PARCIAL | Caminho hierárquico incompleto |
| 668 | SIC-006 | P3 | ORFA | Tabelas de hierarquia duplicadas sem decisão |
| 669 | SIC-007 | P3 | PARCIAL | Modelo duplo de tenant (organizations × cooperativas) e onboarding manual por SQ |
| 670 | SIC-014 | P3 | NAO_INICIADA | Carteira do vendedor sem entidade |
| 671 | SIC-032 | P3 | STUB/MOCK | Loja com identidade Sicoob só em demonstração |
| 672 | SIC-047 | P3 | ORFA | Componentes e serviços Sicoob órfãos |
| 673 | SIC-048 | P3 | PARCIAL | Realtime do Kanban de pedidos com canal fixo |
| 674 | SIC-049 | P3 | PARCIAL | Documentação do workflow de pedidos desatualizada |
| 675 | SIC-055 | P3 | PARCIAL | Rascunhos sem controle entre abas e sem escopo cooperativa/PA |
| 676 | SIC-056 | P3 | NAO_INICIADA | Expiração automática de orçamento |
| 677 | SIC-091 | P3 | PARCIAL | Previsão de reposição com margem fixa e sem confiança |
| 678 | SIC-115 | P3 | STUB/MOCK | Menções em comentários de pedido fictícias |
| 679 | SIC-121 | P3 | PARCIAL | Painel do vendedor sem meta nem crescimento |
| 680 | SIC-122 | P3 | BLOQUEADA_EXTERNA | Exportação ERP/SISBR |
| 681 | SIC-123 | P3 | NAO_INICIADA | Indicadores de eficiência da jornada |
| 682 | SIC-134 | P3 | PARCIAL | Rastreio sem integração nem previsão de entrega |
| 683 | SIC-135 | P3 | PARCIAL | Remessas do relatório logístico sem paginação |
