# Lints de segurança e performance

Verificações objetivas feitas no catálogo. Um agente deve ler isto antes de propor mudanças em RLS, functions ou índices.

| severidade | código | objeto | detalhe |
|---|---|---|---|
| ALTA | secdef_mutable_search_path | public.cleanup_old_notifications() | SECURITY DEFINER sem `SET search_path`: vulnerável a sequestro de search_path. |
| ALTA | secdef_mutable_search_path | public.get_unread_count() | SECURITY DEFINER sem `SET search_path`: vulnerável a sequestro de search_path. |
| ALTA | secdef_mutable_search_path | public.is_dnd_active(p_user_id uuid) | SECURITY DEFINER sem `SET search_path`: vulnerável a sequestro de search_path. |
| ALTA | secdef_mutable_search_path | public.mark_all_notifications_read() | SECURITY DEFINER sem `SET search_path`: vulnerável a sequestro de search_path. |
| ALTA | secdef_mutable_search_path | public.mark_notification_read(p_notification_id uuid) | SECURITY DEFINER sem `SET search_path`: vulnerável a sequestro de search_path. |
| BAIXA | fk_without_index | public.pa_budget_entries.pa_budget_entries_actor_id_fkey | FK sem índice nas colunas ['actor_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.pa_budget_entries.pa_budget_entries_cost_center_id_fkey | FK sem índice nas colunas ['cost_center_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.pa_budget_entries.pa_budget_entries_pa_id_fkey | FK sem índice nas colunas ['pa_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.pa_budgets.pa_budgets_fechada_por_fkey | FK sem índice nas colunas ['fechada_por']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | fk_without_index | public.sicoob_orders.sicoob_orders_cost_center_id_fkey | FK sem índice nas colunas ['cost_center_id']: joins e DELETE/UPDATE na tabela pai ficam lentos. |
| BAIXA | policy_auth_fn_not_wrapped | public.admin_audit_log_y2026_m11.Admins can insert audit logs | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | public.admin_audit_log_y2026_m11.Admins can view audit logs | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | public.admin_audit_log_y2026_m12.Admins can insert audit logs | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | public.admin_audit_log_y2026_m12.Admins can view audit logs | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | public.admin_audit_log_y2027_m01.Admins can insert audit logs | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | public.admin_audit_log_y2027_m01.Admins can view audit logs | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | public.admin_audit_log_y2027_m02.Admins can insert audit logs | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | public.admin_audit_log_y2027_m02.Admins can view audit logs | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Admins can delete component media | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Admins can delete personalization images | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Admins can delete videos | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Admins can list protected buckets | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Admins can update component media | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Admins can upload QA evidences | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Admins can upload component media | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Admins can upload videos | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Authenticated Upload Secondary | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Authenticated users can delete own personalization images | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Authenticated users can update own personalization images | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Only admins can delete supplier logos | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Only admins can manage supplier logos | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Only admins can update product videos | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Only admins can update supplier logos | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Only admins can upload supplier logos | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Users can delete their own art files | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Users can upload own personalization images | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Users can upload their own art files | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Users can view their own export files | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Users can view their own or shared art files | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Users delete own art files in storage | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Users update own art files in storage | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Users upload own art files to storage | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.Users view own art files in storage | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.avatars_admin_write | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.export_files_read_by_owner | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.sicoob_order_documents_delete_orphan_artwork | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.sicoob_order_documents_delete_orphan_delivery | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| BAIXA | policy_auth_fn_not_wrapped | storage.objects.sicoob_order_documents_delete_orphan_invoice | Policy chama auth.uid()/jwt() sem `(select ...)`: é reavaliada por linha; envolva em subselect. |
| INFO | realtime_replica_identity | public.device_login_notifications | Publicada no Realtime sem REPLICA IDENTITY FULL: eventos de UPDATE/DELETE não trazem `old` completo. |
| INFO | realtime_replica_identity | public.login_attempts | Publicada no Realtime sem REPLICA IDENTITY FULL: eventos de UPDATE/DELETE não trazem `old` completo. |
| INFO | realtime_replica_identity | public.notifications | Publicada no Realtime sem REPLICA IDENTITY FULL: eventos de UPDATE/DELETE não trazem `old` completo. |
| INFO | realtime_replica_identity | public.product_views | Publicada no Realtime sem REPLICA IDENTITY FULL: eventos de UPDATE/DELETE não trazem `old` completo. |
| INFO | realtime_replica_identity | public.search_analytics | Publicada no Realtime sem REPLICA IDENTITY FULL: eventos de UPDATE/DELETE não trazem `old` completo. |
| INFO | rpc_anon_executable | public.cleanup_old_notifications() | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
| INFO | rpc_anon_executable | public.get_public_favorite_list(_token text) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
| INFO | rpc_anon_executable | public.get_public_favorite_reactions(_token text, _anon_id text) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
| INFO | rpc_anon_executable | public.get_sicoob_invitation(p_token text) | SECURITY DEFINER chamável via RPC por anon (sem login): roda com privilégios do owner. Confirme que é intencional (Supabase dá EXECUTE a anon por padrão; revogue se não for API pública). |
