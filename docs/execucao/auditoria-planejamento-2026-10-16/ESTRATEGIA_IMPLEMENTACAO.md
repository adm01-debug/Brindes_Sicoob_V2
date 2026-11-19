# Estratégia vigente para concluir a implementação

**Referências:** base funcional `495f33da1759a7c6e479259419186c5f7076ca5a` e complemento do worker `0e1fc9ebad2d638a4198de354a3604d278ce6ec8`. **Regra de conclusão:** pronto exige fluxo conectado, autorização no servidor, persistência correta, CI verde e aceite no ambiente alvo.

## Ordem obrigatória

### Lote 0 — integrar com segurança

1. Concluir CI e integração do SHA de referência.
2. Preservar o contrato já aplicado do worker de aprovação, incluindo a validação semântica do `ORDER BY` e o monitoramento sem duplicidade.
3. Consolidar atualizações de Actions/CodeQL em um único PR e fechar PRs Dependabot substituídas.
4. Publicar esta curadoria e encerrar a PR #105 como substituída.

### Lote 1 — fechar o P0 G06

1. Escolher e provisionar o scanner antimalware autorizado.
2. Cadastrar URL/token somente no runtime privado; nunca no frontend ou repositório.
3. Validar veredito associado ao SHA-256, MIME detectado e finalidade.
4. Aplicar o mesmo gate a documentos financeiros, comprovantes e arte por item/versão.
5. Cobrir arquivo limpo, malware, timeout, 5xx, resposta inválida, hash divergente, MIME falso e repetição.
6. Confirmar remoção compensatória de quarentena/final em cada falha.
7. Testar papéis, outra cooperativa, pedido inexistente e sessão expirada.
8. Registrar versão da Edge, migrations, segredos presentes apenas por nome e resultado do smoke.

**Saída:** zero caminho libera arquivo sem veredito limpo e verificável; smoke conectado aprovado; logs/alertas permitem investigação; G06 muda de P0 aberto para homologado.

### Lote 2 — homologar G01–G05

Executar com personas de duas cooperativas a jornada orçamento → aprovação → pedido, incluindo usuário inativo, outro PA, repetição, concorrência, rollback e troca de sessão. Confirmar que o endpoint legado de e-mail não confirma conta e que o fluxo padrão cobre expiração/replay.

### Lote 3 — serviços operacionais

- G07: publicar somente tabelas Realtime necessárias e provar isolamento.
- G08: observar uma janela sem duplicidade e alertar falha de cron/inserção.
- G09: homologar e-mail transacional com recibo, retry e destinatário controlado.
- G15/G47: resolver segredo do provedor e decisão DPO/jurídico antes de usar CRM em IA.

### Lote 4 — jornadas comerciais

Revalidar catálogo, filtros, seleção, kits, recompra, arte, distribuição, recebimento e financeiro por jornada. Cada lote deve fechar uma frente com testes positivo, negativo, repetição, concorrência e falha parcial. A matriz de 100 etapas é o índice de aceite, não uma contagem de progresso.

### Lote 5 — piloto

Executar jornada integral em duas cooperativas com compradores e marketing, registrar evidências operacionais, acompanhar estabilidade e obter aceite nominal. Sem isso, o sistema permanece em construção.

## Governança de cada PR

1. Uma mudança coerente por PR e worktree isolado.
2. Diagnóstico reproduzível antes do patch.
3. Migration nova e imutável; nunca editar migration aplicada.
4. Simulação descartável antes do banco canônico.
5. CI completa e revisão independente.
6. Aplicação serial no canônico, seguida de leitura de verificação.
7. Deploy de Edge/frontend na ordem compatível.
8. Smoke conectado e rollback/contingência documentados.
9. Atualização de `achados-consolidados.json` e `matriz-100-etapas.json` com evidência.
10. Encerramento somente depois do aceite definido.

## Critério anti-retrabalho

Priorize contratos compartilhados e bloqueios P0 antes de telas. Não replique snapshots do banco em docs: registre consulta, data, resultado agregado e caminho reproduzível. Não incorpore cópias SQL de funções vivas; a migration cumulativa é a fonte de verdade. Não trate teste ignorado, componente sem rota ou segredo ausente como funcionalidade pronta.
