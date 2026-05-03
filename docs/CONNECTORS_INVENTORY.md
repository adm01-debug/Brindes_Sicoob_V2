# Inventário de Conectores e Integrações — Connections Hub

> Painel centralizado em `/admin/conexoes` para gestão de integrações externas.

## 1. Categorias de Conectores

### 🏦 Bancos de Dados
- **Supabase Local:** Instância principal Lovable Cloud.
- **Catálogo Externo:** Ponte para o banco de dados SSOT de produtos e estoque.
- **CRM DB:** Conexão direta com o banco de dados do CRM para sincronização de alto volume.

### 🏢 Bitrix24 / SalesPro
- **API Sync:** Sincronização de orçamentos e pedidos.
- **Contact Sync:** Importação de perfis de clientes e organizações.
- **Webhooks:** Recebimento de atualizações de leads e negócios.

### 🤖 n8n (Automações)
- **Workflow Triggers:** Disparo de fluxos no n8n a partir de eventos do sistema.
- **Data Enrichment:** Chamadas ao n8n para enriquecimento de dados de pedidos.

### 🔌 MCP (Model Context Protocol)
- **MFA Keys:** Chaves de API para Claude/Lovable com auto-revogação.
- **Tools:** Exposição de ferramentas do sistema (estoque, status de pedido) para assistentes de IA.

### 🔗 Webhooks (Omnichannel)
- **Outbound:** Eventos disparados via HMAC-SHA256 (`quote.created`, `order.created`, etc.).
- **Inbound:** Endpoints customizáveis para receber dados de terceiros.

## 2. Infraestrutura Técnica
- **Secrets Manager:** Gestão segura de chaves (máscaras, testes de conexão).
- **Connection Tester:** Edge function dedicada para validar latência e autenticação de cada conector.
- **Webhook Dispatcher:** Retry com backoff exponencial e log exaustivo de entregas.
- **Signature Security:** Assinatura HMAC-SHA256 mandatória em todos os eventos.

## 3. Monitoramento
Métricas de entrega e saúde de cada conector disponíveis no **App Health Dashboard** e via RPC `get_webhook_delivery_summary()`.

---
*Atualizado em 2026-05-03.*
