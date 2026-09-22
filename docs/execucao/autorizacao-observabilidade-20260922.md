# Continuação de autorização, observabilidade e ACL — 22/09/2026

Ambiente de construção. Base `965082e97` de `origin/main`, que incorporou o PR
#16. Execução em worktree próprio; alterações de outros trabalhos preservadas.
Este lote não conclui o plano inteiro nem certifica implantação das Edge Functions.

## Cenários anteriores às correções

- O autorizador real foi executado em VM com transporte simulado. Os novos casos
  reproduziram 12 falhas: aliases/hierarquia negados pela RPC e fallback que
  aceitava `data: true` mesmo acompanhado de erro. Após a correção: 43/43 casos.
- O gate SQL anterior não considerava `proacl IS NULL` nem permissões herdadas,
  e aprovava sobrecargas pelo nome. Onze cenários PostgreSQL isolados exercitam
  essas condições, revogação, reaplicação, rollback e execução por papel.
- O webhook de notificações não validava credencial de serviço, ignorava erros
  de consulta/entrega e simulava e-mail com `console.log`. Testes reproduzem os
  contratos corrigidos sem enviar mensagens ou acessar integrações reais.

## Checklist executado

- [x] Revalidar na RPC os papéis reais que concedem acesso, incluindo aliases.
- [x] Recusar revalidação com erro, mesmo quando a resposta contém `data: true`.
- [x] Restringir o webhook a credencial de serviço exata antes do acesso ao banco.
- [x] Aceitar envelopes nativo e legado; reconsultar a solicitação no banco.
- [x] Validar destinos Slack, impedir redirects e limitar tempo de entrega.
- [x] Retornar erro de canal não implementado, consulta ou entrega sem sucesso fictício.
- [x] Instrumentar sete funções, inclusive respostas antecipadas e exceções.
- [x] Testar preservação de status, corpo, CORS e correlação, sem logs de corpo/token.
- [x] Usar AST nos gates para rejeitar comentários/imports isolados/exemplos textuais.
- [x] Remover cinco funções já instrumentadas da exceção legada de logging.
- [x] Preservar `migrate-helper` inerte, com exceção vinculada ao hash do código revisado.
- [x] Simular nova migration em PostgreSQL descartável sem rede.
- [x] Executar dry-run remoto e confirmar rollback antes da aplicação.
- [x] Aplicar migration `20260922190000` e registrar SQL exato no ledger remoto.
- [x] Introduzir sobrecarga temporária, detectar a violação e removê-la por rollback.
- [x] Confirmar estado final: zero violações ACL, sem sobrecarga de teste e ledger exato.
- [x] Incluir cenários, gate de logging, Deno e simulação SQL no workflow de qualidade.
- [ ] Publicar as Edge Functions e comparar o código remoto com este lote.
- [ ] Homologar as jornadas reais com usuários de cooperativas distintas.
- [ ] Executar CI remoto no SHA final; orçamento do Actions bloqueava o lote anterior.

## Evidências e validação

[Evidência SQL remota](evidencias/autorizacao-observabilidade-20260922/acl-remota.json)
e [simulação PostgreSQL](evidencias/autorizacao-observabilidade-20260922/acl-simulacao.json).
A captura remota contém resultados, horários e hash; não inclui credenciais.
O ledger tem 42 versões após a aplicação. Nenhuma das 468 migrations classificadas
como fora do ledger foi aplicada indiscriminadamente neste lote.

| Validação | Resultado |
|---|---|
| Autorização comportamental | 43 testes; 12 falhavam antes do patch |
| Logging e gate AST | 16 cenários |
| Webhook de aprovação | 14 cenários com transporte simulado |
| Gate de autorização AST | 8 cenários |
| Vitest completo | 369 arquivos aprovados, 9 ignorados; 5.435 testes aprovados, 113 ignorados |
| Build Vite | Aprovado |
| Typecheck baseline | 653 erros globais, iguais à baseline; sem regressão |
| Lint baseline | 3.342 erros globais; nenhum arquivo de aplicação `src` alterado neste lote |
| Deno | Oito entradas/helper alterados aprovados |
| Referências estáticas | 1.120 chamadas; zero referências quebradas |
| Gate de logging | 103 funções: 24 instrumentadas, 78 legadas e 1 stub inerte revisado |
| Banco descartável | 11/11 cenários ACL |
| Banco de construção | Dry-run revertido, aplicação exata, mutação detectada e removida; zero violações finais |

Os gates AST detectam estruturas de código, não provam todos os caminhos de
execução. A auditoria ACL mede EXECUTE; não comprova autorização dos argumentos
nem isolamento entre cooperativas. A instrumentação usa o wrapper compartilhado
para preservar retornos existentes e não grava corpos, tokens ou mensagens de
exceção potencialmente sensíveis.

## Pendências que permanecem

- Publicação e comparação das Edge Functions: a conexão administrativa disponível
  permite SQL, mas a última verificação não tinha token da Management API. As
  três funções Sicoob ausentes na coleta anterior continuam sem prova de publicação.
- Catálogo: credencial completa de consulta ainda não validada. O banco externo
  permanece somente leitura; controles legados de edição exigem adaptação local.
- Notificações: e-mail exige integração real. O endpoint agora responde 501 se há
  canal sem implementação/configuração. Entregas a múltiplos destinos ainda não
  têm outbox/idempotência: uma falha após entrega parcial pode duplicar mensagens
  em um retry. Não foi enviado Slack nem e-mail nesta execução.
- Observabilidade: 78 funções permanecem na exceção legada; a passagem do gate
  não significa que todas tenham logging estruturado.
- Plano amplo: revisão semântica das migrations históricas, concorrência entre
  sessões, testes de RLS por ator, storage, arte, kits, recompra e integrações
  ainda exigem conclusão. A reconciliação das 50 etapas está no relatório vinculado.
