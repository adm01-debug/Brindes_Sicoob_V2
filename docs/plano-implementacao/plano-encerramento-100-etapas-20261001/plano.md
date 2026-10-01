# Plano de encerramento da implantação em 100 etapas

**Data: 01/10/2026. Estado: planejamento, nenhuma etapa executada ou aceita por este documento.**

Este plano organiza o trabalho necessário para terminar as entregas previstas, preservar o que já funciona e comprovar a implantação. Consolida as 150 etapas funcionais, as 100 etapas de workflows e suas origens anteriores, sem transformar mapeamento ou quantidade de testes em certificado de produto pronto.

A referência de código é `f1b4e0dd0ff33e5c78742ffa9d2cf5a7385d8e13`. A [auditoria de 01/10](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/194992624ec22a3f956413280934e825280e46de/docs/execucao/revisao-do-plano-2026-10-01.md) está no commit `194992624` do PR #85, ainda não integrado na coleta. O PR #75 é candidato aberto/conflitante; nada dele é tratado automaticamente como entrega em main.

## Resultado exigido

Portal com aparência e navegação de loja, capaz de sustentar catálogo, orçamento, compra institucional, aprovação, arte, kit, recompra, distribuição e conciliação financeira. Código, migrations, Edge Functions, configuração e artefato publicado devem corresponder ao candidato aprovado. O banco `cfmzkthhgliqelozlmwu` é o canônico; `doufsxqlfjyuvxuezpln` permanece exclusivamente como fonte de consulta de produtos.

O sistema continua em construção. Etapas de piloto, compra real e estabilidade são compromissos futuros e dependem de decisão de lançamento e participantes autorizados. Este plano não autoriza contratação, mudança irreversível ou execução de operação comercial real. Aceites de marca, regra financeira e operação pertencem aos responsáveis do negócio, não ao agente técnico.

## O que precisa ser resolvido primeiro

- **Autorização de status:** T031 deve começar assim que houver referência e fixture; não precisa esperar T030. A correção deve negar leitura e escrita por ator de outra Singular também quando o status solicitado já é o atual. T039 não pode publicar esse contrato antes da prova.
- **Acesso e reconciliação:** T006 resolve as negativas administrativas/DNS antes de certificar aplicação real de migrations; nenhuma migration pode ser declarada aplicada pelo nome do arquivo ou por HTTP 401.
- **Qualidade do candidato:** T010–T020 preservam os avanços do PR #74, reconciliam PR #75, corrigem TypeScript e impedem verde sem teste. A auditoria encontrou 179 diagnósticos TS, 15 arquivos com regressão e 112 testes ignorados; são referência datada, não uma medida futura garantida.
- **Integridade comercial:** T035–T038 e T056 protegem intenção, identidade de item, totais e verba; esse trabalho antecede homologação e compromisso comercial.

## Regras para executar sem perder escopo

1. Revalidar antes de reimplementar. Função existente pode ser mantida se satisfizer seu aceite e tiver prova atual; não há obrigação de reescrever código apenas porque está neste plano.
2. Executar pelo grafo de dependências, não pela numeração. Trabalho local com fixtures pode avançar enquanto o acesso remoto é resolvido; publicação e aceite remoto ficam bloqueados pela dependência correspondente.
3. Cada etapa contém dez checkboxes obrigatórios: diagnóstico, pré-requisitos, duas entregas específicas, cenário positivo, cenário adversarial, efeitos verificados, integração/publicação aplicável, contingência e revisão. **São 1.000 checks novos**, distintos dos 1.000 subitens legados rastreados separadamente.
4. Guardar evidência com SHA, ambiente, data, método e resultado. Não misturar teste sintético com compra real, nem importar flag remota histórica para resultado local. N/A só vale para item realmente inaplicável, com motivo e revisor; requisito obrigatório não vira N/A por dificuldade.
5. Estados: Planejada → Pronta para execução → Em execução → Em validação → Concluída. Bloqueada exige motivo, dono e próxima ação. Concluída exige dependências concluídas, dez checks comprovados, revisão e destino publicado quando aplicável. Reabrir quando o contrato mudar ou a evidência perder validade.
6. Nenhum requisito é removido por este plano. W com premissa superada exige decisão substituta rastreável; ausência de funcionalidade só pode ser retirada por decisão explícita de escopo, registrada como retirada e nunca como implementada. Requisitos legais/de segurança ou invariantes obrigatórios não são dispensados por essa convenção.
7. Preservar mudanças locais, usar worktree e fluxo de PR vigente. Workers não alteram branches. Não reescrever migration aplicada; decidir correção progressiva. Toda integração de contrato precisa de revisão, CI válido e smoke do candidato.
8. Resolver política/arquitetura/custos antes da implementação dependente. Estimar esforço depois do diagnóstico de cada lote, separar esforço de engenharia de espera externa e não prometer duração total pela contagem de etapas.

## Responsáveis, decisão e evidência

T004 atribui pessoas aos papéis indicados. Campos nominais ficam vazios nesta versão para não inventar aceite ou disponibilidade. O executor técnico pode fechar provas de implementação; compras/financeiro aprovam política, marketing aprova marca e operação aprova piloto. O revisor deve examinar a prova e ser independente da implementação quando a regra de revisão exigir. Impossibilidade de revisor ou recurso do plano GitHub é impedimento a resolver, não autorização para bypass silencioso.

Antes de cada lote, registrar decisão, escopo SQL/Edge/UI, mudanças de compatibilidade, tempo/locks esperados, backup aplicável e contingência. As verificações locais são concluídas antes de pedir uma decisão final de negócio; aprovação existente não precisa ser solicitada novamente. Não há obrigação nova de autorização para cada consulta ou correção reversível já autorizada.

## Marcos e caminhos de execução

| Marco | Etapas de fechamento | Condição para avançar |
|---|---|---|
| Referência e acesso | T001–T010 | Origens identificadas, responsáveis e acesso ao canônico comprovados. |
| Esteira confiável | T011–T020 | Falhas obrigatórias bloqueiam; artifacts/secrets/revisão corretos. |
| Base reconciliada | T021–T030 | Schema, ledger, contratos e publicação do lote estrutural conferidos. |
| Orçamento seguro | T031–T040 | Bypass fechado, intenção única, itens/totais íntegros e lote homologado. |
| Resiliência e comunicação | T041–T050 | Retomada de rascunho e entrega durável observadas. |
| Governança e catálogo | T051–T060 | Alçadas, comparação institucional, verba e catálogo somente leitura comprovados. |
| Kits e recompra | T061–T070 | Composição, embalagem, prazo e nova intenção aprovados. |
| Arte e documentos | T071–T080 | Marca, prova, scanner, Storage e integrações homologados. |
| Operação comercial | T081–T090 | Três destinos, ocorrências e financeiro/campanha reconciliados. |
| Aceite e operação | T091–T100 | UX, segurança, regressão, paridade e marcos reais comprovados. |

Caminho de acesso: T001 → T004/T007 → T006 → T021/T022 → T027/T029. Caminho urgente de segurança: T001/T009/T010 → T031 → T034 → T038/T039. Convergência funcional: T040/T045/T050/T057/T070/T080/T090 → T096 → T097 → T098 → T099 → T100. O JSON contém o grafo completo; estes caminhos resumidos não substituem suas dependências. T099 inclui 30 dias observados de estabilidade e depende de operação autorizada; essa espera não pode ser simulada nem marcada antecipadamente.

## Rastreabilidade e arquivos de acompanhamento

- [Plano estruturado](plano.json) e [100 etapas em CSV](etapas.csv).
- [1.000 checks novos](checklist-1000.csv).
- [250 origens diretas](rastreabilidade-250.csv), com [texto/aceites preservados](rastreabilidade-250.json): 150 P e 100 W, cada uma com destinos e tratamento.
- [Origens históricas](origens-historicas.json): 282 etapas anteriores mais 12 diagnósticos F, totalizando 294 IDs; os 12 achados não são descartados da contagem.
- [1.000 subitens anteriores](subitens-legados-1000.csv), com [ações e aceites originais](subitens-legados-1000.json). Os destinos vêm da etapa E de origem; cada subitem ainda exige prova própria ou vínculo explícito à prova que o cobre.
- [Fontes com SHA/hash](fontes.json) e [validação estrutural](validacao.json).

Para conferir novamente IDs, fontes, vínculos, checklists e dependências, execute na raiz do repositório:

```bash
python3 docs/plano-implementacao/plano-encerramento-100-etapas-20261001/validar-plano.py
```

O [validador](validar-plano.py) também simula dez condições de bloqueio e avanço, como acesso remoto indisponível, scanner ainda não homologado e tentativa de publicar antes da correção de autorização. Ele exige os commits de fonte disponíveis no histórico Git. Essa validação verifica a coerência do planejamento; não executa testes do sistema, migrations ou deploy.

As matrizes distribuem trabalho, não certificam os 1.000 subitens antigos. O revisor de T100 deve recusar conclusão se algum subitem obrigatório permanecer sem atendimento/prova, mesmo que seus dez checks de etapa tenham sido marcados. O plano original permanece preservado.

## As 100 etapas

### Fase 01 — Preservação, decisões e acesso

**Risco a controlar:** Falta de referência, credencial ou responsável impede qualquer certificado de implantação.

#### T001 — Fixar a referência e os ambientes

**Prioridade:** P1. **Responsável funcional:** Coordenação técnica e produto. **Estado:** Planejada.
**Dependências:** nenhuma. **Origens:** P001, P011, W062, W066.

**Aceite específico:** Manifesto versionado identifica cada ambiente e nenhuma evidência depende apenas do nome da branch.

- [ ] **T001.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T001.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T001.03** Registrar SHAs de main, PR75, PR85, plano e artefatos servidos com data e origem.
- [ ] **T001.04** Inventariar domínios, publicadores Vercel/Lovable, banco canônico e catálogo externo somente leitura.
- [ ] **T001.05** Executar cenário positivo: Comparar SHA de build e commit remoto sem alterar checkout sujo.
- [ ] **T001.06** Executar cenário adversarial: Simular artefato de outro projeto e referência ausente; a conferência deve bloquear o aceite.
- [ ] **T001.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T001.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T001.09** Ensaiar ou revisar contingência: Preservar manifesto anterior e invalidar somente evidências afetadas por mudança de SHA.
- [ ] **T001.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T002 — Preservar e reconciliar trabalhos locais

**Prioridade:** P1. **Responsável funcional:** Coordenação técnica e produto. **Estado:** Planejada.
**Dependências:** T001. **Origens:** P002, W066, W073.

**Aceite específico:** Toda diferença tem destino verificável e nenhum checkout alheio foi sobrescrito.

- [ ] **T002.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T002.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T002.03** Inventariar worktrees, commits exclusivos, alterações locais, AUDITORIA.md e PLANO_100.md com hashes.
- [ ] **T002.04** Decidir destino de cada diferença: incorporar via PR, manter com dono ou arquivar sem perda.
- [ ] **T002.05** Executar cenário positivo: Recuperar um arquivo e um commit exclusivos a partir do inventário.
- [ ] **T002.06** Executar cenário adversarial: Detectar colisão de alterações e impedir remoção de trabalho não preservado.
- [ ] **T002.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T002.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T002.09** Ensaiar ou revisar contingência: Restaurar cópia/hash anterior; não fazer reset ou limpeza ampla para simplificar a reconciliação.
- [ ] **T002.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T003 — Consolidar a rastreabilidade integral

**Prioridade:** P1. **Responsável funcional:** Coordenação técnica e produto. **Estado:** Planejada.
**Dependências:** T001, T002. **Origens:** P003.

**Aceite específico:** Nenhuma origem fica sem responsável e etapa de fechamento; mapeamento não conta como implementação.

- [ ] **T003.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T003.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T003.03** Relacionar P001–P150, W001–W100, 282 etapas históricas, 12 achados adicionais e 1.000 subitens ao plano novo.
- [ ] **T003.04** Manter texto e aceite originais, estado observado e distinção entre entregue, parcial e premissa superada.
- [ ] **T003.05** Executar cenário positivo: Selecionar requisito de cada família e navegar até código, teste e aceite associado.
- [ ] **T003.06** Executar cenário adversarial: Introduzir origem sem destino e requisito duplicado conflitante; validador deve falhar.
- [ ] **T003.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T003.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T003.09** Ensaiar ou revisar contingência: Reabrir o vínculo divergente e preservar a revisão anterior; nunca apagar requisito para completar contagem.
- [ ] **T003.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T004 — Atribuir responsáveis e resolver decisões

**Prioridade:** P1. **Responsável funcional:** Coordenação técnica e produto. **Estado:** Planejada.
**Dependências:** T003. **Origens:** P005, P006, P007, P010, W062, W076, W078, W098.

**Aceite específico:** Todas as decisões bloqueantes têm dono, prazo e registro; responsáveis nominais substituem campos vazios.

- [ ] **T004.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T004.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T004.03** Nomear executor e revisor por etapa, responsáveis de negócio, segurança, marca e operação.
- [ ] **T004.04** Registrar decisões de custos, revisão humana, alçadas, fornecedor único, retenção, infraestrutura e publicação.
- [ ] **T004.05** Executar cenário positivo: Planejar capacidade real e aprovar critérios de metas ainda propostas neste plano.
- [ ] **T004.06** Executar cenário adversarial: Decisão sem autoridade ou orçamento não deve autorizar contratação nem lançamento.
- [ ] **T004.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T004.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T004.09** Ensaiar ou revisar contingência: Manter funcionalidade dependente bloqueada e registrar opção provisória reversível.
- [ ] **T004.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T005 — Segregar homologação e preparar personas

**Prioridade:** P1. **Responsável funcional:** Coordenação técnica e produto. **Estado:** Planejada.
**Dependências:** T001, T004. **Origens:** P009, P011, P017, P018, W003, W005, W033, W034, W041, W067.

**Aceite específico:** Configuração reproduzível documenta ambiente, dados, contas e limpeza segura sem valores secretos.

- [ ] **T005.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T005.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T005.03** Definir ambiente de construção/homologação e impedir testes destrutivos no catálogo mestre.
- [ ] **T005.04** Criar dados sintéticos de duas cooperativas, PAs, vendedores, gestores, delegados e três destinos.
- [ ] **T005.05** Executar cenário positivo: Executar login dedicado e provar isolamento entre organizações com dados rotulados.
- [ ] **T005.06** Executar cenário adversarial: Recusar execução se project_ref não estiver na allowlist ou persona for de uso real.
- [ ] **T005.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T005.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T005.09** Ensaiar ou revisar contingência: Revogar sessões de teste e remover somente dados do lote identificado, preservando a base.
- [ ] **T005.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T006 — Restabelecer acesso administrativo verificável

**Prioridade:** P1. **Responsável funcional:** Coordenação técnica e produto. **Estado:** Planejada.
**Dependências:** T001, T007. **Origens:** P012, W021, W050.

**Aceite específico:** Acesso administrativo reproduzível e limitado ao projeto correto; falha não aparece como sucesso vazio.

