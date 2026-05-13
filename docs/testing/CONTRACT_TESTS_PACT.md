# 🤝 Testes de Contrato: Pact (Consumer-Driven Contracts)

Este documento detalha o plano para implementar testes de contrato entre o frontend/app e os webhooks do n8n, garantindo que mudanças em um não quebrem o outro.

## Objetivo
Evitar erros de "schema mismatch" onde o n8n muda o formato do JSON enviado e o frontend para de processar corretamente.

## Ferramenta
**Pact.io** (pact-js).

## Arquitetura Proposta

1. **Consumer (Frontend)**: 
   - Define as expectativas (ex: "espero que o webhook de sync envie `deal_id`, `status` e `items`").
   - Gera um arquivo `pact.json` durante os testes unitários.
   - Publica o pact em um **Pact Broker** (ex: PactFlow).

2. **Provider (n8n/Edge)**:
   - Lê o pact do Broker.
   - Verifica se a sua implementação atende às expectativas do Consumer.
   - Se falhar, o deploy é bloqueado.

## Exemplo de Teste (Roadmap)

```typescript
import { PactV3 } from '@pact-foundation/pact';

const provider = new PactV3({
  consumer: 'PromoGiftsApp',
  provider: 'N8N-Sync-Webhook',
});

it('deve processar corretamente o payload de sync de orçamento', async () => {
  provider
    .given('um orçamento atualizado no Bitrix')
    .uponReceiving('um webhook de sincronização')
    .withRequest({
      method: 'POST',
      path: '/webhook/sync',
    })
    .willRespondWith({
      status: 200,
      body: {
        success: true,
        quote_id: Matchers.uuid(),
        status: Matchers.regex('approved|rejected', 'approved'),
      },
    });

  await provider.executeTest(async (mockServer) => {
    const result = await callSyncWebhook(mockServer.url);
    expect(result.success).toBe(true);
  });
});
```

## Próximos Passos
1. Instalar `@pact-foundation/pact` como devDependency.
2. Configurar Pact Broker (docker-compose ou cloud).
3. Adicionar step `test:contract` no `ci.yml`.
