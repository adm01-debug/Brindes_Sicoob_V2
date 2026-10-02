# Backend e Supabase: aprovação pública — 22/09/2026

Ambiente de construção, projeto `cfmzkthhgliqelozlmwu`, base Git `0972d00d1`.
Este lote corrige o fluxo público de aprovação de orçamento e verifica sua
aplicação no banco. Não conclui o plano de 50 etapas nem certifica todos os
módulos. O catálogo externo `doufsxqlfjyuvxuezpln` não recebeu alterações.

## Diagnóstico confirmado

1. A interface emitia token com status `pending`, rejeitado pelo trigger real.
   A revogação com `revoked` também não era aceita pelo validador antigo.
2. A página pública tentava ler `quotes` diretamente como visitante, apesar da
   RLS; interpretava resposta RPC `false` como sucesso.
3. A RPC aplicada no banco alterava o token, mas não o orçamento. A Edge Function
   fazia atualizações separadas, sem garantir validade e atomicidade da resposta.
4. A assinatura desenhada era descartada. A gravação posterior de metadados
   dependia de uma atualização direta indisponível ao visitante.
5. A emissão de tokens não verificava o vínculo entre orçamento e vendedor.
   A RPC legada retornava o tipo inteiro do token, incluindo campos privados.
6. Um trigger incrementava a versão comercial em qualquer atualização de
   orçamento. O controle separado `row_version` já atendia à revisão da linha.
7. A suíte completa revelou um temporizador de atualização da tela de conexões
   sobrevivendo à desmontagem. O componente agora cancela esse temporizador e
   ignora efeitos de uma invalidação encerrada depois da desmontagem.

Os quatro defeitos centrais de emissão, titularidade, versionamento e falta de
atualização do orçamento foram reproduzidos antes da migration no PostgreSQL
descartável. A fixture reproduz os contratos necessários; não é um clone integral
de todos os triggers e integrações do projeto remoto.

## Checklist deste lote

- [x] Mapear as dependências do backend com Graphify (`graphify-out/README.md`, artefato local gerado por `graphify update .` — não versionado).
- [x] Consultar funções, triggers, políticas e estado real antes do patch.
- [x] Restringir emissão de token ao orçamento vigente e ao vendedor correspondente.
- [x] Impedir troca de destino/titular e falsificação direta de resposta pelo cliente.
- [x] Retornar uma projeção pública mínima, sem custos, margens, CPF/CNPJ ou assinatura.
- [x] Gravar resposta, orçamento, assinatura e histórico numa única transação.
- [x] Serializar respostas de links iguais ou distintos para o mesmo orçamento.
- [x] Reavaliar a expiração depois da espera pelo bloqueio da linha.
- [x] Recusar token expirado/revogado/respondido e orçamento obsoleto ou vencido.
- [x] Preservar a versão comercial e o trigger de revisão `row_version`.
- [x] Corrigir a interface para confirmar somente o retorno booleano `true`.
- [x] Adaptar a Edge Function ao mesmo contrato transacional.
- [x] Simular rollback por falha na gravação do histórico.
- [x] Executar dry-run remoto com rollback antes da aplicação.
- [x] Aplicar `20260922200000` e comparar o SQL local com o ledger remoto.
- [x] Confirmar zero violações no gate ACL e execução interna negada a `anon`.
- [x] Testar as três RPCs via PostgREST com chave publicável e token inexistente.
- [x] Atualizar tipos e inventário incremental das RPCs verificadas.
- [x] Incluir testes de aprovação e simulação PostgreSQL no workflow.
- [ ] Publicar e comparar a Edge Function `quote-approval` no Supabase.
- [ ] Validar uma jornada de negócio completa com atores reais e entregas autorizadas.
- [ ] Concluir CI remoto e revisão do PR antes de considerar o lote integrado.

## Evidências

- [Simulação PostgreSQL: 30 cenários](evidencias/backend-aprovacao-publica-20260922/simulacao.json).
- [Verificação SQL remota e hash da migration](evidencias/backend-aprovacao-publica-20260922/banco.json).
- [Verificação da API pública real](evidencias/backend-aprovacao-publica-20260922/postgrest.json).