- [ ] **T006.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T006.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T006.03** Corrigir permissão do conector oficial ou token do MCP e resolver host do SUPABASE_DB_URL.
- [ ] **T006.04** Verificar conexão TLS, projeto, usuário técnico e capacidade SQL necessária com consultas somente leitura.
- [ ] **T006.05** Executar cenário positivo: Consultar versão, ledger e definições do projeto cfmzkthhgliqelozlmwu com evidência sanitizada.
- [ ] **T006.06** Executar cenário adversarial: Credencial vencida, DNS inválido, outro projeto e certificado inválido devem falhar de forma explícita.
- [ ] **T006.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T006.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T006.09** Ensaiar ou revisar contingência: Suspender escrita e restaurar a configuração válida anterior; não reduzir verificação TLS.
- [ ] **T006.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T007 — Organizar credenciais e configuração pública

**Prioridade:** P1. **Responsável funcional:** Coordenação técnica e produto. **Estado:** Planejada.
**Dependências:** T001, T004. **Origens:** P013, W003, W004, W005, W037, W041, W054, W055, W064, W065, W068, W090.

**Aceite específico:** Runbook e docs/secrets.md completos; chaves públicas duplicadas têm contrato único e exceções justificadas.

- [ ] **T007.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T007.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T007.03** Inventariar nomes, consumidores, ambiente e validade de secrets; distinguir publishable de credenciais privilegiadas.
- [ ] **T007.04** Migrar segredos administrativos para ambientes protegidos e planejar rotação comprovada do que for sensível.
- [ ] **T007.05** Executar cenário positivo: Revalidar logins, cron e deploy após rotação, sem registrar valores em logs ou commits.
- [ ] **T007.06** Executar cenário adversarial: Scanner deve detectar segredo sintético; jobs de fork e navegador não podem receber credenciais administrativas.
- [ ] **T007.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T007.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T007.09** Ensaiar ou revisar contingência: Manter janela de troca segura e revogar o segredo antigo após validar os consumidores.
- [ ] **T007.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T008 — Ensaiar backup e recuperação

**Prioridade:** P1. **Responsável funcional:** Coordenação técnica e produto. **Estado:** Planejada.
**Dependências:** T005, T006. **Origens:** P008, P020.

**Aceite específico:** Relatório registra medidas reais, recursos recuperados e limitações; backup existente sem restore não basta.

- [ ] **T008.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T008.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T008.03** Definir escopo de backup de schema, dados, Auth, Storage e configuração com RPO/RTO aprovados.
- [ ] **T008.04** Restaurar cópia isolada, medir tempo e validar referências entre banco e anexos.
- [ ] **T008.05** Executar cenário positivo: Restaurar pedido com orçamento, arte, pagamento e comprovante conferindo contagens e hashes.
- [ ] **T008.06** Executar cenário adversarial: Simular backup incompleto ou objeto Storage ausente; impedir declaração de recuperação integral.
- [ ] **T008.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T008.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T008.09** Ensaiar ou revisar contingência: Abandonar destino de ensaio e preservar backup íntegro antes de repetir com procedimento corrigido.
- [ ] **T008.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T009 — Corrigir proveniência e validade das evidências

**Prioridade:** P1. **Responsável funcional:** Coordenação técnica e produto. **Estado:** Planejada.
**Dependências:** T001, T003. **Origens:** P004, W096.

**Aceite específico:** Nenhuma rotina promove resultado antigo a prova atual; cobertura informa arquivos realmente medidos.

- [ ] **T009.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T009.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T009.03** Separar resultados locais, remotos, históricos e sintéticos nos simuladores e relatórios.
- [ ] **T009.04** Remover herança silenciosa de producao_verificada e registrar SHA, data, ambiente e comandos de cada ensaio.
- [ ] **T009.05** Executar cenário positivo: Uma execução local deve declarar apenas os testes locais que realizou.
- [ ] **T009.06** Executar cenário adversarial: JSON histórico com flag remota verdadeira não pode contaminar uma execução sem rede.
- [ ] **T009.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T009.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T009.09** Ensaiar ou revisar contingência: Invalidar relatório ambíguo e gerar nova evidência sem alterar o registro histórico original.
- [ ] **T009.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T010 — Preparar reconciliação dos PRs pendentes

**Prioridade:** P1. **Responsável funcional:** Coordenação técnica e produto. **Estado:** Planejada.
**Dependências:** T001, T002, T009. **Origens:** P016.

**Aceite específico:** Candidato conciliado está revisável; sua integração depende das correções e gates das etapas posteriores.

- [ ] **T010.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T010.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T010.03** Comparar PR75 com main, preservar correções do PR74 e a correção posterior do smoke.
- [ ] **T010.04** Separar contratos, migrations, UI e documentação em lotes revisáveis com dependências e contingência.
- [ ] **T010.05** Executar cenário positivo: Resolver conflitos em worktree e conferir comportamento preservado dos avanços já integrados.
- [ ] **T010.06** Executar cenário adversarial: Rejeitar resolução que reintroduza bypass de status, inventário obsoleto ou sobrescrita de versão.
- [ ] **T010.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T010.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T010.09** Ensaiar ou revisar contingência: Recriar candidato a partir dos SHAs preservados sem resetar main ou reescrever migrations aplicadas.
- [ ] **T010.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

### Fase 02 — Qualidade e entrega contínua

**Risco a controlar:** Um workflow verde pode omitir verificações ou não corresponder ao candidato publicado.

#### T011 — Estabilizar runners, cotas e artefatos

**Prioridade:** P1. **Responsável funcional:** Engenharia de plataforma e QA. **Estado:** Planejada.
**Dependências:** T001, T004. **Origens:** P014, W001, W002, W024, W087, W092, W093.

**Aceite específico:** Pipeline tem capacidade medida e política de retenção; premissa antiga de falta geral de minutos é encerrada por decisão.

- [ ] **T011.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T011.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T011.03** Medir disponibilidade, concorrência, capacidade e custo dos runners próprios e uso de armazenamento.
- [ ] **T011.04** Definir limpeza por retenção, artifacts de até sete dias quando adequado e preservação das provas de release.
- [ ] **T011.05** Executar cenário positivo: Executar jobs simultâneos e upload no limite aprovado, com diagnóstico de fila e quota.
- [ ] **T011.06** Executar cenário adversarial: Runner offline ou quota cheia devem gerar falha operacional rastreável, não sucesso do teste sem evidência.
- [ ] **T011.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T011.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T011.09** Ensaiar ou revisar contingência: Preservar artefatos de investigação e reduzir concorrência antes de remover evidência necessária.
- [ ] **T011.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T012 — Tornar os gates honestos e obrigatórios

**Prioridade:** P1. **Responsável funcional:** Engenharia de plataforma e QA. **Estado:** Planejada.
**Dependências:** T009, T011. **Origens:** P014, W006, W031, W035, W039, W069.

**Aceite específico:** Nenhuma falha obrigatória vira verde; skips opcionais identificam motivo e não certificam o requisito.

- [ ] **T012.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T012.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T012.03** Revisar continue-on-error, skips por credencial, erros de RPC e jobs de relatório que retornam zero.
- [ ] **T012.04** Criar checks agregadores estáveis para mudanças relevantes e documentação, sem depender de jobs que nunca iniciam.
- [ ] **T012.05** Executar cenário positivo: PR de docs recebe dispensa justificada; PR de SQL executa realmente suas verificações.
- [ ] **T012.06** Executar cenário adversarial: Forçar falha de SQL, ausência de credencial exigida e teste quebrado; gate final deve reprovar.
- [ ] **T012.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T012.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T012.09** Ensaiar ou revisar contingência: Restaurar gate anterior apenas com bloqueio de publicação mantido; nunca liberar merge para ocultar falha.
- [ ] **T012.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T013 — Eliminar regressões e reduzir dívida técnica

**Prioridade:** P1. **Responsável funcional:** Engenharia de plataforma e QA. **Estado:** Planejada.
**Dependências:** T010, T012. **Origens:** P141, W028.

**Aceite específico:** Zero regressões e zero erros nos caminhos críticos; cada dívida residual tem destino e aceite técnico, sem nota fictícia.

- [ ] **T013.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T013.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T013.03** Corrigir os 15 arquivos com regressão TypeScript sem aumentar baseline para esconder erros.
- [ ] **T013.04** Triar diagnósticos, lint global, any e APIs legadas por risco; reduzir dívida no escopo comercial, segurança e contratos.
- [ ] **T013.05** Executar cenário positivo: Typecheck e lint dos módulos alterados passam, com inventário explícito da dívida restante.
- [ ] **T013.06** Executar cenário adversarial: Adicionar erro sintético e aumentar baseline sem justificativa; ambos devem bloquear CI.
- [ ] **T013.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T013.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T013.09** Ensaiar ou revisar contingência: Reverter alteração isolada que rompe contrato e preservar baseline original para comparação.
- [ ] **T013.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T014 — Revisar testes ignorados e cobertura

**Prioridade:** P1. **Responsável funcional:** Engenharia de plataforma e QA. **Estado:** Planejada.
**Dependências:** T005, T009, T012. **Origens:** P142.

**Aceite específico:** Nenhum teste crítico necessário permanece silenciosamente ignorado; limites e exclusões residuais são aprovados individualmente.

- [ ] **T014.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T014.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T014.03** Classificar 112 testes ignorados e 41 declarações críticas; habilitar os casos necessários com fixtures/personas válidas.
- [ ] **T014.04** Ampliar cobertura por risco além dos nove arquivos atuais e distinguir unitário, integração, SQL e E2E.
- [ ] **T014.05** Executar cenário positivo: Executar casos antes ignorados de RLS, timeout, conflito e autorização com credenciais de homologação.
- [ ] **T014.06** Executar cenário adversarial: Excluir propositalmente uma negação de escopo; a suíte ou gate de cobertura de risco deve impedir o fechamento.
- [ ] **T014.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T014.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T014.09** Ensaiar ou revisar contingência: Reabrir o teste e a etapa dependente; não substituir falha por skip ou reduzir meta para aprovar.
- [ ] **T014.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T015 — Reorganizar execução e custo do CI

**Prioridade:** P1. **Responsável funcional:** Engenharia de plataforma e QA. **Estado:** Planejada.
**Dependências:** T011, T012. **Origens:** P019, W007, W008, W009, W010, W013, W015, W016, W018, W019, W020, W022, W023.

**Aceite específico:** Matriz de gatilhos comprovada; meta proposta de até 30 minutos de runner por PR é medida e aprovada ou formalmente revisada.

- [ ] **T015.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T015.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T015.03** Distribuir typecheck, testes, Deno, simulações e build em jobs com needs e checks agregadores.
- [ ] **T015.04** Ajustar paths, schedules, timeouts, cancelamento seguro, caches, clone raso e dependências compartilhadas sem perder cobertura.
- [ ] **T015.05** Executar cenário positivo: Medir minutos totais de runner e tempo de espera com PR de docs, UI, SQL e atualização de dependência.
- [ ] **T015.06** Executar cenário adversarial: Cancelar execução antiga sem interromper migration ou publicação em andamento; validar filtros que não omitem teste obrigatório.
- [ ] **T015.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T015.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T015.09** Ensaiar ou revisar contingência: Restaurar gatilhos conhecidos se um filtro omitir cenário; manter as verificações mesmo com custo maior temporário.
- [ ] **T015.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T016 — Publicar e testar um artefato reproduzível

**Prioridade:** P1. **Responsável funcional:** Engenharia de plataforma e QA. **Estado:** Planejada.
**Dependências:** T005, T007, T015. **Origens:** W012, W027, W029, W033, W046, W048, W063.

**Aceite específico:** Origem e configuração do artefato são inequívocas; baseline relativo de bundle e orçamento absoluto passam.

- [ ] **T016.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T016.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T016.03** Gerar build único por candidato com configuração pública do ambiente correto e checksum.
- [ ] **T016.04** Consumir o mesmo dist no bundle, preview e testes visuais; bloquear dados demo e arquivos sensíveis no artefato.
- [ ] **T016.05** Executar cenário positivo: Promover o artefato por ambientes e comparar hashes sem recompilar inadvertidamente.
- [ ] **T016.06** Executar cenário adversarial: Artefato de outro SHA, variável de projeto incorreta e conteúdo demo indevido devem ser rejeitados.
- [ ] **T016.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T016.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T016.09** Ensaiar ou revisar contingência: Voltar ao artefato anterior preservado, sem misturar novo frontend com contrato incompatível.
- [ ] **T016.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T017 — Fortalecer Actions e dependências

**Prioridade:** P1. **Responsável funcional:** Engenharia de plataforma e QA. **Estado:** Planejada.
**Dependências:** T007, T011, T012. **Origens:** W014, W017, W032, W036, W037, W038, W040, W041, W043, W044, W079, W080, W081, W082, W083, W084, W085, W086, W088, W089.

**Aceite específico:** Supply chain auditável; CodeQL/SARIF e Gitleaks geram resultados consumíveis e redigidos sem contratação implícita.

- [ ] **T017.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T017.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T017.03** Fixar actions por SHA, permissões mínimas, allowlist, isolamento de secrets e versão do runtime.
- [ ] **T017.04** Adicionar actionlint, auditoria de workflows, dependency review, alertas e política de atualização com labels existentes.
- [ ] **T017.05** Executar cenário positivo: Validar uma atualização controlada de action e dependência com lockfile reproduzível.
- [ ] **T017.06** Executar cenário adversarial: Action não aprovada, interpolação insegura, segredo em log ou dependência vulnerável deve bloquear o lote.
- [ ] **T017.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T017.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T017.09** Ensaiar ou revisar contingência: Fixar novamente a versão anterior e documentar alerta sem desativar proteção para prosseguir.
- [ ] **T017.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T018 — Homologar E2E, visual e desempenho

**Prioridade:** P1. **Responsável funcional:** Engenharia de plataforma e QA. **Estado:** Planejada.
**Dependências:** T005, T012, T014, T016. **Origens:** P018, W010, W011, W029, W030, W033, W035, W045, W047, W063, W067.

**Aceite específico:** Relatórios privados preservam rastros e resultados; testes de demo não substituem jornada conectada.

- [ ] **T018.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T018.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T018.03** Preparar configuração CI sem segredos, browser por projeto, readiness e limpeza por lote de dados.
- [ ] **T018.04** Executar smoke obrigatório e regressão apropriada em desktop/mobile sobre artefato de homologação; corrigir comparador e header.
- [ ] **T018.05** Executar cenário positivo: Fluxo autenticado visita catálogo, editor e painéis; Lighthouse mede rotas reais além do login.
- [ ] **T018.06** Executar cenário adversarial: Falta de credencial, página 403, recurso lento e falha de assert devem impedir o aceite correspondente.
- [ ] **T018.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T018.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T018.09** Ensaiar ou revisar contingência: Isolar falha de infraestrutura da aplicação e repetir apenas o cenário afetado com causa registrada.
- [ ] **T018.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T019 — Proteger revisão, merge e publicação

**Prioridade:** P1. **Responsável funcional:** Engenharia de plataforma e QA. **Estado:** Planejada.
**Dependências:** T004, T012, T013, T014, T017, T018. **Origens:** P015, W004, W008, W031, W051, W052, W053, W061, W069, W070, W071, W072, W073, W074, W075, W076.

**Aceite específico:** Proteções testadas por comportamento; plano da conta suporta regras ou existe alternativa formal equivalente.

