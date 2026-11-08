# 🗺️ Mapa de Endpoints e Dependências Sicoob

Este mapa descreve quais tabelas e funções do Supabase (RPCs) são consumidas por cada módulo/tela do sistema.

## 📱 Módulo: AccessManagement
**Tabelas (from):**
- `permissions`
- `role_permissions`

## 📱 Módulo: AutoTestIntervalCard
**Funções (rpc):**
- `get_connections_auto_test_interval`

## 📱 Módulo: CategoriesManager
**Tabelas (from):**
- `product_categories`

## 📱 Módulo: ConnectionErrorDetailsDialog
**Tabelas (from):**
- `external_connections`

## 📱 Módulo: CouponManager
**Tabelas (from):**
- `coupons`

## 📱 Módulo: FailureWindowCard
**Funções (rpc):**
- `get_connection_failure_window_minutes`

## 📱 Módulo: InboundEventsPanel
**Tabelas (from):**
- `inbound_webhook_endpoints`

## 📱 Módulo: IntegrationsHealthCard
**Tabelas (from):**
- `connection_test_history`
- `external_connections`
- `mcp_api_keys`
- `outbound_webhooks`
- `secret_rotation_log`
- `webhook_deliveries`

## 📱 Módulo: McpTab
**Tabelas (from):**
- `mcp_api_keys`

## 📱 Módulo: MockupPromptManager
**Tabelas (from):**
- `mockup_prompt_configs`
- `mockup_prompt_history`

## 📱 Módulo: OrdersHeatmap
**Tabelas (from):**
- `orders`

## 📱 Módulo: ProductMarketingSection
**Tabelas (from):**
- `catalog_product_marketing`

## 📱 Módulo: ProductPersonalizationManager
**Tabelas (from):**
- `product_components`

## 📱 Módulo: WebhooksTab
**Tabelas (from):**
- `inbound_webhook_endpoints`
- `outbound_webhooks`

## 📱 Módulo: useProductVideoGallery
**Tabelas (from):**
- `video_variant_links`

## 📱 Módulo: usePulseBarStatus
**Tabelas (from):**
- `connection_test_history`
- `external_connections`
- `outbound_webhooks`
- `secret_rotation_log`
- `webhook_deliveries`