O banco ficou com 43 versões no ledger; o SQL desta migration coincide exatamente
com o arquivo local. A tabela de tokens tinha zero registros na verificação.
Nenhum orçamento real foi respondido: os triggers existentes podem acionar
webhooks, e não houve envio de e-mail ou Slack nesta execução.

A aplicação remota foi confirmada antes de uma tentativa de verificação em
transação `READ ONLY` falhar: a RPC usa `SELECT FOR UPDATE`. A verificação foi
refeita em transação comum com rollback e token inexistente. Não houve reaplicação
indiscriminada nem interpretação desse erro como sucesso de teste.

As três chamadas PostgREST retornaram HTTP 200: consulta `null` e respostas
booleana/assinada `false`, como esperado para token inexistente. Isso confirma
exposição das RPCs e recusa do token; não substitui um aceite real completo.

## Validação local

| Verificação | Resultado |
|---|---|
| PostgreSQL 16 descartável sem rede | 30/30 cenários aprovados |
| Cenários Node | 151/151 aprovados, incluindo 7 da Edge Function de aprovação |
| Vitest completo | 370 arquivos e 5.439 testes aprovados; 9 arquivos e 113 testes ignorados |
| Contrato de emissão de token | Teste reforçado após a suíte completa; 5/5 testes do hook aprovados |
| Deno | `quote-approval` aprovada |
| Build Vite | Aprovado |
| Typecheck baseline | 653 erros globais, iguais à referência; sem regressão |
| ESLint baseline | 3.341 erros globais, redução de 1; sem regressão nos 6 arquivos de aplicação analisados |
| Referências ao banco | 1.119 chamadas analisadas; zero referências quebradas fora da lista de exceções |
| Gates de Edge Functions | 103 contratos de autorização; 24 funções instrumentadas, 78 legadas e 1 stub inerte |

A primeira execução completa do Vitest falhou por erro assíncrono no temporizador
de conexões. O defeito foi corrigido e coberto por dois testes de desmontagem;
a repetição completa terminou com código de saída zero. Os baselines de tipos e
lint permitem dívida existente: a passagem desses gates não significa zero erros.

## Limites do contrato

A assinatura é a imagem enviada pelo cliente, com hash SHA-256 e horário do
servidor. A validação verifica formato e tamanho; não certifica identidade,
autenticidade do documento ou validade jurídica. A API legada sem assinatura
continua disponível por compatibilidade e registra uma resposta sem assinatura.
Se o negócio exigir assinatura em todas as aprovações, essa compatibilidade
precisa de uma migração de consumidores e uma regra explícita adicional.

A RPC de consulta usa posse do token como autorização. O rate limiter da Edge
Function não cobre chamadas diretas às RPCs, nem fornece limitação distribuída.
O grafo é estrutural e anterior ao patch; as limitações de extração estão no seu README.

## Pendências do backend após este lote

| Prioridade | Pendência | Evidência necessária para encerrar |
|---|---|---|
| Alta | Publicação e comparação das Edge Functions | Management API com acesso ao projeto; a consulta atual retornou HTTP 403 por privilégios insuficientes |
| Alta | Homologação entre cooperativas e papéis distintos | Jornadas reais de aprovação, logística, financeiro, arte, kits e recompra, com isolamento e auditoria |
| Alta | Catálogo externo somente leitura | Credencial de consulta validada, estoque/preço reais e confirmação de ausência de mutações |
| Alta | Revisão semântica das migrations históricas fora do ledger | Reconciliação por objeto e conteúdo; não aplicar o conjunto histórico em massa |
| Alta | Notificações com e-mail real e entrega idempotente | Integração configurada, outbox e testes de falha parcial/retry sem duplicação |
| Média | Rate limiting distribuído e proteção das RPCs públicas | Testes com múltiplas instâncias e chamadas diretas ao PostgREST |
| Média | Observabilidade das funções legadas | 78 funções ainda na exceção de logging; contratos estáticos não provam cobertura de execução |
| Média | Drift completo de tipos, RLS e Storage | Comparação atualizada e testes por ator; o inventário deste lote é incremental |
| Média | Dívida técnica e CI | Reduzir baseline TypeScript/ESLint e executar checks remotos no SHA final |

O estado anterior e as limitações de autorização/observabilidade permanecem em
[relatório do lote anterior](autorizacao-observabilidade-20260922.md). Os checks
deste documento encerram apenas o escopo explicitamente validado acima.