- [ ] **T019.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T019.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T019.03** Configurar checks obrigatórios estáveis, aprovação do último push, resolução de conversas e branch atualizada.
- [ ] **T019.04** Definir revisão independente, squash, exclusão de branch, bypass explícito e bloqueio de publicação automática sem gates.
- [ ] **T019.05** Executar cenário positivo: Tentar merge de PR íntegro e promover SHA aprovado pelo fluxo escolhido Vercel/Lovable.
- [ ] **T019.06** Executar cenário adversarial: Tentar push direto, autoaprovação, merge vermelho e deploy de branch indevida; operação deve ser negada.
- [ ] **T019.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T019.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T019.09** Ensaiar ou revisar contingência: Bloquear release se regra não puder ser imposta; não remover exigência para contornar limite do provedor.
- [ ] **T019.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T020 — Criar operação observável do CI

**Prioridade:** P1. **Responsável funcional:** Engenharia de plataforma e QA. **Estado:** Planejada.
**Dependências:** T009, T011, T015, T017. **Origens:** P019, W021, W024, W039, W042, W049, W050, W051, W052, W077, W078, W091, W092, W093, W094, W095, W096, W097, W098, W099.

**Aceite específico:** Equipe consegue identificar falha, reexecutar seletivamente ou reverter; ações históricas superadas têm decisão registrada.

- [ ] **T020.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T020.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T020.03** Unificar templates, revisão automatizada, hooks locais e runbook de CI vermelha com regras do AGENTS.
- [ ] **T020.04** Registrar custo mensal, falhas, retenção e resposta; preservar histórico necessário e separar relatórios gerados de fontes.
- [ ] **T020.05** Executar cenário positivo: Uma falha sintética abre registro interno ou canal previamente autorizado com dono e prazo.
- [ ] **T020.06** Executar cenário adversarial: Evitar avisos duplicados, perda de diagnóstico e envio a destinatário não aprovado.
- [ ] **T020.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T020.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T020.09** Ensaiar ou revisar contingência: Desativar apenas canal defeituoso mantendo logs e fila de incidentes; não apagar runs como solução de falha.
- [ ] **T020.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

### Fase 03 — Banco, segurança e reconciliação

**Risco a controlar:** Ledger coerente sem definição/ACL correta não garante contrato seguro.

#### T021 — Inventariar schema e capacidades atuais

**Prioridade:** P1. **Responsável funcional:** Engenharia de banco e segurança. **Estado:** Planejada.
**Dependências:** T006, T009. **Origens:** P021.

**Aceite específico:** Inventário completo do escopo publicado está vinculado ao projeto e distingue ausência de erro de permissão.

- [ ] **T021.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T021.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T021.03** Coletar tabelas, views, funções, triggers, RLS, ACLs, enums, índices, extensões e tarefas do canônico.
- [ ] **T021.04** Preservar inventário sanitizado com data/hash e diferenças frente ao código e ao snapshot antigo.
- [ ] **T021.05** Executar cenário positivo: Consultar objetos usados por criação, aprovação, logística e documentos e identificar sua definição real.
- [ ] **T021.06** Executar cenário adversarial: Conexão ao projeto errado ou coleta parcial não pode produzir manifesto aprovado.
- [ ] **T021.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T021.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T021.09** Ensaiar ou revisar contingência: Guardar snapshot anterior e refazer apenas consultas incompletas antes de qualquer escrita.
- [ ] **T021.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T022 — Reconciliar migrations e preparar baseline

**Prioridade:** P1. **Responsável funcional:** Engenharia de banco e segurança. **Estado:** Planejada.
**Dependências:** T008, T021. **Origens:** P022, P023, P030, W050.

**Aceite específico:** Cada divergence tem ação, prova e contingência; nada é marcado aplicado só porque o arquivo existe.

- [ ] **T022.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T022.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T022.03** Comparar ledger, arquivos e definições efetivas; separar migrations históricas, consolidadas, ausentes e divergentes.
- [ ] **T022.04** Construir baseline reproduzível sem executar cegamente todo histórico e sem falsificar ledger.
- [ ] **T022.05** Executar cenário positivo: Restaurar schema em banco vazio isolado e reproduzir a linha de evolução escolhida.
- [ ] **T022.06** Executar cenário adversarial: Checksum alterado, duplicidade de versão e nome enganoso devem impedir aplicação.
- [ ] **T022.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T022.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T022.09** Ensaiar ou revisar contingência: Preservar dump/ledger e preparar correção progressiva auditável quando rollback for incompatível.
- [ ] **T022.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T023 — Alinhar tipos, APIs e inventário de runtime

**Prioridade:** P1. **Responsável funcional:** Engenharia de banco e segurança. **Estado:** Planejada.
**Dependências:** T021, T022. **Origens:** P024, P028, W068.

**Aceite específico:** Referências bloqueantes resolvidas contra fonte atual; tipos e snapshot têm hash e origem.

- [ ] **T023.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T023.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T023.03** Gerar tipos do schema autorizado e reconciliar assinaturas consumidas por frontend e Edge.
- [ ] **T023.04** Renovar inventário autenticado, medir idade e cobrir referências dinâmicas explicitamente revisadas.
- [ ] **T023.05** Executar cenário positivo: Todos os consumidores críticos compilam e encontram objeto compatível no banco.
- [ ] **T023.06** Executar cenário adversarial: Objeto removido, enum divergente e cache vencido devem bloquear o candidato sem recriar RPC existente por engano.
- [ ] **T023.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T023.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T023.09** Ensaiar ou revisar contingência: Reverter consumidor incompatível ou adotar contrato de compatibilidade temporário documentado.
- [ ] **T023.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T024 — Validar RLS por papel e unidade

**Prioridade:** P1. **Responsável funcional:** Engenharia de banco e segurança. **Estado:** Planejada.
**Dependências:** T005, T021. **Origens:** P025, W005.

**Aceite específico:** Matriz por tabela/ação demonstra positivos e negativos; tabelas internas negadas não recebem policy permissiva para deixar CI verde.

- [ ] **T024.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T024.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T024.03** Testar leitura, escrita, inclusão, exclusão e transferência de escopo em tabelas expostas.
- [ ] **T024.04** Cobrir PA, cooperativa, vendedor, gestor, supervisor, ator inativo e sessão revogada com personas distintas.
- [ ] **T024.05** Executar cenário positivo: Cada persona acessa apenas dados e operações autorizados, incluindo pedidos e anexos.
- [ ] **T024.06** Executar cenário adversarial: UUID externo, alteração de ownership e mistura de itens de cooperativas diferentes devem falhar.
- [ ] **T024.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T024.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T024.09** Ensaiar ou revisar contingência: Restaurar restrição anterior ou bloquear endpoint afetado; revisar impacto antes de ampliar grants.
- [ ] **T024.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T025 — Auditar funções privilegiadas e views

**Prioridade:** P1. **Responsável funcional:** Engenharia de banco e segurança. **Estado:** Planejada.
**Dependências:** T021, T024, T031. **Origens:** P026, P072.

**Aceite específico:** Inventário de privilégios e testes de bypass fecham rotas alternativas; advisors tratados por achado.

- [ ] **T025.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T025.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T025.03** Revisar SECURITY DEFINER, owners, search_path, grants efetivos, herança e helpers parametrizados.
- [ ] **T025.04** Restringir funções internas e views expostas sem depender apenas de RLS das tabelas.
- [ ] **T025.05** Executar cenário positivo: Ator autorizado chama RPC pública e recebe somente contrato necessário.
- [ ] **T025.06** Executar cenário adversarial: Anon, PUBLIC, ator falsificado, overload e helper administrativo devem ser recusados conforme contrato.
- [ ] **T025.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T025.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T025.09** Ensaiar ou revisar contingência: Revogar acesso indevido e manter caminho seguro; evitar renomear objetos sem reconciliar consumidores.
- [ ] **T025.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T026 — Reconciliar integridade e performance

**Prioridade:** P1. **Responsável funcional:** Engenharia de banco e segurança. **Estado:** Planejada.
**Dependências:** T021, T022. **Origens:** P027, P029, W049.

**Aceite específico:** Nenhum vínculo crítico órfão; mudanças de índices/constraints têm medida antes/depois e plano de aplicação.

- [ ] **T026.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T026.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T026.03** Auditar FKs, índices, checks, unicidade, nulos e dados órfãos antes de alterar estruturas.
- [ ] **T026.04** Tratar recursos legados com plano de migração e medir consultas representativas, evitando índices sem justificativa.
- [ ] **T026.05** Executar cenário positivo: EXPLAIN e amostras reconciliam catálogo interno, orçamentos, verba e remessas.
- [ ] **T026.06** Executar cenário adversarial: Duplicidade, referência inválida e volume elevado devem revelar erro controlado ou consulta dentro da meta.
- [ ] **T026.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T026.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T026.09** Ensaiar ou revisar contingência: Usar migração aditiva ou compatibilidade até limpar dados; não apagar registros para satisfazer constraint.
- [ ] **T026.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T027 — Construir o aplicador seguro de migrations

**Prioridade:** P1. **Responsável funcional:** Engenharia de banco e segurança. **Estado:** Planejada.
**Dependências:** T007, T008, T019, T022, T025. **Origens:** P030, W053, W058.

**Aceite específico:** Aplicador recusa alvo/SQL indevidos e não confirma contrato apenas por marcador textual.

- [ ] **T027.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T027.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T027.03** Revisar o candidato do PR75 com allowlist, hashes, conexão canônica e verificação TLS completa.
- [ ] **T027.04** Exigir lock, atomicidade compatível com o lote, ledger coerente e verificação de contratos antes do sucesso.
- [ ] **T027.05** Executar cenário positivo: Aplicar lote de ensaio e repetir; segunda execução não reaplica efeitos.
- [ ] **T027.06** Executar cenário adversarial: Forçar falha no terceiro arquivo, definição substituída por stub e drift de ledger; rollback ou recuperação explícita deve funcionar.
- [ ] **T027.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T027.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T027.09** Ensaiar ou revisar contingência: Restaurar transação se possível; para operações não transacionais exigir estratégia separada e recuperação ensaiada.
- [ ] **T027.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T028 — Ensaiar evolução e compatibilidade do banco

**Prioridade:** P1. **Responsável funcional:** Engenharia de banco e segurança. **Estado:** Planejada.
**Dependências:** T022, T023, T024, T025, T026, T027. **Origens:** P030, W058.

**Aceite específico:** Plano de ordem de publicação define expandir, migrar e retirar contrato sem janela insegura.

- [ ] **T028.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T028.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T028.03** Executar migrations candidatas sobre baseline e cópia sanitizada com relações representativas.
- [ ] **T028.04** Testar compatibilidade de frontend/Edge antigos e novos, locks, volume e tempo de execução.
- [ ] **T028.05** Executar cenário positivo: Aplicação normal preserva dados, FKs, permissões e contratos usados em leitura/escrita.
- [ ] **T028.06** Executar cenário adversarial: Cliente antigo e interrupção de deploy não podem gravar documento incompatível ou perder dados.
- [ ] **T028.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T028.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T028.09** Ensaiar ou revisar contingência: Interromper lote e manter versão compatível; restaurar somente por procedimento já ensaiado.
- [ ] **T028.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T029 — Aplicar o lote estrutural validado em construção

**Prioridade:** P1. **Responsável funcional:** Engenharia de banco e segurança. **Estado:** Planejada.
**Dependências:** T006, T008, T027, T028. **Origens:** W058.

**Aceite específico:** Lote estrutural comprovadamente aplicado e reconciliado; mudanças de status/orçamento aguardam seu próprio lote na etapa39.

- [ ] **T029.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T029.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T029.03** Executar pelo workflow protegido apenas mudanças estruturais revisadas das etapas 21–28.
- [ ] **T029.04** Registrar versões, hashes, operadores, checks pós-aplicação e divergências resolvidas no banco real.
- [ ] **T029.05** Executar cenário positivo: Ler schema/ACL/ledger após aplicar e executar contrato autorizado no projeto canônico.
- [ ] **T029.06** Executar cenário adversarial: Repetição e interrupção não podem gerar ledger duplicado nem objeto incompleto.
- [ ] **T029.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T029.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T029.09** Ensaiar ou revisar contingência: Suspender próximos lotes e usar contingência específica; não corrigir diretamente sem migration registrada.
- [ ] **T029.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T030 — Certificar a base do banco e recursos Edge

**Prioridade:** P1. **Responsável funcional:** Engenharia de banco e segurança. **Estado:** Planejada.
**Dependências:** T007, T023, T025, T029. **Origens:** P071, P072, P079, P080, W025, W026, W055, W056, W057, W059, W060.

**Aceite específico:** Banco e Edge do lote têm relatório único com execução remota datada; HTTP 401 isolado não certifica negócio.

- [ ] **T030.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T030.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T030.03** Confrontar manifesto publicado com funções Edge, configuração JWT, dependências SQL e Storage.
- [ ] **T030.04** Rever autenticação, cron, Vault, workers e endpoint legado migrate-helper; tipar/testar todas as funções aplicáveis.
- [ ] **T030.05** Executar cenário positivo: Confirmar hash e contrato de função publicada com chamada legítima e negativo de autenticação.
- [ ] **T030.06** Executar cenário adversarial: Código divergente, scheduler com segredo inválido e endpoint legado ativo devem impedir certificado de paridade.
- [ ] **T030.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T030.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T030.09** Ensaiar ou revisar contingência: Reverter função para versão compatível e pausar cron defeituoso preservando fila.
- [ ] **T030.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

### Fase 04 — Orçamentos, status e transações

**Risco a controlar:** Retry não pode contornar escopo, perder identidade nem multiplicar compromisso.

#### T031 — Fechar a falha de autorização de status

**Prioridade:** P1. **Responsável funcional:** Backend e segurança, com revisão independente. **Estado:** Planejada.
**Dependências:** T001, T009, T010. **Origens:** P034, P038.

**Aceite específico:** A reprodução da auditoria passa a demonstrar negação; nenhuma saída antecipada contorna autorização.

- [ ] **T031.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T031.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T031.03** Autorizar ator e escopo antes de retorno por status igual, verificação de versão ou leitura de metadados.
- [ ] **T031.04** Corrigir main e candidato PR75 com regra explícita para retry, inclusive ator inativo ou revogado.
- [ ] **T031.05** Executar cenário positivo: Vendedor legítimo repete intenção sem duplicar efeito e consulta somente orçamento autorizado.
- [ ] **T031.06** Executar cenário adversarial: Reproduzir outra Singular sem leitura direta e versão conhecida/inventada; não devolver dados nem escrever histórico.
- [ ] **T031.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T031.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T031.09** Ensaiar ou revisar contingência: Bloquear RPC vulnerável ou restaurar contrato seguro; não aplicar a migration candidata antes dessa prova.
- [ ] **T031.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T032 — Unificar status, enum e escritores

**Prioridade:** P1. **Responsável funcional:** Backend comercial e frontend. **Estado:** Planejada.
**Dependências:** T031, T010. **Origens:** P031, P032, P035.

**Aceite específico:** Todos os escritores foram inventariados e não há caminho de menor privilégio contornando o contrato.

- [ ] **T032.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T032.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T032.03** Definir transições e alçadas canônicas e reconciliar enums/aliases legados.
- [ ] **T032.04** Encaminhar quadro Kanban, ações individuais, lote e integrações para a mesma autoridade do servidor.
- [ ] **T032.05** Executar cenário positivo: Uma transição válida mantém status, PDF, aprovação e histórico coerentes em todos os consumidores.
- [ ] **T032.06** Executar cenário adversarial: Tentativa de update direto ou transição proibida deve falhar sem efeitos parciais.
- [ ] **T032.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T032.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T032.09** Ensaiar ou revisar contingência: Desativar escritor legado e manter leitura compatível durante a migração.
- [ ] **T032.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T033 — Preservar concorrência de edição e transição

