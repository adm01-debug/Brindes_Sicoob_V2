# 🗺️ Mapa de Endpoints e Dependências Sicoob

Este mapa descreve quais tabelas e funções do Supabase (RPCs) são consumidas por cada módulo/tela do sistema.

## 📱 Módulo: CustomizableDashboard
**Tabelas (from):**
- `orders`
- `quotes`

## 📱 Módulo: LogisticsReportPage
**Tabelas (from):**
- `orders`
- `order_logistics`

## 📱 Módulo: OrderDetailPage (Sicoob)
**Tabelas (from):**
- `sicoob_orders`
- `sicoob_order_items`
- `sicoob_order_item_logs`
- `sicoob_order_history`
- `sicoob_approval_requests`
- `pa_budgets`
- `order_logistics`
- `order_invoices`
- `order_payments`
- `order_pilot_approvals`
- `order_audit_events`
- `order_comments`
- `order_templates`
- `order_template_items`
- `profiles`
- `categories` (via external-db)
- `products` (via external-db)

## 📱 Módulo: OrdersPage (Sicoob)
**Tabelas (from):**
- `sicoob_orders` (A ser migrado de Mock para real)

## 📱 Módulo: Global Hooks / Services
**Tabelas (from):**
- `access_blocked_log`
- `access_security_settings`
- `admin_audit_log`
- `audit_log`
- `cart_templates`
- `city_whitelist`
- `collection_items`
- `collections`
- `favorite_items`
- `favorite_items_trash`
- `favorite_lists`
- `generated_mockups`
- `ip_whitelist`
- `kit_collaborators`
- `kit_comments`
- `kit_templates`
- `kit_variants`
- `login_attempts`
- `magic_up_brand_kits`
- `magic_up_campaigns`
- `magic_up_generations`
- `order_items`
- `orders`
- `personalization_simulations`
- `personalization_techniques`
- `products`
- `profiles`
- `quote_comments`
- `quote_history`
- `quote_item_personalizations`
- `quote_items`
- `quote_templates`
- `quotes`
- `sales_goals`
- `seller_cart_items`
- `user_passkeys`
- `user_preferences`
- `video_variant_links`
- `voice_command_logs`
- `workspace_notifications`

## 📱 Módulo: KitBuilderPage
**Tabelas (from):**
- `custom_kits`
- `kit_templates`

## 📱 Módulo: KitLibraryPage
**Tabelas (from):**
- `custom_kits`

## 📱 Módulo: MockupHistoryPage
**Tabelas (from):**
- `generated_mockups`

## 📱 Módulo: OrderDetailPage
**Tabelas (from):**
- `order_items`
- `orders`

## 📱 Módulo: PermissionsPage
**Tabelas (from):**
- `permissions`

## 📱 Módulo: ProductDetail
**Tabelas (from):**
- `product_views`

## 📱 Módulo: QuoteDetailPage
**Tabelas (from):**
- `quotes`

## 📱 Módulo: QuoteViewPage
**Tabelas (from):**
- `quotes`

## 📱 Módulo: RolePermissionsPage
**Tabelas (from):**
- `permissions`
- `role_permissions`

## 📱 Módulo: RolesPage
**Tabelas (from):**
- `roles`

## 📱 Módulo: SystemStatusPage
**Tabelas (from):**
- `profiles`

## 📱 Módulo: admin
**Tabelas (from):**
- `bot_detection_log`
- `cooperativas`
- `ip_access_control`
- `postos_atendimento`
- `query_telemetry`
- `request_rate_limits`
**Funções (rpc):**
- `check_telemetry_regression`

## 📱 Módulo: quote-view
**Tabelas (from):**
- `quotes`

## 📱 Módulo: quotes-dashboard
**Tabelas (from):**
- `quote_approval_tokens`


