# 07 · REGRAS DE NEGÓCIO

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `269e7afa79` · branch `main` · 2026-11-26 18:23 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## A. Regras escritas por humanos (`manual/` — prioridade máxima, nunca sobrescrito)

_Nenhum arquivo em `manual/`. Copie `manual/TEMPLATE-regras-de-negocio.md` para `manual/regras.md` e preencha._

## B. Quem pode ver/alterar o quê (RLS — conforme migrations do repo; schema real em `06`)

| Tabela | Política | Comando | Roles | Modo | USING | WITH CHECK |
|---|---|---|---|---|---|---|
| `notifications` | Users can delete own notifications | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `entity_versions` | Users can view versions | SELECT | public | permissive | `true` |  |
| `entity_versions` | Users can insert versions | INSERT | public | permissive |  | `auth.uid() = changed_by OR changed_by IS NULL` |
| `categories` | Allow all | ALL | public | permissive | `true` |  |
| `suppliers` | Allow all | ALL | public | permissive | `true` |  |
| `products` | Allow all | ALL | public | permissive | `true` |  |
| `quotes` | Allow all | ALL | public | permissive | `true` |  |
| `profiles` | Users can view their own profile | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `profiles` | Users can update their own profile | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `profiles` | Users can insert their own profile | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `profiles` | Admins can update all profiles | UPDATE | public | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `storage.objects` | Public can view avatars | SELECT | public | permissive | `bucket_id = 'avatars'` |  |
| `bitrix_clients` | Authenticated users can view clients | SELECT | authenticated | permissive | `true` |  |
| `bitrix_deals` | Authenticated users can view deals | SELECT | authenticated | permissive | `true` |  |
| `bitrix_sync_logs` | Authenticated users can view sync logs | SELECT | authenticated | permissive | `true` |  |
| `bitrix_clients` | Service can manage clients | ALL | public | permissive | `true` | `true` |
| `bitrix_deals` | Service can manage deals | ALL | public | permissive | `true` | `true` |
| `bitrix_sync_logs` | Service can manage sync logs | ALL | public | permissive | `true` | `true` |
| `personalization_techniques` | Authenticated users can view techniques | SELECT | authenticated | permissive | `true` |  |
| `personalization_techniques` | Admins can manage techniques | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'admin')` |
| `quotes` | Sellers can view their own quotes | SELECT | authenticated | permissive | `seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')` |  |
| `quotes` | Sellers can create quotes | INSERT | authenticated | permissive |  | `seller_id = auth.uid()` |
| `quotes` | Sellers can update their own quotes | UPDATE | authenticated | permissive | `seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')` |  |
| `quote_items` | Users can view items of accessible quotes | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) )` |  |
| `quote_items` | Users can manage items of their quotes | ALL | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) )` | `EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) )` |
| `quote_item_personalizations` | Users can view personalizations of accessible items | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) )` |  |
| `quote_item_personalizations` | Users can manage personalizations of their items | ALL | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) )` | `EXISTS ( SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_id AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) )` |
| `products` | Authenticated users can view products | SELECT | authenticated | permissive | `is_active = true` |  |
| `products` | Admins can view all products | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `products` | Service can manage products | ALL | service_role | permissive | `true` | `true` |
| `product_sync_logs` | Admins can view sync logs | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `product_sync_logs` | Service can manage sync logs | ALL | service_role | permissive | `true` | `true` |
| `personalization_locations` | Authenticated users can view locations | SELECT | authenticated | permissive | `true` |  |
| `personalization_locations` | Admins can manage locations | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'admin')` |
| `personalization_sizes` | Authenticated users can view sizes | SELECT | authenticated | permissive | `true` |  |
| `personalization_sizes` | Admins can manage sizes | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'admin')` |
| `product_components` | Authenticated users can view components | SELECT | authenticated | permissive | `true` |  |
| `product_component_locations` | Authenticated users can view component locations | SELECT | authenticated | permissive | `true` |  |
| `product_component_locations` | Admins can manage component locations | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'admin')` |
| `product_component_location_techniques` | Authenticated users can view location techniques | SELECT | authenticated | permissive | `true` |  |
| `product_component_location_techniques` | Admins can manage location techniques | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'admin')` |
| `product_groups` | Authenticated users can view groups | SELECT | public | permissive | `true` |  |
| `product_group_members` | Authenticated users can view group members | SELECT | public | permissive | `true` |  |
| `product_group_members` | Admins can manage group members | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `product_group_components` | Authenticated users can view group components | SELECT | public | permissive | `true` |  |
| `product_group_components` | Admins can manage group components | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `product_group_locations` | Authenticated users can view group locations | SELECT | public | permissive | `true` |  |
| `product_group_locations` | Admins can manage group locations | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `product_group_location_techniques` | Authenticated users can view group location techniques | SELECT | public | permissive | `true` |  |
| `product_group_location_techniques` | Admins can manage group location techniques | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `storage.objects` | Anyone can view personalization images | SELECT | public | permissive | `bucket_id = 'personalization-images'` |  |
| `storage.objects` | Admins can upload personalization images | INSERT | public | permissive |  | `bucket_id = 'personalization-images' AND has_role(auth.uid(), 'admin'::app_role)` |
| `storage.objects` | Admins can update personalization images | UPDATE | public | permissive | `bucket_id = 'personalization-images' AND has_role(auth.uid(), 'admin'::app_role)` |  |
| `personalization_simulations` | Sellers can view their own simulations | SELECT | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `personalization_simulations` | Sellers can create their own simulations | INSERT | public | permissive |  | `seller_id = auth.uid()` |
| `personalization_simulations` | Sellers can update their own simulations | UPDATE | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `personalization_simulations` | Sellers can delete their own simulations | DELETE | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `expert_conversations` | Sellers can view their own conversations | SELECT | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin')` |  |
| `expert_conversations` | Sellers can create their own conversations | INSERT | public | permissive |  | `seller_id = auth.uid()` |
| `expert_conversations` | Sellers can update their own conversations | UPDATE | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin')` |  |
| `expert_conversations` | Sellers can delete their own conversations | DELETE | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin')` |  |
| `expert_messages` | Sellers can view messages of their conversations | SELECT | public | permissive | `EXISTS ( SELECT 1 FROM public.expert_conversations c WHERE c.id = expert_messages.conversation_id AND (c.seller_id = auth.uid() OR has_role(auth.uid(), 'admin')) )` |  |
| `expert_messages` | Sellers can create messages in their conversations | INSERT | public | permissive |  | `EXISTS ( SELECT 1 FROM public.expert_conversations c WHERE c.id = expert_messages.conversation_id AND c.seller_id = auth.uid() )` |
| `generated_mockups` | Sellers can view their own mockups | SELECT | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `generated_mockups` | Sellers can create their own mockups | INSERT | public | permissive |  | `seller_id = auth.uid()` |
| `generated_mockups` | Sellers can delete their own mockups | DELETE | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `seller_gamification` | Users can view their own gamification | SELECT | public | permissive | `auth.uid() = user_id OR has_role(auth.uid(), 'admin')` |  |
| `seller_gamification` | Users can update their own gamification | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `seller_gamification` | System can insert gamification | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `achievements` | Anyone can view achievements | SELECT | public | permissive | `is_active = true` |  |
| `achievements` | Admins can manage achievements | ALL | public | permissive | `has_role(auth.uid(), 'admin')` | `has_role(auth.uid(), 'admin')` |
| `seller_achievements` | Users can view their own achievements | SELECT | public | permissive | `auth.uid() = user_id OR has_role(auth.uid(), 'admin')` |  |
| `seller_achievements` | Users can earn achievements | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `product_views` | Sellers can create their own views | INSERT | public | permissive |  | `seller_id = auth.uid()` |
| `product_views` | Admins can view all product views | SELECT | public | permissive | `has_role(auth.uid(), 'admin')` |  |
| `product_views` | Sellers can view their own views | SELECT | public | permissive | `seller_id = auth.uid()` |  |
| `quote_templates` | Sellers can view their own templates | SELECT | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `quote_templates` | Sellers can create their own templates | INSERT | public | permissive |  | `seller_id = auth.uid()` |
| `quote_templates` | Sellers can update their own templates | UPDATE | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `quote_templates` | Sellers can delete their own templates | DELETE | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `quote_history` | Users can view history of their quotes | SELECT | public | permissive | `EXISTS ( SELECT 1 FROM quotes q WHERE q.id = quote_history.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)) )` |  |
| `quote_history` | Users can create history for their quotes | INSERT | public | permissive |  | `EXISTS ( SELECT 1 FROM quotes q WHERE q.id = quote_history.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)) )` |
| `quote_approval_tokens` | Users can view tokens for their quotes | SELECT | public | permissive | `EXISTS ( SELECT 1 FROM quotes q WHERE q.id = quote_approval_tokens.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)) )` |  |
| `quote_approval_tokens` | Users can create tokens for their quotes | INSERT | public | permissive |  | `EXISTS ( SELECT 1 FROM quotes q WHERE q.id = quote_approval_tokens.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)) )` |
| `quote_approval_tokens` | Service can manage tokens | ALL | public | permissive | `true` | `true` |
| `notifications` | Service can create notifications | INSERT | public | permissive |  | `true` |
| `notifications` | Users can delete their own notifications | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `orders` | Sellers can view their own orders | SELECT | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `orders` | Sellers can create orders | INSERT | public | permissive |  | `seller_id = auth.uid()` |
| `orders` | Sellers can update their own orders | UPDATE | public | permissive | `seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `orders` | Admins can delete orders | DELETE | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `order_items` | Users can view items of their orders | SELECT | public | permissive | `EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)) )` |  |
| `order_items` | Users can manage items of their orders | ALL | public | permissive | `EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)) )` | `EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)) )` |
| `order_history` | Users can view history of their orders | SELECT | public | permissive | `EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_history.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)) )` |  |
| `order_history` | Users can create history for their orders | INSERT | public | permissive |  | `EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_history.order_id AND (o.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)) )` |
| `sales_goals` | Users can view their own goals | SELECT | public | permissive | `user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `sales_goals` | Users can create their own goals | INSERT | public | permissive |  | `user_id = auth.uid()` |
| `sales_goals` | Users can update their own goals | UPDATE | public | permissive | `user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `sales_goals` | Users can delete their own goals | DELETE | public | permissive | `user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `follow_up_reminders` | Users can view their own reminders | SELECT | public | permissive | `user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `follow_up_reminders` | Users can create their own reminders | INSERT | public | permissive |  | `user_id = auth.uid()` |
| `follow_up_reminders` | Users can update their own reminders | UPDATE | public | permissive | `user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `follow_up_reminders` | Users can delete their own reminders | DELETE | public | permissive | `user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `push_subscriptions` | Users can manage own subscriptions | ALL | public | permissive | `auth.uid() = user_id` |  |
| `audit_log` | Admins can view all audit logs | SELECT | public | permissive | `EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' )` |  |
| `audit_log` | Users can view own audit logs | SELECT | public | permissive | `user_id = auth.uid()` |  |
| `sync_jobs` | Users can view own jobs | SELECT | public | permissive | `auth.uid() = created_by` |  |
| `quote_comments` | Users can view comments on accessible quotes | SELECT | public | permissive | `EXISTS ( SELECT 1 FROM quotes WHERE quotes.id = quote_comments.quote_id AND (quotes.sales_rep_id = auth.uid() OR quotes.created_by = auth.uid()) )` |  |
| `quote_comments` | Users can create comments | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `user_filter_presets` | Users manage own filters | ALL | public | permissive | `auth.uid() = user_id` |  |
| `store_rewards` | Anyone authenticated can view active rewards | SELECT | public | permissive | `auth.uid() IS NOT NULL AND is_active = true` |  |
| `user_rewards` | Users can view their own rewards | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `user_rewards` | Users can purchase rewards | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `user_rewards` | Users can update their own rewards | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `user_onboarding` | Users can create their own onboarding | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `user_onboarding` | Users can update their own onboarding | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `analytics_events` | Users can view analytics_events | SELECT | public | permissive | `true` |  |
| `audit_trail` | Users can view audit_trail | SELECT | public | permissive | `true` |  |
| `cache_entries` | Users can view cache_entries | SELECT | public | permissive | `true` |  |
| `feature_flags` | Users can view feature_flags | SELECT | public | permissive | `true` |  |
| `optimization_logs` | Users can view optimization_logs | SELECT | public | permissive | `true` |  |
| `rate_limits` | Users can view rate_limits | SELECT | public | permissive | `true` |  |
| `redis_config` | Users can view redis_config | SELECT | public | permissive | `true` |  |
| `template_versions` | Users can view template_versions | SELECT | public | permissive | `true` |  |
| `two_factor_secrets` | Users can view two_factor_secrets | SELECT | public | permissive | `true` |  |
| `websocket_sessions` | Users can view websocket_sessions | SELECT | public | permissive | `true` |  |
| `roles` | Roles are viewable by authenticated users | SELECT | public | permissive | `auth.role() = 'authenticated'` |  |
| `password_reset_requests` | Anyone can create password reset request | INSERT | public | permissive |  | `true` |
| `user_2fa_settings` | Users can view their own 2FA settings | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `user_2fa_settings` | Users can manage their own 2FA settings | ALL | public | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `user_allowed_ips` | Users can view their own allowed IPs | SELECT | public | permissive | `auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `user_allowed_ips` | Users can manage their own allowed IPs | ALL | public | permissive | `auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)` | `auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)` |
| `login_attempts` | Users can view their own login attempts | SELECT | public | permissive | `auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `login_attempts` | Service can create login attempts | INSERT | public | permissive |  | `true` |
| `user_known_devices` | Users can view their own devices | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `user_known_devices` | Users can insert their own devices | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `user_known_devices` | Users can update their own devices | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `user_known_devices` | Users can delete their own devices | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `device_login_notifications` | Users can view their own notifications | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `device_login_notifications` | System can insert notifications | INSERT | public | permissive |  | `true` |
| `user_passkeys` | Users can view their own passkeys | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `user_passkeys` | Users can create their own passkeys | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `user_passkeys` | Users can update their own passkeys | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `user_passkeys` | Users can delete their own passkeys | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `geo_allowed_countries` | Anyone can view allowed countries | SELECT | public | permissive | `true` |  |
| `geo_allowed_countries` | Admins can manage allowed countries | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `security_settings` | Anyone can view security settings | SELECT | public | permissive | `true` |  |
| `security_settings` | Admins can manage security settings | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `mockup_drafts` | Users can view their own mockup drafts | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `mockup_drafts` | Users can create their own mockup drafts | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `mockup_drafts` | Users can update their own mockup drafts | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `mockup_drafts` | Users can delete their own mockup drafts | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `user_onboarding` | Users can view their own onboarding | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `user_onboarding` | Users can manage their own onboarding | ALL | public | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `companies` | Authenticated users can view companies | SELECT | public | permissive | `true` |  |
| `companies` | Admins can manage companies | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `companies` | Sellers can create companies | INSERT | public | permissive |  | `auth.uid() IS NOT NULL` |
| `companies` | Sellers can update companies | UPDATE | public | permissive | `auth.uid() IS NOT NULL` |  |
| `company_contacts` | Authenticated users can view contacts | SELECT | public | permissive | `true` |  |
| `company_contacts` | Authenticated users can manage contacts | ALL | public | permissive | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` |
| `contact_phones` | Authenticated users can view phones | SELECT | public | permissive | `true` |  |
| `contact_phones` | Authenticated users can manage phones | ALL | public | permissive | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` |
| `contact_emails` | Authenticated users can view emails | SELECT | public | permissive | `true` |  |
| `contact_emails` | Authenticated users can manage emails | ALL | public | permissive | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` |
| `company_addresses` | Authenticated users can view addresses | SELECT | public | permissive | `true` |  |
| `company_addresses` | Authenticated users can manage addresses | ALL | public | permissive | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` |
| `category_icons` | Anyone can view category icons | SELECT | public | permissive | `true` |  |
| `category_icons` | Admins can manage category icons | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `color_groups` | Anyone can view color groups | SELECT | public | permissive | `true` |  |
| `color_variations` | Anyone can view color variations | SELECT | public | permissive | `true` |  |
| `color_nuances` | Anyone can view color nuances | SELECT | public | permissive | `true` |  |
| `color_groups` | Admins can manage color groups | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `color_variations` | Admins can manage color variations | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `color_nuances` | Admins can manage color nuances | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `product_novelties` | Anyone can view novelties | SELECT | public | permissive | `true` |  |
| `product_novelties` | Admins can manage novelties | ALL | public | permissive | `has_role(auth.uid(), 'admin')` | `has_role(auth.uid(), 'admin')` |
| `product_novelties` | Service can manage novelties | ALL | public | permissive | `true` | `true` |
| `audit_log` | Authenticated users can insert audit logs | INSERT | public | permissive |  | `auth.uid() IS NOT NULL` |
| `audit_log` | Admin can view all audit logs | SELECT | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `audit_log` | Users can view their own audit logs | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `roles` | Admins can manage roles | ALL | public | permissive | `public.has_role(auth.uid(), 'admin'::app_role)` | `public.has_role(auth.uid(), 'admin'::app_role)` |
| `password_reset_requests` | Managers and admins can view all requests | SELECT | public | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` |  |
| `password_reset_requests` | Managers and admins can update requests | UPDATE | public | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` |  |
| `future_stock_entries` | Authenticated users can view future stock | SELECT | authenticated | permissive | `true` |  |
| `future_stock_entries` | Managers can manage future stock | ALL | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'manager') )` | `EXISTS ( SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'manager') )` |
| `future_stock_entries` | Sellers can insert future stock | INSERT | authenticated | permissive |  | `EXISTS ( SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'manager', 'vendedor') )` |
| `storage.objects` | Authenticated users can upload art files | INSERT | authenticated | permissive |  | `bucket_id = 'art-files' AND auth.uid()::text = (storage.foldername(name))[1]` |
| `storage.objects` | Users can view their own art files | SELECT | authenticated | permissive | `bucket_id = 'art-files' AND auth.uid()::text = (storage.foldername(name))[1]` |  |
| `storage.objects` | Public read access for art files | SELECT | anon | permissive | `bucket_id = 'art-files'` |  |
| `art_file_attachments` | Users can view their own art files | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `art_file_attachments` | Users can insert their own art files | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `art_file_attachments` | Users can delete their own art files | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `quotes` | Sellers can delete their own quotes | DELETE | public | permissive | `(seller_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `simulator_wizard_drafts` | Users can view their own drafts | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `simulator_wizard_drafts` | Users can create their own drafts | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `simulator_wizard_drafts` | Users can update their own drafts | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `simulator_wizard_drafts` | Users can delete their own drafts | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `seller_carts` | Sellers manage own carts | ALL | public | permissive | `auth.uid() = seller_id` | `auth.uid() = seller_id` |
| `seller_cart_items` | Sellers manage own cart items | ALL | public | permissive | `cart_id IN (SELECT id FROM public.seller_carts WHERE seller_id = auth.uid())` | `cart_id IN (SELECT id FROM public.seller_carts WHERE seller_id = auth.uid())` |
| `storage.objects` | Anyone can view mockup assets | SELECT | public | permissive | `bucket_id = 'mockup-assets'` |  |
| `storage.objects` | Users can upload their own mockup assets | INSERT | public | permissive |  | `bucket_id = 'mockup-assets' AND auth.uid()::text = (storage.foldername(name))[1]` |
| `storage.objects` | Users can update their own mockup assets | UPDATE | public | permissive | `bucket_id = 'mockup-assets' AND auth.uid()::text = (storage.foldername(name))[1]` |  |
| `storage.objects` | Users can delete their own mockup assets | DELETE | public | permissive | `bucket_id = 'mockup-assets' AND auth.uid()::text = (storage.foldername(name))[1]` |  |
| `magic_up_generations` | Users can view own generations | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `magic_up_generations` | Users can insert own generations | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `magic_up_generations` | Users can update own generations | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `magic_up_generations` | Users can delete own generations | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `mockup_templates` | Users can view own templates | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `mockup_templates` | Users can create own templates | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `mockup_templates` | Users can update own templates | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `mockup_templates` | Users can delete own templates | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `storage.objects` | Authenticated users can upload to art-files | INSERT | authenticated | permissive |  | `bucket_id = 'art-files'` |
| `storage.objects` | Authenticated users can update art-files | UPDATE | authenticated | permissive | `bucket_id = 'art-files'` |  |
| `storage.objects` | Authenticated users can read art-files | SELECT | authenticated | permissive | `bucket_id = 'art-files'` |  |
| `quote_number_counters` | service_role_only | ALL | public | permissive | `false` | `false` |
| `ip_whitelist` | Admin can manage ip_whitelist | ALL | public | permissive | `public.can_manage(auth.uid())` |  |
| `city_whitelist` | Admin can manage city_whitelist | ALL | public | permissive | `public.can_manage(auth.uid())` |  |
| `access_blocked_log` | Admin can view access_blocked_log | SELECT | public | permissive | `public.can_manage(auth.uid())` |  |
| `access_security_settings` | Admin can manage access_security_settings | ALL | public | permissive | `public.can_manage(auth.uid())` |  |
| `storage.objects` | Signatures are publicly accessible | SELECT | public | permissive | `bucket_id = 'signatures'` |  |
| `storage.objects` | Users can upload their own signature | INSERT | public | permissive |  | `bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]` |
| `storage.objects` | Users can update their own signature | UPDATE | public | permissive | `bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]` |  |
| `storage.objects` | Users can delete their own signature | DELETE | public | permissive | `bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]` |  |
| `mockup_prompt_configs` | Admins can manage prompt configs | ALL | public | permissive | `public.can_manage(auth.uid())` |  |
| `mockup_prompt_history` | Admins can manage prompt history | ALL | public | permissive | `public.can_manage(auth.uid())` |  |
| `mockup_prompt_configs` | Authenticated users can read active configs | SELECT | public | permissive | `auth.uid() IS NOT NULL AND is_active = true` |  |
| `mockup_prompt_history` | Authenticated users can read history | SELECT | public | permissive | `auth.uid() IS NOT NULL` |  |
| `storage.objects` | Users or admins can upload avatars | INSERT | public | permissive |  | `bucket_id = 'avatars' AND ( (auth.uid())::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin') )` |
| `storage.objects` | Users or admins can update avatars | UPDATE | public | permissive | `bucket_id = 'avatars' AND ( (auth.uid())::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin') )` |  |
| `storage.objects` | Users or admins can delete avatars | DELETE | public | permissive | `bucket_id = 'avatars' AND ( (auth.uid())::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin') )` |  |
| `cart_templates` | Users can view their own cart templates | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `cart_templates` | Users can create their own cart templates | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `cart_templates` | Users can update their own cart templates | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `cart_templates` | Users can delete their own cart templates | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `generated_mockups` | Sellers can update their own mockups | UPDATE | public | permissive | `seller_id = auth.uid()` | `seller_id = auth.uid()` |
| `category_icons` | Anyone can read category icons | SELECT | public | permissive | `true` |  |
| `product_groups` | Admins can manage groups | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `product_group_members` | Admins can manage members | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `product_components` | Admins can manage components | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `simulator_wizard_drafts` | Users can view own drafts | SELECT | authenticated | permissive | `user_id = auth.uid()` |  |
| `simulator_wizard_drafts` | Users can insert own drafts | INSERT | authenticated | permissive |  | `user_id = auth.uid()` |
| `simulator_wizard_drafts` | Users can update own drafts | UPDATE | authenticated | permissive | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `simulator_wizard_drafts` | Users can delete own drafts | DELETE | authenticated | permissive | `user_id = auth.uid()` |  |
| `product_views` | Users can view own views | SELECT | authenticated | permissive | `seller_id = auth.uid()` |  |
| `product_views` | Admins can read all views | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `product_views` | Users can insert own views | INSERT | authenticated | permissive |  | `seller_id = auth.uid()` |
| `seller_carts` | Users can manage own carts | ALL | authenticated | permissive | `seller_id = auth.uid()` | `seller_id = auth.uid()` |
| `seller_cart_items` | Users can manage own cart items | ALL | authenticated | permissive | `EXISTS ( SELECT 1 FROM seller_carts c WHERE c.id = seller_cart_items.cart_id AND c.seller_id = auth.uid() )` | `EXISTS ( SELECT 1 FROM seller_carts c WHERE c.id = seller_cart_items.cart_id AND c.seller_id = auth.uid() )` |
| `user_roles` | Users can view own role | SELECT | authenticated | permissive | `user_id = auth.uid()` |  |
| `expert_conversations` | Users can manage own conversations | ALL | authenticated | permissive | `seller_id = auth.uid()` | `seller_id = auth.uid()` |
| `expert_messages` | Users can manage own messages | ALL | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.expert_conversations WHERE id = expert_messages.conversation_id AND seller_id = auth.uid() )` | `EXISTS ( SELECT 1 FROM public.expert_conversations WHERE id = expert_messages.conversation_id AND seller_id = auth.uid() )` |
| `mockup_drafts` | Users can manage own drafts | ALL | authenticated | permissive | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `magic_up_generations` | Users can manage own generations | ALL | authenticated | permissive | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `user_onboarding` | Users can view own onboarding | SELECT | authenticated | permissive | `user_id = auth.uid()` |  |
| `user_onboarding` | Users can insert own onboarding | INSERT | authenticated | permissive |  | `user_id = auth.uid()` |
| `user_onboarding` | Users can update own onboarding | UPDATE | authenticated | permissive | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `generated_mockups` | Users can manage own mockups | ALL | authenticated | permissive | `seller_id = auth.uid()` | `seller_id = auth.uid()` |
| `storage.objects` | Public can view personalization images | SELECT | public | permissive | `bucket_id = 'personalization-images'` |  |
| `storage.objects` | Authenticated users can update own personalization images | UPDATE | authenticated | permissive | `bucket_id = 'personalization-images' AND owner = auth.uid()` | `bucket_id = 'personalization-images' AND owner = auth.uid()` |
| `storage.objects` | Authenticated users can delete own personalization images | DELETE | authenticated | permissive | `bucket_id = 'personalization-images' AND owner = auth.uid()` |  |
| `video_variant_links` | Authenticated users can read video variant links | SELECT | authenticated | permissive | `true` |  |
| `video_variant_links` | Admins can manage video variant links | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin')` | `has_role(auth.uid(), 'admin')` |
| `storage.objects` | Public can view product videos | SELECT | public | permissive | `bucket_id = 'product-videos'` |  |
| `cart_templates` | Users can manage own templates | ALL | authenticated | permissive | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `storage.objects` | Public read access for supplier logos | SELECT | public | permissive | `bucket_id = 'supplier-logos'` |  |
| `storage.objects` | Authenticated users can update supplier logos | UPDATE | authenticated | permissive | `bucket_id = 'supplier-logos'` |  |
| `profiles` | Users can update own profile | UPDATE | authenticated | permissive | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `query_telemetry` | Authenticated users can insert own telemetry | INSERT | authenticated | permissive |  | `user_id = auth.uid()` |
| `organizations` | Owners can update their organization | UPDATE | authenticated | permissive | `public.has_org_role(auth.uid(), id, 'owner')` | `public.has_org_role(auth.uid(), id, 'owner')` |
| `organization_members` | Members can view org members | SELECT | authenticated | permissive | `organization_id IN (SELECT public.get_user_org_ids(auth.uid()))` |  |
| `organization_members` | Org owners can update members | UPDATE | authenticated | permissive | `public.has_org_role(auth.uid(), organization_id, 'owner')` | `public.has_org_role(auth.uid(), organization_id, 'owner')` |
| `organization_members` | Org owners can delete members | DELETE | authenticated | permissive | `public.has_org_role(auth.uid(), organization_id, 'owner') OR user_id = auth.uid()` |  |
| `organizations` | Authenticated users can create organizations | INSERT | authenticated | permissive |  | `auth.uid() IS NOT NULL` |
| `organizations` | Members can view their organizations | SELECT | authenticated | permissive | `id IN (SELECT public.get_user_org_ids(auth.uid()))` |  |
| `product_price_history` | Admins can delete price history | DELETE | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `product_price_history` | Users can insert own price records | INSERT | authenticated | permissive |  | `recorded_by = auth.uid()` |
| `quote_comments` | Users can update own comments | UPDATE | authenticated | permissive | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `saved_filters` | Users can view own filters | SELECT | authenticated | permissive | `user_id = auth.uid()` |  |
| `saved_filters` | Users can insert own filters | INSERT | authenticated | permissive |  | `user_id = auth.uid()` |
| `saved_filters` | Users can update own filters | UPDATE | authenticated | permissive | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `saved_filters` | Users can delete own filters | DELETE | authenticated | permissive | `user_id = auth.uid()` |  |
| `follow_up_reminders` | Users can manage own reminders | ALL | authenticated | permissive | `seller_id = auth.uid()` | `seller_id = auth.uid()` |
| `product_price_history` | Users can read own or admin price history | SELECT | authenticated | permissive | `recorded_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `organization_members` | Org owners can insert members any role | INSERT | authenticated | permissive |  | `has_org_role(auth.uid(), organization_id, 'owner'::org_role)` |
| `profiles` | Users can insert own profile | INSERT | authenticated | permissive |  | `user_id = auth.uid()` |
| `category_icons` | Admins can insert category icons | INSERT | authenticated | permissive |  | `has_role(auth.uid(), 'admin'::app_role)` |
| `category_icons` | Admins can update category icons | UPDATE | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `category_icons` | Admins can delete category icons | DELETE | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `user_onboarding` | Users can delete own onboarding | DELETE | authenticated | permissive | `user_id = auth.uid()` |  |
| `quote_comments` | Managers can read all comments | SELECT | authenticated | permissive | `is_manager_or_admin()` |  |
| `product_price_history` | Admins can update price history | UPDATE | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `quote_comments` | Sellers can read comments on own quotes | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id::text = quote_comments.quote_id AND q.seller_id = auth.uid() )` |  |
| `login_attempts` | Admins can read all login attempts | SELECT | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `custom_kits` | Users can manage own kits | ALL | authenticated | permissive | `user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)` | `user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)` |
| `custom_kits` | Admins can read all kits | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role)` |  |
| `kit_share_tokens` | Sellers can manage own kit share tokens | ALL | authenticated | permissive | `seller_id = auth.uid()` | `seller_id = auth.uid()` |
| `permissions` | Admins can manage permissions | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role)` | `has_role(auth.uid(), 'admin'::app_role)` |
| `permissions` | Authenticated users can read permissions | SELECT | authenticated | permissive | `true` |  |
| `role_permissions` | Admins can manage role_permissions | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin')` | `has_role(auth.uid(), 'admin')` |
| `role_permissions` | Authenticated users can read role_permissions | SELECT | authenticated | permissive | `true` |  |
| … +591 linhas — lista completa em `context.json` | | | | | | |

## C. Restrições de dados (obrigatório / único / default / CHECK / FK / calculada)

| Tabela | Coluna | Regra |
|---|---|---|
| `notification_preferences` | `user_id` | PK; FK → users.id ON DELETE CASCADE |
| `notification_preferences` | `email_enabled` | default true |
| `notification_preferences` | `push_enabled` | default false |
| `notification_preferences` | `whatsapp_enabled` | default false |
| `notification_preferences` | `events_config` | default '{"order_status_change": |
| `notification_preferences` | `dnd_enabled` | default false |
| `notification_preferences` | `dnd_start` | default '22:00:00' |
| `notification_preferences` | `dnd_end` | default '08:00:00' |
| `notification_preferences` | `digest_enabled` | default false |
| `notification_preferences` | `digest_frequency` | default 'daily' |
| `notification_preferences` | `channel_priorities` | default '{"email": |
| `notification_templates` | `id` | PK; default gen_random_uuid() |
| `notification_templates` | `system` | obrigatório |
| `notification_templates` | `event_type` | obrigatório |
| `notification_templates` | `channel` | obrigatório |
| `notification_templates` | `title_template` | obrigatório |
| `notification_templates` | `message_template` | obrigatório |
| `notification_templates` | `default_priority` | default 1 |
| `notification_templates` | `created_at` | default NOW() |
| `notification_templates` | `(tabela)` | CONSTRAINT unique_template UNIQUE (system, event_type, channel) |
| `webhook_configs` | `id` | PK; default gen_random_uuid() |
| `webhook_configs` | `user_id` | FK → users.id ON DELETE CASCADE |
| `webhook_configs` | `system` | obrigatório |
| `webhook_configs` | `name` | obrigatório |
| `webhook_configs` | `url` | obrigatório |
| `webhook_configs` | `events` | obrigatório |
| `webhook_configs` | `is_active` | default true |
| `webhook_configs` | `max_retries` | default 3 |
| `webhook_configs` | `retry_delay_seconds` | default 60 |
| `webhook_configs` | `total_calls` | default 0 |
| `webhook_configs` | `failed_calls` | default 0 |
| `webhook_configs` | `created_at` | default NOW() |
| `webhook_logs` | `id` | PK; default gen_random_uuid() |
| `webhook_logs` | `webhook_id` | FK → webhook_configs.id ON DELETE CASCADE |
| `webhook_logs` | `event_type` | obrigatório |
| `webhook_logs` | `payload` | obrigatório |
| `webhook_logs` | `attempt_number` | default 1 |
| `webhook_logs` | `created_at` | default NOW() |
| `push_subscriptions` | `id` | PK; default gen_random_uuid() |
| `push_subscriptions` | `user_id` | FK → users.id ON DELETE CASCADE |
| `push_subscriptions` | `endpoint` | obrigatório; único |
| `push_subscriptions` | `p256dh` | obrigatório |
| `push_subscriptions` | `auth` | obrigatório |
| `push_subscriptions` | `created_at` | default NOW() |
| `push_subscriptions` | `is_active` | default TRUE |
| `saved_filters` | `id` | PK; default gen_random_uuid() |
| `saved_filters` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `saved_filters` | `name` | obrigatório |
| `saved_filters` | `filters` | default '{}'::jsonb |
| `saved_filters` | `context` | default 'catalog' |
| `saved_filters` | `is_default` | default false |
| `saved_filters` | `created_at` | default now() |
| `saved_filters` | `updated_at` | default now() |
| `entity_versions` | `id` | PK; default gen_random_uuid() |
| `entity_versions` | `entity_type` | obrigatório |
| `entity_versions` | `entity_id` | obrigatório |
| `entity_versions` | `version_number` | obrigatório |
| `entity_versions` | `data` | default '{}'::jsonb |
| `entity_versions` | `changed_by` | FK → users.id |
| `entity_versions` | `changed_at` | default NOW() |
| `entity_versions` | `(tabela)` | CONSTRAINT unique_entity_version UNIQUE (entity_type, entity_id, version_number) |
| `categories` | `id` | PK; default gen_random_uuid() |
| `categories` | `name` | obrigatório |
| `categories` | `parent_id` | FK → categories.id |
| `categories` | `sort_order` | default 0 |
| `categories` | `active` | default TRUE |
| `categories` | `created_at` | default NOW() |
| `categories` | `deleted_at` | default NULL |
| `suppliers` | `id` | PK; default gen_random_uuid() |
| `suppliers` | `name` | obrigatório |
| `suppliers` | `code` | único |
| `suppliers` | `lead_time` | default 7 |
| `suppliers` | `min_order` | default 0 |
| `suppliers` | `rating` | default 0 |
| `suppliers` | `active` | default TRUE |
| `suppliers` | `created_at` | default NOW() |
| `suppliers` | `deleted_at` | default NULL |
| `products` | `id` | PK; default gen_random_uuid() |
| `products` | `external_id` | único |
| `products` | `sku` | obrigatório |
| `products` | `name` | obrigatório |
| `products` | `price` | default 0 |
| `products` | `min_quantity` | default 1 |
| `products` | `stock` | default 0 |
| `products` | `stock_status` | default 'in-stock' |
| `products` | `is_kit` | default false |
| `products` | `is_active` | default true |
| `products` | `featured` | default false |
| `products` | `new_arrival` | default false |
| `products` | `on_sale` | default false |
| `products` | `images` | default '[]'::jsonb |
| `products` | `colors` | default '[]'::jsonb |
| `products` | `materials` | default '{}' |
| `products` | `tags` | default '{}'::jsonb |
| `products` | `kit_items` | default '[]'::jsonb |
| `products` | `variations` | default '[]'::jsonb |
| `products` | `metadata` | default '{}'::jsonb |
| `products` | `synced_at` | default now() |
| `products` | `created_at` | default now() |
| `products` | `updated_at` | default now() |
| `products` | `deleted_at` | default NULL |
| `quotes` | `id` | PK; default gen_random_uuid() |
| `quotes` | `quote_number` | default '' |
| `quotes` | `seller_id` | obrigatório |
| `quotes` | `status` | default 'draft' |
| `quotes` | `subtotal` | default 0 |
| `quotes` | `discount_percent` | default 0 |
| `quotes` | `discount_amount` | default 0 |
| `quotes` | `total` | default 0 |
| `quotes` | `shipping_cost` | default 0 |
| `quotes` | `synced_to_bitrix` | default false |
| `quotes` | `created_at` | default now() |
| `quotes` | `updated_at` | default now() |
| `quotes` | `version` | default 1 |
| `quotes` | `parent_quote_id` | FK → quotes.id ON DELETE SET NULL |
| `quotes` | `is_latest_version` | default true |
| `quotes` | `organization_id` | FK → organizations.id |
| `quotes` | `negotiation_markup_percent` | default 0 |
| `quotes` | `approved_by` | FK → users.id |
| `quotes` | `pa_id` | FK → postos_atendimento.id |
| `quotes` | `singular_id` | FK → cooperativas.id |
| `quotes` | `consolidation_id` | FK → quote_consolidations.id |
| `quotes` | `suggested_modifications` | default NULL |
| `quotes` | `approved_pdf_url` | default NULL |
| `quotes` | `tags` | default '{}' |
| `quotes` | `total_cost` | default 0 |
| `quotes` | `row_version` | default 1 |
| `quotes` | `is_active` | default TRUE |
| `quotes` | `reorder_source_order_id` | FK → sicoob_orders.id ON DELETE RESTRICT |
| `quotes` | `reorder_source_quote_id` | FK → quotes.id ON DELETE RESTRICT |
| `quotes` | `catalog_stock_is_reserved` | default false |
| `quotes` | `reorder_price_changed_items` | default 0 |
| `quotes` | `(tabela)` | constraint quotes_reorder_single_source_check CHECK ( reorder_source_order_id IS NULL OR reorder_source_quote_id IS NULL ) |
| `quotes` | `(tabela)` | constraint quotes_catalog_validity_check CHECK ( catalog_valid_until IS NULL OR (catalog_revalidated_at IS NOT NULL AND catalog_valid_until > catalog_revalidated_at) ) |
| `quotes` | `(tabela)` | constraint quotes_catalog_not_reservation_check CHECK (catalog_stock_is_reserved IS FALSE) |
| `quotes` | `(tabela)` | constraint quotes_reorder_price_changes_check CHECK (reorder_price_changed_items >= 0) |
| `profiles` | `id` | PK; default gen_random_uuid() |
| `profiles` | `user_id` | obrigatório; único; FK → users.id ON DELETE CASCADE |
| `profiles` | `role` | default 'vendedor' |
| `profiles` | `is_active` | default true |
| `profiles` | `preferences` | default '{}'::jsonb |
| `profiles` | `created_at` | default now() |
| `profiles` | `updated_at` | default now() |
| `profiles` | `cooperativa_id` | FK → cooperativas.id ON DELETE SET NULL |
| `profiles` | `pa_id` | FK → postos_atendimento.id ON DELETE SET NULL |
| `profiles` | `approval_threshold` | default 5000 |
| `profiles` | `quote_preferences` | default '{"showPrices": |
| `user_roles` | `id` | PK; default gen_random_uuid() |
| `user_roles` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `user_roles` | `role` | default 'vendedor' |
| `user_roles` | `(tabela)` | UNIQUE (user_id, role) |
| `bitrix_clients` | `id` | PK; default gen_random_uuid() |
| `bitrix_clients` | `bitrix_id` | obrigatório; único |
| `bitrix_clients` | `name` | obrigatório |
| `bitrix_clients` | `total_spent` | default 0 |
| `bitrix_clients` | `synced_at` | default now() |
| `bitrix_clients` | `created_at` | default now() |
| `bitrix_clients` | `updated_at` | default now() |
| `bitrix_deals` | `id` | PK; default gen_random_uuid() |
| `bitrix_deals` | `bitrix_id` | obrigatório; único |
| `bitrix_deals` | `bitrix_client_id` | obrigatório |
| `bitrix_deals` | `title` | obrigatório |
| `bitrix_deals` | `value` | default 0 |
| `bitrix_deals` | `currency` | default 'BRL' |
| `bitrix_deals` | `synced_at` | default now() |
| `bitrix_deals` | `created_at` | default now() |
| `bitrix_sync_logs` | `id` | PK; default gen_random_uuid() |
| `bitrix_sync_logs` | `synced_by` | FK → users.id |
| `bitrix_sync_logs` | `clients_synced` | default 0 |
| `bitrix_sync_logs` | `deals_synced` | default 0 |
| `bitrix_sync_logs` | `status` | default 'pending' |
| `bitrix_sync_logs` | `started_at` | default now() |
| `personalization_techniques` | `id` | PK; default gen_random_uuid() |
| `personalization_techniques` | `name` | obrigatório |
| `personalization_techniques` | `code` | único |
| `personalization_techniques` | `min_quantity` | default 1 |
| `personalization_techniques` | `setup_cost` | default 0 |
| `personalization_techniques` | `unit_cost` | default 0 |
| `personalization_techniques` | `estimated_days` | default 1 |
| `personalization_techniques` | `is_active` | default true |
| `personalization_techniques` | `created_at` | default now() |
| `personalization_techniques` | `updated_at` | default now() |
| `quote_items` | `id` | PK; default gen_random_uuid() |
| `quote_items` | `quote_id` | obrigatório; FK → quotes.id ON DELETE CASCADE |
| `quote_items` | `product_name` | obrigatório |
| `quote_items` | `quantity` | default 1 |
| `quote_items` | `unit_price` | default 0 |
| `quote_items` | `sort_order` | default 0 |
| `quote_items` | `created_at` | default now() |
| `quote_items` | `updated_at` | default now() |
| `quote_items` | `kit_group_id` | default NULL |
| `quote_items` | `kit_name` | default NULL |
| `quote_items` | `size_code` | default NULL |
| `quote_items` | `gender` | default NULL |
| `quote_items` | `unit_cost` | default 0 |
| `quote_items` | `price_changed` | default false |
| `quote_items` | `catalog_stock_is_reserved` | default false |
| `quote_items` | `(tabela)` | constraint quote_items_catalog_stock_check CHECK ( catalog_available_stock IS NULL OR catalog_available_stock >= 0 ) |
| `quote_items` | `(tabela)` | constraint quote_items_catalog_minimum_check CHECK ( catalog_minimum_quantity IS NULL OR catalog_minimum_quantity > 0 ) |
| `quote_items` | `(tabela)` | constraint quote_items_historical_price_check CHECK ( historical_unit_price IS NULL OR historical_unit_price >= 0 ) |
| `quote_items` | `(tabela)` | constraint quote_items_catalog_not_reservation_check CHECK (catalog_stock_is_reserved IS FALSE) |
| `quote_item_personalizations` | `id` | PK; default gen_random_uuid() |
| `quote_item_personalizations` | `quote_item_id` | obrigatório; FK → quote_items.id ON DELETE CASCADE |
| `quote_item_personalizations` | `colors_count` | default 1 |
| `quote_item_personalizations` | `positions_count` | default 1 |
| `quote_item_personalizations` | `setup_cost` | default 0 |
| `quote_item_personalizations` | `unit_cost` | default 0 |
| `quote_item_personalizations` | `total_cost` | default 0 |
| `quote_item_personalizations` | `created_at` | default now() |
| `quote_item_personalizations` | `updated_at` | default now() |
| `product_sync_logs` | `id` | PK; default gen_random_uuid() |
| `product_sync_logs` | `source` | obrigatório |
| `product_sync_logs` | `status` | default 'pending' |
| `product_sync_logs` | `records_processed` | default 0 |
| `product_sync_logs` | `records_inserted` | default 0 |
| `product_sync_logs` | `records_updated` | default 0 |
| `product_sync_logs` | `records_failed` | default 0 |
| `product_sync_logs` | `created_at` | default now() |
| `personalization_locations` | `id` | PK; default gen_random_uuid() |
| `personalization_locations` | `product_type` | obrigatório |
| `personalization_locations` | `location_name` | obrigatório |
| `personalization_locations` | `is_active` | default true |
| `personalization_locations` | `created_at` | default now() |
| `personalization_sizes` | `id` | PK; default gen_random_uuid() |
| `personalization_sizes` | `technique_id` | FK → personalization_techniques.id ON DELETE CASCADE |
| `personalization_sizes` | `size_label` | obrigatório |
| `personalization_sizes` | `price_modifier` | default 1.00 |
| `personalization_sizes` | `is_active` | default true |
| `personalization_sizes` | `created_at` | default now() |
| `product_components` | `id` | PK; default gen_random_uuid() |
| `product_components` | `product_id` | obrigatório |
| `product_components` | `component_code` | obrigatório |
| `product_components` | `component_name` | obrigatório |
| `product_components` | `is_personalizable` | default true |
| `product_components` | `is_active` | default true |
| `product_components` | `sort_order` | default 0 |
| `product_components` | `created_at` | default now() |
| `product_components` | `updated_at` | default now() |
| `product_component_locations` | `id` | PK; default gen_random_uuid() |
| `product_component_locations` | `component_id` | obrigatório; FK → product_components.id ON DELETE CASCADE |
| `product_component_locations` | `location_code` | obrigatório |
| `product_component_locations` | `location_name` | obrigatório |
| `product_component_locations` | `is_active` | default true |
| `product_component_locations` | `sort_order` | default 0 |
| `product_component_locations` | `created_at` | default now() |
| `product_component_locations` | `updated_at` | default now() |
| `product_component_locations` | `(tabela)` | UNIQUE(component_id, location_code) |
| `product_component_location_techniques` | `id` | PK; default gen_random_uuid() |
| `product_component_location_techniques` | `component_location_id` | obrigatório; FK → product_component_locations.id ON DELETE CASCADE |
| `product_component_location_techniques` | `technique_id` | obrigatório |
| `product_component_location_techniques` | `composed_code` | obrigatório |
| `product_component_location_techniques` | `max_colors` | CHECK max_colors IS NULL OR max_colors > 0 |
| `product_component_location_techniques` | `is_default` | default false |
| `product_component_location_techniques` | `is_active` | default true |
| `product_component_location_techniques` | `created_at` | default now() |
| `product_component_location_techniques` | `(tabela)` | UNIQUE (component_location_id, technique_id) |
| `product_groups` | `id` | PK; default gen_random_uuid() |
| `product_groups` | `group_code` | obrigatório |
| `product_groups` | `group_name` | obrigatório |
| `product_groups` | `is_active` | default true |
| `product_groups` | `created_at` | default now() |
| `product_groups` | `updated_at` | default now() |
| `product_group_members` | `id` | PK; default gen_random_uuid() |
| `product_group_members` | `product_group_id` | obrigatório; FK → product_groups.id ON DELETE CASCADE |
| `product_group_members` | `product_id` | obrigatório |
| `product_group_members` | `use_group_rules` | default true |
| `product_group_members` | `created_at` | default now() |
| `product_group_members` | `updated_at` | default now() |
| `product_group_components` | `id` | PK; default gen_random_uuid() |
| `product_group_components` | `product_group_id` | obrigatório; FK → product_groups.id ON DELETE CASCADE |
| `product_group_components` | `component_code` | obrigatório |
| `product_group_components` | `component_name` | obrigatório |
| `product_group_components` | `is_personalizable` | default true |
| `product_group_components` | `is_active` | default true |
| `product_group_components` | `sort_order` | default 0 |
| `product_group_components` | `created_at` | default now() |
| `product_group_components` | `(tabela)` | UNIQUE (product_group_id, component_code) |
| `product_group_locations` | `id` | PK; default gen_random_uuid() |
| `product_group_locations` | `group_component_id` | obrigatório; FK → product_group_components.id ON DELETE CASCADE |
| `product_group_locations` | `location_code` | obrigatório |
| `product_group_locations` | `location_name` | obrigatório |
| `product_group_locations` | `is_active` | default true |
| `product_group_locations` | `created_at` | default now() |
| `product_group_locations` | `(tabela)` | UNIQUE (group_component_id, location_code) |
| `product_group_locations` | `(tabela)` | CHECK (max_width_cm IS NULL OR max_width_cm > 0) |
| `product_group_locations` | `(tabela)` | CHECK (max_height_cm IS NULL OR max_height_cm > 0) |
| `product_group_locations` | `(tabela)` | CHECK (max_area_cm2 IS NULL OR max_area_cm2 > 0) |
| `product_group_location_techniques` | `id` | PK; default gen_random_uuid() |
| `product_group_location_techniques` | `group_location_id` | obrigatório; FK → product_group_locations.id ON DELETE CASCADE |
| `product_group_location_techniques` | `technique_id` | obrigatório |
| `product_group_location_techniques` | `technique_code` | obrigatório |
| `product_group_location_techniques` | `max_colors` | CHECK max_colors IS NULL OR max_colors > 0 |
| `product_group_location_techniques` | `is_default` | default false |
| `product_group_location_techniques` | `is_active` | default true |
| `product_group_location_techniques` | `created_at` | default now() |
| `product_group_location_techniques` | `(tabela)` | UNIQUE (group_location_id, technique_id) |
| `personalization_simulations` | `id` | PK; default gen_random_uuid() |
| `personalization_simulations` | `seller_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `personalization_simulations` | `product_name` | obrigatório |
| `personalization_simulations` | `quantity` | default 1; CHECK quantity > 0 |
| … +1910 linhas — lista completa em `context.json` | | |

## D. Automações no banco (triggers e funções — regras que rodam sozinhas)

| Trigger | Quando | Tabela | Executa | Condição |
|---|---|---|---|---|
| trigger_update_notification_updated_at | BEFORE UPDATE | `notifications` | `update_notification_updated_at` |  |
| trigger_saved_filters_updated_at | BEFORE UPDATE | `saved_filters` | `update_saved_filters_updated_at` |  |
| trigger_single_default_filter | BEFORE INSERT OR UPDATE OF IS_DEFAULT | `saved_filters` | `ensure_single_default_filter` | `NEW.is_default = true` |
| update_personalization_techniques_updated_at | BEFORE UPDATE | `personalization_techniques` | `update_updated_at_column` |  |
| update_products_updated_at | BEFORE UPDATE | `products` | `update_updated_at_column` |  |
| update_product_components_updated_at | BEFORE UPDATE | `product_components` | `update_updated_at_column` |  |
| update_expert_conversations_updated_at | BEFORE UPDATE | `expert_conversations` | `update_updated_at_column` |  |
| products_search_vector_trigger | BEFORE INSERT OR UPDATE | `products` | `products_generate_search_vector` |  |
| update_seller_gamification_updated_at | BEFORE UPDATE | `seller_gamification` | `update_updated_at_column` |  |
| update_sales_goals_updated_at | BEFORE UPDATE | `sales_goals` | `update_updated_at_column` |  |
| update_follow_up_reminders_updated_at | BEFORE UPDATE | `follow_up_reminders` | `update_updated_at_column` |  |
| trigger_invalidate_token | BEFORE UPDATE OF APPROVED | `quote_approval_tokens` | `invalidate_approval_token` | `NEW.approved IS NOT NULL AND OLD.approved IS NULL` |
| audit_quotes | AFTER INSERT OR UPDATE OR DELETE | `quotes` | `audit_trigger_func` |  |
| audit_orders | AFTER INSERT OR UPDATE OR DELETE | `orders` | `audit_trigger_func` |  |
| audit_products | AFTER INSERT OR UPDATE OR DELETE | `products` | `audit_trigger_func` |  |
| audit_bitrix_clients | AFTER INSERT OR UPDATE OR DELETE | `bitrix_clients` | `audit_trigger_func` |  |
| audit_sales_goals | AFTER INSERT OR UPDATE OR DELETE | `sales_goals` | `audit_trigger_func` |  |
| trigger_log_price | AFTER UPDATE | `products` | `log_price_change` |  |
| update_user_onboarding_updated_at | BEFORE UPDATE | `user_onboarding` | `update_updated_at_column` |  |
| update_user_2fa_settings_updated_at | BEFORE UPDATE | `user_2fa_settings` | `update_updated_at_column` |  |
| update_mockup_drafts_updated_at | BEFORE UPDATE | `mockup_drafts` | `update_updated_at_column` |  |
| update_companies_updated_at | BEFORE UPDATE | `companies` | `update_updated_at_column` |  |
| update_company_contacts_updated_at | BEFORE UPDATE | `company_contacts` | `update_updated_at_column` |  |
| update_company_addresses_updated_at | BEFORE UPDATE | `company_addresses` | `update_updated_at_column` |  |
| update_category_icons_updated_at | BEFORE UPDATE | `category_icons` | `update_updated_at_column` |  |
| update_product_novelties_updated_at | BEFORE UPDATE | `product_novelties` | `update_updated_at_column` |  |
| update_future_stock_entries_updated_at | BEFORE UPDATE | `future_stock_entries` | `update_updated_at_column` |  |
| update_simulator_wizard_drafts_updated_at | BEFORE UPDATE | `simulator_wizard_drafts` | `update_updated_at_column` |  |
| update_seller_cart_items_updated_at | BEFORE UPDATE | `seller_cart_items` | `update_updated_at_column` |  |
| enforce_seller_cart_limit | BEFORE INSERT | `seller_carts` | `check_seller_cart_limit` |  |
| set_quote_number | BEFORE INSERT | `quotes` | `generate_quote_number` | `NEW.quote_number IS NULL OR NEW.quote_number = ''` |
| update_ip_whitelist_updated_at | BEFORE UPDATE | `ip_whitelist` | `update_updated_at_column` |  |
| update_city_whitelist_updated_at | BEFORE UPDATE | `city_whitelist` | `update_updated_at_column` |  |
| update_access_security_settings_updated_at | BEFORE UPDATE | `access_security_settings` | `update_updated_at_column` |  |
| trg_prevent_role_self_update | BEFORE UPDATE | `profiles` | `prevent_role_self_update` |  |
| prevent_profile_role_change_trigger | BEFORE UPDATE | `profiles` | `prevent_profile_role_change` |  |
| trigger_generate_quote_number | BEFORE INSERT | `quotes` | `generate_quote_number` |  |
| set_order_number | BEFORE INSERT | `orders` | `generate_order_number` |  |
| trg_generate_secure_approval_token | BEFORE INSERT | `quote_approval_tokens` | `generate_secure_token` |  |
| trg_invalidate_used_approval_token | BEFORE UPDATE | `quote_approval_tokens` | `invalidate_used_approval_token` |  |
| trg_validate_report_email | BEFORE INSERT OR UPDATE | `scheduled_reports` | `validate_scheduled_report_email` |  |
| trg_notify_quote_status_change | AFTER UPDATE | `quotes` | `notify_quote_status_change` |  |
| trg_notify_new_order | AFTER INSERT | `orders` | `notify_new_order` |  |
| trg_notify_quote_client_response | AFTER UPDATE | `quote_approval_tokens` | `notify_quote_client_response` |  |
| update_collections_updated_at | BEFORE UPDATE | `collections` | `update_updated_at_column` |  |
| trg_validate_quote_status | BEFORE INSERT OR UPDATE | `quotes` | `validate_status_fields` |  |
| trg_validate_order_status | BEFORE INSERT OR UPDATE | `orders` | `validate_status_fields` |  |
| trg_validate_kit_status | BEFORE INSERT OR UPDATE | `custom_kits` | `validate_status_fields` |  |
| trg_validate_kit_share_token_status | BEFORE INSERT OR UPDATE | `kit_share_tokens` | `validate_status_fields` |  |
| update_seller_discount_limits_updated_at | BEFORE UPDATE | `seller_discount_limits` | `update_updated_at_column` |  |
| update_discount_approval_requests_updated_at | BEFORE UPDATE | `discount_approval_requests` | `update_updated_at_column` |  |
| validate_discount_approval_status_trigger | BEFORE INSERT OR UPDATE | `discount_approval_requests` | `validate_discount_approval_status` |  |
| notify_discount_approval_trigger | AFTER INSERT OR UPDATE | `discount_approval_requests` | `notify_discount_approval_request` |  |
| trg_validate_commission_status | BEFORE INSERT OR UPDATE | `commission_entries` | `validate_commission_status` |  |
| update_commission_rules_updated_at | BEFORE UPDATE | `commission_rules` | `update_updated_at_column` |  |
| update_commission_entries_updated_at | BEFORE UPDATE | `commission_entries` | `update_updated_at_column` |  |
| trg_validate_ip_access_control | BEFORE INSERT OR UPDATE | `ip_access_control` | `validate_ip_access_control` |  |
| trg_ip_access_control_updated_at | BEFORE UPDATE | `ip_access_control` | `update_updated_at_column` |  |
| update_mockup_templates_updated_at | BEFORE UPDATE | `mockup_templates` | `update_updated_at_column` |  |
| update_art_files_updated_at | BEFORE UPDATE | `art_file_attachments` | `update_updated_at_column` |  |
| update_mockup_prompt_configs_updated_at | BEFORE UPDATE | `mockup_prompt_configs` | `update_updated_at_column` |  |
| trg_log_mockup_prompt_change | BEFORE UPDATE | `mockup_prompt_configs` | `log_mockup_prompt_change` |  |
| update_product_comp_loc_updated_at | BEFORE UPDATE | `product_component_locations` | `update_updated_at_column` |  |
| update_saved_trends_views_updated_at | BEFORE UPDATE | `saved_trends_views` | `update_updated_at_column` |  |
| trg_validate_quote_real_discount | BEFORE INSERT OR UPDATE OF SUBTOTAL, DISCOUNT_PERCENT, NEGOTIATION_MARKUP_PERCENT, STATUS | `quotes` | `validate_quote_real_discount` |  |
| trg_orders_increment_version | BEFORE UPDATE | `orders` | `increment_row_version` |  |
| update_kit_variants_updated_at | BEFORE UPDATE | `kit_variants` | `update_updated_at_column` |  |
| update_kit_collab_updated_at | BEFORE UPDATE | `kit_collaborators` | `update_updated_at_column` |  |
| update_kit_comments_updated_at | BEFORE UPDATE | `kit_comments` | `update_updated_at_column` |  |
| trg_kit_templates_updated_at | BEFORE UPDATE | `kit_templates` | `update_updated_at_column` |  |
| trg_external_connections_updated_at | BEFORE UPDATE | `external_connections` | `update_updated_at_column` |  |
| trg_outbound_webhooks_updated_at | BEFORE UPDATE | `outbound_webhooks` | `update_updated_at_column` |  |
| trg_inbound_endpoints_updated_at | BEFORE UPDATE | `inbound_webhook_endpoints` | `update_updated_at_column` |  |
| trg_mcp_api_keys_updated_at | BEFORE UPDATE | `mcp_api_keys` | `update_updated_at_column` |  |
| trg_dispatch_webhook_quotes | AFTER INSERT OR UPDATE | `quotes` | `dispatch_quote_webhook_event` |  |
| trg_dispatch_webhook_orders | AFTER INSERT | `orders` | `dispatch_quote_webhook_event` |  |
| trg_dispatch_webhook_discount | AFTER INSERT OR UPDATE | `discount_approval_requests` | `dispatch_quote_webhook_event` |  |
| trg_dispatch_webhook_kit_share | AFTER INSERT | `kit_share_tokens` | `dispatch_quote_webhook_event` |  |
| trg_trim_connection_test_history | AFTER INSERT | `connection_test_history` | `trim_connection_test_history` |  |
| set_favorite_lists_updated_at | BEFORE UPDATE | `favorite_lists` | `update_updated_at_column` |  |
| set_favorite_items_updated_at | BEFORE UPDATE | `favorite_items` | `update_updated_at_column` |  |
| trg_favorite_items_to_trash | BEFORE DELETE | `favorite_items` | `move_favorite_to_trash` |  |
| trg_move_collection_item_to_trash | BEFORE DELETE | `collection_items` | `move_collection_item_to_trash` |  |
| trg_user_comparisons_updated_at | BEFORE UPDATE | `user_comparisons` | `update_updated_at_column` |  |
| update_user_preferences_updated_at | BEFORE UPDATE | `user_preferences` | `update_updated_at_column` |  |
| set_magic_up_campaigns_updated_at | BEFORE UPDATE | `magic_up_campaigns` | `set_magic_up_updated_at` |  |
| set_magic_up_brand_kits_updated_at | BEFORE UPDATE | `magic_up_brand_kits` | `set_magic_up_updated_at` |  |
| set_magic_up_public_shares_updated_at | BEFORE UPDATE | `magic_up_public_shares` | `set_magic_up_updated_at` |  |
| trg_fill_integration_credential_metadata | BEFORE INSERT OR UPDATE | `integration_credentials` | `fill_integration_credential_metadata` |  |
| trg_validate_secret_rotation_action_type | BEFORE INSERT OR UPDATE | `secret_rotation_log` | `validate_secret_rotation_action_type` |  |
| update_admin_settings_updated_at | BEFORE UPDATE | `admin_settings` | `update_updated_at_column` |  |
| trg_pfo_set_updated_at | BEFORE UPDATE | `product_price_freshness_overrides` | `update_updated_at_column` |  |
| trg_optimization_queue_updated_at | BEFORE UPDATE | `optimization_queue` | `set_optimization_queue_updated_at` |  |
| sync_external_connections_on_credential_change | AFTER INSERT OR UPDATE OR DELETE | `integration_credentials` | `trg_sync_external_connections` |  |
| trg_audit_mcp_api_keys | AFTER INSERT OR UPDATE OR DELETE | `mcp_api_keys` | `audit_mcp_api_keys_changes` |  |
| trg_guard_mcp_api_keys | BEFORE INSERT OR UPDATE OR DELETE | `mcp_api_keys` | `guard_mcp_api_keys_writes` |  |
| trg_user_roles_audit_ins | AFTER INSERT | `user_roles` | `audit_user_role_changes` |  |
| trg_user_roles_audit_upd | AFTER UPDATE | `user_roles` | `audit_user_role_changes` |  |
| trg_user_roles_audit_del | AFTER DELETE | `user_roles` | `audit_user_role_changes` |  |
| trg_user_roles_auto_revoke_mcp | AFTER DELETE | `user_roles` | `trg_auto_revoke_mcp_on_role_loss` |  |
| trg_set_seller_id_default_quotes | BEFORE INSERT | `quotes` | `set_seller_id_default` |  |
| trg_set_seller_id_default_orders | BEFORE INSERT | `orders` | `set_seller_id_default` |  |
| trg_set_seller_id_default_qtemplates | BEFORE INSERT | `quote_templates` | `set_seller_id_default` |  |
| trg_set_seller_id_default_qatokens | BEFORE INSERT | `quote_approval_tokens` | `set_seller_id_default` |  |
| trg_set_seller_id_default_dar | BEFORE INSERT | `discount_approval_requests` | `set_seller_id_default` |  |
| trg_cooperativas_updated | BEFORE UPDATE | `cooperativas` | `tg_set_updated_at` |  |
| trg_pas_updated | BEFORE UPDATE | `postos_atendimento` | `tg_set_updated_at` |  |
| trg_coop_budgets_updated | BEFORE UPDATE | `cooperativa_budgets` | `tg_set_updated_at` |  |
| trg_pa_budgets_updated | BEFORE UPDATE | `pa_budgets` | `tg_set_updated_at` |  |
| update_sicoob_orders_updated_at | BEFORE UPDATE | `sicoob_orders` | `update_updated_at_column` |  |
| update_sicoob_approval_requests_updated_at | BEFORE UPDATE | `sicoob_approval_requests` | `update_updated_at_column` |  |
| trg_audit_sicoob_order_items | AFTER INSERT OR UPDATE OR DELETE | `sicoob_order_items` | `audit_sicoob_order_item_changes` |  |
| trg_log_order_status_change | AFTER UPDATE | `orders` | `log_order_status_change` |  |
| tr_validate_main_order_status | BEFORE UPDATE OF STATUS | `orders` | `validate_main_order_status_transition` |  |
| tr_validate_order_fulfillment | BEFORE UPDATE OF FULFILLMENT_STATUS | `orders` | `validate_order_fulfillment_transition` |  |
| tr_set_quote_hierarchy | BEFORE INSERT | `quotes` | `set_quote_hierarchy` |  |
| tr_quote_consolidations_updated_at | BEFORE UPDATE | `quote_consolidations` | `update_updated_at_column` |  |
| set_updated_at_categories | BEFORE UPDATE | `product_categories` | `handle_updated_at` |  |
| set_updated_at_singulares | BEFORE UPDATE | `singulares` | `handle_updated_at` |  |
| set_updated_at_cooperativas | BEFORE UPDATE | `cooperativas_parceiras` | `handle_updated_at` |  |
| set_updated_at_newsletter | BEFORE UPDATE | `newsletter_subscribers` | `handle_updated_at` |  |
| set_updated_at_coupons | BEFORE UPDATE | `coupons` | `handle_updated_at` |  |
| set_updated_at_campaigns | BEFORE UPDATE | `campaigns` | `handle_updated_at` |  |
| set_updated_at_banners | BEFORE UPDATE | `cms_banners` | `handle_updated_at` |  |
| set_updated_at_sections | BEFORE UPDATE | `cms_sections` | `handle_updated_at` |  |
| trigger_check_order_sla | BEFORE INSERT OR UPDATE | `sicoob_orders` | `check_order_sla` |  |
| trig_audit_user_roles | AFTER INSERT OR UPDATE OR DELETE | `user_roles` | `fn_audit_config_change` |  |
| trig_prevent_order_deletion | BEFORE DELETE | `orders` | `prevent_critical_deletion` |  |
| trig_prevent_quote_deletion | BEFORE DELETE | `quotes` | `prevent_critical_deletion` |  |
| update_cart_items_updated_at | BEFORE UPDATE | `cart_items` | `update_updated_at_column` |  |
| update_cms_config_updated_at | BEFORE UPDATE | `cms_config` | `update_updated_at_column` |  |
| update_blog_posts_updated_at | BEFORE UPDATE | `blog_posts` | `update_updated_at_column` |  |
| update_portfolio_items_updated_at | BEFORE UPDATE | `portfolio_items` | `update_updated_at_column` |  |
| trg_quotes_row_version | BEFORE UPDATE | `quotes` | `handle_row_version` |  |
| update_quotes_updated_at | BEFORE UPDATE | `quotes` | `update_updated_at_column` |  |
| update_quote_items_updated_at | BEFORE UPDATE | `quote_items` | `update_updated_at_column` |  |
| update_orders_updated_at | BEFORE UPDATE | `orders` | `update_updated_at_column` |  |
| update_order_items_updated_at | BEFORE UPDATE | `order_items` | `update_updated_at_column` |  |
| update_profiles_updated_at | BEFORE UPDATE | `profiles` | `update_updated_at_column` |  |
| update_organizations_updated_at | BEFORE UPDATE | `organizations` | `update_updated_at_column` |  |
| update_pa_budgets_updated_at | BEFORE UPDATE | `pa_budgets` | `update_updated_at_column` |  |
| update_seller_carts_updated_at | BEFORE UPDATE | `seller_carts` | `update_updated_at_column` |  |
| update_product_groups_updated_at | BEFORE UPDATE | `product_groups` | `update_updated_at_column` |  |
| update_quote_templates_updated_at | BEFORE UPDATE | `quote_templates` | `update_updated_at_column` |  |
| sync_quotes_is_active | BEFORE UPDATE | `quotes` | `sync_is_active_with_deleted_at` | `NEW.deleted_at IS DISTINCT FROM OLD.deleted_at` |
| sync_groups_is_active | BEFORE UPDATE | `product_groups` | `sync_is_active_with_deleted_at` | `NEW.deleted_at IS DISTINCT FROM OLD.deleted_at` |
| tr_sicoob_centrais_updated_at | BEFORE UPDATE | `sicoob_centrais` | `handle_updated_at` |  |
| tr_audit_cooperativas | AFTER INSERT OR UPDATE OR DELETE | `cooperativas` | `log_sicoob_admin_action` |  |
| tr_audit_pas | AFTER INSERT OR UPDATE OR DELETE | `postos_atendimento` | `log_sicoob_admin_action` |  |
| tr_validate_sicoob_order_status | BEFORE UPDATE OF STATUS | `sicoob_orders` | `validate_order_status_transition` |  |
| tr_record_sicoob_order_status_event | AFTER UPDATE OF STATUS, SLA_STATUS | `sicoob_orders` | `record_sicoob_order_status_event` |  |
| tr_guard_sicoob_approval_status_transition | BEFORE UPDATE OF STATUS | `sicoob_orders` | `guard_sicoob_approval_status_transition` |  |
| tr_guard_sicoob_approval_request_insert | BEFORE INSERT | `sicoob_approval_requests` | `guard_sicoob_approval_request_insert` |  |
| tr_protect_sicoob_approval_request | BEFORE UPDATE | `sicoob_approval_requests` | `protect_sicoob_approval_request` |  |
| tr_freeze_sicoob_order_items_pending_approval | BEFORE INSERT OR UPDATE OR DELETE | `sicoob_order_items` | `freeze_sicoob_order_while_approval_pending` |  |
| tr_normalize_quote_parent_root | BEFORE INSERT OR UPDATE OF PARENT_QUOTE_ID | `quotes` | `normalize_quote_parent_root` |  |
| tr_protect_latest_quote_version_deletion | BEFORE DELETE OR UPDATE OF DELETED_AT | `quotes` | `protect_latest_quote_version_deletion` |  |
| tr_protect_sicoob_order_payment | BEFORE INSERT OR UPDATE OR DELETE | `sicoob_order_payments` | `protect_sicoob_order_payment` |  |
| tr_protect_sicoob_order_artwork_version | BEFORE UPDATE OR DELETE | `sicoob_order_artwork_versions` | `protect_sicoob_order_artwork_version` |  |
| tr_require_sicoob_artwork_before_production | BEFORE UPDATE OF STATUS | `sicoob_orders` | `require_sicoob_artwork_before_production` |  |
| tr_protect_order_consolidations | BEFORE INSERT OR UPDATE OR DELETE | `order_consolidations` | `protect_sicoob_consolidation_records` |  |
| tr_protect_consolidation_orders | BEFORE INSERT OR UPDATE OR DELETE | `order_consolidation_orders` | `protect_sicoob_consolidation_records` |  |
| tr_protect_delivery_destinations | BEFORE INSERT OR UPDATE OR DELETE | `sicoob_delivery_destinations` | `protect_sicoob_consolidation_records` |  |
| tr_protect_delivery_allocations | BEFORE INSERT OR UPDATE OR DELETE | `sicoob_delivery_allocations` | `protect_sicoob_consolidation_records` |  |
| tr_protect_delivery_receipts | BEFORE INSERT OR UPDATE OR DELETE | `sicoob_delivery_receipt_events` | `protect_sicoob_consolidation_records` |  |
| tr_protect_sicoob_order_consolidation_link | BEFORE UPDATE OF CONSOLIDATION_ID | `sicoob_orders` | `protect_sicoob_order_consolidation_link` |  |
| on_auth_user_created | AFTER INSERT | `auth.users` | `handle_new_user` |  |
| update_personalization_simulations_updated_at | BEFORE UPDATE | `personalization_simulations` | `update_updated_at_column` |  |
| update_bitrix_clients_updated_at | BEFORE UPDATE | `bitrix_clients` | `update_updated_at_column` |  |
| tr_protect_sicoob_approval_policy_version | BEFORE UPDATE OR DELETE | `sicoob_approval_policies` | `protect_sicoob_approval_policy_version` |  |
| tr_capture_sicoob_order_approval_policy | BEFORE INSERT OR UPDATE | `sicoob_orders` | `capture_sicoob_order_approval_policy` |  |
| tr_freeze_sicoob_order_scope_pending_approval | BEFORE UPDATE OF TOTAL_AMOUNT, PA_ID, COOPERATIVE_ID, CREATED_AT | `sicoob_orders` | `freeze_sicoob_order_while_approval_pending` |  |
| trg_validate_approval_token_status | BEFORE INSERT OR UPDATE | `quote_approval_tokens` | `guard_local_quote_approval_token` |  |
| tr_queue_sicoob_approval_notifications | AFTER INSERT | `sicoob_approval_requests` | `queue_sicoob_approval_notifications` |  |
| tr_queue_sicoob_approval_escalation | AFTER UPDATE OF METADATA | `sicoob_approval_requests` | `queue_sicoob_approval_escalation` |  |
| tr_preserve_sicoob_artwork_requirement | BEFORE UPDATE OF REQUIRES_ARTWORK | `sicoob_orders` | `preserve_sicoob_artwork_requirement` |  |
| tr_validate_sicoob_invoice_document | BEFORE INSERT OR UPDATE OF FILE_PATH,FILE_TYPE,CREATED_BY,DOCUMENT_ID | `sicoob_order_invoices` | `validate_sicoob_order_document` |  |
| tr_validate_sicoob_delivery_document | BEFORE INSERT OR UPDATE OF DELIVERY_PHOTO_PATH,DELIVERY_PHOTO_UPLOADED_BY,CREATED_BY,DELIVERY_DOCUMENT_ID | `sicoob_order_shipments` | `validate_sicoob_order_document` |  |
| on_user_created_preferences | AFTER INSERT | `auth.users` | `create_default_notification_preferences` |  |
| tr_protect_sicoob_approval_delegation | BEFORE UPDATE OR DELETE | `sicoob_approval_delegations` | `protect_sicoob_approval_delegation` |  |
| tr_validate_sicoob_approval_delegate_role | BEFORE INSERT | `sicoob_approval_delegations` | `validate_sicoob_approval_delegate_role` |  |
| tr_guard_sicoob_reorder_catalog_validity | BEFORE UPDATE OF STATUS | `quotes` | `sicoob_guard_reorder_catalog_validity` |  |
| tr_sicoob_invitation_events_immutable | BEFORE UPDATE OR DELETE | `sicoob_invitation_events` | `reject_sicoob_invitation_event_mutation` |  |
| tr_sicoob_invitation_existing_account | BEFORE INSERT | `sicoob_invitations` | `require_sicoob_invitation_account` |  |
| trg_notify_singular_quote_submission | AFTER UPDATE OF STATUS | `quotes` | `notify_singular_quote_submission` |  |
| aaa_guard_profile_authority_fields | BEFORE INSERT OR UPDATE | `profiles` | `guard_profile_authority_fields` |  |
| aaa_guard_quote_governance_write | BEFORE INSERT OR UPDATE OR DELETE | `quotes` | `guard_quote_governance_write` |  |
| aaa_guard_quote_item_content_write | BEFORE INSERT OR UPDATE OR DELETE | `quote_items` | `guard_quote_item_content_write` |  |
| aaa_guard_quote_personalization_content_write | BEFORE INSERT OR UPDATE OR DELETE | `quote_item_personalizations` | `guard_quote_personalization_content_write` |  |
| set_catalog_marketing_terms_updated_at | BEFORE UPDATE | `catalog_marketing_terms` | `handle_updated_at` |  |
| preserve_catalog_marketing_term_authorship | BEFORE UPDATE | `catalog_marketing_terms` | `preserve_catalog_marketing_term_authorship` |  |
| trg_normalize_search_analytics_insert | BEFORE INSERT | `search_analytics` | `normalize_search_analytics_insert` |  |
| zzz_guard_quote_price_attestation | BEFORE INSERT OR UPDATE OR DELETE | `quotes` | `guard_quote_price_attestation` |  |
| zzz_guard_quote_item_price_attestation | BEFORE INSERT OR UPDATE OR DELETE | `quote_items` | `guard_quote_price_attestation` |  |
| zzz_guard_quote_personalization_price_attestation | BEFORE INSERT OR UPDATE OR DELETE | `quote_item_personalizations` | `guard_quote_price_attestation` |  |
| trg_sync_pa_budget_planejada | BEFORE INSERT OR UPDATE | `pa_budgets` | `tg_sync_pa_budget_planejada` |  |
| trg_recalc_pa_budget_states | AFTER INSERT OR UPDATE OR DELETE | `pa_budget_entries` | `tg_recalc_pa_budget_states` |  |
| trg_pa_budget_entries_imutavel | BEFORE UPDATE OR DELETE | `pa_budget_entries` | `tg_pa_budget_entries_immutable` |  |
| trg_pa_budget_entries_competencia | BEFORE INSERT | `pa_budget_entries` | `tg_pa_budget_entries_competencia_aberta` |  |
| trg_set_order_cost_center | BEFORE INSERT | `sicoob_orders` | `tg_set_order_cost_center` |  |
| trg_validate_order_allocations | AFTER INSERT OR UPDATE OR DELETE | `pa_budget_allocations` | `tg_validate_order_allocations` |  |
| trg_validate_sicoob_order_budget | BEFORE UPDATE OF STATUS, PA_ID, TOTAL_AMOUNT, CREATED_AT | `sicoob_orders` | `validate_sicoob_order_budget` |  |
| trg_validate_sicoob_order_budget_ins | AFTER INSERT | `sicoob_orders` | `tg_sicoob_order_budget_after_insert` |  |
| trg_notify_singular_quote_decision | AFTER UPDATE OF STATUS | `quotes` | `notify_singular_quote_decision` |  |

Erros lançados por funções SQL (`RAISE EXCEPTION` = regra de negócio no banco):

| Função | Mensagem | Origem |
|---|---|---|
| `soft_delete_record` | Invalid table name: % | `supabase/migrations/20260102_20260102205635_add_soft_delete_support.sql` |
| `restore_record` | Invalid table name: % | `supabase/migrations/20260102_20260102205635_add_soft_delete_support.sql` |
| `permanent_delete_record` | Invalid table name: % | `supabase/migrations/20260102_20260102205635_add_soft_delete_support.sql` |
| `check_seller_cart_limit` | Limite de 3 carrinhos simultâneos atingido | `supabase/migrations/20260214152115_900b7a1c-3aa4-48e7-afc1-5e44ea411a12.sql` |
| `prevent_role_self_update` | Only admins can change roles | `supabase/migrations/20260326193116_2c55f931-6722-4778-bff4-71f5b4c39752.sql` |
| `prevent_profile_role_change` | Only admins can change the role field on profiles | `supabase/migrations/20260326193116_2c55f931-6722-4778-bff4-71f5b4c39752.sql` |
| `validate_discount_approval_status` | Invalid discount approval status: % | `supabase/migrations/20260414193435_871210cd-f0d8-40ee-ae9f-401b4887727f.sql` |
| `validate_commission_status` | Invalid commission status: % | `supabase/migrations/20260416153503_5163f0f9-e6f0-4664-9f53-8cdb24d9150e.sql` |
| `validate_ip_access_control` | Invalid list_type: must be allow or block | `supabase/migrations/20260416184056_e28ea309-c50d-46b1-85e5-9e283352d97d.sql` |
| `get_web_vitals_regression` | Access denied | `supabase/migrations/20260417115234_fc88065c-9498-42e5-8acd-a10b991168fa.sql` |
| `get_web_vitals_summary` | Access denied: admin only | `supabase/migrations/20260417170750_40444ea3-f73b-48ab-b056-23f1624bef26.sql` |
| `increment_kit_template_usage` | Authentication required | `supabase/migrations/20260418183756_107f80f6-c724-4ce3-a61f-d3b256419118.sql` |
| `check_hardening_status` | Admin only | `supabase/migrations/20260419120255_fabedf0c-c79b-4592-90a7-7a95419763c1.sql` |
| `validate_secret_rotation_action_type` | Invalid action_type: must be set or rotate | `supabase/migrations/20260423163018_48a8bc1a-aa05-4f86-b4d2-c667c918ccbc.sql` |
| `set_connections_auto_test_interval` | forbidden: admin role required | `supabase/migrations/20260423184705_66fc9fa5-418b-4da9-af3e-f876550a4499.sql` |
| `set_connections_auto_test_interval` | invalid interval: must be one of 5, 10, 15, 30, 60, 120, 240 minutes | `supabase/migrations/20260423184705_66fc9fa5-418b-4da9-af3e-f876550a4499.sql` |
| `set_connections_auto_test_interval` | cron job connections-auto-test not found | `supabase/migrations/20260423184705_66fc9fa5-418b-4da9-af3e-f876550a4499.sql` |
| `set_connection_failure_window_minutes` | forbidden: admin role required | `supabase/migrations/20260423185624_0cc97b9f-b1ba-469a-914d-6ac6422b584d.sql` |
| `set_connection_failure_window_minutes` | invalid window: must be one of 0, 15, 30, 60, 120, 240 minutes | `supabase/migrations/20260423185624_0cc97b9f-b1ba-469a-914d-6ac6422b584d.sql` |
| `get_auto_test_job_status` | forbidden: admin role required | `supabase/migrations/20260423190831_794cb398-e9f7-4572-b089-46170a6da8c4.sql` |
| `enqueue_optimization` | forbidden | `supabase/migrations/20260424213841_362def7e-d8f7-4853-8e49-b6195611d178.sql` |
| `claim_next_optimization` | forbidden | `supabase/migrations/20260424213841_362def7e-d8f7-4853-8e49-b6195611d178.sql` |
| `complete_optimization` | forbidden | `supabase/migrations/20260424213841_362def7e-d8f7-4853-8e49-b6195611d178.sql` |
| `complete_optimization` | invalid status: % | `supabase/migrations/20260424213841_362def7e-d8f7-4853-8e49-b6195611d178.sql` |
| `complete_optimization` | optimization not found | `supabase/migrations/20260424213841_362def7e-d8f7-4853-8e49-b6195611d178.sql` |
| `reset_optimization_queue` | forbidden | `supabase/migrations/20260424213841_362def7e-d8f7-4853-8e49-b6195611d178.sql` |
| `log_full_scope_grant` | unauthorized | `supabase/migrations/20260425212807_54b0bb33-1b1f-47d7-a5d3-4409ca43bf80.sql` |
| `guard_mcp_api_keys_writes` | Direct writes to mcp_api_keys are not allowed | `supabase/migrations/20260425214848_66d5769e-6e89-4d0d-b49b-c44d1dd2285b.sql` |
| `log_access_denied` | invalid required_role: % | `supabase/migrations/20260426110946_54885e21-b0d8-4667-acbd-4f5a63e7215c.sql` |
| `record_dev_route_telemetry` | invalid event_type: % | `supabase/migrations/20260426113207_3a3869cb-cb8b-4085-b0e1-5c5351380daa.sql` |
| `record_dev_route_telemetry` | blocked_path required | `supabase/migrations/20260426113207_3a3869cb-cb8b-4085-b0e1-5c5351380daa.sql` |
| `execute_role_migration_batch` | forbidden: only admin can execute role migration batches | `supabase/migrations/20260426124745_a1de9fd9-f880-4613-8aa4-9a0684805b7b.sql` |
| `execute_role_migration_batch` | invalid items: expected non-empty jsonb array | `supabase/migrations/20260426124745_a1de9fd9-f880-4613-8aa4-9a0684805b7b.sql` |
| `execute_role_migration_batch` | label is required | `supabase/migrations/20260426124745_a1de9fd9-f880-4613-8aa4-9a0684805b7b.sql` |
| `execute_role_migration_batch` | reason is required (min 5 chars) | `supabase/migrations/20260426124745_a1de9fd9-f880-4613-8aa4-9a0684805b7b.sql` |
| `execute_role_migration_batch` | invalid operation: % | `supabase/migrations/20260426124745_a1de9fd9-f880-4613-8aa4-9a0684805b7b.sql` |
| `_rls_test_as` | forbidden | `supabase/migrations/20260426130639_eb1f50ad-de51-4942-95a7-e7f8b03f59d8.sql` |
| `log_rls_denial` | unauthenticated | `supabase/migrations/20260426131442_16ccbfea-d95c-4715-9650-8fa00b4709e7.sql` |
| `log_rls_denial` | invalid_operation | `supabase/migrations/20260426131442_16ccbfea-d95c-4715-9650-8fa00b4709e7.sql` |
| `enforce_seller_id_owner` | Não autorizado: seller_id (%) difere do usuário autenticado (%). | `supabase/migrations/20260426135521_227101ce-6c81-415d-9006-5c0f8545fc74.sql` |
| `enforce_user_id_owner` | Não autorizado: user_id (%) difere do usuário autenticado (%). | `supabase/migrations/20260426135521_227101ce-6c81-415d-9006-5c0f8545fc74.sql` |
| `enforce_created_by_owner` | Não autorizado: created_by (%) difere do usuário autenticado (%). | `supabase/migrations/20260426135521_227101ce-6c81-415d-9006-5c0f8545fc74.sql` |
| `audit_ownership_orphans` | audit_ownership_orphans: acesso negado | `supabase/migrations/20260426142016_3b87fd6f-3511-47b4-82cd-9eb128864567.sql` |
| `repair_ownership_orphans` | repair_ownership_orphans: acesso negado | `supabase/migrations/20260426145642_948756c0-6c4a-4be4-8757-9533bd4e291a.sql` |
| `repair_ownership_orphans` | repair_ownership_orphans: nenhum relatório encontrado | `supabase/migrations/20260426145642_948756c0-6c4a-4be4-8757-9533bd4e291a.sql` |
| `get_app_health_summary` | forbidden | `supabase/migrations/20260427143410_881dc2e9-21c1-43d6-9609-d11b9fa60876.sql` |
| `check_order_constraints_trigger` | Orçamento não configurado para o PA % neste período. | `supabase/migrations/20260502152357_35e058ba-a7e7-43e4-80a4-a67de8324edf.sql` |
| `check_order_constraints_trigger` | Saldo de orçamento insuficiente. Disponível: %, Solicitado: % | `supabase/migrations/20260502152357_35e058ba-a7e7-43e4-80a4-a67de8324edf.sql` |
| `check_order_constraints_trigger` | Este pedido excede a alçada de % e requer aprovação formal. | `supabase/migrations/20260502152357_35e058ba-a7e7-43e4-80a4-a67de8324edf.sql` |
| `validate_order_status` | Invalid fulfillment status: % | `supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql` |
| `check_fulfillment_transition` | Transição de status de fulfillment inválida: de % para % | `supabase/migrations/20260502181222_36afa705-d6ba-4204-9dbe-d83ae8f87598.sql` |
| `prevent_critical_deletion` | Registros históricos não podem ser removidos por usuários não-administradores. | `supabase/migrations/20260503210856_c31b8c3b-7810-4295-b4ec-89988b27b0b4.sql` |
| `finish_sicoob_approval_delivery` | Resultado de entrega inválido. | `supabase/migrations/20260922223000_sicoob_approval_outbox_followup.sql` |
| `mutate_sicoob_order_item` | Usuário autenticado obrigatório. | `supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql` |
| `mutate_sicoob_order_item` | Ação de item inválida. | `supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql` |
| `mutate_sicoob_order_item` | Pedido não encontrado. | `supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql` |
| `mutate_sicoob_order_item` | Usuário sem permissão para alterar itens deste pedido. | `supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql` |
| `mutate_sicoob_order_item` | Itens só podem ser alterados enquanto o pedido está em rascunho. | `supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql` |
| `mutate_sicoob_order_item` | Itens de pedido convertido são imutáveis; altere o orçamento de origem antes da conversão. | `supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql` |
| `mutate_sicoob_order_item` | Produto, nome, quantidade e preço válidos são obrigatórios. | `supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql` |
| `mutate_sicoob_order_item` | Item obrigatório para remoção. | `supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql` |
| `mutate_sicoob_order_item` | Item não encontrado neste pedido. | `supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql` |
| `consolidate_sicoob_quotes` | Ator, Singular e de 1 a 500 orçamentos são obrigatórios. | `supabase/migrations/20260922224800_consolidate_quotes_atomic.sql` |
| `consolidate_sicoob_quotes` | Usuário fora da alçada da Singular. | `supabase/migrations/20260922224800_consolidate_quotes_atomic.sql` |
| `consolidate_sicoob_quotes` | Orçamentos inexistentes, fora da Singular, inelegíveis ou já consolidados. | `supabase/migrations/20260922224800_consolidate_quotes_atomic.sql` |
| `consolidate_sicoob_quotes` | Concorrência detectada ao consolidar orçamentos. | `supabase/migrations/20260922224800_consolidate_quotes_atomic.sql` |
| `guard_local_quote_approval_token` | Status de link inválido. | `supabase/migrations/20260922225000_secure_public_quote_approval.sql` |
| `guard_local_quote_approval_token` | Orçamento indisponível para emissão deste link. | `supabase/migrations/20260922225000_secure_public_quote_approval.sql` |
| `guard_local_quote_approval_token` | O destino e o titular do link são imutáveis. | `supabase/migrations/20260922225000_secure_public_quote_approval.sql` |
| `guard_local_quote_approval_token` | Uma resposta só pode ser registrada pelo fluxo público. | `supabase/migrations/20260922225000_secure_public_quote_approval.sql` |
| `guard_local_quote_approval_token` | O cliente só pode revogar um link ativo. | `supabase/migrations/20260922225000_secure_public_quote_approval.sql` |
| `submit_signed_quote_response` | Dados da assinatura inválidos. | `supabase/migrations/20260922225000_secure_public_quote_approval.sql` |
| `rotate_quote_approval_evidence_key` | Nome de versão de chave inválido. | `supabase/migrations/20260922225000_secure_public_quote_approval.sql` |
| `rotate_quote_approval_evidence_key` | A nova chave não existe no Vault ou é curta. | `supabase/migrations/20260922225000_secure_public_quote_approval.sql` |
| `rotate_quote_approval_evidence_key` | Esta versão de chave já foi registrada. | `supabase/migrations/20260922225000_secure_public_quote_approval.sql` |
| `enqueue_sicoob_approval_event` | Evento de aprovação inválido. | `supabase/migrations/20260922225300_sicoob_approval_outbox_reconciliation.sql` |
| `reconcile_sicoob_approval_delivery` | Reconciliação inválida. | `supabase/migrations/20260922225300_sicoob_approval_outbox_reconciliation.sql` |
| `reconcile_sicoob_approval_delivery` | Entrega não encontrada. | `supabase/migrations/20260922225300_sicoob_approval_outbox_reconciliation.sql` |
| `reconcile_sicoob_approval_delivery` | A entrega não está disponível para reconciliação. | `supabase/migrations/20260922225300_sicoob_approval_outbox_reconciliation.sql` |
| `reconcile_sicoob_approval_delivery` | Já existe geração posterior para esta entrega. | `supabase/migrations/20260922225300_sicoob_approval_outbox_reconciliation.sql` |
| `reconcile_sicoob_approval_delivery` | A solicitação não está mais pendente. | `supabase/migrations/20260922225300_sicoob_approval_outbox_reconciliation.sql` |
| `reconcile_sicoob_approval_delivery` | A configuração do destino não está ativa. | `supabase/migrations/20260922225300_sicoob_approval_outbox_reconciliation.sql` |
| `archive_sicoob_approval_deliveries` | Tamanho de lote inválido. | `supabase/migrations/20260922225300_sicoob_approval_outbox_reconciliation.sql` |
| `preserve_sicoob_artwork_requirement` | A exigência de arte de um pedido personalizado não pode ser removida. | `supabase/migrations/20260922225400_sicoob_operational_integrity.sql` |
| `validate_sicoob_order_document` | A nota fiscal não possui inspeção limpa, íntegra e disponível. | `supabase/migrations/20260922225600_sicoob_document_quarantine_gate.sql` |
| `validate_sicoob_order_document` | O comprovante não possui inspeção limpa, íntegra e disponível. | `supabase/migrations/20260922225600_sicoob_document_quarantine_gate.sql` |
| `ensure_default_favorite_list` | favorite_list_actor_mismatch | `supabase/migrations/20260923112000_fix_connection_sync_and_favorites.sql` |
| `claim_sicoob_export_jobs` | service_role_required | `supabase/migrations/20260923130000_secure_sicoob_documents_and_exports.sql` |
| `retry_own_sicoob_export_job` | authentication_required | `supabase/migrations/20260923130000_secure_sicoob_documents_and_exports.sql` |
| `retry_own_sicoob_export_job` | export_job_not_retryable | `supabase/migrations/20260923130000_secure_sicoob_documents_and_exports.sql` |
| `enqueue_due_sicoob_scheduled_exports` | service_role_required | `supabase/migrations/20260923130000_secure_sicoob_documents_and_exports.sql` |
| `validate_quote_real_discount` | Desconto real (%.2f%%) excede o limite do vendedor e não possui aprovação vigente. | `supabase/migrations/20260927171216_quote_approval_security_hardening.sql` |
| `validate_status_fields` | Invalid quote status: % | `supabase/migrations/20260927200207_duplicate_order_atomic.sql` |
| `validate_status_fields` | Invalid order status: % | `supabase/migrations/20260927200207_duplicate_order_atomic.sql` |
| `validate_status_fields` | Invalid fulfillment status: % | `supabase/migrations/20260927200207_duplicate_order_atomic.sql` |
| `validate_status_fields` | Invalid kit status: % | `supabase/migrations/20260927200207_duplicate_order_atomic.sql` |
| `validate_status_fields` | Invalid kit status: % | `supabase/migrations/20260927200207_duplicate_order_atomic.sql` |
| `validate_status_fields` | Invalid approval token status: % | `supabase/migrations/20260927200207_duplicate_order_atomic.sql` |
| `validate_main_order_status_transition` | Transição de status inválida no workflow: de % para % | `supabase/migrations/20260927200207_duplicate_order_atomic.sql` |
| `validate_order_fulfillment_transition` | Transição de fulfillment inválida: % -> % | `supabase/migrations/20260927200207_duplicate_order_atomic.sql` |
| `auto_revoke_orphan_full_keys` | invalid source: % | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `lookup_request_id` | forbidden | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `lookup_request_id` | invalid_request_id | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `request_step_up_challenge` | unauthorized: no session | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `request_step_up_challenge` | forbidden: dev role required | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `request_step_up_challenge` | rate_limited: too many step-up requests | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `verify_step_up_otp` | unauthorized | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `verify_step_up_otp` | invalid_or_expired_challenge | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `verify_step_up_otp` | password_not_verified_first | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `verify_step_up_otp` | max_attempts_exceeded | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `verify_step_up_otp` | invalid_otp | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `preserve_catalog_marketing_term_authorship` | created_by é imutável em catalog_marketing_terms | `supabase/migrations/20261014151000_harden_catalog_marketing_authorship.sql` |
| `check_ai_quota` | ai_quota_actor_mismatch | `supabase/migrations/20261117183000_ai_quota_count_billed_interrupts.sql` |
| `acquire_ai_quota` | ai_quota_service_only | `supabase/migrations/20261117183000_ai_quota_count_billed_interrupts.sql` |
| `set_custom_kit_pinned` | Autenticação obrigatória. | `supabase/migrations/20261118130400_pin_custom_kit_atomically.sql` |
| `set_custom_kit_pinned` | Kit não encontrado. | `supabase/migrations/20261118130400_pin_custom_kit_atomically.sql` |
| `set_custom_kit_pinned` | Kit fora do escopo do usuário. | `supabase/migrations/20261118130400_pin_custom_kit_atomically.sql` |
| `register_sicoob_clean_document` | O registro exige o verificador interno. | `supabase/migrations/20261118130700_bind_sicoob_scan_evidence_hash.sql` |
| `register_sicoob_clean_document` | Ator sem acesso ao pedido. | `supabase/migrations/20261118130700_bind_sicoob_scan_evidence_hash.sql` |
| `register_sicoob_clean_document` | Evidência de inspeção inválida. | `supabase/migrations/20261118130700_bind_sicoob_scan_evidence_hash.sql` |
| `register_sicoob_clean_document` | Tipo detectado, finalidade e caminho final divergem. | `supabase/migrations/20261118130700_bind_sicoob_scan_evidence_hash.sql` |
| `register_sicoob_clean_document` | Os objetos de quarentena e promoção não correspondem à evidência. | `supabase/migrations/20261118130700_bind_sicoob_scan_evidence_hash.sql` |
| `tg_pa_budget_entries_immutable` | O livro de verba é imutável; registre um evento de estorno ou ajuste. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `tg_pa_budget_entries_competencia_aberta` | Competência %/% fechada; movimentos de verba estão bloqueados. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_id_for_order` | Sem permissao para consultar a verba do pedido %. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_apply_state` | Estado de verba inválido: % | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_apply_state` | Pedido % inexistente ou sem PA. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_apply_state` | Pedido % não possui verba configurada para a competência. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_apply_state` | Competência %/% fechada; não é possível movimentar verba. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_apply_state` | Saldo insuficiente na competência %/%: disponível %, solicitado %. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_move_order` | Sem permissao para movimentar a verba do pedido %. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_move_order` | Pedido % inexistente. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_close_competence` | Apenas admin ou gestor de compras do PA pode fechar competência. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_close_competence` | Verba do PA % na competência %/% não existe. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_reconcile` | Sem permissao para conciliar a verba do PA %. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_replace_allocations` | Pedido % nao encontrado ou sem permissao para ratear. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_replace_allocations` | Pedido % nao encontrado ou sem permissao para ratear. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_replace_allocations` | Cada centro de custo pode aparecer uma unica vez no rateio. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_replace_allocations` | Cada linha do rateio precisa de centro de custo e valor. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_replace_allocations` | Centro de custo % nao pertence a cooperativa do pedido. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_validate_allocations` | Rateio do pedido % soma %, mas o pedido vale %. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `pa_budget_validate_allocations` | Rateio do pedido % esta em % por cento; precisa fechar em 100. | `supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql` |
| `validate_scheduled_report_email` | email_to must match your registered email address | `supabase/migrations/20261122210000_allow_worker_deactivate_revoked_report.sql` |

## E. Estados, máquinas de estado e transições

### E.1 Colunas de status no banco

| Tabela | Coluna | Valores permitidos (enum/CHECK) | Default |
|---|---|---|---|
| `products` | `stock_status` | **livre (sem enum/CHECK)** | `in-stock` |
| `quotes` | `status` | **livre (sem enum/CHECK)** | `draft` |
| `bitrix_deals` | `stage` | **livre (sem enum/CHECK)** |  |
| `bitrix_sync_logs` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `product_sync_logs` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `quote_approval_tokens` | `status` | **livre (sem enum/CHECK)** | `active` |
| `orders` | `status` | `aprovado_gestor`, `cancelado`, `concluido`, `em_producao`, `em_separacao`, `em_transporte`, `entregue`, `enviado_gestor`, `enviado_vendedor`, `rascunho` | `rascunho` |
| `orders` | `fulfillment_status` | `fulfilled`, `partially_fulfilled`, `unfulfilled` | `unfulfilled` |
| `sync_jobs` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `user_onboarding` | `current_step` | **livre (sem enum/CHECK)** | `0` |
| `password_reset_requests` | `status` | `approved`, `pending`, `rejected` | `pending` |
| `companies` | `estado` | **livre (sem enum/CHECK)** |  |
| `companies` | `status` | **livre (sem enum/CHECK)** | `ativo` |
| `company_addresses` | `estado` | **livre (sem enum/CHECK)** |  |
| `future_stock_entries` | `status` | `cancelled`, `completed`, `confirmed`, `in_transit`, `partial`, `pending` | `pending` |
| `simulator_wizard_drafts` | `wizard_step` | **livre (sem enum/CHECK)** | `product` |
| `seller_carts` | `status` | **livre (sem enum/CHECK)** | `novo` |
| `magic_up_generations` | `status` | **livre (sem enum/CHECK)** | `draft` |
| `city_whitelist` | `state` | **livre (sem enum/CHECK)** |  |
| `access_blocked_log` | `state` | **livre (sem enum/CHECK)** |  |
| `custom_kits` | `status` | **livre (sem enum/CHECK)** | `draft` |
| `kit_share_tokens` | `status` | **livre (sem enum/CHECK)** | `active` |
| `ai_usage_logs` | `status` | **livre (sem enum/CHECK)** | `success` |
| `discount_approval_requests` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `external_connections` | `status` | `active`, `degraded`, `disabled`, `error`, `unconfigured` | `unconfigured` |
| `magic_up_campaigns` | `status` | **livre (sem enum/CHECK)** | `draft` |
| `magic_up_public_shares` | `status` | **livre (sem enum/CHECK)** | `active` |
| `optimization_queue` | `status` | `blocked`, `done`, `failed`, `pending`, `running`, `skipped` | `pending` |
| `optimization_queue` | `guardrail_status` | **livre (sem enum/CHECK)** |  |
| `optimization_queue_runs` | `status` | **livre (sem enum/CHECK)** |  |
| `optimization_queue_runs` | `guardrail_status` | **livre (sem enum/CHECK)** |  |
| `external_connections_sync_log` | `status` | **livre (sem enum/CHECK)** | `ok` |
| `role_migration_batches` | `status` | `pending`, `running`, `completed`, `failed`, `partial`, `dry_run` | `pending` |
| `role_migration_items` | `status` | `pending`, `success`, `failed`, `skipped`, `dry_run` | `pending` |
| `e2e_cleanup_audit` | `status` | `error`, `forbidden`, `invalid`, `not_found`, `ok`, `rate_limited`, `unauthorized` |  |
| `webhook_delivery_metrics` | `http_status` | **livre (sem enum/CHECK)** |  |
| `sicoob_orders` | `status` | **livre (sem enum/CHECK)** | `draft` |
| `sicoob_orders` | `sla_status` | `critical`, `normal`, `warning` | `normal` |
| `sicoob_order_history` | `previous_status` | **livre (sem enum/CHECK)** |  |
| `sicoob_order_history` | `new_status` | **livre (sem enum/CHECK)** |  |
| `sicoob_approval_requests` | `status` | `approved`, `pending`, `rejected` | `pending` |
| `sicoob_rls_audit_logs` | `status` | **livre (sem enum/CHECK)** |  |
| `order_invoices` | `status` | **livre (sem enum/CHECK)** | `active` |
| `order_payments` | `payment_status` | **livre (sem enum/CHECK)** | `pending` |
| `order_pilot_approvals` | `status` | `approved`, `pending`, `rejected`, `revision` | `pending` |
| `order_logistics` | `delivery_status` | **livre (sem enum/CHECK)** | `pending` |
| `logistics_tracking` | `status` | **livre (sem enum/CHECK)** |  |
| `order_consolidations` | `status` | **livre (sem enum/CHECK)** | `draft` |
| `quote_consolidations` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `notifications` | `delivery_status` | **livre (sem enum/CHECK)** |  |
| `export_jobs` | `status` | `completed`, `failed`, `pending`, `processing` | `pending` |
| `export_audit_log` | `status` | **livre (sem enum/CHECK)** |  |
| `campaigns` | `status` | `active`, `completed`, `draft`, `paused` | `draft` |
| `pontos_atendimento` | `state` | **livre (sem enum/CHECK)** |  |
| `limit_increase_requests` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `qa_runs` | `status` | `blocked`, `fail`, `pass`, `running` |  |
| `qa_releases` | `status` | **livre (sem enum/CHECK)** |  |
| `qa_run_steps` | `step_name` | **livre (sem enum/CHECK)** |  |
| `qa_run_steps` | `status` | `blocked`, `fail`, `pass`, `pending` | `pending` |
| `notification_digests` | `status` | `failed`, `pending`, `processing`, `sent` | `pending` |
| `scheduled_notifications` | `status` | `cancelled`, `failed`, `scheduled`, `sent` | `scheduled` |
| `notification_logs` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log` | `status` | **livre (sem enum/CHECK)** |  |
| `sicoob_order_shipments` | `status` | `delivered`, `in_transit`, `pending` | `pending` |
| `sicoob_order_payments` | `status` | `cancelled`, `overdue`, `paid`, `pending`, `refunded` | `pending` |
| `sicoob_order_artwork_versions` | `status` | `approved`, `pending`, `rejected`, `revision` | `pending` |
| `sicoob_approval_deliveries` | `state` | `) OR (last_error_code IS NOT NULL AND btrim(last_error_code) <> `, `)) AND (state NOT IN (`, `,`, `cancelled`, `delivered`, `failed`, `pending`, `retry`, `sending`, `uncertain` | `pending` |
| `sicoob_approval_worker_dispatches` | `state` | `failed`, `queued`, `succeeded`, `timed_out` | `queued` |
| `sicoob_document_registry` | `status` | `clean` |  |
| `sicoob_invitations` | `status` | `accepted`, `pending`, `revoked`, `superseded` | `pending` |
| `pa_budget_entries` | `estado` | `comprometido`, `consumido`, `reservado` |  |
| `admin_audit_log_default` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2024` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2025` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m01` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m02` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m03` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m04` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m05` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m06` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m07` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m08` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m09` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m10` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m11` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2026_m12` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2027_m01` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2027_m02` | `status` | **livre (sem enum/CHECK)** |  |
| `admin_audit_log_y2027_m03` | `status` | **livre (sem enum/CHECK)** |  |
| `v_full_scope_grants` | `step_up_action` | `promote_dev`, `demote_dev`, `mcp_full_issue`, `mcp_full_escalate`, `secret_rotation`, `secret_revoke`, `mcp_key_revoke`, `mcp_key_rotate` |  |

### E.2 Mapas de transição declarados no código

- **VALID_TRANSITIONS** (`src/constants/orders.ts`):
  ```ts
  rascunho: ["enviado_gestor", "cancelado"], enviado_gestor: ["aprovado_gestor", "rascunho", "cancelado"], aprovado_gestor: ["enviado_vendedor", "cancelado"], enviado_vendedor: ["em_producao", "cancelado"], em_producao: ["em_separacao", "cancelado"], em_separacao: ["em_transporte", "cancelado"], em_transporte: ["entregue", "cancelado"], entregue: ["concluido", "cancelado"], concluido: [], cancelado: [],
  ```
- **SICOOB_VALID_TRANSITIONS** (`src/types/sicoob/orders.ts`):
  ```ts
  draft: ["pending", "cancelled"], pending: ["waiting_approval", "cancelled"], waiting_approval: ["confirmed", "rejected", "escalated_to_board", "cancelled"], escalated_to_board: ["confirmed", "rejected", "cancelled"], confirmed: ["in_production", "logistic", "cancelled"], logistic: ["completed", "cancelled"], in_production: ["in_separation", "cancelled"], in_separation: ["in_transit", "cancelled"], in_transit: ["delivered", "cancelled"], delivered: ["completed", "cancelled"], rejected: ["draft", "pending"], completed: [], cancelled: [],
  ```

### E.3 Valores de status usados no código (escreve / compara / filtra)

| Campo | Valor | Uso | Onde |
|---|---|---|---|
| `type` | `ADD_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `ADD_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `ALL` | compara, escreve | `src/pages/admin/AdminAuditPage.tsx` |
| `type` | `CANCEL_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `CLEAR_OLD_CACHES` | compara, escreve | `public/sw.js`<br>`src/lib/sw-register.ts` |
| `type` | `CRITICAL_ERRORS` | escreve | `supabase/functions/qa-block-monitor/index.ts` |
| `type` | `Column` | escreve | `src/components/quotes/QuoteKanbanBoard.tsx` |
| `type` | `DELETE` | escreve | `tests/scenarios/notificacoes-aprovacao.mjs` |
| `type` | `DISMISS_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `DUPLICATE_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `EDIT_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `INSERT` | compara, escreve | `supabase/functions/sicoob-approval-notifications/index.ts`<br>`tests/scenarios/notificacoes-aprovacao.mjs` |
| `type` | `RECALC_PERSONALIZATION_PRICING` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `REMOVE_ALL_PERSONALIZATIONS` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `REMOVE_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `REMOVE_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `RESET_WIZARD` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `RLS_VIOLATION` | escreve | `supabase/functions/qa-block-monitor/index.ts` |
| `type` | `SELECT_COMPARISON` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SELECT_LOCATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SELECT_PRODUCT` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_AVAILABLE_LOCATIONS` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_CALCULATING` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_COMPARISON_RESULTS` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_ERROR` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_QUANTITY` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SET_STEP` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `SKIP_WAITING` | compara, escreve | `public/sw.js`<br>`src/lib/sw-register.ts` |
| `type` | `START_NEW_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `TELEMETRY_OFFLINE` | escreve | `supabase/functions/qa-block-monitor/index.ts` |
| `type` | `UPDATE_PERSONALIZATION` | compara, escreve | `src/hooks/simulator/useWizardPricing.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `UPDATE_SPECS` | compara, escreve | `src/hooks/simulator/useSimulatorWizard.ts`<br>`src/hooks/simulator/wizardReducer.ts`<br>`src/types/domain/simulator-wizard.ts` |
| `type` | `UPDATE_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `__REDO__` | compara, escreve | `src/hooks/simulator/useUndoRedo.ts` |
| `type` | `__UNDO__` | compara, escreve | `src/hooks/simulator/useUndoRedo.ts` |
| `type` | `action` | compara, escreve | `src/components/search/GlobalSearchIdleState.tsx`<br>`src/hooks/useContextualSuggestions.ts` |
| `type` | `actions` | compara, escreve | `supabase/functions/_shared/approval-delivery.ts`<br>`tests/scenarios/notificacoes-aprovacao.mjs` |
| `type` | `add` | compara, escreve | `src/components/cart/CartUtilComponents.tsx` |
| `type` | `add_position` | escreve | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `type` | `agent` | compara, escreve | `src/components/workflows/WorkflowCanvas.tsx`<br>`src/components/workflows/WorkflowEditDialog.tsx` |
| `type` | `apparel` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `array` | escreve | `src/components/admin/products/bulk-import/StepUpload.tsx`<br>`src/hooks/useBulkImportFile.ts`<br>`src/lib/admin-export-utils.ts`<br>`supabase/functions/comparison-ai-advisor/index.ts`<br>`supabase/functions/kit-ai-builder/index.ts`<br>… +3 |
| `type` | `auth_error` | escreve | `tests/p0/_mocks.ts` |
| `type` | `bag` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `best` | compara | `src/components/compare/ComparisonHighlights.tsx` |
| `type` | `best-seller` | escreve | `src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `binary` | escreve | `src/components/admin/common/ImportExportManager.tsx` |
| `type` | `bitrix24` | compara, escreve | `src/components/admin/connections/SecretField.tsx`<br>`supabase/functions/_shared/connection-test-runner.ts` |
| `type` | `blob` | escreve | `src/utils/quoteExportUtils.ts` |
| `type` | `boolean` | compara, escreve | `src/lib/telemetry/bridgeCallMetrics.ts`<br>`supabase/functions/voice-agent/systemPrompt.ts` |
| `type` | `bottle` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `box` | compara | `src/lib/external-db/products.ts` |
| `type` | `bulk` | compara, escreve | `src/components/admin/products/image-gallery/ProductImageGallery.tsx` |
| `type` | `button` | escreve | `supabase/functions/_shared/approval-delivery.ts` |
| `type` | `category` | compara, escreve | `src/components/search/AdvancedSearch.tsx`<br>`src/components/search/SearchResultGroups.tsx`<br>`src/hooks/useSearch.ts`<br>`src/pages/Index.tsx`<br>`src/pages/filters/useFiltersPageState.ts` |
| `type` | `cif` | compara | `src/components/pdf/ProposalHtmlTemplate.tsx`<br>`src/components/quotes/QuoteTotalsSummary.tsx` |
| `type` | `client` | compara, escreve | `src/components/search/useGlobalSearch.ts` |
| `type` | `complementary` | escreve | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `type` | `critical` | compara, escreve | `src/components/inventory/StockAlertDialogs.tsx`<br>`src/components/orders/SmartAlertsPanel.tsx`<br>`src/hooks/stock/stockAlerts.ts`<br>`src/hooks/usePushNotifications.tsx` |
| `type` | `degraded` | compara, escreve | `src/hooks/useBridgeStatusBanner.ts`<br>`src/lib/external-db/bridge-status-events.ts`<br>`src/lib/external-db/cold-start-recorder.ts`<br>`src/lib/external-db/health-check.ts`<br>`src/lib/external-db/invoke.ts` |
| `type` | `depleted` | compara, escreve | `src/components/inventory/risk/RiskTooltip.tsx` |
| `type` | `dragenter` | compara | `src/components/search/VisualSearchButton.tsx` |
| `type` | `dragover` | compara | `src/components/search/VisualSearchButton.tsx` |
| `type` | `drinkware` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `duplicate` | compara, escreve | `src/components/cart/CartUtilComponents.tsx`<br>`src/pages/seller-carts/useSellerCartsPage.ts` |
| `type` | `email` | compara, escreve | `src/components/admin/common/ImportExportManager.tsx`<br>`src/pages/admin/AdminNewsletterPage.tsx` |
| `type` | `emergente` | escreve | `src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `error` | compara, escreve | `src/components/a11y/AriaLive.tsx`<br>`src/components/admin/connections/useIncidentTimeline72h.ts`<br>`src/components/admin/connections/useRecentIncidents.ts`<br>`src/components/debug/APIInspector.tsx`<br>`src/components/dev/DiagnosticOverlay.tsx`<br>… +3 |
| `type` | `event` | compara | `src/lib/diagnostics.ts` |
| `type` | `excel` | compara, escreve | `src/pages/OrdersPage.tsx` |
| `type` | `featured` | escreve | `src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `filter` | compara, escreve | `src/components/search/GlobalSearchIdleState.tsx`<br>`src/hooks/useContextualSuggestions.ts`<br>`src/hooks/useVoiceCommandHistory.ts` |
| `type` | `fob` | compara | `src/components/pdf/ProposalHtmlTemplate.tsx`<br>`src/components/quotes/QuoteTotalsSummary.tsx` |
| `type` | `fob_pre` | compara | `src/components/pdf/ProposalHtmlTemplate.tsx`<br>`src/components/quotes/QuoteTotalsSummary.tsx` |
| `type` | `function` | escreve | `supabase/functions/comparison-ai-advisor/index.ts`<br>`supabase/functions/generate-product-seo/index.ts`<br>`supabase/functions/kit-ai-builder/index.ts`<br>`supabase/functions/kit-identity-suggest/index.ts`<br>`supabase/functions/market-intelligence-insights/index.ts`<br>… +3 |
| `type` | `headwear` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `history` | compara, escreve | `src/components/catalog/CatalogHeader.tsx`<br>`src/components/search/AdvancedSearch.tsx`<br>`src/components/search/SearchResultGroups.tsx`<br>`src/components/search/SmartSearchInput.tsx`<br>`src/hooks/useSearch.ts` |
| `type` | `image_url` | escreve | `supabase/functions/analyze-logo-colors/index.ts`<br>`supabase/functions/generate-ad-image/index.ts`<br>`supabase/functions/generate-mockup/index.ts`<br>`supabase/functions/magic-up-score/index.ts`<br>`supabase/functions/visual-search/index.ts` |
| `type` | `info` | compara, escreve | `src/components/dev/AuthDiagnosticsWidget.tsx`<br>`src/hooks/bi/useSeasonalPeakNotifications.ts`<br>`src/hooks/bi/useSmartAlerts.ts`<br>`src/hooks/usePushNotifications.tsx`<br>`src/hooks/useWorkspaceNotifications.tsx`<br>… +4 |
| `type` | `json_object` | escreve | `supabase/functions/ai-recommendations/index.ts` |
| `type` | `kit` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `last-units` | escreve | `src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `list` | escreve | `src/hooks/useProductRegistration.ts` |
| `type` | `low_stock` | compara, escreve | `src/components/inventory/StockAlertDialogs.tsx`<br>`src/hooks/stock/stockAlerts.ts` |
| `type` | `main` | compara | `src/lib/external-db/products.ts` |
| `type` | `mcp` | compara, escreve | `src/components/admin/connections/SecretField.tsx`<br>`supabase/functions/_shared/connection-test-runner.ts` |
| `type` | `mixed` | compara, escreve | `src/components/search/GlobalSearchPaletteView.tsx`<br>`src/components/search/useGlobalSearch.ts`<br>`supabase/functions/semantic-search/index.ts` |
| `type` | `monthly` | compara, escreve | `src/hooks/useSalesGoals.ts` |
| `type` | `move` | compara, escreve | `src/components/cart/CartUtilComponents.tsx`<br>`src/pages/seller-carts/useSellerCartsPage.ts` |
| `type` | `n8n` | compara, escreve | `src/components/admin/connections/SecretField.tsx`<br>`supabase/functions/_shared/connection-test-runner.ts` |
| `type` | `navigation` | compara, escreve | `src/components/search/GlobalSearchIdleState.tsx`<br>`src/hooks/useContextualSuggestions.ts` |
| `type` | `neutral` | compara, escreve | `src/components/compare/ComparisonHighlights.tsx` |
| `type` | `new` | compara, escreve | `src/components/inventory/StockAlertsIndicator.tsx` |
| `type` | `new-arrival` | escreve | `src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `normal` | escreve | `src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `notebook` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `number` | compara, escreve | `src/components/admin/categories/CategoriesManager.tsx`<br>`src/components/admin/common/ImportExportManager.tsx`<br>`src/components/admin/products/ProductFormFullscreen.tsx`<br>`src/components/admin/products/SupplierFiscalInfo.tsx`<br>`src/hooks/useProductRegistration.ts`<br>… +4 |
| `type` | `object` | compara, escreve | `src/lib/telemetry/bridgeCallMetrics.ts`<br>`supabase/functions/comparison-ai-advisor/index.ts`<br>`supabase/functions/generate-product-seo/index.ts`<br>`supabase/functions/kit-ai-builder/index.ts`<br>`supabase/functions/kit-identity-suggest/index.ts`<br>… +5 |
| `type` | `on-sale` | escreve | `src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `opaque` | compara | `public/sw.js` |
| `type` | `out_of_stock` | compara, escreve | `src/components/inventory/StockAlertDialogs.tsx`<br>`src/hooks/stock/stockAlerts.ts` |
| `type` | `pen` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `percent` | compara | `src/components/quotes/QuoteSummary.tsx` |
| `type` | `performance` | compara | `src/lib/diagnostics.ts` |
| `type` | `plain_text` | escreve | `supabase/functions/_shared/approval-delivery.ts` |
| `type` | `popular` | escreve | `src/hooks/useProductIntelligenceBadges.ts` |
| `type` | `price_drop` | escreve | `supabase/functions/comparison-price-watcher/index.ts` |
| `type` | `product` | compara, escreve | `src/components/command/commandActions.tsx`<br>`src/components/search/AdvancedSearch.tsx`<br>`src/components/search/SearchResultGroups.tsx`<br>`src/components/search/useGlobalSearch.ts`<br>`src/hooks/useSearch.ts`<br>… +2 |
| `type` | `promotion` | escreve | `src/components/search/SmartSuggestions.tsx` |
| `type` | `qty` | compara, escreve | `src/components/cart/CartUtilComponents.tsx`<br>`src/pages/seller-carts/useSellerCartsPage.ts` |
| `type` | `quantity_tier` | escreve | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `type` | `quarterly` | compara | `src/hooks/useSalesGoals.ts` |
| `type` | `quote` | escreve | `src/hooks/useProductInsights.ts` |
| `type` | `quote_comment` | escreve | `src/hooks/useQuoteComments.ts` |
| `type` | `react_error_boundary` | escreve | `src/components/common/ErrorBoundary.tsx`<br>`src/components/errors/EnhancedErrorBoundary.tsx` |
| `type` | `recent` | escreve | `src/components/search/SmartSuggestions.tsx` |
| `type` | `recommended` | escreve | `src/components/search/SmartSuggestions.tsx` |
| `type` | `recovered` | compara, escreve | `src/hooks/useBridgeStatusBanner.ts`<br>`src/lib/error-reporter.ts`<br>`src/lib/external-db/bridge-status-events.ts`<br>`src/lib/external-db/bridge-telemetry-client.ts`<br>`src/lib/external-db/cold-start-recorder.ts`<br>… +2 |
| `type` | `related` | escreve | `src/components/search/SmartSuggestions.tsx` |
| `type` | `remove` | compara, escreve | `src/components/cart/CartUtilComponents.tsx`<br>`src/pages/seller-carts/useSellerCartsPage.ts` |
| `type` | `request` | compara | `src/components/dev/DiagnosticOverlay.tsx`<br>`src/lib/diagnostics.ts` |
| `type` | `response` | compara | `src/components/dev/DiagnosticOverlay.tsx`<br>`src/lib/diagnostics.ts` |
| `type` | `restocked` | compara, escreve | `src/components/inventory/StockAlertsIndicator.tsx` |
| `type` | `rotate` | compara | `src/components/admin/connections/RotationHistoryDialog.tsx` |
| `type` | `runtime` | escreve | `src/hooks/useErrorHandler.ts` |
| `type` | `search` | compara, escreve | `src/components/search/GlobalSearchIdleState.tsx`<br>`src/hooks/useContextualSuggestions.ts` |
| `type` | `section` | escreve | `supabase/functions/_shared/approval-delivery.ts` |
| `type` | `security` | compara, escreve, filtra | `src/components/security/useSecurityData.ts`<br>`src/hooks/usePushNotifications.tsx`<br>`src/lib/diagnostics.ts`<br>`supabase/functions/detect-new-device/index.ts` |
| `type` | `set` | escreve | `src/components/admin/connections/RotationHistoryDialog.tsx` |
| `type` | `single` | compara, escreve | `src/components/admin/products/image-gallery/ProductImageGallery.tsx`<br>`src/components/admin/products/image-gallery/useProductImageGallery.ts` |
| `type` | `solid` | escreve | `src/lib/bi/pptxGenerator.ts` |
| `type` | `spring` | escreve | `src/components/admin/connections/RotateSecretConfirmDialog.tsx`<br>`src/components/admin/connections/SaveSecretConfirmDialog.tsx`<br>`src/components/catalog/CatalogToolbar.tsx`<br>`src/components/collections/AddToCollectionModal.tsx`<br>`src/components/collections/CollectionDetailHeader.tsx`<br>… +31 |
| `type` | `stock` | compara, escreve | `src/components/inventory/StockAlertsIndicator.tsx` |
| `type` | `stockout_predicted` | escreve | `src/hooks/stock/stockAlerts.ts` |
| `type` | `string` | compara, escreve | `src/lib/error-reporter.ts`<br>`src/lib/telemetry/bridgeCallMetrics.ts`<br>`supabase/functions/comparison-ai-advisor/index.ts`<br>`supabase/functions/generate-product-seo/index.ts`<br>`supabase/functions/kit-ai-builder/index.ts`<br>… +6 |
| `type` | `success` | escreve | `src/components/a11y/AriaLive.tsx`<br>`src/hooks/bi/useSmartAlerts.ts`<br>`supabase/functions/collections-watcher/index.ts`<br>`supabase/functions/favorites-watcher/index.ts`<br>`supabase/functions/process-batch-export/index.ts` |
| `type` | `supabase` | compara, escreve | `src/components/admin/connections/SecretField.tsx`<br>`src/hooks/useConnectionsOverview.ts`<br>`src/hooks/useConsecutiveFailures.ts`<br>`src/pages/admin/AdminConexoesStatusPage.tsx`<br>`supabase/functions/_shared/connection-test-runner.ts` |
| `type` | `supplier` | compara, escreve | `src/components/search/AdvancedSearch.tsx`<br>`src/components/search/SearchResultGroups.tsx`<br>`src/hooks/useSearch.ts`<br>`src/pages/Index.tsx` |
| `type` | `system` | escreve | `supabase/functions/error-monitor/index.ts` |
| `type` | `tag` | escreve | `tests/a11y/axe-helper.ts` |
| `type` | `tech` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `technique_upgrade` | escreve | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `type` | `text` | escreve | `src/components/admin/InlineEditField.tsx`<br>`src/hooks/useProductRegistration.ts`<br>`supabase/functions/analyze-logo-colors/index.ts`<br>`supabase/functions/generate-ad-image/index.ts`<br>`supabase/functions/generate-mockup/index.ts`<br>… +3 |
| `type` | `textile` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `toggle_active` | compara, escreve | `src/components/admin/products/useProductVariants.ts`<br>`src/components/products/VariantGridMatrix.tsx` |
| `type` | `tool` | compara | `src/components/workflows/WorkflowCanvas.tsx` |
| `type` | `transient_edge_runtime` | escreve | `src/lib/error-reporter.ts` |
| `type` | `trending` | escreve | `src/components/search/SmartSuggestions.tsx` |
| `type` | `umbrella` | escreve | `supabase/functions/generate-ad-image/index.ts` |
| `type` | `unavailable` | compara, escreve | `src/hooks/useBridgeStatusBanner.ts`<br>`src/lib/external-db/bridge-status-events.ts`<br>`src/lib/external-db/bridge-telemetry-client.ts`<br>`src/lib/external-db/cold-start-recorder.ts`<br>`src/lib/external-db/health-check.ts`<br>… +1 |
| `type` | `unhandled_error` | escreve | `src/lib/error-reporter.ts`<br>`src/main.tsx` |
| `type` | `unhandled_error_global` | escreve | `src/hooks/useErrorHandler.ts` |
| `type` | `unhandled_promise_rejection` | escreve | `src/lib/error-reporter.ts`<br>`src/main.tsx` |
| `type` | `unhandled_rejection_global` | escreve | `src/hooks/useErrorHandler.ts` |
| `type` | `unknown` | escreve | `src/lib/telemetry/webVitals.ts` |
| `type` | `update_stock` | compara | `src/components/admin/products/useProductVariants.ts` |
| `type` | `view` | escreve | `src/hooks/useProductInsights.ts` |
| `type` | `warning` | compara, escreve | `src/components/admin/connections/useRecentIncidents.ts`<br>`src/components/orders/SmartAlertsPanel.tsx`<br>`src/hooks/bi/useSmartAlerts.ts`<br>`src/hooks/useDiscountApproval.ts`<br>`src/lib/access/log-access-denied.ts`<br>… +2 |
| `type` | `webhook_outbound` | compara | `supabase/functions/_shared/connection-test-runner.ts` |
| `type` | `weekly` | compara | `src/hooks/useSalesGoals.ts` |
| `type` | `xml` | escreve | `src/components/sicoob/orders/OrderInvoicesTab.tsx` |
| `role` | `admin` | compara, escreve, filtra | `src/components/admin/users/AccessManagement.tsx`<br>`src/hooks/useDiscountApproval.ts`<br>`src/hooks/useQuoteTemplates.ts`<br>`src/lib/access/role-policy.ts`<br>`src/lib/rbac/route-matrix.ts`<br>… +8 |
| `role` | `agent` | compara | `src/components/access/DevAccessDeniedPage.tsx` |
| `role` | `agente` | compara, escreve | `src/components/access/DevAccessDeniedPage.tsx`<br>`src/services/admin/UserService.ts`<br>`supabase/functions/sync-quote-bitrix/index.ts`<br>`tests/scenarios/email-transacional-legado.mjs` |
| `role` | `all` | compara, escreve | `src/pages/OrderAuditPage.tsx`<br>`src/pages/admin/AdminRbacRoutesPage.tsx` |
| `role` | `assistant` | compara, escreve | `src/components/ai/AIChat.tsx`<br>`src/components/bi/BIAiCopilot.tsx`<br>`src/components/expert/chat/ChatMessageList.tsx`<br>`src/components/expert/chat/useExpertChat.ts` |
| `role` | `authenticated` | escreve | `src/lib/rbac/route-matrix.ts` |
| `role` | `comprador_pac` | compara | `src/lib/auth/auth-utils.ts` |
| `role` | `comprador_singular` | compara, escreve | `src/lib/auth/auth-utils.ts`<br>`supabase/functions/sicoob-seed/index.ts` |
| `role` | `dev` | compara, escreve | `src/components/admin/users/AccessManagement.tsx`<br>`src/hooks/useRBAC.tsx`<br>`src/lib/auth/auth-utils.ts`<br>`src/lib/rbac/route-matrix.ts`<br>`src/pages/admin/AdminRbacRoutesPage.tsx`<br>… +5 |
| `role` | `gerente_pa` | compara, escreve | `src/lib/auth/auth-utils.ts`<br>`supabase/functions/sicoob-seed-qa/index.ts`<br>`supabase/functions/sicoob-seed/index.ts` |
| `role` | `gestor_compras` | compara, escreve | `src/lib/auth/auth-utils.ts`<br>`supabase/functions/sicoob-seed-qa/index.ts`<br>`supabase/functions/sicoob-seed/index.ts` |
| `role` | `gestor_pa` | escreve | `src/services/sicoob/userService.ts` |
| `role` | `gestor_singular` | escreve | `src/services/sicoob/userService.ts` |
| `role` | `manager` | compara, escreve | `src/components/admin/users/AccessManagement.tsx`<br>`src/hooks/useQuoteTemplates.ts`<br>`src/lib/access/role-policy.ts` |
| `role` | `owner` | escreve | `src/contexts/OrganizationContext.tsx` |
| `role` | `public` | compara, escreve | `src/lib/rbac/route-matrix.ts`<br>`src/pages/admin/AdminRbacRoutesPage.tsx` |
| `role` | `sicoob_central` | escreve | `src/components/auth/QuickTestLogin.tsx` |
| `role` | `sicoob_gestor` | escreve | `src/components/auth/QuickTestLogin.tsx` |
| `role` | `sicoob_pa` | escreve | `src/components/auth/QuickTestLogin.tsx` |
| `role` | `sicoob_singular` | escreve | `src/components/auth/QuickTestLogin.tsx` |
| `role` | `string` | compara | `src/components/access/DevAccessDeniedPage.tsx`<br>`supabase/functions/crm-db-bridge/index.ts` |
| `role` | `supervisor` | compara, escreve | `src/components/access/DevAccessDeniedPage.tsx`<br>`src/components/admin/users/AccessManagement.tsx`<br>`src/components/admin/users/PromotionDialog.tsx`<br>`src/hooks/useRBAC.tsx`<br>`src/lib/auth/auth-utils.ts`<br>… +5 |
| `role` | `system` | escreve | `supabase/functions/ai-recommendations/index.ts`<br>`supabase/functions/bi-copilot/index.ts`<br>`supabase/functions/comparison-ai-advisor/index.ts`<br>`supabase/functions/expert-chat/index.ts`<br>`supabase/functions/generate-ad-prompt/index.ts`<br>… +8 |
| `role` | `user` | compara, escreve | `src/components/ai/AIChat.tsx`<br>`src/components/bi/BIAiCopilot.tsx`<br>`src/components/expert/chat/ChatMessageList.tsx`<br>`src/components/expert/chat/useExpertChat.ts`<br>`src/hooks/useExpertConversations.tsx`<br>… +19 |
| `role` | `vendedor` | compara, escreve, filtra | `src/components/access/DevAccessDeniedPage.tsx`<br>`src/components/admin/SellerDiscountLimitsPanel.tsx`<br>`src/components/admin/users/AccessManagement.tsx`<br>`src/components/admin/users/CreateUserDialog.tsx`<br>`src/components/admin/users/PromotionDialog.tsx`<br>… +8 |
| `status` | `Achado` | compara, escreve | `src/pages/admin/AuditEvidenceDashboard.tsx` |
| `status` | `Pendente` | compara, escreve | `src/components/search/GlobalSearch.tsx`<br>`src/pages/admin/AuditEvidenceDashboard.tsx` |
| `status` | `SUBSCRIBED` | compara | `src/hooks/useRealtimeSync.ts` |
| `status` | `Status` | escreve | `src/components/audit/AuditHistory.tsx` |
| `status` | `accepted` | compara | `src/pages/sicoob/SicoobInvitationsPage.tsx` |
| `status` | `active` | compara, escreve, filtra | `src/components/admin/connections/Bitrix24Tab.tsx`<br>`src/components/admin/connections/ConnectionStatusBadge.tsx`<br>`src/components/admin/connections/DataSourceDebugTab.tsx`<br>`src/components/admin/connections/N8nTab.tsx`<br>`src/components/admin/security/SuspiciousTokensPanel.tsx`<br>… +16 |
| `status` | `aging` | compara | `src/components/products/PriceFreshnessBadge.tsx`<br>`src/utils/price-freshness.ts` |
| `status` | `alert_sent` | escreve | `supabase/functions/error-monitor/index.ts` |
| `status` | `alinhada` | escreve | `tests/scenarios/migration-ledger.mjs` |
| `status` | `all` | compara, escreve | `src/components/admin/connections/ConnectionsOverviewFilters.tsx`<br>`src/components/admin/security/keys/useMcpKeys.ts`<br>`src/components/dashboard/MyDiscountRequestsWidget.tsx`<br>`src/components/dashboard/MyPendingOrdersWidget.tsx`<br>`src/components/dashboard/MyRecentQuotesWidget.tsx`<br>… +11 |
| `status` | `approved` | compara, escreve | `src/components/admin/DiscountManagementPanel.tsx`<br>`src/components/admin/PasswordResetApproval.tsx`<br>`src/components/dashboard/QuickActionsPanel.tsx`<br>`src/components/orders/OrderPilotWorkflow.tsx`<br>`src/components/orders/PilotApprovalPanel.tsx`<br>… +23 |
| `status` | `approved_singular` | compara, filtra | `src/components/quotes/QuoteConvertToOrder.tsx`<br>`src/pages/QuotesListPage.tsx`<br>`src/services/QuoteService.ts` |
| `status` | `aprovado_gestor` | escreve | `src/pages/GestorApprovalsPage.tsx` |
| `status` | `blocked` | compara, escreve | `src/pages/admin/qa/QARunDetailPage.tsx`<br>`src/pages/admin/telemetry/useOptimizationQueue.ts`<br>`supabase/functions/process-scheduled-reports/index.ts`<br>`supabase/functions/send-scheduled-reports/index.ts`<br>`supabase/functions/send-scheduled-reports/report-delivery.ts` |
| `status` | `cancelado` | compara, escreve, filtra | `src/components/orders/OrderCard.tsx`<br>`src/hooks/bi/useClientBI.ts`<br>`src/hooks/useClientOrdersHistory.ts`<br>`src/hooks/useClientsPortfolioKpis.ts`<br>`src/pages/GestorApprovalsPage.tsx` |
| `status` | `cancelled` | compara, escreve | `src/components/admin/connections/IssueMcpKeyForm.tsx`<br>`src/components/admin/security/keys/RotateMcpKeyDialog.tsx`<br>`src/components/admin/security/keys/UpdateMcpKeyDialog.tsx`<br>`src/components/common/StatusTimeline.tsx`<br>`src/components/orders/OrderStatusTimeline.tsx`<br>… +6 |
| `status` | `clean` | compara | `supabase/functions/sicoob-document-ingest/registration-state.ts` |
| `status` | `client-only` | escreve | `src/components/bi/ClientCategoryRadar.tsx` |
| `status` | `complete` | compara | `src/components/mockup/GeneratingOverlay.tsx` |
| `status` | `completed` | compara, escreve, filtra | `src/components/orders/BatchExportDialog.tsx`<br>`src/components/orders/MultiLevelTracker.tsx`<br>`src/components/sicoob/orders/LogisticsCommandCenter.tsx`<br>`src/data/mockData.ts`<br>`src/hooks/sicoob/useAIOrderPredictor.ts`<br>… +9 |
| `status` | `concluido` | compara | `src/components/orders/OrderCard.tsx`<br>`src/components/orders/OrderStatsBar.tsx` |
| `status` | `confirmed` | escreve, filtra | `src/hooks/stock/stockFetcher.ts`<br>`src/pages/sicoob/GestorConsolidatedOrdersPage.tsx`<br>`src/pages/sicoob/orders/OrderDetailPage.tsx` |
| `status` | `connecting` | compara | `src/hooks/useVoiceAgent.ts` |
| `status` | `converted` | compara, filtra | `src/components/quote/MarginInsightBadge.tsx`<br>`src/components/quotes/QuoteCard.tsx`<br>`src/components/quotes/QuoteRowQuickActions.tsx`<br>`src/hooks/useQuoteFunnel.ts`<br>`src/pages/QuoteDetailPage.tsx`<br>… +1 |
| `status` | `crit` | compara | `src/components/admin/telemetry/PlatformFailureCards.tsx` |
| `status` | `critical` | compara | `src/components/inventory/StockDashboard.tsx`<br>`src/components/sicoob/orders/SLABadge.tsx`<br>`src/pages/sicoob/orders/OrdersKanbanPage.tsx`<br>`src/types/stock.ts` |
| `status` | `current` | compara | `src/components/mockup/GeneratingOverlay.tsx`<br>`src/components/orders/MultiLevelTracker.tsx`<br>`src/components/sicoob/orders/LogisticsCommandCenter.tsx` |
| `status` | `deactivated` | escreve | `supabase/functions/process-scheduled-reports/index.ts`<br>`supabase/functions/send-scheduled-reports/index.ts` |
| `status` | `degraded` | compara | `src/components/admin/telemetry/AppHealthDashboard.tsx`<br>`src/lib/external-db/invoke.ts` |
| `status` | `delivered` | compara, escreve | `src/components/common/StatusTimeline.tsx`<br>`src/pages/sicoob/LogisticsReportPage.tsx`<br>`src/services/sicoob/logisticsReportService.ts`<br>`supabase/functions/semantic-search/index.ts` |
| `status` | `denied` | compara, escreve, filtra | `src/components/admin/security/keys/audit/McpAuditRow.tsx`<br>`src/components/admin/security/keys/audit/useStepUpAttempts.ts`<br>`supabase/functions/mcp-keys-issue/index.ts`<br>`supabase/functions/mcp-keys-revoke/index.ts`<br>`supabase/functions/mcp-keys-rotate/index.ts`<br>… +3 |
| `status` | `destructive` | compara | `src/components/kit-builder/VolumeIndicator.tsx` |
| `status` | `digested` | escreve | `supabase/functions/send-notification/index.ts` |
| `status` | `disconnected` | compara | `src/hooks/useVoiceAgent.ts` |
| `status` | `done` | compara | `src/pages/admin/telemetry/useOptimizationQueue.ts` |
| `status` | `down` | compara | `src/components/system/CloudStatusBanner.tsx`<br>`src/hooks/useCloudStatus.ts`<br>`src/lib/external-db/invoke.ts` |
| `status` | `draft` | compara, escreve, filtra | `src/components/dashboard/MyRecentQuotesWidget.tsx`<br>`src/components/dashboard/RecentKitsWidget.tsx`<br>`src/components/expert/chat/useExpertChat.ts`<br>`src/components/magic-up/MagicUpCampaignPanel.tsx`<br>`src/components/quotes/QuoteBuilderSummaryColumn.tsx`<br>… +19 |
| `status` | `enviado_gestor` | filtra | `src/pages/GestorApprovalsPage.tsx`<br>`src/services/OrderService.ts` |
| `status` | `error` | compara, escreve | `src/components/admin/connections/IssueMcpKeyForm.tsx`<br>`src/components/admin/security/keys/RotateMcpKeyDialog.tsx`<br>`src/components/admin/security/keys/UpdateMcpKeyDialog.tsx`<br>`src/components/quotes/QuoteAutoSave.tsx`<br>`src/lib/auth/invoke-full-scope.ts`<br>… +15 |
| `status` | `escalated_to_board` | compara | `src/pages/sicoob/orders/OrderDetailPage.tsx`<br>`src/pages/sicoob/orders/OrdersPage.tsx` |
| `status` | `expired` | compara, escreve | `src/components/admin/security/SuspiciousTokensPanel.tsx`<br>`src/components/admin/security/keys/McpKeyDetailsDrawer.tsx`<br>`src/components/admin/security/keys/McpKeyRow.tsx`<br>`src/components/admin/security/keys/useMcpKeys.ts`<br>`src/components/pdf/PropostaComercialTailwind.tsx`<br>… +5 |
| `status` | `fail` | compara, escreve | `src/components/admin/connections/ConnectionTestHistoryPanel.tsx`<br>`src/hooks/useConnectionsOverviewFilters.ts`<br>`src/pages/admin/qa/QARunDetailPage.tsx`<br>`supabase/functions/full-op-diagnostics/index.ts` |
| `status` | `failed` | compara, escreve | `src/components/admin/CatalogQualityDashboard.tsx`<br>`src/components/admin/connections/SmokeTestChecklist.tsx`<br>`src/components/layout/sidebar/SidebarFooterHealth.tsx`<br>`src/components/orders/BatchExportDialog.tsx`<br>`src/components/orders/MultiLevelTracker.tsx`<br>… +6 |
| `status` | `failure` | filtra | `src/pages/admin/RLSAuditPage.tsx` |
| `status` | `forbidden` | escreve | `supabase/functions/e2e-cleanup/index.ts` |
| `status` | `fresh` | compara | `src/components/products/PriceFreshnessBadge.tsx` |
| `status` | `fulfilled` | compara | `src/components/admin/connections/CredentialsChangedBanner.tsx`<br>`src/components/admin/connections/GlobalRefreshFromDbButton.tsx`<br>`src/hooks/useCommercialIntelligence.ts`<br>`src/services/sicoob/orderService.ts` |
| `status` | `gap` | compara, escreve | `src/components/bi/ClientCategoryRadar.tsx` |
| `status` | `healthy` | compara, escreve | `src/components/admin/telemetry/AppHealthDashboard.tsx`<br>`src/hooks/useCloudStatus.ts`<br>`src/lib/cloud-status.ts`<br>`src/lib/diagnostics.ts`<br>`supabase/functions/system-healthcheck/index.ts` |
| `status` | `idle` | compara, escreve | `src/components/admin/connections/SmokeTestChecklist.tsx` |
| `status` | `in-stock` | compara | `src/components/compare/CompareTableView.tsx`<br>`src/components/compare/ComparisonRadarChart.tsx`<br>`src/components/compare/SupplierComparisonModal.tsx`<br>`src/components/products/ProductTableView.tsx`<br>`src/pages/ProductDetail.tsx`<br>… +1 |
| `status` | `in_progress` | escreve | `supabase/functions/bitrix-sync/index.ts` |
| `status` | `in_stock` | compara, escreve | `src/components/inventory/StockDashboard.tsx`<br>`src/components/simulator/StockAlert.tsx`<br>`src/types/stock.ts` |
| `status` | `in_transit` | compara | `src/pages/sicoob/LogisticsReportPage.tsx`<br>`src/services/sicoob/logisticsReportService.ts` |
| `status` | `incoming` | compara | `src/components/inventory/StockDashboard.tsx`<br>`src/hooks/useVariantStock.ts`<br>`src/types/stock.ts` |
| `status` | `insufficient_data` | escreve | `src/pages/admin/telemetry/useRegressionGuardrail.ts` |
| `status` | `invalid` | compara, escreve | `src/pages/PublicDossierPage.tsx`<br>`supabase/functions/e2e-cleanup/index.ts` |
| `status` | `loading` | compara, escreve | `src/components/ui/StatusBadge.tsx`<br>`src/pages/PublicDossierPage.tsx`<br>`src/pages/SystemStatusPage.tsx` |
| `status` | `local_sem_ledger` | escreve | `tests/scenarios/migration-ledger.mjs` |
| `status` | `logistic` | compara | `src/components/sicoob/orders/LogisticsCommandCenter.tsx`<br>`src/services/sicoob/logisticsReportService.ts` |
| `status` | `low-stock` | compara | `src/components/compare/CompareTableView.tsx`<br>`src/components/compare/ComparisonRadarChart.tsx`<br>`src/components/compare/StockRiskBadge.tsx`<br>`src/components/compare/SupplierComparisonModal.tsx`<br>`src/components/inventory/StockBadge.tsx`<br>… +4 |
| `status` | `low_stock` | compara | `src/components/inventory/StockDashboard.tsx`<br>`src/components/simulator/StockAlert.tsx`<br>`src/hooks/useVariantStock.ts`<br>`src/types/stock.ts` |
| `status` | `missing` | compara, escreve | `src/components/admin/connections/MaskedSuffixBadge.tsx`<br>`src/lib/masked-suffix.ts` |
| `status` | `nome_divergente` | escreve | `tests/scenarios/migration-ledger.mjs` |
| `status` | `normal` | escreve | `src/components/sicoob/orders/SLABadge.tsx` |
| `status` | `not_found` | escreve | `supabase/functions/e2e-cleanup/index.ts` |
| `status` | `novo` | escreve | `src/hooks/useSellerCarts.ts` |
| `status` | `number` | compara | `src/components/admin/ImageUploadButton.tsx`<br>`src/components/admin/connections/SecretsManagerHealthPanel.tsx`<br>`src/components/admin/connections/TestAllConnectionsButton.tsx`<br>`src/components/admin/telemetry/BridgeCallDetailDrawer.tsx`<br>`src/lib/error-kind-inference.ts`<br>… +1 |
| `status` | `offline` | compara | `src/components/quotes/QuoteAutoSave.tsx` |
| `status` | `ok` | compara, escreve | `src/components/admin/connections/ConnectionsOverviewFilters.tsx`<br>`src/components/admin/connections/KeysValidationTab.tsx`<br>`src/components/admin/connections/LastSyncRunPanel.tsx`<br>`src/components/admin/telemetry/PlatformFailureCards.tsx`<br>`src/hooks/useConnectionsOverviewFilters.ts`<br>… +8 |
| `status` | `order` | compara | `src/components/dashboard/MyClientsWidget.tsx` |
| `status` | `out-of-stock` | compara | `src/components/compare/ComparisonRadarChart.tsx`<br>`src/components/compare/StockRiskBadge.tsx`<br>`src/components/compare/SupplierComparisonModal.tsx`<br>`src/components/products/ProductListItem.tsx`<br>`src/components/products/ProductQuickView.tsx`<br>… +2 |
| `status` | `out_of_stock` | compara | `src/components/inventory/StockDashboard.tsx`<br>`src/components/simulator/StockAlert.tsx`<br>`src/hooks/stock/stockAlerts.ts`<br>`src/types/stock.ts` |
| `status` | `overdue` | compara | `src/components/sicoob/orders/OrderPaymentsTab.tsx` |
| `status` | `paid` | compara, escreve | `src/components/sicoob/orders/OrderPaymentsTab.tsx`<br>`src/hooks/orders/extensions/useOrderPayments.ts` |
| `status` | `partially_received` | compara | `src/pages/sicoob/GestorConsolidatedOrdersPage.tsx` |
| `status` | `pass` | compara, escreve | `src/pages/TestDashboard.tsx`<br>`src/pages/admin/qa/QARunDetailPage.tsx`<br>`supabase/functions/full-op-diagnostics/index.ts`<br>`supabase/functions/sicoob-seed-qa/index.ts` |
| `status` | `passed` | compara, escreve | `src/components/admin/connections/SmokeTestChecklist.tsx` |
| `status` | `paused` | compara | `src/pages/admin/AdminCampanhasPage.tsx` |
| `status` | `pending` | compara, escreve, filtra | `src/components/admin/DiscountApprovalHeaderBadge.tsx`<br>`src/components/admin/DiscountApprovalQueue.tsx`<br>`src/components/admin/DiscountManagementPanel.tsx`<br>`src/components/admin/PasswordResetApproval.tsx`<br>`src/components/dashboard/MyPendingOrdersWidget.tsx`<br>… +41 |
| `status` | `pending_approval` | compara | `src/components/quotes/QuoteKanbanBoard.tsx`<br>`src/components/quotes/QuoteManagerApprovalBanner.tsx`<br>`src/components/quotes/QuoteStatusTimeline.tsx`<br>`src/pages/QuoteViewPage.tsx` |
| `status` | `pending_seller` | compara | `src/pages/sicoob/GestorConsolidatedOrdersPage.tsx` |
| `status` | `pending_singular_approval` | compara, filtra | `src/components/layout/SidebarReorganized.tsx`<br>`src/components/quotes/QuoteNextActionBanner.tsx`<br>`src/components/quotes/QuoteSingularApprovalActions.tsx`<br>`src/components/quotes/QuoteStatusTimeline.tsx`<br>`src/pages/QuotesListPage.tsx` |
| `status` | `processing` | compara, filtra | `src/components/orders/BatchExportDialog.tsx`<br>`src/components/ui/StatusBadge.tsx`<br>`supabase/functions/process-batch-export/index.ts` |
| `status` | `pronto_orcamento` | compara | `src/components/cart/CartHealthChecklist.tsx` |
| `status` | `quote` | compara | `src/components/dashboard/MyClientsWidget.tsx` |
| `status` | `rascunho` | compara | `src/components/orders/OrderStatsBar.tsx` |
| `status` | `rate_limited` | escreve | `supabase/functions/e2e-cleanup/index.ts` |
| `status` | `received` | compara | `src/pages/sicoob/GestorConsolidatedOrdersPage.tsx` |
| `status` | `received_with_issues` | compara | `src/pages/sicoob/GestorConsolidatedOrdersPage.tsx` |
| `status` | `refunded` | compara | `src/components/sicoob/orders/OrderPaymentsTab.tsx` |
| `status` | `regression` | compara | `src/components/admin/telemetry/RegressionGuardrailBanner.tsx` |
| `status` | `rejected` | compara, escreve | `src/components/admin/DiscountManagementPanel.tsx`<br>`src/components/admin/PasswordResetApproval.tsx`<br>`src/components/dashboard/QuickActionsPanel.tsx`<br>`src/components/orders/OrderPilotWorkflow.tsx`<br>`src/components/orders/PilotApprovalPanel.tsx`<br>… +16 |
| `status` | `rejected_singular` | compara | `src/components/quotes/QuoteApprovalNotes.tsx`<br>`src/components/quotes/QuoteNextActionBanner.tsx`<br>`src/components/quotes/QuoteStatusTimeline.tsx` |
| `status` | `revision` | compara, escreve | `src/components/orders/OrderPilotWorkflow.tsx`<br>`src/components/orders/PilotApprovalPanel.tsx`<br>`src/components/sicoob/orders/OrderPilotApprovalsTab.tsx` |
| `status` | `revoked` | compara, escreve | `src/components/admin/security/keys/McpKeyRow.tsx`<br>`src/components/admin/security/keys/useMcpKeys.ts`<br>`src/components/kit-builder/KitShareLinkDialog.tsx`<br>`src/components/quotes/QuoteApprovalLinkCard.tsx`<br>`src/hooks/useKitShare.ts`<br>… +2 |
| `status` | `running` | compara, escreve | `src/components/admin/connections/SmokeTestChecklist.tsx`<br>`src/components/admin/telemetry/OptimizationQueuePanel.tsx`<br>`supabase/functions/sicoob-seed-qa/index.ts`<br>`tests/p0/_mocks.ts` |
| `status` | `saved` | compara | `src/components/quotes/QuoteAutoSave.tsx` |
| `status` | `saving` | compara | `src/components/quotes/QuoteAutoSave.tsx` |
| `status` | `scheduled` | compara, escreve | `src/components/settings/NotificationOmnichannelPanel.tsx`<br>`supabase/functions/send-notification/index.ts` |
| `status` | `scope_mismatch` | escreve | `supabase/functions/e2e-cleanup/index.ts` |
| `status` | `sem-comparativo` | compara | `src/components/bi/ClientCategoryRadar.tsx` |
| `status` | `sent` | compara, escreve, filtra | `src/components/dashboard/QuickActionsPanel.tsx`<br>`src/components/quotes/QuoteKanbanBoard.tsx`<br>`src/components/quotes/QuoteNextActionBanner.tsx`<br>`src/components/settings/NotificationOmnichannelPanel.tsx`<br>`src/hooks/useSalesHistory.ts`<br>… +8 |
| `status` | `short` | compara, escreve | `src/components/admin/connections/MaskedSuffixBadge.tsx`<br>`src/lib/masked-suffix.ts` |
| `status` | `skipped` | compara, escreve | `src/components/admin/connections/SmokeTestChecklist.tsx`<br>`src/pages/admin/telemetry/useOptimizationQueue.ts`<br>`supabase/functions/full-op-diagnostics/index.ts`<br>`supabase/functions/process-scheduled-reports/index.ts`<br>`supabase/functions/send-scheduled-reports/index.ts`<br>… +2 |
| `status` | `slow` | compara | `supabase/functions/_shared/external-db-telemetry.ts` |
| `status` | `stale` | compara | `src/components/products/PriceFreshnessBadge.tsx`<br>`src/utils/price-freshness.ts` |
| `status` | `step_up_error` | compara, escreve | `src/components/admin/connections/IssueMcpKeyForm.tsx`<br>`src/components/admin/security/keys/RotateMcpKeyDialog.tsx`<br>`src/components/admin/security/keys/UpdateMcpKeyDialog.tsx`<br>`src/lib/auth/invoke-full-scope.ts`<br>`src/pages/admin/DevChallengeExamplesPage.tsx` |
| `status` | `string` | compara | `src/lib/cloud-status.ts`<br>`src/lib/quote-status-config.ts`<br>`supabase/functions/process-batch-export/index.ts`<br>`supabase/functions/send-transactional-email/index.ts` |
| `status` | `success` | compara, escreve, filtra | `src/components/admin/connections/FailedDeliveriesPanel.tsx`<br>`src/components/admin/security/keys/audit/McpAuditRow.tsx`<br>`src/components/kit-builder/VolumeIndicator.tsx`<br>`src/components/settings/NotificationOmnichannelPanel.tsx`<br>`src/hooks/useAiUsage.ts`<br>… +13 |
| `status` | `super` | compara, escreve | `src/components/bi/ClientCategoryRadar.tsx` |
| `status` | `unauthorized` | escreve | `supabase/functions/e2e-cleanup/index.ts` |
| `status` | `unconfigured` | compara | `src/components/admin/connections/DataSourceDebugTab.tsx` |
| `status` | `underindex` | compara | `src/components/bi/ClientCategoryRadar.tsx` |
| … +101 linhas — lista completa em `context.json` | | | |

### E.4 Enums e listas de valores

| Nome | Valores | Onde |
|---|---|---|
| app_role | `admin`, `manager`, `vendedor`, `supervisor`, `dev`, `gestor_compras`, `gerente_pa`, `comprador_pac`, `comprador_singular` | banco |
| quote_status | `draft`, `pending`, `sent`, `approved`, `rejected`, `expired`, `pending_approval`, `pending_singular_approval`, `approved_singular`, `rejected_singular`, `revision`, `viewed`, `converted` | banco |
| order_status | `pending`, `confirmed`, `in_production`, `ready_for_pickup`, `shipped`, `delivered`, `cancelled` | banco |
| fulfillment_status | `not_started`, `picking`, `packing`, `shipped`, `delivered` | banco |
| org_role | `owner`, `admin`, `member` | banco |
| step_up_action | `promote_dev`, `demote_dev`, `mcp_full_issue`, `mcp_full_escalate`, `secret_rotation`, `secret_revoke`, `mcp_key_revoke`, `mcp_key_rotate` | banco |
| role_migration_item_status | `pending`, `success`, `failed`, `skipped`, `dry_run` | banco |
| role_migration_status | `pending`, `running`, `completed`, `failed`, `partial`, `dry_run` | banco |
| DevAccessUserRole | supervisor \| agente \| agent \| vendedor | `src/components/access/DevAccessDeniedPage.tsx` |
| CredentialSource | all \| db \| env \| none | `src/components/admin/connections/CredentialsSourceFilterContext.tsx` |
| FieldSourceKind | integration_credentials \| external_connections \| ambos (sync trigger) | `src/components/admin/connections/FieldSourceDrillDownDialog.tsx` |
| SeverityFilter | all \| P0 \| P1 \| P2 | `src/components/admin/connections/SeverityFilterContext.tsx` |
| TestProgressPhase | idle \| running \| completed \| failed | `src/components/admin/connections/TestProgressIndicator.tsx` |
| ConnectionStatus | active \| error \| unconfigured | `src/components/admin/connections/connectionStatus.ts` |
| TargetZone | health \| operation | `src/components/admin/connections/incidentZoneMapping.ts` |
| SecretErrorCategory | permission \| validation \| whitelist \| network \| timeout \| rate_limit \| conflict \| server \| unknown | `src/components/admin/connections/secretErrors.ts` |
| PulseSeverity | P0 \| P1 \| P2 | `src/components/admin/connections/usePulseBarStatus.ts` |
| IncidentSeverity | P0 \| P1 \| P2 | `src/components/admin/connections/useRecentIncidents.ts` |
| IncidentSource | notification \| test_history | `src/components/admin/connections/useRecentIncidents.ts` |
| ZoneId | health \| operation \| connections | `src/components/admin/connections/useZoneVisibility.ts` |
| StepId | essentials \| commercial \| packaging \| fiscal \| engraving \| classification \| kits \| media \| content | `src/components/admin/products/HorizontalStepper.tsx` |
| SectionId | info \| price \| commercial \| flags \| dimensions \| packaging \| fiscal \| seo \| marketing \| classification \| media | `src/components/admin/products/ProductFormHelpers.tsx` |
| Step | upload \| mapping \| preview \| importing \| complete | `src/components/admin/products/bulk-import/types.ts` |
| FilterMode | all \| general \| by-variant | `src/components/admin/products/image-gallery/types.ts` |
| CONTACT_ROLES | 'Proprietário', 'Diretor', 'Gerente', 'Vendedor', 'Financeiro', 'Compras', 'Logística', 'Suporte', 'Outro', | `src/components/admin/products/new-supplier/types.ts` |
| WizardStep | list \| component \| location \| technique \| details | `src/components/admin/products/sections/engraving/types.ts` |
| StatusFilter | all \| active \| expired \| revoked | `src/components/admin/security/keys/useMcpKeys.ts` |
| SortKey | created_desc \| expires_asc \| last_used_desc | `src/components/admin/security/keys/useMcpKeys.ts` |
| AuditAction | mcp_key.issued \| mcp_key.rotated \| mcp_key.updated \| mcp_key.revoked \| mcp_key.scope_escalated \| mcp_key.issue_denied \| mcp_key.issue_error \| mcp_key.revoke_denied \| mcp_key.revoke_error \| mcp_key.update_denied \| mcp_key.update_error \| mcp_key.rotate_denied \| mcp_key.rotate_error \| mcp_tool.granted \| mcp_tool.denied \| mcp_tool.error | `src/components/admin/security/keys/audit/useMcpAuditFeed.ts` |
| StepUpReason | step_up_required \| step_up_invalid | `src/components/admin/security/keys/audit/useStepUpAttempts.ts` |
| CONTACT_ROLES | 'Proprietário', 'Diretor', 'Gerente', 'Vendedor', 'Financeiro', 'Compras', 'Logística', 'Suporte', 'Outro', | `src/components/admin/suppliers-manager/types.ts` |
| BulkWizardMode | cart \| quote \| favorite \| compare \| collection | `src/components/catalog/BulkVariantWizard.tsx` |
| FavoritesSort | recent \| oldest \| price-asc \| price-desc \| name-asc \| name-desc \| category | `src/components/favorites/FavoritesSortBar.tsx` |
| StockStatus | in-stock \| low-stock \| out-of-stock \| pre-order \| incoming | `src/components/inventory/StockBadge.tsx` |
| RiskSeverity | critical \| warning \| ok | `src/components/inventory/risk/types.ts` |
| Occasion | welcome \| year-end \| event \| birthday \| vip \| reactivation | `src/components/kit-builder/KitOccasionSelector.tsx` |
| SortOption | recent \| price-desc \| name-asc \| usage-desc \| last-used | `src/components/kit-library/KitLibraryFilters.tsx` |
| TechniqueCategory | laser \| serigrafia \| digital \| other | `src/components/mockup/techniqueColorUtils.ts` |
| LaserTone | claro \| escuro | `src/components/mockup/techniqueColorUtils.ts` |
| UpsellType | technique_upgrade \| add_position \| quantity_tier \| complementary | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| UpsellPriority | high \| medium \| low | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| QUANTITY_TIERS | 50, 100, 250, 500, 1000, 2500 | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| VariantActionMode | favorite \| compare \| collection \| share \| quote | `src/components/products/VariantPickerDialog.tsx` |
| MarketDemandLevel | very-high \| high \| moderate \| low \| unknown | `src/components/products/useStockChartData.ts` |
| TemplateKey | formal \| informal \| promotional | `src/components/products/share/MessageTemplates.ts` |
| QuoteBuilderStep | client \| items \| conditions \| review | `src/components/quotes/QuoteBuilderStepper.tsx` |
| ConsolidationSortKey | product_name \| total_quantity \| average_price \| total_value | `src/components/quotes/quoteConsolidationHelpers.ts` |
| SearchResultType | product \| client \| quote \| order \| collection \| kit \| mockup \| art_file \| cart_template \| reminder \| conversation \| magic_up \| category \| component \| media | `src/components/search/useGlobalSearch.ts` |
| StatVariant | default \| success \| warning \| danger \| info \| orange | `src/components/ui/StatCard.tsx` |
| Theme | light \| dark \| auto | `src/contexts/ThemeContext.tsx` |
| ImportMode | template \| custom | `src/hooks/useBulkImportFile.ts` |
| ImportStep | upload \| mapping \| preview \| importing \| results | `src/hooks/useBulkImportFile.ts` |
| CatalogMarketingCategory | publico_alvo \| endomarketing \| tema_sicoob | `src/hooks/useCatalogMarketing.ts` |
| ConnectionType | supabase \| bitrix24 \| n8n \| mcp \| webhook_outbound | `src/hooks/useConnectionTester.ts` |
| ErrorKind | timeout \| network \| dns \| http \| auth \| config \| unknown | `src/hooks/useConnectionTester.ts` |
| OverviewStatusFilter | all \| ok \| fail | `src/hooks/useConnectionsOverviewFilters.ts` |
| OverviewWindowFilter | any \| 5m \| 1h \| 24h \| 7d \| never | `src/hooks/useConnectionsOverviewFilters.ts` |
| DEV_EXPECTED_TABLES | "admin_audit_log", "ai_usage_logs", "ai_usage_quotas", "bot_detection_log", "external_connections_sync_log", "integration_credentials", "inbound_webhook_endpoints", "inbound_webhook_events", "ip_access_control", | `src/hooks/useDevAccessAudit.ts` |
| EXTERNAL_CATEGORIES_QUERY_KEY | 'external-categories' | `src/hooks/useExternalCategoriesQuery.ts` |
| ALLOWED_FRESHNESS_THRESHOLDS | 30, 60, 90 | `src/hooks/useProductFreshnessOverride.ts` |
| RoleName | dev \| supervisor \| agente | `src/hooks/useRBAC.tsx` |
| ReplenishmentStatus | active \| expiring_soon \| expired | `src/hooks/useReplenishments.ts` |
| StockStatus | in-stock \| low-stock \| out-of-stock | `src/hooks/useReplenishments.ts` |
| RETEST_COOLDOWN_PRESETS_MS | 3000, 10_000, 30_000, 60_000 | `src/hooks/useRetestCooldownSetting.ts` |
| ReportFrequency | daily \| weekly \| monthly | `src/hooks/useScheduledReports.ts` |
| ReportType | sales \| quotes \| clients \| products \| orders | `src/hooks/useScheduledReports.ts` |
| CartStatus | novo \| em_negociacao \| pronto_orcamento | `src/hooks/useSellerCarts.ts` |
| StepUpAction | promote_dev \| demote_dev \| mcp_full_issue \| mcp_full_escalate \| mcp_key_revoke \| mcp_key_rotate \| secret_rotation \| secret_revoke | `src/hooks/useStepUpAuth.ts` |
| IntelligenceFlag | hot-product \| stockout-risk \| stagnant \| negotiation-opportunity \| frequent-restock \| class-a | `src/hooks/useStockHistory.ts` |
| SortOption | recommended \| price_asc \| price_desc \| time_asc \| time_desc \| popularity | `src/hooks/useTechniqueRecommendations.ts` |
| EmailEventType | quote_sent \| quote_approved \| quote_rejected \| order_created \| sicoob_order_status_change \| sicoob_order_approval_request | `src/hooks/useTransactionalEmail.ts` |
| AdminModule | users \| products \| categories \| newsletter \| cms \| telemetry \| security \| campaigns \| budgets | `src/hooks/admin/useAdminPermissions.ts` |
| AuditAction | INSERT \| UPDATE \| DELETE | `src/hooks/admin/useAuditLog.ts` |
| AuditEntityType | products \| product_variants \| product_images \| product_videos \| quotes \| quote_items \| orders \| order_items \| suppliers \| categories \| material_types \| color_variations \| companies \| company_contacts | `src/hooks/admin/useAuditLog.ts` |
| HealthTier | healthy \| attention \| risk \| unknown | `src/hooks/bi/useClientHealthScore.ts` |
| ComparisonClassification | above \| on_par \| below \| no_data | `src/hooks/bi/useClientVsIndustry.ts` |
| ViewMode | grid \| list \| table | `src/hooks/catalog/useCatalogDisplay.ts` |
| SortOption | name \| price-asc \| price-desc \| stock \| newest \| color-match \| best-seller-supplier \| best-seller-promo | `src/hooks/catalog/useCatalogDisplay.ts` |
| BridgeMetricsFilter | all \| slow \| errors | `src/hooks/dev/useBridgeMetrics.ts` |
| BridgeMetricsTab | calls \| longtasks | `src/hooks/dev/useBridgeMetrics.ts` |
| VoiceAgentPhase | idle \| listening \| processing \| speaking \| error | `src/hooks/voice/types.ts` |
| CircuitState | CLOSED \| OPEN \| HALF_OPEN | `src/lib/circuit-breaker.ts` |
| CloudStatus | healthy \| warming \| degraded \| down \| unknown | `src/lib/cloud-status.ts` |
| ErrorTone | timeout \| network \| dns \| auth \| http \| config \| unknown | `src/lib/connection-error-copy.ts` |
| FeatureFlag | mfa \| ai_recommendations \| presentation_mode \| voice_commands \| magic_up \| e2e_tests \| advanced_analytics \| custom_kits_v2 \| canary_release | `src/lib/feature-flags.ts` |
| MaskedSuffixStatus | valid \| missing \| short | `src/lib/masked-suffix.ts` |
| TriggerSource | hover \| focus \| drawer-open | `src/lib/notifications-metrics.ts` |
| FetchSource | initial \| polling \| prefetch \| mutation | `src/lib/notifications-metrics.ts` |
| BadgeRenderSource | cache \| network | `src/lib/notifications-metrics.ts` |
| OrderStatus | rascunho \| enviado_gestor \| aprovado_gestor \| enviado_vendedor \| em_producao \| em_separacao \| em_transporte \| entregue \| concluido \| cancelado | `src/lib/order-status-config.ts` |
| PrivateStorageBucket | personalization-images \| mockup-art-files \| supplier-logos \| product-videos | `src/lib/private-storage.ts` |
| AppRole | dev \| gestor_compras \| comprador_singular \| gerente_pa \| comprador_pac \| agente \| vendedor \| supervisor | `src/lib/roles.ts` |
| SicoobFulfillmentStatus | in_production \| in_separation \| in_transit \| delivered \| completed \| cancelled | `src/lib/sicoob-status-config.ts` |
| UntypedTable | product_component_locations \| product_component_location_techniques \| product_group_components \| product_group_locations \| product_group_location_techniques \| password_reset_requests \| roles | `src/lib/supabase-untyped.ts` |
| DevRouteUxEvent | view \| back \| retry \| fallback \| request_access \| copy_link \| mail \| abandon | `src/lib/access/dev-route-telemetry.ts` |
| RequiredRole | dev \| supervisor \| agente \| gestor_compras \| gerente_pa \| vendedor | `src/lib/access/role-policy.ts` |
| SENSITIVE_LOCAL_STORAGE_KEYS | 'product-favorites', 'product-comparison', 'recently-viewed-products', 'duplicate_product', // Histórico de navegação: guarda até 20 entradas com o TÍTULO da página // visitada (useNavigationStore), ou seja, nomes de orçamentos, de kits e de // clientes. Ficava para trás no logout e aparecia para o … | `src/lib/auth/sensitive-browser-data.ts` |
| SsoFailureReason | provider \| exchange \| timeout \| unexpected | `src/lib/auth/sso-errors.ts` |
| StepUpErrorKind | step_up_required \| step_up_invalid \| dev_role_required | `src/lib/auth/step-up-error.ts` |
| SalesScope | all \| team \| self | `src/lib/auth/visibility-scope.ts` |
| BICategorySlug | garrafas \| canetas \| mochilas \| agendas \| eletronicos \| blocos \| vestuario \| kits \| necessaires \| outros | `src/lib/bi/categoryResolver.ts` |
| ImportMode | insert \| upsert | `src/lib/external-db/batch-import.ts` |
| BridgeStatusType | degraded \| unavailable \| recovered | `src/lib/external-db/bridge-status-events.ts` |
| Operation | select \| insert \| update \| delete \| upsert \| batch_insert | `src/lib/external-db/bridge.ts` |
| BRIDGE_ALIASES | 'tecnica_gravacao', // → tabela_preco_gravacao_oficial 'personalization_techniques', // → tecnicas_gravacao (via bridge alias) 'personalization_technique_options', // projeção segura para filtros do catálogo 'customization_price_tables', // → tabela_preco_fornecedores_gravacao (via bridge alias) 'cu … | `src/lib/external-db/tables.ts` |
| COMPANY_TABLES | 'client_contacts', 'organizations', | `src/lib/external-db/tables.ts` |
| KitType | montado \| original \| simples | `src/lib/kit-builder/types.ts` |
| KitBuilderStep | box \| items \| personalization \| summary | `src/lib/kit-builder/types.ts` |
| KNOWN_SCOPES | "quotes:read", "orders:read", "crm:read", "products:read", "code:read", "code:write", "*", | `src/lib/mcp/scopes.ts` |
| DEV_ONLY_ROUTE_PREFIXES | "/admin/telemetria", "/admin/conexoes", "/admin/seguranca", "/admin/seguranca-acesso", "/admin/workflows", "/admin/prompts-ia", "/admin/validade-precos", "/admin/rate-limit", "/admin/login-attempts", "/admin/status", "/admin/rbac-rotas", "/admin/qa", | `src/lib/navigation/restricted-routes.ts` |
| ADMIN_ONLY_ROUTE_PREFIXES | "/admin/usuarios", "/admin/cadastros", "/admin/sicoob", | `src/lib/navigation/restricted-routes.ts` |
| PriceSchemaVersion | v5.9-nested \| v6.x-flat \| v7-new \| unknown | `src/lib/personalization/adapters/schema-detection.ts` |
| RouteRole | public \| authenticated \| admin \| dev \| gestor_compras \| gerente_pa \| vendedor | `src/lib/rbac/route-matrix.ts` |
| RouteGuard | public \| ProtectedRoute \| AdminRoute \| DevRoute | `src/lib/rbac/route-matrix.ts` |
| RlsOperation | SELECT \| INSERT \| UPDATE \| DELETE | `src/lib/security/rls-denial-logger.ts` |
| InvitationField | email \| cooperative \| role \| pa \| expiry | `src/lib/sicoob/invitationForm.ts` |
| PaBudgetState | loading \| unavailable \| unconfigured \| configured | `src/lib/sicoob/paBudgetState.ts` |
| AlertSeverity | warn \| crit | `src/lib/telemetry/bridgeAlertThresholds.ts` |
| AlertMetric | p95 \| avgResp | `src/lib/telemetry/bridgeAlertThresholds.ts` |
| BridgeName | external-db-bridge \| crm-db-bridge | `src/lib/telemetry/bridgeCallMetrics.ts` |
| BridgeOperation | select \| search \| insert \| update \| delete \| upsert \| batch \| rpc \| quote_directory | `src/lib/telemetry/bridgeCallMetrics.ts` |
| LongTaskAttribution | self \| same-origin-ancestor \| other | `src/lib/telemetry/longTaskWatchdog.ts` |
| LogLevel | debug \| info \| warn \| error | `src/lib/telemetry/structuredLogger.ts` |
| RangePreset | 24h \| 7d \| 30d \| custom | `src/pages/admin/telemetry/useHighLimitTelemetry.ts` |
| OperationFilter | all \| select \| insert \| update \| delete \| rpc | `src/pages/admin/telemetry/useHighLimitTelemetry.ts` |
| ErrorKindFilter | all \| timeout \| postgrest_error \| validation \| network \| rate_limit \| auth \| unknown | `src/pages/admin/telemetry/useHighLimitTelemetry.ts` |
| AlertLevel | ok \| breach_503 \| breach_cold_start \| breach_both | `src/pages/admin/telemetry/usePlatformFailureAlert.ts` |
| LatencyAlertSeverity | ok \| warning \| critical | `src/pages/admin/telemetry/useProductsListingLatencyAlert.ts` |
| GuardrailStatus | ok \| warning \| regression \| insufficient_data \| error | `src/pages/admin/telemetry/useRegressionGuardrail.ts` |
| ComparisonWindow | 24h \| 7d \| 30d | `src/pages/admin/telemetry/useResolveProductsSelectComparison.ts` |
| SeverityFilter | all \| slow \| very_slow \| error | `src/pages/admin/telemetry/useTelemetryData.ts` |
| TimeFilter | 1h \| 6h \| 24h \| 7d \| custom | `src/pages/admin/telemetry/useTelemetryData.ts` |
| ViewMode | cards \| table \| list | `src/pages/advanced-price-search/types.ts` |
| MagicUpCurationStatus | draft \| good \| favorite \| internal-approved \| sent-to-client \| client-approved \| client-rejected \| needs-adjustment | `src/pages/magic-up/magicUpStrategy.ts` |
| MagicUpCampaignStatus | draft \| review \| sent \| approved \| rejected | `src/pages/magic-up/magicUpStrategy.ts` |
| SicoobDocumentPurpose | invoice_pdf \| invoice_xml \| delivery_proof | `src/services/sicoob/documentIngestService.ts` |
| SicoobLogisticsStatus | pending \| in_transit \| delivered | `src/services/sicoob/logisticsReportService.ts` |
| SICOOB_UI_ROLE_CHOICES | { role: "gestor_singular", label: "Gestor Singular" }, { role: "gestor_pa", label: "Gestor PA" }, { role: "vendedor", label: "Vendedor" }, { role: "supervisor", label: "Supervisor" }, | `src/services/sicoob/userService.ts` |
| SocialPlatform | instagram \| linkedin \| facebook \| twitter \| youtube \| tiktok \| whatsapp \| telegram \| outro | `src/types/crm.ts` |
| AreaShape | rectangle \| circle \| oval \| triangle \| custom | `src/types/gravacao.ts` |
| OrderStatus | rascunho \| enviado_gestor \| aprovado_gestor \| enviado_vendedor \| em_producao \| em_separacao \| em_transporte \| entregue \| concluido \| cancelado | `src/types/orders.ts` |
| DiscountType | percent \| amount | `src/types/quote-builder.ts` |
| DeliveryMode | prazo \| data | `src/types/quote-builder.ts` |
| QuoteStatus | draft \| pending \| pending_approval \| sent \| viewed \| approved \| converted \| rejected \| expired | `src/types/quote.ts` |
| ClientResponse | approved \| rejected \| changes_requested | `src/types/quote.ts` |
| StockAlertType | out_of_stock \| critical \| low_stock \| restock_needed \| overstock \| incoming_delayed \| stockout_predicted | `src/types/stock.ts` |
| StockSortOption | name \| sku \| stock_quantity \| available_stock \| days_remaining \| color_name \| last_updated | `src/types/stock.ts` |
| StockGroupOption | none \| product \| color \| color_group \| status \| category \| supplier | `src/types/stock.ts` |
| TechniqueCategory | impression \| engraving \| textile \| transfer \| digital \| other | `src/types/domain/personalization.ts` |
| SimulatorStep | product \| techniques \| results | `src/types/domain/simulation.ts` |
| TipoSetup | nenhum \| fotolito \| cliche \| matriz \| arte_digital | `src/types/infrastructure/promobrind.ts` |
| FormatoVariante | plana \| cilindrica \| textil \| patch | `src/types/infrastructure/promobrind.ts` |
| TipoIntegracao | api_spot \| api_rest \| manual | `src/types/infrastructure/promobrind.ts` |
| OrderStatus | draft \| pending \| waiting_approval \| escalated_to_board \| confirmed \| logistic \| in_production \| in_separation \| in_transit \| delivered \| rejected \| completed \| cancelled | `src/types/sicoob/orders.ts` |
| AuditEventType | CREATE \| UPDATE \| DELETE \| IMPORT \| EXPORT \| PUBLISH_CMS \| APPROVE_CHANGE \| REJECT_CHANGE \| SECURITY_CONFIG_CHANGE | `src/utils/adminAudit.ts` |
| CdnVariant | public \| large \| medium \| card \| small \| thumbnail | `src/utils/image-utils.ts` |
| ImageTypeCode | main \| gallery \| set \| logo \| ambient \| detail \| box \| pouch \| vitrine_pessoa \| vitrine_ambiente \| component \| location \| area \| mockup \| thumbnail \| product \| other | `src/utils/image-utils.ts` |
| ESTADOS_BR | 'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT', 'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO', | `src/utils/masks.ts` |
| PriceFreshnessStatus | fresh \| aging \| stale \| unknown | `src/utils/price-freshness.ts` |
| AppRole | dev \| supervisor \| agente | `supabase/functions/_shared/authorize.ts` |
| TriggeredBy | manual \| cron \| webhook | `supabase/functions/_shared/connection-test-runner.ts` |
| ErrorKind | timeout \| network \| dns \| http \| auth \| config \| unknown | `supabase/functions/_shared/connection-test-runner.ts` |
| ConnectionType | supabase \| bitrix24 \| n8n \| mcp \| webhook_outbound | `supabase/functions/_shared/connection-timeouts.ts` |
| CredentialSource | db \| env \| none | `supabase/functions/_shared/credentials.ts` |
| AuthzCategory | public \| authenticated \| supervisor \| dev \| service \| scoped | `supabase/functions/_shared/edge-authz-manifest.ts` |
| EXPERT_CHAT_CLIENT_MESSAGE_ROLES | "user", "assistant" | `supabase/functions/_shared/expert-chat-contract.ts` |
| ResourceGroup | products \| companies \| views | `supabase/functions/_shared/external-db-config.ts` |
| Operation | select \| insert \| update \| delete \| rpc \| upsert \| batch_insert | `supabase/functions/_shared/external-db-config.ts` |
| ALLOWED_RPCS | 'fn_get_product_print_areas', 'fn_get_product_print_areas_v2', 'fn_get_product_customization_options', 'fn_get_customization_price', 'fn_get_customization_price_v2', 'fn_find_fornecedor_price_table', 'get_category_descendants', | `supabase/functions/_shared/external-db-config.ts` |
| COMPANY_TABLES | 'bitrix_clients', 'client_contacts', 'client_notes', 'organizations', 'user_organizations', 'business_sectors', | `supabase/functions/_shared/external-db-config.ts` |
| ErrorKind | timeout \| postgrest_error \| validation \| network \| rate_limit \| auth \| unknown | `supabase/functions/_shared/external-db-telemetry.ts` |
| EXTERNAL_PRODUCT_CORE_COLUMNS | 'id', 'name', 'sku', 'sale_price', 'primary_image_url', 'is_active', 'stock_quantity', 'min_quantity', | `supabase/functions/_shared/external-product-contract.ts` |
| KNOWN_SCOPES | "quotes:read", "orders:read", "crm:read", "products:read", "code:read", "code:write", "*", | `supabase/functions/_shared/mcp-scopes.ts` |
| McpViolationReason | missing_jwt \| invalid_jwt \| not_admin \| stepup_missing \| stepup_invalid \| stepup_consume_failed \| rate_limited \| validation_failed \| unauthorized_direct_write \| other | `supabase/functions/_shared/mcp-violations.ts` |
| LogLevel | debug \| info \| warn \| error | `supabase/functions/_shared/structured-logger.ts` |
| AUTO_TESTABLE_CONNECTION_STATUSES | "active", "degraded", "error", | `supabase/functions/connections-auto-test/index.ts` |
| InsertResultShape | rows \| empty-array \| null \| generic-string-error \| single-object \| primitive \| unknown | `supabase/functions/crm-db-bridge/index.ts` |
| SCHEDULED_REPORT_TYPES | "sales", "quotes", "clients", "products", "orders", | `supabase/functions/send-scheduled-reports/report-types.ts` |
| DocumentPurpose | invoice_pdf \| invoice_xml \| delivery_proof | `supabase/functions/sicoob-document-ingest/inspection.ts` |
| RegistrationState | not_attempted \| confirmed \| rejected \| unknown | `supabase/functions/sicoob-document-ingest/registration-state.ts` |
| KitLineKind | box \| item | `supabase/functions/sicoob-kit-quote/catalog.ts` |
| ReorderSourceKind | order \| quote | `supabase/functions/sicoob-reorder/idempotency.ts` |

## F. Validações de entrada

### F.1 Schemas Zod

- **productFormSchema** (`src/components/admin/products/ProductFormSchema.ts`, z.object):
  ```ts
  { // Info básica sku: z.string().trim().min(1, 'SKU é obrigatório').max(50, 'SKU muito longo'), name: z.string().trim().min(1, 'Nome é obrigatório').max(300, 'Nome muito longo'), description: z.string().max(5000, 'Descrição muito longa').optional().default(''), short_description: z.string().max(500, 'Descrição curta muito longa').optional().default(''), brand: z.string().max(100).optional().default(''), // Categoria e fornecedor (IDs reais do BD externo) category_id: z.string().optional().default(''), supplier_id: z.string().min(1, 'Fornecedor é obrigatório'), supplier_reference: z.string().max(100).optional().default(''), supplier_product_url: z.string().max(500).optional().default(''), // Preço e estoque sale_price: z.coerce.number().min(0, 'Preço não pode ser negativo').default(0), cost …
  ```
- **FormSchema** (`src/components/admin/users/PromotionDialog.tsx`, z.object):
  ```ts
  { password: z.string().min(1, "Informe sua senha"), reason: z .string() .trim() .min(10, "Justificativa deve ter pelo menos 10 caracteres") .max(500, "Máximo 500 caracteres"), }
  ```
- **forgotPasswordSchema** (`src/components/auth/ForgotPasswordForm.tsx`, z.object):
  ```ts
  { email: z.string().email('Email inválido'), }
  ```
- **productFormSchema** (`src/components/product-registration/productFormTypes.ts`, z.object):
  ```ts
  { name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"), sku: z.string().min(2, "SKU deve ter pelo menos 2 caracteres"), price: z.number().min(0.01, "Preço deve ser maior que zero"), supplier_id: z.string().min(1, "Selecione um fornecedor"), category_id: z.string().min(1, "Selecione uma categoria"), images: z.array(z.object({ url: z.string().url("URL inválida"), alt_text: z.string().optional(), is_primary: z.boolean().optional(), image_type: z.enum(["main", "gallery", "detail", "mockup"]).optional(), })).min(1, "Adicione pelo menos uma imagem"), colors: z.array(z.string()).min(1, "Selecione pelo menos uma cor"), materials: z.array(z.string()).min(1, "Selecione pelo menos um material"), description: z.string().optional(), short_description: z.string().optional(), cost_price: z.nu …
  ```
- **loginSchema** (`src/lib/validations/authSchema.ts`, z.object):
  ```ts
  { email: z.string() .min(1, REQUIRED_EMAIL_MESSAGE) .email(INVALID_EMAIL_MESSAGE), password: z.string() .min(6, "Senha deve ter pelo menos 6 caracteres"), }
  ```
- **signupSchema** (`src/lib/validations/authSchema.ts`, z.object, encadeia refine):
  ```ts
  { fullName: z.string() .min(2, "Nome deve ter pelo menos 2 caracteres") .max(100, "Nome deve ter no máximo 100 caracteres"), email: z.string() .min(1, REQUIRED_EMAIL_MESSAGE) .email(INVALID_EMAIL_MESSAGE), password: z.string() .min(8, "Senha deve ter pelo menos 8 caracteres") .regex(/[A-Z]/, "Senha deve conter letra maiúscula") .regex(/[a-z]/, "Senha deve conter letra minúscula") .regex(/[0-9]/, "Senha deve conter número") .regex(/[!@#$%^&*(),.?":{}|<>]/, "Senha deve conter caractere especial"), confirmPassword: z.string(), }).refine((data) => data.password === data.confirmPassword, { message: "Senhas não conferem", path: ["confirmPassword"], }); export const forgotPasswordSchema = z.object({ email: z.string() .min(1, REQUIRED_EMAIL_MESSAGE) .email(INVALID_EMAIL_MESSAGE), }); export const …
  ```
  - Regras cruzadas (refine): “Senhas não conferem” · “Senhas não conferem”
- **forgotPasswordSchema** (`src/lib/validations/authSchema.ts`, z.object):
  ```ts
  { email: z.string() .min(1, REQUIRED_EMAIL_MESSAGE) .email(INVALID_EMAIL_MESSAGE), }
  ```
- **salesGoalSchema** (`src/lib/validations/goalSchema.ts`, z.object, encadeia refine):
  ```ts
  { title: z.string() .min(2, "Título deve ter pelo menos 2 caracteres") .max(100, "Título deve ter no máximo 100 caracteres"), target_value: z.number() .positive("Meta deve ser um valor positivo") .max(999999999, "Valor máximo excedido"), goal_type: z.enum(["revenue", "quotes", "orders", "conversion"], { // Só ausência é "obrigatório"; valor inválido mantém a mensagem padrão do zod. error: (issue) => (issue.input === undefined ? "Tipo de meta é obrigatório" : undefined), }), period: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"], { error: (issue) => (issue.input === undefined ? "Período é obrigatório" : undefined), }), start_date: z.string().min(1, "Data de início é obrigatória"), end_date: z.string().min(1, "Data de fim é obrigatória"), notes: z.string().max(500, "Notas devem …
  ```
  - Regras cruzadas (refine): “Data de fim deve ser posterior à data de início”
- **profileSchema** (`src/lib/validations/profileSchema.ts`, z.object):
  ```ts
  { full_name: z.string() .min(2, "Nome deve ter pelo menos 2 caracteres") .max(100, "Nome deve ter no máximo 100 caracteres"), phone: z.string() .max(20, "Telefone deve ter no máximo 20 caracteres") .refine( (val) => !val || phoneRegex.test(val.replace(/\s/g, "")), "Formato de telefone inválido. Ex: (11) 99999-9999" ) .optional() .or(z.literal("")), }
  ```
  - Regras cruzadas (refine): “Formato de telefone inválido. Ex: (11) 99999-9999”
- **quoteFormSchema** (`src/lib/validations/quoteSchema.ts`, z.object, encadeia refine):
  ```ts
  { clientId: z.string().min(1, "Empresa é obrigatória"), contactId: z.string().min(1, "Contato é obrigatório"), paymentTerms: z.string().min(1, "Prazo de pagamento é obrigatório"), deliveryTime: z.string().min(1, "Prazo de entrega é obrigatório"), shippingType: z.string().min(1, "Tipo de frete é obrigatório"), shippingCost: z.number().optional(), validUntil: z.string().optional(), discountType: z.enum(["percent", "amount"]).default("percent"), discountValue: z.number().min(0, "Desconto não pode ser negativo").default(0), notes: z.string().max(2000, "Observações devem ter no máximo 2000 caracteres").optional(), internalNotes: z.string().max(2000, "Notas internas devem ter no máximo 2000 caracteres").optional(), }
  ```
  - Regras cruzadas (refine): “Valor do frete é obrigatório para modalidade FOB”
- **quoteItemSchema** (`src/lib/validations/quoteSchema.ts`, z.object):
  ```ts
  { product_id: z.string().min(1, "Produto é obrigatório"), product_name: z.string().min(1, "Nome do produto é obrigatório"), product_sku: z.string().optional(), product_image_url: z.string().optional(), quantity: z.number().int().min(1, "Quantidade mínima é 1"), unit_price: z.number().min(0, "Preço não pode ser negativo"), color_name: z.string().optional(), color_hex: z.string().optional(), }
  ```
- **ipSchema** (`src/pages/admin/AdminSegurancaAcessoPage.tsx`, z.object):
  ```ts
  { ip_address: z .string() .trim() .min(3, "IP inválido") .max(45, "IP muito longo") .regex(/^[0-9a-fA-F:./]+$/, "Use apenas IPv4, IPv6 ou CIDR"), list_type: z.enum(["allow", "block"]), reason: z.string().trim().max(500, "Máx 500 caracteres").optional().or(z.literal("")), expires_at: z.string().optional().or(z.literal("")), }
  ```
- **uuidSchema** (`supabase/functions/_shared/zod-validate.ts`, z.string):
  ```ts
  
  ```
- **nonEmptyString** (`supabase/functions/_shared/zod-validate.ts`, z.string):
  ```ts
  
  ```
- **positiveInt** (`supabase/functions/_shared/zod-validate.ts`, z.number):
  ```ts
  
  ```
- **nonNegativeNumber** (`supabase/functions/_shared/zod-validate.ts`, z.number):
  ```ts
  
  ```
- **emailSchema** (`supabase/functions/_shared/zod-validate.ts`, z.string):
  ```ts
  
  ```
- **tokenSchema** (`supabase/functions/_shared/zod-validate.ts`, z.string):
  ```ts
  
  ```
- **imageInputSchema** (`supabase/functions/_shared/zod-validate.ts`, z.string):
  ```ts
  
  ```
- **paginationSchema** (`supabase/functions/_shared/zod-validate.ts`, z.object):
  ```ts
  { page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(500).default(50), }
  ```
- **ClientSchema** (`supabase/functions/ai-recommendations/index.ts`, z.object):
  ```ts
  { name: z.string().trim().min(1).max(255), company: z.string().max(255).optional(), industry: z.string().max(100).optional(), preferences: z.array(z.string().max(100)).max(20).optional(), purchaseHistory: z.array(z.string().max(200)).max(50).optional(), budget: z.string().max(100).optional(), }
  ```
- **ProductSchema** (`supabase/functions/ai-recommendations/index.ts`, z.object):
  ```ts
  { id: z.string().min(1).max(100), name: z.string().min(1).max(255), category: z.string().min(1).max(100), description: z.string().max(1000).optional(), priceRange: z.string().max(50).optional(), tags: z.array(z.string().max(50)).max(20).optional(), }
  ```
- **RecommendationRequestSchema** (`supabase/functions/ai-recommendations/index.ts`, z.object):
  ```ts
  { client: ClientSchema, products: z.array(ProductSchema).min(1).max(100), }
  ```
- **LogoSchema** (`supabase/functions/analyze-logo-colors/index.ts`, z.object):
  ```ts
  { imageBase64: z.string().min(10, 'imageBase64 is required').max(10_000_000, 'Image too large'), }
  ```
- **BitrixSyncSchema** (`supabase/functions/bitrix-sync/index.ts`, z.object):
  ```ts
  { action: z.enum([ 'get_companies', 'get_company', 'search_companies', 'get_deals', 'get_deal_products', 'sync_full', 'get_stored_clients', 'get_stored_deals', 'create_deal', 'update_deal', 'get_sync_logs', ]), data: z.record(z.unknown()).optional(), }
  ```
- **CategoriesRequestSchema** (`supabase/functions/categories-api/index.ts`, z.object):
  ```ts
  { action: z.enum(['tree', 'all', 'descendants', 'products_by_categories']), categoryIds: z.array(z.string().uuid()).max(200).optional(), includeDescendants: z.boolean().optional(), }
  ```
- **CnpjBodySchema** (`supabase/functions/cnpj-lookup/index.ts`, z.object):
  ```ts
  { cnpj: z.string().min(1, "CNPJ é obrigatório").transform(v => v.replace(/\D/g, "")).refine(v => v.length === 14, "CNPJ deve ter 14 dígitos"), }
  ```
  - Regras cruzadas (refine): “CNPJ deve ter 14 dígitos”
- **BodySchema** (`supabase/functions/collections-public-react/index.ts`, z.object):
  ```ts
  { share_token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid token"), item_id: z.string().uuid(), emoji: z.enum(["👍", "❤️", "🔥", "💡"]), anon_id: z.string().min(8).max(64), }
  ```
- **ActionSchema** (`supabase/functions/commemorative-dates/index.ts`, z.object):
  ```ts
  { action: z.enum(['get_active_dates', 'get_upcoming_dates', 'get_products_by_date', 'get_dates_with_colors']), params: z.object({ days_ahead: z.number().int().min(1).max(365).optional(), slug: z.string().trim().min(1).max(200).optional(), limit: z.number().int().min(1).max(10_001).optional(), include_all_colors: z.boolean().optional(), }).optional(), }
  ```
- **ProductSchema** (`supabase/functions/comparison-ai-advisor/index.ts`, z.object):
  ```ts
  { id: z.union([z.string(), z.number()]).transform(String), name: z.string().min(1).max(300), price: z.number().nonnegative(), stock: z.number().nonnegative().optional().default(0), minQuantity: z.number().nonnegative().optional().default(1), colorsCount: z.number().nonnegative().optional().default(0), stockStatus: z.string().optional().default("in-stock"), category: z.string().optional().nullable(), supplier: z.string().optional().nullable(), }
  ```
- **BodySchema** (`supabase/functions/comparison-ai-advisor/index.ts`, z.object):
  ```ts
  { products: z.array(ProductSchema).min(2).max(6), }
  ```
- **BodySchema** (`supabase/functions/comparisons-public-react/index.ts`, z.object):
  ```ts
  { share_token: z.string().uuid(), comparison_id: z.string().uuid(), item_index: z.number().int().min(0).max(20), emoji: z.enum(["👍", "❤️", "🔥", "💡"]), anon_id: z.string().min(8).max(64), }
  ```
- **BodySchema** (`supabase/functions/connection-tester/index.ts`, z.object):
  ```ts
  { action: z.enum(["test", "last_test", "test_history", "last_test_full", "consecutive_failures_overview"]).optional().default("test"), type: z.enum(["supabase", "bitrix24", "n8n", "mcp", "webhook_outbound"]), config: z.record(z.string()).optional(), connection_id: z.string().uuid().optional(), env_key: z.enum(["promobrind", "crm"]).optional(), limit: z.number().int().min(1).max(50).optional(), timeout_ms: z.number().int().min(1000).max(30000).optional(), id: z.string().uuid().optional(), }
  ```
- **CrmRequestSchema** (`supabase/functions/crm-db-bridge/index.ts`, z.object):
  ```ts
  { operation: z.enum(["select", "search", "insert", "update", "delete", "batch", "quote_directory"]), table: z.string().trim().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/i).optional(), id: z.string().uuid().optional(), filters: z.record(z.unknown()).optional(), select: z.string().max(2000).optional(), orderBy: z.union([ z.string(), z.object({ column: z.string(), ascending: z.boolean().optional() }), z.array(z.union([z.string(), z.object({ column: z.string(), ascending: z.boolean().optional() })])).min(1).max(3), ]).optional(), limit: z.number().int().min(1).max(1000).optional(), offset: z.number().int().min(0).optional(), search: z.object({ column: z.string().optional(), columns: z.array(z.enum(["title", "nome_fantasia", "razao_social", "cnpj", "cidade"])).max(5).optional(), term: z.string() …
  ```
  - Regras cruzadas (refine): “contacts”
- **DeviceInfoSchema** (`supabase/functions/detect-new-device/index.ts`, z.object):
  ```ts
  { fingerprint: z.string().min(1).max(256), userAgent: z.string().max(1024), browserName: z.string().max(100), osName: z.string().max(100), deviceType: z.string().max(50), }
  ```
- **BodySchema** (`supabase/functions/detect-new-device/index.ts`, z.object):
  ```ts
  { userId: z.string().uuid(), userEmail: z.string().email().max(255), deviceInfo: DeviceInfoSchema, }
  ```
- **BodySchema** (`supabase/functions/dropbox-list/index.ts`, z.object):
  ```ts
  { path: z.string().max(1000).default(''), action: z.enum(['list', 'check']).default('list'), }
  ```
- **TtsRequestSchema** (`supabase/functions/elevenlabs-tts/index.ts`, z.object):
  ```ts
  { text: z.string().min(1, 'text cannot be empty').max(5000, 'text too long (max 5000 chars)'), voiceId: z.string().optional(), }
  ```
- **MessageSchema** (`supabase/functions/expert-chat/index.ts`, z.object):
  ```ts
  { role: z.enum(EXPERT_CHAT_CLIENT_MESSAGE_ROLES), content: z.string().min(1).max(EXPERT_CHAT_MESSAGE_MAX_CHARS), }
  ```
- **TextFilterSchema** (`supabase/functions/expert-chat/index.ts`, z.union, encadeia nullable, optional):
  ```ts
  [ z.string().min(1).max(200), z.array(z.string().min(1).max(200)).max(25), ]
  ```
- **ExpertChatBodySchema** (`supabase/functions/expert-chat/index.ts`, z.object):
  ```ts
  { messages: z.array(MessageSchema).min(1).max(30).refine( (messages) => messages.reduce((total, message) => total + message.content.length, 0) <= 30000, "A conversa excede o limite total de 30 mil caracteres", ), assistantMode: z.enum(["sales", "layout"]).optional(), assistantContext: z.preprocess(normalizeAssistantContext, z.string().max(500).optional()), clientId: z.string().uuid().optional().nullable(), categoryFilter: TextFilterSchema, priceMin: z.number().nonnegative().optional().nullable(), priceMax: z.number().nonnegative().optional().nullable(), materialFilter: TextFilterSchema, colorFilter: TextFilterSchema, genderFilter: TextFilterSchema, supplierFilter: TextFilterSchema, techniqueFilter: TextFilterSchema, publicoFilter: TextFilterSchema, dataComemorativaFilter: TextFilterSchema, …
  ```
  - Regras cruzadas (refine): “A conversa excede o limite total de 30 mil caracteres”
- **TopLevelBodySchema** (`supabase/functions/external-db-bridge/index.ts`, z.object, encadeia refine):
  ```ts
  { operation: z.enum(['select', 'insert', 'update', 'delete', 'upsert', 'batch_insert', 'rpc', 'batch', 'ping']), table: z.string().min(1).optional(), queries: z.array(z.record(z.unknown())).max(10).optional(), rpcName: z.string().optional(), rpcParams: z.record(z.unknown()).optional(), filters: z.record(z.unknown()).optional(), data: z.unknown().optional(), id: z.unknown().optional(), select: z.string().optional(), orderBy: z.object({ column: z.string(), ascending: z.boolean().optional() }).optional(), limit: z.number().int().positive().optional(), offset: z.number().int().min(0).optional(), countMode: z.string().optional(), onConflict: z.string().optional(), }
  ```
  - Regras cruzadas (refine): “Field ”
- **BodySchema** (`supabase/functions/external-db-inspect/index.ts`, z.object):
  ```ts
  { mode: z.enum(['tables', 'columns']).default('tables'), tableName: z.string().trim().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/i, 'Invalid table name').optional(), }
  ```
- **BodySchema** (`supabase/functions/favorites-public-react/index.ts`, z.object):
  ```ts
  { list_token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid token"), item_id: z.string().uuid(), emoji: z.enum(["👍", "❤️", "🔥", "💡"]), anon_id: z.string().min(8).max(64), }
  ```
- **BodySchema** (`supabase/functions/full-op-diagnostics/index.ts`, z.object):
  ```ts
  { // Dry-run de validate_mcp_key. Quando ausente, esse check é "skipped". mcp_key_plain: z.string().min(8).max(512).optional(), // Dry-run de step-up. Quando ausente, esse check é "skipped". step_up_token: z.string().min(8).max(512).optional(), step_up_action: z.string().min(1).max(64).optional(), step_up_target_ref: z.string().max(255).nullable().optional(), }
  ```
- **BodySchema** (`supabase/functions/generate-ad-image/index.ts`, z.object, encadeia refine):
  ```ts
  { productImageUrl: z.string().url(), logoBase64: z.string().optional(), logoUrl: z.string().url().optional(), productName: z.string().optional(), productColor: z.string().optional(), techniqueName: z.string().optional(), locationName: z.string().optional(), scenePrompt: z.string().min(1, "Scene prompt is required"), sceneCategory: z.string().optional(), brandColorHex: z.string().optional(), brandColorName: z.string().optional(), campaignBrief: z.record(z.unknown()).optional(), outputChannel: z.string().optional(), aspectRatio: z.string().optional(), qualityMode: z.string().optional(), compositionMode: z.string().optional(), creativeMode: z.string().optional(), negativePrompt: z.array(z.string()).optional(), brandKit: z.object({ primaryColor: z.string().nullable().optional(), secondaryColor …
  ```
  - Regras cruzadas (refine): “Either logoBase64 or logoUrl must be provided”
- **AdPromptSchema** (`supabase/functions/generate-ad-prompt/index.ts`, z.object):
  ```ts
  { productName: z.string().trim().min(1, 'Product name is required').max(255), productColor: z.string().max(100).optional(), productCategory: z.string().max(100).optional(), techniqueName: z.string().max(100).optional(), locationName: z.string().max(100).optional(), maxWidth: z.union([z.string(), z.number()]).optional(), maxHeight: z.union([z.string(), z.number()]).optional(), dimensionUnit: z.string().max(10).optional(), isCurved: z.boolean().optional(), clientSegment: z.string().max(200).optional(), clientName: z.string().max(200).optional(), brandColorName: z.string().max(100).optional(), objective: z.string().max(500).optional(), tone: z.string().max(100).optional(), targetAudience: z.string().max(200).optional(), season: z.string().max(100).optional(), numberOfPrompts: z.number().int() …
  ```
- **MockupBodySchema** (`supabase/functions/generate-mockup/index.ts`, z.object):
  ```ts
  { productImageUrl: z.string().url().max(2000), logoBase64: z.string().max(5_000_000).optional(), logoUrl: z.string().url().max(2000).optional(), techniqueName: z.string().max(200).optional(), techniquePrompt: z.string().max(5000).optional(), techniqueId: z.string().max(100).optional(), positionX: z.number().min(0).max(100), positionY: z.number().min(0).max(100), logoWidthCm: z.number().positive().max(200).optional(), logoHeightCm: z.number().positive().max(200).optional(), logoRotation: z.number().min(-360).max(360).optional().default(0), logoScale: z.number().min(1).max(500).optional().default(100), productName: z.string().max(500).optional(), }
  ```
- **ProductSeoSchema** (`supabase/functions/generate-product-seo/index.ts`, z.object):
  ```ts
  { product: z.object({ name: z.string().trim().min(1, 'Nome do produto é obrigatório').max(255), sku: z.string().max(100).optional(), description: z.string().max(5000).optional(), short_description: z.string().max(1000).optional(), brand: z.string().max(200).optional(), category_name: z.string().max(200).optional(), country_of_origin: z.string().max(100).optional(), materials: z.string().max(500).optional(), sale_price: z.union([z.string(), z.number()]).optional(), }), }
  ```
- **BodySchema** (`supabase/functions/kit-identity-suggest/index.ts`, z.object):
  ```ts
  { name: z.string().max(200).optional(), description: z.string().max(500).nullable().optional(), items: z .array( z.object({ name: z.string().max(200).optional(), sku: z.string().max(100).optional(), }), ) .max(50) .optional(), }
  ```
- **KitRequestSchema** (`supabase/functions/kit-public-view/index.ts`, z.object):
  ```ts
  { action: z.enum(["get_kit"]), token: z.string().min(1, "Token é obrigatório").max(200), }
  ```
- **LoginAttemptSchema** (`supabase/functions/log-login-attempt/index.ts`, z.object):
  ```ts
  { email: z.string().email().max(255), user_id: z.string().uuid().nullish(), ip_address: z.string().max(45).default("unknown"), success: z.boolean(), failure_reason: z.string().max(500).nullish(), user_agent: z.string().max(512).nullish(), }
  ```
- **CriterionSchema** (`supabase/functions/magic-up-score/index.ts`, z.object):
  ```ts
  { id: z.string().min(1), label: z.string().min(1), score: z.number().min(0).max(100), passed: z.boolean(), weight: z.number().min(1).max(5), recommendation: z.string().min(1), }
  ```
- **BodySchema** (`supabase/functions/magic-up-score/index.ts`, z.object):
  ```ts
  { imageUrl: z.string().min(10), productName: z.string().optional().nullable(), clientName: z.string().optional().nullable(), campaignBrief: z.record(z.unknown()).optional().nullable(), brandKit: z.record(z.unknown()).optional().nullable(), creativeControls: z.record(z.unknown()).optional().nullable(), promptText: z.string().optional().nullable(), channel: z.string().optional().nullable(), aspectRatio: z.string().optional().nullable(), }
  ```
- **DiagnosisSchema** (`supabase/functions/magic-up-score/index.ts`, z.object):
  ```ts
  { total: z.number().min(0).max(100), label: z.string().min(1), summary: z.string().min(1), criteria: z.array(CriterionSchema).min(4).max(10), strengths: z.array(z.string()).default([]), risks: z.array(z.string()).default([]), recommendations: z.array(z.string()).default([]), }
  ```
- **uuidSchema** (`supabase/functions/manage-users/index.ts`, z.string):
  ```ts
  
  ```
- **emailSchema** (`supabase/functions/manage-users/index.ts`, z.string):
  ```ts
  
  ```
- **roleSchema** (`supabase/functions/manage-users/index.ts`, z.enum):
  ```ts
  ['dev', 'supervisor', 'vendedor', 'admin', 'manager']
  ```
- **promotionRoleSchema** (`supabase/functions/manage-users/index.ts`, z.enum):
  ```ts
  ['supervisor', 'vendedor']
  ```
- **CreateSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('create'), email: emailSchema, password: z.string().min(8).max(128), full_name: z.string().max(200).optional().default(''), role: roleSchema.optional(), }
  ```
- **UpdateEmailSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('update_email'), user_id: uuidSchema, new_email: emailSchema, }
  ```
- **UpdatePasswordSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('update_password'), user_id: uuidSchema, new_password: z.string().min(8).max(128), }
  ```
- **DeleteSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('delete'), user_id: uuidSchema, }
  ```
- **PromoteRoleSchema** (`supabase/functions/manage-users/index.ts`, z.object):
  ```ts
  { action: z.literal('promote_role'), user_id: uuidSchema, new_role: promotionRoleSchema, caller_password: z.string().min(1).max(128), reason: z.string().trim().min(10, 'Justificativa muito curta').max(500), }
  ```
- **PayloadSchema** (`supabase/functions/manage-users/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ CreateSchema, UpdateEmailSchema, UpdatePasswordSchema, DeleteSchema, PromoteRoleSchema, ]
  ```
- **MaterialsRequestSchema** (`supabase/functions/materials-api/index.ts`, z.object):
  ```ts
  { action: z.enum(['groups', 'types', 'types_by_group', 'product_materials', 'products_by_materials', 'stats', 'search', 'complete']), groupId: z.string().max(255).optional(), materialId: z.string().uuid().optional(), productId: z.string().uuid().optional(), materialTypeIds: z.array(z.string().uuid()).max(200).optional(), materialGroupSlugs: z.array(z.string().max(100)).max(50).optional(), limit: z.number().int().min(1).max(500).default(100), search: z.string().max(200).optional(), }
  ```
- **BodySchema** (`supabase/functions/mcp-keys-issue/index.ts`, z.object, encadeia superRefine):
  ```ts
  { name: z.string().trim().min(3).max(100), scopes: z .array(z.enum(KNOWN_SCOPES as unknown as [string, ...string[]])) .min(1) .max(KNOWN_SCOPES.length), expires_at: z .string() .datetime({ offset: true }) .nullable() .optional(), justification: z.string().trim().max(1000).optional().nullable(), confirmation_phrase: z.string().optional().nullable(), step_up_token: z.string().min(32).max(256).optional().nullable(), target_repo: z.string().trim().max(200).optional().nullable(), target_tool: z.string().trim().max(100).optional().nullable(), }
  ```
  - Regras cruzadas (refine): “Chaves com escopo ”
- **BodySchema** (`supabase/functions/mcp-keys-revoke/index.ts`, z.object):
  ```ts
  { key_id: z.string().uuid(), reason: z.string().trim().max(500).optional().nullable(), /** Token de step-up (senha + OTP) — obrigatório para revogar qualquer chave MCP. */ step_up_token: z.string().min(32).max(256).optional().nullable(), }
  ```
- **BodySchema** (`supabase/functions/mcp-keys-rotate/index.ts`, z.object):
  ```ts
  { source_key_id: z.string().uuid(), justification: z.string().trim().max(1000).optional().nullable(), confirmation_phrase: z.string().optional().nullable(), /** Token de step-up (senha + OTP) — obrigatório ao rotacionar chave FULL. */ step_up_token: z.string().min(32).max(256).optional().nullable(), }
  ```
- **BodySchema** (`supabase/functions/mcp-keys-update/index.ts`, z.object):
  ```ts
  { key_id: z.string().uuid(), name: z.string().trim().min(3).max(100).optional(), description: z.string().trim().max(1000).nullable().optional(), scopes: z .array(z.enum(KNOWN_SCOPES as unknown as [string, ...string[]])) .min(1) .max(KNOWN_SCOPES.length) .optional(), expires_at: z.string().datetime({ offset: true }).nullable().optional(), justification: z.string().trim().max(1000).optional().nullable(), confirmation_phrase: z.string().optional().nullable(), /** Token de step-up (senha + OTP) — obrigatório para escalar para FULL. */ step_up_token: z.string().min(32).max(256).optional().nullable(), }
  ```
- **SyncQuoteSchema** (`supabase/functions/quote-sync/index.ts`, z.object):
  ```ts
  { action: z.literal('sync_quote'), data: z.object({ quoteId: z.string().uuid('quoteId must be a valid UUID'), }), }
  ```
- **SyncAllPendingSchema** (`supabase/functions/quote-sync/index.ts`, z.object):
  ```ts
  { action: z.literal('sync_all_pending'), data: z.object({}).optional(), }
  ```
- **TestWebhookSchema** (`supabase/functions/quote-sync/index.ts`, z.object):
  ```ts
  { action: z.literal('test_webhook'), data: z.object({}).optional(), }
  ```
- **RequestSchema** (`supabase/functions/quote-sync/index.ts`, z.discriminatedUnion):
  ```ts
  'action', [ SyncQuoteSchema, SyncAllPendingSchema, TestWebhookSchema, ]
  ```
- **BodySchema** (`supabase/functions/rate-limit-check/index.ts`, z.object):
  ```ts
  { endpoint: z.enum(['login', 'api', 'ai', 'approval']).default('api'), }
  ```
- **BodySchema** (`supabase/functions/secrets-manager/index.ts`, z.object):
  ```ts
  { action: z.enum([ "list", "set", "delete", "status", "rotate", "rotation_history", "refresh_cache", "cache_metrics", "reset_cache_metrics", ]), names: z.array(z.string()).optional(), name: z.string().optional(), value: z.string().optional(), notes: z.string().max(500).optional(), }
  ```
- **ProductForRankSchema** (`supabase/functions/semantic-search/index.ts`, z.object):
  ```ts
  { id: z.string().min(1), name: z.string().optional().default(''), description: z.string().optional().default(''), tags: z.array(z.string()).optional().default([]), category: z.string().optional().default(''), }
  ```
- **SearchSchema** (`supabase/functions/semantic-search/index.ts`, z.object):
  ```ts
  { query: z.string().trim().min(2, 'Query too short').max(500, 'Query too long'), products: z.array(ProductForRankSchema).max(500).optional(), limit: z.number().int().min(1).max(100).optional().default(20), }
  ```
- **NotificationSchema** (`supabase/functions/send-notification/index.ts`, z.object):
  ```ts
  { user_id: z.string().uuid(), title: z.string().min(1).max(500), message: z.string().min(1).max(5000), type: z.string().max(50).optional().default('info'), category: z.string().max(50).optional().default('system'), action_url: z.string().max(2000).optional().nullable(), metadata: z.record(z.unknown()).optional().nullable(), scheduled_for: z.string().optional().nullable(), // ISO String }
  ```
- **SyncQuoteBitrixSchema** (`supabase/functions/sync-quote-bitrix/index.ts`, z.object):
  ```ts
  { quoteId: z.string().uuid(), pdfPath: z.string().max(600).optional(), }
  ```
- **BodySchema** (`supabase/functions/trends-insights/index.ts`, z.object):
  ```ts
  { days: z.number().int().min(1).max(365).optional().default(30), }
  ```
- **InsightResponseSchema** (`supabase/functions/trends-insights/index.ts`, z.object):
  ```ts
  { summary: z.string().min(1).max(1200), what_changed: z.string().min(1).max(2000), why: z.string().min(1).max(2000), next_action: z.string().min(1).max(2000), }
  ```
- **AccessBodySchema** (`supabase/functions/validate-access/index.ts`, z.object):
  ```ts
  { ip: z.string().max(45).optional(), userAgent: z.string().max(512).optional(), }
  ```
- **ImageSchema** (`supabase/functions/visual-search/index.ts`, z.object):
  ```ts
  { imageBase64: z.string().min(10, 'Image is required').max(10_000_000, 'Image too large'), }
  ```
- **TranscriptSchema** (`supabase/functions/voice-agent/index.ts`, z.object):
  ```ts
  { transcript: z.string().min(1, 'transcript cannot be empty').max(1000, 'transcript too long'), }
  ```
- **BodySchema** (`supabase/functions/webhook-dispatcher/index.ts`, z.object):
  ```ts
  { event: z.string().min(1), payload: z.unknown().optional(), // Replay mode: re-deliver a single failed delivery by id replay_delivery_id: z.string().uuid().optional(), // Internal SQL retry: restrict redelivery to the webhook that failed and // continue its attempt counter instead of fanning out to every subscriber. target_webhook_id: z.string().uuid().optional(), retry_after_attempt: z.number().int().min(0).max(4).optional(), // Test mode (Onda 13 #9): dispatch to a specific webhook, no metrics, no breaker, no DB log test_mode: z.boolean().optional(), test_webhook_id: z.string().uuid().optional(), }
  ```

### F.2 react-hook-form (register/rules)

| Campo | Regras | Arquivo |
|---|---|---|
| `sku` | `onChange: () => { if (!skuManuallyEdited) onSkuManualEdit();` | `src/components/admin/products/sections/ProductInfoSection.tsx` |
| `product_type` | `onChange: (event: ChangeEvent<HTMLSelectElement>) => setValue('is_kit', event.target.value === 'kit')` | `src/components/admin/products/sections/ProductPriceSection.tsx` |

### F.3 Restrições em inputs HTML (required/min/max/pattern)

| Campo | Restrições | Arquivo |
|---|---|---|
| `sort_order` | type=number | `src/components/admin/categories/CategoriesManager.tsx` |
| `bridge-products-min-price` | min, type=number, min=0, step=0.01, min | `src/components/admin/connections/BridgeProductsPreviewPanel.tsx` |
| `bridge-products-max-price` | max, type=number, min=0, step=0.01, max | `src/components/admin/connections/BridgeProductsPreviewPanel.tsx` |
| `bridge-products-min-stock` | min, type=number, min=0, step=1, min | `src/components/admin/connections/BridgeProductsPreviewPanel.tsx` |
| `mcp-key-expires` | type=datetime-local | `src/components/admin/connections/IssueMcpKeyForm.tsx` |
| `fId` | min=0, step=0.1 | `src/components/admin/products/sections/ProductDimensionsSection.tsx` |
| `fId` | min=0, step=0.1 | `src/components/admin/products/sections/ProductDimensionsSection.tsx` |
| `ipi_rate` | min=0, step=0.01 | `src/components/admin/products/sections/ProductFiscalSection.tsx` |
| `description` | min | `src/components/admin/products/sections/ProductInfoSection.tsx` |
| `lead_time_days` | min=0 | `src/components/admin/products/sections/ProductInfoSection.tsx` |
| `box_height_mm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_width_mm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_length_mm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_internal_height_cm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_internal_width_cm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_internal_length_cm` | min=0, step=0.1 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_weight_kg` | min=0, step=0.01 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_volume_cm3` | min=0 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_quantity` | min=0 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `box_inner_quantity` | min=0 | `src/components/admin/products/sections/ProductPackagingSection.tsx` |
| `suggested_price` | readOnly | `src/components/admin/products/sections/ProductPriceSection.tsx` |
| `stock_quantity` | min=0 | `src/components/admin/products/sections/ProductPriceSection.tsx` |
| `min_quantity` | min, min, min=1 | `src/components/admin/products/sections/ProductPriceSection.tsx` |
| `min_order_quantity` | min, min, min=0 | `src/components/admin/products/sections/ProductPriceSection.tsx` |
| `block-hours` | type=number, min=1, max=720 | `src/components/admin/security/BlockIpButton.tsx` |
| `dev-test-upload` | disabled=isUploading | `src/components/admin/security/SecureUploadManager.tsx` |
| `upd-mcp-expires` | type=datetime-local | `src/components/admin/security/keys/UpdateMcpKeyDialog.tsx` |
| `diag-token` | type=password, step | `src/components/admin/security/keys/diagnostics/FullOpDiagnosticsPanel.tsx` |
| `create-email` | type=email | `src/components/admin/users/CreateUserDialog.tsx` |
| `avatar-upload` | accept=image/*, disabled=uploading | `src/components/admin/users/EditUserDialog.tsx` |
| `edit-email` | type=email | `src/components/admin/users/EditUserDialog.tsx` |
| `password` | type=password | `src/components/admin/users/PromotionDialog.tsx` |
| `forgot-email` | type=email | `src/components/auth/ForgotPasswordForm.tsx` |
| `su-pwd` | type=password | `src/components/auth/StepUpAuthDialog.tsx` |
| `su-otp` | pattern=[0-9]{6, max | `src/components/auth/StepUpAuthDialog.tsx` |
| `days` | type=number, min=1, max=365 | `src/components/favorites/ShareListDialog.tsx` |
| `markup` | type=number, min=0, max=500, step=5 | `src/components/kit-builder/KitMarginSimulator.tsx` |
| `kit-qty` | type=number, min=1 | `src/components/kit-builder/kit-summary/KitIdentificationCard.tsx` |
| `custom-qty` | type=number, min=minQuantity | `src/components/products/inline-price/QuantityCalculator.tsx` |
| `custom-qty-col` | type=number, min=minQuantity | `src/components/products/inline-price/QuantityCalculator.tsx` |
| `sig-doc` | disabled=disabled | `src/components/quotes/QuoteSignaturePad.tsx` |
| `validity` | type=number, min=1, max=365 | `src/components/quotes/QuoteTemplateForm.tsx` |
| `discount_percent` | type=number, min=0, max=100, step=0.1 | `src/components/quotes/QuoteTemplateForm.tsx` |
| `discount_amount` | type=number, min=0, step=0.01 | `src/components/quotes/QuoteTemplateForm.tsx` |
| `visual-search-input` | accept=image/*, disabled=controller.isLoading | `src/components/search/VisualSearchButton.tsx` |
| `issuedAt` | type=date | `src/components/sicoob/orders/OrderInvoicesTab.tsx` |
| `payment-installment` | type=number, min=1, step=1, readOnly, readonly=true | `src/components/sicoob/orders/OrderPaymentsTab.tsx` |
| `payment-due-date` | type=date | `src/components/sicoob/orders/OrderPaymentsTab.tsx` |
| `login-email` | type=email | `src/pages/Auth.tsx` |
| `budget` | type=number | `src/pages/admin/AdminCampanhasPage.tsx` |
| `start` | type=date | `src/pages/admin/AdminCampanhasPage.tsx` |
| `end` | type=date | `src/pages/admin/AdminCampanhasPage.tsx` |
| `uf` | max | `src/pages/admin/AdminPAsPage.tsx` |
| `exp` | type=datetime-local | `src/pages/admin/AdminSegurancaAcessoPage.tsx` |
| `alcada` | type=number | `src/pages/admin/AdminSingularesPage.tsx` |
| `email` | type=email | `src/pages/admin/AdminSingularesPage.tsx` |
| `tpl-price` | type=number, step=0.01 | `src/pages/admin/KitTemplatesAdminPage.tsx` |
| `evidence-upload` | disabled=uploading | `src/pages/admin/qa/ReleaseEvidencesPage.tsx` |
| `delegation-start` | type=datetime-local | `src/pages/admin/sicoob/tabs/ApprovalDelegationsTab.tsx` |
| `delegation-end` | type=datetime-local | `src/pages/admin/sicoob/tabs/ApprovalDelegationsTab.tsx` |
| `policy-effective-from` | type=datetime-local | `src/pages/admin/sicoob/tabs/ApprovalPolicyTab.tsx` |
| `pa_id` | required | `src/pages/admin/sicoob/tabs/BudgetsTab.tsx` |
| `year` | type=number, required | `src/pages/admin/sicoob/tabs/BudgetsTab.tsx` |
| `amount` | type=number, step=0.01, required | `src/pages/admin/sicoob/tabs/BudgetsTab.tsx` |
| `alcada` | type=number, step=0.01, required | `src/pages/admin/sicoob/tabs/BudgetsTab.tsx` |
| `name` | required | `src/pages/admin/sicoob/tabs/CooperativasTab.tsx` |
| `code` | required | `src/pages/admin/sicoob/tabs/CooperativasTab.tsx` |
| `central_id` | required | `src/pages/admin/sicoob/tabs/CooperativasTab.tsx` |
| `alcada` | type=number, required | `src/pages/admin/sicoob/tabs/CooperativasTab.tsx` |
| `edit-name` | required | `src/pages/admin/sicoob/tabs/CooperativasTab.tsx` |
| `edit-code` | required | `src/pages/admin/sicoob/tabs/CooperativasTab.tsx` |
| `cooperativa_id` | required | `src/pages/admin/sicoob/tabs/PAsTab.tsx` |
| `name` | required | `src/pages/admin/sicoob/tabs/PAsTab.tsx` |
| `code` | required | `src/pages/admin/sicoob/tabs/PAsTab.tsx` |
| `uf` | max | `src/pages/admin/sicoob/tabs/PAsTab.tsx` |
| `cooperativa_id` | required | `src/pages/admin/sicoob/tabs/PAsTab.tsx` |
| `edit-name` | required | `src/pages/admin/sicoob/tabs/PAsTab.tsx` |
| `edit-code` | required | `src/pages/admin/sicoob/tabs/PAsTab.tsx` |
| `edit-uf` | max | `src/pages/admin/sicoob/tabs/PAsTab.tsx` |
| `magic-logo-upload` | accept=image/*, disabled=m.logoUploading | `src/pages/magic-up/MagicUpConfigPanel.tsx` |
| `received` | type=number, min=0, max=receiptFormState.remaining, step=1 | `src/pages/sicoob/GestorConsolidatedOrdersPage.tsx` |
| `damaged` | type=number, min=0, max=receiptFormState.remaining, step=1 | `src/pages/sicoob/GestorConsolidatedOrdersPage.tsx` |
| `missing` | type=number, min=0, max=receiptFormState.remaining, step=1 | `src/pages/sicoob/GestorConsolidatedOrdersPage.tsx` |
| `amount` | type=number | `src/pages/sicoob/PAWalletPage.tsx` |
| `reason` | min | `src/pages/sicoob/PAWalletPage.tsx` |
| `invitation-email` | type=email | `src/pages/sicoob/SicoobInvitationsPage.tsx` |
| `invitation-expiry` | type=number, min=1, max=168, step=1 | `src/pages/sicoob/SicoobInvitationsPage.tsx` |

## G. Fórmulas e derivações (como valores são calculados)

### G.1 Colunas calculadas no banco

_nenhum item encontrado_

### G.2 Views (consultas derivadas)

| View | SELECT |
|---|---|
| `v_color_hierarchy` | `SELECT cg.id AS group_id, cg.name AS group_name, cg.slug AS group_slug, cg.hex_code AS group_hex, cg.sort_order AS group_sort, cv.id AS variation_id, cv.name AS variation_name, cv.slug AS variation_slug, cv.hex_code AS variation_hex, cv.sort_order AS variation_sort FROM color_groups cg LEFT JOIN col …` |
| `v_product_novelties` | `SELECT n.id AS novelty_id, n.product_id, p.name AS product_name, p.sku AS product_sku, p.description AS product_description, p.price AS base_price, (p.images->0->>0)::TEXT AS product_image, n.supplier_id, n.supplier_code, n.supplier_product_code, p.supplier_name, p.category_id, p.category_name, n.de …` |
| `v_full_scope_grants` | `SELECT sual.id AS audit_id, sual.created_at AS granted_at, sual.user_id AS granted_to_user_id, p.full_name AS granted_to_name, public.audit_actor_email(sual.user_id)::varchar(255) AS granted_to_email, sual.action AS step_up_action, (sual.metadata->>'operation') AS operation, (sual.metadata->>'key_id …` |
| `sicoob_budget_audit` | `SELECT pb.pa_id, pa.nome as pa_nome, pb.ano, pb.mes, pb.verba_total, pb.verba_consumida as verba_registrada, COALESCE(SUM(so.total_amount), 0) as verba_calculada_pedidos, (pb.verba_consumida - COALESCE(SUM(so.total_amount), 0)) as discrepancia FROM public.pa_budgets pb JOIN public.postos_atendimento …` |
| `v_sicoob_hierarchy` | `SELECT c.id as central_id, c.name as central_name, c.primary_color as central_color, s.id as singular_id, s.nome as singular_name, s.codigo as singular_code, s.sicoob_tema_id as tema_id, t.name as tema_name, pa.id as pa_id, pa.nome as pa_name, pa.codigo as pa_code FROM public.sicoob_centrais c JOIN …` |
| `telemetry_query_performance` | `SELECT id, operation, table_name, duration_ms, severity, error_message, user_id, created_at FROM public.query_telemetry` |
| `catalog_marketing_term_usage` | `SELECT term.id, term.category, term.slug, term.name, term.description, term.sort_order, count(mapping.product_id)::bigint AS product_count FROM public.catalog_marketing_terms AS term LEFT JOIN public.catalog_product_marketing AS mapping ON mapping.term_id = term.id WHERE term.is_active GROUP BY term …` |

### G.3 Funções de cálculo/decisão no código

- **DiscountApprovalHeaderBadge()** — `src/components/admin/DiscountApprovalHeaderBadge.tsx`
  ```
  const { isAdmin } = useAuth(); const navigate = useNavigate(); const { data: count = 0 } = useQuery({ queryKey: QUERY_KEY, queryFn: async () => { const { count } = await supabase // rls-allow: admin-only via has_role; RLS filtra .from("discount_approval_requests") .select("*", { count: "exact", head: true }) .eq("status", "pending"); return count || 0; }, enabled: isAdmin, refetchInterval: 60_000, staleTime: 15_000, }); useDiscountApprovalRealtime(isAdmin); if (!isAdmin || count === 0) return nu …
  ```
- **DiscountHeader({ quote, hasMarkup, apparent, realPct, markup, limit }: { quote?: QuoteSummary | null; hasMarkup: boolean; apparent: num)** — `src/components/admin/DiscountApprovalQueue.tsx`
  ```
  const title = hasMarkup ? `Real: ${realPct.toFixed(2)}% · Aparente: ${apparent.toFixed(1)}% · Markup: +${markup.toFixed(1)}%` : undefined; return ( <CardHeader className="pb-3"><CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap"> <span>Orçamento {quote?.quote_number ?? "—"}</span> <div className="flex gap-1.5 flex-wrap"> {hasMarkup && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Aparente {apparent.toFixed(1)}%</Badge>} <Badge va …
  ```
- **DiscountRequestCard({ notes, onNotesChange, onRespond, pending, request }: DiscountRequestCardProps)** — `src/components/admin/DiscountApprovalQueue.tsx`
  ```
  const quote = request.quotes; const markup = Number(quote?.negotiation_markup_percent ?? 0); const apparent = Number(quote?.discount_percent ?? 0); const realPct = Number(quote?.real_discount_percent ?? request.requested_discount_percent); const hasMarkup = markup > 0; return ( <Card> <DiscountHeader quote={quote} hasMarkup={hasMarkup} apparent={apparent} realPct={realPct} markup={markup} limit={request.max_allowed_percent} /> <CardContent className="space-y-3"> <ClientSummary quote={quote} /> < …
  ```
- **fetchDiscountApprovalQueue()** — `src/components/admin/DiscountApprovalQueue.tsx`
  ```
  const { data, error } = await supabase // rls-allow: fila exclusiva de supervisor; policy valida a cooperativa .from("discount_approval_requests") .select("*, quotes:quote_id(quote_number, client_name, client_company, total, subtotal, discount_percent, negotiation_markup_percent, real_subtotal, real_discount_percent)") .eq("status", "pending") .order("created_at", { ascending: true }); if (error) throw error; return data || [];
  ```
- **DiscountApprovalQueue()** — `src/components/admin/DiscountApprovalQueue.tsx`
  ```
  const [notes, setNotes] = useState<Record<string, string>>({}); const { data, isLoading, respond } = useDiscountApprovalQueue(notes); if (isLoading) { return <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32" />)}</div>; } if (!data?.length) { return ( <Card> <CardContent className="py-12 text-center"> <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-2" /> <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p> </CardContent> …
  ```
- **formatCurrency(value: number)** — `src/components/admin/DiscountManagementPanel.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  ```
- **DiscountManagementPanel()** — `src/components/admin/DiscountManagementPanel.tsx`
  ```
  const navigate = useNavigate(); const { limits, isLoading: limitsLoading, fetchAllLimits, setLimit, deleteLimit } = useSellerDiscountLimits(); const { pendingRequests, isLoading: requestsLoading, fetchPendingRequests, respondToApproval } = useDiscountApproval(); const [sellers, setSellers] = useState<SellerProfile[]>([]); const [searchTerm, setSearchTerm] = useState(""); const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("all"); const [editDialog, setEditDialog] = useState<Edit …
  ```
- **applyRepair()** — `src/components/admin/OwnershipRepairDialog.tsx`
  ```
  if (!preview) return; if (!(await askConfirm({ title: 'Aplicar reparo?', description: 'Esta ação modifica o banco e é registrada nos logs.', variant: 'warning', confirmLabel: 'Aplicar reparo' }))) return; const r = await invoke(false); if (r) { setApplied(r); toast.success( `Reparo aplicado — apagados: ${r.totals.deleted}, desativados: ${r.totals.deactivated}, revisão: ${r.totals.manual_review}`, ); await qc.invalidateQueries({ queryKey: ["ownership-audit-reports"] }); }
  ```
- **validateSlug(slug: string)** — `src/components/admin/categories/CategoriesManager.tsx`
  ```
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  ```
- **validateCell(rowNumber: number, column: ColumnDefinition, value: unknown, errors: ImportError[])** — `src/components/admin/common/ImportExportManager.tsx`
  ```
  const empty = value === undefined || value === null || value === ''; if (column.required && empty) errors.push({ row: rowNumber, message: `Campo "${column.label}" é obrigatório.` }); if (empty) return; if (column.type === 'email' && !String(value).match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { errors.push({ row: rowNumber, message: `Email inválido: ${String(value)}` }); } if (column.type === 'number' && Number.isNaN(Number(value))) { errors.push({ row: rowNumber, message: `Valor numérico inválido: ${Str …
  ```
- **validateData(data: T[])** — `src/components/admin/common/ImportExportManager.tsx`
  ```
  setErrors(validationErrors(data, expectedColumns)); setPreviewData(data.map((row) => ({ ...row })));
  ```
- **calculateJobStats(runs: JobRun[])** — `src/components/admin/connections/AutoTestJobStatusCard.tsx`
  ```
  const recentRuns = runs.filter((run) => Date.now() - new Date(run.run_started_at).getTime() < 86_400_000); const total = recentRuns.reduce((sum, run) => sum + run.total_tested, 0); const ok24 = recentRuns.reduce((sum, run) => sum + run.ok_count, 0); return { lastRun: runs[0], runs24: recentRuns.length, ok24, fail24: recentRuns.reduce((sum, run) => sum + run.fail_count, 0), successRate24: total > 0 ? Math.round((ok24 / total) * 100) : null, };
  ```
- **canRunTest(looksValid: boolean, issueCount: number)** — `src/components/admin/connections/Bitrix24Tab.tsx`
  ```
  return looksValid && issueCount === 0;
  ```
- **shouldShowInlinePreview(defaultPreview: boolean, expanded: boolean, empty: boolean, hasPending: boolean)** — `src/components/admin/connections/ConnectionTestHistoryPanel.tsx`
  ```
  return defaultPreview && !expanded && (!empty || hasPending);
  ```
- **deliveryTotal(data: FailedDeliveriesData | undefined)** — `src/components/admin/connections/FailedDeliveriesPanel.tsx`
  ```
  return data?.count ?? 0;
  ```
- **invalidTone(rate: number)** — `src/components/admin/connections/InboundEventsPanel.tsx`
  ```
  if (rate > 15) return "destructive"; if (rate > 5) return "warning"; return "success";
  ```
- **validateFullScope(expiresLocal: string, justification: string, confirmation: string)** — `src/components/admin/connections/IssueMcpKeyForm.tsx`
  ```
  if (!expiresLocal) return "Defina uma data de expiração."; const expiration = new Date(expiresLocal).getTime(); if (Number.isNaN(expiration) || expiration <= Date.now()) return "Expiração precisa ser no futuro."; const maxMs = FULL_SCOPE_MAX_TTL_DAYS * 24 * 60 * 60 * 1000; if (expiration - Date.now() > maxMs) return `Janela máxima é ${FULL_SCOPE_MAX_TTL_DAYS} dias.`; if (justification.trim().length < FULL_SCOPE_MIN_JUSTIFICATION) { return `Justificativa precisa de ao menos ${FULL_SCOPE_MIN_JUSTI …
  ```
- **validateKeyForm({ name, scopes, full, expiresLocal, justification, confirmation, }: { name: string; scopes: McpScope[]; full: boolean; e)** — `src/components/admin/connections/IssueMcpKeyForm.tsx`
  ```
  if (name.trim().length < 3) return "Informe um nome (mín. 3 caracteres)."; if (scopes.length === 0) return "Selecione ao menos um escopo."; return full ? validateFullScope(expiresLocal, justification, confirmation) : null;
  ```
- **ValidationKeyRow({ row }: { row: EvalRow })** — `src/components/admin/connections/KeysValidationTab.tsx`
  ```
  const statusMeta = STATUS_META[row.status]; const StatusIcon = statusMeta.Icon; const severity = SEV_BADGE[row.expected.severity]; return ( <li className="py-2.5 flex items-start justify-between gap-3 flex-wrap"> <div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><code className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted">{row.expected.name}</code><Badge variant="outline" className={cn("text-[10px]", severity.cls)}>{severity.label}</Badge>{row.status === "o …
  ```
- **ValidationGroups({ loading, evaluations, groups, collapsed, onToggle }: { loading: boolean; evaluations: EvalRow[]; groups: VisibleGroup[)** — `src/components/admin/connections/KeysValidationTab.tsx`
  ```
  void }) {
  ```
- **ValidationHeader({ loading, onReload }: { loading: boolean; onReload: ()** — `src/components/admin/connections/KeysValidationTab.tsx`
  ```
  void }) {
  ```
- **ValidationFilters({ filter, onlyIssues, issuesCount, onFilterChange, onOnlyIssuesChange }: { filter: string; onlyIssues: boolean; issuesCo)** — `src/components/admin/connections/KeysValidationTab.tsx`
  ```
  void; onOnlyIssuesChange: () => void }) {
  ```
- **configurationScore(ok: number, total: number)** — `src/components/admin/connections/KeysValidationTab.tsx`
  ```
  return total === 0 ? 0 : Math.round((ok / total) * 100);
  ```
- **shouldShowPlainSuffix(status: ReturnType<typeof diagnoseMaskedSuffix>['status'], showWhenValid: boolean)** — `src/components/admin/connections/MaskedSuffixBadge.tsx`
  ```
  return status === "valid" && !showWhenValid;
  ```
- **ValidationNotice({ value, validation }: { value: string; validation: ValueValidation })** — `src/components/admin/connections/SecretField.tsx`
  ```
  if (value.length >= MIN_SUFFIX_LENGTH && !validation.ok && validation.message) { return <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {validation.message}</p>; } if (value.length === 0 && validation.hint) return <p className="text-xs text-muted-foreground">{validation.hint}</p>; if (value.length > 0 && validation.ok && validation.hint) return <p className="text-xs text-success">Formato válido</p>; return null;
  ```
- **ValidTransition({ value, validation, mode, status }: { value: string; validation: ValueValidation; mode: "set" | "rotate"; status?: Secr)** — `src/components/admin/connections/SecretField.tsx`
  ```
  if (value.length === 0 || !validation.ok) return null; return <SecretTransitionPreview value={value} mode={mode} status={status} />;
  ```
- **canSaveSecret(saving: boolean, nameValidation: NameValidation, value: string, validation: ValueValidation)** — `src/components/admin/connections/SecretField.tsx`
  ```
  return !saving && nameValidation.ok && value.length >= MIN_SUFFIX_LENGTH && validation.ok;
  ```
- **specializedValidationMessage(name: string, value: string, rule: ValidatorRule)** — `src/components/admin/connections/secretValidators.ts`
  ```
  if (SUPABASE_URL_SECRET_NAMES.has(name)) { return urlEndsWithSupabase(value).message ?? rule.message; } if (SUPABASE_JWT_SECRET_NAMES.has(name)) { const label = name.includes("SERVICE_ROLE") ? "Service Role Key" : "Anon Key"; return jwtRule(label, value).message ?? rule.message; } return rule.message;
  ```
- **validateSecret(name: string, value: string)** — `src/components/admin/connections/secretValidators.ts`
  ```
  const rule = SECRET_VALIDATORS[name] ?? DEFAULT_RULE; if (value.length === 0) { return { ok: false, hint: rule.hint }; } // Guarda inviolável: sufixo mascarado exige exatamente 4 caracteres. // Aplicada antes do validador específico para garantir mensagem clara // mesmo em secrets com regras customizadas (ex: BITRIX24_DOMAIN). if (value.length < MIN_SUFFIX_LENGTH) { return { ok: false, message: shortValueMessage(value.length), hint: rule.hint, }; } if (rule.test(value)) { return { ok: true, hint …
  ```
- **validateSecretName(name: string)** — `src/components/admin/connections/secretWhitelist.ts`
  ```
  const trimmed = (name ?? "").trim(); if (!trimmed) { return { ok: false, code: "empty", message: "Informe o nome da credencial.", }; } if (ALLOWED_SECRET_NAMES.has(trimmed)) { return { ok: true }; } // Prefix-based names still need a sane shape const matchedPrefix = ALLOWED_SECRET_PREFIXES.find((p) => trimmed.startsWith(p)); if (matchedPrefix) { if (!NAME_SHAPE.test(trimmed)) { return { ok: false, code: "bad_shape", message: `Nomes com prefixo ${matchedPrefix} devem usar apenas A–Z, 0–9 e _ (3–6 …
  ```
- **calculateDeliveryRate(deliveries: Array<{ success: boolean }> | null)** — `src/components/admin/connections/usePulseBarStatus.ts`
  ```
  total: number; rate: number | null
  ```
- **shouldNotify(state: NotifierState, severity: "P0" | "P1", previous: PulseSeverity | null)** — `src/components/admin/connections/useSeverityChangeNotifier.ts`
  ```
  if (state.muted[severity] || state.acked[severity]) return false; if (Date.now() < state.snoozedUntil[severity]) return false; return previous === null || previous !== severity;
  ```
- **validateRequiredFields(mapped: SpreadsheetRow, requiredFields: string[])** — `src/components/admin/products/BulkImportDialog.tsx`
  ```
  return requiredFields.flatMap((field) => { const value = mapped[field]; return value === undefined || value === null || String(value).trim() === '' ? [`"${fieldLabel(field)}" obrigatório`] : []; });
  ```
- **validateUrlFields(mapped: SpreadsheetRow)** — `src/components/admin/products/BulkImportDialog.tsx`
  ```
  return URL_FIELDS.flatMap((field) => { const value = mapped[field]; if (!value || typeof value !== 'string') return []; const url = value.trim(); return url && !url.startsWith('http://') && !url.startsWith('https://') ? [`"${fieldLabel(field)}" não parece ser uma URL válida`] : []; });
  ```
- **validateSpreadsheetRow(row: SpreadsheetRow, index: number, context: SpreadsheetValidationContext)** — `src/components/admin/products/BulkImportDialog.tsx`
  ```
  const { mapping, requiredFields, seenSkus } = context; const mapped = mapSpreadsheetRow(row, mapping); const errors = validateRequiredFields(mapped, requiredFields); const warnings = validateUrlFields(mapped); normalizeSalePrice(mapped, errors); normalizeNumericFields(mapped, warnings); normalizeBooleanFields(mapped); const sku = normalizeIdentity(mapped, errors, warnings); if (seenSkus.has(sku) && sku) warnings.push('SKU duplicado dentro do arquivo'); if (sku) seenSkus.add(sku); return { row: i …
  ```
- **PriceFilterBadge({ filters, update }: { filters: ProductFilters; update: UpdateFilters })** — `src/components/admin/products/ProductFiltersBar.tsx`
  ```
  const minimum = filters.price_min ?? 0; const maximum = filters.price_max ?? 0; if (minimum <= 0 && maximum <= 0) return null; return ( <Badge variant="secondary" className="text-xs gap-1"> R$ {minimum} – {maximum > 0 ? maximum : '∞'} <X className="h-3 w-3 cursor-pointer" onClick={() => update({ price_min: undefined, price_max: undefined })} /> </Badge> );
  ```
- **PriceFilter({ filters, update }: { filters: ProductFilters; update: UpdateFilters })** — `src/components/admin/products/ProductFiltersBar.tsx`
  ```
  const parsePrice = (value: string) => value ? parseFloat(value) : undefined; return ( <div className="space-y-1.5"> <label className="text-xs font-medium text-muted-foreground">Faixa de Preço (R$)</label> <div className="flex items-center gap-2"> <Input type="number" placeholder="Mín" value={filters.price_min ?? ''} onChange={(event) => update({ price_min: parsePrice(event.target.value) })} className="h-9 text-sm" min={0} step={0.01} /> <span className="text-xs text-muted-foreground">–</span> <I …
  ```
- **parsePrice(value: string)** — `src/components/admin/products/ProductFiltersBar.tsx`
  ```
  value ? parseFloat(value) : undefined;
  ```
- **formatPrice(price: number)** — `src/components/admin/products/ProductPreviewPanel.tsx`
  ```
  
  ```
- **shouldShowFiscalInfo(data: SupplierFiscalData, isEditing: boolean)** — `src/components/admin/products/SupplierFiscalInfo.tsx`
  ```
  return isEditing || hasFiscalData(data) || hasBranchData(data);
  ```
- **applyAltText(template: string)** — `src/components/admin/products/image-gallery/ImageBulkToolbar.tsx`
  ```
  bulkUpdateAltText(template); setAltTemplate('');
  ```
- **validateNewSupplier(name: string, cnpj: string, pixKeys: PixKey[])** — `src/components/admin/products/new-supplier/useNewSupplierForm.ts`
  ```
  if (!name.trim()) return 'Nome do fornecedor é obrigatório'; const duplicatePix = findPixDuplicate(pixKeys); if (duplicatePix) return `Chave PIX duplicada: "${duplicatePix}". Remova a duplicata antes de salvar.`; const invalidPix = pixKeys.find(key => key.chave.trim() && validatePixKey(key.chave, key.tipo)); if (invalidPix) return validatePixKey(invalidPix.chave, invalidPix.tipo); const digits = cnpj.replace(/\D/g, ''); return digits && !validateCnpj(digits) ? 'CNPJ informado é inválido' : null;
  ```
- **validateLogoFile(file: File)** — `src/components/admin/products/new-supplier/useNewSupplierForm.ts`
  ```
  if (!file.type.startsWith('image/')) return 'Selecione uma imagem'; if (file.size > 2 * 1024 * 1024) return 'Máximo 2MB'; return null;
  ```
- **parsePriceInput(value: string)** — `src/components/admin/products/sections/ProductPriceSection.tsx`
  ```
  return Number.parseFloat(value.replace(',', '.'));
  ```
- **PriceFields({ props, suggestedPrice }: { props: Props; suggestedPrice: number })** — `src/components/admin/products/sections/ProductPriceSection.tsx`
  ```
  const { setValue, errors, supplierMarkup, costPriceDisplay, salePriceDisplay, onCostPriceDisplayChange, onSalePriceDisplayChange, onSalePriceManualEdit } = props; const handleCostChange = (event: ChangeEvent<HTMLInputElement>) => { const raw = event.target.value.replace(/[^0-9.,]/g, ''); onCostPriceDisplayChange(raw); const value = parsePriceInput(raw); if (!Number.isNaN(value)) setValue('cost_price', value); }; const handleSaleChange = (event: ChangeEvent<HTMLInputElement>) => { const raw = eve …
  ```
- **formatCurrency(value: number | null)** — `src/components/admin/products/sections/ProductSupplierSection.tsx`
  ```
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **invalidate()** — `src/components/admin/products/sections/engraving/useEngravingWizard.ts`
  ```
  queryClient.invalidateQueries({ queryKey: ['print-area-techniques', productId] });
  ```
- **videoValidationError(file: File)** — `src/components/admin/products/video-gallery/useProductVideoGallery.ts`
  ```
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) return `"${file.name}" não é um formato suportado`; if (file.size > MAX_FILE_SIZE) return `"${file.name}" excede 100MB`; return null;
  ```
- **regenerateVideoThumbnail(videoUrl: string, productId: string)** — `src/components/admin/products/video-gallery/useProductVideoGallery.ts`
  ```
  const response = await fetch(videoUrl); if (!response.ok) throw new Error('Falha ao baixar vídeo'); const blob = await response.blob(); const file = new File([blob], 'video.mp4', { type: blob.type || 'video/mp4' }); const thumbnail = await extractThumbnailFromVideo(file); if (!thumbnail) return null; const path = `thumbnails/${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`; const { data, error } = await supabase.storage.from(VIDEO_STORAGE_BUCKET).upload(path, thumbnail, …
  ```
- **shouldShowQuickBlock(stats: AnomalyStats)** — `src/components/admin/security/AnomalyCards.tsx`
  ```
  return stats.loginFailures24h >= 10 || stats.tokenFailures24h >= 5 || stats.botHits24h >= 20;
  ```
- **byTotal(left: AggRow, right: AggRow)** — `src/components/admin/security/SecurityAnalytics.tsx`
  ```
  right.total - left.total;
  ```
- **validateRotation(source: McpKeyRow, justification: string, confirmation: string)** — `src/components/admin/security/keys/RotateMcpKeyDialog.tsx`
  ```
  if (!source.is_full) return true; if (justification.trim().length < FULL_SCOPE_MIN_JUSTIFICATION) { toast.error(`Justificativa precisa de ao menos ${FULL_SCOPE_MIN_JUSTIFICATION} caracteres.`); return false; } if (confirmation !== FULL_SCOPE_CONFIRMATION) { toast.error(`Digite "${FULL_SCOPE_CONFIRMATION}" para confirmar.`); return false; } return true;
  ```
- **validateEscalation(expiresLocal: string, justification: string, confirmation: string)** — `src/components/admin/security/keys/UpdateMcpKeyDialog.tsx`
  ```
  if (!expiresLocal) return "Chaves FULL exigem data de expiração."; const expiration = new Date(expiresLocal).getTime(); if (Number.isNaN(expiration) || expiration <= Date.now()) return "Expiração precisa ser no futuro."; const maxMs = FULL_SCOPE_MAX_TTL_DAYS * 24 * 60 * 60 * 1000; if (expiration - Date.now() > maxMs) return `Janela máxima é ${FULL_SCOPE_MAX_TTL_DAYS} dias.`; if (justification.trim().length < FULL_SCOPE_MIN_JUSTIFICATION) { return `Justificativa precisa de ao menos ${FULL_SCOPE_M …
  ```
- **validateUpdate({ source, name, scopes, escalating, expiresLocal, justification, confirmation, }: { source: McpKeyRow | null; name: stri)** — `src/components/admin/security/keys/UpdateMcpKeyDialog.tsx`
  ```
  if (!source) return null; if (name.trim().length < 3) return "Nome precisa ter ao menos 3 caracteres."; if (scopes.length === 0) return "Selecione ao menos um escopo."; return escalating ? validateEscalation(expiresLocal, justification, confirmation) : null;
  ```
- **migrationValidation(selectedCount: number, label: string, reason: string)** — `src/components/admin/security/role-migration/RoleMigrationPanel.tsx`
  ```
  if (selectedCount === 0) return "Selecione ao menos 1 usuário"; if (label.trim().length < 3) return "Defina um rótulo descritivo para o lote (mín. 3 caracteres)"; if (reason.trim().length < 5) return "Justifique a migração (mín. 5 caracteres)"; return null;
  ```
- **validateSupplierDraft(supplier: Partial<Supplier> | null, pixKeys: PixKey[])** — `src/components/admin/suppliers-manager/useSuppliersManager.ts`
  ```
  if (!supplier?.name?.trim()) return 'Nome é obrigatório'; const duplicatePix = findPixDuplicate(pixKeys); if (duplicatePix) return `Chave PIX duplicada: "${duplicatePix}". Remova a duplicata antes de salvar.`; const invalidPix = pixKeys.find(key => key.chave.trim() && validatePixKey(key.chave, key.tipo)); if (invalidPix) return validatePixKey(invalidPix.chave, invalidPix.tipo); const cnpj = supplier.cnpj?.replace(/\D/g, '') || ''; return cnpj && !validateCnpj(cnpj) ? 'CNPJ informado é inválido' …
  ```
- **validateLogoFile(file: File)** — `src/components/admin/suppliers-manager/useSuppliersManager.ts`
  ```
  if (!file.type.startsWith('image/')) return 'Selecione um arquivo de imagem'; if (file.size > 2 * 1024 * 1024) return 'Imagem deve ter no máximo 2MB'; return null;
  ```
- **canGenerateRecommendations(client: ClientProfile, productCount: number, isLoading: boolean)** — `src/components/ai/AIRecommendationsPanel.tsx`
  ```
  return Boolean(client.name.trim()) && productCount > 0 && !isLoading;
  ```
- **validateTestUsers(attempt: number, setValidating: (value: boolean)** — `src/components/auth/QuickTestLogin.tsx`
  ```
  void, setStatus: (value: IntegrityStatus) => void): Promise<void> {
  ```
- **canSendQuestion(question: string, loading: boolean, contextReady = true)** — `src/components/bi/BIAiCopilot.tsx`
  ```
  return question.length > 0 && !loading && contextReady;
  ```
- **rowScore(row: MergedRow)** — `src/components/bi/ClientCategoryRadar.tsx`
  ```
  const gapScore = row.status === "gap" ? 1000 : 0; const superScore = row.status === "super" ? 500 : 0; return gapScore + superScore + row.clientShare + row.industryShare;
  ```
- **comparisonScore(row: ClientComparisonRow)** — `src/components/bi/ClientComparator.tsx`
  ```
  return row.unavailable.health || row.tier === "unknown" ? "—" : row.score;
  ```
- **formatCurrency(value: number)** — `src/components/cart/CartHeaderButton.tsx`
  ```
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  ```
- **formatCurrency(value: number)** — `src/components/cart/CartUtilComponents.tsx`
  ```
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  ```
- **formatCurrency(value: number)** — `src/components/cart/SortableCartItem.tsx`
  ```
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  ```
- **shouldFocusCatalogSearch(event: KeyboardEvent)** — `src/components/catalog/CatalogHeader.tsx`
  ```
  if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return false; const target = event.target as HTMLElement | null; if (!target) return true; return target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable;
  ```
- **generateToken()** — `src/components/collections/ShareCollectionDialog.tsx`
  ```
  setBusy(true); try { const expires = new Date(); expires.setDate(expires.getDate() + 30); const { data, error } = await supabase .from("collections") .update({ share_token: crypto.randomUUID(), share_expires_at: expires.toISOString(), is_public: true, }) .eq("id", collectionId) .select("share_token, share_expires_at, is_public") .single(); if (error) throw error; updateCollection(collectionId, { shareToken: data.share_token, shareExpiresAt: data.share_expires_at, isPublic: true, }); const url = …
  ```
- **canShowBreadcrumb(path: string, isDev: boolean)** — `src/components/common/PersistentBreadcrumbs.tsx`
  ```
  return isDev || !isDevOnlyPath(path);
  ```
- **appendShippingBadge(badges: React.ReactNode[], productFlags?: ProductBadgeFlags)** — `src/components/common/SocialProof.tsx`
  ```
  const qualifiesForFreeShipping = productFlags?.freeShipping === true || (productFlags?.minQuantity ?? 0) >= 500; if (qualifiesForFreeShipping) { badges.push(<TrustBadge key="freeShipping" type="freeShipping" tooltip="Frete grátis para pedidos acima da quantidade mínima" />); }
  ```
- **fetchPricePoints(productId: string)** — `src/components/compare/PriceSparkline.tsx`
  ```
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); const { data: rows } = await supabase .from("price_history") .select("recorded_at,price") .eq("product_id", productId) .gte("recorded_at", since) .order("recorded_at", { ascending: true }) .limit(60); return (rows ?? []).map((row) => ({ date: row.recorded_at, price: Number(row.price ?? 0), }));
  ```
- **priceEndpoints(data: PricePoint[])** — `src/components/compare/PriceSparkline.tsx`
  ```
  const first = data[0]?.price ?? 0; return { first, last: data[data.length - 1]?.price ?? first };
  ```
- **PriceSparkline({ productId, className }: Props)** — `src/components/compare/PriceSparkline.tsx`
  ```
  const [data, setData] = useState<PricePoint[]>([]); const [loading, setLoading] = useState(true); useEffect(() => { let cancelled = false; void fetchPricePoints(productId) .then((points) => { if (!cancelled) setData(points); }) .catch(() => undefined) .finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [productId]); if (loading) { return <div className={cn("h-6 w-16 bg-muted/50 rounded animate-pulse", className)} />; } if (data.length < 2) { return ( <s …
  ```
- **generateLink()** — `src/components/compare/ShareComparisonDialog.tsx`
  ```
  setGenerating(true); try { const { data: userData } = await supabase.auth.getUser(); if (!userData.user) { toast.error("Faça login para compartilhar"); return; } const days = parseInt(expiresIn, 10); const expiresAt = new Date(Date.now() + days * 86400000).toISOString(); const { data, error } = await supabase .from("user_comparisons") .insert({ user_id: userData.user.id, client_id: clientId ?? null, client_name: clientName ?? null, items: JSON.parse(JSON.stringify(compareItems)) as Json, is_publ …
  ```
- **PriceDifference({ base, difference, percent, format }: { base: boolean; difference: number; percent: number; format: (value: number)** — `src/components/compare/SupplierComparisonModal.tsx`
  ```
  string }) {
  ```
- **formatCurrency(value: number)** — `src/components/compare/SupplierComparisonModal.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", }).format(value);
  ```
- **formatCurrency(value: number)** — `src/components/dashboard/QuickActionsPanel.tsx`
  ```
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  ```
- **formatCurrency(value: number)** — `src/components/engraving/PricingPanel.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", }).format(value);
  ```
- **shouldShowSection(id: string, search: string, options: FlowFilterOptions)** — `src/components/expert/FlowFilterPanel.tsx`
  ```
  const query = search.toLowerCase(); const matches = !query || id.includes(query); const optionMap: Record<string, string[]> = { cores: options.colors, categorias: options.categories, materiais: options.materials, fornecedores: options.suppliers, tecnicas: options.techniques, publico: options.publicoAlvo, datas: options.datasComemorativas, endomarketing: options.endomarketing, nichos: options.nichos, tags: options.tags }; const sectionOptions = optionMap[id]; return sectionOptions ? sectionOption …
  ```
- **totalOptions(id: string, options: FlowFilterOptions)** — `src/components/expert/FlowFilterPanel.tsx`
  ```
  const map: Record<string, number> = { cores: options.colors.length, categorias: options.categories.length, materiais: options.materials.length, genero: GENDER_OPTIONS.length, fornecedores: options.suppliers.length, tecnicas: options.techniques.length, publico: options.publicoAlvo.length, datas: options.datasComemorativas.length, endomarketing: options.endomarketing.length, nichos: options.nichos.length, tags: options.tags.length, estoque: 1, rapidas: 5, preco: PRICE_PRESETS_COUNT }; return map[i …
  ```
- **PriceSection({ filters, update }: Pick<SectionContentProps, "filters" | "update">)** — `src/components/expert/FlowFilterSections.tsx`
  ```
  const handlePreset = (min: string, max: string) => { if (filters.priceMin === min && filters.priceMax === max) update({ priceMin: "", priceMax: "" }); else update({ priceMin: min, priceMax: max }); }; const updatePrice = (key: "priceMin" | "priceMax", value: string) => { if (value === "" || Number(value) >= 0) update({ [key]: value }); }; return ( <div className="space-y-2"> <div className="flex flex-wrap gap-1.5"> {PRICE_PRESETS.map(preset => <button key={preset.label} onClick={() => handlePres …
  ```
- **updatePrice(key: "priceMin" | "priceMax", value: string)** — `src/components/expert/FlowFilterSections.tsx`
  ```
  if (value === "" || Number(value) >= 0) update({ [key]: value });
  ```
- **PriceInput({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (value: string)** — `src/components/expert/FlowFilterSections.tsx`
  ```
  void }) {
  ```
- **shouldShowPriceDropChip(onTogglePriceDrops: Props["onTogglePriceDrops"], priceDropCount: Props["priceDropCount"], onlyPriceDrops: boolean,)** — `src/components/favorites/FavoritesSortBar.tsx`
  ```
  if (!onTogglePriceDrops) return false; // Com o filtro ligado o chip precisa continuar visível: é o único jeito de desligar // quando a lista atual não tem nenhuma queda. if (onlyPriceDrops) return true; if (typeof priceDropCount !== "number") return true; return priceDropCount > 0;
  ```
- **PriceDropCount({ count, selected }: { count: number | null | undefined; selected: boolean })** — `src/components/favorites/FavoritesSortBar.tsx`
  ```
  if (typeof count !== "number" || count <= 0) return null; const colorClass = selected ? "bg-success-foreground/20 text-success-foreground" : "bg-success/20 text-success"; return ( <span className={cn("rounded-full px-1.5 text-[10px] font-bold tabular-nums", colorClass)}> {count} </span> );
  ```
- **PriceDropFilter({ selected, onToggle, count, }: { selected: boolean; onToggle: (value: boolean)** — `src/components/favorites/FavoritesSortBar.tsx`
  ```
  void;
  ```
- **PriceMovement({ isDrop, label, size }: { isDrop: boolean; label: string; size: "sm" | "md" })** — `src/components/favorites/PriceDropBadge.tsx`
  ```
  const Icon = isDrop ? TrendingDown : TrendingUp; const sizeClass = size === "sm" ? "text-[10px]" : "text-xs"; const colorClass = isDrop ? "bg-success/15 text-success border-success/30" : "bg-muted/80 text-muted-foreground border-border"; const ariaLabel = isDrop ? `Preço caiu ${label}` : `Preço subiu ${label}`; return ( <div className={cn( "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums backdrop-blur-sm border shadow-sm", sizeClass, colorClass, )} aria-label={ …
  ```
- **PriceDropBadge({ priceDiffPct, priceAtSave, currentPrice, savedAt, threshold = 2, size = "sm", }: Props)** — `src/components/favorites/PriceDropBadge.tsx`
  ```
  if (priceDiffPct === null || priceAtSave === null) return null; if (Math.abs(priceDiffPct) < threshold) return null; const isDrop = priceDiffPct < 0; const label = `${isDrop ? "−" : "+"}${Math.abs(priceDiffPct).toFixed(0)}%`; const savedAtLabel = savedAt ? new Date(savedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : null; return ( <TooltipProvider delayDuration={200}> <Tooltip> <TooltipTrigger asChild> <PriceMovement isDrop={isDrop} label={label} size={size} /> </Tooltip …
  ```
- **activePrice(filters: FilterState)** — `src/components/filters/filter-panel/useFilterPanelState.ts`
  ```
  return filters.priceRange[0] > 0 || filters.priceRange[1] < 9999;
  ```
- **priceUpperLabel(value: number)** — `src/components/filters/filter-panel/useFilterPanelState.ts`
  ```
  return value >= 9999 ? '∞' : value;
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/CategoryRanking.tsx`
  ```
  
  ```
- **TotalConversion({ data, isLoading }: { data?: FunnelData; isLoading: boolean })** — `src/components/intelligence/ConversionFunnel.tsx`
  ```
  if (isLoading || !data || data.searches <= 0) return null; return <div className="mt-4 pt-3 border-t border-border/50"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Conversão total (busca → pedido):</span><span className="font-bold text-success">{((data.orders / data.searches) * 100).toFixed(2)}%</span></div></div>;
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/IntelligenceKPICards.tsx`
  ```
  
  ```
- **RankingSummary({ summary, formatCurrency }: { summary: { totalRev: number; totalQty: number; totalOrders: number; avgTicket: number } |)** — `src/components/intelligence/ProductRankingSearch.tsx`
  ```
  string }) {
  ```
- **RankingResults({ products, loading, search, topRevenue, formatCurrency, onOpen }: { products: RankingProducts | undefined; loading: boo)** — `src/components/intelligence/ProductRankingSearch.tsx`
  ```
  string; onOpen: (id: string) => void }) {
  ```
- **RankingFooter({ products, search, categoryName, supplierName, days }: { products: RankingProducts | undefined; search: string; categor)** — `src/components/intelligence/ProductRankingSearch.tsx`
  ```
  if (!products?.length) return null; return <p className="text-[10px] text-muted-foreground text-center">Top {products.length} {search ? `para "${search}"` : 'produtos'}{categoryName ? ` · ${categoryName}` : ''}{supplierName ? ` · ${supplierName}` : ''} · {days} dias · ordenado por faturamento</p>;
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/ProductRankingSearch.tsx`
  ```
  
  ```
- **RankingFilterToolbar({ filters, suppliers, categories, onSearchChange, onDaysChange, onLimitChange, onSupplierChange, onCategoryChange, onCle)** — `src/components/intelligence/RankingFilterToolbar.tsx`
  ```
  const [supOpen, setSupOpen] = useState(false); const [supSearch, setSupSearch] = useState(""); const [catOpen, setCatOpen] = useState(false); const [catSearch, setCatSearch] = useState(""); const filteredSuppliers = useMemo(() => { if (!supSearch.trim()) return suppliers; const q = supSearch.toLowerCase().trim(); return suppliers.filter(s => s.name.toLowerCase().includes(q)); }, [suppliers, supSearch]); const filteredCategories = useMemo(() => { if (!catSearch.trim()) return categories; const q …
  ```
- **RankBadge({ index }: { index: number })** — `src/components/intelligence/RankingResultRow.tsx`
  ```
  if (index === 0) return <span className="text-base" title="1º lugar">🥇</span>; if (index === 1) return <span className="text-base" title="2º lugar">🥈</span>; if (index === 2) return <span className="text-base" title="3º lugar">🥉</span>; return ( <span className={cn( "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", "bg-muted text-muted-foreground", )}> {index + 1} </span> );
  ```
- **RankingResultRow({ product, index, topRevenue, searchQuery, formatCurrency, onClick }: RankingResultRowProps)** — `src/components/intelligence/RankingResultRow.tsx`
  ```
  const avgUnit = product.totalQuantity > 0 ? product.totalRevenue / product.totalQuantity : 0; return ( <div className={cn( "grid gap-2 px-3 py-2.5 hover:bg-muted/20 cursor-pointer transition-colors items-center", "grid-cols-[2rem_2.5rem_1fr_auto] sm:grid-cols-[2rem_2.5rem_1fr_4.5rem_5rem_5rem_4rem]", index < 3 && "bg-primary/[0.02]" )} onClick={onClick} > {/* Rank */} <div className="flex items-center justify-center"> <RankBadge index={index} /> </div> {/* Image */} <div className="w-9 h-9 round …
  ```
- **applyView(view: SavedView)** — `src/components/intelligence/SavedViewsManager.tsx`
  ```
  const sp = new URLSearchParams(); Object.entries(view.filters).forEach(([k, v]) => sp.set(k, v)); navigate(`/tendencias?${sp.toString()}`, { replace: true }); toast({ title: "Visão aplicada", description: view.name });
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/SegmentAnalysis.tsx`
  ```
  
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/SupplierSales.tsx`
  ```
  
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/TopClients.tsx`
  ```
  
  ```
- **formatCurrency(v: number)** — `src/components/intelligence/TrendingProducts.tsx`
  ```
  
  ```
- **TotalStockCard({ stock }: Pick<SummaryCardProps, 'stock'>)** — `src/components/inventory/StockDashboard.tsx`
  ```
  return <StatCard title="Total de Produtos" value={stock.summary.totalProducts.toLocaleString('pt-BR')} icon={<Package className="h-6 w-6 text-primary" />} isActive={stock.filters.status === 'all'} onClick={() => stock.updateFilter('status', 'all')} clickHint="Mostrar todos os produtos" trend={{ value: stock.summary.totalVariants, label: `${stock.summary.totalVariants.toLocaleString('pt-BR')} variações` }} />;
  ```
- **PriceChangesNotice({ count }: { count: number })** — `src/components/inventory/risk/ProductRiskDetail.tsx`
  ```
  if (count <= 0) return null; return <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><DollarSign className="h-3 w-3" />{count === 1 ? '1 alteração' : `${count} alterações`} de preço nos últimos 30 dias</div>;
  ```
- **canSuggestIdentity(kitName: string, itemCount: number, current: KitIdentity | undefined, dismissed: boolean)** — `src/components/kit-builder/IdentitySuggestionButton.tsx`
  ```
  const hasIdentity = Boolean(current?.tag && current.color && current.icon); return !hasIdentity && !dismissed && (Boolean(kitName.trim()) || itemCount > 0);
  ```
- **apply()** — `src/components/kit-builder/IdentitySuggestionButton.tsx`
  ```
  onApply({ tag: suggestion.tag, color: suggestion.color, icon: suggestion.icon }); dismiss();
  ```
- **calculateHealthScore(totalPrice: number, inRange: boolean, aboveRange: boolean, diffVsAvg: number)** — `src/components/kit-builder/KitHealthCard.tsx`
  ```
  if (totalPrice <= 0) return 0; if (inRange) return 90; if (aboveRange) return Math.max(40, 90 - (diffVsAvg - 20)); return Math.max(50, 70 - Math.abs(diffVsAvg) / 2);
  ```
- **scoreColor(score: number)** — `src/components/kit-builder/KitHealthCard.tsx`
  ```
  if (score >= 75) return 'success'; if (score >= 50) return 'warning'; return 'destructive';
  ```
- **generate()** — `src/components/kit-builder/KitPresentablePreview.tsx`
  ```
  let kitId = currentKitId; if (!kitId) { try { const result = await saveKit(kitState, kitQuantity); if (result && "id" in result) kitId = (result as { id: string }).id; } catch { return; } } if (!kitId) { toast.error("Não foi possível salvar o kit antes de compartilhar"); return; } const link = await generateShareLink(kitId); if (link) setShareUrl(link);
  ```
- **PriceDetails({ priceData, kitQuantity }: { priceData: PriceData; kitQuantity: number })** — `src/components/kit-builder/PersonalizationConfig.tsx`
  ```
  if (!priceData?.success) return null; return <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Preço unitário</span><span>{formatCurrency(priceData.preco_unitario)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Gravação ({kitQuantity}un)</span><span>{formatCurrency(priceData.valor_gravacao)}</span></div>{(priceData.setup_total ?? 0) > 0 && <div className="flex …
  ```
- **shouldShowBlockedToast(userId: string)** — `src/components/layout/DevRoute.tsx`
  ```
  const storageKey = `dev-route-toast:${userId}`; try { const last = Number(sessionStorage.getItem(storageKey) ?? '0'); if (last && Date.now() - last < 60_000) return false; sessionStorage.setItem(storageKey, String(Date.now())); } catch { return true; } return true;
  ```
- **canRenderItem(item: NavItem, access: NavAccess)** — `src/components/layout/sidebar/SidebarNavGroup.tsx`
  ```
  if (!hasDeclaredAccess(item, access) || !hasRouteAccess(item, access)) return false; const permission = item.requiredPermission; return !permission || access.hasPermission(permission.action, permission.resource);
  ```
- **GeneratedResult(props: GeneratedResultProps)** — `src/components/magic-up/AdImageResult.tsx`
  ```
  const history = props.history ?? []; return <Card className="border-primary/20 overflow-hidden"><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2">📸 Resultado</CardTitle><div className="flex items-center gap-1">{props.productName && <Badge variant="secondary" className="text-[10px]">{props.productName}</Badge>}{props.sceneName && <Badge variant="outline" className="text-[10px]">{props.sceneName}</Badge>}{histor …
  ```
- **resolveScore(variation: VariationItem)** — `src/components/magic-up/MagicUpVariationComparator.tsx`
  ```
  if (typeof variation.qualityDiagnosis?.total === "number") return variation.qualityDiagnosis.total; if (typeof variation.qualityScore === "number") return variation.qualityScore; return null;
  ```
- **requestGeneratedPrompts(body: Record<string, unknown>)** — `src/components/magic-up/PromptGenerator.tsx`
  ```
  const { data, error } = await supabase.functions.invoke("generate-ad-prompt", { body }); if (error) throw error; if (data?.prompts && Array.isArray(data.prompts)) return data.prompts; throw new Error(data?.error || "Nenhum prompt retornado");
  ```
- **GenerateButtonContent({ generating, generated }: { generating: boolean; generated: boolean })** — `src/components/magic-up/PromptGenerator.tsx`
  ```
  if (generating) return <><Loader2 className="h-4 w-4 animate-spin" />Criando prompts com IA...</>; if (generated) return <><RefreshCw className="h-4 w-4" />Gerar novos prompts</>; return <><Wand2 className="h-4 w-4" />Gerar Prompts com IA</>;
  ```
- **GeneratedPromptCard({ prompt, selected, onSelect }: { prompt: GeneratedPrompt; selected: boolean; onSelect: ()** — `src/components/magic-up/PromptGenerator.tsx`
  ```
  void }) {
  ```
- **GeneratedPromptResults({ prompts, selectedPrompt, onSelect }: { prompts: GeneratedPrompt[]; selectedPrompt: ScenePrompt | null; onSelect: (prom)** — `src/components/magic-up/PromptGenerator.tsx`
  ```
  void }) {
  ```
- **selectGeneratedPrompt(prompt: GeneratedPrompt, onSelect: PromptGeneratorProps["onSelectPrompt"])** — `src/components/magic-up/PromptGenerator.tsx`
  ```
  onSelect({ id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: prompt.title, prompt: prompt.prompt, category: prompt.category });
  ```
- **validArtExtension(file: File)** — `src/components/mockup/ArtFileUpload.tsx`
  ```
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`; if (!ACCEPTED_EXTENSIONS.includes(extension)) { toast.error(`${file.name}: formato não suportado (${ACCEPTED_EXTENSIONS.join(", ")})`); return null; } if (file.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(`${file.name}: excede ${MAX_SIZE_MB}MB`); return null; } return extension;
  ```
- **GenerateButton({ onClick, isGenerating, disabled = false, hasAllRequirements = true, label = "Gerar Mockup com IA", className, }: Gener)** — `src/components/mockup/GenerateButton.tsx`
  ```
  const isReady = hasAllRequirements && !disabled && !isGenerating; return ( <motion.div whileHover={readyMotion(isReady, 1.02)} whileTap={readyMotion(isReady, 0.98)} className={cn("relative", className)} > {isReady && <ReadyPulse />} <Button type="button" size="lg" onClick={onClick} disabled={disabled || isGenerating} className={cn( "relative w-full font-semibold", isReady && "bg-gradient-to-r from-primary to-primary/80 shadow-lg" )} > <ButtonContent isGenerating={isGenerating} label={label} /> < …
  ```
- **runGenerateShortcut(event: KeyboardEvent, props: KeyboardShortcutsProps)** — `src/components/mockup/KeyboardShortcuts.tsx`
  ```
  if (!hasCommandModifier(event) || event.key !== "Enter") return false; event.preventDefault(); if (props.canGenerate && !props.isLoading) { props.onGenerate(); toast.info("⌨️ Gerando mockup...", { duration: 1500 }); } else if (!props.canGenerate) { toast.warning("Complete todos os campos antes de gerar"); } return true;
  ```
- **calculateLogoDisplay(props: LogoPositionEditorProps, containerSize: { width: number; height: number }, bounds: ProductBounds)** — `src/components/mockup/LogoPositionEditor.tsx`
  ```
  if (!bounds.detected) return null; const containerWidth = containerSize.width || 400; const containerHeight = containerSize.height || containerWidth; const rendered = renderedImageSize(containerWidth, containerHeight, bounds.imageAspectRatio || 1); const physical = physicalDimensions(props); const cmToPx = Math.min((rendered.width * bounds.fractionX) / physical.width, (rendered.height * bounds.fractionY) / physical.height); const widthPx = props.logoWidth * cmToPx; const heightPx = props.logoHei …
  ```
- **applyLogoToAllAreas()** — `src/components/mockup/MultiAreaManager.tsx`
  ```
  const activeArea = areas.find((a) => a.id === activeAreaId); if (!activeArea?.logoPreview) { toast.error("Selecione uma área com logo primeiro"); return; } onAreasChange(areas.map((a) => ({ ...a, logoPreview: activeArea.logoPreview }))); toast.success(`Logo aplicado em ${areas.length} áreas`);
  ```
- **generateBreadcrumbs(pathname: string, roles: { isDev: boolean; isAdmin: boolean } = { isDev: false, isAdmin: false },)** — `src/components/navigation/Breadcrumbs.tsx`
  ```
  const segments = pathname.split("/").filter(Boolean); if (segments.length === 0) return []; const breadcrumbs: BreadcrumbItem[] = []; let currentPath = ""; for (const [index, segment] of segments.entries()) { currentPath += `/${segment}`; const breadcrumb = createBreadcrumb({ segment, currentPath, index, total: segments.length, roles }); if (breadcrumb) breadcrumbs.push(breadcrumb); } return breadcrumbs;
  ```
- **calculateStreakTrend(samples: RatioSample[], streakStartIndex: number)** — `src/components/notifications/badge-stats/useNotificationsMetricsPanel.ts`
  ```
  if (streakStartIndex < 0) return { direction: 'flat', slopePerSec: 0, suggestion: null }; const window = samples.slice(streakStartIndex); if (window.length < 3) return { direction: 'flat', slopePerSec: 0, suggestion: { primary: "Hold current values; need ≥3s of data to recommend.", rationale: "Streak too short to fit a trend line." } }; const slopePerSec = trendSlope(window); const direction = trendDirection(slopePerSec); return { direction, slopePerSec, suggestion: trendSuggestion(direction) };
  ```
- **formatPrice(price: number)** — `src/components/novelties/NoveltyCards.tsx`
  ```
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **TotalsSection({ data }: { data: ProposalTemplateData })** — `src/components/pdf/ProposalSections.tsx`
  ```
  const shippingLabel = data.shippingType ? formatShipping(data.shippingType, data.shippingCost) : (data.shippingCost ? fmt(data.shippingCost) : "Cortesia"); return ( <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}> <div style={{ width: "380px" }}> <div style={totalsRowStyle}><span>Subtotal:</span><span style={{ fontWeight: 500 }}>{fmt(data.subtotal)}</span></div> {data.discount && data.discount > 0 && <div style={totalsRowStyle}><span>Desconto Global:</span><span s …
  ```
- **TotalHighlight({ total }: { total: number })** — `src/components/pdf/proposal/ProposalTotals.tsx`
  ```
  return <div style={{ borderRadius: "8px", overflow: "hidden", marginTop: "10px" }}> <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#00c853" }}><tbody><tr> <td style={{ padding: "10px 18px" }}><span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, textTransform: "uppercase", fontSize: "13px", color: "#ffffff", letterSpacing: "0.5px" }}>Valor Total:</span></td> <td style={{ padding: "10px 18px", textAlign: "right" }}><strong style={{ fontFamily: "'Mon …
  ```
- **DiscountHighlight({ discount }: { discount: number })** — `src/components/pdf/proposal/ProposalTotals.tsx`
  ```
  if (discount <= 0) return null; return <div style={{ borderRadius: "6px", overflow: "hidden", margin: "6px 0", border: "1px solid #ffcdd2" }}> <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff5f5" }}><tbody><tr> <td style={{ width: "4px", backgroundColor: "#e53935", padding: 0 }} /> <td style={{ padding: "7px 16px" }}><span style={{ fontWeight: 700, fontSize: "13px", color: "#c62828" }}>Desconto Global:</span></td> <td style={{ padding: "7px 16px", textAlign: "rig …
  ```
- **formatCurrency(value: number | null)** — `src/components/personalization/TechniqueSLACard.tsx`
  ```
  if (!value) return "—"; return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  ```
- **calculateTotalCost(technique: Technique, quantity: number)** — `src/components/personalization/TechniqueSLACard.tsx`
  ```
  const setup = technique.setup_cost || 0; const unit = technique.unit_cost || 0; return setup + (unit * quantity);
  ```
- **formatCurrency(value: number | null)** — `src/components/personalization/TechniqueSelector.tsx`
  ```
  if (!value) return "—"; return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  ```
- **PrecoIndisponivelAlert({ nome }: { readonly nome: string })** — `src/components/pricing/PrecoIndisponivelAlert.tsx`
  ```
  return ( <Alert variant="destructive"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Produto sem preço de venda no catálogo</AlertTitle> <AlertDescription> {nome} está sem preço de venda válido no catálogo (zero, negativo, infinito ou ausente). A simulação e a criação de orçamento ficam bloqueadas até o preço ser corrigido no cadastro do produto. </AlertDescription> </Alert> );
  ```
- **podeSimularPreco(produto: CalcProduct | null)** — `src/components/pricing/QuantityPriceCalculator.tsx`
  ```
  return produto !== null && produto.priceAvailable !== false;
  ```
- **formatCurrency(value: number)** — `src/components/pricing/calculator/types.ts`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **CalculationPrice({ calculation, copied, onCopy }: { calculation: EngravingCalculationV51; copied: string | null; onCopy: (code: string)** — `src/components/pricing/simulator/MultiEngravingResult.tsx`
  ```
  void }) {
  ```
- **CalculationDetails({ calculation, quantity }: { calculation: EngravingCalculationV51; quantity: number })** — `src/components/pricing/simulator/MultiEngravingResult.tsx`
  ```
  const price = calculation.priceData; if (!price?.success) return null; return <div className="text-xs text-muted-foreground space-y-0.5"><div className="flex justify-between"><span>{formatNumber(quantity)} × {formatCurrency(price.unit_price)} {' '}(Faixa {price.tier_used})</span><span>{formatCurrency(price.subtotal_pecas)}</span></div>{price.minimum_applied ? <div className="flex items-center gap-1 text-warning dark:text-warning"><Info className="w-3 h-3" /><span>Fat. mínimo aplicado: {formatCur …
  ```
- **CalculationRow({ calculation, index, quantity, copied, onCopy }: { calculation: EngravingCalculationV51; index: number; quantity: numbe)** — `src/components/pricing/simulator/MultiEngravingResult.tsx`
  ```
  void }) {
  ```
- **calculateAll()** — `src/components/pricing/simulator/MultiEngravingResult.tsx`
  ```
  if (engravings.length === 0) { setCalculations([]); return; } setIsCalculating(true); const results = await Promise.all( engravings.map(async (engraving) => { try { // Usar ID da área da técnica selecionada // Assumindo que technique.id é o ID da área de impressão const areaId = engraving.technique.id; const priceData = await calculatePrice( areaId, quantity, engraving.colors || 1 ); return { engraving, priceData, loading: false, error: priceData?.success === false ? 'Erro no cálculo' : null, }; …
  ```
- **PriceFooter({ priceData, grandTotal, unitTotal, showDetails }: { priceData: CustomizationPriceV2; grandTotal: number; unitTotal: num)** — `src/components/pricing/simulator/PriceResultV51.tsx`
  ```
  return <><div className="pt-2 flex justify-between font-bold text-lg"><span>Total Geral</span><span className="text-primary">{formatCurrency(grandTotal)}</span></div><div className="text-sm text-center text-muted-foreground">= {formatCurrency(unitTotal)} por unidade completa</div> {showDetails && priceData.margin_percent > 0 ? <div className="flex items-center justify-center gap-2 text-sm text-primary dark:text-primary"><TrendingDown className="w-4 h-4" /><span>Margem: {priceData.margin_percent. …
  ```
- **PriceResultV51({ productName, productPrice, quantity, priceData, showDetails = true, }: PriceResultV51Props)** — `src/components/pricing/simulator/PriceResultV51.tsx`
  ```
  const [copied, setCopied] = useState(false); // Cálculos derivados const grandTotal = productPrice * quantity + priceData.total_price; const unitTotal = grandTotal / quantity; const handleCopyCode = () => { navigator.clipboard.writeText(priceData.codigo_orcamento); setCopied(true); toast.success('Código copiado!'); setTimeout(() => setCopied(false), 2000); }; return ( <Card className="border-primary/30 bg-primary/5"> <CardHeader className="pb-3"> <div className="flex items-center justify-between …
  ```
- **PriceDetails(props: PriceDetailsProps)** — `src/components/pricing/simulator/QuantityAndResult.tsx`
  ```
  return <div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Produtos ({formatNumber(props.quantity)} × {formatCurrency(props.product.price)})</span><span>{formatCurrency(props.productTotal)}</span></div><CustomizationDetails priceData={props.priceData} quantity={props.quantity} /><div className="pt-2 border-t flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{formatCurrency(props.grandTotal)}</span …
  ```
- **PriceMetadata({ priceData }: { readonly priceData: CustomizationPriceV2 | null })** — `src/components/pricing/simulator/QuantityAndResult.tsx`
  ```
  if (!priceData) return null; const productionDays = priceData.production_days ?? 0; return <>{priceData.margin_percent > 0 && <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20"><TrendingDown className="w-5 h-5 text-primary dark:text-primary" /><span className="text-sm font-medium text-primary dark:text-primary">Margem: {priceData.margin_percent.toFixed(1)}%</span></div>}{productionDays > 0 && <div className="flex items-center gap-2 text-sm text-muted-f …
  ```
- **PriceResult(props: PriceResultProps)** — `src/components/pricing/simulator/QuantityAndResult.tsx`
  ```
  return <Card className="border-primary/30 bg-primary/5"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-lg flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" />Resumo do Orçamento{props.isCalculating && <Loader2 className="w-4 h-4 animate-spin" />}</CardTitle><BudgetCode code={props.priceData?.codigo_orcamento} copied={props.copied} onCopy={props.onCopy} /></div></CardHeader><CardContent className="space-y-4">{props.er …
  ```
- **calculate()** — `src/components/pricing/simulator/QuantityAndResult.tsx`
  ```
  setIsCalculating(true); setError(null); try { // Usar o ID da técnica como ID da área const result = await calculatePrice(technique.id, quantity, colors); if (result?.success) { setPriceData(result); } else { setError('Erro ao calcular preço'); setPriceData(null); } } catch (err) { setError(err instanceof Error ? err.message : 'Erro desconhecido'); setPriceData(null); } finally { setIsCalculating(false); }
  ```
- **hasValidSalePrice(price: unknown)** — `src/components/pricing/simulator/types.ts`
  ```
  return typeof price === "number" && Number.isFinite(price) && price > 0;
  ```
- **formatCurrency(value: number)** — `src/components/pricing/simulator/utils.ts`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', }).format(value);
  ```
- **generateSuggestions(currentEngravings: ConfiguredEngraving[], availableTechniques: ProductTechnique[], quantity: number, categoryName?: stri)** — `src/components/pricing/simulator/upsell/upsell-engine.ts`
  ```
  const suggestions: UpsellSuggestion[] = []; const positionSuggestion = suggestAddPosition( currentEngravings, availableTechniques ); if (positionSuggestion) suggestions.push(positionSuggestion); suggestions.push( ...suggestTechniqueUpgrades(currentEngravings, availableTechniques) ); const tierSuggestion = suggestQuantityTier(quantity); if (tierSuggestion) suggestions.push(tierSuggestion); const complementarySuggestion = suggestComplementary(categoryName); if (complementarySuggestion) suggestions …
  ```
- **priceTier(source: SupplierSourcePricing, index: number, markupRatio: number)** — `src/components/products/InlinePriceCalculator.tsx`
  ```
  const costPrice = source[`cost_price_${index}` as keyof SupplierSourcePricing] as number | null | undefined; const minimumQuantity = source[`min_qty_${index}` as keyof SupplierSourcePricing] as number | null | undefined; if (!costPrice || costPrice <= 0) return null; const quantity = minimumQuantity && minimumQuantity > 0 ? minimumQuantity : index === 1 ? 1 : index * 50; const unitPrice = Number((costPrice * markupRatio).toFixed(2)); return { quantity, unitPrice, total: Number((unitPrice * quant …
  ```
- **extractPriceTiersFromSource(source: SupplierSourcePricing, basePrice: number)** — `src/components/products/InlinePriceCalculator.tsx`
  ```
  const tiers: PriceTableRow[] = []; const baseCost = source.cost_price_1 ?? source.cost_price ?? null; const markupRatio = baseCost && baseCost > 0 ? basePrice / baseCost : 1; for (let index = 1; index <= 5; index++) { const tier = priceTier(source, index, markupRatio); if (tier) tiers.push(tier); } tiers.sort((a, b) => a.quantity - b.quantity); const refPrice = tiers[0]?.unitPrice ?? basePrice; tiers.forEach((tier, index) => addTierDiscount(tier, refPrice, index)); return tiers;
  ```
- **formatPrice(price: number)** — `src/components/products/InlinePriceCalculator.tsx`
  ```
  
  ```
- **fetchPriceTiers()** — `src/components/products/InlinePriceCalculator.tsx`
  ```
  if (!productId) { setPriceTiers([]); return; } setIsLoading(true); try { const variantFilters: Record<string, unknown> = { product_id: productId, is_active: true }; if (variantId) variantFilters.id = variantId; const variantResponse = await invokeExternalDb<{ id: string }>({ table: "product_variants", operation: "select", select: "id", filters: variantFilters, range: [0, 1] }); const targetVariant = variantResponse?.records?.[0]; if (!targetVariant) { setPriceTiers([]); return; } const response …
  ```
- **calculateKitStats(items: KitComponent[])** — `src/components/products/KitComposition.tsx`
  ```
  return { totalPieces: items.reduce((sum, item) => sum + item.quantity, 0), totalWeight: items.reduce((sum, item) => sum + (item.weightG ?? 0) * item.quantity, 0), packagingCount: items.filter((item) => item.isPackaging).length, productCount: items.filter((item) => !item.isPackaging).length, personalizableCount: items.filter((item) => item.allowsPersonalization).length, };
  ```
- **canConfirmPrice(onConfirm: (()** — `src/components/products/PriceFreshnessBadge.tsx`
  ```
  void) | undefined, freshness: PriceFreshness, confirmed: boolean): onConfirm is () => void {
  ```
- **PriceFreshnessBadge({ priceUpdatedAt, thresholdDays, variant = "inline", className, alwaysShow = false, onConfirm, confirmedAt, }: PriceFres)** — `src/components/products/PriceFreshnessBadge.tsx`
  ```
  const freshness = getPriceFreshness(priceUpdatedAt, thresholdDays); const { Icon, color } = STATUS_STYLES[freshness.status]; // Sufixo "(limite Yd)" só aparece quando o produto traz threshold próprio. // Para o resto do catálogo (default global de 60d) o badge segue limpo. const limitSuffix = thresholdSuffix(thresholdDays); // Estado "confirmado pelo vendedor" — substitui o alerta stale/aging por um // pill verde discreto. Só faz s
  ```
- **PriceFreshnessThresholdEditor({ productId, currentEffectiveDays, }: Props)** — `src/components/products/PriceFreshnessThresholdEditor.tsx`
  ```
  const { isAdmin } = useAuth(); const [open, setOpen] = useState(false); const { data: override, isLoading } = useProductFreshnessOverride(productId); const upsert = useUpsertFreshnessOverride(); const remove = useDeleteFreshnessOverride(); // Estado local controla a seleção dentro do popover. const initial = resolveInitialThreshold(override?.threshold_days, currentEffectiveDays); const [selected, setSelected] = useState<FreshnessThreshold>(initial); if (!isAdmin) return null; const isOverride = …
  ```
- **PriceHistoryChart({ data, title = "Histórico de Preços" }: PriceHistoryChartProps)** — `src/components/products/PriceHistoryChart.tsx`
  ```
  if (!data?.length) { return ( <Card> <CardHeader> <CardTitle className="text-base flex items-center gap-2"> <TrendingUp className="h-4 w-4" /> {title} </CardTitle> </CardHeader> <CardContent className="py-8 text-center text-sm text-muted-foreground"> Sem histórico de preços disponível. </CardContent> </Card> ); } return ( <Card> <CardHeader> <CardTitle className="text-base flex items-center gap-2"> <TrendingUp className="h-4 w-4 text-primary" /> {title} </CardTitle> </CardHeader> <CardContent> < …
  ```
- **formatPrice(price: number)** — `src/components/products/ProductCard.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  ```
- **PriceSkeleton()** — `src/components/products/ProductDetailSkeleton.tsx`
  ```
  return <div className="rounded-xl border border-border p-3 xl:p-5 space-y-3"><div><Skeleton className="h-3 w-16 mb-2" /><Skeleton className="h-9 w-32" /></div><div className="flex flex-wrap gap-1">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-6 w-14 rounded-full" />)}</div><div className="grid grid-cols-3 gap-1 py-1 border-y border-border/40"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div><div class …
  ```
- **formatPrice(price: number)** — `src/components/products/ProductHoverPreview.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  ```
- **formatPrice(price: number)** — `src/components/products/ProductListItem.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
  ```
- **PriceDialog({ open, close, props }: { open: boolean; close: ()** — `src/components/products/ProductQuickActions.tsx`
  ```
  void; props: ProductQuickActionsProps }) {
  ```
- **formatPrice(price: number)** — `src/components/products/ProductStickyHeader.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
  ```
- **formatPrice(price: number)** — `src/components/products/ProductTableView.tsx`
  ```
  
  ```
- **recommendationScore(product: Product, current: Product, currentTags: string[])** — `src/components/products/RelatedProducts.tsx`
  ```
  const tags = [...product.tags.publicoAlvo, ...product.tags.datasComemorativas, ...product.tags.nicho]; let score = tags.filter((tag) => currentTags.includes(tag)).length * 2; if (product.supplier.id === current.supplier.id) score += 1; if (product.featured) score += 1; if (Math.abs(product.price - current.price) < current.price * 0.3) score += 1; return score;
  ```
- **shouldHideRecommendations({ candidateCount, isLoading, hasError, hasData, visibleCount }: RecommendationVisibility)** — `src/components/products/SmartRecommendations.tsx`
  ```
  if (candidateCount === 0) return true; if (!isLoading && hasError) return true; return !isLoading && hasData && visibleCount === 0;
  ```
- **PriceInsight({ model }: { model: StockChartModel })** — `src/components/products/StockHistoryChart.tsx`
  ```
  return <div className="flex items-center justify-between flex-wrap gap-2">{model.priceChanges > 0 && <div className="flex items-center gap-2 text-xs text-muted-foreground"><DollarSign className="h-3 w-3" aria-hidden="true" /><span>Fornecedor alterou preço {model.priceChanges}x nos últimos 30 dias —<span className="text-foreground font-medium"> trave seu custo ao cotar</span></span></div>} <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1 px-2 text-muted-foreground" onClick={() = …
  ```
- **sizeTotal(size: string, colors: VariantColor[], matrix: VariantMatrix)** — `src/components/products/VariantGridMatrix.tsx`
  ```
  return colors.reduce((total, color) => total + Math.max(0, matrix.get(color.name)?.get(size)?.stock ?? 0), 0);
  ```
- **canCalculatePrice(area: PrintAreaV2, quantity: number, dimensions: ReturnType<typeof useDimensionConfiguration>)** — `src/components/products/customization/ConfigurationPanel.tsx`
  ```
  if (quantity <= 0 || dimensions.usesDimensions === null) return false; if (!dimensions.usesDimensions) return true; return dimensions.widthNumber > 0 && dimensions.heightNumber > 0 && dimensions.widthNumber <= area.max_width && dimensions.heightNumber <= area.max_height;
  ```
- **PriceMetadata({ price, technique, width, height }: { price: CustomizationPriceResponseV6; technique: TechniqueOption; width: number; h)** — `src/components/products/customization/ConfigurationPanelV6.tsx`
  ```
  const numberOfColors = price.num_cores ?? 0; return ( <div className="text-xs text-muted-foreground space-y-0.5"> {technique.usa_dimensao && width > 0 && height > 0 && <p>Gravação: {width} × {height} cm</p>} <p>Quantidade: {price.quantidade} peças</p> {price.faixa && <p>Faixa: {price.faixa.qtd_min} a {price.faixa.qtd_max} peças</p>} {numberOfColors > 1 && <p>Cores: {numberOfColors}</p>} </div> );
  ```
- **PriceBreakdown({ price }: { price: CustomizationPriceResponseV6 })** — `src/components/products/customization/ConfigurationPanelV6.tsx`
  ```
  const unitPrice = price.preco_unitario ?? 0; const engravingPrice = price.valor_gravacao ?? 0; const setupTotal = price.setup_total ?? 0; const total = price.total_cobrado ?? 0; return ( <div className="border-t border-border/50 pt-2 space-y-1"> <div className="flex justify-between text-sm"><span className="text-muted-foreground">Preço unitário:</span><span className="font-semibold text-primary">R$ {unitPrice.toFixed(2)}</span></div> <div className="flex justify-between text-sm"><span className= …
  ```
- **PriceResult({ price, technique, width, height }: { price: CustomizationPriceResponseV6; technique: TechniqueOption; width: number; h)** — `src/components/products/customization/ConfigurationPanelV6.tsx`
  ```
  return ( <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2"> <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-foreground">{price.nome_tabela}</span></div> <PriceMetadata price={price} technique={technique} width={width} height={height} /> <PriceBreakdown price={price} /> </div> );
  ```
- **PriceState({ price, loading, error, technique, width, height }: { price: CustomizationPriceResponseV6 | null; loading: boolean; err)** — `src/components/products/customization/ConfigurationPanelV6.tsx`
  ```
  if (loading) return <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Calculando preço...</div>; if (error) return <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"><AlertCircle className="h-3.5 w-3.5" />{error}</div>; if (price) return <PriceResult price={price} technique={technique} width={width} height={height} />; const …
  ```
- **validateDimensions(technique: TechniqueOption, width: number, height: number)** — `src/components/products/customization/ConfigurationPanelV6.tsx`
  ```
  if (!technique.usa_dimensao) return null; if (width <= 0 || height <= 0) return "Preencha largura e altura"; if (width > technique.efetiva_largura_max) return `Largura máxima: ${technique.efetiva_largura_max} cm`; if (height > technique.efetiva_altura_max) return `Altura máxima: ${technique.efetiva_altura_max} cm`; return null;
  ```
- **Discount({ discount, compact }: { discount?: number; compact: boolean })** — `src/components/products/inline-price/PriceTiersTable.tsx`
  ```
  if (!discount) return <span className="text-muted-foreground/40">—</span>; return compact ? <span className="text-xs font-bold text-success">-{discount}%</span> : <Badge variant="secondary" className="bg-success/10 text-success border-success/20">-{discount}%</Badge>;
  ```
- **PriceTiersTable({ tiers, isLoading, compact = false, formatPrice }: PriceTiersTableProps)** — `src/components/products/inline-price/PriceTiersTable.tsx`
  ```
  if (isLoading) { return ( <div className="flex items-center justify-center py-8"> <Loader2 className={cn("animate-spin text-primary", compact ? "h-5 w-5" : "h-6 w-6")} /> <span className="ml-2 text-sm text-muted-foreground">Carregando preços...</span> </div> ); } if (tiers.length === 0) { return ( <div className={cn("text-center text-muted-foreground", compact ? "py-8 text-sm" : "py-8")}> Nenhuma tabela de preços disponível </div> ); } return ( <table className="w-full text-sm"> <TableHeader com …
  ```
- **formatPrice(price: number)** — `src/components/products/share/MessageTemplates.ts`
  ```
  
  ```
- **generateColorMessage(product: Product, selectedColors: ProductColor[])** — `src/components/products/share/ShareAllColorsDialog.tsx`
  ```
  const colorList = selectedColors .map((c, i) => `${i + 1}. ${c.name}`) .join("\n"); return `🎨 *CATÁLOGO DE CORES* 🎨 *${product.name}* SKU: ${product.sku} ${product.description || ""} 📋 *${selectedColors.length} cores selecionadas:* ${colorList} 💰 A partir de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price)}/un 📦 Qtd mínima: ${product.minQuantity} un ${product.stockStatus === "in-stock" ? "✅ Pronta entrega" : "⚠️ Consultar prazo"} 👆 Cada cor acompanha …
  ```
- **DiscountStatus({ maxDiscount, realDiscount, apparentDiscount }: { maxDiscount: number | null; realDiscount: number; apparentDiscount: n)** — `src/components/quote/NegotiationMarkupCard.tsx`
  ```
  if (maxDiscount === null) return null; if (realDiscount > maxDiscount) return <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 px-2.5 py-1.5"><AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" /><p className="text-[10px] text-warning leading-snug">Mesmo com markup, o desconto real ({realDiscount.toFixed(1)}%) excede sua alçada de {maxDiscount}%. Será necessária aprovação do administrador.</p></div>; if (apparentDiscount <= maxDiscount) ret …
  ```
- **formatCurrency(value: number)** — `src/components/quotes/AdminTemplatesManager.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  ```
- **calculateTotal(template: QuoteTemplate)** — `src/components/quotes/AdminTemplatesManager.tsx`
  ```
  const itemsTotal = (template.items_data ?? []).reduce((sum, item) => { const personalizationCost = item.personalizations?.reduce( (personalizationSum, personalization) => personalizationSum + (personalization.unitCost || 0) * item.quantity + (personalization.setupCost || 0), 0) || 0; return sum + item.quantity * item.unitPrice + personalizationCost; }, 0); const discountPercent = template.discount_percent ?? 0; const discountAmount = template.discount_amount ?? 0; return itemsTotal - (discountPe …
  ```
- **generate()** — `src/components/quotes/QuoteApprovalLinkCard.tsx`
  ```
  assignResult(await generateApprovalLink(quoteId, clientName, clientEmail));
  ```
- **regenerate()** — `src/components/quotes/QuoteApprovalLinkCard.tsx`
  ```
  if (token) await revokeToken(token.id); setToken(null); setLink(""); assignResult(await generateApprovalLink(quoteId, clientName, clientEmail));
  ```
- **priceCountLabel(count: number)** — `src/components/quotes/QuoteBuilderSummaryColumn.tsx`
  ```
  return `${count} ${count === 1 ? "preço" : "preços"}`;
  ```
- **apparentDiscount(props: Props)** — `src/components/quotes/QuoteBuilderSummaryColumn.tsx`
  ```
  if (props.discountType === "percent") return props.discountValue; const base = props.realSubtotal || 0; if (base <= 0) return 0; return (props.discountValue / (base * (1 + (props.negotiationMarkup || 0) / 100))) * 100;
  ```
- **DiscountHints({ props }: { props: Props })** — `src/components/quotes/QuoteBuilderSummaryColumn.tsx`
  ```
  return <>{props.maxDiscountPercent !== null && props.maxDiscountPercent !== undefined && <p className="text-xs text-muted-foreground"> Seu limite: <strong>{props.maxDiscountPercent}%</strong></p>} {props.isDiscountExceeded && <p className="text-xs text-amber-600"><AlertTriangle className="inline h-3 w-3 mr-1" />Desconto acima do autorizado</p>} {props.marginPercent !== null && props.marginPercent !== undefined && props.marginPercent > 0 && props.marginPercent < 20 && <p className="text-[11px] te …
  ```
- **convertQuote()** — `src/components/quotes/QuoteConvertToOrder.tsx`
  ```
  convert({ quoteId, organizationId: currentOrg?.id || null }, {
  ```
- **formatCurrency(value: number)** — `src/components/quotes/QuoteItemsList.tsx`
  ```
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  ```
- **calcPersTotal(totalCost: number, qty: number)** — `src/components/quotes/QuoteItemsTable.tsx`
  ```
  if (qty <= 0) return totalCost; const roundedUnit = Math.round((totalCost / qty) * 100) / 100; return Math.round(roundedUnit * qty * 100) / 100;
  ```
- **formatCurrency(value: number)** — `src/components/quotes/QuoteItemsTable.tsx`
  ```
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  ```
- **formatCurrency(value: number)** — `src/components/quotes/QuoteListCellRenderer.tsx`
  ```
  
  ```
- **generate()** — `src/components/quotes/QuoteShareDialog.tsx`
  ```
  const result = await generateApprovalLink(quoteId, clientName || undefined, clientEmail || undefined); if (!result) return; setToken(result.token); setLink(result.link);
  ```
- **validDocument(document: string)** — `src/components/quotes/QuoteSignaturePad.tsx`
  ```
  const digits = document.replace(/\D/g, ""); return digits.length === 11 || digits.length === 14;
  ```
- **formatCurrency(value: number)** — `src/components/quotes/QuoteSummary.tsx`
  ```
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **DiscountRow({ subtotal, value, type }: { subtotal: number; value: number; type: QuoteSummaryProps['discountType'] })** — `src/components/quotes/QuoteSummary.tsx`
  ```
  if (value <= 0) return null; const amount = type === 'percent' ? (subtotal * value) / 100 : value; return <div className="flex justify-between text-sm text-success"><span className="flex items-center gap-1.5">Desconto <Badge variant="outline" className="text-[10px] h-4 px-1 border-success/30 text-success">{type === 'percent' ? `${value}%` : 'Fixo'}</Badge></span> <span className="font-medium tabular-nums">-{formatCurrency(amount)}</span></div>;
  ```
- **personalizationTotal(item: QuoteTemplateItem)** — `src/components/quotes/QuoteTemplateForm.tsx`
  ```
  return item.personalizations?.reduce((sum, personalization) => ( sum + (personalization.unitCost ?? 0) * item.quantity + (personalization.setupCost ?? 0) ), 0) ?? 0;
  ```
- **templateTotal(formData: CreateTemplateInput)** — `src/components/quotes/QuoteTemplateForm.tsx`
  ```
  const itemsTotal = (formData.items_data ?? []).reduce((sum, item) => ( sum + item.quantity * item.unitPrice + personalizationTotal(item) ), 0); const percent = formData.discount_percent ?? 0; const discount = percent > 0 ? itemsTotal * (percent / 100) : (formData.discount_amount ?? 0); return itemsTotal - discount;
  ```
- **ValidationAlerts({ form, update, state }: { form: CreateTemplateInput; update: UpdateField; state: ReturnType<typeof useTemplateValidatio)** — `src/components/quotes/QuoteTemplateForm.tsx`
  ```
  const updatePrices = (event: MouseEvent) => { event.preventDefault(); update("items_data", (form.items_data || []).map((item) => { const validation = state.validation.find((candidate) => candidate.productId === item.productId); return validation?.isValid ? { ...item, unitPrice: validation.currentPrice } : item; })); state.setValidation(state.validation.map((item) => ({ ...item, unitPrice: item.currentPrice }))); }; if (!state.hasInvalid && !state.hasPriceChanges) return null; return <div classNa …
  ```
- **updatePrices(event: MouseEvent)** — `src/components/quotes/QuoteTemplateForm.tsx`
  ```
  event.preventDefault(); update("items_data", (form.items_data || []).map((item) => { const validation = state.validation.find((candidate) => candidate.productId === item.productId); return validation?.isValid ? { ...item, unitPrice: validation.currentPrice } : item; })); state.setValidation(state.validation.map((item) => ({ ...item, unitPrice: item.currentPrice })));
  ```
- **DiscountFields({ form, update }: { form: CreateTemplateInput; update: UpdateField })** — `src/components/quotes/QuoteTemplateForm.tsx`
  ```
  return <><div className="space-y-4"><h4 className="font-medium">Configurações de Desconto</h4><div className="grid gap-4 md:grid-cols-2"> <div className="space-y-2"><Label htmlFor="discount_percent">Desconto (%)</Label><Input id="discount_percent" type="number" min={0} max={100} step={0.1} value={form.discount_percent || ""} onChange={(event) => { update("discount_percent", parseFloat(event.target.value) || 0); if (event.target.value) update("discount_amount", 0); }} placeholder="0" /></div> <di …
  ```
- **calculateItemsTotal(items: QuoteTemplateItem[])** — `src/components/quotes/QuoteTemplatePreview.tsx`
  ```
  return items.reduce((sum, item) => { const itemBase = item.quantity * item.unitPrice; const personalizationCost = (item.personalizations || []).reduce( (subtotal, personalization) => subtotal + (personalization.unitCost || 0) * item.quantity + (personalization.setupCost || 0), 0, ); return sum + itemBase + personalizationCost; }, 0);
  ```
- **formatCurrency(value: number)** — `src/components/quotes/QuoteTotalsSummary.tsx`
  ```
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  ```
- **calcPersTotal(totalCost: number, qty: number)** — `src/components/quotes/QuoteTotalsSummary.tsx`
  ```
  if (qty <= 0) return totalCost; const roundedUnit = Math.round((totalCost / qty) * 100) / 100; return Math.round(roundedUnit * qty * 100) / 100;
  ```
- **personalizationTotal(items: QuoteTotalsSummaryProps["items"])** — `src/components/quotes/QuoteTotalsSummary.tsx`
  ```
  return items.reduce((accumulator, item) => { const itemTotal = (item.personalizations || []).reduce( (subtotal, personalization) => subtotal + calcPersTotal(personalization.total_cost || 0, item.quantity), 0, ); return accumulator + itemTotal; }, 0);
  ```
- **discountValue(subtotal: number, percent?: number, amount?: number)** — `src/components/quotes/QuoteTotalsSummary.tsx`
  ```
  if (percent) return Math.round(subtotal * (percent / 100) * 100) / 100; return amount || 0;
  ```
- **shippingValue(type?: string | null, cost?: number | null)** — `src/components/quotes/QuoteTotalsSummary.tsx`
  ```
  if (type === "fob" || type === "fob_pre") return cost || 0; return 0;
  ```
- **shippingLabel(type: string, cost?: number | null)** — `src/components/quotes/QuoteTotalsSummary.tsx`
  ```
  if (type === "cif") return "CIF — Cortesia"; if (type === "fob" && !cost) return "FOB — Por conta do cliente"; if (type === "fob" || type === "fob_pre") return `FOB — Repassado ao cliente (${formatCurrency(cost || 0)})`; return formatCurrency(cost || 0);
  ```
- **ShippingRow({ type, cost }: { type?: string | null; cost?: number | null })** — `src/components/quotes/QuoteTotalsSummary.tsx`
  ```
  if (!type) return null; return ( <div className="flex justify-between text-sm"> <span className="text-muted-foreground">Frete:</span> <span>{shippingLabel(type, cost)}</span> </div> );
  ```
- **ValidityMessage({ kind, value }: { kind: "expired" | "urgent" | "warning" | "valid"; value?: number })** — `src/components/quotes/QuoteValidityBanner.tsx`
  ```
  if (kind === "expired") return <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive shadow-sm animate-in fade-in slide-in-from-top-1"> <AlertTriangle className="h-4 w-4 shrink-0" /><span className="text-sm font-bold uppercase tracking-tight">Proposta Expirada</span></div>; if (kind === "urgent") return <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 shadow- …
  ```
- **formatCurrency(val: number)** — `src/components/quotes/QuoteVersionCompare.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  ```
- **formatCurrency(value: number)** — `src/components/quotes/QuoteVersionHistory.tsx`
  ```
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  ```
- **ValidityIcon({ expired }: { expired: boolean })** — `src/components/quotes/ReorderCatalogValidityBanner.tsx`
  ```
  return expired ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />;
  ```
- **revalidateCatalog(args: { quoteId: string; load: ()** — `src/components/quotes/ReorderCatalogValidityBanner.tsx`
  ```
  Promise<void>; onRevalidated?: () => void | Promise<void>;
  ```
- **ShippingConditions(props: Pick<CommercialConditionsProps, "shippingType" | "setShippingType" | "shippingCost" | "setShippingCost" | "valida)** — `src/components/quotes/builder/CommercialConditions.tsx`
  ```
  const { shippingType, setShippingType, shippingCost, setShippingCost, validationErrors } = props; const shippingInvalid = fieldError(validationErrors, "frete"); const costInvalid = fieldError(validationErrors, "valor_frete"); const showCost = shippingType === "fob_pre" || shippingType === "fob"; return ( <div className="space-y-1"> <Label className={cn(FIELD_LABEL_CLASS, shippingInvalid ? INVALID_LABEL_CLASS : MUTED_LABEL_CLASS)}>Frete <RequiredMark show={shippingInvalid} /></Label> <Select valu …
  ```
- **ValidityPicker({ validityDays, setValidityDays, setValidUntil }: ValidityPickerProps)** — `src/components/quotes/builder/ValidityPicker.tsx`
  ```
  return ( <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3"> <h3 className="font-display font-semibold text-sm flex items-center gap-2"> <span className="text-primary">📅</span>Validade | Proposta </h3> <Select value={validityDays} onValueChange={(val) => { setValidityDays(val); setValidUntil(format(addDays(new Date(), parseInt(val)), "yyyy-MM-dd")); }} > <SelectTrigger className="h-8 text-xs"> <SelectValue placeholder="Selecione" /> </SelectTrigger> <SelectContent> <Selec …
  ```
- **formatPrice(price: number)** — `src/components/replenishments/ReplenishmentCards.tsx`
  ```
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  ```
- **hasPrice(price: number | null | undefined)** — `src/components/replenishments/ReplenishmentCards.tsx`
  ```
  return Number(price) > 0;
  ```
- **applyVoiceAction({ action, setQuery, close, navigate, onSearch }: { action: VoiceAgentAction; setQuery: (query: string)** — `src/components/search/AdvancedSearch.tsx`
  ```
  void; close: () => void; navigate: ReturnType<typeof useNavigate>; onSearch?: (query: string) => void }) {
  ```
- **RankBadge({ index }: { index: number })** — `src/components/search/GlobalSearchHelpers.tsx`
  ```
  if (index === 0) return ( <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange via-orange/80 to-orange/60 flex items-center justify-center shadow-lg shadow-orange/25 animate-[brain-glow_3s_ease-in-out_infinite] ring-2 ring-orange/20"> <Trophy className="h-4.5 w-4.5 text-primary-foreground drop-shadow-sm" /> </div> ); if (index === 1) return ( <div className="h-10 w-10 rounded-xl [background-color:hsl(var(--command-surface-soft))] flex items-center justify-center border [border-colo …
  ```
- **RankBadge({ index }: { index: number })** — `src/components/search/GlobalSearchIdleState.tsx`
  ```
  if (index === 0) return ( <div className="flex h-10 w-10 animate-[brain-glow_3s_ease-in-out_infinite] items-center justify-center rounded-xl bg-gradient-to-br from-orange via-orange/80 to-orange/60 shadow-lg shadow-orange/25 ring-2 ring-orange/20"> <Trophy className="h-4.5 w-4.5 text-primary-foreground drop-shadow-sm" /> </div> ); if (index === 1) return ( <div className="flex h-10 w-10 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_hsl(var(--command-border)/0.4)] [backgroun …
  ```
- **validateImage(file: File)** — `src/components/search/VisualSearchButton.tsx`
  ```
  if (!file.type.startsWith('image/')) return 'Por favor, selecione uma imagem.'; if (file.size > 10 * 1024 * 1024) return 'A imagem deve ter no máximo 10MB.'; return null;
  ```
- **applyFallback()** — `src/components/search/useGlobalSearch.ts`
  ```
  const local = createLocalSearchFallback(searchQuery, localProductsRef.current); // Vazio é resposta válida: o resultado anterior não pode sobreviver aqui, // senão o estado vazio não aparece e Ctrl+Enter abre o produto errado. setSearchIntent(local.length ? createDefaultIntent(searchQuery) : null); setResults(local); const upgraded = await searchCatalogWithoutIntent(searchQuery); if (!upgraded || abortRef.current !== controller) return; setSearchIntent(upgraded.intent); setResults(upgraded.resul …
  ```
- **calculateMetrics({ snapshot, mfaAvailable, mfaEnabled, allowedIpCount }: MetricsContext)** — `src/components/security/useSecurityData.ts`
  ```
  const failedAttempts = snapshot.attempts.filter(attempt => !attempt.success).length; let score = 40; if (mfaAvailable && mfaEnabled) score += 30; if (allowedIpCount > 0) score += 20; if (snapshot.devicesCount > 0) score += 10; if (failedAttempts > 5) score -= 10; return { score: Math.min(100, Math.max(0, score)), mfaEnabled, ipRestrictionsActive: allowedIpCount > 0, knownDevicesCount: snapshot.devicesCount, recentLoginAttempts: snapshot.attempts.length, failedLoginAttempts: failedAttempts, secur …
  ```
- **totalOf(rows: Row[])** — `src/components/sicoob/orders/OrderCostCenterAllocation.tsx`
  ```
  rows.reduce((sum, row) => sum + (Number(row.valor) || 0), 0);
  ```
- **optionTotal(scenario: SimulationScenario)** — `src/components/simulator/ScenarioComparison.tsx`
  ```
  return scenario.bestOption?.grandTotal ?? 0;
  ```
- **calculateComparison(scenarioA: SimulationScenario, scenarioB: SimulationScenario)** — `src/components/simulator/ScenarioComparison.tsx`
  ```
  const totalA = optionTotal(scenarioA); const totalB = optionTotal(scenarioB); return { priceDiff: totalB - totalA, priceDiffPercent: totalA ? ((totalB - totalA) / totalA) * 100 : 0, daysDiff: optionDays(scenarioB) - optionDays(scenarioA), winner: totalA <= totalB ? "A" as const : "B" as const };
  ```
- **TotalPrice({ result }: { result: TechniqueComparisonResult })** — `src/components/simulator/wizard/ComparisonCard.tsx`
  ```
  return <div className="text-right shrink-0"><div className="p-4 rounded-2xl bg-muted/50 group-hover:bg-primary/5 transition-colors min-w-[140px]"><p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Total</p><p className="text-2xl font-bold text-primary">{formatCurrency(result.totalPrice)}</p><p className="text-xs text-muted-foreground mt-1">{formatCurrency(result.costPerUnit)}/un</p></div></div>;
  ```
- **calculateSavings(result: TechniqueComparisonResult, maxPrice: number)** — `src/components/simulator/wizard/ComparisonCard.tsx`
  ```
  if (maxPrice <= 0 || result.totalPrice >= maxPrice) return 0; return Math.round(((maxPrice - result.totalPrice) / maxPrice) * 100);
  ```
- **canCreatePersonalization(wizard: UseSimulatorWizardReturn)** — `src/components/simulator/wizard/PersonalizationTabs.tsx`
  ```
  if (wizard.isEditingPersonalization) return false; if (!wizard.hasAvailableLocations) return false; return isPersonalizationStep(wizard.currentStep);
  ```
- **calculatePersonalizationPrice(pers: Personalization, quantity: number)** — `src/components/simulator/wizard/QuantityRangeComparison.tsx`
  ```
  try { const rpcParams: Record<string, unknown> = { p_area_id: pers.technique.id, p_quantidade: quantity, p_num_cores: pers.specs.colors, }; if (pers.specs.width > 0 && pers.specs.height > 0) { rpcParams.p_largura_cm = pers.specs.width; rpcParams.p_altura_cm = pers.specs.height; } const result = await invokeExternalRpc<CustomizationPriceResponse>( 'fn_get_customization_price', rpcParams ); if (!result?.success) return { persId: pers.id, unitPrice: 0, totalPrice: 0 }; const flat = adaptPriceRespon …
  ```
- **PricePreview({ estimate, loading, areaExceeded }: PricePreviewProps)** — `src/components/simulator/wizard/StepSpecs.tsx`
  ```
  if ((!estimate && !loading) || areaExceeded) return null; return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-primary/10"><DollarSign className="h-4 w-4 text-primary" /></div><div><p className="text-xs text-muted-foreground uppercase tracking-wi …
  ```
- **canTransitionTo(current: string, next: string)** — `src/constants/orders.ts`
  ```
  if (current === next) return true; const validNext = VALID_TRANSITIONS[current as OrderStatus] || []; return validNext.includes(next as OrderStatus);
  ```
- **validateAccess()** — `src/contexts/AuthContext.tsx`
  ```
  if (validating) return; validating = true; try { const state = await getSicoobAccessState(); if (!state.active) await closeRevokedLocalSession(state.reason); } catch (error) { authDebugError("AuthContext.validateAccess", "revalidation failed", error); } finally { validating = false; }
  ```
- **applyOrganizationSelection(actions: OrganizationStateActions, organizations: Organization[], roles: Map<string, OrgMember["role"]>, userId: string,)** — `src/contexts/OrganizationContext.tsx`
  ```
  actions.membershipsRef.current = roles; actions.setOrganizations(organizations); const selected = chooseOrganization(organizations, userId); actions.setCurrentOrg(selected); if (!selected) { localStorage.removeItem(orgStorageKey(userId)); useRecentlyViewedStore.getState().setScope(`user:${userId}`); return; } actions.setCurrentRole(roles.get(selected.id) || null); localStorage.setItem(orgStorageKey(userId), selected.id); useRecentlyViewedStore.getState().setScope(`user:${userId}:org:${selected.i …
  ```
- **validateRecommendationInput(client: ClientProfile, products: ProductForRecommendation[],)** — `src/hooks/useAIRecommendations.ts`
  ```
  if (!client.name) throw new Error("Nome do cliente é obrigatório"); if (!products.length) throw new Error("É necessário fornecer pelo menos um produto");
  ```
- **priceFilter(products: Product[], range: FilterState['priceRange'])** — `src/hooks/useCatalogFiltering.ts`
  ```
  if (range[0] <= 0 && range[1] >= 9999) return products; return products.filter(product => product.price >= range[0] && product.price <= range[1]);
  ```
- **applyCatalogFilters(products: Product[], context: CatalogFilterContext)** — `src/hooks/useCatalogFiltering.ts`
  ```
  let result = relationalCategoryFilter(products, context); result = relationalIdFilter(result, context.hasColorFilter, context.colorFilteredProductIds, context.isLoadingColorFilter); result = relationalIdFilter(result, context.hasTagFilter, context.tagFilteredProductIds, context.isLoadingTagFilter); result = relationalIdFilter(result, context.hasTechniqueFilter, context.techniqueFilteredProductIds, context.isLoadingTechniqueFilter); result = relationalIdFilter(result, context.hasSizeFilter, conte …
  ```
- **applyMergedComparison(local: CompareItem[], merged: CompareItem[])** — `src/hooks/useComparisonSync.ts`
  ```
  if (JSON.stringify(merged) === JSON.stringify(local)) return; useComparisonStore.setState({ compareItems: merged, compareIds: merged.map((item) => item.productId), compareCount: merged.length, canAddMore: merged.length < 4, });
  ```
- **buildPriceRpcParams(params: CalculatePriceParamsV6)** — `src/hooks/useCustomizationPrice.ts`
  ```
  const rpcParams: Record<string, unknown> = { p_area_id: params.areaId, p_quantidade: params.quantidade, p_num_cores: params.numCores ?? 1, }; if (typeof params.larguraCm === "number" && params.larguraCm > 0) { rpcParams.p_largura_cm = params.larguraCm; } if (typeof params.alturaCm === "number" && params.alturaCm > 0) { rpcParams.p_altura_cm = params.alturaCm; } return rpcParams;
  ```
- **generateDeviceFingerprint()** — `src/hooks/useDeviceDetection.ts`
  ```
  const components = [ navigator.userAgent, navigator.language, navigator.platform, screen.width, screen.height, screen.colorDepth, new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 'unknown', (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 'unknown', ]; const fingerprint = components.join('|'); // Simple hash function let hash = 0; for (let i = 0; i < fingerprint.length; i++) { const char = fingerprint.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash = h …
  ```
- **mapPriceResponseToFlat(resp: Record<string, unknown>)** — `src/hooks/useGravacaoPriceV2.ts`
  ```
  return adaptPriceResponse(resp);
  ```
- **calculateCustomizationPrice(params: CalculatePriceParams)** — `src/hooks/useGravacaoPriceV2.ts`
  ```
  const result = await invokeExternalRpc<CustomizationPriceResponse>( 'fn_get_customization_price', { p_area_id: params.areaId, p_quantidade: params.quantidade, p_num_cores: params.numCores ?? 1, p_largura_cm: params.larguraCm ?? null, p_altura_cm: params.alturaCm ?? null, } ); return adaptPriceResponse(result as unknown as Record<string, unknown>);
  ```
- **accessValidationResult(data: unknown, currentIP: string)** — `src/hooks/useIPValidation.ts`
  ```
  if (!data) return { isAllowed: true, currentIP, hasRestrictions: false }; const result = data as AccessValidationResponse; if (result.allowed) { return { isAllowed: true, currentIP, hasRestrictions: result.reason !== 'no_settings', }; } return { isAllowed: false, currentIP, hasRestrictions: true, error: accessDenialMessage(result, currentIP), reason: result.reason, details: result.details, };
  ```
- **kitValidationErrors(box: KitBox | null, items: KitItem[], volumeUsagePercent: number, itemsWeight: number,)** — `src/hooks/useKitBuilder.ts`
  ```
  const errors: string[] = []; if (!box) errors.push('Selecione uma caixa'); if (items.length === 0) errors.push('Adicione pelo menos um item ao kit'); if (volumeUsagePercent > 100) errors.push('Volume dos itens excede a capacidade da caixa'); if (box?.maxWeight && itemsWeight > box.maxWeight) { errors.push(`Peso dos itens (${(itemsWeight / 1000).toFixed(1)}kg) excede o limite da caixa (${(box.maxWeight / 1000).toFixed(1)}kg)`); } return errors;
  ```
- **canProceedFromStep(step: KitBuilderStep, state: KitState)** — `src/hooks/useKitBuilder.ts`
  ```
  switch (step) { case 'box': return state.box !== null; case 'items': return state.items.length > 0 && state.volumeUsagePercent <= 100; case 'personalization': return true; case 'summary': return state.isValid; }
  ```
- **calculateRisk(requirement: Requirement, indexes: ForecastIndexes)** — `src/hooks/useKitStockForecast.ts`
  ```
  const variants = applicableVariants(requirement, indexes); const availableNow = currentStock(requirement, variants, indexes); const deficit = Math.max(0, requirement.required - availableNow); if (deficit === 0) return null; const entries = futureEntries(variants, indexes); let available = availableNow; let coverageDate: string | null = null; for (const entry of entries) { available += entry.quantity; if (available >= requirement.required) { coverageDate = entry.date; break; } } return { coverage …
  ```
- **calculateKitStockForecast(items: KitItem[], kitQuantity: number, { products, variants, sources }: ForecastData,)** — `src/hooks/useKitStockForecast.ts`
  ```
  const itemsAtRisk: KitStockForecast['itemsAtRisk'] = []; let latestCoverageDate: string | null = null; const indexes = createIndexes({ products, variants, sources }); for (const requirement of buildRequirements(items, kitQuantity)) { const risk = calculateRisk(requirement, indexes); if (!risk) continue; itemsAtRisk.push(risk.item); if (risk.coverageDate && (!latestCoverageDate || risk.coverageDate > latestCoverageDate)) { latestCoverageDate = risk.coverageDate; } } const hasCompleteReplenishment …
  ```
- **scoreRequestBody(deps: GenerationDeps, imageUrl: string, brief: MagicUpBrief, controls: MagicUpCreativeControls,)** — `src/hooks/useMagicUpGeneration.ts`
  ```
  return { imageUrl, productName: deps.selectedProduct?.name, clientName: valueOr(deps.selectedClient?.name, deps.activeCampaign?.clientName), campaignBrief: brief, brandKit: deps.brandKit, creativeControls: controls, promptText: valueOr(deps.fullPromptPreview, deps.effectivePrompt), channel: brief.channel, aspectRatio: controls.aspectRatio, };
  ```
- **generateVariation(deps: GenerationDeps, batch: MagicUpBatchVariant | undefined, analyzeQuality: (imageUrl: string, brief: MagicUpBrief, co)** — `src/hooks/useMagicUpGeneration.ts`
  ```
  Promise<MagicUpQualityDiagnosis>,
  ```
- **canRestoreDraft(isLoading: boolean, restored: boolean, restoring: boolean)** — `src/hooks/useMockupGenerator.ts`
  ```
  return !isLoading && !restored && !restoring;
  ```
- **generateMockup()** — `src/hooks/useMockupGenerator.ts`
  ```
  const areasWithLogos = personalizationAreas.filter(a => a.logoPreview); if (!selectedClient) { toast.error(INCOMPLETE_SELECTION_MESSAGE); return; } if (!productSelection) { toast.error(INCOMPLETE_SELECTION_MESSAGE); return; } if (!selectedTechnique) { toast.error(INCOMPLETE_SELECTION_MESSAGE); return; } if (!areasWithLogos.length) { toast.error(INCOMPLETE_SELECTION_MESSAGE); return; } const productImage = getProductImage(); if (!productImage) { toast.error("O produto selecionado não possui image …
  ```
- **groupPriceTiers(rows: Array<FaixaPreco & { tabela_preco_gravacao_id: string }>)** — `src/hooks/useMockupTechniques.ts`
  ```
  const grouped = new Map<string, FaixaPreco[]>(); for (const row of rows) { const tiers = grouped.get(row.tabela_preco_gravacao_id) || []; tiers.push(row); grouped.set(row.tabela_preco_gravacao_id, tiers); } return grouped;
  ```
- **calcDaysRemaining(createdAt: string)** — `src/hooks/useNovelties.ts`
  ```
  const created = new Date(createdAt).getTime(); const now = Date.now(); const elapsed = Math.floor((now - created) / (1000 * 60 * 60 * 24)); return Math.max(0, NOVELTY_WINDOW_DAYS - elapsed);
  ```
- **fetchPriceTechniques()** — `src/hooks/usePrintAreas.ts`
  ```
  const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE_FUNCTION, { body: { table: 'tabela_preco_gravacao_oficial', operation: 'select', filters: { ativo: true }, limit: 100, }, }); if (error) throw new Error(error.message); if (!data?.success) throw new Error(data?.error || 'Erro ao buscar técnicas'); return adaptTabelaPrecoRows(data.data?.records || []);
  ```
- **calculateAverageQuantity(quoteItems: Array<{ quantity: number | null }>, orderItems: Array<{ quantity: number | null }>,)** — `src/hooks/useProductInsights.ts`
  ```
  const quantities = [ ...quoteItems.map((item) => item.quantity ?? 0), ...orderItems.map((item) => item.quantity ?? 0), ]; if (quantities.length === 0) return 0; return quantities.reduce((sum, quantity) => sum + quantity, 0) / quantities.length;
  ```
- **categoryScore(source: Product, candidate: Product)** — `src/hooks/useProductMatch.ts`
  ```
  const matches = source.category_id && candidate.category_id && source.category_id === candidate.category_id; return matches ? { score: 30, reasons: ['Mesma categoria'] } : { score: 0, reasons: [] };
  ```
- **tagScore(source: Product, candidate: Product)** — `src/hooks/useProductMatch.ts`
  ```
  const labels: Record<string, string> = { publicoAlvo: 'Público-alvo', datasComemorativas: 'Data comemorativa', endomarketing: 'Endomarketing', }; const categories: (keyof Product['tags'])[] = ['publicoAlvo', 'datasComemorativas', 'endomarketing']; const matches = categories.flatMap((category) => { const shared = sharedValues(normalizedTags(source, category), normalizedTags(candidate, category)); return shared.length ? [{ category, shared }] : []; }); return { score: matches.reduce((total, match) …
  ```
- **nicheScore(source: Product, candidate: Product)** — `src/hooks/useProductMatch.ts`
  ```
  const shared = sharedValues(nicheValues(source), nicheValues(candidate)); return shared.length ? { score: 15 * shared.length, reasons: [`Nicho: ${shared.join(', ')}`] } : { score: 0, reasons: [] };
  ```
- **supplierScore(source: Product, candidate: Product)** — `src/hooks/useProductMatch.ts`
  ```
  const matches = source.supplier?.id && candidate.supplier?.id && source.supplier.id === candidate.supplier.id; return matches ? { score: 5, reasons: ['Mesmo fornecedor'] } : { score: 0, reasons: [] };
  ```
- **complementaryScore(source: Product, candidate: Product)** — `src/hooks/useProductMatch.ts`
  ```
  const candidateName = normalizeText(candidate.name); const sourceName = normalizeText(source.name); const matches = findComplementaryKeywords(source.name).filter((keyword) => { const normalized = normalizeText(keyword); return candidateName.includes(normalized) && !sourceName.includes(normalized); }); return matches.length ? { score: 20 * matches.length, reasons: [`Complementar: ${matches.join(', ')}`] } : { score: 0, reasons: [] };
  ```
- **calculateMatchScore(source: Product, candidate: Product)** — `src/hooks/useProductMatch.ts`
  ```
  score: number; reasons: string[]
  ```
- **validateIdentity(row: BulkImportRow, errors: string[])** — `src/hooks/useProductRegistrationImport.ts`
  ```
  if (!row.name?.trim()) errors.push('Nome é obrigatório'); if (!row.sku?.trim()) errors.push('SKU é obrigatório');
  ```
- **parsePrice(value: string | number, errors: string[])** — `src/hooks/useProductRegistrationImport.ts`
  ```
  const price = typeof value === 'string' ? parseFloat(value) : value; if (isNaN(price) || price <= 0) errors.push('Preço deve ser um número maior que zero'); return price;
  ```
- **applySeoResult(data: SeoAIResult, setValue: UseFormSetValue<ProductFormData>,)** — `src/hooks/useProductSeoAI.ts`
  ```
  for (const field of SEO_FIELDS) { if (data[field]) setValue(field, data[field], { shouldDirty: true }); } if (data.slug) setValue('canonical_url', `/produto/${data.slug}`, { shouldDirty: true });
  ```
- **shouldRetryCatalog(failureCount: number, error: Error, maximum: number)** — `src/hooks/useProducts.ts`
  ```
  return failureCount < maximum && !/CATALOG_NOT_CONFIGURED|CATALOG_READ_ONLY/.test(error.message);
  ```
- **applyProductFilters(products: Product[], filters?: ProductFilters)** — `src/hooks/useProducts.ts`
  ```
  const sorted = sortProductsBySearch(products, filters?.search); const byCategory = filterByCategory(sorted, filters?.category); const byMinimum = filterByMinimumPrice(byCategory, filters?.minPrice); const byMaximum = filterByMaximumPrice(byMinimum, filters?.maxPrice); return filters?.inStock ? byMaximum.filter((product) => (product.stock || 0) > 0) : byMaximum;
  ```
- **shouldSkipCategoryFetch(force: boolean, currentKey: string, requestKey: string)** — `src/hooks/useProductsByCategory.ts`
  ```
  return !force && currentKey === requestKey;
  ```
- **shouldResetCategoryFilter(enabled: boolean, hasFilter: boolean)** — `src/hooks/useProductsByCategory.ts`
  ```
  return !enabled || !hasFilter;
  ```
- **shouldRetryCatalog(failureCount: number, error: Error)** — `src/hooks/useProductsLightweight.ts`
  ```
  return failureCount < 3 && !/CATALOG_NOT_CONFIGURED|CATALOG_READ_ONLY/.test(error.message);
  ```
- **applyTemplateDiscount(template: QuoteTemplate, setDiscountType: (type: DiscountType)** — `src/hooks/useQuoteBuilderState.ts`
  ```
  void,
  ```
- **validateSaveForm(status: SaveStatus, isDraftValid: boolean, isFormValid: boolean, validationErrors: string[],)** — `src/hooks/useQuoteBuilderState.ts`
  ```
  if (status === 'draft' && !isDraftValid) { toast.error('Selecione uma empresa para salvar o rascunho.'); return false; } if (status !== 'draft' && !isFormValid) { const missing = validationErrors.map((error) => QUOTE_FIELD_LABELS[error] || error).join(', '); toast.error(`Preencha os campos obrigatórios: ${missing}`); return false; } return true;
  ```
- **validateFreshPrices(status: SaveStatus, items: QuoteItem[])** — `src/hooks/useQuoteBuilderState.ts`
  ```
  if (status === 'draft') return true; const staleUnconfirmed = items.some((item) => { if (item.price_confirmed_at) return false; return getPriceFreshness(item.price_updated_at, item.price_freshness_threshold_days).isStale; }); if (!staleUnconfirmed) return true; toast.error('Confirme os preços defasados antes de fechar o orçamento'); return false;
  ```
- **validateTransactionLimit(total: number, limit: number)** — `src/hooks/useQuoteBuilderState.ts`
  ```
  if (limit <= 0 || total <= limit) return true; toast.error('Limite de alçada excedido!', { description: `Este pedido (R$ ${total.toLocaleString()}) supera seu limite de R$ ${limit.toLocaleString()}.`, }); return false;
  ```
- **validateMonthlyBudget(total: number, budget: { verba_total: number; verba_consumida: number | null },)** — `src/hooks/useQuoteBuilderState.ts`
  ```
  const remaining = budget.verba_total - (budget.verba_consumida || 0); if (budget.verba_total <= 0 || total <= remaining) return true; toast.error('Verba insuficiente!', { description: `Você possui apenas R$ ${remaining.toLocaleString()} de verba disponível este mês.`, }); return false;
  ```
- **validatePaBudget(params: BudgetValidationParams)** — `src/hooks/useQuoteBuilderState.ts`
  ```
  const { status, isPaUser, paId, total } = params; if (status === 'draft' || !isPaUser) return true; if (!paId) { toast.error('Seu perfil não possui um Ponto de Atendimento vinculado.'); return false; } const { data: budget, error } = await supabase .from('pa_budgets') .select('*') .eq('pa_id', paId) .eq('ano', new Date().getFullYear()) .eq('mes', new Date().getMonth() + 1) .maybeSingle(); const validation = validateBudgetForSubmission(budget, error); if (!validation.ok) { toast.error(validation. …
  ```
- **applyQuoteTransition(params: TransitionQuoteParams,)** — `src/hooks/useQuoteBuilderState.ts`
  ```
  const quoteId = params.quote.id; if (!quoteId) return { aplicada: false, saltosDeVersao: 0, statusVigente: null }; let saltosDeVersao = 0; let statusVigente: string | null = null; let effectiveStatus = params.persistedStatus; if (quoteStatusRequiresDraftReset(effectiveStatus)) { const reopened = await params.updateQuoteStatus(quoteId, "draft"); if (!reopened) return { aplicada: false, saltosDeVersao, statusVigente }; effectiveStatus = "draft"; saltosDeVersao = 1; statusVigente = "draft"; } const …
  ```
- **canPersistQuoteVersion(isEditMode: boolean, expectedRowVersion: number | null)** — `src/hooks/useQuoteBuilderState.ts`
  ```
  if (!isEditMode || expectedRowVersion !== null) return true; toast.error( 'Não foi possível confirmar a versão do orçamento. Recarregue a página antes de salvar.', ); return false;
  ```
- **validateTemplateItems(items: QuoteTemplateItem[])** — `src/hooks/useQuoteTemplates.ts`
  ```
  if (!items || items.length === 0) return []; try { // Produtos vêm do catálogo externo (Promobrind), não do banco operacional — // a tabela local "products" não existe. Ver docs/execucao/evidencias/products_companies_fix_20260917.md const productIds = items.map(i => i.productId); const data = await fetchPromobrindProducts({ filters: { id: productIds }, limit: productIds.length, }); return items.map(item => { const product = data?.find(p => p.id === item.productId); const currentPrice = product?. …
  ```
- **calcDaysSinceReplenishment(updatedAt: string)** — `src/hooks/useReplenishments.ts`
  ```
  const updated = new Date(updatedAt).getTime(); if (Number.isNaN(updated)) return REPLENISHMENT_WINDOW_DAYS; return Math.max(0, Math.floor((Date.now() - updated) / (1000 * 60 * 60 * 24)));
  ```
- **calcDaysRemaining(updatedAt: string)** — `src/hooks/useReplenishments.ts`
  ```
  const elapsed = calcDaysSinceReplenishment(updatedAt); return Math.max(0, REPLENISHMENT_WINDOW_DAYS - elapsed);
  ```
- **calculateProgressUpdate(goal: SalesGoal, increment: GoalProgressIncrement)** — `src/hooks/useSalesGoals.ts`
  ```
  const currentValue = goal.current_value || 0; const currentQuotes = goal.current_quotes || 0; const currentConversions = goal.current_conversions || 0; const newValue = currentValue + increment.addValue; const newQuotes = currentQuotes + increment.addQuotes; const newConversions = currentConversions + increment.addConversions; const targetQuotes = goal.target_quotes ?? 0; const targetConversions = goal.target_conversions ?? 0; const isAchieved = newValue >= goal.target_value && targetWasReached( …
  ```
- **calculateNextRun(frequency: ReportFrequency)** — `src/hooks/useScheduledReports.ts`
  ```
  const now = new Date(); switch (frequency) { case 'daily': return new Date(now.getTime() + 24 * 60 * 60 * 1000); case 'weekly': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); case 'monthly': { // `setMonth(+1)` em 31/01 cai em 03/03 e pula fevereiro; ancorar no dia // 1 e limitar ao último dia do mês destino mantém o agendamento mensal. const next = new Date(now); const day = next.getDate(); next.setDate(1); next.setMonth(next.getMonth() + 1); const lastDay = new Date(next.getFullYear …
  ```
- **shouldClearSecrets(error: SecretError)** — `src/hooks/useSecretsManager.ts`
  ```
  return ["unauthenticated", "forbidden", "permission_denied"].includes(error.code);
  ```
- **calculateNameSimilarity(name1: string, name2: string)** — `src/hooks/useSupplierComparison.ts`
  ```
  if (!name1?.trim() || !name2?.trim()) return 0; const words1 = name1.toLowerCase().split(/\s+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w)); const words2 = name2.toLowerCase().split(/\s+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w)); if (words1.length === 0 || words2.length === 0) return 0; const commonWords = words1.filter((word) => words2.some((w) => w.includes(word) || word.includes(w)) ); return commonWords.length / Math.max(words1.length, words2.length);
  ```
- **fetchPriceOptions()** — `src/hooks/useTechniquePricing.ts`
  ```
  setIsLoading(true); setError(null); try { // Buscar todas as tabelas que contêm o código da técnica const { data, error: invokeError } = await supabase.functions.invoke('external-db-bridge', { body: { table: 'customization_price_tables', operation: 'select', select: 'id,table_code,table_code_option,table_fullcode,customization_type_name,max_colors,max_area_width_cm,max_area_height_cm,price_by_color,price_by_area,setup_price,handling_price', filters: { is_active: true }, limit: 100, }, }); if (in …
  ```
- **extractPriceTableRecords(data: PriceTablePayload | null, hasError: boolean)** — `src/hooks/useTechniquePricingOptions.ts`
  ```
  if (hasError || !data) return null; if (Array.isArray(data.data)) return data.data; if (data.success && data.data?.records) return data.data.records; return null;
  ```
- **calculateRecommendationScore(technique: Technique, keywords: string[])** — `src/hooks/useTechniqueRecommendations.ts`
  ```
  score: number; matchedKeywords: string[]; reason: string
  ```
- **extractPriceTiers(table: CustomizationPriceTable)** — `src/hooks/useTecnicasUnificadas.ts`
  ```
  const tiers: PriceTier[] = []; for (let i = 1; i <= 15; i++) { const minQty = table[`min_qty_${i}`] as number | undefined; const price = table[`price_${i}`] as number | undefined; const sla = table[`sla_${i}`] as number | undefined; if (minQty !== undefined && minQty !== null && price !== undefined && price !== null) { const nextMinQty = table[`min_qty_${i + 1}`] as number | undefined; const maxQty = nextMinQty ? nextMinQty - 1 : null; tiers.push({ tierIndex: i, minQuantity: minQty, maxQuantity: …
  ```
- **calculatePriceForQuantityLegacy(table: CustomizationPriceTable, quantity: number)** — `src/hooks/useTecnicasUnificadas.ts`
  ```
  const tiers = extractPriceTiers(table); const firstTier = tiers[0]; if (!firstTier) return null; let selectedTier = firstTier; for (const tier of tiers) { if (quantity >= tier.minQuantity) { selectedTier = tier; } } const unitPrice = selectedTier.unitPrice; const totalPrice = unitPrice * quantity; const setupPrice = valueOr(table.setup_price, 0); const handlingPrice = valueOr(table.handling_price, 0); const grandTotal = totalPrice + setupPrice + handlingPrice; const minTierPrice = firstTier.unit …
  ```
- **calculateColorSummary(variants: VariantWithStock[], stockEntries: StockEntry[])** — `src/hooks/useVariantSupplierSources.ts`
  ```
  const colorMap = new Map<string, ColorSummary>(); // Agregar estoque atual por cor for (const v of variants) { const name = v.color_name || 'Sem cor'; const existing = colorMap.get(name); if (existing) { existing.currentStock += v.stock_quantity || 0; } else { colorMap.set(name, { name, hex: v.color_hex, thumbnail: v.selected_thumbnail, currentStock: v.stock_quantity || 0, incomingTotal: 0, incomingCount: 0, }); } } // Agregar previsões de reposição por cor for (const entry of stockEntries) { co …
  ```
- **scribeIsStarting(isStarting: boolean, status: string | undefined)** — `src/hooks/useVoiceAgent.ts`
  ```
  return isStarting || status === "connecting";
  ```
- **recencyScore(days: number | null)** — `src/hooks/bi/useClientHealthScore.ts`
  ```
  if (days === null || days === undefined) return 0; if (days <= 30) return 100; if (days <= 60) return 80; if (days <= 90) return 60; if (days <= 180) return 30; return 0;
  ```
- **ratioScore(client: number, industry: number)** — `src/hooks/bi/useClientHealthScore.ts`
  ```
  if (!industry || industry <= 0) return client > 0 ? 60 : 0; const ratio = client / industry; if (ratio >= 1.3) return 100; if (ratio >= 1.1) return 90; if (ratio >= 0.9) return 75; if (ratio >= 0.7) return 55; if (ratio >= 0.5) return 35; return 15;
  ```
- **comparisonScore(metric: ComparisonMetric | undefined)** — `src/hooks/bi/useClientHealthScore.ts`
  ```
  return metric ? ratioScore(metric.clientValue, metric.industryAvg) : 0;
  ```
- **periodTotal(offsets: number[])** — `src/hooks/bi/useClientHealthScore.ts`
  ```
  offsets.reduce((sum, offset) => {
  ```
- **weightedScore(components: ScoreComponent[], totalWeight: number)** — `src/hooks/bi/useClientHealthScore.ts`
  ```
  return Math.round(components.reduce((sum, component) => sum + component.score * component.weight, 0) / totalWeight);
  ```
- **roundedGrowth(growthPct: number | null)** — `src/hooks/bi/useClientHealthScore.ts`
  ```
  return growthPct === null ? null : Math.round(growthPct);
  ```
- **roundedDelta(metric: MetricComparison | undefined)** — `src/hooks/bi/useClientVsIndustry.ts`
  ```
  return Math.round(metric?.deltaPercent ?? 0);
  ```
- **comparisonIsLoading(sources: Array<{ isLoading: boolean }>)** — `src/hooks/bi/useClientsComparison.ts`
  ```
  return sources.some((source) => source.isLoading);
  ```
- **formatPrice(value: number | null | undefined)** — `src/hooks/gravacao/gravacao-constants.ts`
  ```
  if (value === null || value === undefined) return '-'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **calculateTotalWithColorDiscount(basePrice: number, numCores: number, tabela: TabelaPrecoOficial)** — `src/hooks/gravacao/gravacao-constants.ts`
  ```
  if (!tabela.cobra_por_cor || numCores <= 1) return basePrice; let discount = 0; if (numCores === 2 && tabela.desconto_segunda_cor) discount = tabela.desconto_segunda_cor; else if (numCores === 3 && tabela.desconto_terceira_cor) discount = tabela.desconto_terceira_cor; else if (numCores >= 4 && tabela.desconto_quarta_cor_mais) discount = tabela.desconto_quarta_cor_mais; return basePrice * (1 - discount) * numCores;
  ```
- **calculateSetupCost(numCores: number, tabela: TabelaPrecoOficial)** — `src/hooks/gravacao/gravacao-constants.ts`
  ```
  if (!tabela.custo_setup) return 0; return tabela.custo_setup_por_cor ? tabela.custo_setup * numCores : tabela.custo_setup;
  ```
- **findPriceTier(quantidade: number, faixas: FaixaPrecoOficial[])** — `src/hooks/gravacao/gravacao-constants.ts`
  ```
  for (const faixa of faixas) { if (quantidade >= faixa.quantidade_minima && (faixa.quantidade_maxima === null || quantidade <= faixa.quantidade_maxima)) { return faixa; } } return faixas[faixas.length - 1] ?? null;
  ```
- **calculateCustomizationTotal(quantidade: number, numCores: number, tabela: TabelaPrecoOficial, ...pricing: [faixas: FaixaPrecoOficial[], markupPercen)** — `src/hooks/gravacao/gravacao-constants.ts`
  ```
  const [faixas, markupPercent = 115] = pricing; const faixa = findPriceTier(quantidade, faixas); const markupMultiplier = 1 + (markupPercent / 100); if (!faixa) { return { faixa: null, custoUnitarioBase: 0, custoUnitarioTotal: 0, custoSetup: 0, custoManuseio: 0, custoTotalPecas: 0, precoUnitario: 0, precoMinimoUnitario: 0, subtotalPecas: 0, faturamentoMinimoGravacao: tabela.faturamento_minimo || 0, minimumApplied: false, total: 0, margemPercent: 0, prazoDias: null as number | null, }; } const cus …
  ```
- **generateSlug(nome: string)** — `src/hooks/gravacao/useTecnicasGravacao.ts`
  ```
  return nome .toLowerCase() .normalize('NFD') .replace(/[\u0300-\u036f]/g, '') .replace(/[^a-z0-9]+/g, '-') .replace(/(^-|-$)/g, '');
  ```
- **generateSlug(nome: string)** — `src/hooks/gravacao/useVariantesGravacao.ts`
  ```
  return nome .toLowerCase() .normalize('NFD') .replace(/[\u0300-\u036f]/g, '') .replace(/[^a-z0-9]+/g, '-') .replace(/(^-|-$)/g, '');
  ```
- **generateAreaMockup(params: GenerateMockupParams, area: PersonalizationArea, techniquePrompt: string, includeAllAreas: boolean,)** — `src/hooks/mockup/mockupGenerationService.ts`
  ```
  const response = await supabase.functions.invoke("generate-mockup", { body: mockupRequestBody(params, area, techniquePrompt, includeAllAreas), }); return mockupUrlFromResponse(response);
  ```
- **generateBatchMockups(params: GenerateMockupParams, areas: PersonalizationArea[], techniquePrompt: string,)** — `src/hooks/mockup/mockupGenerationService.ts`
  ```
  const results: { areaName: string; url: string }[] = []; for (const area of areas) { toast.info(`Gerando ${area.name}...`, { duration: 2000 }); try { results.push({ areaName: area.name, url: await generateAreaMockup(params, area, techniquePrompt, false) }); } catch (error) { console.error(`Error generating ${area.name}:`, error); } } const first = results[0]; if (!first) throw new Error("Nenhum mockup gerado no batch"); return { singleUrl: first.url, batchResults: results };
  ```
- **generateMockupApi(params: GenerateMockupParams)** — `src/hooks/mockup/mockupGenerationService.ts`
  ```
  const { technique, areas } = params; const areasWithLogos = areas.filter(a => a.logoPreview); const techniquePrompt = getTechniquePrompt(technique); if (areasWithLogos.length === 1) { const area = areasWithLogos[0]; if (!area) throw new Error("Nenhuma área com logo encontrada"); return { singleUrl: await generateAreaMockup(params, area, techniquePrompt, true), batchResults: [] }; } return generateBatchMockups(params, areasWithLogos, techniquePrompt);
  ```
- **validateStatusTransition(patch: Partial<OrderRow>, currentStatus?: string)** — `src/hooks/orders/useOrders.ts`
  ```
  if (!patch.status || !currentStatus || canTransitionTo(currentStatus, patch.status)) return; const oldLabel = ORDER_STATUS_LABELS[currentStatus as OrderStatus] || currentStatus; const newLabel = ORDER_STATUS_LABELS[patch.status as OrderStatus] || patch.status; throw new Error(`Transição de status inválida: de ${oldLabel} para ${newLabel}`);
  ```
- **canTransitionTo(current: string, next: string)** — `src/hooks/orders/useOrders.ts`
  ```
  if (current === next) return true; const validNext = VALID_TRANSITIONS[current as OrderStatus] || []; return validNext.includes(next as OrderStatus);
  ```
- **validRowVersion(value: number | null | undefined)** — `src/hooks/quote/useQuoteInitialization.ts`
  ```
  return typeof value === "number" && value > 0 ? value : null;
  ```
- **applyQuoteIdentity(quote: Quote, setters: QuoteSetters)** — `src/hooks/quote/useQuoteInitialization.ts`
  ```
  setters.setClientId(fallback(quote.client_id, "")); // Contato não é fabricado: quotes não persistia contact_id (a tabela não tem a // coluna). Preencher com client_id criava contato inválido que passava a // validação. O contato fica vazio até seleção real no formulário. setters.setValidUntil(fallback(quote.valid_until, format(addDays(new Date(), 30), "yyyy-MM-dd"))); setters.setNotes(fallback(quote.notes, "")); setters.setInternalNotes(fallback(quote.internal_notes, "")); setters.setQuoteNumbe …
  ```
- **applyQuoteClient(quote: Quote, setters: QuoteSetters)** — `src/hooks/quote/useQuoteInitialization.ts`
  ```
  if (quote.client_name) { setters.setContactInfo({ id: "", name: quote.client_name, email: quote.client_email || undefined, phone: quote.client_phone || undefined, }); } if (quote.client_company) { setters.setCompanyInfo({ id: quote.client_id || "", name: quote.client_company, cnpj: quote.client_cnpj || undefined, ramo_atividade: undefined, }); }
  ```
- **applyQuoteDiscount(quote: Quote, setters: QuoteSetters)** — `src/hooks/quote/useQuoteInitialization.ts`
  ```
  if (quote.discount_percent && quote.discount_percent > 0) { setters.setDiscountType("percent"); setters.setDiscountValue(quote.discount_percent); return; } if (quote.discount_amount && quote.discount_amount > 0) { setters.setDiscountType("amount"); setters.setDiscountValue(quote.discount_amount); }
  ```
- **applyQuoteConditions(quote: Quote, setters: QuoteSetters)** — `src/hooks/quote/useQuoteInitialization.ts`
  ```
  if (typeof quote.negotiation_markup_percent === "number") setters.setNegotiationMarkup(quote.negotiation_markup_percent); if (quote.payment_terms) setters.setPaymentTerms(quote.payment_terms); if (quote.shipping_type) setters.setShippingType(quote.shipping_type); if (quote.shipping_cost) setters.setShippingCost(quote.shipping_cost); if (quote.items) setters.setItems(quote.items); if (quote.tags) setters.setTags(quote.tags);
  ```
- **applyQuoteDelivery(quote: Quote, setters: QuoteSetters)** — `src/hooks/quote/useQuoteInitialization.ts`
  ```
  if (!quote.delivery_time) return; if (quote.delivery_time.startsWith("date:")) { setters.setDeliveryMode("data"); setters.setDeliveryDate(new Date(`${quote.delivery_time.slice(5)}T12:00:00`)); } else { setters.setDeliveryMode("prazo"); } setters.setDeliveryTime(quote.delivery_time);
  ```
- **applyExistingQuote(quote: Quote, setters: QuoteSetters)** — `src/hooks/quote/useQuoteInitialization.ts`
  ```
  applyQuoteIdentity(quote, setters); applyQuoteClient(quote, setters); applyQuoteDiscount(quote, setters); applyQuoteConditions(quote, setters); applyQuoteDelivery(quote, setters);
  ```
- **calculateQuoteStockIssues(items: QuoteStockItem[], products: QuoteStockProduct[], variants: QuoteStockVariant[], sources: QuoteStockSupplierSource)** — `src/hooks/quote/useQuotesStockStatus.ts`
  ```
  const indexes: StockIndexes = { products: new Map(products.map((product) => [product.id, product])), variantsById: new Map(variants.map((variant) => [variant.id, variant])), variantsByProduct: groupVariants(variants), sourcesByVariant: latestSourceByVariant(sources), }; const issues: Record<string, boolean> = {}; for (const requirement of requirementsFrom(items)) { const available = availableForRequirement(requirement, indexes); if (requirement.quantity > available) issues[requirement.quoteId] = …
  ```
- **personalizationTotal(item: QuoteItem)** — `src/hooks/quotes/quoteHelpers.ts`
  ```
  return arrayOrEmpty(item.personalizations).reduce( (sum, personalization) => sum + numberOr(personalization.total_cost, 0), 0, );
  ```
- **discountAmountFor(subtotal: number, discountType: 'percent' | 'amount', discountValue: number,)** — `src/hooks/quotes/quoteHelpers.ts`
  ```
  return discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue;
  ```
- **quoteShippingCost(quote: Partial<Quote>)** — `src/hooks/quotes/quoteHelpers.ts`
  ```
  return quote.shipping_type === 'fob' || quote.shipping_type === 'fob_pre' ? numberOr(quote.shipping_cost, 0) : 0;
  ```
- **calculateQuoteTotals(quote: Partial<Quote>, ...options: [ items: QuoteItem[], negotiationMarkup?: number, discountType?: 'percent' | 'amount')** — `src/hooks/quotes/quoteHelpers.ts`
  ```
  const [items, negotiationMarkup, discountType = 'percent', discountValue = 0] = options; // Subtotal real = soma direta dos itens + personalizações (sem markup) const realSubtotal = items.reduce((sum, item) => { const baseTotal = item.quantity * item.unit_price; return sum + baseTotal + personalizationTotal(item); }, 0); // Custo total = soma do custo dos produtos + custo das personalizações const totalCost = items.reduce((sum, item) => { const productCost = quoteItemUnitCost(item) * item.quanti …
  ```
- **formatCurrency(value: number)** — `src/hooks/simulation/simulationClipboard.ts`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  ```
- **recalculatePersonalization(personalization: Personalization, state: SimulatorWizardState, dispatch: Dispatch<WizardAction>,)** — `src/hooks/simulator/useWizardPricing.ts`
  ```
  try { const technique = findPersonalizationTechnique(state, personalization); if (!technique) return; const result = await invokeExternalRpc<CustomizationPriceResponse>( 'fn_get_customization_price', wizardRpcParams(technique, personalization.specs, state.quantity), ); if (!result?.success) return; const price = adaptPriceResponse(result as unknown as Record<string, unknown>); dispatch({ type: 'RECALC_PERSONALIZATION_PRICING', payload: { personalizationId: personalization.id, pricing: { unitPric …
  ```
- **recalculatePersonalizations(personalizations: Personalization[], state: SimulatorWizardState, dispatch: Dispatch<WizardAction>,)** — `src/hooks/simulator/useWizardPricing.ts`
  ```
  await Promise.all(personalizations.map(item => recalculatePersonalization(item, state, dispatch))); toast.success('Preços recalculados para nova tiragem!');
  ```
- **recalculatePersonalization(state: SimulatorWizardState, personalizationId: string, pricing: SimulatorWizardState['personalizations'][number]['prici)** — `src/hooks/simulator/wizardReducer.ts`
  ```
  return { ...state, personalizations: state.personalizations.map(personalization => personalization.id === personalizationId ? { ...personalization, pricing } : personalization, ), };
  ```
- **generateStockAlerts(products: ProductStockSummary[])** — `src/hooks/stock/stockAlerts.ts`
  ```
  const alerts = products.flatMap(product => product.variants.flatMap(variant => variantAlerts(product, variant))); return alerts.sort((a, b) => { const severityOrder = { error: 0, warning: 1, info: 2 }; return severityOrder[a.severity] - severityOrder[b.severity]; });
  ```
- **calcularPreco(tabela: TabelaPrecoTecnica, quantidade: number, numeroCores?: number)** — `src/hooks/tecnicas/usePrecoCalculation.ts`
  ```
  // Tabela sem faixas configuradas: retorna preço zerado em vez de quebrar const firstTier = tabela.faixas[0]; if (!firstTier) { return { tabelaId: tabela.id, codigoTabela: tabela.codigoTabelaOpcao, quantidade, faixaUtilizada: 0, precoUnitario: 0, precoTotal: 0, precoSetup: tabela.precoSetup, precoManuseio: tabela.precoManuseio, slaDias: null, }; } // Encontrar a faixa correta let faixaUtilizada = firstTier; for (const faixa of tabela.faixas) { if (quantidade >= faixa.quantidadeMinima) { faixaUti …
  ```
- **extractPriceTiersFromTabela(tabela: TabelaPrecoTecnica)** — `src/hooks/tecnicas/usePrecoCalculation.ts`
  ```
  return tabela.faixas.map((f, idx, arr) => { const proxima = arr[idx + 1]; return { tierIndex: f.faixa, minQuantity: f.quantidadeMinima, maxQuantity: proxima ? proxima.quantidadeMinima - 1 : null, unitPrice: f.precoUnitario, slaDays: f.slaDias, }; });
  ```
- **calculatePriceForQuantity(tabela: TabelaPrecoTecnica, quantity: number)** — `src/hooks/tecnicas/usePrecoCalculation.ts`
  ```
  const firstTier = tabela.faixas[0]; if (!firstTier) return null; let selectedFaixa = firstTier; for (const faixa of tabela.faixas) { if (quantity >= faixa.quantidadeMinima) { selectedFaixa = faixa; } } const unitPrice = selectedFaixa.precoUnitario; const totalPrice = unitPrice * quantity; const grandTotal = totalPrice + tabela.precoSetup + tabela.precoManuseio; const minPrice = firstTier.precoUnitario; const savingsPerUnit = minPrice - unitPrice; const percentageOff = minPrice > 0 ? ((minPrice - …
  ```
- **usePriceSimulator(productBasePrice: number = 0)** — `src/hooks/tecnicas/usePrecoCalculation.ts`
  ```
  const { isLoading, error, calculateAllPrices } = usePrecoCalculation(); const [quantity, setQuantity] = useState(100); const [selectedTechniqueCode, setSelectedTechniqueCode] = useState<string | null>(null); const calculations = useMemo(() => { return calculateAllPrices(quantity); }, [calculateAllPrices, quantity]); const selectedCalculation = useMemo(() => { if (!selectedTechniqueCode) return calculations[0] || null; return calculations.find(c => c.techniqueCode === selectedTechniqueCode) || nu …
  ```
- **validateAction(action: VoiceAgentAction)** — `src/hooks/voice/processTranscript.ts`
  ```
  if (!action?.action || !action?.response) { return { action: "answer", response: action?.response || "Desculpe, não entendi. Pode repetir?", data: {}, }; } return action;
  ```
- **invalidateScribeTokenCache()** — `src/hooks/voice/scribeTokenCache.ts`
  ```
  cachedToken = null; cachedAt = 0;
  ```
- **canApplyCatalogFilter(active: boolean, error: Error | null, hasData: boolean,)** — `src/lib/catalog-filter-state.ts`
  ```
  return active && (!error || hasData);
  ```
- **invalidateCloudStatus()** — `src/lib/cloud-status.ts`
  ```
  cached = null; // Troca de sessão pode elevar o papel do usuário: a sonda volta a ser tentada. healthFunctionForbiddenFor = null;
  ```
- **cooldownIsActive(force: boolean, timestamp: number)** — `src/lib/external-db-prewarm.ts`
  ```
  if (force || timestamp - lastPrewarmAt >= PREWARM_COOLDOWN_MS) return false; logger.log('[Prewarm] Skipped — cooldown active'); return true;
  ```
- **collectPriceTableIds(areas: PrintAreaTechniqueCanonical[])** — `src/lib/fetch-print-areas.ts`
  ```
  const ids = new Set<string>(); for (const area of areas) { const id = definedOr(area.price_table_id, area.tabela_preco_id); if (id) ids.add(id); } return ids;
  ```
- **calculatedArea(width: number, height: number)** — `src/lib/fetch-print-areas.ts`
  ```
  return width && height ? Number((width * height).toFixed(2)) : null;
  ```
- **formatCurrency(value: number | null | undefined)** — `src/lib/format.ts`
  ```
  if (value === null || value === undefined) return "R$ 0,00"; return BRL_FORMATTER.format(value);
  ```
- **formatCurrencyCompact(value: number)** — `src/lib/format.ts`
  ```
  return BRL_COMPACT_FORMATTER.format(value);
  ```
- **convertToPng(file: File)** — `src/lib/image-converter.ts`
  ```
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const img = new Image(); img.onload = () => { const canvas = document.createElement("canvas"); // Use a reasonable max size to avoid memory issues const maxDim = 2048; let width = img.naturalWidth || img.width; let height = img.naturalHeight || img.height; // For SVGs with no intrinsic size, default to 512 if (width === 0 || height === 0) { width = 512; height = 512; } // Scale down if too large if …
  ```
- **generateKitOgImage(input: KitOgInput)** — `src/lib/kit-og-image.ts`
  ```
  if (typeof document === "undefined") return null; try { const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 630; const ctx = canvas.getContext("2d"); if (!ctx) return null; const color = kitColor(input.color); // Background gradient diagonal const grad = ctx.createLinearGradient(0, 0, 1200, 630); grad.addColorStop(0, color); grad.addColorStop(1, shade(color, -30)); ctx.fillStyle = grad; ctx.fillRect(0, 0, 1200, 630); // Subtle dark overlay for text contrast ctx. …
  ```
- **countTotalAreas(groups: GroupedPrintArea[])** — `src/lib/print-area-grouping.ts`
  ```
  let count = 0; for (const g of groups) { for (const loc of g.locations) { count += loc.techniques.length; } } return count;
  ```
- **countTotalLocations(groups: GroupedPrintArea[])** — `src/lib/print-area-grouping.ts`
  ```
  let count = 0; for (const g of groups) { count += g.locations.length; } return count;
  ```
- **countTotalComponents(groups: GroupedPrintArea[])** — `src/lib/print-area-grouping.ts`
  ```
  return groups.length;
  ```
- **scanPixelBounds({ data, width, height, whiteThreshold, alphaThreshold }: { data: Uint8ClampedArray; width: number; height: number; white)** — `src/lib/product-bounds-detector.ts`
  ```
  const bounds: PixelBounds = { minX: width, maxX: 0, minY: height, maxY: 0, productPixels: 0 }; for (let y = 0; y < height; y += 1) { for (let x = 0; x < width; x += 1) { if (!isProductPixel(data, (y * width + x) * 4, whiteThreshold, alphaThreshold)) continue; bounds.productPixels += 1; bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x); bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y); } } return bounds;
  ```
- **calculateDetectedBounds({ pixels, width, height, margin, imageAspectRatio }: { pixels: PixelBounds; width: number; height: number; margin: numbe)** — `src/lib/product-bounds-detector.ts`
  ```
  const productRatio = pixels.productPixels / (width * height); if (pixels.productPixels < 100 || productRatio < 0.01) { return { ...DEFAULT_BOUNDS, imageAspectRatio }; } if (productRatio > 0.95) { return { fractionX: 0.95, fractionY: 0.95, centerX: 0.5, centerY: 0.5, detected: true, imageAspectRatio }; } const boundsWidth = pixels.maxX - pixels.minX; const boundsHeight = pixels.maxY - pixels.minY; return { fractionX: Math.min(1, (boundsWidth / width) + margin * 2), fractionY: Math.min(1, (boundsH …
  ```
- **canBulkMarkQuotesPending(quotes: Array<{ status: string | null | undefined; is_latest_version?: boolean }>,)** — `src/lib/quote-status-config.ts`
  ```
  return quotes.length > 0 && quotes.every( (quote) => quote.status === "draft" && quote.is_latest_version !== false, );
  ```
- **shouldLoadSentry()** — `src/lib/sentry.ts`
  ```
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined; return !!dsn;
  ```
- **generateMockStockData(productId: string, days: number)** — `src/lib/stock-chart-utils.ts`
  ```
  const baseSeed = hashCode(productId); const data: MockChartPoint[] = []; const now = new Date(); let stock = 850 + Math.floor(seededRandom(baseSeed) * 200); for (let i = days - 1; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const dayIdx = days - 1 - i; const depleted = Math.floor(seededRandom(baseSeed + dayIdx * 3) * 25) + 3; const isRestock = seededRandom(baseSeed + dayIdx * 3 + 1) < 0.08; const restocked = isRestock ? Math.floor(seededRandom(baseSeed + dayIdx * 3 + 2) * …
  ```
- **generateMockVelocity(productId: string)** — `src/lib/stock-chart-utils.ts`
  ```
  const velocities = generateMockVelocities(productId); const first = velocities[0]; if (!first) { throw new Error('generateMockVelocities returned empty array'); } return first;
  ```
- **generateMockVelocities(productId: string)** — `src/lib/stock-chart-utils.ts`
  ```
  const baseSeed = hashCode(productId); const supplierCount = 2 + Math.floor(seededRandom(baseSeed + 300) * 3); // 2-4 suppliers const velocities: MockVelocityData[] = []; for (let i = 0; i < supplierCount; i++) { const seed = baseSeed + 100 + i * 50; // First supplier has highest velocity, others progressively less const velocityFactor = 1 - (i * 0.25); const depletion7d = (8 + seededRandom(seed) * 12) * velocityFactor; const depletion30d = (6 + seededRandom(seed + 1) * 10) * velocityFactor; cons …
  ```
- **generateMockSupplierNames(productId: string)** — `src/lib/stock-chart-utils.ts`
  ```
  const baseSeed = hashCode(productId); const count = 2 + Math.floor(seededRandom(baseSeed + 300) * 3); const map = new Map<string, string>(); for (let i = 0; i < count; i++) { const nameIdx = (Math.floor(seededRandom(baseSeed + 400 + i) * MOCK_SUPPLIER_NAMES.length)) % MOCK_SUPPLIER_NAMES.length; map.set(`mock-supplier-${i}`, MOCK_SUPPLIER_NAMES[nameIdx] ?? MOCK_SUPPLIER_NAMES[0] ?? 'Fornecedor'); } return map;
  ```
- **generateMockIntelligence(productId: string)** — `src/lib/stock-chart-utils.ts`
  ```
  const baseSeed = hashCode(productId); const vels = generateMockVelocities(productId); const vel = vels[0]; // best velocity if (!vel) { throw new Error('generateMockVelocities returned empty array'); } const abcRoll = seededRandom(baseSeed + 200); const abc: 'A' | 'B' | 'C' = abcRoll < 0.2 ? 'A' : abcRoll < 0.5 ? 'B' : 'C'; const totalStock = vels.reduce((sum, v) => sum + v.current_stock, 0); return { _isMock: true as const, product_id: productId, supplier_count: vels.length, total_current_stock …
  ```
- **safePriceChanges(velocityData: unknown)** — `src/lib/stock-chart-utils.ts`
  ```
  if (velocityData === null || velocityData === undefined || typeof velocityData !== 'object') return 0; const record = velocityData as Record<string, unknown>; const val = record.price_changes_30d; if (typeof val === 'number' && Number.isFinite(val)) return val; return 0;
  ```
- **applyGxDarkSurfaces(preset: ThemePreset)** — `src/lib/theme-presets.ts`
  ```
  const d = preset.dark; d.background = '265 22% 8%'; d.card = '265 22% 12%'; d['card-elevated'] = GX_ELEVATED_SURFACE; d.popover = '265 22% 14%'; d.muted = GX_ELEVATED_SURFACE; d.input = GX_ELEVATED_SURFACE; d.border = GX_BORDER; d.secondary = GX_ELEVATED_SURFACE; d.accent = GX_ELEVATED_SURFACE; // Promo Gifts-specific tokens (não existem no Zapp): mantemos a família 265 d.surface = '265 22% 10%'; d['surface-hover'] = GX_ELEVATED_SURFACE; d.divider = GX_BORDER; d['sidebar-background'] = '265 24% …
  ```
- **applyGxNeonGlow(preset: ThemePreset)** — `src/lib/theme-presets.ts`
  ```
  const { light, dark } = preset; light['shadow-glow-primary'] = boostGlowAlpha(light['shadow-glow-primary'], 0.45); light['shadow-glow-secondary'] = boostGlowAlpha(light['shadow-glow-secondary'], 0.4); light['shadow-glow'] = boostGlowAlpha(light['shadow-glow'], 0.45); dark['shadow-glow-primary'] = boostGlowAlpha(dark['shadow-glow-primary'], 0.7); dark['shadow-glow-secondary'] = boostGlowAlpha(dark['shadow-glow-secondary'], 0.65); dark['shadow-glow'] = boostGlowAlpha(dark['shadow-glow'], 0.7); ret …
  ```
- **applyGxGlass(preset: ThemePreset, h: number, s: number, l: number)** — `src/lib/theme-presets.ts`
  ```
  preset.light['glass-bg'] = '0 0% 100% / 0.55'; preset.light['glass-bg-strong'] = '0 0% 100% / 0.7'; preset.light['glass-bg-subtle'] = '0 0% 100% / 0.4'; preset.light['glass-border'] = `${h} ${s}% ${l}% / 0.35`; preset.light['glass-border-strong'] = `${h} ${s}% ${l}% / 0.55`; preset.dark['glass-bg'] = '265 22% 12% / 0.55'; preset.dark['glass-bg-strong'] = '265 22% 10% / 0.75'; preset.dark['glass-bg-subtle'] = '265 22% 14% / 0.4'; preset.dark['glass-border'] = `${h} ${Math.min(100, s + 5)}% ${l}% …
  ```
- **applyThemePreset(presetId: string, mode: 'light' | 'dark')** — `src/lib/theme-presets.ts`
  ```
  const preset = THEME_PRESETS.find((p) => p.id === presetId); if (!preset) return; const root = document.documentElement; // Enable smooth transition for all elements root.classList.add('theme-transitioning'); const colors = preset[mode]; CSS_VARS_TO_APPLY.forEach((key) => { const value = colors[key]; if (value !== undefined) { root.style.setProperty(`--${key}`, value); } }); // Per-preset font override (Opera GX skins → Inter / Cloudflare Sans family). // Restaura para o valor padrão (Plus Jakar …
  ```
- **applyRadius(px: number)** — `src/lib/theme-presets.ts`
  ```
  document.documentElement.style.setProperty('--radius', `${px / 16}rem`);
  ```
- **calculateTrendingScore({ recentCount, baselineCount, recentDays, baselineDays, totalVolume = 0, }: TrendingScoreInput)** — `src/lib/trending-score.ts`
  ```
  // Taxa diária para normalizar janelas de tamanhos diferentes const recentDaily = recentDays > 0 ? recentCount / recentDays : 0; const baselineDaily = baselineDays > 0 ? baselineCount / baselineDays : 0; // Produto novo: nunca apareceu no baseline if (baselineDaily === 0 && recentDaily > 0) { // Score alto, mas amortecido pelo volume mínimo const volumeWeight = Math.min(totalVolume / 5, 1); // 5+ vendas = peso cheio return { score: 2.0 + volumeWeight, growthPercent: Infinity, classification: 'ne …
  ```
- **calculateDelta(current: number, previous: number)** — `src/lib/trending-score.ts`
  ```
  delta: number; direction: 'up' | 'down' | 'neutral'; isSignificant: boolean;
  ```
- **formatCurrency(value: number)** — `src/lib/utils.ts`
  ```
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", });
  ```
- **shouldDrop(key: string)** — `src/lib/access/dev-route-telemetry.ts`
  ```
  const now = Date.now(); const last = recent.get(key); if (last && now - last < COALESCE_MS) return true; recent.set(key, now); // GC simples if (recent.size > 64) { for (const [k, v] of recent) { if (now - v > COALESCE_MS * 4) recent.delete(k); } } return false;
  ```
- **canAccessSicoobPath(pathname: string, roles: readonly string[])** — `src/lib/access/role-policy.ts`
  ```
  const requiredRoles = rolesForSicoobPath(pathname); if (requiredRoles.length === 0) return true; return normalizeAssignedRoles(roles).some((role) => requiredRoles.includes(role));
  ```
- **shouldShortCircuitForSelf(scope: SalesScope, userId: string | null | undefined,)** — `src/lib/auth/apply-seller-scope.ts`
  ```
  return scope === "self" && !userId;
  ```
- **validateLoginCredentials(credentials: LoginCredentials)** — `src/lib/auth/login-validation.ts`
  ```
  const errors: LoginFieldErrors = {}; if (!credentials.email) { errors.email = "Email é obrigatório"; } else if (!EMAIL_PATTERN.test(credentials.email)) { errors.email = "Email inválido"; } if (credentials.password.length < 6) { errors.[REDACTED]; } return errors;
  ```
- **generateBIDossierPDF(data: DossierData)** — `src/lib/bi/dossierPdfGenerator.ts`
  ```
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }); const W = doc.internal.pageSize.getWidth(); const generatedAt = new Date().toLocaleString("pt-BR"); addCover(doc, W, data, generatedAt); // ============ PÁGINA 2 — Visão 360° ============ doc.addPage(); let y = 22; y = addSectionTitle(doc, "Visão 360° do Cliente", y); const bi = data.clientBI; const kpiBoxes: Array<[string, string]> = [ ["LTV Total", formatCurrency(bi.ltv)], ["Ticket médio", formatCurrency(bi.avgTicket …
  ```
- **generateBIPptx({ clientName, ramoAtividade, health, bi, affinity, trends, seasonality, vs, categorySection, }: Args)** — `src/lib/bi/pptxGenerator.ts`
  ```
  const pptx = new PptxGenJS(); pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 pptx.title = `Briefing BI — ${clientName}`; pptx.company = "Brindes Sicoob"; // ====================== SLIDE 1 — CAPA / HERO ====================== const s1 = pptx.addSlide(); s1.background = { color: C.bg }; // Faixa de cor à esquerda s1.addShape("rect", { x: 0, y: 0, w: 0.5, h: 7.5, fill: { color: C.primary } }); s1.addText("BUSINESS ANALYTIC", { x: 0.8, y: 0.4, w: 8, h: 0.4, fontSize: 11, fontFace: "Calibri", color: C.a …
  ```
- **generateErrorReportCSV(errors: BatchImportResult['errors'], failedRows?: Array<{ row: number; sku: string; name: string; errors: string[] }>,)** — `src/lib/external-db/batch-import.ts`
  ```
  const BOM = '\uFEFF'; const lines = ['Linha;SKU;Nome;Erro']; if (failedRows?.length) { for (const r of failedRows) { lines.push(`${r.row};${r.sku || ''};${r.name || ''};${r.errors.join(' | ')}`); } } if (errors.length) { for (const e of errors) { lines.push(`${e.startRow}-${e.endRow};;Chunk;${e.message}`); } } return BOM + lines.join('\n');
  ```
- **invalidateBridgeReadyCache()** — `src/lib/external-db/health-check.ts`
  ```
  lastReadyAt = 0;
  ```
- **invalidateImmutableCache(entity?: Entity)** — `src/lib/external-db/immutableCache.ts`
  ```
  if (entity) STORE[entity].clear(); else { STORE.categories.clear(); STORE.suppliers.clear(); STORE.material_types.clear(); }
  ```
- **mapPriceTable(row: Record<string, unknown>)** — `src/lib/external-db/price-tables.ts`
  ```
  return { id: row.id as string, table_code: row.table_code as string, table_code_option: row.table_code_option as string, customization_type_name: row.customization_type_name as string, technique_code: (row.serv_code || row.table_code) as string | null, min_quantity: numericOr(row.tier_1_min_qty, 1), max_quantity: nullableNumber(row.tier_15_min_qty), min_colors: null, max_colors: nullableNumber(row.max_colors), max_area_width_cm: nullableNumber(row.max_area_width_cm), max_area_height_cm: nullable …
  ```
- **shouldFallbackSelect(err: unknown)** — `src/lib/external-db/product-types.ts`
  ```
  const msg = err instanceof Error ? err.message : String(err); return /(sale_price|base_price|gender|price_updated_at|does not exist|não existe|undefined column|column .+ does not exist|could not identify an ordering operator|order by)/i.test(msg);
  ```
- **applyCachedReferences(product: PromobrindProduct, categoryId: string | null | undefined)** — `src/lib/external-db/products-detail.ts`
  ```
  if (categoryId && !product.category_name) { const cached = getFreshFromCacheSafe('categories', categoryId); if (cached?.name) product.category_name = cached.name; } if (product.supplier_id) { const cached = getFreshFromCacheSafe('suppliers', product.supplier_id); if (cached?.name) product.supplier_name = cached.name; }
  ```
- **applyReferenceRecord(product: PromobrindProduct, slot: DetailEnrichmentSlot, records: Record<string, unknown>[], materialIds: Set<string>,)** — `src/lib/external-db/products-detail.ts`
  ```
  if (slot === 'materials') { for (const record of records) { if (typeof record.material_id === 'string') materialIds.add(record.material_id); } return; } const record = records[0]; if (!record || typeof record.name !== 'string') return; if (slot === 'category') { product.category_name = record.name; if (typeof record.id === 'string') putInCacheSafe('categories', { id: record.id, name: record.name }); return; } product.supplier_name = record.name; if (typeof record.id === 'string') { putInCacheSaf …
  ```
- **applyDetailImages(product: PromobrindProduct, images: ProductImage[])** — `src/lib/external-db/products-detail.ts`
  ```
  if (!images.length) return; const colorImages = images.filter(image => Boolean(image.supplier_code) && image.image_type !== 'box').sort((left, right) => left.display_order - right.display_order); const generalImages = images.filter(image => !image.supplier_code && image.image_type !== 'box').sort((left, right) => left.display_order - right.display_order); const mainImages = [...colorImages, ...generalImages]; const primary = mainImages.find(image => image.is_primary) || mainImages[0]; if (primar …
  ```
- **applyMaterials(product: PromobrindProduct, productId: string, materialIds: string[])** — `src/lib/external-db/products-detail.ts`
  ```
  if (!materialIds.length) return; try { const namesById = await getCachedByIds<{ id: string; name: string }>('material_types', materialIds); const names = materialIds.map(id => namesById.get(id)?.name).filter((name): name is string => Boolean(name)); if (names.length) product.materials = names; } catch (error) { logger.warn(`[product:${productId}] Não foi possível buscar nomes de material_types:`, error); }
  ```
- **applyVariantFallbacks(colors: ColorEntry[], fallbackRows: VariantImageFallback[])** — `src/lib/external-db/products-detail.ts`
  ```
  const byId = new Map(fallbackRows.map(row => [row.id, row])); for (const color of colors) { if (!color._needsFallback || !color._variantId) continue; const row = byId.get(color._variantId); if (!row) continue; const images = row.images || []; const thumbnail = images[0] || row.selected_thumbnail || color.image; if (images.length) color.images = images; if (thumbnail) color.image = thumbnail; }
  ```
- **applyVariantColors(product: PromobrindProduct, productId: string, variants: Variant[], images: ProductImage[],)** — `src/lib/external-db/products-detail.ts`
  ```
  if (!variants.length) return; const { colors, fallbackIds } = buildColorEntries(variants, images, product); applyVariantFallbacks(colors, await fetchVariantFallbacks(productId, fallbackIds)); if (colors.length) product.colors = colors.map(cleanColorEntry);
  ```
- **applyVideos(product: PromobrindProduct, videos: Video[])** — `src/lib/external-db/products-detail.ts`
  ```
  if (!videos.length) return; product.product_videos = videos .filter(video => !video.cloudflare_status || video.cloudflare_status === 'ready') .map(video => ({ id: video.id, url_stream: video.url_stream, url_hls: video.url_hls, url_thumbnail: video.url_thumbnail, url_original: video.url_original, source_youtube_id: video.source_youtube_id, video_type: video.video_type, display_order: video.display_order, is_primary: video.is_primary, title: video.title, }));
  ```
- **estimateTotal(count: number | null | undefined, loaded: number, maxTotal: number)** — `src/lib/external-db/products-lightweight.ts`
  ```
  return typeof count === 'number' && count > loaded ? Math.min(count, maxTotal) : maxTotal;
  ```
- **shouldStopAfterTimeout(result: Extract<PaginatedPageResult, { kind: 'timeout' }>, offset: number, consecutiveErrors: number, productCount: numb)** — `src/lib/external-db/products.ts`
  ```
  if (consecutiveErrors >= 2) { logger.warn(`[external-db] Stopping pagination${result.fallback ? ' (fallback)' : ''} at offset=${offset}. Got ${productCount} products.`); return true; } await waitAfterTimeout(offset, consecutiveErrors, result.fallback); return false;
  ```
- **updatedTotalCount(current: number | null, page: InvokeResult<PromobrindProduct>)** — `src/lib/external-db/products.ts`
  ```
  return typeof page.count === 'number' ? page.count : current;
  ```
- **applyProductImages(product: PromobrindProduct, images: ProductImageInfo[] | undefined)** — `src/lib/external-db/products.ts`
  ```
  if (!images?.length) return; images.sort((left, right) => left.order - right.order); const colorImages = images.filter(image => Boolean(image.supplierCode) && image.type !== 'box'); const generalImages = images.filter(image => !image.supplierCode && image.type !== 'box'); const mainImages = [...colorImages, ...generalImages]; const primary = mainImages.find(image => image.isPrimary) || mainImages[0]; if (primary) { product.primary_image_url = primary.url; product.image_url = primary.url; } const …
  ```
- **applyEnrichments(products: PromobrindProduct[], imagesByProduct: Map<string, ProductImageInfo[]>, colorsByProduct: Map<string, ProductCol)** — `src/lib/external-db/products.ts`
  ```
  for (const product of products) { applyProductImages(product, imagesByProduct.get(product.id)); const colors = colorsByProduct.get(product.id); if (colors?.length) product.colors = colors; if (product.supplier_id && suppliers.has(product.supplier_id)) product.supplier_name = suppliers.get(product.supplier_id); }
  ```
- **calculateBoxPrice(box: KitBox | null, quantity: number = 1)** — `src/lib/kit-builder/price-calculator.ts`
  ```
  if (!box) return 0; return box.price * quantity;
  ```
- **calculateItemsPrice(items: KitItem[])** — `src/lib/kit-builder/price-calculator.ts`
  ```
  return items.reduce((total, item) => { return total + (item.price * item.quantity); }, 0);
  ```
- **calculatePersonalizationPrice(personalization: KitPersonalization, items: KitItem[], quantity: number = 1)** — `src/lib/kit-builder/price-calculator.ts`
  ```
  let total = 0; // Personalização da caixa if (personalization.box.enabled && personalization.box.estimatedPrice) { total += personalization.box.estimatedPrice * quantity; } // Personalização dos itens items.forEach(item => { const itemPersonalization = personalization.items[item.id]; if (itemPersonalization?.enabled && itemPersonalization.estimatedPrice) { total += itemPersonalization.estimatedPrice * item.quantity * quantity; } }); return total;
  ```
- **calculateTotalKitPrice(box: KitBox | null, items: KitItem[], personalization: KitPersonalization, kitQuantity: number = 1)** — `src/lib/kit-builder/price-calculator.ts`
  ```
  boxPrice: number; itemsPrice: number; personalizationPrice: number; subtotal: number; total: number; unitPrice: number;
  ```
- **calculateSavings(kitPrice: number, individualItemsPrice: number)** — `src/lib/kit-builder/price-calculator.ts`
  ```
  amount: number; percent: number;
  ```
- **generatePriceBreakdown(box: KitBox | null, items: KitItem[], personalization: KitPersonalization, kitQuantity: number = 1)** — `src/lib/kit-builder/price-calculator.ts`
  ```
  const breakdown: PriceBreakdownItem[] = []; // Caixa if (box) { breakdown.push({ label: `Caixa: ${box.name}`, quantity: kitQuantity, unitPrice: box.price, totalPrice: box.price * kitQuantity, }); // Personalização da caixa if (personalization.box.enabled && personalization.box.estimatedPrice) { breakdown.push({ label: `↳ Gravação: ${personalization.box.techniqueName || 'Personalização'}`, quantity: kitQuantity, unitPrice: personalization.box.estimatedPrice, totalPrice: personalization.box.estima …
  ```
- **calculateVolume(width: number, height: number, depth: number)** — `src/lib/kit-builder/volume-calculator.ts`
  ```
  return width * height * depth;
  ```
- **calculateUsableVolume(box: KitBox)** — `src/lib/kit-builder/volume-calculator.ts`
  ```
  return box.internalVolume * PACKING_EFFICIENCY;
  ```
- **calculateTotalItemsVolume(items: KitItem[])** — `src/lib/kit-builder/volume-calculator.ts`
  ```
  return items.reduce((total, item) => total + (item.volume * item.quantity), 0);
  ```
- **calculateVolumeUsagePercent(itemsVolume: number, boxVolume: number)** — `src/lib/kit-builder/volume-calculator.ts`
  ```
  if (boxVolume === 0) return 0; const usableVolume = boxVolume * PACKING_EFFICIENCY; return (itemsVolume / usableVolume) * 100;
  ```
- **canNavigateTo(pathname: string, opts: { isDev: boolean; isAdmin: boolean })** — `src/lib/navigation/restricted-routes.ts`
  ```
  if (isDevOnlyPath(pathname)) return opts.isDev; if (isAdminOnlyPath(pathname)) return opts.isAdmin || opts.isDev; return true;
  ```
- **calculateApprovalSla(monthlyResult: OrderListResult, count: number | null, decisions: ReadonlyMap<string, ApprovalDecision> | undefined,)** — `src/lib/orders/purchasing-sla.ts`
  ```
  if (!hasCompleteResult(monthlyResult, count) || !decisions) return null; const aprovados = monthlyResult.data.filter((order) => APPROVED_STATUSES.has(order.status)); if (aprovados.length === 0) return null; const pares = aprovados.map((order) => decisions.get(order.id)); // Faltou carimbo de algum aprovado: a amostra não é o universo, não estimamos. if (pares.some((par) => !par)) return null; const dentroDoSla = pares.filter( (par) => par && par.decidedAtMs - par.submittedAtMs <= DIA_EM_MS, ).le …
  ```
- **calculatePurchasingMetrics(pendingResult: OrderListResult, monthlyResult: OrderListResult, decisions?: ReadonlyMap<string, ApprovalDecision>,)** — `src/lib/orders/purchasing-sla.ts`
  ```
  const pendingCount = resultCount(pendingResult); const monthlyCount = resultCount(monthlyResult); return { pendingCount, slaPercent: calculateApprovalSla(monthlyResult, monthlyCount, decisions), monthlyTotal: sumCompleteOrders( monthlyResult, monthlyCount, (order) => order.status !== 'cancelled', ), approvedTotal: sumCompleteOrders(monthlyResult, monthlyCount, (order) => APPROVED_STATUSES.has(order.status), ), };
  ```
- **calculatePrice(table: PriceTableInput, params: PriceCalculationParams)** — `src/lib/personalization/calculators.ts`
  ```
  const { quantity, colors, widthCm, heightCm } = params; // 1. Encontrar a faixa de preço correta const tier = findPriceTier(table.tiers, quantity); if (!tier) { throw new Error(`Nenhuma faixa de preço encontrada para quantidade ${quantity}`); } // 2. Calcular preço unitário base let unitPrice = tier.unitPrice; // 3. Ajustar por número de cores (se aplicável) if (table.priceByColor && colors && table.maxColors) { unitPrice = adjustPriceByColors(unitPrice, colors, table.maxColors); } // 4. Ajustar …
  ```
- **findPriceTier(tiers: PriceTier[], quantity: number)** — `src/lib/personalization/calculators.ts`
  ```
  if (tiers.length === 0) return null; // Ordenar por quantidade mínima const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity); const firstTier = sortedTiers[0]; if (!firstTier) return null; // Encontrar a maior faixa que a quantidade atinge let selectedTier = firstTier; for (const tier of sortedTiers) { if (quantity >= tier.minQuantity) { selectedTier = tier; } else { break; } } return selectedTier;
  ```
- **adjustPriceByColors(basePrice: number, requestedColors: number, tableMaxColors: number)** — `src/lib/personalization/calculators.ts`
  ```
  if (requestedColors <= tableMaxColors) { return basePrice; } // Preço proporcional para cores extras const colorFactor = requestedColors / tableMaxColors; return basePrice * colorFactor;
  ```
- **adjustPriceByArea(basePrice: number, requestedWidth: number, requestedHeight: number, ...limits: [maxWidth: number | null, maxHeight: numb)** — `src/lib/personalization/calculators.ts`
  ```
  const [maxWidth, maxHeight] = limits; if (!maxWidth || !maxHeight) return basePrice; const requestedArea = requestedWidth * requestedHeight; const maxArea = maxWidth * maxHeight; if (requestedArea <= maxArea) { return basePrice; } // Preço proporcional para área extra const areaFactor = requestedArea / maxArea; return basePrice * areaFactor;
  ```
- **calculateTierSavings(tiers: PriceTier[], currentTier: PriceTier, currentUnitPrice: number, quantity: number)** — `src/lib/personalization/calculators.ts`
  ```
  if (tiers.length === 0) return undefined; const firstTier = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity)[0]; if (!firstTier) return undefined; const firstTierPrice = firstTier.unitPrice; const savingsPerUnit = firstTierPrice - currentUnitPrice; if (savingsPerUnit <= 0) return undefined; const totalSavings = savingsPerUnit * quantity; const percentOff = (savingsPerUnit / firstTierPrice) * 100; return { perUnit: savingsPerUnit, total: totalSavings, percentOff: Math.round(percentOff), } …
  ```
- **calculateSavings(originalUnitPrice: number, discountedUnitPrice: number, quantity: number)** — `src/lib/personalization/calculators.ts`
  ```
  perUnit: number; total: number; percentOff: number
  ```
- **calculateMultiTechniquePrice(calculations: PriceCalculationResult[])** — `src/lib/personalization/calculators.ts`
  ```
  subtotal: number; totalSetup: number; totalHandling: number; grandTotal: number; totalSavings: number;
  ```
- **reportValidation(contract: RpcContract, payload: unknown, missing: string[], ...validation: [extras: string[], resolvedAliases: Record<st)** — `src/lib/personalization/rpc-validator.ts`
  ```
  const [extras, resolvedAliases] = validation; if (missing.length > 0) { recordContractMismatch(contract.name, missing, extras); if (import.meta.env.DEV) { warnOnce( `${contract.name}:${missing.join(',')}`, `Payload de ${contract.name} faltando campos: ${missing.join(', ')}`, payload, ); } return; } if (Object.keys(resolvedAliases).length > 0 && import.meta.env.DEV) { warnOnce( `${contract.name}:aliases:${Object.keys(resolvedAliases).join(',')}`, `Payload de ${contract.name} usando aliases: ${JSO …
  ```
- **validateRpcPayload(contract: RpcContract, payload: unknown,)** — `src/lib/personalization/rpc-validator.ts`
  ```
  const { missing, resolvedAliases } = resolveRequiredFields(contract, payload); // Extras: chaves top-level desconhecidas const known = knownTopLevel(contract); const extras = topLevelKeys(payload).filter((k) => !known.has(k)); const ok = missing.length === 0; reportValidation(contract, payload, missing, extras, resolvedAliases); return { contract: contract.name, ok, missing, extras, resolvedAliases };
  ```
- **calculateTableScore(table: PriceTableInput, criteria: TableSelectionCriteria)** — `src/lib/personalization/selectors.ts`
  ```
  return activeScore(table) + textMatchScore(table.techniqueName, criteria.techniqueName) + textMatchScore(table.tableCode, criteria.techniqueCode) + colorScore(table, criteria.colors) + dimensionScore(table, criteria);
  ```
- **activeScore(table: PriceTableInput)** — `src/lib/personalization/selectors.ts`
  ```
  return table.isActive ? 100 : 0;
  ```
- **colorScore(table: PriceTableInput, colors?: number)** — `src/lib/personalization/selectors.ts`
  ```
  if (!colors || table.maxColors === null) return 0; return table.maxColors >= colors ? 30 - Math.min(table.maxColors - colors, 30) : -20;
  ```
- **dimensionScore(table: PriceTableInput, criteria: TableSelectionCriteria)** — `src/lib/personalization/selectors.ts`
  ```
  if (!criteria.widthCm || !criteria.heightCm) return 0; const fitsWidth = table.maxWidthCm === null || table.maxWidthCm >= criteria.widthCm; const fitsHeight = table.maxHeightCm === null || table.maxHeightCm >= criteria.heightCm; return fitsWidth && fitsHeight ? 20 : -10;
  ```
- **rankTablesByCriteria(tables: PriceTableInput[], criteria: TableSelectionCriteria)** — `src/lib/personalization/selectors.ts`
  ```
  return [...tables].sort((a, b) => { const scoreA = calculateTableScore(a, criteria); const scoreB = calculateTableScore(b, criteria); return scoreB - scoreA; });
  ```
- **formatPrice(value: number, currency = 'BRL')** — `src/lib/personalization/transformers.ts`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, }).format(value);
  ```
- **validationResult(collector: ValidationCollector)** — `src/lib/personalization/validators.ts`
  ```
  return { isValid: collector.errors.length === 0, ...collector };
  ```
- **validateTableQuantity(table: PriceTableInput, quantity: number, collector: ValidationCollector)** — `src/lib/personalization/validators.ts`
  ```
  if (quantity <= 0) { collector.errors.push({ code: 'INVALID_QUANTITY', field: 'quantity', message: 'Quantidade deve ser maior que zero' }); } const minQuantity = table.tiers.length > 0 ? Math.min(...table.tiers.map(tier => tier.minQuantity)) : 1; if (quantity < minQuantity) { collector.errors.push({ code: 'BELOW_MIN_QUANTITY', field: 'quantity', message: `Quantidade mínima é ${minQuantity} unidades` }); }
  ```
- **validateTableColors(table: PriceTableInput, colors: number | undefined, collector: ValidationCollector)** — `src/lib/personalization/validators.ts`
  ```
  if (!table.priceByColor || colors === undefined) return; if (colors <= 0) { collector.errors.push({ code: 'INVALID_COLORS', field: 'colors', message: 'Número de cores deve ser maior que zero' }); } if (table.maxColors && colors > table.maxColors) { collector.warnings.push({ code: 'EXCEEDS_MAX_COLORS', field: 'colors', message: `Número de cores (${colors}) excede máximo da tabela (${table.maxColors}). Preço será ajustado proporcionalmente.` }); }
  ```
- **validateTableDimensionValues(table: PriceTableInput, params: PriceCalculationParams, collector: ValidationCollector)** — `src/lib/personalization/validators.ts`
  ```
  validateWidth(table, params.widthCm, collector); validateHeight(table, params.heightCm, collector);
  ```
- **validateWidth(table: PriceTableInput, widthCm: number | undefined, collector: ValidationCollector)** — `src/lib/personalization/validators.ts`
  ```
  if (widthCm !== undefined && widthCm <= 0) { collector.errors.push({ code: 'INVALID_WIDTH', field: 'widthCm', message: 'Largura deve ser maior que zero' }); } if (widthCm && table.maxWidthCm && widthCm > table.maxWidthCm) { collector.warnings.push({ code: 'EXCEEDS_MAX_WIDTH', field: 'widthCm', message: `Largura (${widthCm}cm) excede máximo (${table.maxWidthCm}cm)` }); }
  ```
- **validateHeight(table: PriceTableInput, heightCm: number | undefined, collector: ValidationCollector)** — `src/lib/personalization/validators.ts`
  ```
  if (heightCm !== undefined && heightCm <= 0) { collector.errors.push({ code: 'INVALID_HEIGHT', field: 'heightCm', message: 'Altura deve ser maior que zero' }); } if (heightCm && table.maxHeightCm && heightCm > table.maxHeightCm) { collector.warnings.push({ code: 'EXCEEDS_MAX_HEIGHT', field: 'heightCm', message: `Altura (${heightCm}cm) excede máximo (${table.maxHeightCm}cm)` }); }
  ```
- **validateAreaBounds(areaCm2: number, bounds: { minAreaCm2?: number | null; maxAreaCm2?: number | null }, collector: ValidationCollector,)** — `src/lib/personalization/validators.ts`
  ```
  if (bounds.minAreaCm2 && areaCm2 < bounds.minAreaCm2) { collector.errors.push({ code: 'BELOW_MIN_AREA', field: 'area', message: `Área (${areaCm2}cm²) abaixo do mínimo (${bounds.minAreaCm2}cm²)` }); } if (bounds.maxAreaCm2 && areaCm2 > bounds.maxAreaCm2) { collector.warnings.push({ code: 'EXCEEDS_MAX_AREA', field: 'area', message: `Área (${areaCm2}cm²) excede máximo (${bounds.maxAreaCm2}cm²). Preço será ajustado.` }); }
  ```
- **validateTableDimensions(table: PriceTableInput, params: PriceCalculationParams, collector: ValidationCollector)** — `src/lib/personalization/validators.ts`
  ```
  if (!table.priceByArea) return; validateTableDimensionValues(table, params, collector); if (params.widthCm && params.heightCm) validateAreaBounds(params.widthCm * params.heightCm, table, collector);
  ```
- **validateTableForParams(table: PriceTableInput, params: PriceCalculationParams)** — `src/lib/personalization/validators.ts`
  ```
  const collector: ValidationCollector = { errors: [], warnings: [] }; validateTableQuantity(table, params.quantity, collector); validateTableColors(table, params.colors, collector); validateTableDimensions(table, params, collector); return validationResult(collector);
  ```
- **validateTechniqueStatus(technique: TechniqueInput, collector: ValidationCollector)** — `src/lib/personalization/validators.ts`
  ```
  if (!technique.isActive) collector.errors.push({ code: 'TECHNIQUE_INACTIVE', field: 'technique', message: 'Técnica não está ativa' });
  ```
- **validateTechniqueColors(technique: TechniqueInput, colors: number | undefined, collector: ValidationCollector)** — `src/lib/personalization/validators.ts`
  ```
  if (!technique.requiresColors) return; if (colors === undefined || colors === null) { collector.errors.push({ code: 'COLORS_REQUIRED', field: 'colors', message: 'Esta técnica requer especificação de cores' }); return; } if (colors < technique.minColors) { collector.errors.push({ code: 'BELOW_MIN_COLORS', field: 'colors', message: `Mínimo de ${technique.minColors} cor(es) requerido` }); } if (colors > technique.maxColors) { collector.warnings.push({ code: 'EXCEEDS_MAX_COLORS', field: 'colors', me …
  ```
- **validateTechniqueArea(technique: TechniqueInput, params: PriceCalculationParams, collector: ValidationCollector)** — `src/lib/personalization/validators.ts`
  ```
  if (!technique.priceByArea || !params.widthCm || !params.heightCm) return; const areaCm2 = params.widthCm * params.heightCm; if (technique.minAreaCm2 && areaCm2 < technique.minAreaCm2) { collector.errors.push({ code: 'BELOW_MIN_AREA', field: 'area', message: `Área mínima é ${technique.minAreaCm2}cm²` }); } if (technique.maxAreaCm2 && areaCm2 > technique.maxAreaCm2) { collector.warnings.push({ code: 'EXCEEDS_MAX_AREA', field: 'area', message: `Área (${areaCm2}cm²) excede máximo (${technique.maxAr …
  ```
- **validateTechniqueForParams(technique: TechniqueInput, params: PriceCalculationParams)** — `src/lib/personalization/validators.ts`
  ```
  const collector: ValidationCollector = { errors: [], warnings: [] }; validateTechniqueStatus(technique, collector); validateTechniqueColors(technique, params.colors, collector); validateTechniqueArea(technique, params, collector); return validationResult(collector);
  ```
- **validateQuantityRange(quantity: number, minQuantity: number, maxQuantity?: number | null)** — `src/lib/personalization/validators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; if (quantity <= 0) { errors.push({ code: 'INVALID_QUANTITY', field: 'quantity', message: 'Quantidade deve ser maior que zero', }); } if (quantity < minQuantity) { errors.push({ code: 'BELOW_MIN_QUANTITY', field: 'quantity', message: `Quantidade mínima é ${minQuantity}`, }); } if (maxQuantity && quantity > maxQuantity) { warnings.push({ code: 'EXCEEDS_MAX_QUANTITY', field: 'quantity', message: `Quantidade (${quantity} …
  ```
- **validateQuantity(quantity: number)** — `src/lib/personalization/validators.ts`
  ```
  return validateQuantityRange(quantity, 1);
  ```
- **validateColors(colors: number, maxColors?: number)** — `src/lib/personalization/validators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; if (colors <= 0) { errors.push({ code: 'INVALID_COLORS', field: 'colors', message: 'Número de cores deve ser maior que zero', }); } if (maxColors && colors > maxColors) { warnings.push({ code: 'EXCEEDS_MAX_COLORS', field: 'colors', message: `Número de cores (${colors}) excede máximo (${maxColors})`, }); } return { isValid: errors.length === 0, errors, warnings, };
  ```
- **validateArea(widthCm: number, heightCm: number, maxWidthCm?: number, maxHeightCm?: number)** — `src/lib/personalization/validators.ts`
  ```
  const errors: ValidationError[] = []; const warnings: ValidationWarning[] = []; if (widthCm <= 0) { errors.push({ code: 'INVALID_WIDTH', field: 'widthCm', message: 'Largura deve ser maior que zero', }); } if (heightCm <= 0) { errors.push({ code: 'INVALID_HEIGHT', field: 'heightCm', message: 'Altura deve ser maior que zero', }); } if (maxWidthCm && widthCm > maxWidthCm) { warnings.push({ code: 'EXCEEDS_MAX_WIDTH', field: 'widthCm', message: `Largura (${widthCm}cm) excede máximo (${maxWidthCm}cm)` …
  ```
- **calculateHandlingCost(baseHandling: number, positions: number, isFragile: boolean)** — `src/lib/personalization/validators.ts`
  ```
  let cost = baseHandling; // Múltiplas posições aumenta manuseio if (positions > 1) { cost *= 1 + (positions - 1) * 0.25; // +25% por posição adicional } // Produtos frágeis dobram manuseio if (isFragile) { cost *= 2; } return Math.round(cost * 100) / 100;
  ```
- **adaptPriceResponseWithMeta(resp: Record<string, unknown> | null | undefined,)** — `src/lib/personalization/adapters/price-response.adapter.ts`
  ```
  if (!resp) { return { flat: parseFlat({}), schemaVersion: 'unknown' }; } // Validação observacional do payload bruto (apenas formatos não-nested) if (!('area' in resp)) { validateRpcPayload(PRICE_CONTRACT, resp); } const version = detectPriceSchema(resp); switch (version) { case 'v5.9-nested': return { flat: parseNested(resp as NestedPriceResponse), schemaVersion: version }; case 'v6.x-flat': return { flat: parseFlat(resp as FlatPriceResponse), schemaVersion: version }; case 'v7-new': return { f …
  ```
- **adaptPriceResponse(resp: Record<string, unknown> | null | undefined,)** — `src/lib/personalization/adapters/price-response.adapter.ts`
  ```
  return adaptPriceResponseWithMeta(resp).flat;
  ```
- **detectPriceSchema(resp: Record<string, unknown> | null | undefined)** — `src/lib/personalization/adapters/schema-detection.ts`
  ```
  if (!resp || !isObject(resp)) { bumpStat('unknown'); return 'unknown'; } const detected = SCHEMA_DETECTORS.find(detector => detector.matches(resp))?.version; if (detected) { bumpStat(detected); return detected; } bumpStat('unknown'); return 'unknown';
  ```
- **calculatePricing(request: PricingRequest)** — `src/lib/personalization/services/pricing.service.ts`
  ```
  const { techniqueName, quantity, colors, widthCm, heightCm } = request; // Validações const validation = validateRequest(quantity, colors, widthCm, heightCm); if (!validation.isValid) { return { success: false, validation, error: validation.errors[0]?.message }; } // Buscar tabela adequada const table = await PriceTableRepository.findBestMatch({ techniqueName, colors, widthCm, heightCm, }); if (!table) { return { success: false, validation, error: `Nenhuma tabela encontrada para técnica: ${techn …
  ```
- **calculateBatchPricing(request: BatchPricingRequest)** — `src/lib/personalization/services/pricing.service.ts`
  ```
  const { techniqueName, quantities, colors } = request; const table = await PriceTableRepository.findBestMatch({ techniqueName, colors, }); const calculations = quantities.map(quantity => { if (!table) { return { quantity, result: null }; } const result = calculatePriceFromTable(table, { quantity, colors }); return { quantity, result }; }); return { techniqueName, table, calculations, };
  ```
- **calculateQuantitySavings(params: { techniqueName: string; currentQuantity: number; targetQuantity: number; colors?: number; })** — `src/lib/personalization/services/pricing.service.ts`
  ```
  currentPrice: PriceCalculationResult; targetPrice: PriceCalculationResult; savings: { perUnit: number; total: number; percentOff: number; };
  ```
- **validateRequest(quantity: number, colors?: number, widthCm?: number, heightCm?: number)** — `src/lib/personalization/services/pricing.service.ts`
  ```
  const errors: ValidationResult['errors'] = []; const warnings: ValidationResult['warnings'] = []; // Validar quantidade const qtyValidation = validateQuantity(quantity); errors.push(...qtyValidation.errors); warnings.push(...qtyValidation.warnings); // Validar cores if (colors !== undefined) { const colorValidation = validateColors(colors); errors.push(...colorValidation.errors); warnings.push(...colorValidation.warnings); } // Validar área if (widthCm !== undefined && heightCm !== undefined) { …
  ```
- **priceAdjustedForColors(basePrice: number, table: TabelaPrecoTecnica, colors: number | undefined,)** — `src/lib/personalization/services/pricing.service.ts`
  ```
  if (!table.precoPorCor || !colors || !table.maxCores || colors <= table.maxCores) { return basePrice; } return basePrice * (colors / table.maxCores);
  ```
- **calculatePriceFromTable(table: TabelaPrecoTecnica, params: PriceCalculationParams)** — `src/lib/personalization/services/pricing.service.ts`
  ```
  const { quantity, colors } = params; const firstTier = table.faixas[0]; if (!firstTier) { throw new Error(`Tabela de preço "${table.codigoTabelaOpcao}" não possui faixas de quantidade configuradas`); } // Encontrar faixa adequada let tierUsed = firstTier; for (const faixa of table.faixas) { if (quantity >= faixa.quantidadeMinima) { tierUsed = faixa; } else { break; } } const unitPrice = priceAdjustedForColors(tierUsed.precoUnitario, table, colors); const subtotal = unitPrice * quantity; const gr …
  ```
- **basicValidationError(file: File, options: Required<ValidationOptions>)** — `src/lib/security/file-validation.ts`
  ```
  if (file.size > options.maxSizeMb * 1024 * 1024) return `Arquivo excede o limite de ${options.maxSizeMb}MB.`; const extension = `.${file.name.split(".").pop()?.toLowerCase()}`; if (!options.allowedExtensions.includes(extension)) return "Extensão de arquivo não permitida."; if (!options.allowedMimeTypes.includes(file.type)) return "Tipo de arquivo inválido."; return null;
  ```
- **hasValidSignature(file: File)** — `src/lib/security/file-validation.ts`
  ```
  const expected = MAGIC_NUMBERS[file.type]; if (!expected) return true; const signature = await getFileSignature(file); const valid = expected.some(candidate => signature.startsWith(candidate)); if (!valid) logger.error("File signature mismatch detected", { filename: file.name, reportedType: file.type, signature }); return valid;
  ```
- **validateFile(file: File, options: ValidationOptions = {})** — `src/lib/security/file-validation.ts`
  ```
  const { maxSizeMb = 5, allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"], allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"], } = options; const basicError = basicValidationError(file, { maxSizeMb, allowedExtensions, allowedMimeTypes }); if (basicError) return { valid: false, error: basicError }; // 4. Verificação de Integridade (Magic Numbers) // Lê os primeiros 4 bytes do arquivo para confirmar o tipo real try { if (!(await hasValidSignature(file))) { …
  ```
- **validateDeliveryReceiptInput(input: DeliveryReceiptInput)** — `src/lib/sicoob/consolidation-intent.ts`
  ```
  const quantities = [input.received, input.damaged, input.missing]; if (!quantities.every((quantity) => Number.isInteger(quantity) && quantity >= 0)) { return 'Use quantidades inteiras e não negativas.'; } const accounted = input.received + input.damaged + input.missing; if (accounted === 0) return 'Informe ao menos uma quantidade positiva.'; if (accounted > input.remaining) return 'O lançamento supera o saldo pendente deste item.'; if (input.damaged + input.missing > 0 && input.notes.trim().leng …
  ```
- **validateInvitationForm(input: InvitationFormInput)** — `src/lib/sicoob/invitationForm.ts`
  ```
  const errors: InvitationFormErrors = {}; if (!EMAIL_PATTERN.test(input.email.trim())) errors.email = "Informe um email institucional válido."; if (!input.cooperativeId) errors.cooperative = "Selecione a cooperativa."; if (!input.role) errors.role = "Selecione o papel."; if (input.requiresPa && !input.paId) errors.pa = "Selecione o posto de atendimento."; const hours = Number(input.expiresInHours); if (!Number.isInteger(hours) || hours < 1 || hours > 168) { errors.expiry = "Informe uma validade i …
  ```
- **canManageSicoobOrderFulfillment(order: SicoobOrderScope | null | undefined, actor: SicoobOrderActor | null | undefined, roles: readonly string[],)** — `src/lib/sicoob/order-permissions.ts`
  ```
  if (!order) return false; const canOperateByRole = [ hasAnyRole(roles, ['dev', 'supervisor']), hasAnyRole(roles, ['gestor_compras', 'comprador_singular']) && sameDefinedId(actor?.cooperativa_id, order.cooperative_id), hasAnyRole(roles, ['gerente_pa', 'comprador_pac']) && sameDefinedId(actor?.pa_id, order.pa_id), sameDefinedId(order.created_by, actor?.user_id), sameDefinedId(order.created_by, actor?.id), ]; return canOperateByRole.some(Boolean);
  ```
- **shouldProjectOrder(status: OrderStatus | null | undefined)** — `src/lib/sicoob/orderBudgetProjection.ts`
  ```
  return status === null || status === undefined || ORDER_STATUSES_PROJECTING_BUDGET.has(status);
  ```
- **calculateImpact(allocatedBudget: number | null, orderTotal: number, hasNoBudgetImpact: boolean,)** — `src/lib/sicoob/orderBudgetProjection.ts`
  ```
  if (hasNoBudgetImpact || allocatedBudget === null || allocatedBudget <= 0) return null; return (orderTotal / allocatedBudget) * 100;
  ```
- **validarCentros(rows: AllocationRowInput[])** — `src/lib/sicoob/orderCostCenterAllocation.ts`
  ```
  const selecionados = rows.map((row) => row.cost_center_id).filter(Boolean); if (selecionados.length !== rows.length) { throw new Error('Selecione o centro de custo de cada linha do rateio.'); } if (new Set(selecionados).size !== selecionados.length) { throw new Error('Cada centro de custo pode aparecer uma unica vez no rateio.'); }
  ```
- **shouldShowDevInfraMessages(isDev: boolean)** — `src/lib/system/dev-infra-messages.ts`
  ```
  return devInfraGate.shouldShow(isDev ? ["dev"] : []);
  ```
- **shouldShow(userRoles: AppRole[])** — `src/lib/system/dev-gate/DevInfraGate.ts`
  ```
  if (!this.hasAccess(userRoles)) return false; const cacheKey = this.generateCacheKey(userRoles); const cachedResult = this.cache.get(cacheKey); if (cachedResult !== undefined) return cachedResult; const finalResult = this.evaluateProviders(); // Cache limitado para evitar crescimento infinito do Map se roles variarem muito (leak prevention) if (this.cache.size > 100) this.cache.clear(); this.cache.set(cacheKey, finalResult); return finalResult;
  ```
- **generateCacheKey(roles: AppRole[])** — `src/lib/system/dev-gate/DevInfraGate.ts`
  ```
  const len = roles.length; if (len === 0) return ''; if (len === 1) return roles[0] ?? ''; // Otimização: Evitar sort se o array já estiver ordenado (caso comum em orquestração de roles) // Se precisarmos ordenar, fazemos uma cópia para não mutar o input let isSorted = true; for (let i = 0; i < len - 1; i++) { const current = roles[i]; const next = roles[i + 1]; if (current !== undefined && next !== undefined && current > next) { isSorted = false; break; } } return isSorted ? roles.join(',') : [. …
  ```
- **validateQuoteForm(data: { clientId: string; contactId: string; paymentTerms: string; deliveryTime: string; shippingType: string; shippingC)** — `src/lib/validations/quoteSchema.ts`
  ```
  const errors: string[] = []; const result = quoteFormSchema.safeParse({ clientId: data.clientId, contactId: data.contactId, paymentTerms: data.paymentTerms, deliveryTime: data.deliveryTime, shippingType: data.shippingType, shippingCost: data.shippingCost, }); if (!result.success) { for (const issue of result.error.issues) { const field = issue.path[0] as string; const fieldMap: Record<string, string> = { clientId: "empresa", contactId: "contato", paymentTerms: "prazo_pagamento", deliveryTime: "p …
  ```
- **PriceInput({ label, value, onChange, }: { label: string; value: number; onChange: (value: number)** — `src/pages/AdvancedPriceSearchPage.tsx`
  ```
  void;
  ```
- **PriceRangeFilter({ state }: { state: SearchState })** — `src/pages/AdvancedPriceSearchPage.tsx`
  ```
  const { filters, updateFilter } = state; return ( <FilterSection title="Faixa de Preço Unitário" icon={TrendingDown}> <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8"> <div className="flex gap-2"> <PriceInput label="Mínimo" value={filters.priceRange[0]} onChange={(value) => updateFilter('priceRange', [value || 0, filters.priceRange[1]])} /> <PriceInput label="Máximo" value={filters.priceRange[1]} onChang …
  ```
- **valoresDosKpis(kpisQuery: KpisQuery)** — `src/pages/ClientsPage.tsx`
  ```
  const dados = kpisQuery.data; return { compraramNoMes: dados ? String(dados.clientesComPedidoNoMes) : "—", primeiraCompra: dados ? String(dados.primeiraCompraNoMes) : "—", ticket: formatarTicket(dados?.ticketMedio ?? null), retencao: formatarRetencao(dados?.retencaoPercentual ?? null), janelaDias: dados?.janelaDias ?? 90, };
  ```
- **formatCurrency(value: number)** — `src/pages/ComparePage.tsx`
  ```
  
  ```
- **hasPriceDrop(product: Product, metaMap: Map<string, FavoritePriceMeta>)** — `src/pages/FavoritesPage.tsx`
  ```
  const difference = metaMap.get(product.id)?.priceDiffPct; return typeof difference === 'number' && difference < -2;
  ```
- **PriceDropIndicator({ product, meta }: { product: Product; meta: FavoritePriceMeta | undefined })** — `src/pages/FavoritesPage.tsx`
  ```
  if (!isRemoteListView || !meta || selectionMode) return null; return <div className="absolute bottom-3 left-3 z-10 pointer-events-auto"><PriceDropBadge priceDiffPct={meta.priceDiffPct} priceAtSave={meta.priceAtSave} currentPrice={product.price} savedAt={meta.savedAt} /></div>;
  ```
- **applyVoiceFilter(action: VoiceAgentAction, state: FiltersState)** — `src/pages/FiltersPage.tsx`
  ```
  const filters = action.data?.filters; if (filters) state.setFilters((previous) => filtersFromVoice(previous, filters));
  ```
- **applyVoiceSearch(action: VoiceAgentAction, state: FiltersState)** — `src/pages/FiltersPage.tsx`
  ```
  const query = action.data?.query; if (query) state.setFilters((previous) => ({ ...previous, search: query }));
  ```
- **applyVoiceSort(action: VoiceAgentAction, state: FiltersState)** — `src/pages/FiltersPage.tsx`
  ```
  const sortBy = action.data?.sortBy; if (!sortBy) return; const sortMap: Record<string, string> = { 'price-asc': 'price-asc', 'price-desc': 'price-desc', name: 'name', stock: 'stock', newest: 'newest', popularity: 'popularity' }; state.setSortBy(sortMap[sortBy] || 'name');
  ```
- **applyVoiceNavigate(action: VoiceAgentAction, navigate: Navigate)** — `src/pages/FiltersPage.tsx`
  ```
  const route = action.data?.route; if (route) navigate(route);
  ```
- **applyVoiceAction(action: VoiceAgentAction, state: FiltersState, navigate: Navigate, openOracle: (message?: string)** — `src/pages/FiltersPage.tsx`
  ```
  void): void {
  ```
- **applyAISuggestion(suggestion: { kit_type: 'montado' | 'original' | 'simples'; box_keywords: string[] })** — `src/pages/KitBuilderPage.tsx`
  ```
  setKitType(suggestion.kit_type); setBoxFilters({ ...boxFilters, search: suggestion.box_keywords[0] ?? '' }); goToStep('box');
  ```
- **PriceBreakdown()** — `src/pages/KitBuilderPage.tsx`
  ```
  return <AccordionItem value="breakdown" className="border-b-0"><AccordionTrigger className="px-4 py-3 hover:no-underline"> <span className="font-display font-semibold text-sm">Composição de preço</span></AccordionTrigger> <AccordionContent className="px-4 pb-4"><div className="space-y-2 text-sm"> <div className="flex justify-between"><span className="text-muted-foreground">Caixa</span><span className="tabular-nums">{formatCurrency(kitState.boxPrice)}</span></div> <div className="flex justify-bet …
  ```
- **applyFilters(values: OrderFilterValues)** — `src/pages/OrdersPage.tsx`
  ```
  setFilters({ ...values, page: 1 });
  ```
- **PriceSimulatorPage()** — `src/pages/PriceSimulatorPage.tsx`
  ```
  return ( <> <PageSEO title="Simulador de Preços" description="Simule preços de brindes com personalização, quantidades e custos." path="/simulador-precos" /> <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in"> {/* Hero Header — #1 */} <div className="flex flex-col gap-1"> <h1 data-testid="page-title-simulador-precos" className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground"> Si …
  ```
- **ConvertedQuoteNotice({ visible }: { visible: boolean })** — `src/pages/QuoteDetailPage.tsx`
  ```
  if (!visible) return null; return ( <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3"> <Lock className="mt-0.5 h-5 w-5 shrink-0 text-success" /> <div className="min-w-0"> <p className="text-sm font-semibold text-success">Orçamento convertido em pedido</p> <p className="mt-0.5 text-xs text-muted-foreground"> Este orçamento está em modo somente leitura. Para alterações, edite o pedido vinculado. </p> </div> </div> );
  ```
- **revalidate()** — `src/pages/QuoteViewPage.tsx`
  ```
  state.setQuote(await state.fetchQuote(quoteId));
  ```
- **DiscountApprovalBanner({ quote, approval }: { quote: Quote; approval: DiscountApprovalRequest | null })** — `src/pages/QuoteViewPage.tsx`
  ```
  if (quote.status !== "pending_approval") return null; const description = approval ? `Desconto de ${approval.requested_discount_percent}% solicitado (limite: ${approval.max_allowed_percent}%). Aguardando decisão do administrador.` : "Este orçamento está aguardando a aprovação do administrador para o desconto aplicado."; return <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.06] px-4 py-3 flex items-center gap-3 print:hidden"><div className="p-2 rounded-lg bg-amber-500/15 sh …
  ```
- **quoteTotal(quote: Quote)** — `src/pages/QuotesListPage.tsx`
  ```
  return quote.total ?? 0;
  ```
- **formatCurrency(value: number)** — `src/pages/QuotesListPage.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **calculateKpis(quotes: Quote[])** — `src/pages/QuotesListPage.tsx`
  ```
  const approvedQuotes = quotes.filter( (quote) => quote.status === 'approved' || quote.status === 'approved_singular', ); const total = quotes.length; const approved = approvedQuotes.length; return { total, approved, pending: quotes.filter((quote) => ['pending', 'sent', 'pending_singular_approval'].includes(quote.status), ).length, pendingSingular: quotes.filter((quote) => quote.status === 'pending_singular_approval').length, totalValue: quotes.reduce((sum, quote) => sum + quoteTotal(quote), 0), …
  ```
- **formatCurrency(val: number)** — `src/pages/admin/AdminAiUsagePage.tsx`
  ```
  `$${val.toFixed(4)}`;
  ```
- **PriceFreshnessSettings()** — `src/pages/admin/PriceFreshnessSettings.tsx`
  ```
  const { data: overrides, isLoading } = useAllFreshnessOverrides(); const remove = useDeleteFreshnessOverride(); const [filter, setFilter] = useState<"all" | "30" | "60" | "90">("all"); const filtered = useMemo(() => { if (!overrides) return []; if (filter === "all") return overrides; return overrides.filter((o) => String(o.threshold_days) === filter); }, [overrides, filter]); const counts = useMemo(() => { const base: Record<string, number> = { 30: 0, 60: 0, 90: 0 }; overrides?.forEach((o) => { …
  ```
- **RankingCards({ stats }: { stats: DenialStats })** — `src/pages/admin/RlsDenialsAdminPage.tsx`
  ```
  return ( <div className="grid gap-4 lg:grid-cols-3"> <Card> <CardHeader> <CardTitle className="text-sm">Top vendedores negados</CardTitle> </CardHeader> <CardContent> {stats.topUsers.length === 0 ? ( <p className="text-xs text-muted-foreground">Sem eventos.</p> ) : ( <ul className="space-y-1.5 text-xs"> {stats.topUsers.map(([userId, value]) => ( <li key={userId} className="flex items-center justify-between"> <span className="truncate" title={userId}> {value.email ?? `${userId.slice(0, 8)}…`} </s …
  ```
- **formatCurrency(val: number)** — `src/pages/admin/ai-usage/AiTables.tsx`
  ```
  `$${val.toFixed(4)}`;
  ```
- **invalidateSteps()** — `src/pages/admin/qa/QARunDetailPage.tsx`
  ```
  queryClient.invalidateQueries({ queryKey: ['qa_run_steps', id] });
  ```
- **invalidate()** — `src/pages/admin/sicoob/tabs/ApprovalPolicyTab.tsx`
  ```
  queryClient.invalidateQueries({ queryKey: [POLICIES_QUERY_KEY] });
  ```
- **formatCurrency(value: number)** — `src/pages/admin/sicoob/tabs/BudgetsTab.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", }).format(value);
  ```
- **canEditScopeOf(profileUserId: string | null)** — `src/pages/admin/sicoob/tabs/UserAssignmentTab.tsx`
  ```
  const isSelf = !!actorUser?.id && actorUser.id === profileUserId; return isSelf ? gates.canEditOwnProfile : gates.canEditOtherProfile;
  ```
- **invalidate()** — `src/pages/admin/telemetry/useOptimizationQueue.ts`
  ```
  queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
  ```
- **calculateDelta(current: LatencySummary, baseline: LatencySummary)** — `src/pages/admin/telemetry/useProductsListingLatencyAlert.ts`
  ```
  return baseline.avgMs > 0 ? (current.avgMs - baseline.avgMs) / baseline.avgMs : 0;
  ```
- **formatCurrency(value: number)** — `src/pages/advanced-price-search/types.ts`
  ```
  
  ```
- **matchingPriceTable(filters: SearchFilters, priceTables: PriceTable[])** — `src/pages/advanced-price-search/useAdvancedPriceSearch.ts`
  ```
  if (filters.technique === 'all' || priceTables.length === 0) return undefined; return priceTables.find((table) => matchesQuantity(table, filters.minQuantity)) ?? priceTables[0];
  ```
- **calculateProductPrice(product: Product, filters: SearchFilters, priceTables: PriceTable[],)** — `src/pages/advanced-price-search/useAdvancedPriceSearch.ts`
  ```
  const table = matchingPriceTable(filters, priceTables); const productPrice = numberOrZero(product.price); const customizationPrice = numberOrZero(table?.unit_price); const setupPrice = numberOrZero(table?.setup_price); const handlingPrice = numberOrZero(table?.handling_price); const personalizedPrice = productPrice + customizationPrice + setupPrice / filters.minQuantity + handlingPrice; const totalPerUnit = filters.priceType === 'with_personalization' ? personalizedPrice : productPrice; return { …
  ```
- **priceWithinRange(product: ProductWithCalculatedPrice, range: [number, number])** — `src/pages/advanced-price-search/useAdvancedPriceSearch.ts`
  ```
  const price = product.priceBreakdown.totalPerUnit; return price >= range[0] && price <= range[1];
  ```
- **usePriceTables(filters: SearchFilters)** — `src/pages/advanced-price-search/useAdvancedPriceSearch.ts`
  ```
  return useQuery({ queryKey: ['price-tables-search', filters.technique, filters.minQuantity], queryFn: () => { if (filters.technique === 'all') return Promise.resolve([]); return fetchPromobrindPriceTables({ techniqueName: filters.technique, quantity: filters.minQuantity, }); }, enabled: filters.technique !== 'all', });
  ```
- **applyArrayParams(filters: FilterState, params: URLSearchParams)** — `src/pages/filters/filters-page-helpers.ts`
  ```
  for (const key of ARRAY_FILTER_KEYS) { const values = readArray(params, key); if (values.length) filters[key] = values; }
  ```
- **applyScalarParams(filters: FilterState, params: URLSearchParams)** — `src/pages/filters/filters-page-helpers.ts`
  ```
  const search = params.get('search'); const singleSupplier = params.get('supplier'); const priceMin = params.get('priceMin'); const priceMax = params.get('priceMax'); const minStock = params.get('minStock'); const sortBy = params.get('sortBy'); if (search) filters.search = search; if (singleSupplier && !filters.suppliers.includes(singleSupplier)) { filters.suppliers = [...filters.suppliers, singleSupplier]; } if (priceMin || priceMax) filters.priceRange = [priceMin ? parseInt(priceMin) : 0, price …
  ```
- **applyBooleanParams(filters: FilterState, params: URLSearchParams)** — `src/pages/filters/filters-page-helpers.ts`
  ```
  for (const key of BOOLEAN_FILTER_KEYS) filters[key] = params.get(key) === '1';
  ```
- **totalLength(...arrays: string[][])** — `src/pages/filters/filters-page-helpers.ts`
  ```
  return arrays.reduce((total, values) => total + values.length, 0);
  ```
- **applyProductFilters(context: ProductFilterContext)** — `src/pages/filters/filters-page-helpers.ts`
  ```
  let result = filterBySearch(context.products, context.filters.search); result = filterByIdSet(result, context.hasColorFilter, context.colorIds, context.loadingColor); result = filterByIdSet( result, context.hasCategoryFilter, context.categoryIds, context.loadingCategory, ); result = filterBySuppliers(result, context.filters.suppliers); result = filterByIdSet(result, context.hasMarketingFilter, context.marketingIds, context.loadingMarketing); result = filterByIdSet(result, context.hasCommemorativ …
  ```
- **GenerateButton({ m }: { m: MagicUpStateReturn })** — `src/pages/magic-up/MagicUpConfigPanel.tsx`
  ```
  return ( <Button onClick={() => m.handleGenerate()} disabled={!m.canGenerate || m.generating} className="h-12 w-full gap-2 text-base" size="lg" > {m.generating ? ( <> <Loader2 className="h-5 w-5 animate-spin" /> Gerando com modelo Pro... </> ) : ( <> <Wand2 className="h-5 w-5" /> {m.variations.length > 0 ? 'Gerar Nova Variação' : 'Gerar Imagem Publicitária'} {!m.canGenerate && ( <Badge variant="secondary" className="ml-2 text-[10px]"> {!m.selectedProduct ? 'Selecione um produto' : !m.logoPreview …
  ```
- **formatPrice(price: number)** — `src/pages/product-detail/ProductDetailHeroSections.tsx`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
  ```
- **formatPrice(value: number)** — `src/pages/product-match/MatchCards.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **formatPrice(value: number)** — `src/pages/product-match/ProductSearchPanel.tsx`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **calcPersTotal(totalCost: number, qty: number)** — `src/pages/quote-view/QuoteActionHandlers.ts`
  ```
  if (qty <= 0) return totalCost; const roundedUnit = Math.round((totalCost / qty) * 100) / 100; return Math.round(roundedUnit * qty * 100) / 100;
  ```
- **calculateQuoteTotals(quote: Quote)** — `src/pages/quote-view/useQuoteViewData.ts`
  ```
  const items = quote.items || []; const productSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0); const personalizationSubtotal = items.reduce( (sum, item) => sum + (item.personalizations || []).reduce( (itemSum: number, personalization: { total_cost?: number }) => itemSum + calcPersTotal(personalization.total_cost || 0, item.quantity), 0, ), 0, ); const subtotal = productSubtotal + personalizationSubtotal; const discount = quote.discount_percent ? Math.round(subtot …
  ```
- **formatCurrency(value: number)** — `src/pages/quotes-dashboard/useQuotesDashboard.ts`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **calculateAverageResponseTime(quotes: Quote[])** — `src/pages/quotes-dashboard/useQuotesDashboard.ts`
  ```
  const responded = quotes.filter((quote) => quote.client_response_at && quote.created_at); if (responded.length === 0) return 0; const total = responded.reduce( (sum, quote) => sum + differenceInHours(new Date(quote.client_response_at || 0), new Date(quote.created_at || 0)), 0, ); return total / responded.length;
  ```
- **calculateDashboardMetrics(quotes: Quote[], period: Period, clientId: string)** — `src/pages/quotes-dashboard/useQuotesDashboard.ts`
  ```
  if (quotes.length === 0) return EMPTY_METRICS; const filtered = filterDashboardQuotes(quotes, period, clientId); const approved = filtered.filter((quote) => quote.status === 'approved'); const rejected = filtered.filter((quote) => quote.status === 'rejected'); const responded = [...approved, ...rejected]; const totalValue = filtered.reduce((sum, quote) => sum + (quote.total || 0), 0); const approvedValue = approved.reduce((sum, quote) => sum + (quote.total || 0), 0); const totalProfit = approved …
  ```
- **decisionIsDisabled(canDecide: boolean, mutationPending: boolean)** — `src/pages/sicoob/GestorApprovalsPage.tsx`
  ```
  
  ```
- **invalidate()** — `src/pages/sicoob/GestorConsolidatedOrdersPage.tsx`
  ```
  await Promise.all([ queryClient.invalidateQueries({ queryKey: ["sicoob-consolidations"] }), queryClient.invalidateQueries({ queryKey: ["sicoob-orders"] }), ]);
  ```
- **EligibleOrderList({ isLoading, orders, selectedOrders, onToggle, }: { isLoading: boolean; orders: EligibleOrder[]; selectedOrders: Set<str)** — `src/pages/sicoob/GestorConsolidatedOrdersPage.tsx`
  ```
  void;
  ```
- **calculateBudgetUsed(stats: DashboardStats | null | undefined)** — `src/pages/sicoob/PADashboardPage.tsx`
  ```
  if (!stats || stats.monthlyLimit <= 0) return 0; return ((stats.monthlyLimit - stats.availableBudget) / stats.monthlyLimit) * 100;
  ```
- **ValidationMessage({ id, message }: { id: string; message?: string })** — `src/pages/sicoob/SicoobInvitationsPage.tsx`
  ```
  if (!message) return null; return ( <p id={id} role="alert" className="text-sm text-destructive"> {message} </p> );
  ```
- **invalidate()** — `src/pages/sicoob/admin/CostCentersPage.tsx`
  ```
  queryClient.invalidateQueries({ queryKey: ['cost_centers'] });
  ```
- **canTransitionTo(current: OrderStatus, next: OrderStatus)** — `src/pages/sicoob/orders/OrderDetailPage.tsx`
  ```
  canSicoobTransitionTo(current, next);
  ```
- **canApproveOrder(resources: DetailResources, order: SicoobOrder | undefined)** — `src/pages/sicoob/orders/OrderDetailPage.tsx`
  ```
  if (resources.auth.isSupervisorOrAbove) return true; return Boolean(resources.auth.isGerentePa && order?.pa_id === resources.auth.profile?.pa_id);
  ```
- **calculateStats(orders: SicoobOrder[])** — `src/pages/sicoob/orders/OrdersPage.tsx`
  ```
  const committedOrders = orders.filter(isCommittedSicoobOrder); const totalRevenue = sumCommittedSicoobOrders(committedOrders); const statusCounts = orders.reduce<Record<string, number>>((counts, order) => ({ ...counts, [order.status]: (counts[order.status] || 0) + 1 }), {}); return { totalRevenue, avgTicket: committedOrders.length ? totalRevenue / committedOrders.length : 0, totalCount: orders.length, criticalSla: orders.filter(order => order.sla_status === "critical").length, statusCounts };
  ```
- **applyOrderScope(query: OrderListQuery, sellerId: string, scope: string)** — `src/services/OrderService.ts`
  ```
  return scope === "self" && sellerId ? query.eq("seller_id", sellerId) : query;
  ```
- **applyOrderFieldFilters(query: OrderListQuery, filters?: OrderFilters)** — `src/services/OrderService.ts`
  ```
  let filtered = query; if (filters?.status && filters.status !== "all") filtered = filtered.eq("status", filters.status); if (filters?.clientCompany) filtered = filtered.ilike("client_company", `%${filters.clientCompany}%`); if (filters?.startDate) filtered = filtered.gte("created_at", filters.startDate); if (filters?.endDate) filtered = filtered.lte("created_at", filters.endDate); return filtered;
  ```
- **applyOrderSearch(query: OrderListQuery, searchValue?: string)** — `src/services/OrderService.ts`
  ```
  let filtered = query; if (searchValue) { const search = searchValue.trim(); filtered = filtered.or(`order_number.ilike.%${search}%,client_name.ilike.%${search}%,client_company.ilike.%${search}%`); } return filtered;
  ```
- **applyOrderListFilters(query: OrderListQuery, sellerId: string, scope: string, filters?: OrderFilters,)** — `src/services/OrderService.ts`
  ```
  let filtered = applyOrderScope(query, sellerId, scope); filtered = applyOrderFieldFilters(filtered, filters); return applyOrderSearch(filtered, filters?.search);
  ```
- **calculateDocumentTotals(quote: Partial<Quote>, items: QuoteItem[])** — `src/services/QuoteService.ts`
  ```
  const discountType = quote.discount_percent ? 'percent' : 'amount'; const discountValue = quote.discount_percent || quote.discount_amount || 0; return calculateQuoteTotals( quote, items, quote.negotiation_markup_percent, discountType, discountValue, );
  ```
- **applyStatusFilter(query: SicoobOrderQuery, filters?: OrderListFilters)** — `src/services/sicoob/orderService.ts`
  ```
  if (filters?.statuses?.length) return query.in("status", filters.statuses); if (filters?.status && filters.status !== "all") return query.eq("status", filters.status); return query;
  ```
- **applyOrganizationFilters(query: SicoobOrderQuery, filters?: OrderListFilters)** — `src/services/sicoob/orderService.ts`
  ```
  let filtered = query; if (filters?.pa_id && filters.pa_id !== "all") filtered = filtered.eq("pa_id", filters.pa_id); if (filters?.cooperative_id && filters.cooperative_id !== "all") { filtered = filtered.eq("cooperative_id", filters.cooperative_id); } return filtered;
  ```
- **applyPeriodAndSearch(query: SicoobOrderQuery, filters?: OrderListFilters)** — `src/services/sicoob/orderService.ts`
  ```
  let filtered = query; if (filters?.from) filtered = filtered.gte("created_at", filters.from); if (filters?.to) filtered = filtered.lte("created_at", filters.to); if (filters?.search) { // Remove caracteres sintáticos do PostgREST (, ( )) que poderiam injetar condições extras const term = filters.search.toLowerCase().trim().replace(/[,()]/g, ''); if (term) { filtered = filtered.or(`order_number.ilike.%${term}%,notes.ilike.%${term}%,tracking_code.ilike.%${term}%`); } else { // Busca original conti …
  ```
- **applyPagination(query: SicoobOrderQuery, filters?: OrderListFilters)** — `src/services/sicoob/orderService.ts`
  ```
  if (!filters?.page || !filters.pageSize) return query; const from = (filters.page - 1) * filters.pageSize; return query.range(from, from + filters.pageSize - 1);
  ```
- **applyState(next: CompareItem[])** — `src/stores/useComparisonStore.ts`
  ```
  return { compareItems: next, compareIds: next.map(i => i.productId), compareCount: next.length, canAddMore: next.length < MAX_COMPARE_ITEMS, };
  ```
- **calculateStockStatus(current: number, min: number, ...options: [max?: number, inTransit?: number, daysUntilStockout?: number])** — `src/types/stock.ts`
  ```
  const [max, inTransit, daysUntilStockout] = options; if (current <= 0) return emptyStockStatus(inTransit); const predicted = predictedStockStatus(daysUntilStockout); return predicted ?? boundedStockStatus(current, min, max);
  ```
- **calculateDaysUntilStockout(currentStock: number, avgDailySales: number = 2)** — `src/types/stock.ts`
  ```
  if (avgDailySales <= 0 || currentStock <= 0) return undefined; return Math.floor(currentStock / avgDailySales);
  ```
- **calculateAvailableStock(currentStock: number, reservedStock: number = 0)** — `src/types/stock.ts`
  ```
  return Math.max(0, currentStock - reservedStock);
  ```
- **canNavigateToStep(targetStep: WizardStep, state: SimulatorWizardState)** — `src/types/domain/simulator-wizard.ts`
  ```
  const targetIndex = getStepIndex(targetStep); const currentIndex = getStepIndex(state.currentStep); // Sempre pode voltar if (targetIndex <= currentIndex) return true; // Se já tem personalizações, pode ir direto ao comparativo (resumo) if (targetStep === 'comparison' && state.personalizations.length > 0) return true; for (let i = 0; i < targetIndex; i++) { const step = WIZARD_STEPS[i]; if (!step || !isStepComplete(step, state)) { return false; } } return true;
  ```
- **canSicoobTransitionTo(current: OrderStatus, next: OrderStatus)** — `src/types/sicoob/orders.ts`
  ```
  if (current === next) return true; const validNext = SICOOB_VALID_TRANSITIONS[current] || []; return validNext.includes(next);
  ```
- **canEditSicoobOrderItems(status: OrderStatus)** — `src/types/sicoob/orders.ts`
  ```
  return status === 'draft';
  ```
- **formatCurrency(value: number)** — `src/utils/excelExport.ts`
  ```
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **formatCurrency(value: number | null | undefined)** — `src/utils/formatters.ts`
  ```
  if (value === null || value === undefined) return "R$ 0,00"; return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  ```
- **drawPriceBreakdown(doc: jsPDF, kitState: KitState, kitQuantity: number, y: number)** — `src/utils/kitPdfGenerator.ts`
  ```
  const { box, items, personalization } = kitState; const breakdown = generatePriceBreakdown(box, items, personalization, kitQuantity); const pricing = calculateTotalKitPrice(box, items, personalization, kitQuantity); y = drawSectionTitle(doc, 'Detalhamento de Preços', y); const rows = breakdown.map((item) => [ item.isPersonalization ? ` ↳ ${item.label}` : item.label, item.quantity ? String(item.quantity) : '-', formatCurrency(item.unitPrice), formatCurrency(item.totalPrice), ]); autoTable(doc, { …
  ```
- **generateKitPDF(options: KitPdfOptions)** — `src/utils/kitPdfGenerator.ts`
  ```
  const { kitState, kitQuantity, kitName } = options; const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); let y = drawHeader(doc, kitName, options.orgName, kitState.identity); // KPI cards y = drawKpiCards(doc, kitState, kitQuantity, y); // Composition section y = drawSectionTitle(doc, 'Composição do Kit', y); y = drawCompositionTable(doc, kitState, y); // Box info line if (kitState.box) { doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY_50 …
  ```
- **applySerigraphyPalette(imageData: ImageData, palette: PaletteEntry[])** — `src/utils/laser-logo-processor.ts`
  ```
  for (let index = 0; index < imageData.data.length; index += 4) { recolorPixel(imageData.data, index, palette); }
  ```
- **validateCnpj(value: string)** — `src/utils/masks.ts`
  ```
  const digits = value.replace(/\D/g, ''); if (digits.length !== 14) return false; if (/^(\d)\1{13}$/.test(digits)) return false; // `digits[i]` é `string | undefined` sob noUncheckedIndexedAccess; o // comprimento já foi validado acima, então o fallback nunca é atingido. const digitAt = (index: number): number => Number.parseInt(digits[index] ?? '0', 10); const calc = (weights: number[]) => weights.reduce((sum, w, i) => sum + digitAt(i) * w, 0); const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; co …
  ```
- **calc(weights: number[])** — `src/utils/masks.ts`
  ```
  
  ```
- **applyPixMask(value: string, tipo: string)** — `src/utils/pixMask.ts`
  ```
  const digits = value.replace(/\D/g, ''); switch (tipo) { case 'CPF': // 000.000.000-00 return digits .slice(0, 11) .replace(/(\d{3})(\d)/, '$1.$2') .replace(/(\d{3})(\d)/, '$1.$2') .replace(/(\d{3})(\d{1,2})$/, '$1-$2'); case 'CNPJ': // 00.000.000/0000-00 return digits .slice(0, 14) .replace(/(\d{2})(\d)/, '$1.$2') .replace(/(\d{3})(\d)/, '$1.$2') .replace(/(\d{3})(\d)/, '$1/$2') .replace(/(\d{4})(\d{1,2})$/, '$1-$2'); case 'Telefone': // (00) 00000-0000 or (00) 0000-0000 if (digits.length <= 10 …
  ```
- **calculateVerifier(digits: number[], weights: number[])** — `src/utils/pixMask.ts`
  ```
  const sum = weights.reduce((total, weight, index) => total + (digits[index] ?? 0) * weight, 0); const remainder = sum % 11; return remainder < 2 ? 0 : 11 - remainder;
  ```
- **calculateCpfVerifier(digits: number[], length: number)** — `src/utils/pixMask.ts`
  ```
  const sum = Array.from({ length }, (_, index) => (digits[index] ?? 0) * (length + 1 - index)) .reduce((total, value) => total + value, 0); const verifier = 11 - (sum % 11); return verifier >= 10 ? 0 : verifier;
  ```
- **validateCpfDigits(value: string)** — `src/utils/pixMask.ts`
  ```
  const raw = value.replace(/\D/g, ''); if (raw.length !== 11) return false; if (/^(\d)\1{10}$/.test(raw)) return false; // todos iguais const d = toDigitArray(raw); if ((d[9] ?? -1) !== calculateCpfVerifier(d, 9)) return false; return (d[10] ?? -1) === calculateCpfVerifier(d, 10);
  ```
- **validateCnpjDigits(value: string)** — `src/utils/pixMask.ts`
  ```
  const raw = value.replace(/\D/g, ''); if (raw.length !== 14) return false; if (/^(\d)\1{13}$/.test(raw)) return false; const d = toDigitArray(raw); const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; if ((d[12] ?? -1) !== calculateVerifier(d, weights1)) return false; const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; return (d[13] ?? -1) === calculateVerifier(d, weights2);
  ```
- **validatePixKey(chave: string, tipo: string)** — `src/utils/pixMask.ts`
  ```
  const raw = chave.replace(/\D/g, ''); switch (tipo) { case 'CPF': if (raw.length < 11) return null; // ainda digitando return validateCpfDigits(raw) ? null : 'CPF inválido (dígitos verificadores)'; case 'CNPJ': if (raw.length < 14) return null; return validateCnpjDigits(raw) ? null : 'CNPJ inválido (dígitos verificadores)'; default: return null; }
  ```
- **formatPriceDateShort(date: Date)** — `src/utils/price-freshness.ts`
  ```
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", }).format(date);
  ```
- **formatPriceDateLong(date: Date)** — `src/utils/price-freshness.ts`
  ```
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", }).format(date);
  ```
- **getPriceFreshness(priceUpdatedAt: string | Date | null | undefined, thresholdDays: number | null | undefined,)** — `src/utils/price-freshness.ts`
  ```
  const threshold = typeof thresholdDays === "number" && thresholdDays > 0 ? Math.floor(thresholdDays) : DEFAULT_PRICE_FRESHNESS_THRESHOLD_DAYS; if (!priceUpdatedAt) { return { status: "unknown", daysSinceUpdate: null, thresholdDays: threshold, label: "Data de atualização não informada", tooltip: "O fornecedor não informou quando este preço foi atualizado pela última vez. Confirme o valor diretamente com o fornecedor antes de enviar o orçamento ao cliente.", shouldWarn: false, isStale: false, }; } …
  ```
- **validTimestamp(value: unknown)** — `src/utils/product-mapper.ts`
  ```
  return typeof value === 'string' && value.trim() !== '' ? value : null;
  ```
- **validPositiveNumber(value: unknown)** — `src/utils/product-mapper.ts`
  ```
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  ```
- **formatCurrency(value: number | null | undefined)** — `src/utils/productPdfExport.ts`
  ```
  
  ```
- **generateProposalPDFv2(data: ProposalTemplateData, options?: PdfOptions)** — `src/utils/proposalPdfReactGenerator.ts`
  ```
  const [jsPDF, html2canvas] = await Promise.all([getJsPDF(), getHtml2Canvas()]); // ① Pre-process logo BEFORE React renders — guarantees cache is warm const container = document.createElement("div"); container.style.position = "fixed"; container.style.top = "-10000px"; container.style.left = "-10000px"; container.style.zIndex = "-9999"; container.style.pointerEvents = "none"; document.body.appendChild(container); try { const root = ReactDOM.createRoot(container); const templateRef = React.createR …
  ```
- **calculateItemPersonalizationTotal(item: QuoteItem)** — `src/utils/quote-calculations.ts`
  ```
  return (item.personalizations || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);
  ```
- **calculateItemPersonalizationCost(item: QuoteItem)** — `src/utils/quote-calculations.ts`
  ```
  // Assume personalização tem um custo base. Se não houver cost explícito, usamos o total_cost como custo // mas idealmente personalizações têm unit_cost + setup_cost. return (item.personalizations || []).reduce((sum, p) => { const unitCost = p.unit_cost || 0; const setupCost = p.setup_cost || 0; const qty = p.personalized_quantity || item.quantity; return sum + (unitCost * qty) + setupCost; }, 0);
  ```
- **calculateItemTotal(item: QuoteItem)** — `src/utils/quote-calculations.ts`
  ```
  return item.quantity * item.unit_price + calculateItemPersonalizationTotal(item);
  ```
- **calculateItemCost(item: QuoteItem)** — `src/utils/quote-calculations.ts`
  ```
  const productCost = (item.unit_cost || item.unit_price * 0.7) * item.quantity; // Fallback 70% se não houver custo return productCost + calculateItemPersonalizationCost(item);
  ```
- **calculateQuoteTotals({ items, negotiationMarkup, discountType, discountValue, shippingCost = 0, shippingType = "cif", }: QuoteTotalsInput)** — `src/utils/quote-calculations.ts`
  ```
  const realSubtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0); const totalCost = items.reduce((sum, item) => sum + calculateItemCost(item), 0); const markup = Math.min(50, Math.max(0, negotiationMarkup || 0)); const subtotal = markup > 0 ? Math.round(realSubtotal * (1 + markup / 100) * 100) / 100 : realSubtotal; const discountAmount = discountType === "percent" ? subtotal * (discountValue / 100) : discountValue; const shippingValue = (shippingType === "fob" || shippingType …
  ```
- **formatCurrency(value: number)** — `src/utils/quote-calculations.ts`
  ```
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  ```
- **quoteDiscount(quote: Quote, subtotal: number)** — `src/utils/quote-data-mapper.ts`
  ```
  if (quote.discount_percent) { return Math.round(subtotal * (quote.discount_percent / 100) * 100) / 100; } return valueOr(quote.discount_amount, 0);
  ```
- **quoteShipping(quote: Quote)** — `src/utils/quote-data-mapper.ts`
  ```
  const includesShipping = quote.shipping_type === 'fob' || quote.shipping_type === 'fob_pre'; return includesShipping ? valueOr(quote.shipping_cost, 0) : 0;
  ```
- **itemTotal(item: { quantity: number; unit_price: number | null; subtotal: number | null })** — `src/utils/quotePdfUtils.ts`
  ```
  return item.subtotal ?? item.quantity * (item.unit_price ?? 0);
  ```
- **generateQuotePDF(quoteId: string)** — `src/utils/quotePdfUtils.ts`
  ```
  try { const [quoteResult, itemsResult] = await Promise.all([ supabase // rls-allow: documento por id; RLS valida ownership e organização .from("quotes") .select("*") .eq("id", quoteId) .single(), supabase // rls-allow: itens pertencem ao orçamento cuja visibilidade é protegida por RLS .from("quote_items") .select("quantity, unit_price, subtotal, product_name, product_sku") .eq("quote_id", quoteId) .order("sort_order", { ascending: true }), ]); const quote = quoteResult.data; if (quoteResult.erro …
  ```
- **validateImportedTemplates(data: unknown)** — `src/utils/templateExport.ts`
  ```
  if (!data || typeof data !== 'object') return null; const obj = data as Record<string, unknown>; if (!obj.version || !obj.templates || !Array.isArray(obj.templates)) { return null; } if (!obj.templates.every(isValidImportedTemplate)) return null; return data as ExportedTemplate;
  ```
- **cancel(reason)** — `supabase/functions/_shared/ai-usage.ts`
  ```
  cancelled = true; await Promise.all([ reader.cancel(reason), finalize("error", reason), ]);
  ```
- **canRequest()** — `supabase/functions/_shared/circuit-breaker.ts`
  ```
  const now = Date.now(); if (this.state === "OPEN") { if (now - this.openedAt >= this.cfg.openDurationMs) { this.state = "HALF_OPEN"; return true; } return false; } return true;
  ```
- **invalidateCredentialCache(name?: string)** — `supabase/functions/_shared/credentials.ts`
  ```
  if (name) { CACHE.delete(name); METRICS.invalidations_single += 1; for (const [canonical] of Object.entries(ALIASES)) { if (canonical === name) CACHE.delete(canonical); } } else { CACHE.clear(); METRICS.invalidations_full += 1; }
  ```
- **isCustomizationPriceTablesAlias(table: string)** — `supabase/functions/_shared/external-db-aliases.ts`
  ```
  return table === 'customization_price_tables' || table === 'customization_price_tiers';
  ```
- **mapPriceTableFiltersToExternal(filters: Record<string, unknown> | undefined)** — `supabase/functions/_shared/external-db-aliases.ts`
  ```
  if (!filters) return undefined; const out: Record<string, unknown> = { ...filters }; if ('table_code' in out) { out.tecnica_codigo = out.table_code; delete out.table_code; } if ('table_code_option' in out) { out.table_code = out.table_code_option; delete out.table_code_option; } if ('table_fullcode' in out) { out.table_code = out.table_fullcode; delete out.table_fullcode; } if ('technique_id' in out) { delete out.technique_id; } if ('customization_type_name' in out) { out.tecnica_codigo = out.cu …
  ```
- **mapPriceTableOrderByToExternal(orderBy: { column: string; ascending?: boolean } | undefined)** — `supabase/functions/_shared/external-db-aliases.ts`
  ```
  if (!orderBy) return { column: 'table_code', ascending: true }; const columnMap: Record<string, string> = { 'table_code': 'table_code', 'table_code_option': 'table_code', 'customization_type_name': 'tecnica_codigo', 'max_colors': 'max_colors', 'display_order': 'table_code', 'is_active': 'is_active', }; return { column: columnMap[orderBy.column] || 'table_code', ascending: orderBy.ascending ?? true };
  ```
- **mapPriceTableRowToLegacyShape(row: Record<string, unknown>)** — `supabase/functions/_shared/external-db-aliases.ts`
  ```
  return { ...row, id: row.id, table_code: row.table_code, table_code_option: row.table_code, table_fullcode: row.table_code, customization_type_name: row.tecnica_codigo, tecnica_codigo: row.tecnica_codigo, max_colors: row.max_colors, max_area_width_cm: row.max_area_width_cm, max_area_height_cm: row.max_area_height_cm, price_by_color: row.price_by_color ?? false, price_by_area: row.price_by_area ?? false, setup_price: row.setup_price ?? 0, handling_price: 0, is_active: row.is_active ?? true, min_q …
  ```
- **canReadCrm(userRoles: readonly string[])** — `supabase/functions/_shared/portal-access-policy.ts`
  ```
  return hasAllowedRole(userRoles, CRM_READ_ROLES);
  ```
- **canWriteCrm(userRoles: readonly string[])** — `supabase/functions/_shared/portal-access-policy.ts`
  ```
  return hasAllowedRole(userRoles, CRM_WRITE_ROLES);
  ```
- **canAccessCrmRequest(userRoles: readonly string[], request: CrmAccessRequest,)** — `supabase/functions/_shared/portal-access-policy.ts`
  ```
  const isDev = userRoles.includes('dev'); if (!isDev && usesRelations(request)) return false; if (request.operation === 'quote_directory') { return ( isQuoteDirectoryRequest(request) && (canReadCrm(userRoles) || hasAllowedRole(userRoles, QUOTE_DIRECTORY_ROLES)) ); } if ( request.operation === 'insert' || request.operation === 'update' || request.operation === 'delete' ) { return canWriteCrm(userRoles); } if (request.operation === 'batch') return canReadCrm(userRoles); if (request.operation !== 's …
  ```
- **canUseClientContext(userRoles: readonly string[])** — `supabase/functions/_shared/portal-access-policy.ts`
  ```
  return hasAllowedRole(userRoles, CLIENT_CONTEXT_ROLES);
  ```
- **applyRateLimit(req: Request, limiter: RateLimiter, getIdentifier: (req: Request)** — `supabase/functions/_shared/rate-limiter.ts`
  ```
  string = (r) => r.headers.get('x-forwarded-for') || 'anonymous'
  ```
- **validateRequired(body: Record<string, unknown> | null, fields: string[])** — `supabase/functions/_shared/validate.ts`
  ```
  if (!body) return 'Request body is required'; const missing = fields.filter(f => { const val = body[f]; return val === undefined || val === null || val === ''; }); if (missing.length > 0) { return `Missing required fields: ${missing.join(', ')}`; } return null;
  ```
- **validationError(message: string, headers: Record<string, string> = {})** — `supabase/functions/_shared/validate.ts`
  ```
  return new Response( JSON.stringify({ error: message }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers }, } );
  ```
- **validateWebhookDispatchModes(input: WebhookDispatchModes)** — `supabase/functions/_shared/webhook-dispatcher-contract.ts`
  ```
  const hasRetryTarget = input.target_webhook_id !== undefined; const hasRetryAttempt = input.retry_after_attempt !== undefined; if (hasRetryTarget !== hasRetryAttempt) { return "target_webhook_id e retry_after_attempt devem ser informados juntos"; } if ( (hasRetryTarget && (input.test_mode || input.replay_delivery_id)) || (input.test_mode && input.replay_delivery_id) ) { return "Retry, teste e replay são modos exclusivos"; } return null;
  ```
- **applyFilters(query: any, filters: Record<string, unknown>)** — `supabase/functions/crm-db-bridge/index.ts`
  ```
  for (const [key, value] of Object.entries(filters)) { if (value === null) { query = query.is(key, null); } else if (typeof value === "object" && value !== null) { const f = value as Record<string, unknown>; if ("in" in f) query = query.in(key, f.in as unknown[]); if ("ilike" in f) query = query.ilike(key, f.ilike as string); if ("eq" in f) query = query.eq(key, f.eq); if ("neq" in f) query = query.neq(key, f.neq as string); if ("gt" in f) query = query.gt(key, f.gt as string); if ("gte" in f) qu …
  ```
- **applyOrdering(query: any, orderBy: CrmQuery["orderBy"])** — `supabase/functions/crm-db-bridge/index.ts`
  ```
  const orderings = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []; return orderings.reduce((currentQuery, ordering) => { if (typeof ordering === "string") return currentQuery.order(ordering); return currentQuery.order(ordering.column, { ascending: ordering.ascending ?? true }); }, query);
  ```
- **applySearch(query: any, search: NonNullable<CrmQuery["search"]>)** — `supabase/functions/crm-db-bridge/index.ts`
  ```
  if (!search.term) return query; if (search.columns?.length) { return query.or(buildCompanySearchOr(search.columns, search.term)); } if (search.column) return query.ilike(search.column, `%${escapeIlikeSearchTerm(search.term)}%`); throw new Error("Search requires a column or a non-empty columns list");
  ```
- **generateQuoteNumber(crm: SupabaseClient, data: Record<string, unknown> | Record<string, unknown>[])** — `supabase/functions/crm-db-bridge/index.ts`
  ```
  const now = new Date(); const yearShort = String(now.getFullYear()).slice(-2); const { data: lastQuotes } = await crm .from("quotes") .select("quote_number") .ilike("quote_number", `%/${yearShort}`) .order("quote_number", { ascending: false }) .limit(50); let maxNum = 10000; if (lastQuotes?.length) { for (const row of lastQuotes) { const parsed = parseInt((row.quote_number || "").replace(/\s+/g, "").split("/")[0] || "0", 10); if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed; } } const gene …
  ```
- **applyProductFilters(products: any[], filters: { categoryFilters: string[]; materialFilters: string[]; colorFilters: string[]; genderFilters:)** — `supabase/functions/expert-chat/index.ts`
  ```
  return products.filter((product: any) => { if (!matchesListFilter(product.materials, filters.materialFilters)) return false; if (!matchesListFilter(product.colors, filters.colorFilters)) return false; if (!matchesTextFilter(product.gender, filters.genderFilters)) return false; if (!matchesTagFilter(product.tags, ["publicoAlvo", "publico_alvo"], filters.publicoFilters)) return false; if (!matchesTagFilter(product.tags, ["datasComemorativas", "datas_comemorativas"], filters.dataComemorativaFilters …
  ```
- **scoreProductRelevance(product: any, expansion: SemanticExpansion, categoryMap: Record<string, string>)** — `supabase/functions/expert-chat/index.ts`
  ```
  let score = 0; const name = (product.name || "").toLowerCase(); const description = (product.description || "").toLowerCase(); const catName = (categoryMap[product.category_id] || "").toLowerCase(); const materials = normalizeValueList(product.materials).map(m => m.toLowerCase()).join(" "); const tagsText = JSON.stringify(product.tags || {}).toLowerCase(); const allText = `${name} ${description} ${materials} ${tagsText} ${catName}`; // Direct search terms — highest weight for (const term of expa …
  ```
- **validateFilters(filters: Record<string, unknown> | undefined | null)** — `supabase/functions/external-db-bridge/index.ts`
  ```
  field: string; reason: string; receivedType: string; sample: string
  ```
- **applyFilters(query: any, filters: Record<string, unknown>, categoryDescendants: string[] | null,)** — `supabase/functions/external-db-bridge/index.ts`
  ```
  Object.entries(filters).forEach(([key, value]) => { if (value === undefined || value === null || value === '') return; if (key === '_search' && typeof value === 'string') { // Sanitiza chars estruturais do `.or()` (`,` `(` `)`) além dos wildcards LIKE. const escaped = sanitizeIlikeValue(value); query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,supplier_reference.ilike.%${escaped}%,brand.ilike.%${escape
  ```
- **computeSafeLimit(requestedLimit: number, table: string, hasSearch: boolean, offset: number, selectFields?: string,)** — `supabase/functions/external-db-bridge/index.ts`
  ```
  const isHeavy = HEAVY_TABLES.includes(table); const isVeryHeavy = VERY_HEAVY_TABLES.includes(table); if (!isHeavy) return requestedLimit; // Lightweight selects (few scalar fields, no JSONB) can handle larger pages safely const isLightweight = selectFields && selectFields !== '*' && selectFields.split(',').length <= 20; if (isLightweight) { if (hasSearch) return Math.min(requestedLimit, 250); return Math.min(requestedLimit, 500); } if (hasSearch) return Math.min(requestedLimit, 120); if (isVeryH …
  ```
- **invalidateCacheForTable(table: string)** — `supabase/functions/external-db-bridge/index.ts`
  ```
  const tagPrefix = `t:${table}|`; let removed = 0; for (const [key, entry] of responseCache.entries()) { // entry.payload contém o resultado, mas precisamos identificar pela tabela. // Reescrevemos buildCacheKey para anexar tag legível antes do hash. if (key.startsWith(tagPrefix)) { responseCache.delete(key); removed++; } } if (removed > 0) console.info(`🧹 [cache] invalidated ${removed} entries for table=${table}`);
  ```
- **calcMetrics(quotes: { data: any[] | null }, orders: { data: any[] | null })** — `supabase/functions/market-intelligence-insights/index.ts`
  ```
  const qData = quotes.data ?? []; const oData = orders.data ?? []; const revenue = oData.reduce((s, o) => s + (Number(o.total) || 0), 0); const orderCount = oData.length; const quoteCount = qData.length; const avg_ticket = orderCount > 0 ? revenue / orderCount : 0; const conversion_rate = quoteCount > 0 ? Number(((orderCount / quoteCount) * 100).toFixed(1)) : 0; return { revenue, orders: orderCount, quotes: quoteCount, avg_ticket, conversion_rate };
  ```
- **generateKey()** — `supabase/functions/mcp-keys-issue/index.ts`
  ```
  plain: string; hash: string; prefix: string
  ```
- **generateKey()** — `supabase/functions/mcp-keys-rotate/index.ts`
  ```
  const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""); const plain = `mcp_${hex}`; const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain)); const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join(""); return { plain, hash, prefix: plain.slice(0, 12) };
  ```
- **validatePersonalizations(external: NonNullable<Awaited<ReturnType<typeof createExternalCatalogClient>>>, item: JsonObject,)** — `supabase/functions/quote-price-attestation/handler.ts`
  ```
  const personalizations = Array.isArray(item.personalizations) ? item.personalizations : []; const validateOne = async (raw: unknown) => { if (!isRecord(raw)) throw new Error('Uma personalização do orçamento possui formato inválido.'); const techniqueId = typeof raw.technique_id === 'string' ? raw.technique_id.trim() : ''; const productId = typeof item.product_id === 'string' ? item.product_id : ''; const quantity = numberOrNull(raw.personalized_quantity) ?? numberOrNull(item.quantity); const col …
  ```
- **validateOne(raw: unknown)** — `supabase/functions/quote-price-attestation/handler.ts`
  ```
  if (!isRecord(raw)) throw new Error('Uma personalização do orçamento possui formato inválido.'); const techniqueId = typeof raw.technique_id === 'string' ? raw.technique_id.trim() : ''; const productId = typeof item.product_id === 'string' ? item.product_id : ''; const quantity = numberOrNull(raw.personalized_quantity) ?? numberOrNull(item.quantity); const colors = numberOrNull(raw.colors_count) ?? 1; const positions = numberOrNull(raw.positions_count) ?? 1; const width = numberOrNull(raw.width_ …
  ```
- **rerankProducts(query: string, products: Array<{ id: string; name?: string; description?: string; tags?: string[]; category?: string }>,)** — `supabase/functions/semantic-search/index.ts`
  ```
  try { const url = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !serviceKey) return []; const client = createClient(url, serviceKey); const { data, error } = await castRpcResult<{ data: RankResult[] | null; error: { message: string } | null; }>(client.rpc("search_products_semantic", { _query: query, _products: products, _limit: limit, })); if (error) { console.warn("[rerank] RPC error:", error.message); return []; } return data ?? []; } c …
  ```
- **generateKey(query: string)** — `supabase/functions/semantic-search/index.ts`
  ```
  const normalized = query.toLowerCase().trim(); const encoder = new TextEncoder(); const data = encoder.encode(normalized); let hash = 0; for (let i = 0; i < data.length; i++) { const char = data[i]; hash = ((hash << 5) - hash) + char; hash = hash & hash; } return `search:${hash.toString(16)}`;
  ```
- **calculateNextRun(frequency: unknown, reference: Date, anchorDay: number | null = null,)** — `supabase/functions/send-scheduled-reports/report-types.ts`
  ```
  const next = new Date(reference.getTime()); switch (frequency) { case "daily": next.setUTCDate(next.getUTCDate() + 1); break; case "monthly": { // O dia-âncora é o dia original do agendamento, não o dia da última // execução: um agendamento do dia 31 passava por 28 de fevereiro e ficava // preso no 28 em todos os meses seguintes. const day = anchorDay && anchorDay >= 1 && anchorDay <= 31 ? anchorDay : next.getUTCDate(); next.setUTCDate(1); next.setUTCMonth(next.getUTCMonth() + 1); next.setUTCDat …
  ```
- **validEmail(value: unknown)** — `supabase/functions/send-transactional-email/resolve.ts`
  ```
  if (typeof value !== "string") return null; const email = value.trim(); return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
  ```
- **validLine(value: unknown)** — `supabase/functions/sicoob-kit-quote/index.ts`
  ```
  if (!value || typeof value !== 'object') return false; const line = value as Record<string, unknown>; if (typeof line.lineId !== 'string' || typeof line.productId !== 'string') return false; if (line.kind !== 'box' && line.kind !== 'item') return false; if (!Number.isInteger(line.unitsPerKit)) return false; if (line.variantId != null && typeof line.variantId !== 'string') return false; if (line.personalization == null) return true; if (typeof line.personalization !== 'object') return false; cons …
  ```
- **catalogValidity(checkedAt: string)** — `supabase/functions/sicoob-reorder/catalog.ts`
  ```
  const checkedTime = new Date(checkedAt).getTime(); if (!Number.isFinite(checkedTime)) { throw new ReorderValidationError('A data da consulta ao catálogo é inválida.'); } return new Date(checkedTime + CATALOG_QUERY_VALIDITY_MS).toISOString();
  ```
- **validateResult(result: VoiceCommandResult)** — `supabase/functions/voice-agent/parseAiResponse.ts`
  ```
  if (!result.action || !result.response) { return { action: 'answer', response: result.response || 'Desculpe, ocorreu um erro.', data: result.data || {}, }; } return result;
  ```

### G.4 Percentuais e multiplicadores no código

| Trecho | Arquivo |
|---|---|
| `// Preservamos o score >= 0,90 e uma margem de 4% para ruído do runner.` | `.lighthouserc.cjs` |
| `missingCategories: Math.round(catalogSize * 0.01), // Heuristic: 1%` | `src/components/admin/CatalogQualityDashboard.tsx` |
| `missingImages: Math.round(catalogSize * 0.02), // Heuristic: 2%` | `src/components/admin/CatalogQualityDashboard.tsx` |
| `<span>0%</span><span>{request.max_allowed_percent}% (limite)</span><span>100%</span>` | `src/components/admin/DiscountManagementPanel.tsx` |
| `transition={{ delay: idx * 0.02 }}` | `src/components/admin/DiscountManagementPanel.tsx` |
| `ocorrem 100% no servidor — apenas administradores podem` | `src/components/admin/connections/McpTab.tsx` |
| `const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));` | `src/components/admin/connections/useIncidentDetails.ts` |
| `* OU sucesso 24h < 70%.` | `src/components/admin/connections/usePulseBarStatus.ts` |
| `* ou sucesso 24h entre 70% e 95%,` | `src/components/admin/connections/usePulseBarStatus.ts` |
| `* - Amarelo (warning): falhas dentro do esperado (<2% taxa).` | `src/components/admin/telemetry/PlatformFailureCards.tsx` |
| `* - Vermelho (destructive): pico de falhas (>2% taxa) ou delta crescente.` | `src/components/admin/telemetry/PlatformFailureCards.tsx` |
| `priceFrom: Math.round(t.avgPrice * 0.9),` | `src/components/bi/ClientHealthHero.tsx` |
| `* Heurística: empresas do mesmo ramo + (LTV agregado de quotes ±30% do cliente atual)` | `src/components/bi/ClientLookalikes.tsx` |
| `// Heurística: cliente / (cliente + 1.5 × média setor) — capped 5..95%` | `src/components/bi/ClientVsIndustryComparison.tsx` |
| `<span>Verba acima de 90% — novos pedidos podem exigir aprovação</span>` | `src/components/cart/CartPaBudgetBalance.tsx` |
| `transition={{ delay: index * 0.03 }}` | `src/components/cart/SortableCartItem.tsx` |
| `transition={{ delay: idx * 0.03, type: "spring", stiffness: 400, damping: 25 }}` | `src/components/collections/AddToCollectionModal.tsx` |
| `transition={{ delay: index * 0.035, type: "spring", stiffness: 380, damping: 28 }}` | `src/components/collections/CollectionGridCard.tsx` |
| `transition={{ delay: index * 0.03 }}` | `src/components/collections/CollectionListItem.tsx` |
| `transition={{ delay: index * 0.03 }}` | `src/components/collections/CollectionTableView.tsx` |
| `transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 25 }}` | `src/components/collections/ExternalCollectionCard.tsx` |
| `transition={{ delay: index * 0.03 }} onClick={() => onNavigate(collection.id)}` | `src/components/collections/ExternalCollectionTableView.tsx` |
| `transition={{ delay: 0.1 + index * 0.05 }}` | `src/components/common/ConfirmDialog.tsx` |
| `transition={{ delay: badges.length * 0.1 }}` | `src/components/common/IntelligenceBadges.tsx` |
| `transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}` | `src/components/common/IntelligenceBadges.tsx` |
| `transition={{ delay: index * 0.1 }}` | `src/components/common/StatusTimeline.tsx` |
| `transition={{ delay: idx * 0.05 }}` | `src/components/compare/FloatingCompareBar.tsx` |
| `* Mesma categoria + faixa de preço ±20% dos produtos já em comparação.` | `src/components/compare/SimilarProductsRail.tsx` |
| `const minP = avgPrice * 0.8;` | `src/components/compare/SimilarProductsRail.tsx` |
| `delay: Math.random() * 0.2,` | `src/components/effects/MiniConfetti.tsx` |
| `delay: 0.5 + i * 0.05,` | `src/components/effects/SuccessCelebration.tsx` |
| `delay: i * 0.3,` | `src/components/effects/SuccessCelebration.tsx` |
| `const getBarOpacity = (i: number) => Math.max(1 - i * 0.06, 0.35);` | `src/components/intelligence/CategoryRanking.tsx` |
| `const getOpacity = (i: number) => Math.max(1 - i * 0.08, 0.4);` | `src/components/intelligence/SegmentAnalysis.tsx` |
| `const getBarOpacity = (i: number) => Math.max(1 - i * 0.07, 0.4);` | `src/components/intelligence/SupplierSales.tsx` |
| `if (current <= min * 0.25) return { percentage, progressColor: 'bg-destructive', statusLabel: 'Crítico' };` | `src/components/inventory/StockUI.tsx` |
| `if (variant.currentStock <= variant.minStock * 0.25) return DESTRUCTIVE_TEXT;` | `src/components/inventory/rows/VariantRow.tsx` |
| `// Estratégia: margem ~ 1 - (custo_estimado / preço). Usamos 65% baseline.` | `src/components/kit-builder/KitHealthCard.tsx` |
| `* semelhantes ao kit atual (overlap >=30% por SKU).` | `src/components/kit-builder/SimilarKitsWidget.tsx` |
| `delay: i * 0.2` | `src/components/loading/LoadingOverlay.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/mobile/SmartMobileNav.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/navigation/DynamicBreadcrumbs.tsx` |
| `if (colors > 1 && techMeta?.priceByColor) modifiedUnitPrice *= (1 + (colors - 1) * 0.1);` | `src/components/pricing/calculator/QuantityComparisonTable.tsx` |
| `/** Limiar alto: se faltar ≤15%, prioridade alta */` | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `/** Limiar: só sugere próxima faixa se faltar ≤30% da quantidade atual */` | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `transition: { delay: i * 0.04, type: "spring", stiffness: 500, damping: 30 },` | `src/components/products/BulkActionBar.tsx` |
| `* o sufixo poluiria a UI de >99% do catálogo que ainda não tem o campo.` | `src/components/products/PriceFreshnessBadge.tsx` |
| `if (Math.abs(product.price - current.price) < current.price * 0.3) score += 1;` | `src/components/products/RelatedProducts.tsx` |
| `* - 0–50% de markup` | `src/components/quote/NegotiationMarkupCard.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/quote/QuickQuoteFAB.tsx` |
| `<SelectContent><SelectItem value="21_dias">21 dias \| A partir da entrega</SelectItem><SelectItem value="28_dias">28 dias \| A partir da entrega</SelectItem><Sele …` | `src/components/quotes/builder/CommercialConditions.tsx` |
| `transition={{ duration: 0.15, delay: 0.2 + index * 0.04 }}` | `src/components/search/GlobalSearchIdleState.tsx` |
| `transition={{ duration: 0.15, delay: 0.28 + index * 0.03 }}` | `src/components/search/GlobalSearchIdleState.tsx` |
| `transition={{ delay: index * 0.02, duration: 0.15 }}` | `src/components/search/SearchResultGroups.tsx` |
| `transition={{ delay: index * 0.03 }}` | `src/components/search/SmartSearchInput.tsx` |
| `transition={{ delay: index * 0.04 }}` | `src/components/search/SmartSearchInput.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/search/SmartSuggestions.tsx` |
| `const lineAlpha = (1 - distance / CONNECTION_DIST) * Math.min(firstAlpha, secondAlpha) * 0.6;` | `src/components/search/voice/FloatingParticles.tsx` |
| `const speed = (Math.random() * 0.5 + 0.5) * config.speed;` | `src/components/search/voice/FloatingParticles.tsx` |
| `context.arc(particle.x, particle.y, particle.size * 0.6, 0, Math.PI * 2);` | `src/components/search/voice/FloatingParticles.tsx` |
| `particle.vx += (Math.random() - 0.5) * 0.02;` | `src/components/search/voice/FloatingParticles.tsx` |
| `particle.vy += (Math.random() - 0.5) * 0.02;` | `src/components/search/voice/FloatingParticles.tsx` |
| `Math.sin(angle * (3 + waveIndex) + waveIndex * 1.5) * amplitude * (1 + waveIndex * 0.25);` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `delay: i * 0.12,` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `delay: isSpeaking ? i * 0.08 : i * 0.05, // Speaking: staggered wave effect` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `dist: radius * 0.4 + random() * radius * 0.65,` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `duration: 1.2 + (i % 4) * 0.3,` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `return Array.from({ length: barCount }).map(() => rand() * 0.25);` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `return isSpeaking ? 0.55 + offset * 0.5 : 0.35 + offset;` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `transition={{ duration: 2.5 + w * 0.6, repeat: Infinity, ease: 'easeInOut' }}` | `src/components/search/voice/VoiceVisualEffects.tsx` |
| `transition={{ duration: 0.2, delay: i * 0.03 }}` | `src/components/settings/theme/PresetCard.tsx` |
| `transition={{ delay: i * 0.1 }}` | `src/components/sicoob/orders/AIOrderPredictor.tsx` |
| `const reserved = Math.floor(baseStock * 0.1);` | `src/components/simulator/StockAlert.tsx` |
| `transition={{ delay: idx * 0.04 }}` | `src/components/simulator/wizard/StepLocation.tsx` |
| `* "Ticket Médio" = R$ 4,2k e "Taxa Retenção" = 94% — sob o comentário` | `src/hooks/useClientsPortfolioKpis.ts` |
| `* indicador mostra "—" em vez de 0% ou 100%.` | `src/hooks/useClientsPortfolioKpis.ts` |
| `const pull = Math.min(distance * 0.4, options.threshold + 20);` | `src/hooks/usePullToRefresh.ts` |
| `score += popularityScore * 0.3; // 30% do peso para popularidade` | `src/hooks/useTechniqueRecommendations.ts` |
| `const aScore = a.count * 0.7 + aRecency * 10 * 0.3;` | `src/hooks/useVoiceCommandHistory.ts` |
| `const bScore = b.count * 0.7 + bRecency * 10 * 0.3;` | `src/hooks/useVoiceCommandHistory.ts` |
| `priceFrom: Math.round(Number(p.avg_unit_price) * 0.85) \|\| 0,` | `src/hooks/bi/useClientAffinity.ts` |
| `avgTicket: MOCK_CLIENT_STATS.avgTicket * 0.92,` | `src/hooks/bi/useClientBI.ts` |
| `ltv: MOCK_CLIENT_STATS.ltv * 0.28,` | `src/hooks/bi/useClientBI.ts` |
| `ltv: MOCK_CLIENT_STATS.ltv * 0.35,` | `src/hooks/bi/useClientBI.ts` |
| `ordersCount: Math.max(1, Math.floor(MOCK_CLIENT_STATS.ordersCount * 0.25)),` | `src/hooks/bi/useClientBI.ts` |
| `ordersCount: Math.max(1, Math.floor(MOCK_CLIENT_STATS.ordersCount * 0.3)),` | `src/hooks/bi/useClientBI.ts` |
| `const recentBias = 0.55 + ((i % 3) - 1) * 0.12; // 0.43, 0.55, 0.67` | `src/hooks/bi/useClientCategoryAffinity.ts` |
| `* - Crescimento trim. 15% (compara últimos 3m vs 3m anteriores via sazonalidade)` | `src/hooks/bi/useClientHealthScore.ts` |
| `* - Frequência 25% (vs média do setor)` | `src/hooks/bi/useClientHealthScore.ts` |
| `* - Recência 30% (≤30d=100, ≤60d=80, ≤90d=60, ≤180d=30, >180d=0)` | `src/hooks/bi/useClientHealthScore.ts` |
| `* - Share-of-wallet 10% (estimativa)` | `src/hooks/bi/useClientHealthScore.ts` |
| `* - Ticket vs setor 20%` | `src/hooks/bi/useClientHealthScore.ts` |
| `const THRESHOLD = 15; // ±15% = "na média"` | `src/hooks/bi/useClientVsIndustry.ts` |
| `/** Margem de negociação interna 0–50% (default 0). Infla o subtotal apresentado para criar margem psicológica de desconto. NUNCA exposto ao cliente. */` | `src/hooks/quotes/quoteTypes.ts` |
| `* Projeta `forecastDays` à frente. Usa intervalo de confiança ~95% (1.96 * residualStd).` | `src/lib/forecast.ts` |
| `avg_daily_depletion_90d: Math.round(depletion30d * 0.9 * 10) / 10,` | `src/lib/stock-chart-utils.ts` |
| `const currentStock = Math.floor((200 + seededRandom(seed + 2) * 400) * (1 + seededRandom(seed + 3) * 0.5));` | `src/lib/stock-chart-utils.ts` |
| `const velocityFactor = 1 - (i * 0.25);` | `src/lib/stock-chart-utils.ts` |
| `costPriceClose: 4.5 + seededRandom(baseSeed + dayIdx * 5) * 0.3,` | `src/lib/stock-chart-utils.ts` |
| `total_depleted_90d: Math.round(depletion30d * 90 * 0.9),` | `src/lib/stock-chart-utils.ts` |
| `velocity_trend: 0.7 + seededRandom(seed + 4) * 0.8,` | `src/lib/stock-chart-utils.ts` |
| `/** Sem nenhuma categoria do setor não há comparativo: nem 0%, nem "alinhado". */` | `src/lib/bi/executive-summary.ts` |
| `slide.addText(`${index + 1}.`, { x: 7.15, y: 2.25 + index * 0.85, w: 0.4, h: 0.4, fontSize: 14, color: C.muted, bold: true });` | `src/lib/bi/pptxGenerator.ts` |
| `slide.addText(`${trend.category} · ${trend.unitsSold.toLocaleString("pt-BR")}u`, { x: 7.6, y: 2.5 + index * 0.85, w: 3.2, h: 0.3, fontSize: 9, color: C.muted }) …` | `src/lib/bi/pptxGenerator.ts` |
| `slide.addText(fmtBRL(trend.avgPrice), { x: 11.0, y: 2.3 + index * 0.85, w: 1.6, h: 0.4, fontSize: 12, color: C.primary, bold: true, align: "right" });` | `src/lib/bi/pptxGenerator.ts` |
| `slide.addText(trend.productName, { x: 7.6, y: 2.2 + index * 0.85, w: 3.2, h: 0.3, fontSize: 12, color: C.text, bold: true });` | `src/lib/bi/pptxGenerator.ts` |
| `// Backoff acelerado: 80 → 160 → 320 → 500 → 500 (cap 500ms) com jitter ±20%.` | `src/lib/external-db/health-check.ts` |
| `const jitter = base * (0.8 + Math.random() * 0.4);` | `src/lib/external-db/health-check.ts` |
| `// Fator de folga para empacotamento (itens não ocupam 100% do volume)` | `src/lib/kit-builder/volume-calculator.ts` |
| `const PACKING_EFFICIENCY = 0.75; // 75% de eficiência` | `src/lib/kit-builder/volume-calculator.ts` |
| `const VOLUME_WARNING_THRESHOLD = 0.85; // 85%` | `src/lib/kit-builder/volume-calculator.ts` |
| `* `sicoob_order_history`). Contar pedido ainda pendente daria 100% num mês` | `src/lib/orders/purchasing-sla.ts` |
| `* mostrar 100% num mês em que ninguém aprovou nada — bastava a fila ser nova.` | `src/lib/orders/purchasing-sla.ts` |
| `cost *= 1 + (positions - 1) * 0.25; // +25% por posição adicional` | `src/lib/personalization/validators.ts` |
| `* anterior não há taxa — "—" em vez de 0% ou 100%. */` | `src/pages/ClientsPage.tsx` |
| `radial-gradient(ellipse 60% 40% at 100% 100%, hsl(var(--primary) / 0.04), transparent),` | `src/pages/KitBuilderPage.tsx` |
| `radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.08), transparent),` | `src/pages/KitBuilderPage.tsx` |
| `Target: 60%` | `src/pages/TestDashboard.tsx` |
| `baselineViews: Math.round(family.views * 0.58),` | `src/pages/TrendsPage.tsx` |
| `recentViews: Math.round(family.views * 0.42),` | `src/pages/TrendsPage.tsx` |
| `trendingScore: 2 + (mock.MOCK_TOP_PRODUCT_FAMILIES.length - index) * 0.3,` | `src/pages/TrendsPage.tsx` |
| `const pos = Math.floor(sorted.length * 0.75);` | `src/pages/admin/AdminPerformancePage.tsx` |
| `custom={2.5 + i * 0.05}` | `src/pages/admin/AdminTemasPage.tsx` |
| `custom={3 + i * 0.05}` | `src/pages/admin/AdminTemasPage.tsx` |
| `transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },` | `src/pages/admin/AdminTemasPage.tsx` |
| `criticalThreshold: 90, // 90%` | `src/pages/admin/AdminVerbasPage.tsx` |
| `warningThreshold: 70, // 70%` | `src/pages/admin/AdminVerbasPage.tsx` |
| `Arquitetura escalável e 100% segura contra vazamento de dados inter-tenant.` | `src/pages/admin/AuditEnterprisePage.tsx` |
| `* - Mínimo de chamadas na janela (`minSamples`) evita disparos com 1/2 = 50%.` | `src/pages/admin/telemetry/usePlatformFailureAlert.ts` |
| `* - Threshold por tipo (default: 5% para 503, 10% para cold-start) configurável` | `src/pages/admin/telemetry/usePlatformFailureAlert.ts` |
| `/** Variação percentual da média atual vs baseline. Ex: 0.32 = +32%. */` | `src/pages/admin/telemetry/useProductsListingLatencyAlert.ts` |
| `const REGRESSION_RATIO = 1.5; // 50% mais lento que o baseline = regressão` | `src/pages/admin/telemetry/useProductsListingLatencyAlert.ts` |
| `* - 'regression' → piora crítica (P95 >50%, error +5pp ou very_slow 2x)` | `src/pages/admin/telemetry/useRegressionGuardrail.ts` |
| `* - 'warning' → piora moderada (P95 >25% ou error +2pp)` | `src/pages/admin/telemetry/useRegressionGuardrail.ts` |
| `return quote.total_cost \|\| (quote.real_subtotal ? quote.real_subtotal * 0.7 : 0);` | `src/pages/quotes-dashboard/useQuotesDashboard.ts` |
| `Você atingiu mais de 90% da verba mensal. Novos pedidos podem exigir aprovação manual` | `src/pages/sicoob/PAWalletPage.tsx` |
| `Cada pedido pode ser rateado entre centros de custo. O rateio precisa fechar 100% do` | `src/pages/sicoob/admin/CostCentersPage.tsx` |
| `if (hour >= 14 && hour <= 18) return 0.7 + Math.random() * 0.3;` | `src/pages/trends/trends-mock.ts` |
| `if (hour >= 9 && hour <= 12) return 0.9 + Math.random() * 0.1;` | `src/pages/trends/trends-mock.ts` |
| `if (current <= min * 0.25) return 'critical';` | `src/types/stock.ts` |
| `\| 'critical' // Crítico (< 25% do mínimo)` | `src/types/stock.ts` |
| `* CDN: Cloudflare Images (100% funcional, HTTP 200 confirmado)` | `src/utils/image-utils.ts` |
| `const productCost = (item.unit_cost \|\| item.unit_price * 0.7) * item.quantity; // Fallback 70% se não houver custo` | `src/utils/quote-calculations.ts` |
| `// "Consultar prazo" cravado no código para 100% dos produtos. Em listagem o` | `supabase/functions/_shared/external-product-contract.ts` |
| `* Aceita qualquer Database / SchemaName, com default "public" — cobre 100%` | `supabase/functions/_shared/supabase-client-adapter.ts` |
| `score: Math.max(0.5, 0.8 - index * 0.05),` | `supabase/functions/ai-recommendations/index.ts` |
| `* Cruza user_comparisons ativas com price_history; se houve queda > 5% nos` | `supabase/functions/comparison-price-watcher/index.ts` |
| `http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s` | `tests/load/basic-smoke.js` |
| `http_req_failed: ['rate<0.01'], // Error rate below 1%` | `tests/load/basic-smoke.js` |

## H. Parâmetros de negócio (constantes, prazos, limites)

### H.1 Constantes

| Constante | Valor | Arquivo |
|---|---|---|
| `RUNTIME_CACHE` | `'portal-sicoob-runtime-v3'` | `public/sw.js` |
| `IMAGE_CACHE` | `'portal-sicoob-images-v3'` | `public/sw.js` |
| `MUTED_CARD_BORDER` | `"border-border/50"` | `src/components/admin/DiscountManagementPanel.tsx` |
| `PREVIEW_LIMIT` | `8` | `src/components/admin/connections/ConnectionTestDetailsDialog.tsx` |
| `DEFAULT_PREVIEW_SIZE` | `5` | `src/components/admin/connections/ConnectionTestHistoryPanel.tsx` |
| `DESTRUCTIVE_TEXT` | `"text-destructive"` | `src/components/admin/connections/ConnectionTestHistoryPanel.tsx` |
| `DESTRUCTIVE_TEXT` | `"text-destructive"` | `src/components/admin/connections/CredentialCacheMetricsPanel.tsx` |
| `PAGE_SIZE` | `25` | `src/components/admin/connections/FailedDeliveriesPanel.tsx` |
| `SUCCESS_TEXT` | `"text-success"` | `src/components/admin/connections/IncidentDetailsDrawer.tsx` |
| `WARNING_TEXT` | `"text-warning"` | `src/components/admin/connections/IncidentDetailsDrawer.tsx` |
| `DESTRUCTIVE_TEXT` | `"text-destructive"` | `src/components/admin/connections/IncidentDetailsDrawer.tsx` |
| `MUTED_TEXT` | `"text-muted-foreground"` | `src/components/admin/connections/KeysValidationTab.tsx` |
| `DESTRUCTIVE_TEXT` | `"text-destructive"` | `src/components/admin/connections/KeysValidationTab.tsx` |
| `AMBER_TEXT` | `"text-amber-600"` | `src/components/admin/connections/KeysValidationTab.tsx` |
| `MAX_NOTES` | `200` | `src/components/admin/connections/RotateSecretConfirmDialog.tsx` |
| `MAX_RECENT` | `8` | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| `SERVICE_ROLE_LABEL` | `"Service Role Key"` | `src/components/admin/connections/SupabaseConnectionsTab.tsx` |
| `CONNECTIONS_TAB_HINT` | `"Conexões › Aba"` | `src/components/admin/connections/ZoneCommandPalette.tsx` |
| `RETRY_LATER_HINT` | `"Aguarde alguns segundos e tente novamente."` | `src/components/admin/connections/secretErrors.ts` |
| `BITRIX_SCREEN` | `"/admin/conexoes → aba Bitrix24"` | `src/components/admin/connections/secretImpactMap.ts` |
| `MCP_SCREEN` | `"/admin/conexoes → aba MCP"` | `src/components/admin/connections/secretImpactMap.ts` |
| `MCP_SOURCE_TOOLS` | `"Tools de código-fonte do MCP server"` | `src/components/admin/connections/secretImpactMap.ts` |
| `QUOTES_SCREEN` | `"/orcamentos"` | `src/components/admin/connections/secretImpactMap.ts` |
| `TRAILING_SLASH_REMOVED` | `"barra final removida"` | `src/components/admin/connections/secretNormalizers.ts` |
| `FRAGMENT_REMOVED` | `"fragmento removido"` | `src/components/admin/connections/secretNormalizers.ts` |
| `SUPABASE_JWT_HINT` | `"Token JWT do Supabase (eyJ…)"` | `src/components/admin/connections/secretValidators.ts` |
| `TTL_MS` | `30` | `src/components/admin/connections/useFocusContext.ts` |
| `WINDOW_MS` | `72` | `src/components/admin/connections/useIncidentTimeline72h.ts` |
| `SNOOZE_MS` | `60` | `src/components/admin/connections/useSeverityChangeNotifier.ts` |
| `PRIMARY_TEXT` | `'text-primary'` | `src/components/admin/products/ProductMarketingSection.tsx` |
| `EXTERNAL_DB_BRIDGE` | `'external-db-bridge'` | `src/components/admin/products/ProductMaterialsSection.tsx` |
| `EXTERNAL_DB_BRIDGE` | `'external-db-bridge'` | `src/components/admin/products/ProductTagsSection.tsx` |
| `EXTERNAL_DB_BRIDGE` | `'external-db-bridge'` | `src/components/admin/products/useProductVariants.ts` |
| `MAX_ROWS` | `10` | `src/components/admin/products/bulk-import/types.ts` |
| `VARIANT_FILTER` | `'by-variant'` | `src/components/admin/products/image-gallery/ImageFilterBar.tsx` |
| `PRIMARY_TEXT` | `'text-primary'` | `src/components/admin/products/image-gallery/types.ts` |
| `EXTERNAL_DB_BRIDGE` | `'external-db-bridge'` | `src/components/admin/products/image-gallery/useProductImageGallery.ts` |
| `FILE_EXTENSION_SEPARATOR` | `'.'` | `src/components/admin/products/image-gallery/useProductImageGallery.ts` |
| `EXTERNAL_DB_BRIDGE` | `'external-db-bridge'` | `src/components/admin/products/kit-components/api.ts` |
| `DESTRUCTIVE_BORDER` | `'border-destructive'` | `src/components/admin/products/sections/ProductInfoSection.tsx` |
| `EXTERNAL_DB_BRIDGE` | `'external-db-bridge'` | `src/components/admin/products/sections/engraving/useEngravingWizard.ts` |
| `MAX_FILE_SIZE` | `100` | `src/components/admin/products/video-gallery/types.ts` |
| `EXTERNAL_DB_BRIDGE` | `'external-db-bridge'` | `src/components/admin/products/video-gallery/useProductVideoGallery.ts` |
| `ALL_CREATORS` | `"__all__"` | `src/components/admin/security/keys/McpKeysFilters.tsx` |
| `PAGE_SIZE` | `50` | `src/components/admin/security/keys/audit/useMcpAuditFeed.ts` |
| `DESTRUCTIVE_METRIC_TEXT` | `'text-destructive font-semibold'` | `src/components/admin/telemetry/AppHealthDashboard.tsx` |
| `WARNING_TEXT` | `'text-warning'` | `src/components/admin/telemetry/AppHealthDashboard.tsx` |
| `POLL_MS` | `15` | `src/components/admin/telemetry/BreakerStatusCard.tsx` |
| `DESTRUCTIVE_TEXT` | `'text-destructive'` | `src/components/admin/telemetry/BridgesLiveCard.tsx` |
| `RECENT_LIMIT` | `20` | `src/components/admin/telemetry/BridgesLiveCard.tsx` |
| `POLL_MS` | `30` | `src/components/admin/telemetry/ColdVsWarmCrmCard.tsx` |
| `NEEDS_IMPROVEMENT` | `'needs-improvement'` | `src/components/admin/telemetry/WebVitalsPanel.tsx` |
| `SOCIAL_LOGIN_LOG_SCOPE` | `"social-login"` | `src/components/auth/SocialLoginButtons.tsx` |
| `MAX_RECENT` | `5` | `src/components/cart/CartCompanyPickerDialog.tsx` |
| `PAGE_SIZE` | `100` | `src/components/cart/cart-company-options.ts` |
| `OPEN_SPOTLIGHT_EVENT` | `"sicoob:enhanced-spotlight:open"` | `src/components/common/EnhancedSpotlight.tsx` |
| `GLASS_BORDER` | `"border border-white/20 dark:border-white/10"` | `src/components/common/GlassElements.tsx` |
| `PULSE_ANIMATION` | `'animate-pulse'` | `src/components/common/IntelligenceBadges.tsx` |
| `PRIMARY_TONE` | `"bg-primary/10 text-primary"` | `src/components/common/SocialProof.tsx` |
| `WARNING_TONE` | `"bg-warning/10 text-warning"` | `src/components/common/SocialProof.tsx` |
| `PRIMARY_TEXT` | `"text-primary"` | `src/components/common/SocialProof.tsx` |
| `SUCCESS_TEXT` | `"text-success"` | `src/components/common/SocialProof.tsx` |
| `INFO_BACKGROUND` | `"bg-info/10"` | `src/components/common/StatusTimeline.tsx` |
| `CACHE_TTL_MS` | `30` | `src/components/compare/AIComparisonAdvisor.tsx` |
| `OUT_OF_STOCK` | `"out-of-stock"` | `src/components/compare/CompareTableView.tsx` |
| `LOWER_IS_BETTER` | `"lower-is-better"` | `src/components/compare/ComparisonHighlights.tsx` |
| `VISUALIZATION_GROUP` | `"Visualização"` | `src/components/compare/ComparisonShortcutsCheatsheet.tsx` |
| `SUCCESS_TEXT` | `"text-success"` | `src/components/compare/SupplierComparisonModal.tsx` |
| `PAGE_SIZE` | `100` | `src/components/dashboard/MyClientsWidget.tsx` |
| `PAGE_SIZE` | `20` | `src/components/dashboard/MyDiscountRequestsWidget.tsx` |
| `PAGE_SIZE` | `20` | `src/components/dashboard/MyPendingOrdersWidget.tsx` |
| `PAGE_SIZE` | `20` | `src/components/dashboard/MyRecentQuotesWidget.tsx` |
| `PRIMARY_TEXT` | `"text-primary"` | `src/components/dashboard/QuickActionsPanel.tsx` |
| `MAX_AUTO_RETRIES` | `2` | `src/components/errors/EnhancedErrorBoundary.tsx` |
| `PRICE_PRESETS_COUNT` | `4` | `src/components/expert/FlowFilterPanel.tsx` |
| `ACTIVE_ORANGE_BORDER` | `'border-orange/60'` | `src/components/filters/FilterPanel.tsx` |
| `PT_BR` | `"pt-BR"` | `src/components/intelligence/MarketIntelligenceChart.tsx` |
| `TEXT_DESTRUCTIVE` | `"text-destructive"` | `src/components/intelligence/MarketIntelligenceChart.tsx` |
| `WINDOW_MS` | `5` | `src/components/intelligence/RealtimeBadge.tsx` |
| `UNMET_DEMAND_PAGE_SIZE` | `500` | `src/components/intelligence/unmet-demand-query.ts` |
| `DESTRUCTIVE_TEXT` | `'text-destructive'` | `src/components/inventory/StockUI.tsx` |
| `DESTRUCTIVE_TEXT` | `"text-destructive"` | `src/components/inventory/rows/VariantRow.tsx` |
| `ECONOMY_FREIGHT_LIMIT_G` | `5000` | `src/components/kit-builder/KitConflictAlerts.tsx` |
| `MAX_SIZE_MB` | `25` | `src/components/mockup/ArtFileUpload.tsx` |
| `ART_FILES_BUCKET` | `"mockup-art-files"` | `src/components/mockup/ArtFileUpload.tsx` |
| `ITEMS_PER_PAGE` | `12` | `src/components/mockup/MockupHistoryPanel.tsx` |
| `PLACEHOLDER_IMAGE` | `'/placeholder.svg'` | `src/components/mockup/MockupProductSelector.tsx` |
| `SQUARE_SKELETON` | `"aspect-square rounded-xl"` | `src/components/mockup/MockupSkeleton.tsx` |
| `LIGHT_BORDER` | `"1px solid #e8e8e8"` | `src/components/mockup/approval/MockupApprovalTemplate.tsx` |
| `FLEX_START` | `"flex-start"` | `src/components/mockup/approval/MockupApprovalTemplate.tsx` |
| `GREEN` | `"#00c853"` | `src/components/mockup/approval/MockupApprovalTemplate.tsx` |
| `DARK` | `"#000000"` | `src/components/mockup/approval/MockupApprovalTemplate.tsx` |
| `DEFAULT_PREFETCH_DEBOUNCE_MS` | `200` | `src/components/notifications/NotificationDrawer.tsx` |
| `SPARK_W` | `160` | `src/components/notifications/NotificationsBadgeStatsPanel.tsx` |
| `SPARK_H` | `24` | `src/components/notifications/NotificationsBadgeStatsPanel.tsx` |
| `SPARK_WINDOW_SECONDS` | `60` | `src/components/notifications/badge-stats/useNotificationsMetricsPanel.ts` |
| `SUSPICIOUS_RATIO_THRESHOLD` | `0.7` | `src/components/notifications/badge-stats/useNotificationsMetricsPanel.ts` |
| `SUSPICIOUS_STREAK_SECONDS` | `10` | `src/components/notifications/badge-stats/useNotificationsMetricsPanel.ts` |
| `DEFAULT_STOCK_STATUS` | `"in-stock"` | `src/components/novelties/NoveltyCards.tsx` |
| `LOW_STOCK_STATUS` | `"low-stock"` | `src/components/novelties/NoveltyCards.tsx` |
| `OUT_OF_STOCK_STATUS` | `"out-of-stock"` | `src/components/novelties/NoveltyCards.tsx` |
| `TOOLTIP_WIDTH` | `320` | `src/components/onboarding/OnboardingTour.tsx` |
| `TOOLTIP_HEIGHT` | `200` | `src/components/onboarding/OnboardingTour.tsx` |
| `TOOLTIP_PADDING` | `16` | `src/components/onboarding/OnboardingTour.tsx` |
| `LIGHT_BORDER` | `"1px solid #eee"` | `src/components/pdf/ProposalSections.tsx` |
| `GREEN` | `"#00c853"` | `src/components/pdf/ProposalStyles.ts` |
| `GREEN_DARK` | `"#009e41"` | `src/components/pdf/ProposalStyles.ts` |
| `DARK` | `"#333333"` | `src/components/pdf/ProposalStyles.ts` |
| `BLUE` | `"#0085ca"` | `src/components/pdf/ProposalStyles.ts` |
| `PAGE_W` | `794` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `PAGE_H` | `1123` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `FIRST_HEADER_H` | `128` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `CONT_HEADER_H` | `60` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `CONT_CLIENT_H` | `60` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `SIMPLE_FOOTER_H` | `30` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `NOTES_FOOTER_H` | `230` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `CONTENT_PAD` | `36` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `CLIENT_BAR_H` | `90` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `TOTALS_H` | `180` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `NOTES_H` | `310` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `TABLE_HEADER_H` | `38` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `ROW_H` | `76` | `src/components/pdf/PropostaComercialTailwind.tsx` |
| `MAX_ENGRAVINGS` | `5` | `src/components/pricing/ProductPriceSimulator.tsx` |
| `TIER_PROXIMITY_THRESHOLD` | `0.3` | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `TIER_HIGH_PRIORITY_THRESHOLD` | `0.15` | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| `STOCK_IN` | `'in-stock'` | `src/components/products/ProductCard.tsx` |
| `STOCK_LOW` | `'low-stock'` | `src/components/products/ProductCard.tsx` |
| `STOCK_OUT` | `'out-of-stock'` | `src/components/products/ProductCard.tsx` |
| `PRODUCT_IMAGE_BUCKET` | `'personalization-images'` | `src/components/products/ProductCardImage.tsx` |
| `NONE_SIZE` | `"__none__"` | `src/components/products/VariantGridMatrix.tsx` |
| `CELL_COMPACT` | `"px-2 py-1.5"` | `src/components/products/VariantGridMatrix.tsx` |
| `CELL_REGULAR` | `"px-3 py-2"` | `src/components/products/VariantGridMatrix.tsx` |
| `SELECTED_ROW` | `"bg-primary/5"` | `src/components/products/VariantGridMatrix.tsx` |
| `ADMIN_COMPACT` | `"px-1 py-1.5"` | `src/components/products/VariantGridMatrix.tsx` |
| `LEFT_ADMIN` | `"left-8 z-10"` | `src/components/products/VariantGridMatrix.tsx` |
| `LEFT_VIEW` | `"left-0 z-10"` | `src/components/products/VariantGridMatrix.tsx` |
| `COMPACT_CELL` | `"py-2.5"` | `src/components/products/inline-price/PriceTiersTable.tsx` |
| `DEFAULT_CELL` | `"py-3"` | `src/components/products/inline-price/PriceTiersTable.tsx` |
| `DEFAULT_TEXT_CELL` | `"py-3 font-medium text-sm"` | `src/components/products/inline-price/PriceTiersTable.tsx` |
| `TEXT_RIGHT` | `"text-right"` | `src/components/products/inline-price/PriceTiersTable.tsx` |
| `PLACEHOLDER_IMAGE` | `'/placeholder.svg'` | `src/components/products/quick-view/QuickViewGallery.tsx` |
| `BUBBLE_TEXT` | `"hsl(0, 0%, 91%)"` | `src/components/products/share/WhatsAppPreview.tsx` |
| `META_TEXT` | `"hsla(0, 0%, 100%, 0.45)"` | `src/components/products/share/WhatsAppPreview.tsx` |
| `BUBBLE_OUT` | `"hsl(153, 18%, 18%)"` | `src/components/products/share/WhatsAppPreview.tsx` |
| `BRAZIL_COUNTRY_CODE` | `"55"` | `src/components/products/share/whatsapp.ts` |
| `MAX_MARKUP` | `50` | `src/components/quote/NegotiationMarkupCard.tsx` |
| `COMPANY_PAGE_SIZE` | `100` | `src/components/quotes/company-contact/CompanySearchDropdown.tsx` |
| `COMPANY_MAX_PAGES` | `5` | `src/components/quotes/company-contact/CompanySearchDropdown.tsx` |
| `MAX_ENTRIES` | `50` | `src/components/search/searchCache.ts` |
| `TTL_MS` | `60` | `src/components/search/searchCache.ts` |
| `SEMANTIC_SEARCH_TIMEOUT_MS` | `8000` | `src/components/search/useGlobalSearch.ts` |
| `CONNECTION_DIST` | `120` | `src/components/search/voice/FloatingParticles.tsx` |
| `SIZE` | `220` | `src/components/search/voice/VoiceOrb.tsx` |
| `TEST_NOTIFICATION_TITLE` | `'Teste de notificação'` | `src/components/security/PushNotificationSettings.tsx` |
| `TEST_NOTIFICATION_BODY` | `'Esta é uma notificação de teste do sistema de segurança.'` | `src/components/security/PushNotificationSettings.tsx` |
| `PRIMARY_FOREGROUND_TEXT` | `'text-primary-foreground'` | `src/components/simulator/TechniqueCard.tsx` |
| `PRIMARY_BACKGROUND` | `'bg-primary'` | `src/components/simulator/TechniqueCardHelpers.tsx` |
| `PRIMARY_TEXT` | `'text-primary'` | `src/components/simulator/TechniqueCardHelpers.tsx` |
| `ITEM_HEIGHT` | `100` | `src/components/simulator/wizard/StepProduct.tsx` |
| `ROW_GAP` | `12` | `src/components/simulator/wizard/StepProduct.tsx` |
| `COLUMNS` | `3` | `src/components/simulator/wizard/StepProduct.tsx` |
| `PRIMARY_TEXT` | `"text-primary"` | `src/components/ui/EmptyState.tsx` |
| `INFO_STATUS` | `"bg-info/10 text-info border border-info/20"` | `src/components/ui/StatusBadge.tsx` |
| `SUCCESS_STATUS` | `"bg-success/10 text-success border border-success/20"` | `src/components/ui/StatusBadge.tsx` |
| `SIDEBAR_COOKIE_MAX_AGE` | `60` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH` | `"16rem"` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH_MOBILE` | `"18rem"` | `src/components/ui/sidebar.tsx` |
| `PRIMARY_BACKGROUND` | `"bg-primary/10"` | `src/components/workflows/workflowConstants.ts` |
| `SIDEBAR_TOUR_SELECTOR` | `"[data-tour='` | `src/constants/onboarding.ts` |
| `REFRESH_SESSION_LOG_CONTEXT` | `"AuthContext.refreshSession"` | `src/contexts/AuthContext.tsx` |
| `FETCH_USER_DATA_LOG_CONTEXT` | `"AuthContext.fetchUserData"` | `src/contexts/AuthContext.tsx` |
| `BRIDGE_LIMIT` | `50` | `src/contexts/ProductsContext.tsx` |
| `CHURRASCO_LABEL` | `'Churrasco'` | `src/data/mock-match-products.ts` |
| `OFFICE_LABEL` | `'Escritório'` | `src/data/mock-match-products.ts` |
| `FATHERS_DAY` | `'Dia dos Pais'` | `src/data/mock-match-products.ts` |
| `FOOD_SEGMENT` | `'Alimentação'` | `src/data/mock-match-products.ts` |
| `END_OF_YEAR` | `'Fim de Ano'` | `src/data/mock-match-products.ts` |
| `INTEGRATION` | `'Integração'` | `src/data/mock-match-products.ts` |
| `QUALITY_OF_LIFE` | `'Qualidade de Vida'` | `src/data/mock-match-products.ts` |
| `HYDRATION` | `'Hidratação'` | `src/data/mock-match-products.ts` |
| `MOTHERS_DAY` | `'Dia das Mães'` | `src/data/mock-match-products.ts` |
| `LABOR_DAY` | `'DIA DO TRABALHADOR'` | `src/data/mockData.ts` |
| `ONBOARDING_KIT` | `'ONBOARDING \| KIT BOAS-VINDAS'` | `src/data/mockData.ts` |
| `WORKPLACE_SAFETY` | `'CIPA \| SIPAT'` | `src/data/mockData.ts` |
| `AWARD_CAMPAIGN` | `'PREMIAÇÃO \| INCENTIVO'` | `src/data/mockData.ts` |
| `QUALITY_OF_LIFE` | `'QUALIDADE DE VIDA'` | `src/data/mockData.ts` |
| `SALES_CONVENTION` | `'CONVENÇÃO DE VENDAS'` | `src/data/mockData.ts` |
| `OFFICE_SEGMENT` | `'Escritório'` | `src/data/mockData.ts` |
| `TOAST_LIMIT` | `1` | `src/hooks/use-toast.ts` |
| `TOAST_REMOVE_DELAY` | `1000000` | `src/hooks/use-toast.ts` |
| `MAX_RETRIES` | `2` | `src/hooks/useAIRecommendations.ts` |
| `INITIAL_BACKOFF_MS` | `500` | `src/hooks/useAIRecommendations.ts` |
| `UNKNOWN_ERROR_MESSAGE` | `'Erro desconhecido'` | `src/hooks/useAllowedIPs.ts` |
| `AUTO_SAVE_VERSION` | `1` | `src/hooks/useAutoSave.ts` |
| `AUTO_SAVE_RETENTION_MS` | `30` | `src/hooks/useAutoSave.ts` |
| `TOAST_ID_DEGRADED` | `'bridge-degraded'` | `src/hooks/useBridgeStatusBanner.ts` |
| `TOAST_ID_UNAVAILABLE` | `'bridge-unavailable'` | `src/hooks/useBridgeStatusBanner.ts` |
| `PAGE_SIZE` | `1000` | `src/hooks/useCatalogMarketing.ts` |
| `MAX_PAGES` | `100` | `src/hooks/useCatalogMarketing.ts` |
| `RELATION_PAGE_SIZE` | `500` | `src/hooks/useCatalogRelationFilters.ts` |
| `MAX_RELATION_RECORDS` | `100` | `src/hooks/useCatalogRelationFilters.ts` |
| `TICKET_WINDOW_DAYS` | `90` | `src/hooks/useClientsPortfolioKpis.ts` |
| `PAGE_SIZE` | `1000` | `src/hooks/useClientsPortfolioKpis.ts` |
| `MAX_PAGES` | `50` | `src/hooks/useClientsPortfolioKpis.ts` |
| `HEALTHY_INTERVAL` | `60` | `src/hooks/useCloudStatus.ts` |
| `DOWN_AUTO_STOP_MS` | `30` | `src/hooks/useCloudStatus.ts` |
| `CHUNK_SIZE` | `80` | `src/hooks/useColorEnrichment.ts` |
| `EXTERNAL_DB_BRIDGE_FUNCTION` | `'external-db-bridge'` | `src/hooks/useColorSystem.ts` |
| `FILTER_VARIANT_LIMIT` | `10` | `src/hooks/useCommemorativeDates.ts` |
| `ORDER_ITEMS_TABLE` | `'order_items'` | `src/hooks/useCommercialIntelligence.ts` |
| `PRODUCT_ID_COLUMN` | `'product_id'` | `src/hooks/useCommercialIntelligence.ts` |
| `ORDER_VALUE_FIELDS` | `'order_id, quantity, unit_price'` | `src/hooks/useCommercialIntelligence.ts` |
| `CATEGORY_PAGE_SIZE` | `1000` | `src/hooks/useCommercialIntelligence.ts` |
| `CATEGORY_FILTER_CHUNK_SIZE` | `100` | `src/hooks/useCommercialIntelligence.ts` |
| `CATEGORY_MAX_EXTERNAL_ROWS` | `100000` | `src/hooks/useCommercialIntelligence.ts` |
| `CATALOG_PAGE_SIZE` | `500` | `src/hooks/useCommercialIntelligence.ts` |
| `MAX_COMPARE_ITEMS` | `4` | `src/hooks/useComparison.ts` |
| `GO_TO_QUOTES_SUGGESTION` | `'ir para orçamentos'` | `src/hooks/useContextualSuggestions.ts` |
| `GO_TO_CATALOG_SUGGESTION` | `'ir para catálogo'` | `src/hooks/useContextualSuggestions.ts` |
| `DIRECTORY_PAGE` | `100` | `src/hooks/useCrmCompanies.ts` |
| `DIRECTORY_CAP` | `200` | `src/hooks/useCrmCompanies.ts` |
| `PRODUCT_IMAGE_SELECT` | `'product_id, url_cdn, image_type, is_primary, display_order'` | `src/hooks/useExternalSimulator.ts` |
| `PRODUCT_IMAGES_WARNING` | `'Não foi possível buscar imagens da tabela product_images:'` | `src/hooks/useExternalSimulator.ts` |
| `VARIANT_IMAGE_BUCKET` | `'personalization-images'` | `src/hooks/useExternalVariantStock.ts` |
| `NOT_AUTHENTICATED_ERROR` | `"not-authenticated"` | `src/hooks/useFavoriteLists.ts` |
| `UNKNOWN_ERROR_MESSAGE` | `'Erro desconhecido'` | `src/hooks/useGeoBlocking.ts` |
| `AUTO_SAVE_DELAY_MS` | `5000` | `src/hooks/useKitAutoSave.ts` |
| `FALHA_GENERICA` | `'Não foi possível salvar o kit automaticamente.'` | `src/hooks/useKitAutoSave.ts` |
| `BUFFER_DAYS` | `3` | `src/hooks/useKitStockForecast.ts` |
| `MAX_HISTORY` | `30` | `src/hooks/useKitUndoRedo.ts` |
| `MAX_ATTEMPTS` | `5` | `src/hooks/useLoginRateLimit.ts` |
| `LOCKOUT_MS` | `5` | `src/hooks/useLoginRateLimit.ts` |
| `ID_AND_UPDATED_AT_SELECT` | `"id, updated_at"` | `src/hooks/useMagicUpState.ts` |
| `PAGE_SIZE` | `5000` | `src/hooks/useMarketIntelligenceMacro.ts` |
| `MAX_ROWS` | `60000` | `src/hooks/useMarketIntelligenceMacro.ts` |
| `AUTO_SAVE_DELAY` | `2000` | `src/hooks/useMockupDraft.ts` |
| `NOVELTY_WINDOW_DAYS` | `30` | `src/hooks/useNovelties.ts` |
| `UNKNOWN_ERROR_MESSAGE` | `'Erro desconhecido'` | `src/hooks/usePasswordResetRequests.ts` |
| `EXTERNAL_DB_BRIDGE_FUNCTION` | `'external-db-bridge'` | `src/hooks/usePrintAreas.ts` |
| `PRODUCT_IMAGE_BUCKET` | `'personalization-images'` | `src/hooks/useProductImages.ts` |
| `SEGMENT_LOOKUP_CHUNK` | `8` | `src/hooks/useProductInsights.ts` |
| `SEGMENT_LOOKUP_CAP` | `60` | `src/hooks/useProductInsights.ts` |
| `BRIDGE_TABLE` | `'variant_supplier_sources'` | `src/hooks/useProductSupplierSources.ts` |
| `CATALOG_INITIAL_PAGE_SIZE` | `100` | `src/hooks/useProductsLightweight.ts` |
| `CATALOG_PAGE_SIZE` | `800` | `src/hooks/useProductsLightweight.ts` |
| `CATALOG_BATCH_PAGES` | `2` | `src/hooks/useProductsLightweight.ts` |
| `MAX_RECENT_PRODUCTS` | `5` | `src/hooks/useRecentProducts.ts` |
| `REPLENISHMENT_WINDOW_DAYS` | `30` | `src/hooks/useReplenishments.ts` |
| `MIN_REPLENISHMENT_DELTA_MS` | `86` | `src/hooks/useReplenishments.ts` |
| `DEFAULT_MS` | `3000` | `src/hooks/useRetestCooldownSetting.ts` |
| `DATA_STATE_ATTRIBUTE` | `'data-state'` | `src/hooks/useScrollLockFix.ts` |
| `MAX_ENTRIES` | `50` | `src/hooks/useScrollRestoration.ts` |
| `MAX_HISTORY` | `10` | `src/hooks/useSearch.ts` |
| `SIMULATOR_CLIENTS_PAGE` | `100` | `src/hooks/useSimulation.ts` |
| `SIMULATOR_CLIENTS_MAX` | `500` | `src/hooks/useSimulation.ts` |
| `STEP_UP_VERIFY_FUNCTION` | `"step-up-verify"` | `src/hooks/useStepUpAuth.ts` |
| `UNPOPULATED_VIEW_MESSAGE` | `'not been populated'` | `src/hooks/useStockHistory.ts` |
| `MAX_STACK` | `10` | `src/hooks/useUndoStack.ts` |
| `TTL_MS` | `30` | `src/hooks/useUndoStack.ts` |
| `ERROR_RESET_DELAY_MS` | `5000` | `src/hooks/useVoiceAgent.ts` |
| `PROCESSING_ERROR_RESET_DELAY_MS` | `3000` | `src/hooks/useVoiceAgent.ts` |
| `SESSION_START_TIMEOUT_MS` | `4000` | `src/hooks/useVoiceAgent.ts` |
| `MAX_HISTORY` | `100` | `src/hooks/useVoiceCommandHistory.ts` |
| `RECENT_LIMIT` | `5` | `src/hooks/useVoiceCommandHistory.ts` |
| `FREQUENT_LIMIT` | `6` | `src/hooks/useVoiceCommandHistory.ts` |
| `CACHE_TTL_MS` | `60` | `src/hooks/useWorkspaceNotifications.tsx` |
| `PREFETCH_MIN_INTERVAL_MS` | `5` | `src/hooks/useWorkspaceNotifications.tsx` |
| `DAY_MS` | `86400000` | `src/hooks/bi/useClientBI.ts` |
| `WINDOW_MONTHS` | `24` | `src/hooks/bi/useClientSeasonality.ts` |
| `MIN_SECTOR_COMPANIES` | `3` | `src/hooks/bi/useClientSeasonality.ts` |
| `THRESHOLD` | `15` | `src/hooks/bi/useClientVsIndustry.ts` |
| `MIN_SAMPLE` | `3` | `src/hooks/bi/useClientVsIndustry.ts` |
| `DAYS_WINDOW` | `180` | `src/hooks/bi/useClientVsIndustry.ts` |
| `MIN_SECTOR_COMPANIES` | `3` | `src/hooks/bi/useIndustryTrends.ts` |
| `RPC_ROW_LIMIT` | `1000` | `src/hooks/bi/useIndustryTrends.ts` |
| `MAX_TRENDS` | `10` | `src/hooks/bi/useIndustryTrends.ts` |
| `ITEMS_PER_PAGE` | `24` | `src/hooks/catalog/useCatalogPagination.ts` |
| `MOBILE_BREAKPOINT` | `768` | `src/hooks/common/use-mobile.tsx` |
| `MAX_VISIBLE` | `60` | `src/hooks/dev/useBridgeMetrics.ts` |
| `MOCKUP_ART_BUCKET` | `'mockup-art-files'` | `src/hooks/mockup/mockupGenerationService.ts` |
| `MAX_SIZE` | `10` | `src/hooks/orders/extensions/useOrderInvoices.ts` |
| `SICOOB_FINANCIAL_TIME_ZONE` | `'America/Sao_Paulo'` | `src/hooks/orders/extensions/useOrderPayments.ts` |
| `ARTWORK_BUCKET` | `'sicoob-order-documents'` | `src/hooks/orders/extensions/useOrderPilotApprovals.ts` |
| `MAX_ARTWORK_BYTES` | `20` | `src/hooks/orders/extensions/useOrderPilotApprovals.ts` |
| `QUOTE_LOAD_NOT_FOUND` | `"Orçamento não encontrado ou sem permissão de acesso."` | `src/hooks/quote/useQuoteInitialization.ts` |
| `MAX_SUGGESTED_PRODUCTS` | `20` | `src/hooks/quote/useQuoteInitialization.ts` |
| `MAX_HISTORY` | `30` | `src/hooks/simulator/useUndoRedo.ts` |
| `SESSION_TTL` | `2` | `src/hooks/simulator/useWizardPersistence.ts` |
| `EXTERNAL_DB_BRIDGE_FUNCTION` | `'external-db-bridge'` | `src/hooks/tecnicas/useTecnicasList.ts` |
| `CACHE_TTL_MS` | `12` | `src/hooks/voice/scribeTokenCache.ts` |
| `MAX_ENTRIES` | `5` | `src/hooks/voice/useVoiceHistory.ts` |
| `EXPERT_CHAT_MAX_MESSAGES` | `30` | `src/lib/assistant-message-window.ts` |
| `EXPERT_CHAT_MAX_CONTENT_LENGTH` | `30` | `src/lib/assistant-message-window.ts` |
| `EXPERT_CHAT_MAX_MESSAGE_LENGTH` | `5` | `src/lib/assistant-message-window.ts` |
| `WINDOW_MS` | `30` | `src/lib/chunk-recovery.ts` |
| `MAX_HARD_RELOADS` | `2` | `src/lib/chunk-recovery.ts` |
| `CACHE_MS` | `15` | `src/lib/cloud-status.ts` |
| `HIGH_LATENCY_MS` | `2000` | `src/lib/cloud-status.ts` |
| `CONSECUTIVE_FAILURE_THRESHOLD` | `3` | `src/lib/connections-config.ts` |
| `CRM_DB_BRIDGE_FUNCTION` | `"crm-db-bridge"` | `src/lib/crm-db.ts` |
| … +185 linhas — lista completa em `context.json` | | |

### H.2 Prazos, expirações e janelas de tempo

| Trecho | Arquivo |
|---|---|
| `expect: { timeout: 15_000 },` | `playwright.config.ts` |
| `timeout: 120_000,` | `playwright.config.ts` |
| `timeout: 45_000,` | `playwright.config.ts` |
| `expect: { timeout: 15_000 },` | `playwright.pwa.config.ts` |
| `timeout: 180_000,` | `playwright.pwa.config.ts` |
| `timeout: 60_000,` | `playwright.pwa.config.ts` |
| `setTimeout(() => setAnnouncement(null), 1000);` | `src/components/a11y/AccessibilityProvider.tsx` |
| `const timer = setTimeout(() => setAssertiveMessage(""), 1000);` | `src/components/a11y/AriaLive.tsx` |
| `const timer = setTimeout(() => setPoliteMessage(""), 1000);` | `src/components/a11y/AriaLive.tsx` |
| `setTimeout(() => setProgressMessage(""), 1500);` | `src/components/a11y/AriaLive.tsx` |
| `setTimeout(() => setStatusMessage(""), 1000);` | `src/components/a11y/AriaLive.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/access/DevAccessDeniedPage.tsx` |
| `const t = setTimeout(() => setHighlightId(null), 2500);` | `src/components/admin/connections/ConnectionTestHistoryPanel.tsx` |
| `const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;` | `src/components/admin/connections/ConnectionTimelineDrawer.tsx` |
| `setTimeout(() => setCopied(false), 1500);` | `src/components/admin/connections/FieldSourceDrillDownDialog.tsx` |
| `const dayMs = 24 * 60 * 60 * 1000;` | `src/components/admin/connections/InboundEventsPanel.tsx` |
| `const since = new Date(Date.now() - PERIOD_HOURS[period] * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/InboundEventsPanel.tsx` |
| `const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/IntegrationsHealthCard.tsx` |
| `const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/IntegrationsHealthCard.tsx` |
| `const sinceLastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/IntegrationsHealthCard.tsx` |
| `const maxMs = FULL_SCOPE_MAX_TTL_DAYS * 24 * 60 * 60 * 1000;` | `src/components/admin/connections/IssueMcpKeyForm.tsx` |
| `const days = Math.floor(ms / (24 * 60 * 60 * 1000));` | `src/components/admin/connections/McpTab.tsx` |
| `normTimerRef.current = setTimeout(() => setLastNormalization(null), 4000);` | `src/components/admin/connections/SecretField.tsx` |
| `const t = window.setTimeout(() => { ping(); }, 1200);` | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| `const TTL_MS = 30 * 60 * 1000; // 30 minutos` | `src/components/admin/connections/useFocusContext.ts` |
| `const WINDOW_MS = 72 * 60 * 60 * 1000;` | `src/components/admin/connections/useIncidentTimeline72h.ts` |
| `const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/usePulseBarStatus.ts` |
| `const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/usePulseBarStatus.ts` |
| `const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/connections/useRecentIncidents.ts` |
| `const SNOOZE_MS = 60 * 60 * 1000; // 1h` | `src/components/admin/connections/useSeverityChangeNotifier.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/components/admin/personalization/usePersonalizationData.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/components/admin/personalization-manager/usePersonalizationManager.ts` |
| `const productsQuery = useQuery({ queryKey: ["all-products-promobrind-full"], queryFn: async () => { const { fetchPromobrindProducts } = await import('@/lib/exte …` | `src/components/admin/product-groups/useProductGroups.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/ProductMaterialsSection.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/ProductRamosSection.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/ProductTagsSection.tsx` |
| `staleTime: 2 * 60 * 1000,` | `src/components/admin/products/ProductVariationAxesConfig.tsx` |
| `staleTime: 2 * 60 * 1000,` | `src/components/admin/products/useProductVariants.ts` |
| `if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) { localStorage.removeItem(draftKey); return; }` | `src/components/admin/products/hooks/useProductFormDraft.ts` |
| `staleTime: 2 * 60 * 1000,` | `src/components/admin/products/image-gallery/useProductImageGallery.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/image-gallery/useProductImageGallery.ts` |
| `const { data: media = [], isLoading } = useQuery({ queryKey: ['component-media', componentId], queryFn: () => fetchComponentMedia(componentId), enabled: enabled …` | `src/components/admin/products/kit-components/ComponentMediaManager.tsx` |
| `gcTime: 15 * 60 * 1000,` | `src/components/admin/products/kit-components/PrintAreasManager.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/kit-components/PrintAreasManager.tsx` |
| `gcTime: 15 * 60 * 1000,` | `src/components/admin/products/kit-components/ProductKitComponentsSection.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/kit-components/ProductKitComponentsSection.tsx` |
| `const diff = Math.round((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));` | `src/components/admin/products/sections/ProductFlagsSection.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/components/admin/products/sections/engraving/useEngravingWizard.ts` |
| `setTimeout(() => { cleanup(); resolve(null); }, 10000);` | `src/components/admin/products/video-gallery/types.ts` |
| `staleTime: 2 * 60 * 1000,` | `src/components/admin/products/video-gallery/useProductVideoGallery.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/components/admin/products/video-gallery/useProductVideoGallery.ts` |
| `const expiresAt = new Date(base.getTime() + 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/security/ActiveIpsList.tsx` |
| `const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/security/AnomalyCards.tsx` |
| `const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/security/AutoDefenseTab.tsx` |
| `const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/security/HardeningTrendChart.tsx` |
| `const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/security/SuspiciousTokensPanel.tsx` |
| `const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/components/admin/security/TopOffenderIpsCard.tsx` |
| `const days = Math.floor(ms / (24 * 60 * 60 * 1000));` | `src/components/admin/security/keys/McpKeyRow.tsx` |
| `const maxMs = FULL_SCOPE_MAX_TTL_DAYS * 24 * 60 * 60 * 1000;` | `src/components/admin/security/keys/UpdateMcpKeyDialog.tsx` |
| `setTimeout(() => setCopied(null), 1500);` | `src/components/admin/telemetry/BridgeCallDetailDrawer.tsx` |
| `: 6 * 60 * 60 * 1000; // 7d` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `: timeFilter === "24h" ? 60 * 60 * 1000` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `: timeFilter === "6h" ? 30 * 60 * 1000` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `const bucketMs = timeFilter === "1h" ? 5 * 60 * 1000` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/components/bi/BundleSuggestions.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/components/bi/ClientLookalikes.tsx` |
| `staleTime: 15 * 60 * 1000,` | `src/components/cart/CartCompanyPicker.tsx` |
| `staleTime: 15 * 60 * 1000,` | `src/components/cart/CartCompanyPickerDialog.tsx` |
| `setTimeout(() => { onOpenChange(false); onDone?.(); }, 1000);` | `src/components/catalog/BulkAddToCartModal.tsx` |
| `staleTime: 30 * 60 * 1000,` | `src/components/collections/CollectionsEmptyStateSmart.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/collections/CollectionsHeatmap.tsx` |
| `setTimeout(() => this.setState({ copied: false }), 3000);` | `src/components/common/ErrorBoundary.tsx` |
| `const CACHE_TTL_MS = 30 * 60 * 1000;` | `src/components/compare/AIComparisonAdvisor.tsx` |
| `const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();` | `src/components/compare/PriceSparkline.tsx` |
| `setTimeout(() => setCopied(false), 2500);` | `src/components/compare/ShareComparisonDialog.tsx` |
| `{ enabled: !!primaryCategory, staleTime: 10 * 60 * 1000 }` | `src/components/compare/SimilarProductsRail.tsx` |
| `setTimeout(() => this.setState({ copied: false }), 2000);` | `src/components/errors/EnhancedErrorBoundary.tsx` |
| `setTimeout(() => setCopiedId(null), 2000);` | `src/components/expert/chat/useExpertChat.ts` |
| `staleTime: 15 * 60 * 1000,` | `src/components/favorites/FavoritesClientPicker.tsx` |
| `staleTime: 30 * 60 * 1000,` | `src/components/favorites/FavoritesEmptyStateSmart.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/favorites/FavoritesHeatmap.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/favorites/ShareListDialog.tsx` |
| `const WINDOW_MS = 5 * 60 * 1000;` | `src/components/intelligence/RealtimeBadge.tsx` |
| `const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));` | `src/components/inventory/FutureStockDialog.tsx` |
| `return Math.ceil(diff / (1000 * 60 * 60 * 24));` | `src/components/inventory/FutureStockDialog.tsx` |
| `const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);` | `src/components/inventory/StockAlertsIndicator.tsx` |
| `useEffect(() => { void fetchAll(); const interval = setInterval(() => void fetchAll(), 5 * 60 * 1000); return () => clearInterval(interval); }, [fetchAll]);` | `src/components/inventory/StockAlertsIndicator.tsx` |
| `setTimeout(() => setLastError(null), 3000);` | `src/components/kit-builder/ItemSelector.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/kit-builder/KitHealthCard.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/kit-builder/KitPresentablePreview.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/kit-builder/KitShareLinkDialog.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/components/kit-builder/VariantSelector.tsx` |
| `const diffDays = (Date.now() - new Date(mockup.created_at).getTime()) / (1000 * 60 * 60 * 24);` | `src/components/mockup/MockupHistoryPanel.tsx` |
| `const timer = setTimeout(() => setShowSuccess(false), 3000);` | `src/components/mockup/MockupResultCard.tsx` |
| `setTimeout(resolve, 8000);` | `src/components/mockup/approval/OffscreenLayoutCapture.tsx` |
| `const timer = setTimeout(() => setShouldShake(false), 1000);` | `src/components/notifications/NotificationDrawer.tsx` |
| `window.setTimeout(() => el.removeAttribute("data-jump-flash"), 1500);` | `src/components/notifications/NotificationsBadgeStatsPanel.tsx` |
| `setTimeout(() => URL.revokeObjectURL(url), 1000);` | `src/components/notifications/badge-stats/utils.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/components/personalization/TechniqueSelector.tsx` |
| `cursorTimer.current = setTimeout(() => setCursorHidden(true), 3000);` | `src/components/presentation/PresentationMode.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/pricing/ProductPriceSimulator.tsx` |
| `setTimeout(() => setCopied(null), 2000);` | `src/components/pricing/simulator/MultiEngravingResult.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/pricing/simulator/PriceResultV51.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/pricing/simulator/QuantityAndResult.tsx` |
| `setTimeout(() => { setIsAdded(false); setIsOpen(false); setQuantity(minQuantity); setSelectedVariant(undefined); }, 1200);` | `src/components/products/QuickAddToQuote.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/products/ShareActions.tsx` |
| `setTimeout(() => setCopied(false), 1500);` | `src/components/products/kit-composition/KitComponentCard.tsx` |
| `queryKey: ["quote-company-by-id", companyId], queryFn: () => fetchCompany(companyId), enabled: Boolean(companyId), staleTime: 10 * 60 * 1000,` | `src/components/quotes/CompanyContactSelector.tsx` |
| `queryKey: ["quote-company-contacts", companyId], queryFn: () => fetchContacts(companyId), enabled: Boolean(companyId), staleTime: 5 * 60 * 1000,` | `src/components/quotes/CompanyContactSelector.tsx` |
| `try { await navigator.clipboard.writeText(link); setCopied(true); toast.success("Link copiado!"); setTimeout(() => setCopied(false), 2000); }` | `src/components/quotes/QuoteApprovalLinkCard.tsx` |
| `setTimeout(() => setStatus('idle'), 2000);` | `src/components/quotes/QuoteAutoSave.tsx` |
| `const isStale = quote.updated_at ? Date.now() - new Date(quote.updated_at).getTime() > 7 * 24 * 60 * 60 * 1000 : false;` | `src/components/quotes/QuoteKanbanBoard.tsx` |
| `const { data: companies, isLoading: loadingCompanies } = useQuery<CompanyOption[]>({ queryKey: ["quote-companies-selector"], queryFn: fetchCompanies, staleTime: …` | `src/components/quotes/company-contact/CompanySearchDropdown.tsx` |
| `const { data: serverResults, isLoading: loadingSearch } = useQuery<CompanyOption[]>({ queryKey: ["quote-companies-search", debouncedSearch], queryFn: () => sear …` | `src/components/quotes/company-contact/CompanySearchDropdown.tsx` |
| `const timer = setTimeout(() => setTimedOut(true), 10000);` | `src/components/search/VoiceSearchOverlay.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/sicoob/orders/LogisticsCommandCenter.tsx` |
| `setTimeout(() => setUploadProgress(0), 1000);` | `src/components/sicoob/orders/OrderInvoicesTab.tsx` |
| `const AUTO_SAVE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;` | `src/hooks/useAutoSave.ts` |
| `gcTime: 15 * 60 * 1000,` | `src/hooks/useCatalogMarketing.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useCatalogMarketing.ts` |
| `staleTime: 15 * 60 * 1000, // Aumentado para 15 min` | `src/hooks/useCatalogPrefetch.ts` |
| `gcTime: 60 * 60 * 1000,` | `src/hooks/useCatalogRealStats.ts` |
| `staleTime: 30 * 60 * 1000,` | `src/hooks/useCatalogRealStats.ts` |
| `gcTime: 15 * 60 * 1000,` | `src/hooks/useCatalogRelationFilters.ts` |
| `gcTime: 60 * 60 * 1000,` | `src/hooks/useCatalogRelationFilters.ts` |
| `staleTime: 30 * 60 * 1000,` | `src/hooks/useCatalogRelationFilters.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useCatalogRelationFilters.ts` |
| `setTimeout(() => fetchNextPage(), 1000);` | `src/hooks/useCatalogState.ts` |
| `staleTime: 30 * 60 * 1000, // 30 min (dados estáveis)` | `src/hooks/useCategories.ts` |
| `staleTime: 30 * 60 * 1000, // 30 min (dados estáveis)` | `src/hooks/useCategoryIcons.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useClientOrdersHistory.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/useClientTopProducts.ts` |
| `return new Date(agora.getTime() - 2 * TICKET_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();` | `src/hooks/useClientsPortfolioKpis.ts` |
| `return new Date(agora.getTime() - TICKET_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();` | `src/hooks/useClientsPortfolioKpis.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useClientsPortfolioKpis.ts` |
| `gcTime: 15 * 60 * 1000,` | `src/hooks/useColorEnrichment.ts` |
| `staleTime: 5 * 60 * 1000, // 5 minutes (reduced redundant background fetches)` | `src/hooks/useColorEnrichment.ts` |
| `gcTime: 24 * 60 * 60 * 1000, // 24 horas` | `src/hooks/useColorSystem.ts` |
| `staleTime: 60 * 60 * 1000,` | `src/hooks/useColorSystem.ts` |
| `staleTime: 60 * 60 * 1000, // 1 hora` | `src/hooks/useColorSystem.ts` |
| `gcTime: 1000 * 60 * 60, // 1 hora` | `src/hooks/useCommemorativeDates.ts` |
| `gcTime: 15 * 60 * 1000,` | `src/hooks/useCommemorativeDates.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useCommemorativeDates.ts` |
| `"24h": 24 * 60 * 60_000,` | `src/hooks/useConnectionsOverviewFilters.ts` |
| `"7d": 7 * 24 * 60 * 60_000,` | `src/hooks/useConnectionsOverviewFilters.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/useCrmCompanies.ts` |
| `staleTime: 15 * 60 * 1000,` | `src/hooks/useCrmCompanies.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useExternalCollections.ts` |
| `staleTime: 5 * 60 * 1000, // 5 minutos` | `src/hooks/useExternalCollections.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useExternalVariantStock.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useGravacaoPriceV2.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useGravacaoV2.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useKitBuilderQueries.ts` |
| `staleTime: 2 * 60 * 1000,` | `src/hooks/useKitStockForecast.ts` |
| `const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();` | `src/hooks/useLoginAttempts.ts` |
| `const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();` | `src/hooks/useLoginAttempts.ts` |
| `const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes` | `src/hooks/useLoginRateLimit.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/useMarketIntelligenceMacro.ts` |
| `gcTime: 30 * 60 * 1000, // 30 minutos` | `src/hooks/useMaterialGroups.ts` |
| `staleTime: 5 * 60 * 1000, // 5 minutos` | `src/hooks/useMaterialGroups.ts` |
| `gcTime: 30 * 60 * 1000,` | `src/hooks/useMaterialTypes.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useMaterialTypes.ts` |
| `setTimeout(() => setShowDraftRestoredNotice(false), 5000);` | `src/hooks/useMockupGenerator.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/useMockupTechniques.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useMockupTechniques.ts` |
| `const elapsed = Math.floor((now - created) / (1000 * 60 * 60 * 24));` | `src/hooks/useNovelties.ts` |
| `staleTime: 2 * 60 * 1000,` | `src/hooks/useNovelties.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useNovelties.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/usePrintAreas.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/usePrintAreas.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useProductCustomizationOptions.ts` |
| `staleTime: 15 * 60 * 1000,` | `src/hooks/useProductImages.ts` |
| `staleTime: 15 * 60 * 1000, // Aumentado para 15 min (dados estáveis)` | `src/hooks/useProductImages.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useProductInsights.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/useProductRecommendations.ts` |
| `staleTime: 15 * 60 * 1000,` | `src/hooks/useProductRecommendations.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useProductRecommendations.ts` |
| `gcTime: 30 * 60 * 1000,` | `src/hooks/useProducts.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/useProducts.ts` |
| `gcTime: 10 * 60 * 1000, // 10 minutos` | `src/hooks/useProductsByMaterial.ts` |
| `staleTime: 2 * 60 * 1000, // 2 minutos` | `src/hooks/useProductsByMaterial.ts` |
| `gcTime: 30 * 60 * 1000,` | `src/hooks/useProductsLightweight.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/useProductsLightweight.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useProdutoRamoAtividade.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/usePromoSalesRanking.ts` |
| `const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));` | `src/hooks/useQuoteBuilderState.ts` |
| `return (end - start) / (1000 * 60 * 60 * 24);` | `src/hooks/useQuoteFunnel.ts` |
| `gcTime: 10 * 60 * 1000,` | `src/hooks/useRBAC.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useRBAC.tsx` |
| `return Math.max(0, Math.floor((Date.now() - updated) / (1000 * 60 * 60 * 24)));` | `src/hooks/useReplenishments.ts` |
| `staleTime: 2 * 60 * 1000,` | `src/hooks/useReplenishments.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useReplenishments.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useSalesHistory.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useSalesHistoryMacro.ts` |
| `return new Date(now.getTime() + 24 * 60 * 60 * 1000);` | `src/hooks/useScheduledReports.ts` |
| `return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);` | `src/hooks/useScheduledReports.ts` |
| `gcTime: 5 * 60 * 1000,` | `src/hooks/useSellerCarts.ts` |
| `gcTime: 30 * 60 * 1000,` | `src/hooks/useSimilarProducts.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/useSimilarProducts.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useSimulation.ts` |
| `(window as unknown as Record<string, ReturnType<typeof setTimeout>>)[timeoutKey] = setTimeout(() => { saveToCloudMutation.mutate(updated); }, 2000);` | `src/hooks/useSimulatorPreferences.ts` |
| `staleTime: 5 * 60 * 1000, // 5 minutes` | `src/hooks/useSimulatorPreferences.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/useSparklineSales.tsx` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/useStockHistory.ts` |
| `staleTime: 30 * 60 * 1000,` | `src/hooks/useStockHistory.ts` |
| `{ enabled: !!product && !!categoryName, staleTime: 10 * 60 * 1000 }` | `src/hooks/useSupplierComparison.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useSupplierFiscalData.ts` |
| `staleTime: 60 * 60 * 1000, // 1h cache — supplier names rarely change` | `src/hooks/useSupplierNames.ts` |
| `staleTime: 10 * 60 * 1000, // 10 min cache` | `src/hooks/useSupplierSalesRanking.ts` |
| `gcTime: 30 * 60 * 1000,` | `src/hooks/useVariantStock.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/useVariantStock.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/useVariantSupplierSources.ts` |
| `const aRecency = 1 / (1 + (now - a.lastUsed.getTime()) / (1000 * 60 * 60 * 24));` | `src/hooks/useVoiceCommandHistory.ts` |
| `const bRecency = 1 / (1 + (now - b.lastUsed.getTime()) / (1000 * 60 * 60 * 24));` | `src/hooks/useVoiceCommandHistory.ts` |
| `await new Promise(r => setTimeout(r, 2000));` | `src/hooks/useWorkspaceNotifications.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/bi/useClientAffinity.ts` |
| `const ninetyDays = 90 * 24 * 60 * 60 * 1000;` | `src/hooks/bi/useClientCategoryAffinity.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/bi/useClientCategoryAffinity.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/bi/useClientSeasonality.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/bi/useClientVsIndustry.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/bi/useIndustryCategoryTrends.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/bi/useIndustryTrends.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/gravacao/useFornecedoresGravacao.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/gravacao/useTecnicasGravacao.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/gravacao/useVariantesGravacao.ts` |
| `setters.setValidUntil(fallback(quote.valid_until, format(addDays(new Date(), 30), "yyyy-MM-dd")));` | `src/hooks/quote/useQuoteInitialization.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/quote/useQuoteProductSearch.ts` |
| `staleTime: 15 * 60 * 1000, // 15 minutes` | `src/hooks/search/usePopularSearchItems.ts` |
| `const windowStart = subMonths(new Date(), 12);` | `src/hooks/sicoob/useAIOrderPredictor.ts` |
| `setTimeout(() => setCopiedId(null), 2000);` | `src/hooks/simulation/simulationClipboard.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/simulator/useSimulatorWizard.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/simulator/useWizardDrafts.ts` |
| `const SESSION_TTL = 2 * 60 * 60 * 1000; // 2 hours` | `src/hooks/simulator/useWizardPersistence.ts` |
| `staleTime: 10 * 60 * 1000,` | `src/hooks/tecnicas/useTabelasPreco.ts` |
| `const timeout = setTimeout(() => controller.abort(), 60000);` | `src/hooks/voice/playTtsAudio.ts` |
| `const timeout = setTimeout(() => controller.abort(), 15000);` | `src/hooks/voice/processTranscript.ts` |
| `const CACHE_TTL_MS = 12 * 60 * 1000; // 12 minutes` | `src/hooks/voice/scribeTokenCache.ts` |
| `const PREWARM_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos entre pre-warms` | `src/lib/external-db-prewarm.ts` |
| `setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);` | `src/lib/mockup-storage.ts` |
| `export const AUTO_RESET_INTERVAL_MS = 15 * 60 * 1000;` | `src/lib/notifications-metrics.ts` |
| `DEFAULT: 10 * 60 * 1000, // 10 minutos` | `src/lib/query-config.ts` |
| `DYNAMIC: 2 * 60 * 1000, // 2 minutos` | `src/lib/query-config.ts` |
| `PRODUTOS: 5 * 60 * 1000, // 5 minutos` | `src/lib/query-config.ts` |
| `SHORT: 5 * 60 * 1000, // 5 minutos` | `src/lib/query-config.ts` |
| `STABLE: 30 * 60 * 1000, // 30 minutos` | `src/lib/query-config.ts` |
| `TABELAS_PRECO: 10 * 60 * 1000, // 10 minutos` | `src/lib/query-config.ts` |
| `TECNICAS: 15 * 60 * 1000, // 15 minutos` | `src/lib/query-config.ts` |
| `TECNICAS: 30 * 60 * 1000, // 30 minutos` | `src/lib/query-config.ts` |
| `VERY_STABLE: 60 * 60 * 1000, // 1 hora` | `src/lib/query-config.ts` |
| `.requestIdleCallback(trigger, { timeout: 3000 });` | `src/lib/sentry.ts` |
| `setTimeout(trigger, 3000);` | `src/lib/sentry.ts` |
| `const TTL_MS = 5 * 60 * 1000; // 5 minutes — refs change rarely` | `src/lib/external-db/immutableCache.ts` |
| `if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));` | `src/lib/external-db/products-detail.ts` |
| `await new Promise(resolve => setTimeout(resolve, 1000 * consecutiveErrors));` | `src/lib/external-db/products.ts` |
| `const DIA_EM_MS = 24 * 60 * 60 * 1000;` | `src/lib/orders/purchasing-sla.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/pages/ProductDetail.tsx` |
| `state.setValidUntil(typeof data.validUntil === "string" ? data.validUntil : format(addDays(new Date(), 30), "yyyy-MM-dd"));` | `src/pages/QuoteBuilderPage.tsx` |
| `setTimeout(() => { navigate('/'); }, 3000);` | `src/pages/ResetPassword.tsx` |
| `window.setTimeout( () => setHighlightZone((cur) => (cur === anchorId ? null : cur)), 1800,` | `src/pages/admin/AdminConexoesPage.tsx` |
| `window.setTimeout(() => setHighlightZone((cur) => (cur === anchorId ? null : cur)), 1800);` | `src/pages/admin/AdminConexoesPage.tsx` |
| `window.setTimeout(() => setCopied(false), 1800);` | `src/pages/admin/DevChallengeExamplesPage.tsx` |
| `const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;` | `src/pages/admin/KitTemplatesMetricsPage.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/pages/admin/KitTemplatesMetricsPage.tsx` |
| `const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();` | `src/pages/admin/ai-usage/MarketIntelInsightsUsagePanel.tsx` |
| `const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1_000);` | `src/pages/admin/sicoob/tabs/ApprovalDelegationsTab.tsx` |
| `const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/pages/admin/telemetry/useOptimizationMetrics.ts` |
| `await new Promise(r => setTimeout(r, 1500));` | `src/pages/admin/telemetry/useOptimizationQueue.ts` |
| `if (period === 'quarter') return subMonths(startOfMonth(now), 2);` | `src/pages/quotes-dashboard/useQuotesDashboard.ts` |
| `if (period === 'year') return subMonths(startOfMonth(now), 11);` | `src/pages/quotes-dashboard/useQuotesDashboard.ts` |
| `.gte('created_at', startOfDay(from \|\| subMonths(new Date(), 6)).toISOString())` | `src/pages/sicoob/reports/SicoobKpiPage.tsx` |
| `from: subMonths(new Date(), 6),` | `src/pages/sicoob/reports/SicoobKpiPage.tsx` |
| `lastAddedTimer = setTimeout(() => { lastAddedId = null; }, 1000);` | `src/stores/useRecentlyViewedStore.ts` |
| `setTimeout(() => { toast.success("Relatório PDF gerado com sucesso."); }, 2000);` | `src/utils/orderExportUtils.ts` |
| `const MS_PER_DAY = 1000 * 60 * 60 * 24;` | `src/utils/price-freshness.ts` |
| `? Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1000))])` | `src/utils/proposalPdfReactGenerator.ts` |
| `setTimeout(resolve, 5000);` | `src/utils/proposalPdfReactGenerator.ts` |
| `const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10min — tabelas estáticas` | `supabase/functions/_shared/external-db-cache.ts` |
| `export const FULL_SCOPE_MAX_TTL_MS = 180 * 24 * 60 * 60 * 1000;` | `supabase/functions/_shared/mcp-scopes.ts` |
| `const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();` | `supabase/functions/block-ip-temporarily/index.ts` |
| `Date.now() - STALE_SECRET_DAYS * 24 * 60 * 60 * 1000,` | `supabase/functions/connections-health-check/index.ts` |
| `const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();` | `supabase/functions/connections-health-check/index.ts` |
| `const since = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000)` | `supabase/functions/connections-health-check/index.ts` |
| `const timeout = setTimeout(() => controller.abort(), 5000);` | `supabase/functions/connections-hub-audit/audit-core.ts` |
| `const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();` | `supabase/functions/error-monitor/index.ts` |
| `? Math.floor((Date.now() - new Date(quoteProductHistory[0].created_at).getTime()) / (1000 * 60 * 60 * 24))` | `supabase/functions/expert-chat/index.ts` |
| `const daysUntilExpiry = (new Date(q.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24);` | `supabase/functions/expert-chat/index.ts` |
| `const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h` | `supabase/functions/market-intelligence-insights/index.ts` |
| `const startCurr = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);` | `supabase/functions/market-intelligence-insights/index.ts` |
| `const startPrev = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);` | `supabase/functions/market-intelligence-insights/index.ts` |
| `.gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());` | `supabase/functions/qa-block-monitor/index.ts` |
| `if (!lastTelemetry \|\| (Date.now() - new Date(lastTelemetry.created_at).getTime() > 10 * 60 * 1000)) {` | `supabase/functions/qa-block-monitor/index.ts` |
| `const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();` | `supabase/functions/quote-followup-reminders/index.ts` |
| `const timeoutId = setTimeout(() => controller.abort(), 10000);` | `supabase/functions/secure-upload/index.ts` |
| `const searchCache = new TTLCache<SearchIntent>(5 * 60 * 1000, 1000);` | `supabase/functions/semantic-search/index.ts` |
| `constructor(ttlMs: number = 5 * 60 * 1000, maxEntries: number = 1000) {` | `supabase/functions/semantic-search/index.ts` |
| `return new Date(reference.getTime() - days * 24 * 60 * 60 * 1000).toISOString();` | `supabase/functions/send-scheduled-reports/report-types.ts` |
| `const CATALOG_QUERY_VALIDITY_MS = 5 * 60 * 1000;` | `supabase/functions/sicoob-reorder/catalog.ts` |
| `if (checkedTime - priceTime > thresholdDays * 24 * 60 * 60 * 1000) {` | `supabase/functions/sicoob-reorder/catalog.ts` |
| `AND created_at < now() - interval '7 days'` | `supabase/migrations/20260417115234_fc88065c-9498-42e5-8acd-a10b991168fa.sql` |
| `WHERE created_at >= now() - interval '14 days'` | `supabase/migrations/20260417115234_fc88065c-9498-42e5-8acd-a10b991168fa.sql` |
| … +89 linhas — lista completa em `context.json` | |

### H.3 Limites de paginação

| Limite | Arquivo |
|---|---|
| 100 | `src/components/admin/CatalogQualityDashboard.tsx` |
| 1 | `src/components/admin/connections/ConnectionErrorDetailsDialog.tsx` |
| 50 | `src/components/admin/connections/ConnectionTimelineDrawer.tsx` |
| 500 | `src/components/admin/connections/InboundEventsPanel.tsx` |
| 1 | `src/components/admin/connections/IntegrationsHealthCard.tsx` |
| 1 | `src/components/admin/connections/LastSyncRunPanel.tsx` |
| 200 | `src/components/admin/connections/useIncidentDetails.ts` |
| 80 | `src/components/admin/connections/useIncidentTimeline72h.ts` |
| 1 | `src/components/admin/connections/usePulseBarStatus.ts` |
| 15 | `src/components/admin/connections/useRecentIncidents.ts` |
| 20 | `src/components/admin/connections/useRecentIncidents.ts` |
| 1000 | `src/components/admin/security/AnomalyCards.tsx` |
| 20 | `src/components/admin/security/AutoDefenseTab.tsx` |
| 50 | `src/components/admin/security/RecentAuditTable.tsx` |
| 20 | `src/components/admin/security/SecureUploadManager.tsx` |
| 2000 | `src/components/admin/security/SuspiciousTokensPanel.tsx` |
| 2000 | `src/components/admin/security/TopOffenderIpsCard.tsx` |
| 50 | `src/components/admin/security/keys/McpKeyDetailsDrawer.tsx` |
| 200 | `src/components/admin/security/keys/audit/useAutoRevocations.ts` |
| 200 | `src/components/admin/security/keys/audit/useStepUpAttempts.ts` |
| 200 | `src/components/admin/users/RoleAuditLogPanel.tsx` |
| 1 | `src/components/compare/HistoricalPriceOverlay.tsx` |
| 60 | `src/components/compare/PriceSparkline.tsx` |
| 5 | `src/components/dashboard/RecentKitsWidget.tsx` |
| 200 | `src/components/kit-builder/KitHealthCard.tsx` |
| 100 | `src/components/kit-builder/KitSmartSuggestions.tsx` |
| 1 | `src/components/layout/sidebar/SidebarFooterHealth.tsx` |
| 5 | `src/components/layout/sidebar/SidebarFooterHealth.tsx` |
| 1 | `src/components/products/ProductPersonalizationRules.tsx` |
| 50 | `src/components/quote/MarginInsightBadge.tsx` |
| 1 | `src/components/quotes/QuoteOrderBadge.tsx` |
| 10 | `src/components/security/useSecurityData.ts` |
| 20 | `src/components/security/useSecurityData.ts` |
| 1 | `src/hooks/useCollections.ts` |
| 1 | `src/hooks/useComparisonSync.ts` |
| 1 | `src/hooks/useDevAccessAudit.ts` |
| 1 | `src/hooks/useDiscountApproval.ts` |
| 50 | `src/hooks/useDuplicateKitDetector.ts` |
| 1 | `src/hooks/useFavoriteLists.ts` |
| 1 | `src/hooks/useGeoBlocking.ts` |
| 30 | `src/hooks/useMagicUpState.ts` |
| 50 | `src/hooks/useMagicUpState.ts` |
| 50 | `src/hooks/useNotificationOmnichannel.ts` |
| 3 | `src/hooks/useProductInsights.ts` |
| 20 | `src/hooks/useProductRecommendations.ts` |
| 1 | `src/hooks/useQuoteApproval.ts` |
| 200 | `src/hooks/useQuoteHistory.ts` |
| 50 | `src/hooks/useRoleMigration.ts` |
| 5000 | `src/hooks/useSalesHistory.ts` |
| 2000 | `src/hooks/useSalesHistoryMacro.ts` |
| 5000 | `src/hooks/useSalesHistoryMacro.ts` |
| 50 | `src/hooks/useSimilarKits.ts` |
| 50 | `src/hooks/useSimulation.ts` |
| 50 | `src/hooks/useWorkspaceNotifications.tsx` |
| 1 | `src/hooks/admin/useAccessSecurity.ts` |
| 50 | `src/hooks/admin/useAccessSecurity.ts` |
| 10 | `src/hooks/orders/useOrderNotifications.ts` |
| 100 | `src/hooks/search/usePopularSearchItems.ts` |
| 20 | `src/hooks/simulator/useWizardDrafts.ts` |
| 100 | `src/pages/RateLimitDashboardPage.tsx` |
| 1 | `src/pages/SystemStatusPage.tsx` |
| 1000 | `src/pages/admin/AdminPerformancePage.tsx` |
| 100 | `src/pages/admin/AdminSegurancaAcessoPage.tsx` |
| 200 | `src/pages/admin/AdminSegurancaAcessoPage.tsx` |
| 50 | `src/pages/admin/AdminVerbasPage.tsx` |
| 50 | `src/pages/admin/AuditEvidenceDashboard.tsx` |
| 1000 | `src/pages/admin/KitTemplatesMetricsPage.tsx` |
| 5000 | `src/pages/admin/KitTemplatesMetricsPage.tsx` |
| 50 | `src/pages/admin/OwnershipAuditAdminPage.tsx` |
| 100 | `src/pages/admin/RLSAuditPage.tsx` |
| 500 | `src/pages/admin/RlsDenialsAdminPage.tsx` |
| 20 | `src/pages/admin/SellerDiscountLimitsAdminPage.tsx` |
| 2000 | `src/pages/admin/ai-usage/MarketIntelInsightsUsagePanel.tsx` |
| 10 | `src/pages/admin/telemetry/useHighLimitTelemetry.ts` |
| 1000 | `src/pages/admin/telemetry/useOptimizationMetrics.ts` |
| 2000 | `src/pages/admin/telemetry/useProductsListingLatencyAlert.ts` |
| 5000 | `src/pages/admin/telemetry/useResolveProductsSelectComparison.ts` |
| 500 | `src/pages/admin/telemetry/useTelemetryData.ts` |
| 100 | `src/pages/sicoob/GestorAuditPage.tsx` |
| 100 | `src/pages/sicoob/SicoobInvitationsPage.tsx` |
| 0 | `src/services/sicoob/managerStatsService.ts` |
| 10 | `src/services/sicoob/managerStatsService.ts` |
| 5 | `src/services/sicoob/managerStatsService.ts` |
| 1 | `src/services/sicoob/statsService.ts` |
| 5 | `src/services/sicoob/statsService.ts` |
| 1 | `supabase/functions/_shared/scheduled-report-data.ts` |
| 2000 | `supabase/functions/_shared/scheduled-report-data.ts` |
| 1 | `supabase/functions/admin-audit-hook/index.ts` |
| 1 | `supabase/functions/collections-watcher/index.ts` |
| 500 | `supabase/functions/comparison-price-watcher/index.ts` |
| 1 | `supabase/functions/connection-tester/index.ts` |
| 50 | `supabase/functions/connection-tester/index.ts` |
| 1 | `supabase/functions/connections-health-check/index.ts` |
| 1 | `supabase/functions/crm-db-bridge/index.ts` |
| 50 | `supabase/functions/crm-db-bridge/index.ts` |
| 1 | `supabase/functions/e2e-auth-test/index.ts` |
| 10 | `supabase/functions/expert-chat/index.ts` |
| 1000 | `supabase/functions/expert-chat/index.ts` |
| 120 | `supabase/functions/expert-chat/index.ts` |
| 15 | `supabase/functions/expert-chat/index.ts` |
| 200 | `supabase/functions/expert-chat/index.ts` |
| 1 | `supabase/functions/external-db-bridge/index.ts` |
| 1 | `supabase/functions/external-db-inspect/index.ts` |
| 1 | `supabase/functions/favorites-watcher/index.ts` |
| 1 | `supabase/functions/kit-public-view/index.ts` |
| 2000 | `supabase/functions/market-intelligence-insights/index.ts` |
| 0 | `supabase/functions/migration-health-check/index.ts` |
| 500 | `supabase/functions/process-queue/index.ts` |
| 1 | `supabase/functions/process-scheduled-reports/index.ts` |
| 1 | `supabase/functions/qa-block-monitor/index.ts` |
| 500 | `supabase/functions/quote-followup-reminders/index.ts` |
| 1 | `supabase/functions/rls-integration-tests/index.ts` |
| 100 | `supabase/functions/secrets-manager/index.ts` |
| 500 | `supabase/functions/send-digest/index.ts` |
| 1 | `supabase/functions/send-scheduled-reports/index.ts` |
| 1 | `supabase/functions/send-transactional-email/index.ts` |
| 100 | `supabase/functions/sicoob-approval-reconciliation/index.ts` |
| 1 | `supabase/functions/system-healthcheck/index.ts` |
| 1 | `supabase/functions/validate-access/index.ts` |
| 20 | `supabase/functions/visual-search/index.ts` |

## I. Regras implícitas em mensagens de erro/validação

| Mensagem | Arquivo |
|---|---|
| Módulo local ausente:  | `docs/execucao/auditoria-planejamento-2026-10-13/reproducao/sicoob_simular_filtros_20261013.cjs` |
| Erro ao gerar contexto de orçamento. Tente novamente. | `docs/plano-implementacao/plano-copiloto-vendas-sussurro-150-etapas-20261016/motor-nao-executado/useCopilotQuote.ts` |
| Nenhuma conversa selecionada para gerar orçamento. | `docs/plano-implementacao/plano-copiloto-vendas-sussurro-150-etapas-20261016/motor-nao-executado/useCopilotQuote.ts` |
| Não foi possível obter o contexto de orçamento. | `docs/plano-implementacao/plano-copiloto-vendas-sussurro-150-etapas-20261016/motor-nao-executado/useCopilotQuote.ts` |
| Preencha ao menos parcialmente o escopo (campo E do COOPERA) antes de gerar o orçamento. | `docs/plano-implementacao/plano-copiloto-vendas-sussurro-150-etapas-20261016/motor-nao-executado/useCopilotQuote.ts` |
| Não foi possível persistir a conclusão do onboarding E2E (HTTP ${response.status()}). | `e2e/fixtures/auth.setup.ts` |
| E2E_USER_EMAIL não definido — defina nas envs antes de rodar specs autenticados. | `e2e/fixtures/test-user.ts` |
| E2E_USER_PASSWORD não definido. | `e2e/fixtures/test-user.ts` |
| Não foi possível resolver o user_id do usuário de teste — confirme que o storageState autenticado foi carregado e que a página está na origin do app. | `e2e/fixtures/test-user.ts` |
| A conta E2E administrativa não possui um fator TOTP verificado. | `e2e/helpers/auth.ts` |
| E2E_${role.toUpperCase()}_TOTP_SECRET ausente para elevar a sessão a AAL2. | `e2e/helpers/auth.ts` |
| Limpeza E2E incompleta para ${[...new Set(failures)].join( | `e2e/helpers/cleanup-client.ts` |
| [e2e-resources] ${context} name= | `e2e/helpers/e2e-resources.ts` |
| Card do catálogo sem data-product-id | `e2e/helpers/favorites.ts` |
| Nenhum dos seletores visível: ${selectors.join( | `e2e/helpers/forms.ts` |
| Console errors detected:\n${errors.map((e) => e.text).join( | `e2e/helpers/nav.ts` |
| [gotoWithRetry] falhou ao navegar para  | `e2e/helpers/waits.ts` |
| [pollUntil] condição não satisfeita em ${timeout}ms | `e2e/helpers/waits.ts` |
| [retry] falhou após ${attempts} tentativas | `e2e/helpers/waits.ts` |
| [waitForTestIdHidden] testid= | `e2e/helpers/waits.ts` |
| [waitForTestIdVisible] testid= | `e2e/helpers/waits.ts` |
| ))           .first(),       ).toBeVisible({ timeout: 8_000 });     });      test( | `e2e/routes/_factories.ts` |
| falha fixture | `scripts/automation.unit.mjs` |
| CodeQL encontrou ${report.findings.length} achado(s) de segurança. | `scripts/check-codeql-sarif.mjs` |
| CodeQL gerou SARIF sem execução analisável. | `scripts/check-codeql-sarif.mjs` |
| CodeQL não gerou arquivo SARIF. | `scripts/check-codeql-sarif.mjs` |
| Diretório  | `scripts/check-codeql-sarif.mjs` |
| SARIF ${file} tem uma execução sem a lista \ | `scripts/check-codeql-sarif.mjs` |
| A proteção de profundidade de braces não bloqueou a entrada adversarial. | `scripts/check-npm-audit.mjs` |
| Versão corrigida de braces não instalada: ${version} | `scripts/check-npm-audit.mjs` |
| SMOKE_COVERAGE não encontrado em 20-all-features-smoke.spec.ts | `scripts/e2e-smoke-coverage-doc.mjs` |
| Configuração obrigatória do destino E2E ausente. | `scripts/e2e-target.mjs` |
| Credenciais E2E inválidas: as chaves publicável e privilegiada devem ser distintas. | `scripts/e2e-target.mjs` |
| Destino E2E fora da allowlist de homologação. | `scripts/e2e-target.mjs` |
| Identificador do projeto E2E inválido. | `scripts/e2e-target.mjs` |
| URL de destino E2E inválida. | `scripts/e2e-target.mjs` |
| URL e identificador do projeto E2E não correspondem a um endpoint Supabase HTTPS. | `scripts/e2e-target.mjs` |
| Não foi possível determinar a URL do repositório (origin/GITHUB_REPOSITORY). | `scripts/enterprise-dossier-builder.mjs` |
| git rev-parse HEAD falhou: execute dentro do repositório. | `scripts/enterprise-dossier-builder.mjs` |
| Contagem de admin_audit_log falhou: ${error.message \|\|  | `scripts/generate-enterprise-report.mjs` |
| Contagem de admin_audit_log não devolvida pelo banco. | `scripts/generate-enterprise-report.mjs` |
| A auditoria RLS não retornou tabelas públicas | `scripts/scan-rls-security.mjs` |
| A auditoria de policies retornou contrato inválido | `scripts/scan-rls-security.mjs` |
| audit_empty_rls_policies falhou: ${policyError.message} | `scripts/scan-rls-security.mjs` |
| check_tables_rls falhou: ${tableError.message} | `scripts/scan-rls-security.mjs` |
| timeout >${ms}ms (${label}) | `scripts/smoke-tests.mjs` |
| A persona proprietária não conseguiu criar o orçamento: ${inserted.error?.message ??  | `scripts/test-rls-compliance.mjs` |
| Consulta RLS inconclusiva: ${error.message} | `scripts/test-rls-compliance.mjs` |
| Falha ao criar a persona efêmera ${label}: ${error?.message ??  | `scripts/test-rls-compliance.mjs` |
| Falha ao remover dados efêmeros de QA: ${cleanupErrors.join( | `scripts/test-rls-compliance.mjs` |
| Falha no login da persona ${label}: ${error?.message ??  | `scripts/test-rls-compliance.mjs` |
| ${auditResult.summary.failed} cenário(s) de RLS falharam. | `scripts/test-rls.mjs` |
| A auditoria rls-audit não executou nenhum cenário (total 0); nada foi provado. | `scripts/test-rls.mjs` |
| Erro ao chamar rls-audit: ${auditErr.message} | `scripts/test-rls.mjs` |
| GitHub ${r.status} em ${path}: ${body.slice(0, 200)} | `scripts/validate-lovable-sync-target.mjs` |
| Seletor  | `scripts/validate-wcag-colors.mjs` |
| Token --${name} não encontrado no bloco de src/index.css | `scripts/validate-wcag-colors.mjs` |
| ${msg}: esperado ${JSON.stringify(b)} obtido ${JSON.stringify(a)} | `scripts/ai-context/cenarios.mjs` |
| Publicação não confirmada para ${slug}: status atual ${current.status ??  | `scripts/ci/verify-supabase-functions-published.mjs` |
| Publicação não confirmada para ${slug}: versão atual ${currentVersion ??  | `scripts/ci/verify-supabase-functions-published.mjs` |
| Resposta ${label} deve conter exatamente uma entrada para ${slug}; encontradas: ${matches.length}. | `scripts/ci/verify-supabase-functions-published.mjs` |
| Resposta ${label} não contém uma lista de funções. | `scripts/ci/verify-supabase-functions-published.mjs` |
| Uso: node verify-supabase-functions-published.mjs <antes.json> <depois.json> | `scripts/ci/verify-supabase-functions-published.mjs` |
| Versão anterior inválida para ${slug}; não é seguro comparar a publicação. | `scripts/ci/verify-supabase-functions-published.mjs` |
| ${filename} contém controle transacional incompatível com aplicação atômica. | `scripts/db/apply-sicoob-migrations.mjs` |
| Allowlist incompleta para montar a validação transacional. | `scripts/db/apply-sicoob-migrations.mjs` |
| Allowlist incompleta para validar os corpos das funções críticas. | `scripts/db/apply-sicoob-migrations.mjs` |
| Bloco $${marker}$ não encontrado no patch do monitor. | `scripts/db/apply-sicoob-migrations.mjs` |
| Cláusula c${matched[2]} repetida na guarda de contrato. | `scripts/db/apply-sicoob-migrations.mjs` |
| Conteúdo divergente no ledger para ${target.version}. | `scripts/db/apply-sicoob-migrations.mjs` |
| Contrato de cleanup_old_notifications violado: ${falhas.join( | `scripts/db/apply-sicoob-migrations.mjs` |
| Corpo autorizado não encontrado para public.${functionName}. | `scripts/db/apply-sicoob-migrations.mjs` |
| Guarda de contrato fora de sequência; lote inválido. | `scripts/db/apply-sicoob-migrations.mjs` |
| Guarda de contrato ilegível: ${declaradas.length} cláusulas declaradas, ${found.size} extraídas. | `scripts/db/apply-sicoob-migrations.mjs` |
| Guarda de contrato sem cláusulas; lote não pode ser montado. | `scripts/db/apply-sicoob-migrations.mjs` |
| Hash não autorizado para ${filename}: ${actualHash} | `scripts/db/apply-sicoob-migrations.mjs` |
| Ledger não registrou: ${missing.map((item) => item.version).join( | `scripts/db/apply-sicoob-migrations.mjs` |
| Migrations autorizadas ainda pendentes: ${pending.map((item) => item.version).join( | `scripts/db/apply-sicoob-migrations.mjs` |
| No GitHub Actions, migrations só podem ser aplicadas a partir de refs/heads/main. | `scripts/db/apply-sicoob-migrations.mjs` |
| Nome de migration inválido: ${filename} | `scripts/db/apply-sicoob-migrations.mjs` |
| Nome divergente no ledger para ${target.version}: ${row.name}. | `scripts/db/apply-sicoob-migrations.mjs` |
| Patch ${marker} não encontrado no corpo do monitor. | `scripts/db/apply-sicoob-migrations.mjs` |
| SUPABASE_DB_URL deve apontar ao projeto ${PROJECT_REF}, banco postgres, porta 5432 e TLS verificado. | `scripts/db/apply-sicoob-migrations.mjs` |
| SUPABASE_DB_URL não definida. | `scripts/db/apply-sicoob-migrations.mjs` |
| Statements ausentes no ledger para ${target.version}. | `scripts/db/apply-sicoob-migrations.mjs` |
| Uso: apply-sicoob-migrations.mjs --verify-files\|--check\|--apply\|--require-applied | `scripts/db/apply-sicoob-migrations.mjs` |
| A conexão deve apontar ao banco postgres do projeto ${PROJECT_REF}. | `scripts/db/audit-core-rls.mjs` |
| O contrato RLS das tabelas centrais possui achados críticos. | `scripts/db/audit-core-rls.mjs` |
| SUPABASE_DB_URL não definida. | `scripts/db/audit-core-rls.mjs` |
| OpenAPI recusada (HTTP ${apiResponse.status}). | `scripts/db/check-live-api-inventory.mjs` |
| Projeto Supabase inesperado: ${url.host}. | `scripts/db/check-live-api-inventory.mjs` |
| Storage recusado (HTTP ${bucketsResponse.status}). | `scripts/db/check-live-api-inventory.mjs` |
| VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios. | `scripts/db/check-live-api-inventory.mjs` |
| Baseline do ledger inválido ou de outro projeto. | `scripts/db/check-migration-ledger-drift.mjs` |
| Ledger inválido. | `scripts/db/check-migration-ledger-drift.mjs` |
| Data de coleta do inventário está no futuro. | `scripts/db/check-runtime-refs.mjs` |
| Data de coleta do inventário inválida. | `scripts/db/check-runtime-refs.mjs` |
| Inventário remoto expirado: ${ageDays.toFixed(1)} dias (limite ${maxAgeDays}). | `scripts/db/check-runtime-refs.mjs` |
| RUNTIME_INVENTORY_MAX_AGE_DAYS deve ser um número positivo. | `scripts/db/check-runtime-refs.mjs` |
| A flag ${flag} exige um valor. | `scripts/db/classify-migration-backlog.mjs` |
| Cobertura incompleta: ${result.scope.classified_files}/${result.scope.pending_versions}. | `scripts/db/classify-migration-backlog.mjs` |
| Evidência do ledger sem local_versions_not_in_ledger. | `scripts/db/classify-migration-backlog.mjs` |
| Flag desconhecida: ${unknown.join( | `scripts/db/classify-migration-backlog.mjs` |
| A data da coleta está no futuro. | `scripts/db/import-api-inventory.mjs` |
| A data da coleta não existe no calendário. | `scripts/db/import-api-inventory.mjs` |
| Contrato ou listagem de buckets inválidos. | `scripts/db/import-api-inventory.mjs` |
| Informe a data real da coleta, sem substituí-la pela data de importação. | `scripts/db/import-api-inventory.mjs` |
| Projeto inesperado no snapshot. | `scripts/db/import-api-inventory.mjs` |
| Uso: node scripts/db/import-api-inventory.mjs <openapi.json> <buckets.json> <data-da-coleta> | `scripts/db/import-api-inventory.mjs` |
| A conexão deve apontar ao projeto ${projectRef}. | `scripts/db/supabase-sql-client.mjs` |
| Defina SUPABASE_ACCESS_TOKEN ou SUPABASE_DB_URL. | `scripts/db/supabase-sql-client.mjs` |
| Management API recusou SQL (${response.status}): ${detail} | `scripts/db/supabase-sql-client.mjs` |
| Project ref do Supabase inválido. | `scripts/db/supabase-sql-client.mjs` |
| Resposta SQL inesperada da Management API. | `scripts/db/supabase-sql-client.mjs` |
| Resposta SQL inválida da Management API (HTTP ${response.status}): o corpo não é JSON. | `scripts/db/supabase-sql-client.mjs` |
| Runtime sem suporte a fetch. | `scripts/db/supabase-sql-client.mjs` |
| SUPABASE_ACCESS_TOKEN não definido. | `scripts/db/supabase-sql-client.mjs` |
| SUPABASE_DB_URL inválida. | `scripts/db/supabase-sql-client.mjs` |
| ${TYPES_REL} sem o bloco public.Tables/Views esperado | `scripts/inventario/gerar-banco.mjs` |
| ${TYPES_REL} sem tabelas: nao da para conferir a origem da resposta | `scripts/inventario/gerar-banco.mjs` |
| --entrada exige o caminho do arquivo com a resposta do banco.sql | `scripts/inventario/gerar-banco.mjs` |
| --functions exige o caminho do arquivo com a resposta de GET /functions | `scripts/inventario/gerar-banco.mjs` |
| Management API /functions respondeu HTTP ${res.status} | `scripts/inventario/gerar-banco.mjs` |
| SUPABASE_PROJECT_REF=${ref} nao e o banco oficial (${PROJETO_OFICIAL}). | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao parece ser do banco oficial (${PROJETO_OFICIAL}): ${comuns} tabelas em comum com  | `scripts/inventario/gerar-banco.mjs` |
| a saida tem algo com cara de credencial; nada foi gravado. Revise banco.sql. | `scripts/inventario/gerar-banco.mjs` |
| entrada sem as chaves: ${faltando.join( | `scripts/inventario/gerar-banco.mjs` |
| entrada sem tabelas | `scripts/inventario/gerar-banco.mjs` |
| format_version ${dado.format_version} desconhecido (esperado 1) | `scripts/inventario/gerar-banco.mjs` |
| ripgrep (rg) falhou com exit ${status}; o inventário não foi gerado. | `scripts/inventario/gerar-repo.mjs` |
| ripgrep (rg) não encontrado; o inventário não pode ser gerado com segurança. | `scripts/inventario/gerar-repo.mjs` |
| RPC check_tables_rls devolveu linha sem relname/relrowsecurity. | `scripts/lib/audit-evidence.mjs` |
| RPC check_tables_rls devolveu zero tabelas. | `scripts/lib/audit-evidence.mjs` |
| RPC check_tables_rls falhou: ${error.message ?? JSON.stringify(error)} | `scripts/lib/audit-evidence.mjs` |
| RPC check_tables_rls não devolveu uma lista. | `scripts/lib/audit-evidence.mjs` |
| Flag ${isLong ?  | `scripts/lib/cli.mjs` |
| Flag ${key} não aceita a forma --no-${key} | `scripts/lib/cli.mjs` |
| Flag desconhecida: ${token} | `scripts/lib/cli.mjs` |
| failed | `scripts/maintenance/lib.mjs` |
| missing_dependencies | `scripts/maintenance/lib.mjs` |
| skipped_busy | `scripts/maintenance/lib.mjs` |
| formatter fixture failed | `scripts/maintenance/maintenance.unit.mjs` |
| blocked_network_sandbox | `scripts/maintenance/run.mjs` |
| pending_patch | `scripts/maintenance/run.mjs` |
| A demonstração automatizada só pode usar um servidor local. | `scripts/qa/demo-browser.mjs` |
| Esta simulação só pode usar servidor local. | `scripts/qa/login-browser.mjs` |
| A sessão 1 não chegou a segurar a transação (a sobreposição não foi estabelecida):\n | `scripts/qa/postgres_ready.py` |
| Não foi possível subir o PostgreSQL descartável da Supabase. Tentativas:\n | `scripts/qa/postgres_ready.py` |
| PostgreSQL descartável encerrou antes de ficar pronto. Últimas linhas do log:\n | `scripts/qa/postgres_ready.py` |
| PostgreSQL descartável não concluiu a inicialização. Últimas linhas do log:\n | `scripts/qa/postgres_ready.py` |
| A consulta não retornou valor | `scripts/qa/simular-autoridade-verbas-sicoob.py` |
| A consulta não retornou valor | `scripts/qa/simular-consolidacao-sicoob.py` |
| A consulta não retornou valor | `scripts/qa/simular-convites-sicoob.py` |
| A consulta não retornou o valor esperado | `scripts/qa/simular-delegacao-aprovacao-sicoob.py` |
| A consulta não retornou valor | `scripts/qa/simular-duplicacao-pedido-atomica.py` |
| consulta sem resultado | `scripts/qa/simular-escopo-orcamento-ativo.py` |
| A consulta não retornou o valor esperado | `scripts/qa/simular-eventos-status-sicoob.py` |
| A consulta não retornou valor | `scripts/qa/simular-financeiro-arte-sicoob.py` |
| A consulta não retornou valor | `scripts/qa/simular-identidade-itens-orcamento.py` |
| A consulta não retornou o valor esperado | `scripts/qa/simular-kit-orcamento-sicoob.py` |
| A função anônima obteve acesso indevido às preferências | `scripts/qa/simular-notification-preferences-auth.py` |
| A consulta não retornou o valor esperado | `scripts/qa/simular-politica-aprovacao-sicoob.py` |
| A consulta não retornou valor | `scripts/qa/simular-reacoes-favoritos-rls.py` |
| A consulta não retornou o valor esperado | `scripts/qa/simular-recompra-sicoob.py` |
| initdb não concluiu | `scripts/qa/simular-relatorios-agendados-cron.py` |
| postgres não ficou pronto | `scripts/qa/simular-relatorios-agendados-cron.py` |
| A consulta não retornou valor | `scripts/qa/simular-rls-cruzada-sicoob.py` |
| A consulta não retornou valor | `scripts/qa/simular-salvamento-orcamento-atomico.py` |
| A consulta não retornou o valor esperado | `scripts/qa/simular-versionamento-orcamento-atomico.py` |
| A consulta não retornou valor | `scripts/qa/simular-webhook-internal-auth.py` |
| quota-sintetica | `scripts/revisao/rascunhos-20260924.cenarios.tsx` |
| Dependência não simulada: ${nome} | `scripts/revisao/simular-lacunas.mjs` |
| Rede proibida nesta simulação | `scripts/revisao/simular-lacunas.mjs` |
| PostgreSQL descartável não iniciou | `scripts/revisao/simular-pendencias-2026-09-12.py` |
| PostgreSQL descartável não iniciou. | `scripts/revisao/simular-status-20260927.py` |
| O teste offline não permite consultas ao banco | `scripts/supabase_snapshot/test_snapshot.py` |
| banco indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| catálogo indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied for schema auth | `scripts/supabase_snapshot/test_snapshot.py` |
| relation  | `scripts/supabase_snapshot/test_snapshot.py` |
| statement timeout simulado | `scripts/supabase_snapshot/test_snapshot.py` |
| view removida depois da consulta ao catálogo | `scripts/supabase_snapshot/test_snapshot.py` |
| view sem permissão na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| ❌ Elemento root não encontrado no DOM | `src/main.tsx` |
|            aria-live= | `src/components/a11y/AccessibilityProvider.tsx` |
| useA11y must be used within an AccessibilityProvider | `src/components/a11y/AccessibilityProvider.tsx` |
|            aria-live= | `src/components/a11y/AriaLive.tsx` |
| useAriaLive must be used within an AriaLiveProvider | `src/components/a11y/AriaLive.tsx` |
|          data-testid= | `src/components/access/DevAccessDeniedPage.tsx` |
| Aguarde um instante | `src/components/access/DevAccessDeniedPage.tsx` |
| Falha ao copiar link | `src/components/access/DevAccessDeniedPage.tsx` |
| Falha ao enviar solicitação | `src/components/access/DevAccessDeniedPage.tsx` |
| Erro ao carregar cupons | `src/components/admin/CouponManager.tsx` |
| Erro ao excluir cupom | `src/components/admin/CouponManager.tsx` |
| Erro ao salvar cupom | `src/components/admin/CouponManager.tsx` |
| ; import { Button } from  | `src/components/admin/DevAccessAuditAlert.tsx` |
|  className= | `src/components/admin/GroupPersonalizationManager.tsx` |
| Erro ao enviar imagem | `src/components/admin/ImageUploadButton.tsx` |
| Erro ao remover imagem | `src/components/admin/ImageUploadButton.tsx` |
| URL de upload ausente | `src/components/admin/ImageUploadButton.tsx` |
| Erro ao carregar configurações | `src/components/admin/MockupPromptManager.tsx` |
| Erro ao carregar histórico | `src/components/admin/MockupPromptManager.tsx` |
| Erro ao criar prompt | `src/components/admin/MockupPromptManager.tsx` |
| Erro ao salvar | `src/components/admin/MockupPromptManager.tsx` |
| Já existe um prompt para essa técnica | `src/components/admin/MockupPromptManager.tsx` |
| ; import { supabase } from  | `src/components/admin/OwnershipRepairDialog.tsx` |
| Falha no reparo: ${(e as Error).message} | `src/components/admin/OwnershipRepairDialog.tsx` |
|  className= | `src/components/admin/ProductPersonalizationManager.tsx` |
| Falha ao rodar testes: ${(e as Error).message} | `src/components/admin/RlsIntegrationTestsDialog.tsx` |
| RLS ${res.summary.failed} falha(s) em ${res.summary.total} casos | `src/components/admin/RlsIntegrationTestsDialog.tsx` |
| sem resposta | `src/components/admin/RlsIntegrationTestsDialog.tsx` |
| Não autenticado | `src/components/admin/SellerDiscountLimitsPanel.tsx` |
| Erro ao carregar flags do sistema | `src/components/admin/SystemFeatureToggles.tsx` |
| Erro ao salvar alteração | `src/components/admin/SystemFeatureToggles.tsx` |
| A ordem não pode ser um valor negativo | `src/components/admin/categories/CategoriesManager.tsx` |
| Erro ao carregar categorias | `src/components/admin/categories/CategoriesManager.tsx` |
| Erro ao excluir categoria | `src/components/admin/categories/CategoriesManager.tsx` |
| Este slug já está sendo usado por outra categoria | `src/components/admin/categories/CategoriesManager.tsx` |
| O nome da categoria é obrigatório | `src/components/admin/categories/CategoriesManager.tsx` |
| O slug deve conter apenas letras minúsculas, números e hifens (ex: categoria-exemplo) | `src/components/admin/categories/CategoriesManager.tsx` |
| Corrija os erros antes de importar. | `src/components/admin/common/ImportExportManager.tsx` |
| Erro ao processar CSV: ${error.message} | `src/components/admin/common/ImportExportManager.tsx` |
| Erro ao processar arquivo Excel | `src/components/admin/common/ImportExportManager.tsx` |
| Falha ao importar dados. | `src/components/admin/common/ImportExportManager.tsx` |
| Planilha vazia ou sem abas | `src/components/admin/common/ImportExportManager.tsx` |
| Falha ao alterar o intervalo | `src/components/admin/connections/AutoTestIntervalCard.tsx` |
| Não foi possível ler o intervalo atual | `src/components/admin/connections/AutoTestIntervalCard.tsx` |
|  aria-live= | `src/components/admin/connections/CardSourceDiagnostic.tsx` |
| ; import { Badge } from  | `src/components/admin/connections/CardSourceDiagnostic.tsx` |
|        aria-live= | `src/components/admin/connections/ConnectionPreflightAlert.tsx` |
|  className= | `src/components/admin/connections/ConnectionTestDetailsDialog.tsx` |
| Não foi possível atualizar o auto-teste | `src/components/admin/connections/ConnectionsOverviewTable.tsx` |
| Testes cancelados | `src/components/admin/connections/ConnectionsOverviewTable.tsx` |
| Atualização parcial | `src/components/admin/connections/CredentialsChangedBanner.tsx` |
| Falha ao recarregar credenciais | `src/components/admin/connections/CredentialsSourceIndicator.tsx` |
| Não foi possível copiar | `src/components/admin/connections/ErrorDetailsDialog.tsx` |
| Falha ao exportar | `src/components/admin/connections/ExportButton.tsx` |
| Falha ao reenviar | `src/components/admin/connections/FailedDeliveriesPanel.tsx` |
| Reenviado, mas o destino respondeu com erro | `src/components/admin/connections/FailedDeliveriesPanel.tsx` |
| Falha ao alterar a janela | `src/components/admin/connections/FailureWindowCard.tsx` |
| Não foi possível ler a janela atual | `src/components/admin/connections/FailureWindowCard.tsx` |
| Falha ao copiar | `src/components/admin/connections/FieldSourceDrillDownDialog.tsx` |
| Erro ao testar credenciais | `src/components/admin/connections/GitHubCredentialsTester.tsx` |
| Falha na validação | `src/components/admin/connections/GitHubCredentialsTester.tsx` |
| Resposta inválida do servidor | `src/components/admin/connections/GitHubCredentialsTester.tsx` |
| Atualização parcial | `src/components/admin/connections/GlobalRefreshFromDbButton.tsx` |
| Falha ao atualizar do banco | `src/components/admin/connections/GlobalRefreshFromDbButton.tsx` |
| Falha na auditoria: ${(error as Error).message} | `src/components/admin/connections/IntegrationsHealthCard.tsx` |
| Falha ao emitir chave | `src/components/admin/connections/IssueMcpKeyForm.tsx` |
| Não foi possível emitir a chave | `src/components/admin/connections/IssueMcpKeyForm.tsx` |
| Falha ao executar sync: ${error.message} | `src/components/admin/connections/LastSyncRunPanel.tsx` |
| Erro ao carregar chaves | `src/components/admin/connections/McpTab.tsx` |
| Erro ao revogar | `src/components/admin/connections/McpTab.tsx` |
| Falha ao atualizar cache | `src/components/admin/connections/RefreshFromDbButton.tsx` |
| Tempo esgotado | `src/components/admin/connections/RetestButton.tsx` |
|              className= | `src/components/admin/connections/SaveSecretConfirmDialog.tsx` |
|        className={cn(          | `src/components/admin/connections/SecretErrorAlert.tsx` |
|  aria-live= | `src/components/admin/connections/SecretField.tsx` |
|  className= | `src/components/admin/connections/SecretField.tsx` |
|  aria-live= | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| ; import {   Activity,   Clock,   Copy,   Lock,   PlayCircle,   RefreshCw,   ShieldAlert,   Zap,   CheckCircle2,   XCircle, } from  | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| Falha de rede ao chamar secrets-manager | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| Não foi possível copiar | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| secrets-manager falhou | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| Não foi possível copiar. | `src/components/admin/connections/SmokeTestChecklist.tsx` |
| Selecione uma credencial para testar. | `src/components/admin/connections/SmokeTestChecklist.tsx` |
| ${failed} de ${tested.length} conexões com falha | `src/components/admin/connections/TestAllConnectionsButton.tsx` |
| Nenhuma conexão testável | `src/components/admin/connections/TestAllConnectionsButton.tsx` |
| Destino respondeu com erro | `src/components/admin/connections/WebhookPlaygroundPanel.tsx` |
| Falha ao disparar | `src/components/admin/connections/WebhookPlaygroundPanel.tsx` |
| Selecione webhook e evento | `src/components/admin/connections/WebhookPlaygroundPanel.tsx` |
| Preencha nome e sistema | `src/components/admin/connections/WebhooksTab.tsx` |
| Preencha nome, URL e ao menos um evento | `src/components/admin/connections/WebhooksTab.tsx` |
| Erro ao adicionar componente | `src/components/admin/hooks/useGroupPersonalization.ts` |
| Erro ao adicionar localização | `src/components/admin/hooks/useGroupPersonalization.ts` |
| Erro ao associar técnica | `src/components/admin/hooks/useGroupPersonalization.ts` |
| Erro ao atualizar componente | `src/components/admin/hooks/useGroupPersonalization.ts` |
| Erro ao atualizar localização | `src/components/admin/hooks/useGroupPersonalization.ts` |
| Erro ao atualizar técnica | `src/components/admin/hooks/useGroupPersonalization.ts` |
| Erro ao remover componente | `src/components/admin/hooks/useGroupPersonalization.ts` |
| Erro ao remover localização | `src/components/admin/hooks/useGroupPersonalization.ts` |
| Erro ao remover técnica | `src/components/admin/hooks/useGroupPersonalization.ts` |
| Técnica externa indisponível | `src/components/admin/hooks/useGroupPersonalization.ts` |
| Erro ao copiar regras do grupo | `src/components/admin/personalization/GroupInheritance.tsx` |
| Erro ao adicionar componente | `src/components/admin/personalization/usePersonalizationData.ts` |
| Erro ao adicionar localização | `src/components/admin/personalization/usePersonalizationData.ts` |
| Erro ao associar técnica | `src/components/admin/personalization/usePersonalizationData.ts` |
| Erro ao atualizar componente | `src/components/admin/personalization/usePersonalizationData.ts` |
| Erro ao atualizar localização | `src/components/admin/personalization/usePersonalizationData.ts` |
| Erro ao atualizar modo | `src/components/admin/personalization/usePersonalizationData.ts` |
| Erro ao atualizar técnica | `src/components/admin/personalization/usePersonalizationData.ts` |
| Erro ao remover componente | `src/components/admin/personalization/usePersonalizationData.ts` |
| Erro ao remover localização | `src/components/admin/personalization/usePersonalizationData.ts` |
| Erro ao remover técnica | `src/components/admin/personalization/usePersonalizationData.ts` |
|  className= | `src/components/admin/personalization-manager/ProductPersonalizationManager.tsx` |
| Erro ao adicionar componente | `src/components/admin/personalization-manager/usePersonalizationManager.ts` |
| Erro ao adicionar localização | `src/components/admin/personalization-manager/usePersonalizationManager.ts` |
| Erro ao associar técnica | `src/components/admin/personalization-manager/usePersonalizationManager.ts` |
| Erro ao atualizar componente | `src/components/admin/personalization-manager/usePersonalizationManager.ts` |
| Erro ao atualizar localização | `src/components/admin/personalization-manager/usePersonalizationManager.ts` |
| … +1029 linhas — lista completa em `context.json` | |

## J. Controle de acesso no código (checagens de perfil/permissão)

| Valor comparado | Arquivo |
|---|---|
| `agent` | `src/components/access/DevAccessDeniedPage.tsx` |
| `agente` | `src/components/access/DevAccessDeniedPage.tsx` |
| `string` | `src/components/access/DevAccessDeniedPage.tsx` |
| `supervisor` | `src/components/access/DevAccessDeniedPage.tsx` |
| `vendedor` | `src/components/access/DevAccessDeniedPage.tsx` |
| `object` | `src/components/admin/security/SecureUploadManager.tsx` |
| `permission` | `src/components/admin/users/AccessManagement.tsx` |
| `role` | `src/components/admin/users/AccessManagement.tsx` |
| `supervisor` | `src/components/admin/users/PromotionDialog.tsx` |
| `vendedor` | `src/components/admin/users/PromotionDialog.tsx` |
| `vendedor` | `src/components/admin/users/UserTable.tsx` |
| `user` | `src/components/ai/AIChat.tsx` |
| `assistant` | `src/components/bi/BIAiCopilot.tsx` |
| `user` | `src/components/bi/BIAiCopilot.tsx` |
| `assistant` | `src/components/expert/chat/ChatMessageList.tsx` |
| `user` | `src/components/expert/chat/ChatMessageList.tsx` |
| `assistant` | `src/components/expert/chat/useExpertChat.ts` |
| `user` | `src/components/expert/chat/useExpertChat.ts` |
| `false` | `src/components/products/ProductCard.tsx` |
| `denied` | `src/components/security/PushNotificationSettings.tsx` |
| `granted` | `src/hooks/usePushNotifications.tsx` |
| `comprador_pac` | `src/hooks/useQuoteBuilderState.ts` |
| `admin` | `src/hooks/useQuoteTemplates.ts` |
| `manager` | `src/hooks/useQuoteTemplates.ts` |
| `dev` | `src/hooks/useRBAC.tsx` |
| `roleName` | `src/hooks/useRBAC.tsx` |
| `supervisor` | `src/hooks/useRBAC.tsx` |
| `user` | `src/lib/assistant-message-window.ts` |
| `denied` | `src/lib/sw-register.ts` |
| `granted` | `src/lib/sw-register.ts` |
| `admin` | `src/lib/access/role-policy.ts` |
| `manager` | `src/lib/access/role-policy.ts` |
| `supervisor` | `src/lib/auth/visibility-scope.ts` |
| `admin` | `src/lib/rbac/route-matrix.ts` |
| `dev` | `src/lib/rbac/route-matrix.ts` |
| `perm` | `src/pages/RolePermissionsPage.tsx` |
| `permissionCode` | `src/pages/RolePermissionsPage.tsx` |
| `role` | `src/pages/RolePermissionsPage.tsx` |
| `vendedor` | `src/pages/admin/AdminPromoverUsuarioPage.tsx` |
| `all` | `src/pages/admin/AdminRbacRoutesPage.tsx` |
| `dev` | `src/pages/admin/AdminRbacRoutesPage.tsx` |
| `public` | `src/pages/admin/AdminRbacRoutesPage.tsx` |
| `role` | `src/pages/admin/AdminRbacRoutesPage.tsx` |
| `dev` | `src/pages/admin/AdminUsuariosPage.tsx` |
| `supervisor` | `src/pages/admin/AdminUsuariosPage.tsx` |
| `vendedor` | `src/pages/admin/AdminUsuariosPage.tsx` |
| `agente` | `src/services/admin/UserService.ts` |
| `undefined` | `src/services/sicoob/userService.ts` |
| `null` | `supabase/functions/_shared/authorize.ts` |
| `admin` | `supabase/functions/block-ip-temporarily/index.ts` |
| `admin` | `supabase/functions/connection-tester/index.ts` |
| `dev` | `supabase/functions/connection-tester/index.ts` |
| `string` | `supabase/functions/crm-db-bridge/index.ts` |
| `user` | `supabase/functions/expert-chat/index.ts` |
| `admin` | `supabase/functions/force-global-logout/index.ts` |
| `dev` | `supabase/functions/force-global-logout/index.ts` |
| `supervisor` | `supabase/functions/force-global-logout/index.ts` |
| `admin` | `supabase/functions/github-credentials-test/index.ts` |
| `supervisor` | `supabase/functions/manage-users/index.ts` |
| `vendedor` | `supabase/functions/manage-users/index.ts` |
| `admin` | `supabase/functions/rls-integration-tests/index.ts` |
| `dev` | `supabase/functions/rls-integration-tests/index.ts` |
| `dev` | `supabase/functions/secrets-manager/index.ts` |
| `dev` | `supabase/functions/send-transactional-email/index.ts` |
| `supervisor` | `supabase/functions/send-transactional-email/index.ts` |
| `true` | `supabase/functions/sicoob-document-ingest/index.ts` |
| `agente` | `supabase/functions/sync-quote-bitrix/index.ts` |
| `admin` | `supabase/migrations/20260425201131_83f9ad4a-ea3e-4bed-ac5e-5bdbd1af3316.sql` |
| `admin` | `supabase/migrations/20260425205426_5eacced4-9096-4fa6-9962-5408341f9d11.sql` |
| `admin` | `supabase/migrations/20260425210505_1fc8fe0f-79ba-412d-81c3-cb95f3cec231.sql` |
| `admin` | `supabase/migrations/20260426013235_0fedab5d-eff1-4186-87e1-9899049fcc1a.sql` |
| `admin` | `supabase/migrations/20260426103109_16f8c3dc-186f-4ba9-ae10-6c73dfc69ee9.sql` |
| `dev` | `supabase/migrations/20260426125603_b96b3daf-08f4-4edd-bf2f-835a6c673dbf.sql` |
| `manager` | `supabase/migrations/20260426125603_b96b3daf-08f4-4edd-bf2f-835a6c673dbf.sql` |
| `vendedor` | `supabase/migrations/20260426125603_b96b3daf-08f4-4edd-bf2f-835a6c673dbf.sql` |
| `admin` | `supabase/migrations/20260426145642_948756c0-6c4a-4be4-8757-9533bd4e291a.sql` |
| `dev` | `supabase/migrations/20260426145642_948756c0-6c4a-4be4-8757-9533bd4e291a.sql` |
| `dev` | `supabase/migrations/20260922165000_scope_public_role_helpers_to_actor.sql` |
| `manager` | `supabase/migrations/20260922165000_scope_public_role_helpers_to_actor.sql` |
| `supervisor` | `supabase/migrations/20260927200207_duplicate_order_atomic.sql` |
| `gerente_pa` | `supabase/migrations/20261013115605_harden_sicoob_budget_authority.sql` |
| `gestor_compras` | `supabase/migrations/20261013115605_harden_sicoob_budget_authority.sql` |
| `admin` | `supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql` |
| `comprador_singular` | `supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql` |
| `dev` | `supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql` |
| `gestor_compras` | `supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql` |
| `manager` | `supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql` |
| `supervisor` | `supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql` |
| `admin` | `supabase/migrations/20261113170000_use_semantic_admin_helper_in_favorite_policies.sql` |
| `dev` | `tests/scenarios/sql/audit-controls-fixture.sql` |
| `admin` | `tests/scenarios/sql/order-duplicate-atomic-fixture.sql` |
| `dev` | `tests/scenarios/sql/order-duplicate-atomic-fixture.sql` |
| `manager` | `tests/scenarios/sql/order-duplicate-atomic-fixture.sql` |

## K. Testes como especificação (7447 testes em 769 arquivos — nomes completos em `context.json`)

| Arquivo | Testes | Exemplos do que o sistema DEVE fazer |
|---|---|---|
| `tests/product-form-improvements.test.ts` | 80 | Schema Structure — Field Existence · has info field: %s · has price/stock field: %s · has physical dimension: %s … |
| `tests/stock-module.test.tsx` | 80 | calculateStockStatus · returns out_of_stock when current is 0 and no transit · returns out_of_stock when current is negative · returns incoming when current is 0 but inTransit > 0 … |
| `tests/stock-performance.test.ts` | 80 | calculateStockStatus · returns out_of_stock when current=0 · returns incoming when current=0 but inTransit>0 · returns critical when current<=25% of min … |
| `tests/components/magic-up-onda5.test.tsx` | 80 | Magic Up Onda 5 components · renderiza Magic Score excelente, origem IA e formato · renderiza Magic Score heurístico crítico sem quebrar recomendações vazias · renderiza checklist com critérios aprovados, reprovados, scores e recomendações … |
| `tests/components/magic-up-result-panel-keyboard.test.tsx` | 80 | MagicUpResultPanel — navegação por teclado (WCAG 2.1.1) · Tab atinge prev → dots → next na ordem do DOM · Enter no dot ativa setActiveVariation com índice correto · Space no dot ativa setActiveVariation com índice correto … |
| `tests/components/intelligence/commercial-intelligence.test.ts` | 80 | getSinceDate logic · should return ISO string for 30 days ago · should handle 0 days (today) · should handle 360 days (1 year) … |
| `tests/components/products/StatsPopover.test.tsx` | 80 | statBadges — Basic scenarios · returns correct structure with 5 stat items · returns all zeros for empty product list · counts a single product correctly … |
| `tests/lib/external-db-bridge-telemetry.test.ts` | 80 | external-db-bridge — getResourceGroup · classifies product tables correctly · classifies views correctly · classifies company tables correctly … |
| `tests/lib/telemetry-logic.test.ts` | 80 | formatDuration · formats 0ms · formats 1ms · formats 999ms … |
| `tests/lib/theme-presets.test.ts` | 80 | §1 Catálogo THEME_PRESETS · expõe exatamente 19 skins (10 clássicas + 9 GX) · IDs são únicos · todos os presets têm name, description, emoji, swatches[4], light, dark … |
| `tests/hooks/useDiscountApproval.test.ts` | 66 | DiscountApprovalRequest interface · defines all required fields · supports all three statuses · Seller Discount Limit logic … |
| `tests/hooks/useProductMatch.test.ts` | 65 | normalizeText · lowercases text · removes accents · handles empty string … |
| `tests/e2e/quotes-flow.test.ts` | 60 | E2E Quotes — Status Machine · has 6 statuses · draft → sent is valid · draft → pending is valid … |
| `tests/e2e/products-catalog.test.ts` | 56 | E2E Catalog — Product Filtering · active only by default · includes inactive when specified · search by name … |
| `tests/pages/AdminTelemetriaPage.test.tsx` | 56 | AdminTelemetriaPage - Rendering · renders page title and description · delega o MainLayout para a composição de rotas, sem duplicá-lo · renders all 4 stat cards … |
| `tests/e2e/cross-cutting-regression.test.ts` | 55 | Cross-Cutting — Currency Formatting · formats BRL correctly · formats zero · formats large number … |
| `tests/rls/critical-tables-rls.test.ts` | 53 | RLS: quotes · has RLS enabled (policies exist) · only allows authenticated users · sellers can only manage their own quotes … |
| `tests/components/search/VoiceSearchOverlay.test.tsx` | 51 | VoiceSearchOverlay · Rendering · renders when open · does not render when closed … |
| `tests/e2e/tools-simulator.test.ts` | 51 | E2E Tools — Simulator Wizard · has 4 steps · starts at product · ends at summary … |
| `tests/e2e/kit-builder-flow.test.ts` | 50 | Kit Builder E2E Flow - Box Selection · validates box selection is required before adding items · allows item addition after box selection · prevents proceeding to items step without box … |
| `tests/components/TelemetryCharts.test.tsx` | 46 | TelemetryCharts - Rendering · returns null when no rows · renders chart titles when rows exist · renders bar chart for table distribution … |
| `tests/e2e/admin-module.test.ts` | 44 | E2E Admin — User Management · lists all users · filters active users · filters inactive users … |
| `tests/utils/color-variant-carousel.test.ts` | 44 | resolveAllMatchingColors — cenários sem match · retorna [] quando activeColorFilter é null · retorna [] quando activeColorFilter é undefined · retorna [] quando groups e variations estão vazios … |
| `tests/utils/product-sorting.test.ts` | 44 | sortProducts · name sort · sorts alphabetically A-Z · handles accented characters correctly … |
| `tests/color-navigation.test.ts` | 43 | buildColorNavParams · builds params with name only · builds params with all fields · skips null/undefined fields … |
| `tests/e2e/auth-flow.test.tsx` | 42 | E2E Auth — Login Validation · rejects empty email · rejects invalid email format · rejects email without domain … |
| `tests/utils/image-utils.test.ts` | 40 | image-utils · getCdnUrl · retorna placeholder para URL vazia · troca variante em URLs do Cloudflare … |
| `tests/e2e/phase3-detail-experience.test.ts` | 39 | Phase 3.1 — ProductSizeSelector · builds size options from variations · aggregates stock across same size_code · excludes null/undefined size_codes … |
| `tests/e2e/phase2-filters-catalog.test.ts` | 38 | Phase 2.1 — Gender Filter Integration · no filter returns all products · filter masculino · filter feminino … |
| `tests/e2e/navigation-layout.test.tsx` | 37 | E2E Navigation — Route Registry · has public routes · has protected routes · has admin routes … |
| `tests/e2e/phase1-foundation-types.test.ts` | 37 | Phase 1.1 — ProductColor Type Contract · accepts valid color with all fields · accepts color without optional fields · handles zero stock … |
| `tests/e2e/phase4-admin-grid.test.ts` | 36 | Phase 4.1 — Variation Axes Config · detects color-only axes · detects color + size axes · detects all three axes … |
| `tests/hooks/useKitAutoSave.test.tsx` | 36 | useKitAutoSave · nao rebaixa para rascunho o kit que o montador considera valido · grava a identidade escolhida no primeiro autosave de um kit novo · não confirma salvamento quando o Supabase retorna erro e permite nova tentativa … |
| `tests/e2e/phase5-propagation.test.ts` | 35 | Phase 5.1 — Quote Items with size_code · quote item with color and size · quote item without size (non-apparel) · quote item subtotal calculation … |
| `tests/lib/date-utils.test.ts` | 35 | date-utils · formatDate · formats ISO string with default pattern · formats Date object … |
| `tests/scripts/audit-scripts.test.ts` | 34 | inventário de evidências de auditoria · todo item  · reprova arquivo inexistente e trecho ausente, e não confere item a implementar · leitura da RPC check_tables_rls … |
| `tests/ai-usage.test.ts` | 31 | AI Usage - Cost Estimation · calculates Gemini 2.5 Flash cost correctly · calculates Gemini 3 Flash Preview cost correctly · calculates GPT-5 cost correctly … |
| `tests/e2e/performance.test.ts` | 31 | E2E Performance — Lazy Loading · MainLayout lazy loads 12+ components · E2E Performance — Query Limits · app page size < supabase limit … |
| `tests/lib/date-utils-extended.test.ts` | 31 | formatDate — extended · formats Date object dd/MM/yyyy · formats ISO string · formats timestamp … |
| `tests/lib/kit-builder-volume.test.ts` | 30 | kit-builder volume-calculator · calculateVolume · returns w*h*d · calculateUsableVolume … |
| `tests/lib/print-area-grouping.test.ts` | 30 | groupPrintAreasByComponent · groups areas by component and location · puts null component under  · sorts primary areas first within locations … |
| `tests/e2e/analytics-bi.test.ts` | 29 | E2E Analytics — BI Metrics · total = approved + rejected + pending · conversion rate is correct · avg ticket = revenue / approved … |
| `tests/lib/masked-suffix.test.ts` | 29 | normalizeMaskedSuffix — paridade de comprimento · 0 chars (null) →  · 1 char  · 2 chars  … |
| `tests/pages/ProductDetail.test.ts` | 29 | mapPromobrindToProduct — full integration · maps basic fields correctly · maps colors with hex, code, images · maps materials from comma-separated string … |
| `tests/e2e/orders-module.test.ts` | 28 | E2E Orders — Status Machine · expõe todos os estados aceitos pelo banco · E2E Orders — Status Flow · %s → %s … |
| `tests/lib/kit-builder-price.test.ts` | 28 | kit-builder price-calculator · calculateBoxPrice · returns 0 for null box · multiplies box price by quantity … |
| `tests/stock-types.test.ts` | 27 | calculateStockStatus · returns out_of_stock when current is 0 · returns incoming when current is 0 but in transit > 0 · returns critical when current <= 25% of min … |
| `tests/components/KitComposition.test.tsx` | 27 | KitComposition · renders trigger card with component count · renders header with correct component and piece counts in dialog · renders singular  … |
| `tests/e2e/catalog-price-freshness-badge.test.tsx` | 27 | E2E Catálogo — visibilidade do PriceFreshnessBadge por host · Produto FRESH (5d, threshold 60d) — preço dentro do prazo · Card (icon-only) NÃO renderiza badge · EnhancedCard (icon-only) NÃO renderiza badge … |
| `tests/e2e/profile-user.test.ts` | 26 | E2E Profile — Form Validation · accepts valid profile · rejects empty name · rejects short name … |
| `tests/hooks/useReplenishments.test.ts` | 26 | Replenishment utility functions · isReplenishment · returns true when updated_at is 1+ day after created_at · returns false when updated_at equals created_at (new product) … |
| `tests/e2e/seller-carts.test.ts` | 25 | E2E Carts — Cart Total Calculation · calculates correctly · empty cart is 0 · single item … |
| `tests/hooks/voice/retry.test.ts` | 25 | withRetry · returns result on first success · retries on retryable error and succeeds · does not retry on non-retryable error … |
| `tests/lib/query-config-extended.test.ts` | 24 | CACHE_TIMES constants · VERY_STABLE is 1 hour · STABLE is 30 min · TECNICAS is 15 min … |
| `supabase/functions/external-db-bridge/callerSelectIsHeavy.test.ts` | 23 | extractBaseColumn: nome simples · extractBaseColumn: alias PostgREST  · extractBaseColumn: operadores JSON  · extractBaseColumn: alias + JSON op combinados … |
| `supabase/functions/send-scheduled-reports/report-types.test.ts` | 23 | todo tipo aceito pelo CHECK do banco tem gerador · próxima execução fica ancorada em 8h e avança o período · janela do período segue a frequência · relatório de orçamentos filtra pelo dono do agendamento … |
| `tests/components/PriceFreshnessBadge.catalog-visibility.test.tsx` | 23 | PriceFreshnessBadge — visibilidade nos componentes do catálogo · ProductCard / EnhancedProductCard / ProductTableView (variant= · NÃO renderiza quando fresh (preço atualizado dentro de 50% do threshold) · NÃO renderiza quando o status é unknown (data ausente) … |
| `tests/scripts/e2e-summaries.test.ts` | 23 | lib/playwright-report · status efetivo respeita test.fail() e flaky · runErrors lê a primeira linha de cada erro do run · normaliza o caminho relativo ao testDir com o prefixo e2e/ … |
| `tests/scripts/rules-rls-estatico.test.ts` | 23 | rules/rls-estatico · tabela criada sem RLS aparece como rls=false · ENABLE em migration posterior liga; DISABLE desliga (último vence) · conta policies e ignora SQL comentado … |
| `tests/utils/masks-extended.test.ts` | 23 | maskCnpj · should format full CNPJ · should handle partial input · should strip non-digits … |
| `tests/utils/price-calculator.test.ts` | 23 | calculateBoxPrice · returns 0 for null box · multiplies box price by quantity · defaults quantity to 1 … |
| `tests/components/PriceFreshnessBadge.colorMatrix.test.tsx` | 22 | PriceFreshnessBadge — matriz cromática + conteúdo pt-BR (status × variant) · variant=inline (PDP / Quick View) · fresh: emerald-700 +  · aging: amber-700 + ainda usa label  … |
| `tests/components/PriceFreshnessBadge.copyAssertions.test.tsx` | 22 | PriceFreshnessBadge — cópia pt-BR exata por variant · variant=inline (PDP / Quick View) · fresh:  · aging:  … |
| `tests/components/kit-builder/KitBuilderComponents.test.tsx` | 22 | KitVisualPreview · renders null when no box · renders box preview with items · shows correct fill color for normal usage … |
| `tests/e2e/ui-components.test.tsx` | 22 | E2E UI — Button Variants · renders  · default variant renders · E2E UI — Button Sizes … |
| `tests/functions/portal-access-policy.test.ts` | 22 | papéis de leitura e escrita do CRM · não dá leitura genérica a vendedor nem a agente · restringe escrita a dev e admin · nega tudo para quem não tem papel … |
| `tests/hooks/useSearch.test.ts` | 22 | useSearch · Histórico · isola o histórico por escopo de usuário e cooperativa · adiciona termo ao histórico … |
| `tests/hooks/useSimulatorWizard.test.ts` | 22 | WIZARD_STEPS · has exactly 4 steps in correct order · getStepIndex · returns correct indices … |
| `tests/lib/crm-db-fixed.test.ts` | 22 | invokeCrmDb · returns data on success · throws on edge function error (non-retryable) · throws on query error in data … |
| `tests/lib/product-types.test.ts` | 22 | getProductImageUrl · should prefer primary_image_url · should fallback to image_url · should fallback to first image in images array … |
| `tests/rls/telemetry-logs-connections-access.test.ts` | 22 | Helpers semânticos — alinhamento com gates primitivos · can_view_audit_logs(${r}) === is_dev(${r}) · can_view_telemetry(${r}) === is_supervisor_or_above(${r}) · can_view_connections(${r}) === is_supervisor_or_above(${r}) … |
| `tests/utils/price-freshness.extreme-thresholds.test.ts` | 22 | getPriceFreshness — thresholds inválidos voltam ao default 60d · threshold $label → default 60d e classifica corretamente · getPriceFreshness — threshold = 1 dia (cotação volátil) · hoje (0d) ainda é fresh — vendedor não é alarmado no mesmo dia … |
| `tests/components/PriceFreshnessBadge.a11y.test.tsx` | 21 | PriceFreshnessBadge — acessibilidade · aria-label rico por status · fresh: menciona  · aging: menciona  … |
| `tests/edge-functions/quote-price-attestation.test.ts` | 21 | atestação de preço do orçamento · limita o corpo da solicitação enquanto lê o stream · desembrulha RPCs diretas e envelopes de sucesso sem descartar o payload interno · aceita somente o preço vigente do produto e deriva custo conforme a regra do editor … |
| `tests/hooks/useProducts.test.ts` | 21 | findKnownHex · finds exact match · is case insensitive · handles accents (NFD normalization) … |
| `tests/hooks/useTechniquePricing.test.ts` | 21 | filterMatchingTables · filters by table_code match · filters by fullcode match · filters case-insensitively … |
| `tests/scripts/check-smoke-tags.test.ts` | 21 | check-smoke-tags — teste FORA de describe @smoke precisa ser acusado · solto · geral · @smoke ok … |
| `supabase/functions/_shared/credentials.test.ts` | 20 | resolveCredential: integration_credentials preenchida → has_value=true, source= · resolveCredential: linha ausente + env canônica presente → source= · resolveCredential: alias legado (EXTERNAL_SUPABASE_URL) → resolve com source= · resolveCredential: nada configurado → source= … |
| `supabase/functions/external-db-bridge/applyFiltersAndSwap.integration.test.ts` | 20 | applyFilters: nunca chama .select() (filtro vazio) · applyFilters: nunca chama .select() (filtros simples eq) · applyFilters: nunca chama .select() (operadores PostgREST string) · applyFilters: nunca chama .select() (sufixos _gte/_lte/_isnull/_notnull) … |
| `tests/lib/external-db-invoke.test.ts` | 20 | extractFunctionErrorMessage · returns message from Error instance · returns generic message for non-Error · extracts detailed message from Response context … |
| `tests/lib/navigation-dirty-registry.test.ts` | 20 | registro de trabalho não salvo por rota · rota que nao declarou nada continua sem estado — a regra antiga vale · tela limpa declara que nao ha o que perder · tela com trabalho pendente declara sujo … |
| `tests/lib/private-storage.test.ts` | 20 | resolvePrivateStorageUrlSafe e cache de assinaturas · devolve null em vez de rejeitar quando o objeto nao pode ser assinado · nao derruba as imagens validas do mesmo lote · compartilha a mesma requisicao entre resolucoes simultaneas do mesmo objeto … |
| `tests/lib/rbac-permissions.test.ts` | 20 | RBAC Permission Matrix · admin · has access to everything · manager … |
| `tests/pages/QuoteBuilder.test.ts` | 20 | QuoteBuilder — Item Calculations · calculates single item total · calculates quote subtotal · handles empty items list … |
| `tests/scripts/db-scripts-hardening.test.ts` | 20 | drift do ledger — nomes de arquivo · .sql fora do padrão vira pendência em vez de sumir · arquivo no padrão e alinhado ao ledger continua sem pendência · classificador do backlog de migrations — operações destrutivas … |
| `tests/services/sicoob/userService.syncUserRole.test.ts` | 20 | syncUserRole — o papel da tela chega em user_roles · traduz  · traduz  · não regrava o papel técnico dev, que é preservado na limpeza … |
| `tests/types/quote-types.test.ts` | 20 | QuoteHistoryEntry shape · has all required fields · allows nullable fields · metadata defaults to empty object … |
| `tests/components/ReplenishmentToolbar.test.tsx` | 19 | ReplenishmentToolbar · renders title and count badge · shows loading state when isLoading with zero total · shows filtered/total when hasActiveFilters … |
| `tests/components/products/ProductCard.test.tsx` | 19 | ProductCard · renders product name and price · renders with favorite state · calls onClick when clicked … |
| `tests/edge-functions/voice-agent.test.ts` | 19 | Voice Agent Response Contract · action types · should have valid action enum values · response structure … |
| `tests/hooks/useQuoteBuilderState.saidaAposSalvar.test.ts` | 19 | saída depois de salvar o orçamento · libera a saída para o detalhe quando o formulário não mudou durante o salvamento · não libera a saída quando o formulário mudou durante o salvamento · mantém a mesma regra quando a transição de status não foi confirmada … |
| `tests/lib/query-config.test.ts` | 19 | CACHE_TIMES · should have increasing cache durations · getStaleTimeForKey · should return TECNICAS time for tecnicas keys … |
| `tests/lib/personalization/adapters/raw-row.adapter.test.ts` | 19 | adaptTecnicaRow · espelha PT → EN quando só PT está presente · espelha EN → PT quando só EN está presente · preserva ambos quando payload é híbrido … |
| `tests/scripts/gates-hardening.test.ts` | 19 | contrato de autorização das edges: o resultado do authorize precisa ser usado · conta  · conta desestruturação e uso direto em condição · NÃO conta  … |
| `tests/utils/product-colors.test.ts` | 19 | product-colors · findKnownHex · returns exact match hex · is case-insensitive … |
| `tests/utils/product-mapper.test.ts` | 19 | product-mapper · mapPromobrindToProduct · maps basic fields · maps category … |
| `tests/hooks/useGlobalSearch-voice.test.ts` | 18 | Voice Action Handler Logic · navigate action · should extract route from navigate action · should handle navigate without route gracefully … |
| `tests/lib/personalization/adapters/price-response.adapter.test.ts` | 18 | detectPriceSchema · detecta v5.9 nested · detecta v6.x flat · detecta v7-new … |
| `tests/p0/rls-data-integrity.test.ts` | 18 | P0 — RLS e integridade · quotes: timestamps de criação externos são definidos pelo servidor · PostgREST: separa o timeout do cache do limite por requisição · user_roles: mantém gate executável contra autoelevação … |
| `tests/utils/imageProxy.test.ts` | 18 | imageProxy · getProxiedImageUrl · retorna null para url null · retorna null para url undefined … |
| `tests/utils/masks.test.ts` | 18 | maskCnpj · formats a complete CNPJ · formats partial input progressively · strips non-digit characters … |
| `tests/admin/route-guards-ref-warning.test.tsx` | 17 | Route guards — React ref warning guard · AdminRoute (loading) — sem warning de ref · AdminRoute (sem user → Navigate /login) — sem warning de ref · AdminRoute (admin com MFA OK → Outlet) — sem warning de ref … |
| `tests/admin/skeleton-fallbacks-ref-warning.test.tsx` | 17 | SkeletonLoaders — nenhum ref warning · render direto: %s · como fallback de <Suspense>: %s · getFallback( … |
| `tests/components/GlobalExitGuard.test.tsx` | 17 | aviso global de saída · segura a navegação quando a tela declarou trabalho pendente · não descarta quando a navegação mantém a tela montada (só muda a query) · tela limpa sai sem ser interrogada … |
| `tests/components/PriceFreshnessBadge.invalid-dates.test.tsx` | 17 | PriceFreshnessBadge — datas ausentes/inválidas · variant inline (PDP, sempre renderiza) · mostra  · mostra  … |
| `tests/components/products/ColumnSelector.test.tsx` | 17 | ColumnSelector · shows all 5 options on a 1600px screen · hides options whose minWidth exceeds screen width · shows only 3-col option on a 400px screen (mobile) … |
| `tests/hooks/voice-modules.test.ts` | 17 | withRetry · returns result on first success · retries on retryable error and succeeds · does not retry non-retryable errors … |
| `tests/lib/external-db-immutable-cache.test.ts` | 17 | immutableCache.getCachedByIds — básico · cache miss puro: 1 chamada bridge com filtro id=in.(...) · cache hit puro: 0 chamadas bridge · hit parcial: bridge é chamada só com os ids faltantes … |
| `tests/lib/filter-dev-only-items.test.ts` | 17 | filterDevOnlyItems — visibilidade por papel · vendedor (não-dev, não-admin) NÃO vê nenhum item devOnly · admin (não-dev) NÃO vê itens devOnly, mas vê adminOnly · dev vê TODOS os itens, inclusive devOnly … |
| `tests/services/sicoobOrderService.test.ts` | 17 | sicoobOrderService.reorderOrder · delega a revalidação de catálogo à Edge Function autenticada · reutiliza a chave gerenciada quando a primeira resposta é perdida · preserva a chave em memória quando o sessionStorage recusa escrita … |
| `tests/utils/price-freshness-coverage.test.ts` | 17 | getPriceFreshness — bordas de threshold · dia exatamente no meio do threshold ainda é  · um dia após o meio do threshold vira  · dia exatamente no threshold ainda é  … |
| `tests/components/DevRoute.test.tsx` | 16 | DevRoute — loading e anônimo · mostra spinner enquanto isLoading=true · redireciona anon para /login (sem expor a página técnica) · DevRoute — DEV passa por telemetria, conexões e MCP … |
| `tests/components/admin/SecretField.test.tsx` | 16 | SecretField — banner de sufixo inválido (<4 chars) · constante MIN_SUFFIX_LENGTH é 4 (premissa do banner) · não exibe banner quando o input está vazio · exibe banner para %i char(s) com a contagem correta (%s) … |
| `tests/lib/validate.test.ts` | 16 | safeParseBody · parses valid JSON · returns null for empty body · returns null for invalid JSON … |
| `tests/components/PriceFreshnessBadge.labels-parity.test.tsx` | 15 | PriceFreshnessBadge — paridade de rótulos com getPriceFreshness · rótulo principal sem threshold explícito (catálogo padrão) · usa  · usa singular  … |
| `tests/components/pages/PageUtilities.test.ts` | 15 | Page Utilities - SellerCartsPage · calculates cart total correctly · handles empty cart · returns correct status colors … |
| `tests/functions/aiRecommendationsJsonParsing.test.ts` | 15 | AI Recommendations — JSON parsing (PR inline logic) · parses plain JSON without any markdown fences · strips  · strips generic  … |
| `tests/hooks/useKitBuilder-extended.test.ts` | 15 | useKitUndoRedo · initializes with empty history · pushes snapshot and enables undo · Kit Builder Pure Functions - Extended … |
| `tests/hooks/useQuotes-helpers.test.ts` | 15 | Shipping encoding/decoding · encodes shipping into notes · returns null for empty notes without shipping · preserves base notes when no shipping … |
| `tests/lib/colorSystem-utils.test.ts` | 15 | findGroupBySlug · finds group by slug · returns undefined for unknown slug · findVariationBySlug … |
| `tests/lib/connection-error-copy.test.ts` | 15 | getErrorCopy · timeout sem timeout_ms — hint genérica · timeout com timeout_ms — hint contém o valor · network … |
| `tests/lib/format-extended.test.ts` | 15 | formatCurrency · formats zero · formats integer · formats cents … |
| `tests/lib/purchasing-sla.test.ts` | 15 | métricas canônicas da gestão de compras · calcula pendências, SLA e totais a partir dos pedidos visíveis · fila recém-criada e nenhuma aprovação não viram 100% · não apresenta agregado parcial quando a consulta trunca … |
| `tests/scripts/check-critical-test-skip-budget.test.ts` | 15 | findSkips — formas de desligar um teste · x %s · evaluate — orçamento por arquivo · aceita exatamente o orçamento … |
| `tests/utils/colorSorting-extended.test.ts` | 15 | sortByColorGroup · should return empty array for empty input · should sort Preto before Branco before Azul · should sort dark variants before light within same group … |
| `tests/utils/price-freshness.default-threshold.test.ts` | 15 | getPriceFreshness — default 60d quando threshold não existe · garante que a constante default vale 60 dias (contrato público) · usa default 60d quando threshold é null (cenário real do BD externo) · usa default 60d quando threshold é undefined (campo ausente do payload) … |
| `tests/components/BulkSelectionBar.test.tsx` | 14 | BulkSelectionBar · renders when isActive is true · does not render when isActive is false · shows selected count badge … |
| `tests/components/kit-builder/DashboardAndManagement.test.tsx` | 14 | RecentKitsWidget · renders empty state when no kits · renders component without errors · MeusKitsPage Filters Logic … |
| `tests/hooks/useCollections.test.ts` | 14 | useCollections — variant architecture · creates a collection with empty productItems · stores variant info when adding product to collection · stores product without variant when none is provided … |
| `tests/hooks/useMarketIntelligenceMacro.order.test.tsx` | 14 | janela de consulta do mercado macro · pagina por id (ordem total) para não repetir nem omitir dias empatados · entrega a série em ordem cronológica mesmo paginando por id · amplia a janela no servidor: 360 dias pede um corte anterior ao de 30 dias … |
| `tests/lib/theme-radius-smoke.test.ts` | 14 | Smoke E2E — boot fresh com defaults pós-bump · boot fresh sem localStorage usa defaults novos (corporate, radius=14) · botões (rounded-md = --radius - 2px) ficam com 12px no estado padrão · cards (rounded-lg = --radius) ficam com 14px no estado padrão … |
| `tests/pages/trends-queries.test.ts` | 14 | consultas de tendências · alinha as janelas aos dias civis, incluindo o dia atual · alinha o papel %s às capacidades comprovadas pela RLS · filtra cada evento pela coluna de autoria observada no banco … |
| `tests/scripts/autofix-colors.test.ts` | 14 | autofix colors-map · texto: qualquer tom vira o token · fundo claro vira /10 (ou /5 quando já tinha opacidade) · fundo forte vira sólido … |
| `tests/scripts/rules-definer-search-path.test.ts` | 14 | rules/plano-definer-sem-search-path · acusa DEFINER sem SET (atributos antes do corpo) · aceita SET search_path antes ou depois do corpo · reconhece o schema public entre aspas (CREATE, ALTER e DROP) … |
| `tests/unit/fuzzing.test.ts` | 14 | Fuzz Testing — Input Resilience · String Fields · handles buffer overflows / extreme lengths · handles unicode and emojis … |
| `e2e/rbac-navigation.spec.ts` | 13 | RBAC e navegação · Perfil vendedor · acessa as áreas comerciais · recebe 403 nas áreas administrativas … |
| `tests/components/PriceFreshnessBadge.quickViewAlwaysShow.test.tsx` | 13 | Quick View / hosts compactos — alwaysShow=false respeita aging\|stale · variant=%s sem alwaysShow · fresh: NÃO renderiza badge · unknown: NÃO renderiza badge … |
| `tests/components/search/HighlightMatch.test.tsx` | 13 | HighlightMatch · Renderização básica · renderiza texto sem query · renderiza texto com query curta (< 2 chars) sem highlight … |
| `tests/components/sicoob/OrderInvoicesTab.amount.test.ts` | 13 | parseAmountBR · lê milhar sem decimais como milhar · lê o separador decimal correto · lê milhar no formato US com centavos … |
| `tests/hooks/useAutoSave.test.tsx` | 13 | useAutoSave · persiste apenas no namespace informado, preservando rascunhos simultâneos · grava o rascunho pendente quando a persistência é desligada · grava a volta ao valor inicial quando ela acontece durante o envio … |
| `tests/hooks/useConnectionTester.test.tsx` | 13 | webhook_outbound · useConnectionTester · Timeout: preserva error_kind, timeout_ms, latency e dispara toast  · Network error: kind preservado e toast  … |
| `tests/hooks/useProductMatch-gaps.test.ts` | 13 | FIX 1: useSupplierComparison — price zero guard · should not produce Infinity when base product price is 0 · FIX 2: name similarity edge cases · should NOT match empty-named products as complementary … |
| `tests/pages/Auth.test.ts` | 13 | Auth - Login Schema Validation · rejects empty email · rejects invalid email · rejects short password … |
| `tests/scripts/rules-checkers-detalhe.test.ts` | 13 | rules/checkers — detalhe por ocorrência · mantém as linhas com arquivo e tabela, não só o cabeçalho · corrigir uma violação e introduzir outra aparece como 1 novo + 1 resolvido · remove cor ANSI e limita o volume … |
| `tests/unit/lib/system/dev-gate/DevInfraGate.test.ts` | 13 | parseGateFlag · identifica valores verdadeiros · identifica valores falsos · retorna  … |
| `tests/utils/colorSorting.test.ts` | 13 | colorSorting · sortByColorGroup · sorts by color group order (preto first, cinza last) · sorts dark before light within same group … |
| `e2e/flows/20-all-features-smoke.spec.ts` | 12 | @smoke Funcionalidades principais (gate de CI) · 00 · Sessão autenticada carregada · ${num} · ${label} · 99 · Cobertura smoke ↔ catálogo está sincronizada … |
| `e2e/flows/24-rbac-navigation.spec.ts` | 12 | Navigation & RBAC Integrity · Scenario 1: Anonymous User · should redirect anonymous user to login for protected routes · should allow access to public routes … |
| `tests/StockFilterToolbar.test.tsx` | 12 | StockFilterToolbar · renders search input · renders quantity input · renders Filtros button (status chips moved to StatCards) … |
| `tests/components/PriceFreshnessBadge.propsTransition.test.tsx` | 12 | PriceFreshnessBadge — transição de props (hosts compactos) · ${host.name} (variant= · null → stale (alwaysShow=false): hidden → visível com cor âmbar · stale → null (alwaysShow=false): visível → hidden … |
| `tests/components/data-trust-indicators.test.tsx` | 12 | integridade dos indicadores comerciais · só ativa dados fictícios de tendências por solicitação explícita · não inventa margem quando o pedido não armazena custos · não presume verba quando a competência não foi configurada … |
| `tests/components/admin/MaskedSuffixBadge.test.tsx` | 12 | MaskedSuffixBadge — UI por tamanho de sufixo · 0 chars (missing) sem length → mostra  · 0 chars + length=12 → mostra placeholder derivado  · 0 chars + length=5 →  … |
| `tests/components/admin/pluralization.test.tsx` | 12 | diagnoseMaskedSuffix — pluralização (1 caractere vs N caracteres) · 1 char → singular ( · 2 chars → plural ( · 3 chars → plural ( … |
| `tests/components/quotes/AIRecommendationsPanel.test.tsx` | 12 | AIRecommendationsPanel · exibe perfil, total de produtos e estado inicial · habilita a ação com cliente inicial e catálogo disponível · envia o perfil editado e os produtos ao hook … |
| `tests/components/sicoob/ApprovalPolicyTab.test.tsx` | 12 | ApprovalPolicyTab · mostra o padrão do sistema quando nenhuma versão foi publicada · mostra a versão vigente e as regras em vigor da Singular · publica nova versão com as regras escolhidas … |
| `tests/components/simulator/UpsellPlusPlus.test.ts` | 12 | UpsellPlusPlus generateSuggestions · suggests adding position when unused locations exist · does NOT suggest position when no engravings exist · suggests technique upgrade when premium option available … |
| `tests/edge-functions/sicoob-kit-quote-catalog.test.ts` | 12 | catálogo servidor da conversão de kit · exige contagem exata para impedir validação sobre resposta truncada · usa nome, SKU e preço vigentes da variante · agrega duas linhas da mesma variante antes de validar o saldo … |
| `tests/hooks/quoteHelpers.priceConfirmed.test.ts` | 12 | quoteHelpers — persistência do price_confirmed_at (save) · inclui price_confirmed_at no payload quando o vendedor confirmou · envia null quando o vendedor ainda NÃO confirmou · normaliza undefined → null (defensivo contra serialização) … |
| `tests/hooks/useAIRecommendations.test.ts` | 12 | useAIRecommendations · returns recommendations on success · uses cache on repeated identical requests · handles 429 rate limit without retry … |
| `tests/lib/cloud-status.test.ts` | 12 | cloud-status · returns healthy when all 3 signals pass with low latency · treats a protected REST root (401) as reachable · treats a REST 5xx as unreachable … |
| `tests/lib/error-kind-inference.test.ts` | 12 | inferErrorKind · retorna null para sucesso · respeita errorKind já gravado pelo backend (passa direto) · classifica timeout via mensagem … |
| `tests/lib/external-db-tables.test.ts` | 12 | External DB Tables constants · contains core product tables · contains corrected table names (not phantoms) · does NOT contain phantom tables that were fully removed … |
| `tests/lib/notifications-metrics-budget.test.ts` | 12 | notifications-metrics — badge budget hit/miss counters · starts with zero counters · classifies a render as a HIT when elapsedMs < 16ms · classifies a render as a MISS when elapsedMs >= 16ms … |
| `tests/security/apply-seller-scope.spec.ts` | 12 | applySellerScope · aplica .eq( · NÃO aplica filtro quando scope =  · NÃO aplica filtro quando scope =  … |
| `tests/unit/system/BridgeMetricsOverlay.test.tsx` | 12 | BridgeMetricsOverlay · não deve renderizar nada se isAllowed for false · deve renderizar o botão de abertura quando fechado · deve chamar setOpen(true) ao clicar no botão de abertura … |
| `supabase/functions/crm-db-bridge/inspectInsertResult.test.ts` | 11 | inspectInsertResult: normal rows array → shape=rows · inspectInsertResult: empty array → shape=empty-array · inspectInsertResult: null → shape=null · inspectInsertResult: GenericStringError as bare object … |
| `supabase/functions/external-db-bridge/resolveProductsSelect.test.ts` | 11 | non-products table: never forces lightweight · products + id present: keeps caller select even at large limit · products + limit === threshold (50): NOT forced (boundary) · products + limit = 51 + select= … |
| `tests/StockStatCard.test.tsx` | 11 | StockStatCard · renders title and value · applies success variant styles · applies warning variant styles … |
| `tests/admin/route-error-element-checker.test.ts` | 11 | check-route-error-element — projeto real · passa no código atual (sem violações) · modo --json retorna shape consumível por ferramentas externas · check-route-error-element — fixtures … |
| `tests/admin/route-ref-checker.test.ts` | 11 | route-ref checker — estado atual do projeto · passa no projeto real (zero violações) · route-ref checker — detecta padrões problemáticos · regra 1: detecta forwardRef em route guard … |
| `tests/components/PriceFreshnessBadge.nullDate.test.tsx` | 11 | PriceFreshnessBadge — priceUpdatedAt null/undefined · hosts compactos sem alwaysShow → SEMPRE ocultos · ${host.name} (${host.variant}) · priceUpdatedAt=null não renderiza · ${host.name} (${host.variant}) · priceUpdatedAt=undefined não renderiza … |
| `tests/components/PriceFreshnessBadge.test.tsx` | 11 | PriceFreshnessBadge · renders inline variant with full label for fresh status · does NOT render compact variant when status is fresh · renders compact variant when status is aging … |
| `tests/edge-functions/kit-quote-rota-atestado.test.ts` | 11 | rota do atesto de preço dentro de sicoob-kit-quote · o front chama a função que realmente hospeda o atesto · o handler do atesto é exportado, para poder ser servido dos dois lugares · o módulo importado pela hospedeira NÃO sobe servidor … |
| `tests/hooks/intelligence-badges.test.ts` | 11 | buildBadgeResult · does not invent market badges or metrics when intelligence is absent · preserves catalog-controlled badges while omitting unavailable market intelligence · derives market badges and metrics from real intelligence and velocity … |
| `tests/hooks/product-intelligence-real-data.test.tsx` | 11 | inteligência de produto baseada em dados reais · fonte vazia vira  · estado vazio oferece atualizar e refaz as três fontes · fonte caída sem cache vira erro com retry das três fontes, não zero nem vazio … |
| `tests/hooks/useClientsPortfolioKpis.test.ts` | 11 | fetchClientsPortfolioKpis · conta clientes distintos do mês e calcula o ticket médio da janela · separa cliente de primeira compra de quem já comprava antes · pagina o historico anterior: cliente antigo so na segunda pagina nao vira primeira compra … |
| `tests/hooks/useCrmCompanies.test.ts` | 11 | useCrmCompanies · usa o contrato fechado quando o filtro é apenas is_customer · mantém o select genérico quando há filtro que o contrato não aceita · mantém o select genérico quando o filtro booleano é explicitamente false … |
| `tests/hooks/useFocusContext.test.ts` | 11 | useFocusContext · estado inicial vazio quando localStorage está limpo · setZone atualiza lastZone e savedAt e persiste em localStorage · setIncident atualiza lastIncidentId sem afetar lastZone … |
| `tests/hooks/useGravacaoPriceV2.test.ts` | 11 | mapPriceResponseToFlat (nested format) · maps nested response correctly · extracts tabela_codigo_curto from hyphenated code · handles redirect info … |
| `tests/hooks/useUndoRedo.test.ts` | 11 | useUndoableReducer · starts with initial state · dispatches tracked actions and enables undo · undo restores previous state … |
| `tests/lib/bridge.test.ts` | 11 | invokeBridge · retorna o data da resposta em sucesso · permite operação batch sem table · invokeExternalDb … |
| `tests/lib/image-converter-extended.test.ts` | 11 | needsConversion — extended · false for PNG · false for JPEG · false for JPG type … |
| `tests/lib/textUtils-extended.test.ts` | 11 | toTitleCase — comprehensive · capitalizes single word · capitalizes all-caps input · keeps prepositions lowercase … |
| `tests/lib/sicoob/orderCostCenterAllocation.test.ts` | 11 | buildAllocationPayload · fecha 100,00 em rateio de tres centros iguais · fecha 100,00 em rateio de seis centros iguais · fecha 100,00 em rateio de sete centros iguais … |
| `tests/p0/webhooks-resilience.test.ts` | 11 | P0 — webhooks resilientes · bitrix-sync: valida a operação antes de consultar serviços · bitrix-sync: protege o upstream com circuit breaker · backoff compartilhado: limita tentativas, usa jitter e respeita orçamento … |
| `tests/scenarios/email-transacional-resolve.test.mjs` | 11 | quote_sent recusa rascunho: nada foi anunciado ao cliente · quote_sent recusa orçamento vencido (portal rejeitaria o link) · quote_sent emite link público para orçamento válido · quote_rejected não emite link: recusa do Kanban não cria resposta … |
| `tests/search/GlobalSearchHelpers.test.tsx` | 11 | RankBadge · renders Trophy icon for index 0 · renders Medal for index 1 · renders  … |
| `tests/security/privileged-client-data-guards.test.ts` | 11 | barreiras estaticas para dados privilegiados de clientes · carrega todos os papeis e falha fechado para vinculo invalido · autoriza o shape completo antes de resolver a credencial service-role externa · ignora comentario que cita a tag de rota ao medir o bloco … |
| `tests/services/orderService.test.ts` | 11 | OrderService.convertQuoteToOrder · delega toda a conversão à RPC transacional do domínio Sicoob · não envia identidade ou organização fornecida pelo navegador ao banco · propaga a falha atômica devolvida pela RPC … |
| `e2e/editor-permissions.spec.ts` | 10 | Gestor de Compras — permissões e navegação · acessa catálogo, orçamentos e painéis próprios da Singular · carrega os módulos de governança e gestão de compras · bloqueia painéis administrativos reservados ao supervisor … |
| `tests/a11y/onda5-a11y.test.tsx` | 10 | Onda 5 — auditoria automatizada axe-core (WCAG 2.1 AA) · MagicUpVariationComparator · não viola regras WCAG com 3 variações (button-name, aria-*, nested-interactive) · não viola WCAG quando uma variação está ativa e outra é vencedora (aria-pressed/aria-current) … |
| `tests/components/AdminConexoesAccess.test.tsx` | 10 | Acesso a /admin/conexoes · redireciona para /login quando não há sessão · exibe bloqueio técnico para vendedor · exibe bloqueio técnico para supervisor … |
| `tests/components/supplier-trust-badges.test.tsx` | 10 | DynamicTrustBadges com dado do catálogo · mostra o prazo real quando o produto tem lead time · não mostra selo nenhum quando o catálogo não tem prazo · não inventa fornecedor verificado nem avaliação … |
| `tests/components/admin/SecretField.a11y.test.tsx` | 10 | SecretField — banner de sufixo inválido (a11y) · expõe role= · é programaticamente focável (tabIndex=-1) para que screen readers/ações possam direcionar foco · expõe estilo de foco visível (focus-visible:ring-2 + ring-destructive) para conformidade com WCAG 2.4.7 … |
| `tests/components/admin/connections/ZoneSection.test.tsx` | 10 | ZoneSection — colapso · renderiza conteúdo visível quando expandido (default) · oculta conteúdo via atributo hidden quando collapsed=true · não renderiza botão de toggle se onToggleCollapse não for fornecido … |
| `tests/components/replenishments/ReplenishmentCards.test.tsx` | 10 | ReplenishmentGridCard — label changes (PR) · renders  · does NOT render the old  · renders the ProductSparkline for the product … |
| `tests/edge-functions/sicoob-reorder-catalog.test.ts` | 10 | catálogo vigente da recompra Sicoob · soma linhas da mesma variante antes de validar o estoque · usa o preço vigente da variante e preserva cada item de origem · usa o maior mínimo vigente informado pelo catálogo … |
| `tests/functions/scheduled-report-email.test.ts` | 10 | sendScheduledReportEmail · falha sem chave do provedor e não avança o agendamento · não avança o agendamento quando Resend responde HTTP %s · confirma o ciclo quando o provedor responde 409 para a chave do ciclo … |
| `tests/hooks/useBulkSelection-extended.test.ts` | 10 | useBulkSelection — extended · starts empty · toggleItem adds item · toggleItem removes when toggled again … |
| `tests/hooks/useDebounce-extended.test.ts` | 10 | useDebounce — extended · returns initial value immediately · does not update before delay · updates exactly at delay … |
| `tests/hooks/useScroll.test.ts` | 10 | useScroll · starts at top · accepts custom threshold · useScrollDirection … |
| `tests/hooks/useZoneCollapse.test.ts` | 10 | useZoneCollapse · inicia com todas as zonas expandidas (collapsed=false) por padrão · toggle alterna o estado de uma zona específica sem afetar as outras · expand reabre uma zona colapsada e é no-op se já expandida (preserva referência) … |
| `tests/lib/dev-route-telemetry.test.ts` | 10 | recordDevRouteTelemetry — payload e RPC · chama record_dev_route_telemetry com event_type, path, role e duration arredondado · passa undefined (não null) quando userRole/durationMs estão ausentes · não envia PII: payload contém apenas event_type, path, role e duration … |
| `tests/lib/quote-status-config.test.ts` | 10 | isQuoteCommerciallyEditable · permite alteração no estado %s · preserva a versão histórica no estado %s · preserva o histórico no estado %s … |
| `tests/lib/saida-da-tela.test.ts` | 10 | textoDaSaida · promete gravar quando o autosave cobre a saida · avisa descarte quando a gravacao falhou · avisa descarte no conflito com outra aba e nao tenta gravar de novo … |
| `tests/lib/supplier-colors.test.ts` | 10 | getSupplierColors · returns XBZ colors for xbz supplier · returns Spot colors for SPOT supplier · returns Spot colors for Stricker supplier … |
| `tests/lib/auth/apply-seller-scope.test.ts` | 10 | applySellerScope · aplica .eq( · permite trocar a coluna do filtro (ex.: user_id) · NÃO aplica filtro quando escopo é all (admin/dev) … |
| `tests/lib/personalization/rpc-contracts.test.ts` | 10 | PRICE_CONTRACT · aceita payload PT canônico · resolve aliases EN · detecta campo obrigatório faltando … |
| `tests/p0/edge-functions-failing.test.ts` | 10 | P0 — Edge Functions críticas · full-op-diagnostics: autentica e produz exatamente os quatro checks declarados · crm-db-bridge: converte ausência do módulo opcional em leitura vazia estável · crm-db-bridge: impede escrita quando o módulo opcional não está disponível … |
| `tests/scripts/verifier-arguments.test.ts` | 10 | check-price-freshness-coverage — tolerância · COVERAGE_TOLERANCE_PP=%j é recusado (exit 2) · valor válido passa da validação (falha depois, por falta do coverage-summary) · check-edge-functions-health — --timeout … |
| `tests/scripts/verify-supabase-functions-published.test.ts` | 10 | verifyPublishedFunctions · aceita função inalterada quando o deploy informa que não havia mudanças · aceita função recém-publicada com versão maior · rejeita função ausente na lista atual … |
| `tests/security/portal-access-policy.test.ts` | 10 | política de acesso privilegiado do portal · falha fechado quando o usuário não possui papel · avalia todos os papéis sem permitir que vendedor amplie o acesso · nega CRM e clientId para vendedor … |
| `tests/utils/price-freshness-timezone.test.ts` | 10 | getPriceFreshness — robustez de timezone · instante 23h atrás escrito em qualquer fuso ainda é  · instante de %i dias atrás produz o mesmo label em todos os fusos · singular  … |
| `tests/utils/price-freshness.test.ts` | 10 | getPriceFreshness · returns  · returns  · returns  … |
| `e2e/routes/public/login.spec.ts` | 9 | /login · render: form de login renderiza com campos essenciais · happy: validação de email triggera mensagem inline · auth fail: credenciais erradas → permanece em /login … |
| `e2e/routes/public/reset-password.spec.ts` | 9 | /reset-password · sem token: informa que o link de recuperação é inválido · happy: senha forte válida habilita botão de submeter · token inválido: sem access_token mostra mensagem ou redireciona … |
| `e2e/routes/sicoob/logistica-onda-a.spec.ts` | 9 | Sicoob • Logística Onda A — acesso anônimo · anônimo em ${r.href} → redireciona para /login · Sicoob • Logística Onda A — gestor_compras (acesso permitido) · acessa ${r.href} e renderiza título  … |
| `supabase/functions/_shared/external-db-telemetry.test.ts` | 9 | classifyErrorKind: status ok/slow/very_slow → null · classifyErrorKind: error sem mensagem → unknown · classifyErrorKind: timeout (varias formas) · classifyErrorKind: rate_limit … |
| `supabase/functions/connections-auto-test/assertServiceClient.test.ts` | 9 | assertServiceClient: aceita mock com forma de SupabaseClient · assertServiceClient: rejeita null · assertServiceClient: rejeita undefined · assertServiceClient: rejeita string / number / boolean … |
| `tests/components/NotificationDrawer-a11y.test.tsx` | 9 | NotificationDrawer — keyboard & screen-reader prefetch coverage · triggers prefetch when the bell receives keyboard focus (Tab navigation) · triggers prefetch when focused programmatically (screen reader navigation) · triggers prefetch on touchstart for touch-only devices (no hover capability) … |
| `tests/components/PriceFreshnessBadge.thresholdMatrix.test.tsx` | 9 | PriceFreshnessBadge × thresholdDays — matriz parametrizada · getPriceFreshness (util) classifica corretamente cada (threshold × dias) · threshold=$threshold, daysSince=$daysSince → status=$expected · variant=%s (catálogo: card / lista / tabela) … |
| `tests/components/admin/connections/ZoneRefreshButton.collapsed.test.tsx` | 9 | ZoneRefreshButton — interação com zona colapsada · o botão de refresh permanece visível e clicável quando a zona está colapsada · invalida queryKeys mesmo com a zona colapsada · exibe estado de loading (texto + spinner) durante o refresh com zona colapsada … |
| `tests/components/admin/connections/connectionStatus.test.ts` | 9 | resolveSupabaseConnectionStatus · readOnly cards são sempre active (gerenciados) · retorna  · retorna  … |
| `tests/components/cart/cart-company-picker-dialog.error.test.tsx` | 9 | CartCompanyPickerDialog — erro no diretório · mostra erro + Tentar novamente quando o fetch falha, e recupera no retry · não inventa vazio no erro (a mensagem de vazio é exclusiva do sucesso) · picker inline: erro mostra Tentar novamente em vez de vazio … |
| `tests/components/products/ProductSparkline.labels.test.tsx` | 9 | ProductSparkline — origem dos dados · renders the sparkline SVG when real data is available · does NOT show old  · identifica as saídas de estoque na grade de métricas … |
| `tests/components/quotes/QuoteAutoSave.transicao.test.tsx` | 9 | QuoteAutoSave quando o orçamento deixa de ser editável · grava no mesmo rascunho a edição feita durante o envio · apaga o rascunho do orçamento que o usuário descartou · não apaga o rascunho que outra aba gravou … |
| `tests/components/quotes/QuoteShareDialog.test.tsx` | 9 | QuoteShareDialog · reutiliza o token ativo e compartilha somente a rota pública · gera um novo token pelo fluxo canônico quando não há link · oferece novo link quando o token está %s … |
| `tests/contexts/AuthContext.test.tsx` | 9 | AuthContext · throws error when useAuth is used outside AuthProvider · starts with isLoading=true then sets false when no session · sets up auth listener and calls getSession … |
| `tests/e2e/infra-banners-prod.test.tsx` | 9 | E2E Infra Banners — Modo PROD (Usuário Não-Dev) · CloudStatusBanner · OCULTA mensagem técnica  · EXIBE mensagem crítica  … |
| `tests/edge-functions/parseAiResponse.test.ts` | 9 | parseAiResponse · parses tool call arguments correctly · falls back to content parsing when no tool calls · returns fallback for invalid JSON in tool call args … |
| `tests/hooks/useClientVsIndustry.reliable-data.test.tsx` | 9 | useClientVsIndustry — dados confiáveis · cliente real sem histórico não vira simulado nem desempenho zero contra o setor · distingue indisponibilidade técnica do histórico de ausência legítima de pedidos · calcula métricas somente quando cliente e amostra do ramo têm dado medido … |
| `tests/hooks/useFavorites.test.ts` | 9 | useFavorites · initializes with empty favorites · adds a favorite · does not duplicate favorites … |
| `tests/hooks/useSmartNavigation.test.tsx` | 9 | useSmartNavigation.goBack · fecha overlay role=%s aberto em vez de navegar · fecha conteúdo popper (select/popover) aberto em vez de navegar · tooltip aberto NÃO bloqueia a navegação … |
| `tests/hooks/useUrlState.test.tsx` | 9 | useUrlState · retorna defaultValue quando param ausente · lê valor do param da URL · setValue atualiza para valor não-default … |
| `tests/hooks/useVoiceAgent.test.ts` | 9 | useVoiceAgent · starts in idle state · waits for session_started before moving to listening · updates partial transcript while listening … |
| `tests/hooks/quote/quote-url-prefill.test.ts` | 9 | pré-carga de orçamento por URL · busca IDs de produto, comparação e tendência sem confiar em preço ou quantidade da URL · expande comparação em lista, remove IDs repetidos e associa cliente sem aceitar nome fornecido pela URL · ignora IDs vazios ou excessivamente longos e limita a carga de produtos … |
| `tests/integration/discountApprovalFlow.test.ts` | 9 | E2E: Vendedor solicita aprovação de desconto · confirma pedido, status e histórico em uma RPC e só então notifica admins · retorna false se não houver usuário autenticado · não envia notificação se nenhum admin existir … |
| `tests/lib/format.test.ts` | 9 | formatCurrency · should format positive values in BRL · should format zero · should format negative values … |
| `tests/lib/secret-validators.test.ts` | 9 | validateSecret — guarda de sufixo mínimo (4 chars) · expõe MIN_SUFFIX_LENGTH = 4 · rejeita valor vazio sem mensagem (apenas hint) · rejeita 1 char com mensagem específica de sufixo (singular) … |
| `tests/p0/external-integrations.test.ts` | 9 | P0 — integrações externas · catálogo: mantém referências já obtidas disponíveis no cache local · catálogo: sinaliza indisponibilidade confirmada sem tratar falha como lista vazia · consulta CNPJ: valida entrada, autentica e usa fetch externo com timeout/circuit breaker … |
| `tests/pages/GestorCompras.metrics.test.tsx` | 9 | Indicadores na tela de Gestão de Compras · mostra os números que vêm do serviço, e nenhum valor fictício · falha na consulta avisa e não inventa estimativa · cooperativa sem verba cadastrada diz isso, em vez de mostrar zero … |
| `tests/rls/personas.test.ts` | 9 | cannot SELECT quotes · cannot SELECT user_roles · cannot SELECT login_attempts · logs in … |
| `tests/scripts/rules-rotina-diff.test.ts` | 9 | rules/diff — comparação entre execuções · detecta novos e resolvidos · primeira execução não tem base: nada novo nem resolvido · regra que ERROU hoje não vira  … |
| `tests/stores/useComparisonStore.test.ts` | 9 | useComparisonStore — variant selection · stores variant when adding to compare · persists variant to localStorage · retrieves variant via getCompareVariant … |
| `tests/stores/useFavoritesStore.test.ts` | 9 | useFavoritesStore — variant selection · stores variant info when adding favorite · persists variant info to localStorage · retrieves variant info via getFavoriteVariant … |
| `tests/utils/format.test.ts` | 9 | formatCurrency · formats zero · formats a positive value · formats a negative value … |
| `e2e/auth.spec.ts` | 8 | Auth — Login Flow · renderiza form de login completo · erro de validação para email vazio · erro de validação para email inválido … |
| `e2e/quote-approval.spec.ts` | 8 | Quote Approval — Public Page · should show error for invalid token · should show loading state initially · should not require authentication … |
| `e2e/flows/21-feature-matrix.spec.ts` | 8 | Cross-feature matrix · Catálogo → Produto → Favoritar → Lista de Favoritos · Produto → Comparar → Página de Comparação · Carrinho → Checkout → Confirm dialog renderiza … |
| `supabase/functions/generate-ad-image/index.test.ts` | 8 | rejects empty body · rejects invalid productImageUrl · rejects empty scenePrompt · rejects when neither logoBase64 nor logoUrl provided … |
| `tests/admin/reduced-app-navigation.test.tsx` | 8 | Reduced App integration — navegação não emite ref warning · monta na home e renderiza Outlet sem warning · navegação protected → admin → dev → protected sem warning · acesso direto a rota dev (deep link) não emite warning … |
| `tests/admin/route-no-error-element.test.tsx` | 8 | Rotas admin/dev/protected — nenhum elemento renderizado usa  · auto-teste: o coletor consegue detectar  · home (/) — árvore limpa de errorElement · deep-link em todas as rotas relevantes — árvore limpa … |
| `tests/components/AdminRoute.test.tsx` | 8 | AdminRoute · shows loader while auth is loading · redirects to /login when user is not authenticated · redirects to / when user cannot manage (vendedor) … |
| `tests/components/LastTestLine.test.tsx` | 8 | LastTestLine · Sucesso: mostra  · Nunca verificado quando info é null · Timeout com timeout_ms exibe título, hint com  … |
| `tests/components/NotificationDrawer-debounce-config.test.tsx` | 8 | NotificationDrawer — configurable prefetch debounce delay · exports a sane default constant (200ms) · uses the default 200ms when prop is omitted · fires faster with a shorter custom delay (50ms) … |
| `tests/components/PriceFreshnessBadge.limit-suffix.test.tsx` | 8 | PriceFreshnessBadge — sufixo (limite Yd) · inline: mostra  · inline: NÃO mostra  · inline: NÃO mostra  … |
| `tests/components/ProtectedRoute.test.tsx` | 8 | ProtectedRoute · shows loader while auth is loading · redirects to /login when user is not authenticated · renders children when user is authenticated … |
| `tests/components/admin/connections/ZoneCommandPalette.test.tsx` | 8 | useZoneCommandPalette · não captura Ctrl+K, reservado à barra global de comandos · ignora o atalho quando o foco está num <input> · ZoneCommandPalette — interação … |
| `tests/components/novelties/NoveltyCards.test.tsx` | 8 | NoveltyGridCard — label changes (PR) · renders  · does NOT render the old  · renders the ProductSparkline for the product … |
| `tests/components/products/ProductCardImage.private-storage.test.tsx` | 8 | imagem privada do catálogo · assina a referência durável e não gera srcSet sem autorização · mantém uma imagem pública sem pedir assinatura · não trata rota de storage de outro domínio como imagem privada … |
| `tests/hooks/useClientHealthScore.reliable-data.test.ts` | 8 | score de saúde com fonte comprovada · não trata o score sentinela desconhecido como um zero real · não fabrica score, potencial ou recomendação quando a amostra é insuficiente · não publica score global com amostra setorial insuficiente, mesmo havendo recência do cliente … |
| `tests/hooks/useClientsComparison.availability.test.tsx` | 8 | useSingleClientComparisonRow — disponibilidade por fonte · descarta afinidade em cache após falha e usa histórico confiável como fallback · isola falhas de categoria e usa a afinidade confiável como fallback do topo · propaga CRM indisponível para métricas dependentes do ramo e permite retry … |
| `tests/hooks/useDebounce.test.ts` | 8 | useDebounce · should return initial value immediately · should debounce value changes · should reset timer on rapid value changes … |
| `tests/hooks/useErrorHandler.test.ts` | 8 | useErrorHandler · handleError shows toast with error message · handleError uses custom message when provided · handleError suppresses toast when silent … |
| `tests/hooks/useFavoriteQuickAdd.test.tsx` | 8 | useFavoriteQuickAdd · reflete a inclusão local antes de a gravação remota terminar · serializa duas alterações rápidas e preserva a intenção mais recente · mantém removido quando inclusão e remoção rápidas falham no banco … |
| `tests/hooks/useLoginRateLimit.test.ts` | 8 | useLoginRateLimit · permite login quando não há registro · incrementa tentativas e bloqueia após 5 · é case-insensitive no email … |
| `tests/hooks/useMockupGenerator.test.ts` | 8 | useMockupGenerator (smoke) · exporta o hook como função · monta sem crashar com providers padrão · restauração de rascunho … |
| `tests/hooks/useSmartNavigation.registro-sujo.test.tsx` | 8 | voltar x registro de estado sujo · tela LIMPA que declarou estado sai sem perguntar, mesmo em rota crítica · tela ALTERADA pergunta, e  · a tela escolhe o texto do aviso, em vez do genérico … |
| `tests/hooks/useWorkspaceNotifications-cache-invalidation.test.tsx` | 8 | useWorkspaceNotifications — cache invalidation after mutations · markAllAsRead removes the sessionStorage cache entry and triggers a silent re-fetch · clearAll removes the sessionStorage cache entry and triggers a silent re-fetch · re-fetch after markAllAsRead bypasses the 5s prefetch TTL window … |
| `tests/hooks/useWorkspaceNotifications-prefetch.test.tsx` | 8 | useWorkspaceNotifications — prefetch TTL idempotency · does not refetch when prefetch is called within 5s of last fetch · refetches when prefetch is called after the 5s TTL window · never toggles isLoading=true during a silent prefetch … |
| `tests/hooks/bi/useClientSeasonality.test.tsx` | 8 | useClientSeasonality · não classifica setor sem atividade e sem três compradores como amostra real · não transforma a média de duas empresas em sazonalidade do setor · cadastro no ramo não é histórico: três cadastros com um comprador não viram setor … |
| `tests/lib/format-utils.test.ts` | 8 | formatCurrency · formats zero · formats positive values · formats negative values … |
| `tests/lib/overlay.test.tsx` | 8 | overlay — detecção com componentes Radix reais · tooltip aberto NÃO conta como overlay · popover aberto conta como overlay · dialog Radix real fecha com dismissTopmostOverlay … |
| `tests/lib/product-record-images.test.ts` | 8 | resolveProductRecordImages · assina as referencias privadas guardadas no proprio registro do produto · mantem o valor original quando o storage nao consegue assinar · resolveProductImageRecords … |
| `tests/lib/textUtils.test.ts` | 8 | toTitleCase · should capitalize first letter of each word · should keep prepositions lowercase (except first word) · should capitalize first word even if preposition … |
| `tests/p0/auth-recovery.test.ts` | 8 | P0 — recuperação de autenticação · login: uma falha do Auth sempre libera novamente o formulário · sessão expirada: preserva a rota solicitada e aceita somente retorno interno · logout global: exige papel privilegiado e confirmação antes de revogar sessões … |
| `tests/pages/AdminLoginAttemptsPage.test.tsx` | 8 | AdminLoginAttemptsPage · renders the page title · renders stats cards · renders stat values … |
| `tests/pages/kit-builder-guarda-saida.test.tsx` | 8 | guarda de saída do montador de kit · segura a saída quando o autosave falhou · nao atrapalha quando tudo esta salvo · para de segurar assim que o estado deixa de ter pendencia … |
| `tests/pages/orders-filtros-na-url.test.ts` | 8 | filtros de pedidos na URL · lê busca, status, empresa e página · sem query, devolve o padrão e a primeira página · data é lida como dia local — fuso negativo não pode andar um dia … |
| `tests/scripts/check-codeql-sarif.test.ts` | 8 | gate SARIF do CodeQL · aceita uma análise válida sem achados · expõe regra, severidade e localização de cada achado · rejeita diretório sem SARIF e SARIF sem execução … |
| `tests/scripts/check-seller-scope.test.ts` | 8 | analyzeSource — consulta SEM escopo precisa ser acusada · em Promise.all cada query é avaliada sozinha (a escopada não  · analyzeSource — consulta COM escopo ou justificada passa · informa a linha e a tabela da violação … |
| `tests/scripts/classify-migration-backlog.test.ts` | 8 | classificador do backlog de migrations · ignora operações perigosas mencionadas apenas em comentários · bloqueia DDL destrutivo e DML de remoção · prioriza revisão de policy aberta e SECURITY DEFINER sem search_path … |
| `tests/scripts/edge-runtime-contract.test.ts` | 8 | contrato de runtime — manifesto real · o campo runtime só aceita os dois valores do contrato · nenhuma função  · toda função da allowlist de publicação existe no manifesto … |
| `tests/scripts/tscheck-files.test.ts` | 8 | tscheck-files · caminho absoluto também casa com a saída relativa do tsc · não confunde prefixo: pedir src/bad não acusa src/bad.ts · arquivo sem erro passa (exit 0) … |
| `tests/security/search-analytics-legacy-insert.spec.ts` | 8 | search_analytics — compatibilidade de insert legado · normalizador sobrescreve user_id e seller_id com auth.uid() · normalizador não preserva autoria enviada pelo cliente · normalizador roda como SECURITY INVOKER com search_path fixado … |
| `tests/services/publicFavoriteListService.test.ts` | 8 | lista pública de favoritos · consulta uma única RPC limitada pelo token e retorna lista e itens · não consulta a RPC quando o token não existe · preserva lista inexistente ou expirada como resposta vazia … |
| `tests/services/quoteReorder.test.ts` | 8 | QuoteService.reorder · usa a Edge Function de revalidação em vez de copiar preço no navegador · expõe a mensagem comercial segura devolvida pela função · reutiliza a chave após perda de resposta e encerra a intenção após sucesso … |
| `tests/sicoob/route-access-scenarios.test.tsx` | 8 | Cenários reais dos guards de compras · %s permite o papel atribuído %s · %s recusa %s mesmo com profiles.role=dev · considera todos os papéis, sem depender da ordem … |
| `tests/workflows/WorkflowEditDialog.test.tsx` | 8 | WorkflowEditDialog · renders nothing when step is null · renders dialog with step data · shows prompt textarea for agent type … |
| `e2e/order-status-rbac.spec.ts` | 7 | Pedidos Sicoob — RBAC canônico · vendedor consulta a lista de pedidos · vendedor acompanha pedidos pelo kanban · gestor acessa pedidos e o módulo de gestão de compras … |
| `e2e/flows/01-auth.spec.ts` | 7 | Fluxo: Auth · renderiza form de login com elementos essenciais · rejeita credenciais inválidas e permanece em /login · valida email malformado … |
| `e2e/flows/22-header-sticky.spec.ts` | 7 | @header-sticky Header sticky — rotas autenticadas (app + quotes) [${vp.name} ${vp.width}×${vp.height}] · header permanece fixo ao rolar em ${route.path} · @header-sticky Header sticky — rotas admin [${vp.name} ${vp.width}×${vp.height}] · header permanece fixo ao rolar em ${route.path} … |
| `e2e/flows/p0/08-password-recovery.spec.ts` | 7 | P0 — Password recovery · positivo: /reset-password com token válido aceita senha forte e habilita submit · negativo: acesso a /reset-password SEM token → mensagem ou redirect, nunca habilita reset · negativo: senha fraca dispara validação inline (não chama auth) … |
| `e2e/routes/sicoob/orders-list.spec.ts` | 7 | Sicoob Orders List · render: shows orders list page with filters · filters: combined filter and combined results · pagination & sorting: validates chronological consistency on timeline … |
| `supabase/functions/_shared/ai-usage-stream.test.ts` | 7 | extractUsageFromSseLine lê o uso final de um stream compatível com OpenAI · extractUsageFromSseLine ignora fragmentos, eventos sem uso e marcador final · trackStreamingResponse finaliza uma vez no EOF e registra os tokens · trackStreamingResponse registra uso parcial ao consumidor cancelar … |
| `supabase/functions/crm-db-bridge/firstRowAsRecord.test.ts` | 7 | toRecord: returns null for null/undefined/primitives/arrays · toRecord: returns null for GenericStringError-like payload · toRecord: returns the object itself for a plain row · firstRowAsRecord: null for non-array/empty inputs … |
| `supabase/functions/external-db-bridge/lightweightSelect.e2e.test.ts` | 7 | E2E force-lightweight: products + limit=51 + select= · E2E force-lightweight: products + limit=300 + select omitido → lightweight · E2E no-force: products + fetch por id (filters.id) → payload completo · E2E no-force: products + limit=50 (boundary) + select= … |
| `supabase/functions/sicoob-document-ingest/registration-state.test.ts` | 7 | a correspondência exige id, caminhos, hash e estado limpo · resultado ambíguo preserva os dois objetos para reconciliação · registro ausente ou divergente após RPC permanece inconclusivo · registro confirmado preserva o arquivo final e limpa a quarentena … |
| `tests/components/MfaGate.test.tsx` | 7 | MfaGate das telas do gestor · renderiza o conteúdo com segundo fator ativo e sessão aal2 · não renderiza o conteúdo para gestor sem segundo fator · não redireciona o gestor após ativar o segundo fator … |
| `tests/components/PriceFreshnessBadge.colorAndIcon.test.tsx` | 7 | PriceFreshnessBadge — cor e ícone por status × superfície · superfície: ${surface} (variant= · status=${status} aplica família de cor correta · status=${status} renderiza o ícone Lucide correspondente … |
| … +469 linhas — lista completa em `context.json` | | |

## L. Eventos de webhook tratados (contratos com sistemas externos)

| Evento | Arquivo |
|---|---|
| `explore` | `public/sw.js` |
| `status_change` | `src/components/quotes/QuoteHistoryTimeline.tsx` |
| `recovered` | `src/lib/external-db/bridge-telemetry-client.ts` |
| `unavailable` | `src/lib/external-db/bridge-telemetry-client.ts` |
| `companies` | `supabase/functions/crm-db-bridge/index.ts` |
| `contacts` | `supabase/functions/crm-db-bridge/index.ts` |
| `industry_peers` | `supabase/functions/crm-db-bridge/index.ts` |
| `create` | `supabase/functions/manage-users/index.ts` |
| `delete` | `supabase/functions/manage-users/index.ts` |
| `promote_role` | `supabase/functions/manage-users/index.ts` |
| `update_email` | `supabase/functions/manage-users/index.ts` |
| `update_password` | `supabase/functions/manage-users/index.ts` |
| `list` | `supabase/functions/sicoob-approval-reconciliation/index.ts` |

## M. Efeitos colaterais (e-mail, SMS, cobrança, fila — não são idempotentes por padrão)

| Chamada | Arquivo |
|---|---|
| `.add("high-contrast"` | `src/components/a11y/AccessibilityProvider.tsx` |
| `.add("keyboard-mode"` | `src/components/a11y/AccessibilityProvider.tsx` |
| `invoke(` | `src/components/admin/ImageUploadButton.tsx` |
| `invoke(` | `src/components/admin/OwnershipRepairDialog.tsx` |
| `invoke(` | `src/components/admin/connections/CredentialCacheMetricsPanel.tsx` |
| `invoke(` | `src/components/admin/connections/DataSourceDebugTab.tsx` |
| `invoke(` | `src/components/admin/connections/FailedDeliveriesPanel.tsx` |
| `invoke(` | `src/components/admin/connections/GitHubCredentialsTester.tsx` |
| `invoke(` | `src/components/admin/connections/IntegrationsHealthCard.tsx` |
| `notifyAuditResult` | `src/components/admin/connections/IntegrationsHealthCard.tsx` |
| `invoke(` | `src/components/admin/connections/LastSyncRunPanel.tsx` |
| `invoke(` | `src/components/admin/connections/McpTab.tsx` |
| `invoke(` | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| `notifyResults` | `src/components/admin/connections/TestAllConnectionsButton.tsx` |
| `invoke(` | `src/components/admin/connections/WebhookPlaygroundPanel.tsx` |
| `notifyDispatch` | `src/components/admin/connections/WebhookPlaygroundPanel.tsx` |
| `notifyAttempt` | `src/components/admin/connections/secretRetry.ts` |
| `invoke(` | `src/components/admin/products/ProductMaterialsSection.tsx` |
| `invoke(` | `src/components/admin/products/ProductTagsSection.tsx` |
| `invoke(` | `src/components/admin/products/ProductVariationAxesConfig.tsx` |
| `invoke(` | `src/components/admin/products/useProductVariants.ts` |
| `invoke(` | `src/components/admin/products/image-gallery/useProductImageGallery.ts` |
| `invoke(` | `src/components/admin/products/kit-components/api.ts` |
| `invoke(` | `src/components/admin/products/sections/engraving/useEngravingWizard.ts` |
| `invoke(` | `src/components/admin/products/video-gallery/useProductVideoGallery.ts` |
| `invoke(` | `src/components/admin/security/BlockIpButton.tsx` |
| `invoke(` | `src/components/admin/security/ForceGlobalLogoutDialog.tsx` |
| `invoke(` | `src/components/admin/security/SecureUploadManager.tsx` |
| `invoke(` | `src/components/admin/security/keys/UpdateMcpKeyDialog.tsx` |
| `invoke(` | `src/components/admin/security/keys/useMcpKeys.ts` |
| `invoke(` | `src/components/admin/security/keys/diagnostics/FullOpDiagnosticsPanel.tsx` |
| `invoke(` | `src/components/admin/telemetry/AppLogsTable.tsx` |
| `notify` | `src/components/admin/telemetry/BridgeAlertsCard.tsx` |
| `enqueue(` | `src/components/admin/telemetry/OptimizationQueuePanel.tsx` |
| `invoke(` | `src/components/admin/users/PromotionDialog.tsx` |
| `invoke(` | `src/components/auth/QuickTestLogin.tsx` |
| `invoke(` | `src/components/bi/BIAiCopilot.tsx` |
| `invoke(` | `src/components/compare/AIComparisonAdvisor.tsx` |
| `invoke(` | `src/components/intelligence/MarketIntelligenceInsightsCard.tsx` |
| `invoke(` | `src/components/intelligence/TrendsInsightsCard.tsx` |
| `invoke(` | `src/components/kit-builder/DiscontinuedItemsAlert.tsx` |
| `invoke(` | `src/components/kit-builder/KitAIPromptDialog.tsx` |
| `invoke(` | `src/components/magic-up/PromptGenerator.tsx` |
| `notifyAreaSelection` | `src/components/magic-up/PromptGenerator.tsx` |
| `invoke(` | `src/components/search/VisualSearchButton.tsx` |
| `invoke(` | `src/components/search/useGlobalSearch.ts` |
| `invoke(` | `src/contexts/AuthContext.tsx` |
| `notifySignedInUser` | `src/contexts/AuthContext.tsx` |
| `invoke(` | `src/contexts/DevChallengeContext.tsx` |
| `invoke(` | `src/hooks/useCategoriesTree.ts` |
| `invoke(` | `src/hooks/useColorSystem.ts` |
| `invoke(` | `src/hooks/useCommemorativeDates.ts` |
| `invoke(` | `src/hooks/useConnectionTestDetails.ts` |
| `invoke(` | `src/hooks/useConnectionTestHistory.ts` |
| `invoke(` | `src/hooks/useConnectionTester.ts` |
| `invoke(` | `src/hooks/useConsecutiveFailures.ts` |
| `invoke(` | `src/hooks/useDeviceDetection.ts` |
| `notifyAdminsOfApprovalRequest` | `src/hooks/useDiscountApproval.ts` |
| `notifyDecisionBestEffort` | `src/hooks/useDiscountApproval.ts` |
| `notifyRequestBestEffort` | `src/hooks/useDiscountApproval.ts` |
| `notifySellerOfDecision` | `src/hooks/useDiscountApproval.ts` |
| `invoke(` | `src/hooks/useDropboxFiles.ts` |
| `invoke(` | `src/hooks/useExternalCategoriesQuery.ts` |
| `invoke(` | `src/hooks/useExternalDatabase.ts` |
| `invoke(` | `src/hooks/useExternalDbInspect.ts` |
| `invoke(` | `src/hooks/useExternalSimulator.ts` |
| `invoke(` | `src/hooks/useIPValidation.ts` |
| `invoke(` | `src/hooks/useKitIdentitySuggestion.ts` |
| `invoke(` | `src/hooks/useLogoColorAnalysis.ts` |
| `invoke(` | `src/hooks/usePrintAreas.ts` |
| `invoke(` | `src/hooks/useProductSeoAI.ts` |
| `invoke(` | `src/hooks/useProductSupplierSources.ts` |
| `invoke(` | `src/hooks/useProductsByCategory.ts` |
| `invoke(` | `src/hooks/useProdutoRamoAtividade.ts` |
| `invoke(` | `src/hooks/useQuoteApprovalToken.ts` |
| `invoke(` | `src/hooks/useSecretsManager.ts` |
| `notifyApprovalRequested` | `src/hooks/useSicoobApprovals.ts` |
| `invoke(` | `src/hooks/useStepUpAuth.ts` |
| `invoke(` | `src/hooks/useTechniquePricing.ts` |
| `invoke(` | `src/hooks/useTechniquePricingOptions.ts` |
| `invoke(` | `src/hooks/useTransactionalEmail.ts` |
| `invoke(` | `src/hooks/mockup/mockupGenerationService.ts` |
| `notifyStatusChange` | `src/hooks/orders/useOrders.ts` |
| `invoke(` | `src/hooks/orders/extensions/useOrderPilotApprovals.ts` |
| `notifyQuoteDecision` | `src/hooks/quotes/useQuotes.ts` |
| `invoke(` | `src/hooks/stock/stockFetcher.ts` |
| `invoke(` | `src/hooks/tecnicas/useTecnicasList.ts` |
| `invoke(` | `src/hooks/voice/scribeTokenCache.ts` |
| `notify_hardening_regression` | `src/integrations/supabase/types.ts` |
| `invoke(` | `src/lib/cloud-status.ts` |
| `invoke(` | `src/lib/crm-db.ts` |
| `invoke(` | `src/lib/edge-function-client.ts` |
| `invoke(` | `src/lib/external-db-prewarm.ts` |
| `invoke(` | `src/lib/external-rpc.ts` |
| `invoke(` | `src/lib/fetch-print-areas.ts` |
| `.add('theme-transitioning'` | `src/lib/theme-presets.ts` |
| `notify` | `src/lib/access/log-access-denied.ts` |
| `invoke(` | `src/lib/auth/invoke-full-scope.ts` |
| `notify` | `src/lib/external-db/cold-start-recorder.ts` |
| `invoke(` | `src/lib/external-db/health-check.ts` |
| `invoke(` | `src/lib/external-db/invoke.ts` |
| `invoke(` | `src/lib/personalization/repositories/technique.repository.ts` |
| `invoke(` | `src/lib/security/sanitize-error.ts` |
| `notify` | `src/lib/telemetry/instrumentationControl.ts` |
| `invoke(` | `src/lib/telemetry/requestId.ts` |
| `slack.com` | `src/pages/GestorApprovalsPage.tsx` |
| `invoke(` | `src/pages/PublicFavoriteListPage.tsx` |
| `invoke(` | `src/pages/PublicKitViewPage.tsx` |
| `invoke(` | `src/pages/QuoteApprovalPage.tsx` |
| `invoke(` | `src/pages/admin/AdminExternalDbPage.tsx` |
| `invoke(` | `src/pages/admin/DevChallengeExamplesPage.tsx` |
| `invoke(` | `src/pages/admin/OwnershipAuditAdminPage.tsx` |
| `invoke(` | `src/pages/admin/sicoob/SicoobApprovalReconciliationPage.tsx` |
| `publish(` | `src/pages/admin/sicoob/tabs/ApprovalPolicyTab.tsx` |
| `slack.com` | `src/pages/admin/sicoob/tabs/NotificationSettingsTab.tsx` |
| `enqueue(` | `src/pages/admin/telemetry/useOptimizationQueue.ts` |
| `invoke(` | `src/pages/kit-builder/useKitBuilderQuote.ts` |
| `notifyQuoteCreated` | `src/pages/kit-builder/useKitBuilderQuote.ts` |
| `invoke(` | `src/pages/quote-view/QuoteBitrixSync.ts` |
| `notifyStatusChange` | `src/services/OrderService.ts` |
| `invoke(` | `src/services/QuoteService.ts` |
| `invoke(` | `src/services/admin/UserService.ts` |
| `publish(` | `src/services/sicoob/approvalPolicyService.ts` |
| `invoke(` | `src/services/sicoob/documentIngestService.ts` |
| `invoke(` | `src/services/sicoob/orderService.ts` |
| `invoke(` | `src/utils/adminAudit.ts` |
| `invoke(` | `src/utils/cnpj-lookup.ts` |
| `enqueue(` | `supabase/functions/_shared/ai-usage.ts` |
| `slack.com` | `supabase/functions/_shared/approval-delivery.ts` |
| `notifyAdmins` | `supabase/functions/connections-health-check/index.ts` |
| `invoke(` | `supabase/functions/sicoob-kit-quote/index.ts` |
| `invoke(` | `supabase/functions/sicoob-reorder/index.ts` |
| `notify` | `supabase/migrations/20260410165642_7339bf0f-8ade-45d9-9065-79663e2c2364.sql` |
| `notify_new_order` | `supabase/migrations/20260410165642_7339bf0f-8ade-45d9-9065-79663e2c2364.sql` |
| `notify_quote_client_response` | `supabase/migrations/20260410165642_7339bf0f-8ade-45d9-9065-79663e2c2364.sql` |
| `notify_quote_status_change` | `supabase/migrations/20260410165642_7339bf0f-8ade-45d9-9065-79663e2c2364.sql` |
| `notify_discount_approval_request` | `supabase/migrations/20260414193435_871210cd-f0d8-40ee-ae9f-401b4887727f.sql` |
| `notify_discount_approval_trigger` | `supabase/migrations/20260414193435_871210cd-f0d8-40ee-ae9f-401b4887727f.sql` |
| `notify_discount_approval_request` | `supabase/migrations/20260414232135_91832f4f-3bda-41e0-8707-cac75a069d44.sql` |
| `notify_hardening_regression` | `supabase/migrations/20260419121414_3259f186-81ef-478e-80da-0d5950fc86fe.sql` |
| `notifying` | `supabase/migrations/20260423185624_0cc97b9f-b1ba-469a-914d-6ac6422b584d.sql` |
| `notify_approval_status_change` | `supabase/migrations/20260503220418_7d0d76d8-3b54-4554-aaea-6750ed654c77.sql` |
| `notify_approval_status_change` | `supabase/migrations/20260503220434_8a8e4aab-5194-480c-a47a-a1d0ddf67871.sql` |
| `notify_order_status_change` | `supabase/migrations/20260504161835_585add0d-394c-4f4d-b587-589750c70f37.sql` |
| `notify` | `supabase/migrations/20260504214118_b9c97a48-0aee-42ec-a55b-2f21e517aa48.sql` |
| `notify_approval_request` | `supabase/migrations/20260504214118_b9c97a48-0aee-42ec-a55b-2f21e517aa48.sql` |
| `notify_discount_approval_request` | `supabase/migrations/20260529192614_d5a5681b-e318-4850-9f2d-b6596a0d0625.sql` |
| `notify_quote_status_change` | `supabase/migrations/20260529192614_d5a5681b-e318-4850-9f2d-b6596a0d0625.sql` |
| `notify_approval_request` | `supabase/migrations/20260912110000_sicoob_order_status_events.sql` |
| `notify_approval_request` | `supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql` |
| `notify_hardening_regression` | `supabase/migrations/20260916100000_security_hardening.sql` |
| `notify_singular_quote_submission` | `supabase/migrations/20260928182000_idempotent_quote_status_notifications.sql` |
| `notify_hardening_regression` | `supabase/migrations/20261008010000_fix_plpgsql_lint_failures.sql` |
| `notify_singular_quote_submission` | `supabase/migrations/20261029200521_harden_singular_quote_notification_recipients.sql` |
| `notify_hardening_regression` | `supabase/migrations/20261118130100_enable_scoped_business_realtime.sql` |
| `notify_singular_quote_decision` | `supabase/migrations/20261123090000_notify_singular_quote_decision.sql` |
| `notify_hardening_regression` | `tests/scenarios/business-realtime-contract.scenario.mjs` |
| `slack.com` | `tests/scenarios/notificacoes-aprovacao.mjs` |
| `notify_approval_request` | `tests/scenarios/sql/sicoob-approval-policy-fixture.sql` |
| `slack.com` | `tests/scenarios/sql/sicoob-notification-outbox-fixture.sql` |
| `notify_approval_request` | `tests/scenarios/sql/sicoob-order-status-events-fixture.sql` |

## N. Regras citadas em comentários do código

| Comentário | Arquivo |
|---|---|
| A regra continua ativa como aviso usando a contagem física estável. | `eslint.config.js` |
| permanece coberto pela regra estrita definida no bloco principal. | `eslint.config.js` |
| // Apenas o project `chromium-smoke` executa testes marcados `@smoke`. | `playwright.config.ts` |
| evita disputa entre specs e rajadas contra o rate limit do cleanup. | `playwright.config.ts` |
| SEM retries: gate determinístico — flakiness deve falhar visível. | `playwright.config.ts` |
| describe é ignorado, mesmo no spec do smoke. Garante que apenas | `playwright.config.ts` |
| Versão mobile dos mesmos specs (apenas testes marcados @mobile rodam aqui). | `playwright.config.ts` |
| Bibliotecas utilizadas apenas em rotas (PDF, gráficos, ícones, | `vite.config.ts` |
| * Shell mínimo das rotas de autenticação. Mantém PDF, gráficos, catálogos, | `src/AuthEntry.tsx` |
| Registrar Service Worker para PWA (apenas em produção para evitar cache issues no preview) | `src/main.tsx` |
| Falha de registro não deve interromper a navegação. | `src/main.tsx` |
| * Caminho bloqueado (apenas pathname, ex: "/admin/telemetria"). */ | `src/components/access/DevAccessDeniedPage.tsx` |
| * Visível apenas para devs. Em ambiente saudável, renderiza um banner | `src/components/admin/DevAccessAuditAlert.tsx` |
| * DiscountApprovalQueue — fila administrativa de solicitações de desconto pendentes. | `src/components/admin/DiscountApprovalQueue.tsx` |
| 🛡️ Camada de Segurança V2.0: Validação de integridade e tipo real | `src/components/admin/ImageUploadButton.tsx` |
| * Consulta paginada do catálogo mestre, com modo somente leitura. | `src/components/admin/ProductsManager.tsx` |
| * SellerDiscountLimitsPanel — gestão administrativa do limite máximo de desconto por vendedor. | `src/components/admin/SellerDiscountLimitsPanel.tsx` |
| ativos/inativos, faixa de preço e estoque mínimo, com paginação server-side | `src/components/admin/connections/BridgeProductsPreviewPanel.tsx` |
| (limit/offset) e contagem exata para revisar o catálogo externo sem precisar | `src/components/admin/connections/BridgeProductsPreviewPanel.tsx` |
| * Erro do hook ao listar segredos (sem permissão / sessão expirada / rede). */ | `src/components/admin/connections/CardSourceDiagnostic.tsx` |
| * Mostra **apenas** dados não-sensíveis: | `src/components/admin/connections/ConnectionDetailsDialog.tsx` |
| * Inline alert shown above "Testar conexão" when one or more required | `src/components/admin/connections/ConnectionPreflightAlert.tsx` |
| Reconstrói apenas headers seguros (servidor já mascarou os sensíveis) | `src/components/admin/connections/ConnectionTestDetailsDialog.tsx` |
| Limit fetched rows to cover the largest preview size + headroom for filtering | `src/components/admin/connections/ConnectionTestHistoryPanel.tsx` |
| * Callback quando o estado aberto muda (apenas em modo controlado). */ | `src/components/admin/connections/ConnectionTimelineDrawer.tsx` |
| * Importante: é apenas leitura, não dispara invocações novas — recebe os | `src/components/admin/connections/CredentialsSourceIndicator.tsx` |
| * Handler de refresh manual: deve invalidar o cache no servidor | `src/components/admin/connections/CredentialsSourceIndicator.tsx` |
| via edge function `mcp-keys-issue` — este componente apenas coleta | `src/components/admin/connections/IssueMcpKeyForm.tsx` |
| * Timeout efetivo aplicado (apenas em falhas por timeout). */ | `src/components/admin/connections/LastTestLine.tsx` |
| sem permissão de leitura em `auth.users`, ou e-mail nulo) → "equipe" | `src/components/admin/connections/SecretField.tsx` |
| Segredos permanecem somente na memória do componente. Ao trocar de | `src/components/admin/connections/SecretField.tsx` |
| - Não inicia carga de secrets sozinho — apenas reage ao hook compartilhado. | `src/components/admin/connections/SecretsManagerHealthPanel.tsx` |
| - ConnectionsIncidentStrip mostra apenas incidentes com severidade ≥ filtro | `src/components/admin/connections/SeverityFilterContext.tsx` |
| * SmokeTestChecklist — validação manual da pipeline de credenciais. | `src/components/admin/connections/SmokeTestChecklist.tsx` |
| * Não expõe nenhum valor de segredo — apenas máscaras e metadados. | `src/components/admin/connections/TestAllConnectionsButton.tsx` |
| * True se URL + Service estão presentes (mínimo para testar). */ | `src/components/admin/connections/TestAllConnectionsButton.tsx` |
| Invalida apenas as queryKeys relevantes da zona via React Query e | `src/components/admin/connections/ZoneRefreshButton.tsx` |
| * Tom semântico do header — afeta apenas o ícone + barra lateral */ | `src/components/admin/connections/ZoneSection.tsx` |
| All Connections components must use these helpers so the user | `src/components/admin/connections/secretErrors.ts` |
| * Short tag rendered as a chip ("Permissão", "Validação", ...). */ | `src/components/admin/connections/secretErrors.ts` |
| * Stable code so callers can branch (e.g., disable retry on permission). */ | `src/components/admin/connections/secretErrors.ts` |
| deve ter (ou herdar via fallback) uma entrada aqui. | `src/components/admin/connections/secretImpactMap.ts` |
| * Fluxos de negócio afetados (verbos de ação). */ | `src/components/admin/connections/secretImpactMap.ts` |
| * Resolve o impacto para um nome de secret. Retorna `null` apenas se a | `src/components/admin/connections/secretImpactMap.ts` |
| * Pure normalizers applied BEFORE validation to fix common copy/paste mistakes. | `src/components/admin/connections/secretNormalizers.ts` |
| Auth/validation errors are NOT retried (fail fast). | `src/components/admin/connections/secretRetry.ts` |
| * Comprimento mínimo absoluto para qualquer secret. O sufixo mascarado | `src/components/admin/connections/secretValidators.ts` |
| flagged when it is required but absent, or when its stored length is below | `src/components/admin/connections/secretValidators.ts` |
| `secrets-manager` edge function. MUST stay in sync with | `src/components/admin/connections/secretWhitelist.ts` |
| Expira contexto antigo | `src/components/admin/connections/useFocusContext.ts` |
| * Apenas leitura inicial (sem reagir). Útil para restauração one-shot no mount. */ | `src/components/admin/connections/useFocusContext.ts` |
| - Mudança de P0→P1 (downgrade) — apenas escalations geram toast | `src/components/admin/connections/useSeverityChangeNotifier.ts` |
| Expirações dos flags (null = sem limite) | `src/components/admin/products/ProductFormSchema.ts` |
| * useProductsManager — Business logic hook for ProductsManager. | `src/components/admin/products/useProductsManager.ts` |
| 1024 * 1024) return 'Máximo 2MB'; | `src/components/admin/products/new-supplier/useNewSupplierForm.ts` |
| * useEngravingWizard — Business logic for the engraving wizard | `src/components/admin/products/sections/engraving/useEngravingWizard.ts` |
| - Somente FULL (chaves com escopo *) | `src/components/admin/security/keys/McpKeysFilters.tsx` |
| * Improvement: Strictly typed operational logic and improved validation feedback. | `src/components/admin/security/role-migration/RoleMigrationPanel.tsx` |
| 1024 * 1024) return 'Imagem deve ter no máximo 2MB'; | `src/components/admin/suppliers-manager/useSuppliersManager.ts` |
| * Sem persistência (memória apenas). Atualiza em tempo real via subscribe. | `src/components/admin/telemetry/BridgesLiveCard.tsx` |
| ultrapassa o limite configurado, mostra um alerta destacado com | `src/components/admin/telemetry/PlatformFailureAlertBanner.tsx` |
| - obriga justificativa (mínimo 10 caracteres) | `src/components/admin/users/PromotionDialog.tsx` |
| * Dados de catálogo (somente rótulos) usados pelo modo `layout`. */ | `src/components/ai/AIChat.tsx` |
| " value={client.name} onChange={onFieldChange("name")} aria-label="Nome do cliente" required /> | `src/components/ai/AIRecommendationsPanel.tsx` |
| A favorita sai só do histórico do cliente: falha do SETOR não pode escondê-la. | `src/components/bi/ClientHealthHero.tsx` |
| 50, 0); // estimativa volume mínimo | `src/components/bi/ConfirmQuoteSuggestionsModal.tsx` |
| lista precisa descontar somente o que está renderizado acima e abaixo dela: | `src/components/cart/CartHeaderButton.tsx` |
| `limit > 100` (supabase/functions/_shared/portal-access-policy.ts:99), e essa | `src/components/cart/cart-company-options.ts` |
| usado em contextos onde o componente atua como navegador de seleção (não apenas exibição). | `src/components/categories/CategoryTreeNavigator.tsx` |
| Uma imagem remota inválida não deve interromper a exportação dos demais produtos. | `src/components/collections/ExportCollectionButton.tsx` |
| * Ctrl/Cmd+K não pode roubar o foco de quem está digitando: em campo de | `src/components/command/GlobalCommandBar.tsx` |
| Recents — também filtrados por permissão (recente pode ter sido | `src/components/command/GlobalCommandBar.tsx` |
| Sem selo algum o erro não pode sumir: parte das consultas pode ter falhado com a | `src/components/common/IntelligenceBadges.tsx` |
| permissão. Ações puramente locais (toggle de tema, abrir help) podem | `src/components/common/spotlight/SpotlightItems.ts` |
| Admin (visível apenas a admin/dev — filtrado em runtime) | `src/components/common/spotlight/SpotlightItems.ts` |
| Dev / Técnico (visível apenas a dev — filtrado em runtime) | `src/components/common/spotlight/SpotlightItems.ts` |
| * MyDiscountRequestsWidget — solicitações de desconto do usuário com busca, | `src/components/dashboard/MyDiscountRequestsWidget.tsx` |
| (Minhas Propostas, Meus Pedidos, Solicitações de Desconto). | `src/components/dashboard/widget-filters/WidgetFiltersBar.tsx` |
| * Retorna um ref que deve ser anexado ao elemento sentinela no final da lista. | `src/components/dashboard/widget-filters/useInfiniteScroll.ts` |
| O useDevGate já cuida do papel, aqui apenas decidimos abrir automaticamente | `src/components/dev/AuthDiagnosticsWidget.tsx` |
| * Overlay flutuante (somente preview/dev) que mostra cada chamada de bridge | `src/components/dev/BridgeMetricsOverlay.tsx` |
| * Wrapper que monta o BridgeMetricsOverlay APENAS quando o gate SSOT | `src/components/dev/DevOnlyBridgeOverlay.tsx` |
| cache bust, retry counter) **continua** funcionando — apenas a tela | `src/components/errors/EnhancedErrorBoundary.tsx` |
| O reporter inclui Supabase e Sentry. Carregá-lo somente quando o boundary | `src/components/errors/EnhancedErrorBoundary.tsx` |
| Se o recovery atingir o limite de reloads na janela de 30s, ele | `src/components/errors/EnhancedErrorBoundary.tsx` |
| Ignora o limite de reloads aqui pois é uma ação manual do usuário. | `src/components/errors/EnhancedErrorBoundary.tsx` |
| Preserva tokens auth do supabase para não deslogar; remove apenas chaves de cache de app | `src/components/errors/EnhancedErrorBoundary.tsx` |
| * Filtro: mostrar apenas items com queda de preço */ | `src/components/favorites/FavoritesSortBar.tsx` |
| VERSÃO COMPACTA (apenas swatches inline) | `src/components/filters/ColorGroupFilter.tsx` |
| Mostra apenas datas que estão no período de campanha (baseado em campaign_start_days) | `src/components/filters/CommemorativeDateFilter.tsx` |
| Limit selector */} | `src/components/intelligence/RankingFilterToolbar.tsx` |
| forwardRef required because Recharts passes refs to custom tooltip components | `src/components/inventory/risk/RiskTooltip.tsx` |
| O componente apenas dispara o callback; a página decide se aplica filtros | `src/components/kit-builder/KitOccasionSelector.tsx` |
| ou apenas armazena para sugestões contextuais. | `src/components/kit-builder/KitOccasionSelector.tsx` |
| pricing summary and a "Generate public link" action. No quote required. | `src/components/kit-builder/KitPresentablePreview.tsx` |
| * Administração técnica por padrão; papel de negócio deve ser explícito. */ | `src/components/layout/AdminRoute.tsx` |
| rate-limit, login-attempts, external-db, status do sistema. | `src/components/layout/DevRoute.tsx` |
| * Hierarquia: dev > supervisor > agente. Apenas `dev` passa. | `src/components/layout/DevRoute.tsx` |
| Context providers must be imported synchronously (consumers render inside them) | `src/components/layout/MainLayout.tsx` |
| * Hierarquia: 'dev' (somente dev), 'supervisor' (dev OU supervisor), 'agente' (qualquer autenticado). */ | `src/components/layout/ProtectedRoute.tsx` |
| para a qual não tem permissão. | `src/components/layout/sidebar/RestrictedRouteNotice.tsx` |
| Escape que veio de fechar um overlay (Voltar) não pode limpar o formulário | `src/components/mockup/KeyboardShortcuts.tsx` |
| * Máximo de cores suportadas na área */ | `src/components/mockup/MultiAreaManager.tsx` |
| Laser detection — must come before UV check since "Laser UV" exists | `src/components/mockup/techniqueColorUtils.ts` |
| "uv" MUST be last — it's a substring of many technique names | `src/components/mockup/logo-editor/logoTechniqueFilters.ts` |
| * BellBadge — apenas o ícone + contador de não lidas. | `src/components/notifications/NotificationDrawer.tsx` |
| nem o título do drawer. Re-renderiza apenas quando `isRefetching` muda. | `src/components/notifications/NotificationDrawer.tsx` |
| * DrawerHeaderTitle — título + contador "X novas". Depende apenas de | `src/components/notifications/NotificationDrawer.tsx` |
| * How many consecutive seconds the ratio must stay ≥ threshold to fire the warning. */ | `src/components/notifications/badge-stats/useNotificationsMetricsPanel.ts` |
| implementações da mesma regra. | `src/components/onboarding/OnboardingTour.tsx` |
| Para onde o Tab deve ir, ou null quando o navegador pode seguir sozinho. | `src/components/onboarding/OnboardingTour.tsx` |
| c62828" }}>Desconto Global:</span></td> | `src/components/pdf/proposal/ProposalTotals.tsx` |
| Frete row — após desconto, entra no total */} | `src/components/pdf/proposal/ProposalTotals.tsx` |
| Preco invalido (zero/negativo/infinito/ausente) mantem o produto selecionado apenas | `src/components/pricing/ProductPriceSimulator.tsx` |
| Preço inválido: as etapas 2+ ficam ocultas, então a barra não pode | `src/components/pricing/ProductPriceSimulator.tsx` |
| - Faturamento mínimo (setup como piso) | `src/components/pricing/simulator/MultiEngravingResult.tsx` |
| - Faturamento mínimo (setup como piso) | `src/components/pricing/simulator/MultiEngravingResult.tsx` |
| Prazo máximo | `src/components/pricing/simulator/MultiEngravingResult.tsx` |
| Verificar se algum aplicou faturamento mínimo | `src/components/pricing/simulator/MultiEngravingResult.tsx` |
| Info sobre faturamento mínimo */} | `src/components/pricing/simulator/MultiEngravingResult.tsx` |
| - Setup = PISO MÍNIMO (não é somado!) | `src/components/pricing/simulator/PriceResultV51.tsx` |
| - Setup = PISO MÍNIMO (não é somado!) | `src/components/pricing/simulator/PriceResultV51.tsx` |
| - Faturamento mínimo (setup como piso, não soma!) | `src/components/pricing/simulator/QuantityAndResult.tsx` |
| - Faturamento mínimo (setup como piso, não soma!) | `src/components/pricing/simulator/QuantityAndResult.tsx` |
| * Máximo de sugestões exibidas (padrão: 3) */ | `src/components/pricing/simulator/upsell/UpsellPlusPlus.tsx` |
| * Faixas de quantidade com desconto progressivo */ | `src/components/pricing/simulator/upsell/upsell-engine.ts` |
| - Responsivo: labels escondidos em mobile, apenas ícones | `src/components/products/BulkActionBar.tsx` |
| deve atualizar `confirmedAt` para que o badge entre no estado "confirmado". | `src/components/products/PriceFreshnessBadge.tsx` |
| Sem esta prop o badge continua somente leitura (catálogo/PDP padrão). | `src/components/products/PriceFreshnessBadge.tsx` |
| Só nesse caso enriquecemos o badge com "(limite Yd)" — caso contrário | `src/components/products/PriceFreshnessBadge.tsx` |
| Sufixo "(limite Yd)" só aparece quando o produto traz threshold próprio. | `src/components/products/PriceFreshnessBadge.tsx` |
| alerta. Mantém o tooltip (mostra data SSOT + regra) para auditoria. | `src/components/products/PriceFreshnessBadge.tsx` |
| Sem ação individual configurada → comportamento clássico (somente leitura). | `src/components/products/PriceFreshnessBadge.tsx` |
| (30/60/90 dias) de UM produto. Visível apenas para admins. | `src/components/products/PriceFreshnessThresholdEditor.tsx` |
| * Prazo do fornecedor, com o MESMO texto da ficha | `src/components/products/ProductCard.tsx` |
| (`src/pages/product-detail/ProductDetailHeroSections.tsx:267`): prazo zero ou | `src/components/products/ProductCard.tsx` |
| ausente é prazo não informado, não entrega no mesmo dia. | `src/components/products/ProductCard.tsx` |
| barrel —, então mexer lá não leva o prazo a tela nenhuma. | `src/components/products/ProductCard.tsx` |
| * Mesmo texto da ficha do produto (`ProductDetailHeroSections.tsx:267`): prazo | `src/components/products/ProductHoverPreview.tsx` |
| zero ou ausente é prazo NÃO INFORMADO, não entrega no mesmo dia. Enquanto a | `src/components/products/ProductHoverPreview.tsx` |
| coluna não vinha no select da listagem, este lugar escrevia "Consultar prazo" | `src/components/products/ProductHoverPreview.tsx` |
| cravado — dizia o mesmo para todos os 7.938 produtos ativos, que têm prazo. | `src/components/products/ProductHoverPreview.tsx` |
| Exibe somente dados reais do SparklineSalesProvider. | `src/components/products/ProductSparkline.tsx` |
| - Limite configurável (`maxResults`) | `src/components/products/SmartRecommendations.tsx` |
| * Business logic hook for StockHistoryChart. | `src/components/products/useStockChartData.ts` |
| Calcula preço somente quando todos os campos obrigatórios estão preenchidos. | `src/components/products/customization/ConfigurationPanel.tsx` |
| * Mostra APENAS o nome do grupo (Laser, UV Digital, Serigrafia). | `src/components/products/customization/TechniqueOption.tsx` |
| * Margem (ou desconto) aparente do orçamento atual em %. */ | `src/components/quote/MarginInsightBadge.tsx` |
| margem psicológica de desconto, mantendo o desconto REAL dentro da alçada. | `src/components/quote/NegotiationMarkupCard.tsx` |
| - desconto_real = desconto efetivo vs subtotal_real (validado pela alçada) | `src/components/quote/NegotiationMarkupCard.tsx` |
| * % de desconto APARENTE que o cliente verá */ | `src/components/quote/NegotiationMarkupCard.tsx` |
| * Desconto REAL calculado (já considera markup) */ | `src/components/quote/NegotiationMarkupCard.tsx` |
| * Limite de desconto do vendedor; null = sem limite definido */ | `src/components/quote/NegotiationMarkupCard.tsx` |
| em duas abas tem a mesma chave, e o descarte de uma não pode apagar o | `src/components/quotes/QuoteAutoSave.tsx` |
| * QuoteBuilderSummaryColumn — Coluna 3: Resumo com cards de itens, desconto e CTAs | `src/components/quotes/QuoteBuilderSummaryColumn.tsx` |
| * Quando true, mostra apenas se houver pedido (silencia loading). */ | `src/components/quotes/QuoteOrderBadge.tsx` |
| * Quando a cotação não aceita mais edição (salvando/enviada), o seletor não pode reabrir. */ | `src/components/quotes/QuoteProductSelector.tsx` |
| quando a tela sai de fato: mudar apenas os parametros da URL (menu | `src/components/routing/GlobalExitGuard.tsx` |
| 1024 * 1024) return 'A imagem deve ter no máximo 10MB.'; | `src/components/search/VisualSearchButton.tsx` |
| * Corre a chamada semântica contra o prazo, sem deixar timer solto. */ | `src/components/search/useGlobalSearch.ts` |
| Vazio é resposta válida: o resultado anterior não pode sobreviver aqui, | `src/components/search/useGlobalSearch.ts` |
| ").eq("user_id", userId).order("created_at", { ascending: false }).limit(20), | `src/components/security/useSecurityData.ts` |
| ").eq("user_id", userId).eq("type", "security").order("created_at", { ascending: false }).limit(10), | `src/components/security/useSecurityData.ts` |
| Status que ja comprometem verba: o rateio nao pode ficar defasado neles, | `src/components/sicoob/orders/OrderCostCenterAllocation.tsx` |
| 1024 * 1024) { toast.error("O comprovante deve ter no máximo 5 MB."); return; } | `src/components/sicoob/orders/OrderLogisticsTab.tsx` |
| Separar a decisão do componente mantém a regra testável e a complexidade | `src/components/sicoob/orders/utils/amount.ts` |
| ciclomática do formulário sob o limite. | `src/components/sicoob/orders/utils/amount.ts` |
| (${formatCurrency(wizard.totals.grandTotalPerUnit)}/un)\n⏱️ Prazo: ${wizard.totals.maxDays > 0 ? `~${wizard.totals.maxDays} dias úteis` : 'A consultar'}`; | `src/components/simulator/wizard/ConfirmedSummary.tsx` |
| Row 2: Location (only if single group) + Specs */} | `src/components/simulator/wizard/PersonalizationSummary.tsx` |
| * Mostra apenas o ícone (modo compacto, ex.: sidebar colapsada). */ | `src/components/ui/RoleBadge.tsx` |
| de habilitar rolagem: `h-full` não resolve quando o pai tem apenas | `src/components/ui/scroll-area.tsx` |
| Sessão encerrada por expiração/token também não pode levar os contadores | `src/contexts/AuthContext.tsx` |
| máximo, no próximo intervalo. | `src/contexts/AuthContext.tsx` |
| O estado sujo de quem saiu não pode interrogar o próximo login. | `src/contexts/AuthContext.tsx` |
| O estado sujo de quem saiu não pode interrogar o próximo login. | `src/contexts/AuthContext.tsx` |
| - Apenas UM modal de challenge fica aberto por vez. | `src/contexts/DevChallengeContext.tsx` |
| é resolvida com `null` (`superseded`) e somente a mais recente pode | `src/contexts/DevChallengeContext.tsx` |
| * Identificador monotônico para garantir que apenas a última solicitação valide o token. */ | `src/contexts/DevChallengeContext.tsx` |
| Apenas a solicitação mais recente pode consumir o token. Se uma nova | `src/contexts/DevChallengeContext.tsx` |
| A organização e sua permissão vêm da mesma leitura de memberships. | `src/contexts/OrganizationContext.tsx` |
| limite ficariam fora do cache (validade "unknown" no fechamento), então a | `src/contexts/ProductsContext.tsx` |
| - Tratamento específico para 429 (rate limit) e 402 (créditos) | `src/hooks/useAIRecommendations.ts` |
| descarte nao pode apagar o que outra aba gravou. Duas origens contam como | `src/hooks/useAutoSave.ts` |
| ⚠️ REGRA DE NEGÓCIO — NÃO ALTERAR — Ordem técnica Portal Sicoob | `src/hooks/useCatalogFiltering.ts` |
| * Prefetch do catálogo SOMENTE após autenticação (#6). | `src/hooks/useCatalogPrefetch.ts` |
| O label é apenas apresentação e pode ser "Grande" enquanto value é "G". | `src/hooks/useCatalogRelationFilters.ts` |
| * As duas definições de negócio que faltavam, agora escritas e verificáveis: | `src/hooks/useClientsPortfolioKpis.ts` |
| * Limite superior exclusivo, para ler uma janela fechada. */ | `src/hooks/useClientsPortfolioKpis.ts` |
| pedido anterior ao mês apenas para os clientes que apareceram agora. Em lotes, | `src/hooks/useClientsPortfolioKpis.ts` |
| * Hook para buscar apenas os grupos de cor (para filtros rápidos) | `src/hooks/useColorSystem.ts` |
| * Hook para buscar apenas as nuances/acabamentos | `src/hooks/useColorSystem.ts` |
| @param limit - Limite de resultados (padrão: 100) | `src/hooks/useCommemorativeDates.ts` |
| Armazena apenas IDs no localStorage; resolução para objetos Product é | `src/hooks/useComparison.ts` |
| Analytics (sem lookup – apenas ID) | `src/hooks/useComparison.ts` |
| Deve ser chamado pelo contexto/provider que tem acesso a `getProductsByIds`. | `src/hooks/useComparison.ts` |
| libera apenas para dev, supervisor, admin e manager. | `src/hooks/useCrmCompanies.ts` |
| Retorna apenas campos essenciais para performance | `src/hooks/useCrmCompanies.ts` |
| * Fixa/desfixa kit em destaque (apenas 1 por usuário). */ | `src/hooks/useCustomKitPersistence.ts` |
| If dimensions are required but not provided, don't calculate | `src/hooks/useCustomizationPrice.ts` |
| * Para usuários com role `dev`, executa um SELECT mínimo (id LIMIT 1) em cada | `src/hooks/useDevAccessAudit.ts` |
| RLS / "permission denied" é classificado como bloqueio inesperado. | `src/hooks/useDevAccessAudit.ts` |
| * Não consome dados reais; apenas dispara o gate de RLS. Roda uma vez ao | `src/hooks/useDevAccessAudit.ts` |
| * Tabelas sensíveis que um dev DEVE conseguir ler. */ | `src/hooks/useDevAccessAudit.ts` |
| Códigos típicos de RLS / permissão | `src/hooks/useDevAccessAudit.ts` |
| * useDiscountApproval — Gerencia solicitações de aprovação de desconto | `src/hooks/useDiscountApproval.ts` |
| remota não deve congelar o coração do catálogo em redes lentas. | `src/hooks/useFavoriteQuickAdd.ts` |
| * Para o vendedor: lê apenas as reactions agregadas por item da própria lista. */ | `src/hooks/useFavoriteReactions.ts` |
| Mínimo de caracteres para buscar (default: 2) | `src/hooks/useGenericFuzzySearch.ts` |
| Máximo de resultados (default: todos) | `src/hooks/useGenericFuzzySearch.ts` |
| Aplicar limite se especificado | `src/hooks/useGenericFuzzySearch.ts` |
| Atualiza qualquer registro (deve haver apenas um) | `src/hooks/useGeoBlocking.ts` |
| Este arquivo mantém apenas os hooks React. | `src/hooks/useGravacaoV2.ts` |
| Validação completa acontece após login via edge function | `src/hooks/useIPValidation.ts` |
| Em caso de erro na validação, permitir acesso (fail-open) | `src/hooks/useIPValidation.ts` |
| lados usarem exatamente a mesma regra de string. | `src/hooks/useKitAutoSave.ts` |
| Sair da tela não pode descartar a gravação agendada. | `src/hooks/useKitAutoSave.ts` |
| * Exportada para que a regra de disponibilidade seja testada sem rede. */ | `src/hooks/useKitStockForecast.ts` |
| * Hook para validação de estoque dos itens do Kit Builder | `src/hooks/useKitStockValidation.ts` |
| Edge devolve já é title \|\| nome_fantasia \|\| razao_social, a mesma regra | `src/hooks/useMagicUpState.ts` |
| * true quando a janela tem mais registros do que o limite de leitura do painel. */ | `src/hooks/useMarketIntelligenceMacro.ts` |
| Depois de um timeout o bridge reduz o limite da pagina e marca | `src/hooks/useMarketIntelligenceMacro.ts` |
| * Sonda se ha registros depois do teto de leitura (limit 1 no offset do teto). */ | `src/hooks/useMarketIntelligenceMacro.ts` |
| * useMockupGenerator — Core business logic hook for MockupGenerator page | `src/hooks/useMockupGenerator.ts` |
| 1024 * 1024) { toast.error("A imagem deve ter no máximo 5MB"); return; } | `src/hooks/useMockupGenerator.ts` |
| * Máximo de cores suportadas pela técnica nessa área */ | `src/hooks/useMockupTechniques.ts` |
| * Converte NoveltyWithDetails para Product (mínimo necessário para o BulkVariantWizard) | `src/hooks/useNoveltiesSelectionMode.ts` |
| abrisse /instalar depois montava outra instância, sem o evento, e via apenas | `src/hooks/usePWAInstall.ts` |
| na importação; as instâncias do hook apenas se inscrevem no que já foi | `src/hooks/usePWAInstall.ts` |
| Keep within max limit | `src/hooks/usePositionHistory.ts` |
| - Escrita: somente admin (RLS). | `src/hooks/useProductFreshnessOverride.ts` |
| - Fuse index é recriado apenas quando os produtos mudam (referência estável) | `src/hooks/useProductFuzzySearch.ts` |
| - Busca com debounce deve ser feita pelo consumidor (ex: useDebounce) | `src/hooks/useProductFuzzySearch.ts` |
| Recriar Fuse index apenas quando a lista de produtos realmente muda | `src/hooks/useProductFuzzySearch.ts` |
| Resolucao tolerante por campo: um original removido nao pode descartar as | `src/hooks/useProductImages.ts` |
| * Busca apenas a imagem principal de um produto | `src/hooks/useProductImages.ts` |
| * Hook para buscar apenas a imagem principal | `src/hooks/useProductImages.ts` |
| Falha de uma das consultas não pode virar "produto sem indicadores": o painel | `src/hooks/useProductIntelligenceBadges.ts` |
| só vale quando há selo/valor na tela — e isso vem apenas da inteligência. | `src/hooks/useProductIntelligenceBadges.ts` |
| campos depois do snapshot inicial e isso não pode contar como "alteração | `src/hooks/useQuoteBuilderState.ts` |
| * Status que a tela deve passar a considerar vigente, ou `null` quando nada | `src/hooks/useQuoteBuilderState.ts` |
| trabalho não salvo e não pode ser levada embora na saída para o detalhe. | `src/hooks/useQuoteBuilderState.ts` |
| O orcamento ja esta gravado: ir para o detalhe nao perde nada e nao pode | `src/hooks/useQuoteBuilderState.ts` |
| busca e popular o cache, mescla apenas os campos de preço nos itens — sem | `src/hooks/useQuoteBuilderState.ts` |
| - 'dev' → apenas dev | `src/hooks/useRBAC.tsx` |
| Fetch quote items for this product (handle 1000-row limit) | `src/hooks/useSalesHistory.ts` |
| Fetch order items for this product (handle 1000-row limit) | `src/hooks/useSalesHistory.ts` |
| * useScrollDirection - Hook simplificado apenas para direção | `src/hooks/useScroll.ts` |
| que o browser limite o scroll e perca a posição original. | `src/hooks/useScrollRestoration.ts` |
| useSearch nunca tinha sido migrado. Ver docs/correcoes-validacao-2026-09-14.md. | `src/hooks/useSearch.ts` |
| Apenas erros de auth/permissão limpam (estado real desconhecido). | `src/hooks/useSecretsManager.ts` |
| * useSellerDiscountLimits — Gerencia limites de desconto por vendedor | `src/hooks/useSellerDiscountLimits.ts` |
| Fetch own limit (for sellers) | `src/hooks/useSellerDiscountLimits.ts` |
| Set/update limit for a seller | `src/hooks/useSellerDiscountLimits.ts` |
| Delete limit | `src/hooks/useSellerDiscountLimits.ts` |
| 2. Validar permissão por role | `src/hooks/useSicoobApprovals.ts` |
| * Teto por página do contrato fechado do CRM (limit > 100 volta 403). */ | `src/hooks/useSimulation.ts` |
| A pergunta já foi feita aqui; o portão global (\`GlobalExitGuard\`) não pode | `src/hooks/useSmartNavigation.ts` |
| recente apenas uma vez, senão cada listener navegaria um passo atrás. | `src/hooks/useSmartNavigation.ts` |
| Se não há variação, criar opções de 1 até o máximo | `src/hooks/useTechniquePricing.ts` |
| Substitui useState quando o estado deve persistir no histórico/URL. | `src/hooks/useUrlState.ts` |
| === useScribe MUST be called unconditionally === | `src/hooks/useVoiceAgent.ts` |
| === Request microphone permission explicitly === | `src/hooks/useVoiceAgent.ts` |
| Stop all tracks immediately — we just needed permission | `src/hooks/useVoiceAgent.ts` |
| 1. Request microphone permission first | `src/hooks/useVoiceAgent.ts` |
| O fluxo antigo comparava somente credential_id e podia declarar um user_id | `src/hooks/useWebAuthn.ts` |
| Uma resposta da sessão anterior não pode restaurar seus privilégios. | `src/hooks/auth/useUserRoles.ts` |
| * Falha de consulta nunca deve ser serializada como um cliente sem compras. */ | `src/hooks/bi/useClientBI.ts` |
| * Retorna null quando o score é apenas o valor sentinela de dados insuficientes. */ | `src/hooks/bi/useClientHealthScore.ts` |
| A falha do histórico não pode ser interpretada como zero compras/risco. | `src/hooks/bi/useClientHealthScore.ts` |
| * Empresas do ramo com histórico mínimo para o setor virar comparação de mercado. | `src/hooks/bi/useClientSeasonality.ts` |
| apenas contra a carteira — o contrato não aplica `is_customer` aqui. | `src/hooks/bi/useClientVsIndustry.ts` |
| (industryError/CRM) nao pode esconder um numero que foi medido. O aviso e o | `src/hooks/bi/useClientsComparison.ts` |
| * Amostra setorial insuficiente (`companiesInRamo` abaixo do mínimo) não vira tendência. */ | `src/hooks/bi/useIndustryTrends.ts` |
| depois do `ORDER BY total_quantity DESC LIMIT` do banco: com um teto curto, produto elegível que cai | `src/hooks/bi/useIndustryTrends.ts` |
| A falha do CRM nao pode virar "setor sem tendencia": sem propagar, o | `src/hooks/bi/useIndustryTrends.ts` |
| (3 é o mínimo válido de ColumnCount — 4 colunas só fica disponível a partir de 768px, ver columnOptions em ColumnSelector.tsx) | `src/hooks/catalog/useCatalogDisplay.ts` |
| validação. O contato fica vazio até seleção real no formulário. | `src/hooks/quote/useQuoteInitialization.ts` |
| colunas). Rehidrata do catálogo (SSOT) para o badge/validação de | `src/hooks/quote/useQuoteInitialization.ts` |
| * Calcula riscos usando somente estoque e variantes retornados pelo catálogo. */ | `src/hooks/quote/useQuotesStockStatus.ts` |
| Desconto APARENTE aplicado sobre subtotal apresentado | `src/hooks/quotes/quoteHelpers.ts` |
| Desconto REAL: comparado ao subtotal real (usado para alçada) | `src/hooks/quotes/quoteHelpers.ts` |
| * Margem de negociação interna 0–50% (default 0). Infla o subtotal apresentado para criar margem psicológica de desconto. NUNCA exposto ao cliente. */ | `src/hooks/quotes/quoteTypes.ts` |
| * Subtotal real (sem markup). Calculado pelo trigger; somente leitura. */ | `src/hooks/quotes/quoteTypes.ts` |
| * Desconto efetivo real vs real_subtotal (validado contra alçada). Somente leitura. */ | `src/hooks/quotes/quoteTypes.ts` |
| Permission check | `src/hooks/quotes/useQuotes.ts` |
| * Fallback heurístico (legado): usado APENAS quando o RPC oficial falha | `src/hooks/simulation/simulationPriceFetcher.ts` |
| IMPORTANTE: USA SOMENTE O BD EXTERNO PROMOBRIND! | `src/hooks/tecnicas/useTecnicasList.ts` |
| origem deve ser feita via body/URL, não via header global. | `src/integrations/supabase/client.ts` |
| 3. Coalesce reloads dentro de 30s (no máximo 2 tentativas) usando | `src/lib/chunk-recovery.ts` |
| * Retorna `true` se acionou um reload (o caller deve exibir um placeholder | `src/lib/chunk-recovery.ts` |
| neutro enquanto aguarda a navegação) ou `false` se o limite de tentativas | `src/lib/chunk-recovery.ts` |
| foi atingido — neste caso o caller deve mostrar tela de erro estável. | `src/lib/chunk-recovery.ts` |
| dando um sinal visual por tipo de falha. Usa apenas tokens da paleta | `src/lib/connection-error-copy.ts` |
| * Limite acima do qual uma conexão é destacada como "muitas falhas seguidas". */ | `src/lib/connections-config.ts` |
| e a projecao e somente o id — nenhum nome, CNPJ, e-mail ou telefone. | `src/lib/crm-db.ts` |
| * Formata apenas a hora | `src/lib/date-utils.ts` |
| * Antes: 6 invokes paralelos = 6 round-trips TLS, 6 entradas no rate-limit, | `src/lib/external-db-prewarm.ts` |
| o prewarm dispara no máximo 1x por sessão de browser — ideal para gatilho | `src/lib/external-db-prewarm.ts` |
| (apenas 2 invokes totais: 1 batch das 6 tabelas + 1 ping CRM) | `src/lib/external-db-prewarm.ts` |
| * IMPORTANTE: Este é o ÚNICO local onde invokeExternalRpc deve ser definido. | `src/lib/external-rpc.ts` |
| … +345 linhas — lista completa em `context.json` | |