**Prioridade:** P1. **Responsável funcional:** Backend comercial e frontend. **Estado:** Planejada.
**Dependências:** T010, T032. **Origens:** P033, P043, P046.

**Aceite específico:** Versão, UI e servidor concordam; nenhum retry disfarça edição baseada em estado antigo.

- [ ] **T033.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T033.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T033.03** Transportar row_version conhecida pela tela até a RPC sem substituição por leitura recente.
- [ ] **T033.04** Retornar conflito recuperável com opções explícitas de recarregar, comparar e reaplicar alterações.
- [ ] **T033.05** Executar cenário positivo: Duas telas editam em sequência e a segunda recebe conflito sem perder seu rascunho.
- [ ] **T033.06** Executar cenário adversarial: Resposta atrasada e mudança simultânea de status não podem sobrescrever conteúdo confirmado.
- [ ] **T033.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T033.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T033.09** Ensaiar ou revisar contingência: Preservar rascunho local e recuperar última versão confirmada, sem merge silencioso de campos financeiros.
- [ ] **T033.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T034 — Proteger lotes e histórico único

**Prioridade:** P1. **Responsável funcional:** Backend comercial e frontend. **Estado:** Planejada.
**Dependências:** T031, T032, T033. **Origens:** P036, P037, P038, P048.

**Aceite específico:** Nenhuma alteração parcial ou deadlock não tratado; histórico identifica ator e intenção de forma verificável.

- [ ] **T034.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T034.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T034.03** Validar IDs, tamanho, duplicatas, versões, escopos e locks em ordem determinística.
- [ ] **T034.04** Ligar evento de histórico à transação e à intenção para impedir registros duplicados.
- [ ] **T034.05** Executar cenário positivo: Lote legítimo conclui com um evento por alteração e retry não gera novo evento.
- [ ] **T034.06** Executar cenário adversarial: Lote misto com um item de outra Singular, nulos e corrida concorrente deve reverter integralmente.
- [ ] **T034.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T034.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T034.09** Ensaiar ou revisar contingência: Reconciliar intenção e estado antes de repetir; nunca apagar histórico duplicado para ocultar defeito.
- [ ] **T034.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T035 — Endurecer criação idempotente de orçamento

**Prioridade:** P1. **Responsável funcional:** Backend comercial e frontend. **Estado:** Planejada.
**Dependências:** T010, T025. **Origens:** P041, P042, P048.

**Aceite específico:** Criação única demonstrada no SQL e no editor, com ACL/RLS e retenção compatíveis.

- [ ] **T035.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T035.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T035.03** Retirar do usuário a possibilidade de forjar, alterar ou apagar registros da intenção de gravação.
- [ ] **T035.04** Vincular chave ao ator, escopo e hash canônico do conteúdo com recuperação da resposta após timeout.
- [ ] **T035.05** Executar cenário positivo: Duas requisições simultâneas da mesma intenção devolvem o mesmo orçamento.
- [ ] **T035.06** Executar cenário adversarial: Mesmo token com payload divergente e manipulação direta da tabela devem ser negados.
- [ ] **T035.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T035.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T035.09** Ensaiar ou revisar contingência: Preservar registro de intenção e consultar resultado confirmado antes de qualquer nova tentativa.
- [ ] **T035.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T036 — Preservar identidade dos itens e vínculos

**Prioridade:** P1. **Responsável funcional:** Backend comercial e frontend. **Estado:** Planejada.
**Dependências:** T021, T026, T035. **Origens:** P041, P044, P102.

**Aceite específico:** A identidade comercial sobrevive à edição e toda quebra de vínculo exige decisão explícita.

- [ ] **T036.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T036.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T036.03** Alterar gravação para manter IDs dos itens persistidos ou versionar explicitamente conforme o contrato.
- [ ] **T036.04** Validar FKs de arte, pedido, logística e histórico antes de remover ou substituir composição.
- [ ] **T036.05** Executar cenário positivo: Salvar a mesma composição mantém IDs e vínculos; edição legítima cria trilha clara.
- [ ] **T036.06** Executar cenário adversarial: Excluir item com arte/pedido dependente deve bloquear ou executar compensação definida sem órfãos.
- [ ] **T036.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T036.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T036.09** Ensaiar ou revisar contingência: Recuperar versão anterior do agregado e impedir envio enquanto vínculos estiverem inconsistentes.
- [ ] **T036.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T037 — Recalcular e validar o contrato comercial

**Prioridade:** P1. **Responsável funcional:** Backend comercial e financeiro. **Estado:** Planejada.
**Dependências:** T004, T010. **Origens:** P041, P045.

**Aceite específico:** Contrato monetário documentado e exemplos calculados independentemente fecham diferenças de centavos e permissões.

- [ ] **T037.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T037.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T037.03** Validar preços autorizados, quantidade, mínimos, personalização, descontos, frete, impostos e arredondamento no servidor.
- [ ] **T037.04** Definir o que vem do catálogo e o que exige justificativa/alçada; rejeitar total_cost ou preço adulterado no payload.
- [ ] **T037.05** Executar cenário positivo: Orçamento de referência produz os mesmos valores na tela, RPC, PDF e pedido.
- [ ] **T037.06** Executar cenário adversarial: Manipular custos de personalização, preço, quantidade negativa, NaN e total de cabeçalho; servidor deve recusar ou recalcular.
- [ ] **T037.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T037.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T037.09** Ensaiar ou revisar contingência: Bloquear confirmação e preservar rascunho até reconciliar preço vigente e autorização.
- [ ] **T037.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T038 — Integrar editor e conversão transacional

**Prioridade:** P1. **Responsável funcional:** Backend comercial e frontend. **Estado:** Planejada.
**Dependências:** T033, T034, T035, T036, T037. **Origens:** P042, P043, P047, P049.

**Aceite específico:** Editor, RPC e conversão demonstram atomicidade e idempotência com erros compreensíveis ao usuário.

- [ ] **T038.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T038.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T038.03** Conectar QuoteService, rascunho e carrinho ao contrato revisado sem gravar parcialmente o agregado.
- [ ] **T038.04** Converter orçamento aprovado em pedido uma única vez, preservando versão, preços, itens e trilha.
- [ ] **T038.05** Executar cenário positivo: Conversão válida gera pedido rastreável e repetição recupera o mesmo resultado.
- [ ] **T038.06** Executar cenário adversarial: Falha após cabeçalho, item ou verba deve reverter; orçamento alterado ou sem aprovação deve ser recusado.
- [ ] **T038.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T038.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T038.09** Ensaiar ou revisar contingência: Retomar intenção confirmada ou restaurar rascunho; não criar pedido manual fora da trilha.
- [ ] **T038.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T039 — Publicar o lote de orçamentos corrigido

**Prioridade:** P1. **Responsável funcional:** Backend comercial e frontend. **Estado:** Planejada.
**Dependências:** T027, T028, T029, T031, T032, T033, T034, T035, T036, T037, T038, T046, T047. **Origens:** P039, W058.

**Aceite específico:** SQL publicado, frontend e Edge correspondem ao mesmo candidato e às provas da etapa 31.

- [ ] **T039.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T039.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T039.03** Revisar novamente as três migrations candidatas e seus efeitos reais, incluindo o bypass agora corrigido.
- [ ] **T039.04** Aplicar via pipeline protegido, depois publicar consumidores compatíveis e reconciliar ledger/definições.
- [ ] **T039.05** Executar cenário positivo: Executar criação, edição, transição e conversão autorizadas no banco de construção.
- [ ] **T039.06** Executar cenário adversarial: Reexecutar lote e negar persona de outra Singular antes e depois da publicação.
- [ ] **T039.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T039.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T039.09** Ensaiar ou revisar contingência: Suspender writers e voltar ao artefato compatível se contrato remoto divergir; usar contingência do lote.
- [ ] **T039.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T040 — Homologar a jornada de orçamento

**Prioridade:** P2. **Responsável funcional:** Backend comercial e frontend. **Estado:** Planejada.
**Dependências:** T005, T018, T030, T039. **Origens:** P040, P050, P135.

**Aceite específico:** Aceite funcional do módulo com evidência positiva/negativa e pendências de negócio resolvidas.

- [ ] **T040.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T040.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T040.03** Executar ciclo completo de catálogo até orçamento, revisão, aprovação e pedido com duas cooperativas.
- [ ] **T040.04** Conferir totais, PDF, identidade dos itens, eventos e conflitos pela UI e por consultas independentes.
- [ ] **T040.05** Executar cenário positivo: Comprador conclui orçamento de múltiplos itens em desktop e mobile.
- [ ] **T040.06** Executar cenário adversarial: Sessão expirada, timeout após commit e duas telas concorrentes não podem duplicar documento ou perder intenção.
- [ ] **T040.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T040.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T040.09** Ensaiar ou revisar contingência: Reabrir etapa de origem e preservar cenário falho para regressão.
- [ ] **T040.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

### Fase 05 — Rascunhos, notificações e resiliência

**Risco a controlar:** Resposta perdida, troca de sessão e envio incerto exigem recuperação explícita.

#### T041 — Consolidar identidade e recuperação de rascunhos

**Prioridade:** P2. **Responsável funcional:** Frontend, backend e operação. **Estado:** Planejada.
**Dependências:** T005, T010. **Origens:** P051, P052, P053.

**Aceite específico:** Identidade recuperável documenta comportamento em recarga, nova aba e nova sessão.

- [ ] **T041.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T041.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T041.03** Definir identidade de novo rascunho por ator, unidade e intenção com persistência adequada entre recargas.
- [ ] **T041.04** Restaurar documento correto e vincular rascunho existente ao orçamento/versionamento sem chave global.
- [ ] **T041.05** Executar cenário positivo: Fechar e reabrir navegador conforme política aprovada recupera o documento correto.
- [ ] **T041.06** Executar cenário adversarial: Dois usuários e dois PAs no mesmo dispositivo não podem acessar o rascunho alheio.
- [ ] **T041.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T041.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T041.09** Ensaiar ou revisar contingência: Quarentenar chave ambígua e oferecer recuperação autorizada sem mostrar dados a outro ator.
- [ ] **T041.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T042 — Controlar formato, retenção e concorrência local

**Prioridade:** P2. **Responsável funcional:** Frontend, backend e operação. **Estado:** Planejada.
**Dependências:** T041. **Origens:** P056, P057.

**Aceite específico:** Formato, TTL e disputa entre abas cobertos; avisos não afirmam salvamento que falhou.

- [ ] **T042.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T042.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T042.03** Versionar envelope e migrar rascunhos antigos com limites de tamanho e retenção explícita.
- [ ] **T042.04** Implementar coordenação entre abas e bloquear sobrescrita silenciosa de revisão mais recente.
- [ ] **T042.05** Executar cenário positivo: Duas abas do mesmo ator recebem conflito e permitem selecionar/reconciliar conteúdo conscientemente.
- [ ] **T042.06** Executar cenário adversarial: Envelope corrupto, quota cheia e versão futura devem gerar recuperação segura sem falha da página.
- [ ] **T042.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T042.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T042.09** Ensaiar ou revisar contingência: Preservar cópia recuperável no mesmo escopo e descartar somente pelo critério de retenção aprovado.
- [ ] **T042.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T043 — Fechar ciclo de sessão e troca de unidade

**Prioridade:** P1. **Responsável funcional:** Frontend, backend e operação. **Estado:** Planejada.
**Dependências:** T005, T041, T042. **Origens:** P053, P054.

**Aceite específico:** Nenhuma gravação tardia cruza sessão/unidade; testes incluem mesmo navegador com personas diferentes.

- [ ] **T043.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T043.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T043.03** Cancelar gravações pendentes ao sair, revogar sessão ou trocar cooperativa/PA.
- [ ] **T043.04** Limpar ou proteger conteúdo local conforme política e revalidar escopo antes de restaurar.
- [ ] **T043.05** Executar cenário positivo: Troca legítima de unidade inicia contexto correto sem reaproveitar carrinho indevido.
- [ ] **T043.06** Executar cenário adversarial: Resposta de save antiga depois do logout não pode persistir ou expor rascunho do usuário anterior.
- [ ] **T043.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T043.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T043.09** Ensaiar ou revisar contingência: Manter restauração suspensa até sessão e unidade serem confirmadas novamente.
- [ ] **T043.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T044 — Conectar autosave à intenção confirmada

**Prioridade:** P1. **Responsável funcional:** Frontend, backend e operação. **Estado:** Planejada.
**Dependências:** T035, T038, T041, T042, T043. **Origens:** P055, P058, P136.

**Aceite específico:** Usuário entende onde o conteúdo está salvo; a recuperação não produz documentos duplicados.

- [ ] **T044.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T044.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T044.03** Exibir estados distintos de rascunho local, gravação remota pendente, confirmada e em conflito.
- [ ] **T044.04** Preservar chave de criação até recuperar confirmação e limpar rascunho somente após vínculo confirmado.
- [ ] **T044.05** Executar cenário positivo: Timeout após commit permite retomar o mesmo orçamento sem perder edição posterior.
- [ ] **T044.06** Executar cenário adversarial: Duplo clique, rede offline e navegação imediata após criar não devem gerar chave nova para a mesma intenção.
- [ ] **T044.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T044.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T044.09** Ensaiar ou revisar contingência: Retomar a intenção persistida e consultar resultado antes de permitir nova criação.
- [ ] **T044.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T045 — Homologar edição resiliente

**Prioridade:** P2. **Responsável funcional:** Frontend, backend e operação. **Estado:** Planejada.
**Dependências:** T018, T039, T044. **Origens:** P059, P060.

**Aceite específico:** Módulo de rascunhos tem aceite conectado e não depende apenas de mocks de storage.

- [ ] **T045.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T045.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T045.03** Executar matriz de recarga, back/forward, offline, timeout, conteúdo grande e encerramento inesperado.
- [ ] **T045.04** Registrar tempos, recuperação, conflitos e retenção em duas personas e dispositivos.
- [ ] **T045.05** Executar cenário positivo: Rascunho com muitas linhas retorna completo e confirma com totais corretos.
- [ ] **T045.06** Executar cenário adversarial: Falha de storage, sessão expirada e resposta fora de ordem preservam separação e conteúdo autorizado.
- [ ] **T045.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T045.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T045.09** Ensaiar ou revisar contingência: Reabrir os cenários falhos e proteger rascunho para exportação/recuperação autorizada.
- [ ] **T045.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T046 — Definir eventos e outbox de notificações

**Prioridade:** P2. **Responsável funcional:** Frontend, backend e operação. **Estado:** Planejada.
**Dependências:** T031, T032, T034. **Origens:** P061, P062.

**Aceite específico:** Contrato de eventos elimina escrita crítica posterior e não verificada do navegador.

- [ ] **T046.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T046.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T046.03** Catalogar eventos, destinatários, escopo e conteúdo de orçamentos/pedidos/aprovações.
- [ ] **T046.04** Persistir intenção de notificação na mesma transação que muda estado, cobrindo individual e lote.
- [ ] **T046.05** Executar cenário positivo: Mudança legítima cria exatamente a intenção esperada com destinatário elegível.
- [ ] **T046.06** Executar cenário adversarial: Rollback, repetição e pedido de outra unidade não geram intenção ou dados indevidos.
- [ ] **T046.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T046.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T046.09** Ensaiar ou revisar contingência: Manter fila pendente; corrigir evento sem perder estado comercial nem reenviar indiscriminadamente.
- [ ] **T046.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T047 — Implementar processamento deduplicado e seguro

**Prioridade:** P2. **Responsável funcional:** Frontend, backend e operação. **Estado:** Planejada.
**Dependências:** T025, T046. **Origens:** P063, P064, P065.

**Aceite específico:** Estados incertos são reconciliáveis; retries têm limite e não fingem confirmação do provedor.

- [ ] **T047.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T047.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T047.03** Definir chave de deduplicação, reserva concorrente, lease, tentativas e recuperação de worker.
- [ ] **T047.04** Revalidar destinatário e autoridade no momento do envio, respeitando revogação e decisão de alçada.
- [ ] **T047.05** Executar cenário positivo: Dois workers processam a fila e somente um conclui a entrega autorizada.
- [ ] **T047.06** Executar cenário adversarial: Crash após envio, lease expirado e usuário revogado devem impedir duplicação automática ou envio indevido.
- [ ] **T047.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T047.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T047.09** Ensaiar ou revisar contingência: Pausar canal afetado, preservar recibo e retomar somente após esclarecer resultado incerto.
- [ ] **T047.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T048 — Homologar provedores, templates e cron

**Prioridade:** P2. **Responsável funcional:** Frontend, backend e operação. **Estado:** Planejada.
**Dependências:** T007, T030, T047. **Origens:** P066, P079.

**Aceite específico:** Configuração operacional por ambiente tem evidência; teste não envia mensagem a contatos reais não autorizados.

- [ ] **T048.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T048.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T048.03** Validar templates, URLs de ação, sanitização, provedor, Vault e autenticação das tarefas internas.
- [ ] **T048.04** Executar entrega em destinatário de teste autorizado com recibo real e periodicidade conhecida.
- [ ] **T048.05** Executar cenário positivo: Email ou canal aprovado chega com contexto e link acessível apenas ao usuário elegível.
- [ ] **T048.06** Executar cenário adversarial: Timeout, recibo inválido, segredo errado e resposta 5xx devem produzir falha observável e sem falso sucesso.
- [ ] **T048.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T048.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T048.09** Ensaiar ou revisar contingência: Desativar schedule/canal com erro e manter outbox recuperável com controle de reenvio.
- [ ] **T048.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T049 — Reconciliar falhas de entrega e alertas

**Prioridade:** P2. **Responsável funcional:** Frontend, backend e operação. **Estado:** Planejada.
**Dependências:** T025, T047, T048. **Origens:** P067, P068, P073, P129, W091.

**Aceite específico:** Falhas ficam visíveis e solucionáveis com trilha; alertas têm destinatário/canal previamente aprovado.

- [ ] **T049.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T049.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T049.03** Concluir painel administrativo, fila terminal, reenvio autorizado e justificativa auditável.
- [ ] **T049.04** Ligar métricas de atraso/falha a suporte, dono e SLA medido, com redaction de dados sensíveis.
- [ ] **T049.05** Executar cenário positivo: Supervisor identifica falha e reconcilia pelo recibo sem alterar estado comercial indevido.
- [ ] **T049.06** Executar cenário adversarial: Comprador comum e supervisor fora de escopo não podem confirmar entrega ou apagar falha.
- [ ] **T049.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T049.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T049.09** Ensaiar ou revisar contingência: Restaurar estado pendente fundamentado e manter registro de quem decidiu o reenvio.
- [ ] **T049.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T050 — Homologar notificações ponta a ponta

**Prioridade:** P2. **Responsável funcional:** Frontend, backend e operação. **Estado:** Planejada.
**Dependências:** T018, T039, T046, T047, T048, T049. **Origens:** P069, P070.

**Aceite específico:** Aceite por evento/canal com diferenças documentadas; notificação de pedido não certifica orçamento automaticamente.

- [ ] **T050.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T050.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T050.03** Executar matriz de eventos individuais, lote, delegação, recusa, reabertura e repetição.
- [ ] **T050.04** Conferir banco, outbox, provedor, interface e auditoria para cada destinatário esperado.
- [ ] **T050.05** Executar cenário positivo: Fluxo aprovado gera uma entrega válida por canal e mostra estado correto.
- [ ] **T050.06** Executar cenário adversarial: Transação abortada, destinatário inelegível e falha parcial não causam entrega fantasma ou multiplicada.
- [ ] **T050.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T050.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T050.09** Ensaiar ou revisar contingência: Manter liberação do canal bloqueada até corrigir o caminho inconsistente.
- [ ] **T050.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

### Fase 06 — Governança institucional e catálogo

**Risco a controlar:** Regras de negócio e catálogo somente leitura precisam valer no servidor.

#### T051 — Concluir convites institucionais

**Prioridade:** P2. **Responsável funcional:** Produto de compras e backend. **Estado:** Planejada.
**Dependências:** T005, T024, T030. **Origens:** P081, P082.

**Aceite específico:** Convite funcional no ambiente publicado e matriz de negativas registrada.

- [ ] **T051.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T051.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T051.03** Validar vínculo ao PA/cooperativa, perfil, expiração e reenvio dos convites existentes.
- [ ] **T051.04** Completar aceite, revogação, deduplicação e telas acessíveis com trilha de quem convidou.
- [ ] **T051.05** Executar cenário positivo: Convidado autorizado aceita uma vez e recebe somente permissões previstas.
- [ ] **T051.06** Executar cenário adversarial: Token repetido/expirado, mudança de unidade e convite por ator sem alçada devem ser recusados.
- [ ] **T051.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T051.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T051.09** Ensaiar ou revisar contingência: Revogar convite e sessões vinculadas quando necessário sem remover histórico legítimo.
- [ ] **T051.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T052 — Versionar políticas e alçadas

**Prioridade:** P2. **Responsável funcional:** Produto de compras e backend. **Estado:** Planejada.
**Dependências:** T004, T021, T025. **Origens:** P083.

**Aceite específico:** Decisão é reproduzível pela política histórica e pelas permissões do ator no servidor.

- [ ] **T052.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T052.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T052.03** Definir limites monetários, papéis, substituições e exceções por cooperativa com vigência.
- [ ] **T052.04** Persistir versão da política usada em cada decisão e impedir autoaprovação indevida.
- [ ] **T052.05** Executar cenário positivo: Pedido percorre alçadas corretas para valor, unidade e data de vigência.
- [ ] **T052.06** Executar cenário adversarial: Alterar política durante decisão ou forjar papel no cliente não deve mudar silenciosamente a autoridade.
- [ ] **T052.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T052.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T052.09** Ensaiar ou revisar contingência: Manter solicitações em revisão ao detectar regra indefinida e registrar decisão autorizada.
- [ ] **T052.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T053 — Fechar fila de aprovação e delegação

**Prioridade:** P2. **Responsável funcional:** Produto de compras e backend. **Estado:** Planejada.
**Dependências:** T024, T051, T052. **Origens:** P084, P085, P086.

**Aceite específico:** Aprovação única e correta por política; nenhuma permissão depende só da interface.

- [ ] **T053.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T053.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T053.03** Completar seleção de elegíveis, decisão concorrente, retorno por recusa e justificativas.
- [ ] **T053.04** Aplicar delegação temporária no servidor e UI, incluindo expiração, revogação e limites de escopo.
- [ ] **T053.05** Executar cenário positivo: Delegado vigente decide dentro do limite e histórico registra titular e delegado.
- [ ] **T053.06** Executar cenário adversarial: Dois aprovadores, delegado expirado e delegação cruzada não podem confirmar decisões incompatíveis.
- [ ] **T053.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T053.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T053.09** Ensaiar ou revisar contingência: Reabrir solicitação pelo fluxo autorizado e preservar decisões/recusas anteriores.
- [ ] **T053.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T054 — Cadastrar propostas institucionais comparáveis

**Prioridade:** P2. **Responsável funcional:** Compras institucionais e produto. **Estado:** Planejada.
**Dependências:** T004, T023, T075. **Origens:** P087.

**Aceite específico:** Comparação utilizável e auditável com documentos liberados; metadados sem tela não encerram entrega.

- [ ] **T054.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T054.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T054.03** Modelar propostas anexadas e linhas equivalentes com preço, personalização, prazo, frete e validade.
- [ ] **T054.04** Construir comparação transparente com normalização de unidade e tratamento de dados faltantes.
- [ ] **T054.05** Executar cenário positivo: Gestor compara três propostas equivalentes com custo total e prazo verificáveis.
- [ ] **T054.06** Executar cenário adversarial: Fornecedor sem dado, moeda/unidade divergente ou proposta vencida não recebe ranking enganoso.
- [ ] **T054.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T054.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T054.09** Ensaiar ou revisar contingência: Marcar comparação incompleta e manter seleção suspensa até complementar a informação.
- [ ] **T054.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T055 — Formalizar escolha e fornecedor único

**Prioridade:** P2. **Responsável funcional:** Compras institucionais e gestor. **Estado:** Planejada.
**Dependências:** T052, T054. **Origens:** P088.

**Aceite específico:** Decisão comercial possui justificativa, versão, responsável e trilha institucional.

- [ ] **T055.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T055.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T055.03** Registrar critérios, justificativa, conflito de interesse quando aplicável e aprovação da exceção.
- [ ] **T055.04** Vincular escolha ao orçamento/pedido e impedir mudança de fornecedor sem reaprovação definida.
- [ ] **T055.05** Executar cenário positivo: Escolha regular e exceção justificada percorrem autoridades previstas.
- [ ] **T055.06** Executar cenário adversarial: Ausência de proposta comparável ou mudança de condição não pode passar como escolha já aprovada.
- [ ] **T055.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T055.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T055.09** Ensaiar ou revisar contingência: Retornar à comparação ou alçada adequada sem apagar a decisão substituída.
- [ ] **T055.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T056 — Validar disponibilidade de verba na aprovação

**Prioridade:** P1. **Responsável funcional:** Backend financeiro e compras. **Estado:** Planejada.
**Dependências:** T023, T025, T037, T052. **Origens:** P089, P124, P125.

**Aceite específico:** Regra de saldo vale no servidor; exceção tem alçada e não resulta de fallback silencioso.

- [ ] **T056.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T056.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T056.03** Usar PA real, cooperativa e competência correta no editor, serviço e RPC.
- [ ] **T056.04** Bloquear erro/ausência de verba e reservar/validar saldo atomicamente com regra de exceção autorizada.
- [ ] **T056.05** Executar cenário positivo: Duas competências no mesmo PA são consultadas e atualizadas independentemente.
- [ ] **T056.06** Executar cenário adversarial: Corrida por último saldo, clientId usado como PA e falha da consulta não podem liberar aprovação.
- [ ] **T056.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T056.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T056.09** Ensaiar ou revisar contingência: Cancelar reserva não confirmada conforme contrato e devolver pedido para análise de verba.
- [ ] **T056.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T057 — Homologar governança entre cooperativas

**Prioridade:** P2. **Responsável funcional:** Produto de compras e backend. **Estado:** Planejada.
**Dependências:** T018, T039, T050, T051, T052, T053, T054, T055, T056. **Origens:** P090.

**Aceite específico:** Responsável de negócio aprova a governança completa, inclusive exceções e autorizações negativas.

- [ ] **T057.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T057.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T057.03** Ensaiar convite, políticas distintas, delegação, comparação, fornecedor único e aprovação com duas organizações.
- [ ] **T057.04** Conferir exposição de documentos, verbas, notificações e históricos em todos os papéis.
- [ ] **T057.05** Executar cenário positivo: Cada cooperativa conclui compra conforme sua regra sem interferir na outra.
- [ ] **T057.06** Executar cenário adversarial: Troca de UUID, perfil revogado e policy alterada durante o fluxo devem preservar isolamento.
- [ ] **T057.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T057.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T057.09** Ensaiar ou revisar contingência: Manter compras afetadas em rascunho/revisão e reabrir regra ambígua.
- [ ] **T057.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T058 — Certificar catálogo mestre somente leitura

**Prioridade:** P1. **Responsável funcional:** Produto de compras e backend. **Estado:** Planejada.
**Dependências:** T007, T025. **Origens:** P091.

**Aceite específico:** Nenhuma credencial permite fluxo de escrita a partir do portal; logs mostram apenas consultas autorizadas.

- [ ] **T058.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T058.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T058.03** Inventariar todas as rotas do bridge e bloquear comandos de mutação, inclusive RPCs indiretas.
- [ ] **T058.04** Garantir que estoque e preço vêm da fonte autorizada e que custo interno não é exposto ao comprador.
- [ ] **T058.05** Executar cenário positivo: Busca e consulta de detalhes usam o projeto doufsxqlfjyuvxuezpln sem qualquer escrita.
- [ ] **T058.06** Executar cenário adversarial: Comando camuflado em lote, redirecionamento e host semelhante devem ser rejeitados antes da rede.
- [ ] **T058.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T058.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T058.09** Ensaiar ou revisar contingência: Desabilitar rota insegura e manter catálogo indisponível de forma explícita até correção.
- [ ] **T058.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T059 — Normalizar produto, preço, estoque e validade

**Prioridade:** P2. **Responsável funcional:** Produto de compras e backend. **Estado:** Planejada.
**Dependências:** T023, T058. **Origens:** P092, P134.

**Aceite específico:** Mesma semântica comercial em card, detalhe, kit, orçamento e recompra.

- [ ] **T059.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T059.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T059.03** Definir contrato de variantes, unidades, mínimos, prazo, personalização e atualização comercial.
- [ ] **T059.04** Mostrar ausência/dado vencido/indisponibilidade sem números ou promessas inventadas.
- [ ] **T059.05** Executar cenário positivo: Produto com variantes é cotado na unidade correta e atualiza preço/estoque de modo consistente.
- [ ] **T059.06** Executar cenário adversarial: Preço ausente, foto faltante, estoque vencido e técnica incompatível recebem estado seguro.
- [ ] **T059.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T059.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T059.09** Ensaiar ou revisar contingência: Impedir confirmação e permitir nova consulta/alternativa quando a fonte não sustentar a oferta.
- [ ] **T059.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T060 — Homologar descoberta e seleção na loja

**Prioridade:** P2. **Responsável funcional:** Produto de compras e backend. **Estado:** Planejada.
**Dependências:** T018, T059. **Origens:** P093, P133.

**Aceite específico:** Jornadas de descoberta aprovadas em desktop/mobile com dados reais de homologação.

- [ ] **T060.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T060.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T060.03** Validar busca, filtros, ordenação, deep links, comparação e paginação com catálogo representativo.
- [ ] **T060.04** Conferir autorização e contexto de cooperativa em favoritos, seleção em lote e navegação direta.
- [ ] **T060.05** Executar cenário positivo: Comprador encontra produto e leva a seleção ao orçamento mantendo filtros relevantes.
- [ ] **T060.06** Executar cenário adversarial: Resultado vazio, texto longo, empate de ordenação e catálogo grande não ocultam itens nem quebram foco.
- [ ] **T060.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T060.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T060.09** Ensaiar ou revisar contingência: Preservar critérios de busca e informar falha recuperável sem inventar resultados.
- [ ] **T060.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

### Fase 07 — Kits, embalagem e recompra

**Risco a controlar:** Preço, capacidade física e prazo não podem ser prometidos sem dados suficientes.

#### T061 — Concluir templates, favoritos e coleções

**Prioridade:** P2. **Responsável funcional:** Engenharia comercial e operação de produto. **Estado:** Planejada.
**Dependências:** T024, T059, T060. **Origens:** P098.

**Aceite específico:** Coleções reutilizáveis funcionam com erros/vazios e origem comercial verificável.

- [ ] **T061.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T061.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T061.03** Revalidar permissões e produtos ao salvar, compartilhar ou aplicar template/lista.
- [ ] **T061.04** Versionar conteúdo e tratar produto removido, variante alterada e técnica indisponível.
- [ ] **T061.05** Executar cenário positivo: Aplicar template atual cria composição válida ligada ao ator e unidade corretos.
- [ ] **T061.06** Executar cenário adversarial: Compartilhamento sem escopo e template com dado vencido não podem gerar orçamento silenciosamente incorreto.
- [ ] **T061.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T061.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T061.09** Ensaiar ou revisar contingência: Manter template anterior acessível ao dono e exigir revisão antes de reutilizar versão inválida.
- [ ] **T061.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T062 — Validar cálculo e demanda dos kits

**Prioridade:** P2. **Responsável funcional:** Engenharia comercial e operação de produto. **Estado:** Planejada.
**Dependências:** T037, T059. **Origens:** P094.

**Aceite específico:** Cálculo independente confirma totais, mínimos e saldo de toda composição.

- [ ] **T062.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T062.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T062.03** Reconciliar quantidade de kits e unidades por item, mínimos, personalização e demanda agregada de repetidos.
- [ ] **T062.04** Manter cache dependente de composição quantitativa e dados comerciais usados no cálculo.
- [ ] **T062.05** Executar cenário positivo: Kit com produto repetido agrega corretamente estoque e custos em cliente/servidor.
- [ ] **T062.06** Executar cenário adversarial: Mudar item de uma para cem unidades e repetir SKU não pode reutilizar previsão ou saldo incorreto.
- [ ] **T062.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T062.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T062.09** Ensaiar ou revisar contingência: Invalidar previsão e refazer cálculo com dados atuais antes de aceitar cotação.
- [ ] **T062.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T063 — Modelar embalagem e capacidade física

**Prioridade:** P2. **Responsável funcional:** Engenharia de produto e logística. **Estado:** Planejada.
**Dependências:** T004, T059. **Origens:** P095.

**Aceite específico:** Modelo físico documentado e dados suficientes; medidas de gravação não substituem dimensões do objeto.

- [ ] **T063.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T063.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T063.03** Definir dimensões, peso, limites, orientação permitida e unidades de produto/embalagem.
- [ ] **T063.04** Criar cadastro e estado de revisão técnica quando geometria ou peso forem desconhecidos.
- [ ] **T063.05** Executar cenário positivo: Produto conhecido cabe com folga/peso conforme regra aprovada e evidência técnica.
- [ ] **T063.06** Executar cenário adversarial: Dimensão ausente, unidade confundida e produto maior que a embalagem não geram compatibilidade automática.
- [ ] **T063.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T063.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T063.09** Ensaiar ou revisar contingência: Manter kit em revisão técnica e impedir promessa de embalagem até completar os dados.
- [ ] **T063.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T064 — Validar embalagem no servidor

**Prioridade:** P1. **Responsável funcional:** Backend e engenharia de produto. **Estado:** Planejada.
**Dependências:** T025, T062, T063. **Origens:** P096.

**Aceite específico:** Cliente não consegue contornar validação física; decisão técnica tem dono e validade.

- [ ] **T064.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T064.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T064.03** Executar regra de capacidade/compatibilidade física durante a cotação do kit.
- [ ] **T064.04** Associar parecer técnico, embalagem e versão da composição à proposta final.
- [ ] **T064.05** Executar cenário positivo: Kit dentro da capacidade confirma embalagem e estimativa de peso coerentes.
- [ ] **T064.06** Executar cenário adversarial: Peso excedido, composição alterada após parecer e geometria desconhecida devem bloquear ou exigir revisão.
- [ ] **T064.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T064.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T064.09** Ensaiar ou revisar contingência: Reverter à última composição tecnicamente aprovada ou selecionar embalagem compatível.
- [ ] **T064.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T065 — Concluir previsão e prazo de reposição

**Prioridade:** P2. **Responsável funcional:** Engenharia comercial e operação de produto. **Estado:** Planejada.
**Dependências:** T004, T059, T062. **Origens:** P097.

**Aceite específico:** Prazo é rastreável às entradas e distingue estimativa de compromisso aprovado.

- [ ] **T065.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T065.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T065.03** Definir fontes, atualização, confiança, lead time e buffers configuráveis por produto/fornecedor.
- [ ] **T065.04** Substituir buffer fixo sem fundamento por regra documentada e mostrar incerteza ao comprador.
- [ ] **T065.05** Executar cenário positivo: Previsão usa demanda e capacidade conhecidas com data de referência visível.
- [ ] **T065.06** Executar cenário adversarial: Histórico insuficiente, fonte vencida e evento mais cedo não podem virar promessa certa.
- [ ] **T065.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T065.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T065.09** Ensaiar ou revisar contingência: Retirar promessa, registrar nova previsão e submeter mudança de prazo ao responsável.
- [ ] **T065.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T066 — Fortalecer cotação e publicação de kit

**Prioridade:** P2. **Responsável funcional:** Engenharia comercial e operação de produto. **Estado:** Planejada.
**Dependências:** T030, T062, T064, T065. **Origens:** P076.

**Aceite específico:** Cotação publicada comprovada com dados autorizados e negativas; hash Edge registrado.

- [ ] **T066.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T066.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T066.03** Revalidar autenticação, escopo, contrato e proteção de preço/estoque na função sicoob-kit-quote.
- [ ] **T066.04** Publicar função compatível e retornar resumo que exige aceite das diferenças comerciais.
- [ ] **T066.05** Executar cenário positivo: Kit aprovado tecnicamente produz orçamento consistente com a consulta vigente.
- [ ] **T066.06** Executar cenário adversarial: Payload alterado, outra cooperativa e mudança de preço durante cotação devem ser tratados no servidor.
- [ ] **T066.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T066.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T066.09** Ensaiar ou revisar contingência: Voltar à versão compatível e preservar composição sem confirmar preço não validado.
- [ ] **T066.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T067 — Concluir persistência e compartilhamento de kits

**Prioridade:** P2. **Responsável funcional:** Engenharia comercial e operação de produto. **Estado:** Planejada.
**Dependências:** T024, T061, T064, T066. **Origens:** P098.

**Aceite específico:** Kit salvo, compartilhado e exportado mantém identidade e permissões; prévia pública não permite ação privilegiada.

- [ ] **T067.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T067.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T067.03** Persistir composição, embalagem, parecer e versão de preço de cada kit com vínculo ao ator e unidade.
- [ ] **T067.04** Concluir edição, exportação e compartilhamento autorizado com expiração/revogação e limites de conteúdo público.
- [ ] **T067.05** Executar cenário positivo: Usuário reabre kit salvo e exporta a versão comercial/técnica correta sem alterar a origem.
- [ ] **T067.06** Executar cenário adversarial: Share revogado, link externo e edição concorrente não podem expor custo interno nem publicar composição antiga como atual.
- [ ] **T067.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T067.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T067.09** Ensaiar ou revisar contingência: Revogar compartilhamento incorreto e recuperar última composição confirmada com trilha de versões.
- [ ] **T067.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T068 — Estabilizar intenção de recompra

**Prioridade:** P1. **Responsável funcional:** Engenharia comercial e operação de produto. **Estado:** Planejada.
**Dependências:** T035, T038, T059. **Origens:** P077, P099.

**Aceite específico:** Recompra única por intenção demonstrada no serviço e na Edge, sem depender de randomUUID por chamada.

- [ ] **T068.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T068.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T068.03** Persistir chave de intenção por ator/pedido de origem através de timeout e recarga.
- [ ] **T068.04** Rotacionar a chave somente após sucesso conhecido ou nova intenção explícita do usuário.
- [ ] **T068.05** Executar cenário positivo: Retry após resposta perdida recupera a mesma recompra na UI e no servidor.
- [ ] **T068.06** Executar cenário adversarial: Nova chamada automática, duas abas e logout não podem duplicar pedido ou reutilizar chave de outro ator.
- [ ] **T068.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T068.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T068.09** Ensaiar ou revisar contingência: Consultar registro da intenção antes de oferecer nova tentativa com outra chave.
- [ ] **T068.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T069 — Homologar diferenças comerciais da recompra

**Prioridade:** P2. **Responsável funcional:** Engenharia comercial e operação de produto. **Estado:** Planejada.
**Dependências:** T066, T068. **Origens:** P099.

**Aceite específico:** Resumo, orçamento e pedido refletem a versão comercial aceita com trilha das diferenças.

- [ ] **T069.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T069.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T069.03** Revalidar produtos, variantes, preço, estoque, mínimos, técnica, endereço e autorização atuais.
- [ ] **T069.04** Mostrar alterações e exigir confirmação explícita antes de criar compromisso atualizado.
- [ ] **T069.05** Executar cenário positivo: Usuário recompra com diferença de preço e confirma composição válida conscientemente.
- [ ] **T069.06** Executar cenário adversarial: Produto descontinuado, saldo insuficiente e modificação de pedido alheio devem bloquear a confirmação.
- [ ] **T069.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T069.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T069.09** Ensaiar ou revisar contingência: Preservar pedido de origem imutável e devolver nova intenção para revisão.
- [ ] **T069.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T070 — Homologar catálogo, kits e recompra conectados

**Prioridade:** P2. **Responsável funcional:** Engenharia comercial e operação de produto. **Estado:** Planejada.
**Dependências:** T018, T040, T060, T061, T062, T063, T064, T065, T066, T067, T068, T069. **Origens:** P100.

**Aceite específico:** Aceite integrado dos três caminhos com evidências SQL, Edge e UI do mesmo lote.

- [ ] **T070.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T070.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T070.03** Executar jornadas de compra unitária, kit e recompra com técnicas e estoques distintos.
- [ ] **T070.04** Conferir cache, capacidade física, prazo, totais e intenção em mobile e desktop.
- [ ] **T070.05** Executar cenário positivo: Composição válida percorre descoberta até orçamento/pedido sem intervenção manual fora da trilha.
- [ ] **T070.06** Executar cenário adversarial: Timeout, alteração comercial e embalagem inviável não geram confirmação enganosa.
- [ ] **T070.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T070.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T070.09** Ensaiar ou revisar contingência: Reabrir cálculo/contrato específico e bloquear somente a confirmação afetada.
- [ ] **T070.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

### Fase 08 — Arte, documentos e integrações

**Risco a controlar:** Arquivos não inspecionados e versões inválidas não podem liberar produção.

#### T071 — Consolidar marca e ativos institucionais

**Prioridade:** P2. **Responsável funcional:** Marketing e responsável pela marca. **Estado:** Planejada.
**Dependências:** T004, T005. **Origens:** P101, P132.

**Aceite específico:** Responsável de marca valida usos e versões; pesquisa na internet não substitui licença/aceite institucional.

- [ ] **T071.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T071.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T071.03** Catalogar logos, cores, tipografia, direitos de uso e documentos oficiais aplicáveis.
- [ ] **T071.04** Versionar biblioteca e permissões por cooperativa, incluindo ativos usados em PDF e arte.
- [ ] **T071.05** Executar cenário positivo: Tela, proposta e prova técnica usam ativos aprovados da organização correta.
- [ ] **T071.06** Executar cenário adversarial: Logo antigo, arquivo não aprovado e acesso entre cooperativas não devem contaminar o material.
- [ ] **T071.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T071.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T071.09** Ensaiar ou revisar contingência: Retirar ativo indevido e manter versão autorizada disponível com histórico.
- [ ] **T071.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T072 — Vincular arte à identidade e versão do item

**Prioridade:** P2. **Responsável funcional:** Engenharia documental e marketing. **Estado:** Planejada.
**Dependências:** T036, T071. **Origens:** P044, P102.

**Aceite específico:** Nenhum vínculo órfão ou aprovação transferida silenciosamente; regras dialogam com a etapa 36.

- [ ] **T072.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T072.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T072.03** Associar arquivo, prova, pedido, item e revisão de composição de forma estável.
- [ ] **T072.04** Definir invalidação de aprovação quando conteúdo, técnica, dimensão ou item mudar.
- [ ] **T072.05** Executar cenário positivo: Revisão legítima preserva histórico e exige nova decisão somente nos itens afetados.
- [ ] **T072.06** Executar cenário adversarial: Salvar orçamento ou substituir SKU não pode deixar prova antiga aprovando produto diferente.
- [ ] **T072.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T072.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T072.09** Ensaiar ou revisar contingência: Suspender produção do item e recuperar versão aprovada ou nova prova formal.
- [ ] **T072.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T073 — Completar prova técnica e decisão de arte

**Prioridade:** P2. **Responsável funcional:** Engenharia documental e marketing. **Estado:** Planejada.
**Dependências:** T052, T053, T072. **Origens:** P103, P104.

**Aceite específico:** Fluxo técnico encerra com arquivo/hash/versão e responsável reproduzíveis.

- [ ] **T073.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T073.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T073.03** Concluir elaboração, comentários, versionamento e visualização da prova com informações de produção.
- [ ] **T073.04** Registrar aprovação/recusa autorizada, motivo e bloqueio de produção até prova vigente aprovada.
- [ ] **T073.05** Executar cenário positivo: Comprador aprova versão correta e produção recebe exatamente esse arquivo.
- [ ] **T073.06** Executar cenário adversarial: Decisão simultânea, usuário sem alçada e URL antiga não podem aprovar versão substituída.
- [ ] **T073.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T073.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T073.09** Ensaiar ou revisar contingência: Reabrir prova por revisão formal e impedir uso da anterior quando invalidada.
- [ ] **T073.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T074 — Fortalecer ingestão e quarentena documental

**Prioridade:** P1. **Responsável funcional:** Engenharia documental e marketing. **Estado:** Planejada.
**Dependências:** T024, T025, T030. **Origens:** P075, P105, P106.

**Aceite específico:** Nenhum documento pode pular inspeção ou vincular-se a pedido fora do escopo.

- [ ] **T074.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T074.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T074.03** Validar bytes, MIME, extensão, tamanho, hash, propósito e vínculo ao pedido antes da liberação.
- [ ] **T074.04** Proteger Storage e registrar estados de upload, inspeção e rejeição sem acesso público prematuro.
- [ ] **T074.05** Executar cenário positivo: Documento válido entra em quarentena e só fica disponível após parecer autorizado.
- [ ] **T074.06** Executar cenário adversarial: Arquivo poliglota, tamanho excessivo, caminho externo e upload duplicado devem ser tratados de forma segura.
- [ ] **T074.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T074.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T074.09** Ensaiar ou revisar contingência: Manter objeto isolado e limpar resíduo por rotina autorizada sem apagar prova de rejeição necessária.
- [ ] **T074.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T075 — Configurar e homologar scanner real

**Prioridade:** P1. **Responsável funcional:** Segurança documental e operação. **Estado:** Planejada.
**Dependências:** T007, T074. **Origens:** P075, P107.

**Aceite específico:** Scanner demonstrado em ambiente autorizado; publicação da Edge isoladamente não basta.

- [ ] **T075.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T075.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T075.03** Configurar provedor/token do scanner no ambiente correto com política de falha fechada.
- [ ] **T075.04** Validar resposta assinada/contratada, correlação ao hash e limites de tempo com registro de parecer.
- [ ] **T075.05** Executar cenário positivo: Arquivo sintético seguro é liberado pelo serviço real e mantém vínculo correto.
- [ ] **T075.06** Executar cenário adversarial: Malicioso sintético, timeout, scanner ausente e parecer inválido não liberam o arquivo.
- [ ] **T075.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T075.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T075.09** Ensaiar ou revisar contingência: Manter quarentena e retomar inspeção de forma deduplicada quando o serviço recuperar.
- [ ] **T075.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T076 — Fechar retenção, revogação e recuperação de anexos

**Prioridade:** P2. **Responsável funcional:** Engenharia documental e marketing. **Estado:** Planejada.
**Dependências:** T004, T008, T024, T074, T075. **Origens:** P074, P108, P110.

**Aceite específico:** Storage, metadados e acesso têm testes independentes; exclusão exige regra e responsável.

- [ ] **T076.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T076.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T076.03** Definir política de retenção por tipo documental e URLs assinadas com duração adequada.
- [ ] **T076.04** Executar revogação de acesso, expiração, exportação e recuperação sem perder vínculo/auditoria.
- [ ] **T076.05** Executar cenário positivo: Usuário elegível baixa documento liberado e recupera versão autorizada conforme política.
- [ ] **T076.06** Executar cenário adversarial: Sessão revogada, link expirado e usuário de outra unidade não podem obter conteúdo protegido.
- [ ] **T076.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T076.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T076.09** Ensaiar ou revisar contingência: Revogar URLs/escopo e restaurar objeto versionado quando a política permitir.
- [ ] **T076.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T077 — Reconciliar arte, exportações e dossiê

**Prioridade:** P2. **Responsável funcional:** Engenharia documental e marketing. **Estado:** Planejada.
**Dependências:** T030, T037, T072, T073, T075, T076. **Origens:** P108.

**Aceite específico:** Dossiê verificável por amostra e sem arquivos de outra organização.

- [ ] **T077.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T077.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T077.03** Publicar funções de registro/ingestão e workers de exportação com contratos, hashes e scopes conferidos.
- [ ] **T077.04** Gerar PDF/dossiê com dados conciliados, jobs deduplicados e downloads protegidos.
- [ ] **T077.05** Executar cenário positivo: Exportação de pedido inclui documentos e versões liberadas com totais consistentes.
- [ ] **T077.06** Executar cenário adversarial: Documento em quarentena, job repetido e acesso externo não podem produzir pacote indevido.
- [ ] **T077.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T077.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T077.09** Ensaiar ou revisar contingência: Invalidar pacote incorreto, preservar rastreio e gerar nova versão sem substituir prova histórica.
- [ ] **T077.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T078 — Completar colaboração Magic Up

**Prioridade:** P2. **Responsável funcional:** Engenharia documental e marketing. **Estado:** Planejada.
**Dependências:** T024, T071, T072. **Origens:** P123.

**Aceite específico:** Fluxo completo disponível; eventual retirada requer decisão explícita e tratamento de todos os requisitos herdados.

- [ ] **T078.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T078.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T078.03** Ligar comentários, reações e compartilhamentos aos consumidores reais e à autorização por escopo.
- [ ] **T078.04** Versionar a colaboração junto ao ativo/projeto e refletir decisões na prova quando aplicável.
- [ ] **T078.05** Executar cenário positivo: Participantes autorizados colaboram e acompanham versões sem perder autoria.
- [ ] **T078.06** Executar cenário adversarial: Share revogado, link público inadequado e ator externo não podem ler ou escrever no projeto.
- [ ] **T078.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T078.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T078.09** Ensaiar ou revisar contingência: Suspender compartilhamento e preservar conteúdo acessível apenas aos responsáveis.
- [ ] **T078.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T079 — Homologar webhooks, Bitrix e serviços externos

**Prioridade:** P2. **Responsável funcional:** Engenharia documental e marketing. **Estado:** Planejada.
**Dependências:** T007, T030, T047, T048. **Origens:** P078, P079.

**Aceite específico:** Integrações têm recibos e reconciliação; credencial ausente produz estado de indisponibilidade explícito.

- [ ] **T079.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T079.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T079.03** Validar assinatura, replay, idempotência, mapeamentos e dados enviados a cada integração autorizada.
- [ ] **T079.04** Publicar e testar cron/workers internos com secrets de ambiente e observabilidade consistente.
- [ ] **T079.05** Executar cenário positivo: Evento comercial legítimo sincroniza uma vez e retorna identificador correlacionável.
- [ ] **T079.06** Executar cenário adversarial: Assinatura inválida, resposta 5xx e evento duplicado não provocam negócio duplicado ou fuga de dados.
- [ ] **T079.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T079.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T079.09** Ensaiar ou revisar contingência: Pausar envio e reprocessar somente eventos com estado conhecido após reconciliar fornecedor externo.
- [ ] **T079.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T080 — Homologar arte e documentos no canônico

**Prioridade:** P2. **Responsável funcional:** Engenharia documental e marketing. **Estado:** Planejada.
**Dependências:** T018, T030, T071, T072, T073, T074, T075, T076, T077, T078, T079. **Origens:** P109.

**Aceite específico:** Aceite remoto datado dos módulos e evidência de provedor; mocks continuam identificados como mocks.

- [ ] **T080.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T080.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T080.03** Executar upload, inspeção, prova, aprovação, download, exportação e recuperação com duas cooperativas.
- [ ] **T080.04** Conferir hashes Edge, contratos SQL, políticas Storage e trilha de cada versão publicada.
- [ ] **T080.05** Executar cenário positivo: Compra de teste chega à liberação de produção com documentação correta e íntegra.
- [ ] **T080.06** Executar cenário adversarial: Arquivo rejeitado, decisão cruzada e token revogado impedem avanço sem contorno manual.
- [ ] **T080.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T080.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T080.09** Ensaiar ou revisar contingência: Bloquear produção/publicação documental e reabrir vínculo ou inspeção que falhou.
- [ ] **T080.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

### Fase 09 — Logística, campanhas e finanças

**Risco a controlar:** Entregas parciais e compensações precisam fechar quantidade, valor e competência.

#### T081 — Fechar paginação e distribuição logística

**Prioridade:** P2. **Responsável funcional:** Operação, compras e financeiro. **Estado:** Planejada.
**Dependências:** T023, T024, T038. **Origens:** P111, P112.

**Aceite específico:** Totais por item/destino conferem com SQL; contexto de cooperativa é preservado em todas as páginas.

- [ ] **T081.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T081.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T081.03** Paginar pedidos e remessas com filtro no servidor, ordenação estável e desempate por ID.
- [ ] **T081.04** Modelar alocações por destino, recebimentos e saldo sem duplicar quantidades nas consultas.
- [ ] **T081.05** Executar cenário positivo: Relatório com mais de mil remessas e datas empatadas lista todas uma única vez.
- [ ] **T081.06** Executar cenário adversarial: Alteração concorrente e registro elegível após primeira página não podem sumir do relatório.
- [ ] **T081.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T081.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T081.09** Ensaiar ou revisar contingência: Oferecer snapshot/reconsulta consistente e impedir decisão operacional baseada em relatório incompleto.
- [ ] **T081.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T082 — Implementar importação assistida de destinos

**Prioridade:** P2. **Responsável funcional:** Operação, compras e financeiro. **Estado:** Planejada.
**Dependências:** T024, T081. **Origens:** P113.

**Aceite específico:** Importação tem prévia e resumo auditável; parte válida não é aplicada silenciosamente se o contrato exigir atomicidade.

- [ ] **T082.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T082.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T082.03** Definir template CSV/XLSX com PA, endereço, item, quantidade e identificação de linha.
- [ ] **T082.04** Criar prévia, validação de totais, erros por linha, confirmação e importação idempotente.
- [ ] **T082.05** Executar cenário positivo: Importar três destinos e reaplicar arquivo confirmado sem duplicar alocação.
- [ ] **T082.06** Executar cenário adversarial: PA inválido, quantidade excedente, coluna malformada e arquivo misto de organizações devem ser rejeitados claramente.
- [ ] **T082.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T082.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T082.09** Ensaiar ou revisar contingência: Cancelar lote não confirmado ou reverter somente o lote importado com rastreabilidade.
- [ ] **T082.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T083 — Reconfirmar estoque e registrar expedição

**Prioridade:** P2. **Responsável funcional:** Operação, compras e financeiro. **Estado:** Planejada.
**Dependências:** T056, T059, T073, T081, T082. **Origens:** P112, P114, P115.

**Aceite específico:** Só itens elegíveis são expedidos; estoque consultado na fonte externa permanece somente leitura.

- [ ] **T083.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T083.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T083.03** Revalidar disponibilidade e composição antes de comprometer expedição por destino.
- [ ] **T083.04** Registrar remessa, transportador, quantidade, data, documentos e comprovante com controle de duplicidade.
- [ ] **T083.05** Executar cenário positivo: Expedição parcial atualiza saldo por destino sem marcar pedido inteiro como entregue.
- [ ] **T083.06** Executar cenário adversarial: Saldo insuficiente, prova não aprovada e repetição de comando devem impedir expedição inválida.
- [ ] **T083.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T083.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T083.09** Ensaiar ou revisar contingência: Cancelar reserva interna/expedição não confirmada pela regra aprovada sem alterar estoque mestre.
- [ ] **T083.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T084 — Integrar rastreio e recebimento

**Prioridade:** P2. **Responsável funcional:** Operação, compras e financeiro. **Estado:** Planejada.
**Dependências:** T024, T079, T083. **Origens:** P116, P117.

**Aceite específico:** Rastreio e recebimento têm origem verificável e distinção entre previsão e confirmação.

- [ ] **T084.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T084.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T084.03** Normalizar eventos do transportador e previsão com deduplicação e ordenação de eventos.
- [ ] **T084.04** Permitir conferência por PA com comprovante, divergência e histórico de recebimento parcial.
- [ ] **T084.05** Executar cenário positivo: Três destinos recebem em datas diferentes e o progresso agregado corresponde aos recebimentos.
- [ ] **T084.06** Executar cenário adversarial: Evento atrasado, entregue sem comprovação e usuário de outro PA não podem encerrar entrega indevida.
- [ ] **T084.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T084.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T084.09** Ensaiar ou revisar contingência: Preservar último estado comprovado e abrir ocorrência para evento contraditório.
- [ ] **T084.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T085 — Concluir avarias, devoluções e cancelamentos

**Prioridade:** P2. **Responsável funcional:** Operação, compras e financeiro. **Estado:** Planejada.
**Dependências:** T004, T052, T084. **Origens:** P118, P119.

**Aceite específico:** Ciclo de ocorrência encerra com resolução verificável e totais reconciliados.

- [ ] **T085.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T085.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T085.03** Criar protocolo por item/destino com responsável, prazo, prova, decisão e vínculo financeiro.
- [ ] **T085.04** Executar revisão, cancelamento parcial, reposição/crédito e reabertura sem apagar o pedido original.
- [ ] **T085.05** Executar cenário positivo: Falta parcial gera reposição ou crédito e reconcilia saldo/logística/verba.
- [ ] **T085.06** Executar cenário adversarial: Cancelar item já recebido ou aprovar crédito duplicado deve exigir regra e alçada corretas.
- [ ] **T085.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T085.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T085.09** Ensaiar ou revisar contingência: Reabrir ocorrência e bloquear compensação subsequente até conciliar divergência.
- [ ] **T085.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T086 — Estruturar campanha e cronograma regressivo

**Prioridade:** P2. **Responsável funcional:** Marketing, compras e logística. **Estado:** Planejada.
**Dependências:** T004, T052, T071. **Origens:** P121, P122.

**Aceite específico:** Campanha liga briefing a orçamento/pedido e exige decisão explícita sobre desvios de prazo.

- [ ] **T086.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T086.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T086.03** Integrar briefing com objetivo, verba, público, marca, destinos, data do evento e responsável.
- [ ] **T086.04** Calcular marcos de arte, aprovação, produção e expedição com dependências e impacto de atraso.
- [ ] **T086.05** Executar cenário positivo: Mudança da data do evento recalcula cronograma e destaca tarefas afetadas.
- [ ] **T086.06** Executar cenário adversarial: Prazo impossível ou fornecedor alterado não pode preservar promessa antiga sem revisão.
- [ ] **T086.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T086.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T086.09** Ensaiar ou revisar contingência: Replanejar campanha e solicitar aceite da nova condição mantendo o plano anterior auditável.
- [ ] **T086.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T087 — Completar ciclo financeiro da verba

**Prioridade:** P2. **Responsável funcional:** Financeiro e backend. **Estado:** Planejada.
**Dependências:** T025, T038, T056, T085. **Origens:** P124.

**Aceite específico:** Livro de eventos explica cada valor; saldos agregados coincidem com consulta independente.

- [ ] **T087.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T087.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T087.03** Modelar planejado, reservado, comprometido, consumido e disponível com eventos reconciliáveis.
- [ ] **T087.04** Relacionar aprovação, pedido, pagamento, estorno e cancelamento ao PA/cooperativa corretos.
- [ ] **T087.05** Executar cenário positivo: Compra parcial e compensação preservam identidade e soma dos saldos.
- [ ] **T087.06** Executar cenário adversarial: Operações concorrentes ou repetidas não podem gastar duas vezes nem liberar saldo de outra unidade.
- [ ] **T087.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T087.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T087.09** Ensaiar ou revisar contingência: Aplicar compensação formal sem editar histórico financeiro nem corrigir saldo manualmente sem trilha.
- [ ] **T087.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T088 — Fechar competências e conciliação financeira

**Prioridade:** P2. **Responsável funcional:** Financeiro e compras. **Estado:** Planejada.
**Dependências:** T004, T056, T075, T084, T085, T087. **Origens:** P125, P126.

**Aceite específico:** Nenhuma competência passada é reescrita silenciosamente; reconciliação identifica cada diferença e decisão.

- [ ] **T088.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T088.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T088.03** Definir virada de mês, fechamento, reabertura autorizada e tratamento de estorno tardio.
- [ ] **T088.04** Conciliar contratado, faturado, recebido, pago e créditos com notas e documentos liberados.
- [ ] **T088.05** Executar cenário positivo: Pedido atravessa duas competências com entregas/pagamentos parciais e fechamento coerente.
- [ ] **T088.06** Executar cenário adversarial: Atualização por PA sem período, nota duplicada e valor acima do contratado devem bloquear ou exigir exceção formal.
- [ ] **T088.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T088.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T088.09** Ensaiar ou revisar contingência: Reabrir competência por alçada ou lançar ajuste na competência permitida conforme política.
- [ ] **T088.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T089 — Ligar auditoria, indicadores e suporte

**Prioridade:** P2. **Responsável funcional:** Operação, compras e financeiro. **Estado:** Planejada.
**Dependências:** T023, T025, T049, T081, T087, T088. **Origens:** P068, P127, P128, P129.

**Aceite específico:** Painel operacional explica números reais e incidentes têm dono, prazo e roteiro de recuperação.

- [ ] **T089.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T089.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T089.03** Conectar views administrativas revisadas ao painel com acesso por autoridade, vazio e erro claros.
- [ ] **T089.04** Consolidar métricas e linha do tempo de orçamento, pedido, campanha, documentos, logística e finanças.
- [ ] **T089.05** Executar cenário positivo: Indicadores e histórico são conferidos com amostra SQL e períodos/fusos definidos.
- [ ] **T089.06** Executar cenário adversarial: Fonte indisponível, soma duplicada e usuário sem escopo não podem exibir dado ilustrativo ou sensível.
- [ ] **T089.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T089.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T089.09** Ensaiar ou revisar contingência: Exibir indisponibilidade e preservar último dado identificado como histórico, sem fingir atualização.
- [ ] **T089.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T090 — Homologar fechamento de campanha distribuída

**Prioridade:** P2. **Responsável funcional:** Operação, compras e financeiro. **Estado:** Planejada.
**Dependências:** T018, T057, T070, T080, T081, T082, T083, T084, T085, T086, T087, T088, T089. **Origens:** P120, P130.

**Aceite específico:** Aceite funcional conjunto de compras, logística e financeiro com cenário reproduzível.

- [ ] **T090.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T090.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T090.03** Executar campanha completa com três destinos, avaria, crédito, revisão de prazo e troca de competência.
- [ ] **T090.04** Conferir alocações, remessas, comprovantes, notas, pagamentos e saldo por unidade.
- [ ] **T090.05** Executar cenário positivo: Campanha encerra com custos e recebimentos reconciliados e responsabilidades registradas.
- [ ] **T090.06** Executar cenário adversarial: Diferença de quantidade ou valor impede fechamento até resolução pela trilha.
- [ ] **T090.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T090.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T090.09** Ensaiar ou revisar contingência: Reabrir fechamento e pendências vinculadas sem apagar aprovações e documentos anteriores.
- [ ] **T090.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

### Fase 10 — Experiência, homologação e operação

**Risco a controlar:** Publicação não equivale a compra concluída nem a aceite de todos os requisitos.

#### T091 — Pesquisar jornadas com compradores e marketing

**Prioridade:** P2. **Responsável funcional:** Pesquisa UX e compradores/marketing. **Estado:** Planejada.
**Dependências:** T004, T005, T060. **Origens:** P131, P140.

**Aceite específico:** Problemas são priorizados e vinculados às etapas responsáveis; pesquisa pública não substitui observação de uso.

- [ ] **T091.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T091.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T091.03** Selecionar participantes autorizados e tarefas representativas de PA, Singular e marketing.
- [ ] **T091.04** Observar descoberta, orçamento, aprovação, arte e recompra; registrar barreiras, frequência e gravidade.
- [ ] **T091.05** Executar cenário positivo: Usuário consegue completar tarefa realista sem explicação técnica do facilitador.
- [ ] **T091.06** Executar cenário adversarial: Tarefa frustrada, interpretação errada de preço e exigência institucional ausente viram requisitos rastreáveis.
- [ ] **T091.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T091.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T091.09** Ensaiar ou revisar contingência: Reformular tarefa e repetir sessão com consentimento, preservando privacidade e evidência necessária.
- [ ] **T091.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T092 — Concluir experiência de loja e identidade visual

**Prioridade:** P2. **Responsável funcional:** Produto, QA e operação. **Estado:** Planejada.
**Dependências:** T040, T045, T060, T070, T071, T091. **Origens:** P132, P133, P134, P135, P136, P140.

**Aceite específico:** Responsáveis de marca e produto aprovam telas/documentos; todas as barreiras críticas observadas têm destino resolvido.

- [ ] **T092.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T092.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T092.03** Refinar navegação, cards, detalhe, carrinho, editor e resumo com foco em solicitar orçamento e comprar.
- [ ] **T092.04** Aplicar identidade validada, conteúdo real e estados de vazio, erro, loading, offline e conflito consistentes.
- [ ] **T092.05** Executar cenário positivo: Comprador encontra item, entende condições e conclui pedido/orçamento mantendo contexto institucional.
- [ ] **T092.06** Executar cenário adversarial: Foto ausente, texto extremo, preço vencido e sessão expirada não geram falsa promessa nem perda de intenção.
- [ ] **T092.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T092.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T092.09** Ensaiar ou revisar contingência: Restaurar interação anterior comprovada e manter correção funcional sem impor redesign não validado.
- [ ] **T092.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T093 — Validar acessibilidade e dispositivos

**Prioridade:** P2. **Responsável funcional:** QA de acessibilidade e frontend. **Estado:** Planejada.
**Dependências:** T018, T057, T080, T090, T092. **Origens:** P137, P138, P140.

**Aceite específico:** Critérios WCAG 2.2 AA aplicáveis têm evidência; falha manual não é anulada por ferramenta automática verde.

- [ ] **T093.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T093.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T093.03** Executar teclado, leitor de tela, foco, contraste, zoom 200/400%, redução de movimento e erros de formulário.
- [ ] **T093.04** Testar jornadas autenticadas em mobile/desktop, teclado virtual e conteúdo extremo com personas autorizadas.
- [ ] **T093.05** Executar cenário positivo: Pessoa consegue concluir compra e aprovação sem mouse com anúncio correto de estados.
- [ ] **T093.06** Executar cenário adversarial: Modal, toast, tabela grande e rotação de tela não prendem foco nem ocultam ação necessária.
- [ ] **T093.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T093.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T093.09** Ensaiar ou revisar contingência: Bloquear componente inacessível para release e aplicar correção mínima preservando funcionalidade.
- [ ] **T093.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T094 — Medir e fechar desempenho por jornada

**Prioridade:** P2. **Responsável funcional:** Produto, QA e operação. **Estado:** Planejada.
**Dependências:** T016, T026, T060, T070, T089, T092. **Origens:** P139, W047.

**Aceite específico:** Como proposta, LCP≤2,5s, INP≤200ms e CLS≤0,1 no percentil75; metas devem ser ratificadas e medidas sem prometer campo inexistente.

- [ ] **T094.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T094.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T094.03** Medir catálogo, editor, kit, aprovação e painéis com cache frio/quente, rede móvel e volume acordado.
- [ ] **T094.04** Tratar consultas lentas, chunks e renderização com metas de UX e custo aprovadas e baseline relativo.
- [ ] **T094.05** Executar cenário positivo: Jornada representativa atende limites medidos com dados e hardware documentados.
- [ ] **T094.06** Executar cenário adversarial: Carga concorrente, conexão lenta e paginação profunda não podem travar operação ou mascarar timeout.
- [ ] **T094.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T094.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T094.09** Ensaiar ou revisar contingência: Reverter otimização regressiva e reduzir recurso custoso mantendo funcionalidade e métricas visíveis.
- [ ] **T094.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T095 — Executar segurança e privacidade integradas

**Prioridade:** P1. **Responsável funcional:** Produto, QA e operação. **Estado:** Planejada.
**Dependências:** T019, T024, T025, T030, T031, T039, T050, T057, T070, T080, T090. **Origens:** P143.

**Aceite específico:** Nenhum achado crítico/alto sem correção; residual tem dono/justificativa e não contraria requisito obrigatório.

- [ ] **T095.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T095.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T095.03** Revisar sessão, RLS, RPC, Storage, SSRF, replay, CSP e minimização de dados no artefato candidato.
- [ ] **T095.04** Conferir headers efetivamente servidos e consumo legítimo das integrações, incluindo negação da falha da etapa 31.
- [ ] **T095.05** Executar cenário positivo: Persona legítima realiza jornada enquanto outra cooperativa não obtém dados ou efeitos.
- [ ] **T095.06** Executar cenário adversarial: Token vencido, acesso por URL/UUID, payload malformado e request repetido são negados de modo consistente.
- [ ] **T095.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T095.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T095.09** Ensaiar ou revisar contingência: Suspender release do módulo e retornar a versão segura conforme contingência ensaiada.
- [ ] **T095.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T096 — Executar regressão e compra sintética integral

**Prioridade:** P1. **Responsável funcional:** Produto, QA e operação. **Estado:** Planejada.
**Dependências:** T013, T014, T018, T020, T040, T045, T050, T057, T070, T080, T090, T091, T092, T093, T094, T095. **Origens:** P142, P145.

**Aceite específico:** Todos os requisitos obrigatórios têm prova atual; skips e exceções não podem substituir homologação crítica.

- [ ] **T096.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T096.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T096.03** Executar unitários, contratos, Deno, SQL, E2E e jornada completa no mesmo candidato publicado em homologação.
- [ ] **T096.04** Percorrer duas cooperativas e três destinos da pesquisa ao financeiro, incluindo retries, conflitos e recuperação.
- [ ] **T096.05** Executar cenário positivo: Compra sintética encerra pela UI e consultas independentes sem ajuste manual fora da trilha.
- [ ] **T096.06** Executar cenário adversarial: Introduzir indisponibilidade de scanner, timeout após commit, revogação e atraso logístico e confirmar recuperação.
- [ ] **T096.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T096.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T096.09** Ensaiar ou revisar contingência: Reabrir etapa de origem do defeito e invalidar somente provas afetadas antes do próximo candidato.
- [ ] **T096.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T097 — Reconciliar e publicar candidato de release

**Prioridade:** P1. **Responsável funcional:** Produto, QA e operação. **Estado:** Planejada.
**Dependências:** T019, T027, T029, T030, T039, T096. **Origens:** P080, P144, W059, W060, W061, W062, W066.

**Aceite específico:** Candidato de construção/homologação está reconciliado e pronto para decisão de lançamento; código no GitHub sozinho não encerra etapa.

- [ ] **T097.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T097.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T097.03** Conferir commits integrados, ledger, funções/ACLs, Edge, artefato frontend, domínios e configuração servida.
- [ ] **T097.04** Aplicar lotes restantes em ordem validada, por pipeline protegido, e registrar manifesto final com contingência.
- [ ] **T097.05** Executar cenário positivo: Mesmo SHA/contrato é reconhecido por código, banco e interface; smoke conectado passa após publicação.
- [ ] **T097.06** Executar cenário adversarial: Drift, migration faltante e domínio apontando para build anterior devem impedir promoção.
- [ ] **T097.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T097.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T097.09** Ensaiar ou revisar contingência: Voltar ao artefato compatível e restaurar/reconciliar banco conforme o lote, sem rollback destrutivo improvisado.
- [ ] **T097.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T098 — Preparar operação e autorizar piloto

**Prioridade:** P1. **Responsável funcional:** Responsável pelo negócio e operação. **Estado:** Planejada.
**Dependências:** T004, T008, T020, T091, T093, T094, T095, T096, T097. **Origens:** P146, W059.

**Aceite específico:** Decisão de piloto registrada com responsáveis e limites; planejamento não autoriza automaticamente produção ou compra real.

- [ ] **T098.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T098.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T098.03** Concluir restore medido, runbooks, suporte, treinamento, políticas, custos e definição do publicador canônico.
- [ ] **T098.04** Submeter pacote de prontidão aos responsáveis e registrar decisão explícita sobre lançamento, escopo e rollback.
- [ ] **T098.05** Executar cenário positivo: Equipe ensaia incidente, escalonamento e recuperação dentro de RTO/RPO aprovados.
- [ ] **T098.06** Executar cenário adversarial: Falta de responsável, credencial, requisito crítico ou orçamento operacional impede liberação.
- [ ] **T098.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T098.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T098.09** Ensaiar ou revisar contingência: Manter sistema em construção e resolver o bloqueio sem simular aceite de negócio.
- [ ] **T098.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T099 — Executar piloto e comprovar operação real

**Prioridade:** P2. **Responsável funcional:** Operação e cooperativas participantes. **Estado:** Planejada.
**Dependências:** T098. **Origens:** P147, P148, P149, W100.

**Aceite específico:** Evidências reais sustentam aceites P147–P149 e janela de estabilidade W100; tempo não decorrido permanece pendente.

- [ ] **T099.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T099.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T099.03** Publicar piloto autorizado, acompanhar primeira compra até recebimento/conciliação e validar segunda cooperativa.
- [ ] **T099.04** Medir incidentes, desempenho, suporte, isolamento e custos por 30 dias com critérios acordados.
- [ ] **T099.05** Executar cenário positivo: Duas operações reais autorizadas encerram com comprovantes e responsáveis confirmando resultado.
- [ ] **T099.06** Executar cenário adversarial: Incidente crítico aciona rollback/contingência; ausência de tráfego real não é contada como sucesso operacional.
- [ ] **T099.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T099.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T099.09** Ensaiar ou revisar contingência: Pausar expansão e corrigir incidentes; repetir janela afetada conforme política registrada.
- [ ] **T099.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

#### T100 — Encerrar requisitos e instituir evolução

**Prioridade:** P2. **Responsável funcional:** Coordenação técnica e responsáveis de negócio. **Estado:** Planejada.
**Dependências:** T001, T002, T003, T004, T005, T006, T007, T008, T009, T010, T011, T012, T013, T014, T015, T016, T017, T018, T019, T020, T021, T022, T023, T024, T025, T026, T027, T028, T029, T030, T031, T032, T033, T034, T035, T036, T037, T038, T039, T040, T041, T042, T043, T044, T045, T046, T047, T048, T049, T050, T051, T052, T053, T054, T055, T056, T057, T058, T059, T060, T061, T062, T063, T064, T065, T066, T067, T068, T069, T070, T071, T072, T073, T074, T075, T076, T077, T078, T079, T080, T081, T082, T083, T084, T085, T086, T087, T088, T089, T090, T091, T092, T093, T094, T095, T096, T097, T098, T099. **Origens:** P006, P010, P150, W100.

**Aceite específico:** Tudo obrigatório implementado, publicado onde aplicável e aceito; sem declarar 100% com função ausente ou parcial.

- [ ] **T100.01** Registrar diagnóstico atual, SHA, ambiente e requisitos de origem; conferir mudanças desde a auditoria.
- [ ] **T100.02** Resolver dependências e decisões desta etapa, nomear executor/revisor e preparar dados autorizados.
- [ ] **T100.03** Conferir a matriz inteira: 100 etapas, 250 origens diretas, 282 etapas históricas, 12 achados e 1.000 subitens com provas e decisões.
- [ ] **T100.04** Publicar termo de aceite, inventário final, backlog residual aprovado, responsáveis e rotina de manutenção.
- [ ] **T100.05** Executar cenário positivo: Amostragem independente reconstrói cada entrega e decisão da origem até produção/homologação aplicável.
- [ ] **T100.06** Executar cenário adversarial: Origem órfã, checklist sem prova, exceção não aprovada ou marco real ausente impedem encerramento.
- [ ] **T100.07** Conferir efeitos em dados, permissões, UI e consumidores aplicáveis; anexar resultado com SHA/data/ambiente.
- [ ] **T100.08** Comprovar publicação/integração no destino aplicável; etapa documental registra artefato aceito. N/A exige justificativa revisada.
- [ ] **T100.09** Ensaiar ou revisar contingência: Reabrir requisitos inconsistentes e manter o plano ativo com prazo e dono; não encerrar por contagem ou nota subjetiva.
- [ ] **T100.10** Revisor verifica o aceite específico e as origens herdadas; preencher evidências e data antes de marcar concluída.

**Registro de fechamento:** executor/revisor nominal, link de commit/PR, SQL/Edge/deploy aplicável, evidências dos cenários, decisão de negócio quando necessária e data. Tudo pendente nesta versão.

## Critério final de encerramento

T100 só termina quando todas as entregas obrigatórias e os marcos aplicáveis tiverem evidência e aceite. Código em branch aberta, migration escrita mas não aplicada, teste ignorado, scanner sem homologação, UI apenas demonstrativa ou compra ainda não realizada permanecem pendentes. Percentual de checklist e nota 10/10 não substituem esses critérios.
