# Índices

Uso e tamanho em `stats.md`.

| tabela | índice | método | colunas | único | válido | predicado |
|---|---|---|---|---|---|---|
| private.quote_price_attestations | quote_price_attestations_expiration_idx | btree | expires_at | não | sim |  |
| private.quote_price_attestations | quote_price_attestations_pkey | btree | id | sim | sim |  |
| public._backup_custom_kits_pinned_20261118 | _backup_custom_kits_pinned_20261118_pkey | btree | id | sim | sim |  |
| public.access_blocked_log | access_blocked_log_pkey | btree | id | sim | sim |  |
| public.access_blocked_log | idx_access_blocked_log_created_at | btree | created_at | não | sim |  |
| public.access_blocked_log | idx_access_blocked_log_ip | btree | ip_address | não | sim |  |
| public.access_blocked_log | idx_access_blocked_log_user | btree | user_id | não | sim |  |
| public.access_security_settings | access_security_settings_pkey | btree | id | sim | sim |  |
| public.access_security_settings | idx_fk_access_security_settings_updated_by_fkey | btree | updated_by | não | sim |  |
| public.admin_audit_log | admin_audit_log_partitioned_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log | idx_admin_audit_log_action | btree | action | não | sim |  |
| public.admin_audit_log | idx_admin_audit_log_created_at | btree | created_at | não | sim |  |
| public.admin_audit_log | idx_admin_audit_log_current_hash | btree | current_hash | não | sim |  |
| public.admin_audit_log | idx_admin_audit_log_request_id | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log | idx_admin_audit_log_resource_lookup | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log | idx_admin_audit_log_source | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log | idx_admin_audit_log_status | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log | idx_admin_audit_log_user_id | btree | user_id | não | sim |  |
| public.admin_audit_log_default | admin_audit_log_default_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_default | admin_audit_log_default_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_default | admin_audit_log_default_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_default | admin_audit_log_default_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_default | admin_audit_log_default_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_default | admin_audit_log_default_resource_type_resource_id_created_a_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_default | admin_audit_log_default_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_default | admin_audit_log_default_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_default | admin_audit_log_default_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2024 | admin_audit_log_y2024_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2024 | admin_audit_log_y2024_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2024 | admin_audit_log_y2024_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2024 | admin_audit_log_y2024_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2024 | admin_audit_log_y2024_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2024 | admin_audit_log_y2024_resource_type_resource_id_created_at_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2024 | admin_audit_log_y2024_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2024 | admin_audit_log_y2024_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2024 | admin_audit_log_y2024_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2025 | admin_audit_log_y2025_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2025 | admin_audit_log_y2025_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2025 | admin_audit_log_y2025_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2025 | admin_audit_log_y2025_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2025 | admin_audit_log_y2025_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2025 | admin_audit_log_y2025_resource_type_resource_id_created_at_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2025 | admin_audit_log_y2025_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2025 | admin_audit_log_y2025_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2025 | admin_audit_log_y2025_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m01 | admin_audit_log_y2026_m01_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m01 | admin_audit_log_y2026_m01_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m01 | admin_audit_log_y2026_m01_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m01 | admin_audit_log_y2026_m01_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m01 | admin_audit_log_y2026_m01_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m01 | admin_audit_log_y2026_m01_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m01 | admin_audit_log_y2026_m01_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m01 | admin_audit_log_y2026_m01_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m01 | admin_audit_log_y2026_m01_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m02 | admin_audit_log_y2026_m02_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m02 | admin_audit_log_y2026_m02_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m02 | admin_audit_log_y2026_m02_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m02 | admin_audit_log_y2026_m02_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m02 | admin_audit_log_y2026_m02_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m02 | admin_audit_log_y2026_m02_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m02 | admin_audit_log_y2026_m02_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m02 | admin_audit_log_y2026_m02_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m02 | admin_audit_log_y2026_m02_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m03 | admin_audit_log_y2026_m03_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m03 | admin_audit_log_y2026_m03_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m03 | admin_audit_log_y2026_m03_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m03 | admin_audit_log_y2026_m03_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m03 | admin_audit_log_y2026_m03_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m03 | admin_audit_log_y2026_m03_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m03 | admin_audit_log_y2026_m03_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m03 | admin_audit_log_y2026_m03_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m03 | admin_audit_log_y2026_m03_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m04 | admin_audit_log_y2026_m04_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m04 | admin_audit_log_y2026_m04_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m04 | admin_audit_log_y2026_m04_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m04 | admin_audit_log_y2026_m04_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m04 | admin_audit_log_y2026_m04_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m04 | admin_audit_log_y2026_m04_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m04 | admin_audit_log_y2026_m04_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m04 | admin_audit_log_y2026_m04_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m04 | admin_audit_log_y2026_m04_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m05 | admin_audit_log_y2026_m05_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m05 | admin_audit_log_y2026_m05_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m05 | admin_audit_log_y2026_m05_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m05 | admin_audit_log_y2026_m05_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m05 | admin_audit_log_y2026_m05_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m05 | admin_audit_log_y2026_m05_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m05 | admin_audit_log_y2026_m05_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m05 | admin_audit_log_y2026_m05_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m05 | admin_audit_log_y2026_m05_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m06 | admin_audit_log_y2026_m06_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m06 | admin_audit_log_y2026_m06_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m06 | admin_audit_log_y2026_m06_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m06 | admin_audit_log_y2026_m06_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m06 | admin_audit_log_y2026_m06_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m06 | admin_audit_log_y2026_m06_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m06 | admin_audit_log_y2026_m06_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m06 | admin_audit_log_y2026_m06_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m06 | admin_audit_log_y2026_m06_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m07 | admin_audit_log_y2026_m07_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m07 | admin_audit_log_y2026_m07_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m07 | admin_audit_log_y2026_m07_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m07 | admin_audit_log_y2026_m07_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m07 | admin_audit_log_y2026_m07_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m07 | admin_audit_log_y2026_m07_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m07 | admin_audit_log_y2026_m07_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m07 | admin_audit_log_y2026_m07_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m07 | admin_audit_log_y2026_m07_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m08 | admin_audit_log_y2026_m08_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m08 | admin_audit_log_y2026_m08_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m08 | admin_audit_log_y2026_m08_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m08 | admin_audit_log_y2026_m08_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m08 | admin_audit_log_y2026_m08_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m08 | admin_audit_log_y2026_m08_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m08 | admin_audit_log_y2026_m08_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m08 | admin_audit_log_y2026_m08_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m08 | admin_audit_log_y2026_m08_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m09 | admin_audit_log_y2026_m09_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m09 | admin_audit_log_y2026_m09_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m09 | admin_audit_log_y2026_m09_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m09 | admin_audit_log_y2026_m09_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m09 | admin_audit_log_y2026_m09_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m09 | admin_audit_log_y2026_m09_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m09 | admin_audit_log_y2026_m09_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m09 | admin_audit_log_y2026_m09_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m09 | admin_audit_log_y2026_m09_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m10 | admin_audit_log_y2026_m10_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m10 | admin_audit_log_y2026_m10_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m10 | admin_audit_log_y2026_m10_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m10 | admin_audit_log_y2026_m10_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m10 | admin_audit_log_y2026_m10_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m10 | admin_audit_log_y2026_m10_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m10 | admin_audit_log_y2026_m10_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m10 | admin_audit_log_y2026_m10_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m10 | admin_audit_log_y2026_m10_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m11 | admin_audit_log_y2026_m11_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m11 | admin_audit_log_y2026_m11_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m11 | admin_audit_log_y2026_m11_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m11 | admin_audit_log_y2026_m11_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m11 | admin_audit_log_y2026_m11_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m11 | admin_audit_log_y2026_m11_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m11 | admin_audit_log_y2026_m11_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m11 | admin_audit_log_y2026_m11_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m11 | admin_audit_log_y2026_m11_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2026_m12 | admin_audit_log_y2026_m12_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2026_m12 | admin_audit_log_y2026_m12_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2026_m12 | admin_audit_log_y2026_m12_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2026_m12 | admin_audit_log_y2026_m12_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2026_m12 | admin_audit_log_y2026_m12_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2026_m12 | admin_audit_log_y2026_m12_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2026_m12 | admin_audit_log_y2026_m12_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m12 | admin_audit_log_y2026_m12_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2026_m12 | admin_audit_log_y2026_m12_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2027_m01 | admin_audit_log_y2027_m01_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2027_m01 | admin_audit_log_y2027_m01_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2027_m01 | admin_audit_log_y2027_m01_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2027_m01 | admin_audit_log_y2027_m01_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2027_m01 | admin_audit_log_y2027_m01_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2027_m01 | admin_audit_log_y2027_m01_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2027_m01 | admin_audit_log_y2027_m01_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2027_m01 | admin_audit_log_y2027_m01_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2027_m01 | admin_audit_log_y2027_m01_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2027_m02 | admin_audit_log_y2027_m02_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2027_m02 | admin_audit_log_y2027_m02_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2027_m02 | admin_audit_log_y2027_m02_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2027_m02 | admin_audit_log_y2027_m02_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2027_m02 | admin_audit_log_y2027_m02_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2027_m02 | admin_audit_log_y2027_m02_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2027_m02 | admin_audit_log_y2027_m02_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2027_m02 | admin_audit_log_y2027_m02_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2027_m02 | admin_audit_log_y2027_m02_user_id_idx | btree | user_id | não | sim |  |
| public.admin_audit_log_y2027_m03 | admin_audit_log_y2027_m03_action_idx | btree | action | não | sim |  |
| public.admin_audit_log_y2027_m03 | admin_audit_log_y2027_m03_created_at_idx | btree | created_at | não | sim |  |
| public.admin_audit_log_y2027_m03 | admin_audit_log_y2027_m03_current_hash_idx | btree | current_hash | não | sim |  |
| public.admin_audit_log_y2027_m03 | admin_audit_log_y2027_m03_pkey | btree | id, created_at | sim | sim |  |
| public.admin_audit_log_y2027_m03 | admin_audit_log_y2027_m03_request_id_idx | btree | request_id | não | sim | `(request_id IS NOT NULL)` |
| public.admin_audit_log_y2027_m03 | admin_audit_log_y2027_m03_resource_type_resource_id_created_idx | btree | resource_type, resource_id, created_at | não | sim |  |
| public.admin_audit_log_y2027_m03 | admin_audit_log_y2027_m03_source_created_at_idx | btree | source, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2027_m03 | admin_audit_log_y2027_m03_status_created_at_idx | btree | status, created_at | não | sim | `(status IS NOT NULL)` |
| public.admin_audit_log_y2027_m03 | admin_audit_log_y2027_m03_user_id_idx | btree | user_id | não | sim |  |
| public.admin_config_audit | admin_config_audit_pkey | btree | id | sim | sim |  |
| public.admin_config_audit | idx_fk_admin_config_audit_changed_by_fkey | btree | changed_by | não | sim |  |
| public.admin_settings | admin_settings_key_key | btree | key | sim | sim |  |
| public.admin_settings | admin_settings_pkey | btree | id | sim | sim |  |
| public.ai_insights_cache | ai_insights_cache_pkey | btree | id | sim | sim |  |
| public.ai_insights_cache | idx_ai_insights_cache_expires | btree | expires_at | não | sim |  |
| public.ai_insights_cache | ux_ai_insights_cache_user_fn_key | btree | user_id, function_name, cache_key | sim | sim |  |
| public.ai_usage_events | ai_usage_events_pkey | btree | id | sim | sim |  |
| public.ai_usage_events | idx_ai_usage_events_fn_created | btree | function_name, created_at | não | sim |  |
| public.ai_usage_events | idx_ai_usage_events_user_created | btree | user_id, created_at | não | sim |  |
| public.ai_usage_logs | ai_usage_logs_pkey | btree | id | sim | sim |  |
| public.ai_usage_logs | idx_ai_usage_logs_created_at | btree | created_at | não | sim |  |
| public.ai_usage_logs | idx_ai_usage_logs_function | btree | function_name | não | sim |  |
| public.ai_usage_logs | idx_ai_usage_logs_user_id | btree | user_id | não | sim |  |
| public.ai_usage_logs | idx_ai_usage_logs_user_month | btree | user_id, created_at | não | sim |  |
| public.ai_usage_quotas | ai_usage_quotas_pkey | btree | id | sim | sim |  |
| public.ai_usage_quotas | ai_usage_quotas_role_key | btree | role | sim | sim |  |
| public.art_file_attachments | art_file_attachments_pkey | btree | id | sim | sim |  |
| public.art_file_attachments | idx_art_files_mockup | btree | mockup_id | não | sim |  |
| public.art_file_attachments | idx_art_files_quote | btree | quote_id | não | sim |  |
| public.art_file_attachments | idx_art_files_user | btree | user_id | não | sim |  |
| public.audit_log | audit_log_pkey | btree | id | sim | sim |  |
| public.audit_log | idx_audit_log_created_at | btree | created_at | não | sim |  |
| public.audit_log | idx_audit_log_entity | btree | entity_type, entity_id | não | sim |  |
| public.audit_log | idx_audit_log_user_id | btree | user_id | não | sim |  |
| public.bitrix_clients | bitrix_clients_bitrix_id_key | btree | bitrix_id | sim | sim |  |
| public.bitrix_clients | bitrix_clients_pkey | btree | id | sim | sim |  |
| public.bitrix_deals | bitrix_deals_bitrix_id_key | btree | bitrix_id | sim | sim |  |
| public.bitrix_deals | bitrix_deals_client_idx | btree | bitrix_client_id | não | sim |  |
| public.bitrix_deals | bitrix_deals_pkey | btree | id | sim | sim |  |
| public.bitrix_sync_logs | bitrix_sync_logs_pkey | btree | id | sim | sim |  |
| public.bitrix_sync_logs | bitrix_sync_logs_started_idx | btree | started_at | não | sim |  |
| public.bitrix_sync_logs | idx_bitrix_sync_logs_synced_by | btree | synced_by | não | sim |  |
| public.blog_posts | blog_posts_pkey | btree | id | sim | sim |  |
| public.blog_posts | blog_posts_slug_key | btree | slug | sim | sim |  |
| public.blog_posts | idx_fk_blog_posts_author_id_fkey | btree | author_id | não | sim |  |
| public.bot_detection_log | bot_detection_log_pkey | btree | id | sim | sim |  |
| public.bot_detection_log | idx_bot_log_blocked | btree | blocked | não | sim | `(blocked = true)` |
| public.bot_detection_log | idx_bot_log_created | btree | created_at | não | sim |  |
| public.bot_detection_log | idx_bot_log_ip | btree | ip_address | não | sim |  |
| public.campaigns | campaigns_pkey | btree | id | sim | sim |  |
| public.cart_items | cart_items_pkey | btree | id | sim | sim |  |
| public.cart_items | idx_fk_cart_items_user_id_fkey | btree | user_id | não | sim |  |
| public.cart_templates | cart_templates_pkey | btree | id | sim | sim |  |
| public.cart_templates | idx_cart_templates_user_id | btree | user_id | não | sim |  |
| public.catalog_marketing_terms | catalog_marketing_terms_category_slug_key | btree | category, slug | sim | sim |  |
| public.catalog_marketing_terms | catalog_marketing_terms_pkey | btree | id | sim | sim |  |
| public.catalog_marketing_terms | idx_catalog_marketing_terms_created_by | btree | created_by | não | sim |  |
| public.catalog_marketing_terms | idx_catalog_marketing_terms_updated_by | btree | updated_by | não | sim |  |
| public.catalog_product_marketing | catalog_product_marketing_pkey | btree | product_id, term_id | sim | sim |  |
| public.catalog_product_marketing | idx_catalog_product_marketing_created_by | btree | created_by | não | sim |  |
| public.catalog_product_marketing | idx_catalog_product_marketing_term_product | btree | term_id, product_id | não | sim |  |
| public.category_icons | category_icons_pkey | btree | id | sim | sim |  |
| public.city_whitelist | city_whitelist_city_name_state_country_code_key | btree | city_name, state, country_code | sim | sim |  |
| public.city_whitelist | city_whitelist_pkey | btree | id | sim | sim |  |
| public.city_whitelist | idx_city_whitelist_lookup | btree | country_code, is_active | não | sim | `(is_active = true)` |
| public.city_whitelist | idx_fk_city_whitelist_created_by_fkey | btree | created_by | não | sim |  |
| public.cms_banners | cms_banners_pkey | btree | id | sim | sim |  |
| public.cms_config | cms_config_pkey | btree | key | sim | sim |  |
| public.cms_sections | cms_sections_pkey | btree | id | sim | sim |  |
| public.collection_item_reactions | collection_item_reactions_pkey | btree | id | sim | sim |  |
| public.collection_item_reactions | idx_collection_reactions_collection | btree | collection_id | não | sim |  |
| public.collection_item_reactions | idx_collection_reactions_item | btree | item_id | não | sim |  |
| public.collection_item_reactions | uq_collection_reactions_anon | btree | item_id, anon_id, emoji | sim | sim |  |
| public.collection_items | collection_items_collection_id_product_id_color_name_key | btree | collection_id, product_id, color_name | sim | sim |  |
| public.collection_items | collection_items_pkey | btree | id | sim | sim |  |
| public.collection_items | idx_collection_items_collection | btree | collection_id, sort_order | não | sim |  |
| public.collection_items | idx_collection_items_collection_id | btree | collection_id | não | sim |  |
| public.collection_items_trash | collection_items_trash_pkey | btree | id | sim | sim |  |
| public.collection_items_trash | idx_collection_trash_collection | btree | collection_id | não | sim |  |
| public.collection_items_trash | idx_collection_trash_expires | btree | expires_at | não | sim |  |
| public.collection_items_trash | idx_collection_trash_user | btree | user_id | não | sim |  |
| public.collections | collections_pkey | btree | id | sim | sim |  |
| public.collections | collections_share_token_key | btree | share_token | sim | sim |  |
| public.collections | idx_collections_client | btree | client_id | não | sim | `(client_id IS NOT NULL)` |
| public.collections | idx_collections_share_token | btree | share_token | não | sim | `(share_token IS NOT NULL)` |
| public.collections | idx_collections_user_id | btree | user_id | não | sim |  |
| public.comparison_reactions | comparison_reactions_pkey | btree | id | sim | sim |  |
| public.comparison_reactions | idx_comparison_reactions_comp | btree | comparison_id, created_at | não | sim |  |
| public.comparison_reactions | uq_comparison_reactions_anon | btree | comparison_id, item_index, emoji, anon_id | sim | sim |  |
| public.component_media | component_media_pkey | btree | id | sim | sim |  |
| public.connection_test_history | connection_test_history_pkey | btree | id | sim | sim |  |
| public.connection_test_history | idx_connection_test_history_conn_time | btree | connection_id, tested_at | não | sim |  |
| public.connection_test_history | idx_cth_triggered_by | btree | triggered_by | não | sim |  |
| public.cooperativa_budgets | cooperativa_budgets_cooperativa_id_ano_mes_key | btree | cooperativa_id, ano, mes | sim | sim |  |
| public.cooperativa_budgets | cooperativa_budgets_pkey | btree | id | sim | sim |  |
| public.cooperativa_budgets | idx_coop_budgets_period | btree | ano, mes | não | sim |  |
| public.cooperativas | cooperativas_codigo_key | btree | codigo | sim | sim |  |
| public.cooperativas | cooperativas_pkey | btree | id | sim | sim |  |
| public.cooperativas | idx_cooperativas_active | btree | is_active | não | sim | `(is_active = true)` |
| public.cooperativas | idx_fk_cooperativas_central_id_fkey | btree | central_id | não | sim |  |
| public.cooperativas | idx_fk_cooperativas_sicoob_tema_id_fkey | btree | sicoob_tema_id | não | sim |  |
| public.cooperativas_parceiras | cooperativas_parceiras_pkey | btree | id | sim | sim |  |
| public.cooperativas_parceiras | cooperativas_parceiras_registration_number_key | btree | registration_number | sim | sim |  |
| public.cost_centers | cost_centers_coop_codigo_uk | btree | cooperativa_id, codigo | sim | sim |  |
| public.cost_centers | cost_centers_pkey | btree | id | sim | sim |  |
| public.cost_centers | idx_cost_centers_coop | btree | cooperativa_id | não | sim | `ativo` |
| public.coupons | coupons_code_key | btree | code | sim | sim |  |
| public.coupons | coupons_pkey | btree | id | sim | sim |  |
| public.custom_kits | custom_kits_pkey | btree | id | sim | sim |  |
| public.custom_kits | idx_custom_kits_one_pinned_per_user | btree | user_id | sim | sim | `is_pinned` |
| public.custom_kits | idx_custom_kits_tag | btree | tag | não | sim |  |
| public.custom_kits | idx_custom_kits_user_favorite | btree | user_id, is_favorite | não | sim | `(is_favorite = true)` |
| public.custom_kits | idx_custom_kits_user_pinned | btree | user_id, is_pinned, last_used_at | não | sim |  |
| public.device_login_notifications | device_login_notifications_pkey | btree | id | sim | sim |  |
| public.device_login_notifications | idx_fk_device_login_notifications_device_id_fkey | btree | device_id | não | sim |  |
| public.discount_approval_requests | discount_approval_one_pending_per_quote_idx | btree | quote_id | sim | sim | `(status = 'pending'::text)` |
| public.discount_approval_requests | discount_approval_requests_pkey | btree | id | sim | sim |  |
| public.discount_approval_requests | idx_dar_seller_created_at | btree | seller_id, created_at | não | sim |  |
| public.discount_approval_requests | idx_dar_seller_status_created_at | btree | seller_id, status, created_at | não | sim |  |
| public.discount_approval_requests | idx_discount_approval_requests_quote_id | btree | quote_id | não | sim |  |
| public.discount_approval_requests | idx_discount_approval_requests_seller_id | btree | seller_id | não | sim |  |
| public.discount_approval_requests | idx_discount_approval_requests_status | btree | status | não | sim |  |
| public.e2e_cleanup_audit | e2e_cleanup_audit_pkey | btree | id | sim | sim |  |
| public.e2e_cleanup_audit | idx_e2e_cleanup_audit_created_at | btree | created_at | não | sim |  |
| public.e2e_cleanup_audit | idx_e2e_cleanup_audit_email | btree | email, created_at | não | sim |  |
| public.e2e_cleanup_audit | idx_e2e_cleanup_audit_seller_id | btree | seller_id, created_at | não | sim | `(seller_id IS NOT NULL)` |
| public.e2e_cleanup_audit | idx_e2e_cleanup_audit_status | btree | status, created_at | não | sim |  |
| public.e2e_cleanup_rate_limit | e2e_cleanup_rate_limit_pkey | btree | key | sim | sim |  |
| public.expert_conversations | expert_conversations_pkey | btree | id | sim | sim |  |
| public.expert_conversations | idx_expert_conversations_seller_id | btree | seller_id | não | sim |  |
| public.expert_messages | expert_messages_pkey | btree | id | sim | sim |  |
| public.expert_messages | idx_expert_messages_conversation_id | btree | conversation_id | não | sim |  |
| public.export_audit_log | export_audit_log_pkey | btree | id | sim | sim |  |
| public.export_audit_log | idx_fk_export_audit_log_job_id_fkey | btree | job_id | não | sim |  |
| public.export_audit_log | idx_fk_export_audit_log_user_id_fkey | btree | user_id | não | sim |  |
| public.export_jobs | export_jobs_pkey | btree | id | sim | sim |  |
| public.export_jobs | idx_export_jobs_pending_claim | btree | created_at, id | não | sim | `(status = ANY (ARRAY['pending'::text, 'failed'::text]))` |
| public.export_jobs | idx_fk_export_jobs_user_id_fkey | btree | user_id | não | sim |  |
| public.external_connections | external_connections_pkey | btree | id | sim | sim |  |
| public.external_connections | external_connections_type_name_key | btree | type, name | sim | sim |  |
| public.external_connections | external_connections_type_name_no_env_uidx | btree | type, name | sim | sim | `(env_key IS NULL)` |
| public.external_connections | idx_external_connections_auto_test_enabled | btree | auto_test_enabled | não | sim | `(auto_test_enabled = true)` |
| public.external_connections | idx_external_connections_envkey_type | btree | env_key, type | sim | sim | `(env_key IS NOT NULL)` |
| public.external_connections | idx_external_connections_type | btree | type | não | sim |  |
| public.external_connections_sync_log | external_connections_sync_log_pkey | btree | id | sim | sim |  |
| public.external_connections_sync_log | idx_ext_conn_sync_log_ran_at | btree | ran_at | não | sim |  |
| public.external_connections_sync_log | idx_ext_conn_sync_log_secret | btree | triggered_by_secret_name | não | sim |  |
| public.favorite_item_reactions | favorite_item_reactions_item_id_anon_id_emoji_key | btree | item_id, anon_id, emoji | sim | sim |  |
| public.favorite_item_reactions | favorite_item_reactions_pkey | btree | id | sim | sim |  |
| public.favorite_item_reactions | idx_favorite_reactions_created | btree | created_at | não | sim |  |
| public.favorite_item_reactions | idx_favorite_reactions_item | btree | item_id | não | sim |  |
| public.favorite_item_reactions | idx_favorite_reactions_list | btree | list_id | não | sim |  |
| public.favorite_items | favorite_items_list_product_variant_key | btree | list_id, product_id, variant_id | sim | sim |  |
| public.favorite_items | favorite_items_pkey | btree | id | sim | sim |  |
| public.favorite_items | idx_favorite_items_list | btree | list_id, position | não | sim |  |
| public.favorite_items | idx_favorite_items_product | btree | product_id | não | sim |  |
| public.favorite_items | idx_favorite_items_user | btree | user_id | não | sim |  |
| public.favorite_items_trash | favorite_items_trash_pkey | btree | id | sim | sim |  |
| public.favorite_items_trash | idx_favorite_items_trash_expires | btree | expires_at | não | sim |  |
| public.favorite_items_trash | idx_favorite_items_trash_user | btree | user_id, deleted_at | não | sim |  |
| public.favorite_lists | favorite_lists_pkey | btree | id | sim | sim |  |
| public.favorite_lists | favorite_lists_shared_token_key | btree | shared_token | sim | sim |  |
| public.favorite_lists | idx_favorite_lists_one_default | btree | user_id | sim | sim | `(is_default = true)` |
| public.favorite_lists | idx_favorite_lists_shared_token | btree | shared_token | não | sim | `(shared_token IS NOT NULL)` |
| public.favorite_lists | idx_favorite_lists_user | btree | user_id, position | não | sim |  |
| public.file_scan_logs | file_scan_logs_pkey | btree | id | sim | sim |  |
| public.file_scan_logs | idx_file_scan_logs_hash | btree | hash | não | sim |  |
| public.file_scan_logs | idx_file_scan_logs_user_id | btree | user_id | não | sim |  |
| public.follow_up_reminders | follow_up_reminders_pkey | btree | id | sim | sim |  |
| public.follow_up_reminders | idx_follow_up_pending | btree | is_sent, scheduled_for | não | sim |  |
| public.follow_up_reminders | idx_follow_up_reminders_completed | btree | is_completed, scheduled_for | não | sim |  |
| public.follow_up_reminders | idx_follow_up_reminders_seller_scheduled | btree | seller_id, scheduled_for | não | sim |  |
| public.generated_mockups | generated_mockups_pkey | btree | id | sim | sim |  |
| public.hardening_health_snapshots | hardening_health_snapshots_pkey | btree | id | sim | sim |  |
| public.hardening_health_snapshots | idx_hardening_snapshots_at | btree | snapshot_at | não | sim |  |
| public.inbound_webhook_endpoints | inbound_webhook_endpoints_pkey | btree | id | sim | sim |  |
| public.inbound_webhook_endpoints | inbound_webhook_endpoints_slug_key | btree | slug | sim | sim |  |
| public.inbound_webhook_events | idx_inbound_events_endpoint_time | btree | endpoint_id, received_at | não | sim |  |
| public.inbound_webhook_events | inbound_webhook_events_pkey | btree | id | sim | sim |  |
| public.integration_credentials | idx_integration_credentials_name | btree | secret_name | não | sim |  |
| public.integration_credentials | integration_credentials_pkey | btree | id | sim | sim |  |
| public.integration_credentials | integration_credentials_secret_name_key | btree | secret_name | sim | sim |  |
| public.ip_access_control | idx_ip_access_control_ip | btree | ip_address | não | sim |  |
| public.ip_access_control | idx_ip_access_control_type_expires | btree | list_type, expires_at | não | sim |  |
| public.ip_access_control | ip_access_control_ip_address_key | btree | ip_address | sim | sim |  |
| public.ip_access_control | ip_access_control_pkey | btree | id | sim | sim |  |
| public.ip_whitelist | idx_ip_whitelist_active | btree | is_active | não | sim | `(is_active = true)` |
| public.ip_whitelist | idx_ip_whitelist_created_by | btree | created_by | não | sim |  |
| public.ip_whitelist | ip_whitelist_ip_address_key | btree | ip_address | sim | sim |  |
| public.ip_whitelist | ip_whitelist_pkey | btree | id | sim | sim |  |
| public.kit_collaborators | idx_kit_collab_kit | btree | kit_id | não | sim |  |
| public.kit_collaborators | idx_kit_collab_user | btree | user_id | não | sim |  |
| public.kit_collaborators | kit_collaborators_kit_id_user_id_key | btree | kit_id, user_id | sim | sim |  |
| public.kit_collaborators | kit_collaborators_pkey | btree | id | sim | sim |  |
| public.kit_comments | idx_kit_comments_kit | btree | kit_id | não | sim |  |
| public.kit_comments | idx_kit_comments_parent | btree | parent_id | não | sim |  |
| public.kit_comments | kit_comments_pkey | btree | id | sim | sim |  |
| public.kit_share_tokens | idx_kit_share_tokens_kit_id | btree | kit_id | não | sim |  |
| public.kit_share_tokens | kit_share_tokens_pkey | btree | id | sim | sim |  |
| public.kit_share_tokens | kit_share_tokens_token_key | btree | token | sim | sim |  |
| public.kit_templates | idx_kit_templates_active_category | btree | is_active, category | não | sim |  |
| public.kit_templates | idx_kit_templates_usage | btree | usage_count | não | sim | `(is_active = true)` |
| public.kit_templates | kit_templates_pkey | btree | id | sim | sim |  |
| public.kit_variants | idx_kit_variants_master | btree | kit_master_id | não | sim |  |
| public.kit_variants | kit_variants_pkey | btree | id | sim | sim |  |
| public.limit_increase_requests | idx_fk_limit_increase_requests_approved_by_fkey | btree | approved_by | não | sim |  |
| public.limit_increase_requests | idx_fk_limit_increase_requests_pa_id_fkey | btree | pa_id | não | sim |  |
| public.limit_increase_requests | idx_fk_limit_increase_requests_requested_by_fkey | btree | requested_by | não | sim |  |
| public.limit_increase_requests | limit_increase_requests_pkey | btree | id | sim | sim |  |
| public.login_attempts | idx_login_attempts_email_created | btree | email, created_at | não | sim |  |
| public.login_attempts | login_attempts_pkey | btree | id | sim | sim |  |
| public.magic_up_brand_kits | idx_magic_up_brand_kits_user_client | btree | user_id, client_id | não | sim |  |
| public.magic_up_brand_kits | magic_up_brand_kits_pkey | btree | id | sim | sim |  |
| public.magic_up_brand_kits | magic_up_brand_kits_user_id_client_id_key | btree | user_id, client_id | sim | sim |  |
| public.magic_up_campaigns | idx_magic_up_campaigns_user_status | btree | user_id, status, created_at | não | sim |  |
| public.magic_up_campaigns | magic_up_campaigns_pkey | btree | id | sim | sim |  |
| public.magic_up_comments | idx_magic_up_comments_generation | btree | generation_id, created_at | não | sim |  |
| public.magic_up_comments | magic_up_comments_pkey | btree | id | sim | sim |  |
| public.magic_up_generations | idx_magic_up_generations_campaign | btree | campaign_id, created_at | não | sim |  |
| public.magic_up_generations | idx_magic_up_generations_tags | gin | tags | não | sim |  |
| public.magic_up_generations | idx_magic_up_generations_user_channel_status | btree | user_id, channel, status, created_at | não | sim |  |
| public.magic_up_generations | idx_magic_up_generations_user_id | btree | user_id | não | sim |  |
| public.magic_up_generations | magic_up_generations_pkey | btree | id | sim | sim |  |
| public.magic_up_public_shares | idx_magic_up_public_shares_campaign_id | btree | campaign_id | não | sim |  |
| public.magic_up_public_shares | idx_magic_up_public_shares_generation_id | btree | generation_id | não | sim |  |
| public.magic_up_public_shares | idx_magic_up_public_shares_token | btree | share_token | não | sim |  |
| public.magic_up_public_shares | magic_up_public_shares_pkey | btree | id | sim | sim |  |
| public.magic_up_public_shares | magic_up_public_shares_share_token_key | btree | share_token | sim | sim |  |
| public.magic_up_reactions | idx_magic_up_reactions_generation | btree | generation_id, created_at | não | sim |  |
| public.magic_up_reactions | magic_up_reactions_generation_id_reaction_type_ip_hash_key | btree | generation_id, reaction_type, ip_hash | sim | sim |  |
| public.magic_up_reactions | magic_up_reactions_pkey | btree | id | sim | sim |  |
| public.manager_notification_config | idx_fk_manager_notification_config_user_id_fkey | btree | user_id | não | sim |  |
| public.manager_notification_config | manager_notification_config_pkey | btree | id | sim | sim |  |
| public.mcp_access_violations | idx_mcp_violations_created | btree | created_at | não | sim |  |
| public.mcp_access_violations | idx_mcp_violations_ip_created | btree | ip_address, created_at | não | sim |  |
| public.mcp_access_violations | idx_mcp_violations_user_created | btree | user_id, created_at | não | sim |  |
| public.mcp_access_violations | mcp_access_violations_pkey | btree | id | sim | sim |  |
| public.mcp_api_keys | idx_mcp_api_keys_rotated_from | btree | rotated_from | não | sim | `(rotated_from IS NOT NULL)` |
| public.mcp_api_keys | mcp_api_keys_key_hash_key | btree | key_hash | sim | sim |  |
| public.mcp_api_keys | mcp_api_keys_pkey | btree | id | sim | sim |  |
| public.mcp_full_grantors | mcp_full_grantors_pkey | btree | user_id | sim | sim |  |
| public.mcp_key_auto_revocations | idx_mcp_auto_rev_key | btree | key_id | não | sim |  |
| public.mcp_key_auto_revocations | idx_mcp_auto_rev_user | btree | created_by, revoked_at | não | sim |  |
| public.mcp_key_auto_revocations | mcp_key_auto_revocations_pkey | btree | id | sim | sim |  |
| public.mockup_drafts | mockup_drafts_pkey | btree | id | sim | sim |  |
| public.mockup_drafts | mockup_drafts_user_id_draft_key_key | btree | user_id, draft_key | sim | sim |  |
| public.mockup_prompt_configs | idx_mockup_prompt_configs_key | btree | config_key | não | sim |  |
| public.mockup_prompt_configs | idx_mockup_prompt_configs_technique | btree | technique_id | não | sim |  |
| public.mockup_prompt_configs | mockup_prompt_configs_config_key_key | btree | config_key | sim | sim |  |
| public.mockup_prompt_configs | mockup_prompt_configs_pkey | btree | id | sim | sim |  |
| public.mockup_prompt_history | idx_mockup_prompt_history_config | btree | config_id, changed_at | não | sim |  |
| public.mockup_prompt_history | mockup_prompt_history_pkey | btree | id | sim | sim |  |
| public.mockup_templates | idx_mockup_templates_product | btree | product_id | não | sim |  |
| public.mockup_templates | idx_mockup_templates_user | btree | user_id | não | sim |  |
| public.mockup_templates | mockup_templates_pkey | btree | id | sim | sim |  |
| public.newsletter_subscribers | newsletter_subscribers_email_key | btree | email | sim | sim |  |
| public.newsletter_subscribers | newsletter_subscribers_pkey | btree | id | sim | sim |  |
| public.notification_channels | notification_channels_name_key | btree | name | sim | sim |  |
| public.notification_channels | notification_channels_pkey | btree | id | sim | sim |  |
| public.notification_digests | idx_digests_user_status | btree | user_id, status | não | sim |  |
| public.notification_digests | notification_digests_pkey | btree | id | sim | sim |  |
| public.notification_logs | idx_notification_logs_user_id | btree | user_id | não | sim |  |
| public.notification_logs | notification_logs_pkey | btree | id | sim | sim |  |
| public.notification_preferences | notification_preferences_pkey | btree | user_id | sim | sim |  |
| public.notification_templates | notification_templates_pkey | btree | id | sim | sim |  |
| public.notification_templates | unique_template | btree | system, event_type, channel | sim | sim |  |
| public.notifications | idx_notifications_group | btree | group_key | não | sim | `(group_key IS NOT NULL)` |
| public.notifications | idx_notifications_scheduled | btree | scheduled_for | não | sim | `(scheduled_for IS NOT NULL)` |
| public.notifications | idx_notifications_source | btree | source_system, source_entity_type, source_entity_id | não | sim |  |
| public.notifications | idx_notifications_unread | btree | user_id, is_read | não | sim | `(NOT is_read)` |
| public.notifications | idx_notifications_user | btree | user_id, created_at | não | sim |  |
| public.notifications | notifications_pkey | btree | id | sim | sim |  |
| public.optimization_queue | idx_optimization_queue_status_priority | btree | status, priority, created_at | não | sim |  |
| public.optimization_queue | optimization_queue_pkey | btree | id | sim | sim |  |
| public.optimization_queue_runs | idx_optimization_queue_runs_queue | btree | queue_id, created_at | não | sim |  |
| public.optimization_queue_runs | optimization_queue_runs_pkey | btree | id | sim | sim |  |
| public.order_approval_history | idx_approval_history_order | btree | order_id | não | sim |  |
| public.order_approval_history | idx_fk_order_approval_history_approver_id_fkey | btree | approver_id | não | sim |  |
| public.order_approval_history | order_approval_history_pkey | btree | id | sim | sim |  |
| public.order_audit_events | idx_audit_category | btree | event_category | não | sim |  |
| public.order_audit_events | idx_audit_order | btree | order_id, occurred_at | não | sim |  |
| public.order_audit_events | idx_fk_order_audit_events_actor_id_fkey | btree | actor_id | não | sim |  |
| public.order_audit_events | order_audit_events_pkey | btree | id | sim | sim |  |
| public.order_comments | idx_comments_author | btree | author_id | não | sim |  |
| public.order_comments | idx_comments_order | btree | order_id, created_at | não | sim |  |
| public.order_comments | idx_order_comments_order_id | btree | order_id | não | sim |  |
| public.order_comments | idx_order_comments_parent_id | btree | parent_id | não | sim |  |
| public.order_comments | order_comments_pkey | btree | id | sim | sim |  |
| public.order_consolidation_orders | idx_consolidation_orders_group | btree | consolidation_id | não | sim |  |
| public.order_consolidation_orders | order_consolidation_orders_order_id_key | btree | order_id | sim | sim |  |
| public.order_consolidation_orders | order_consolidation_orders_pkey | btree | consolidation_id, order_id | sim | sim |  |
| public.order_consolidations | idx_fk_order_consolidations_consolidated_by_fkey | btree | consolidated_by | não | sim |  |
| public.order_consolidations | idx_order_consolidations_singular_id | btree | singular_id | não | sim |  |
| public.order_consolidations | idx_order_consolidations_vendedor_id | btree | vendedor_id | não | sim |  |
| public.order_consolidations | order_consolidations_pkey | btree | id | sim | sim |  |
| public.order_consolidations | ux_order_consolidations_idempotency | btree | idempotency_key | sim | sim | `(idempotency_key IS NOT NULL)` |
| public.order_duplicate_requests | idx_order_duplicate_requests_duplicated_order | btree | duplicated_order_id | não | sim |  |
| public.order_duplicate_requests | idx_order_duplicate_requests_source_order | btree | source_order_id | não | sim |  |
| public.order_duplicate_requests | order_duplicate_requests_actor_source_key_key | btree | actor_id, source_order_id, idempotency_key | sim | sim |  |
| public.order_duplicate_requests | order_duplicate_requests_pkey | btree | id | sim | sim |  |
| public.order_invoices | idx_fk_order_invoices_created_by_fkey | btree | created_by | não | sim |  |
| public.order_invoices | idx_invoices_due_date | btree | due_date | não | sim | `(status = ANY (ARRAY['issued'::text, 'overdue'::text]))` |
| public.order_invoices | idx_invoices_status | btree | status | não | sim |  |
| public.order_invoices | idx_order_invoices_order_id | btree | order_id | não | sim |  |
| public.order_invoices | order_invoices_order_id_invoice_number_key | btree | order_id, invoice_number | sim | sim |  |
| public.order_invoices | order_invoices_pkey | btree | id | sim | sim |  |
| public.order_items | idx_order_items_order_id | btree | order_id | não | sim |  |
| public.order_items | idx_order_items_organization_id | btree | organization_id | não | sim |  |
| public.order_items | order_items_pkey | btree | id | sim | sim |  |
| public.order_logistics | idx_order_logistics_order_id | btree | order_id | não | sim |  |
| public.order_logistics | order_logistics_pkey | btree | id | sim | sim |  |
| public.order_logistics_tracking | idx_fk_order_logistics_tracking_created_by_fkey | btree | created_by | não | sim |  |
| public.order_logistics_tracking | idx_logistics_order | btree | order_id | não | sim |  |
| public.order_logistics_tracking | idx_logistics_tracking_code | btree | tracking_code | não | sim | `(tracking_code IS NOT NULL)` |
| public.order_logistics_tracking | order_logistics_tracking_pkey | btree | id | sim | sim |  |
| public.order_payments | idx_fk_order_payments_created_by_fkey | btree | created_by | não | sim |  |
| public.order_payments | idx_payments_date | btree | payment_date | não | sim |  |
| public.order_payments | idx_payments_invoice | btree | invoice_id | não | sim |  |
| public.order_payments | idx_payments_order | btree | order_id | não | sim |  |
| public.order_payments | order_payments_pkey | btree | id | sim | sim |  |
| public.order_pilot_approvals | idx_fk_order_pilot_approvals_created_by_fkey | btree | created_by | não | sim |  |
| public.order_pilot_approvals | idx_fk_order_pilot_approvals_parent_approval_id_fkey | btree | parent_approval_id | não | sim |  |
| public.order_pilot_approvals | idx_pilot_order | btree | order_id | não | sim |  |
| public.order_pilot_approvals | idx_pilot_status | btree | status | não | sim |  |
| public.order_pilot_approvals | order_pilot_approvals_pkey | btree | id | sim | sim |  |
| public.order_template_items | idx_template_items_template | btree | template_id, position | não | sim |  |
| public.order_template_items | order_template_items_pkey | btree | id | sim | sim |  |
| public.order_templates | idx_fk_order_templates_source_order_id_fkey | btree | source_order_id | não | sim |  |
| public.order_templates | idx_templates_favorite | btree | user_id, is_favorite | não | sim | `(is_favorite = true)` |
| public.order_templates | idx_templates_user | btree | user_id | não | sim |  |
| public.order_templates | order_templates_pkey | btree | id | sim | sim |  |
| public.orders | idx_orders_created_at | btree | created_at | não | sim |  |
| public.orders | idx_orders_organization_id | btree | organization_id | não | sim |  |
| public.orders | idx_orders_quote_id | btree | quote_id | não | sim |  |
| public.orders | idx_orders_seller_org | btree | seller_id, organization_id | não | sim |  |
| public.orders | idx_orders_seller_status | btree | seller_id, status | não | sim |  |
| public.orders | idx_orders_seller_status_updated_at | btree | seller_id, status, updated_at | não | sim |  |
| public.orders | idx_orders_seller_updated_at | btree | seller_id, updated_at | não | sim |  |
| public.orders | orders_order_number_uidx | btree | order_number | sim | sim |  |
| public.orders | orders_pkey | btree | id | sim | sim |  |
| public.organization_members | idx_org_members_org_id | btree | organization_id | não | sim |  |
| public.organization_members | idx_org_members_user_id | btree | user_id | não | sim |  |
| public.organization_members | organization_members_organization_id_user_id_key | btree | organization_id, user_id | sim | sim |  |
| public.organization_members | organization_members_pkey | btree | id | sim | sim |  |
| public.organizations | organizations_pkey | btree | id | sim | sim |  |
| public.organizations | organizations_slug_key | btree | slug | sim | sim |  |
| public.outbound_webhooks | idx_outbound_webhooks_active_events | gin | events | não | sim | `(active = true)` |
| public.outbound_webhooks | outbound_webhooks_pkey | btree | id | sim | sim |  |
| public.ownership_audit_reports | idx_ownership_audit_reports_generated_at | btree | generated_at | não | sim |  |
| public.ownership_audit_reports | ownership_audit_reports_pkey | btree | id | sim | sim |  |
| public.ownership_repair_logs | idx_ownership_repair_logs_created_at | btree | created_at | não | sim |  |
| public.ownership_repair_logs | idx_ownership_repair_logs_report | btree | report_id | não | sim |  |
| public.ownership_repair_logs | ownership_repair_logs_pkey | btree | id | sim | sim |  |
| public.pa_budget_allocations | idx_pba_cost_center | btree | cost_center_id | não | sim |  |
| public.pa_budget_allocations | idx_pba_order | btree | order_id | não | sim |  |
| public.pa_budget_allocations | pa_budget_allocations_order_cc_uk | btree | order_id, cost_center_id | sim | sim |  |
| public.pa_budget_allocations | pa_budget_allocations_pkey | btree | id | sim | sim |  |
| public.pa_budget_entries | idx_pbe_budget | btree | pa_budget_id, created_at | não | sim |  |
| public.pa_budget_entries | idx_pbe_competencia | btree | competencia_ano, competencia_mes | não | sim |  |
| public.pa_budget_entries | idx_pbe_estado | btree | pa_budget_id, estado | não | sim |  |
| public.pa_budget_entries | idx_pbe_order | btree | order_id | não | sim | `(order_id IS NOT NULL)` |
| public.pa_budget_entries | pa_budget_entries_pkey | btree | id | sim | sim |  |
| public.pa_budgets | idx_pa_budgets_cost_center | btree | cost_center_id | não | sim |  |
| public.pa_budgets | idx_pa_budgets_pa | btree | pa_id | não | sim |  |
| public.pa_budgets | idx_pa_budgets_period | btree | ano, mes | não | sim |  |
| public.pa_budgets | pa_budgets_pa_id_ano_mes_key | btree | pa_id, ano, mes | sim | sim |  |
| public.pa_budgets | pa_budgets_pkey | btree | id | sim | sim |  |
| public.pa_category_thresholds | idx_category_threshold_lookup | btree | pa_id, category_id | não | sim |  |
| public.pa_category_thresholds | pa_category_thresholds_pa_id_category_id_key | btree | pa_id, category_id | sim | sim |  |
| public.pa_category_thresholds | pa_category_thresholds_pkey | btree | id | sim | sim |  |
| public.pa_notification_settings | pa_notification_settings_pa_id_channel_key | btree | pa_id, channel | sim | sim |  |
| public.pa_notification_settings | pa_notification_settings_pkey | btree | id | sim | sim |  |
| public.pa_singularidades | idx_fk_pa_singularidades_central_id_fkey | btree | central_id | não | sim |  |
| public.pa_singularidades | pa_singularidades_code_key | btree | code | sim | sim |  |
| public.pa_singularidades | pa_singularidades_pkey | btree | id | sim | sim |  |
| public.password_reset_requests | idx_password_reset_requests_email_status | btree | email, status | não | sim |  |
| public.password_reset_requests | idx_password_reset_requests_requested_at | btree | requested_at | não | sim |  |
| public.password_reset_requests | idx_password_reset_requests_reviewed_by | btree | reviewed_by | não | sim |  |
| public.password_reset_requests | idx_password_reset_requests_user_id | btree | user_id | não | sim |  |
| public.password_reset_requests | password_reset_requests_pkey | btree | id | sim | sim |  |
| public.permissions | permissions_code_key | btree | code | sim | sim |  |
| public.permissions | permissions_pkey | btree | id | sim | sim |  |
| public.personalization_simulations | personalization_simulations_pkey | btree | id | sim | sim |  |
| public.personalization_simulations | personalization_simulations_seller_created_idx | btree | seller_id, created_at | não | sim |  |
| public.pontos_atendimento | idx_fk_pontos_atendimento_singular_id_fkey | btree | singular_id | não | sim |  |
| public.pontos_atendimento | pontos_atendimento_code_key | btree | code | sim | sim |  |
| public.pontos_atendimento | pontos_atendimento_pkey | btree | id | sim | sim |  |
| public.portfolio_items | portfolio_items_pkey | btree | id | sim | sim |  |
| public.postos_atendimento | idx_pas_coop | btree | cooperativa_id | não | sim |  |
| public.postos_atendimento | idx_pas_responsavel | btree | responsavel_user_id | não | sim |  |
| public.postos_atendimento | postos_atendimento_cooperativa_id_codigo_key | btree | cooperativa_id, codigo | sim | sim |  |
| public.postos_atendimento | postos_atendimento_pkey | btree | id | sim | sim |  |
| public.price_history | idx_price_history_product_date | btree | product_id, recorded_at | não | sim |  |
| public.price_history | price_history_pkey | btree | id | sim | sim |  |
| public.product_categories | idx_fk_product_categories_parent_id_fkey | btree | parent_id | não | sim |  |
| public.product_categories | idx_product_categories_deleted_at | btree | deleted_at | não | sim | `(deleted_at IS NULL)` |
| public.product_categories | product_categories_pkey | btree | id | sim | sim |  |
| public.product_categories | product_categories_slug_key | btree | slug | sim | sim |  |
| public.product_component_location_techniques | product_component_location_te_component_location_id_techniq_key | btree | component_location_id, technique_id | sim | sim |  |
| public.product_component_location_techniques | product_component_location_techniques_location_idx | btree | component_location_id | não | sim |  |
| public.product_component_location_techniques | product_component_location_techniques_one_default_idx | btree | component_location_id | sim | sim | `(is_default AND is_active)` |
| public.product_component_location_techniques | product_component_location_techniques_pkey | btree | id | sim | sim |  |
| public.product_component_locations | idx_product_comp_loc_component | btree | component_id | não | sim |  |
| public.product_component_locations | product_component_locations_component_id_location_code_key | btree | component_id, location_code | sim | sim |  |
| public.product_component_locations | product_component_locations_pkey | btree | id | sim | sim |  |
| public.product_components | product_components_pkey | btree | id | sim | sim |  |
| public.product_group_components | product_group_components_group_order_idx | btree | product_group_id, sort_order | não | sim |  |
| public.product_group_components | product_group_components_pkey | btree | id | sim | sim |  |
| public.product_group_components | product_group_components_product_group_id_component_code_key | btree | product_group_id, component_code | sim | sim |  |
| public.product_group_location_techniques | product_group_location_techni_group_location_id_technique_i_key | btree | group_location_id, technique_id | sim | sim |  |
| public.product_group_location_techniques | product_group_location_techniques_location_idx | btree | group_location_id | não | sim |  |
| public.product_group_location_techniques | product_group_location_techniques_one_default_idx | btree | group_location_id | sim | sim | `(is_default AND is_active)` |
| public.product_group_location_techniques | product_group_location_techniques_pkey | btree | id | sim | sim |  |
| public.product_group_locations | product_group_locations_component_idx | btree | group_component_id | não | sim |  |
| public.product_group_locations | product_group_locations_group_component_id_location_code_key | btree | group_component_id, location_code | sim | sim |  |
| public.product_group_locations | product_group_locations_pkey | btree | id | sim | sim |  |
| public.product_group_members | idx_product_group_members_product_group_id | btree | product_group_id | não | sim |  |
| public.product_group_members | product_group_members_pkey | btree | id | sim | sim |  |
| public.product_groups | product_groups_pkey | btree | id | sim | sim |  |
| public.product_price_freshness_overrides | idx_pfo_product_id | btree | product_id | não | sim |  |
| public.product_price_freshness_overrides | idx_product_price_freshness_overrides_updated_by | btree | updated_by | não | sim |  |
| public.product_price_freshness_overrides | product_price_freshness_overrides_pkey | btree | id | sim | sim |  |
| public.product_price_freshness_overrides | product_price_freshness_overrides_product_id_key | btree | product_id | sim | sim |  |
| public.product_sync_logs | idx_product_sync_logs_created | btree | created_at | não | sim |  |
| public.product_sync_logs | idx_product_sync_logs_source | btree | source, status | não | sim |  |
| public.product_sync_logs | product_sync_logs_pkey | btree | id | sim | sim |  |
| public.product_views | idx_product_views_created_id | btree | created_at, id | não | sim |  |
| public.product_views | idx_product_views_seller | btree | seller_id, created_at | não | sim |  |
| public.product_views | idx_product_views_seller_created_id | btree | seller_id, created_at, id | não | sim |  |
| public.product_views | product_views_pkey | btree | id | sim | sim |  |
| public.profiles | idx_profiles_cooperativa_id | btree | cooperativa_id | não | sim |  |
| public.profiles | idx_profiles_pa_id | btree | pa_id | não | sim |  |
| public.profiles | idx_profiles_user_id | btree | user_id | não | sim |  |
| public.profiles | profiles_pkey | btree | id | sim | sim |  |
| public.profiles | profiles_user_id_key | btree | user_id | sim | sim |  |
| public.public_token_failures | idx_public_token_failures_ip | btree | ip_address, created_at | não | sim |  |
| public.public_token_failures | idx_public_token_failures_resource | btree | resource_type, resource_id, created_at | não | sim |  |
| public.public_token_failures | public_token_failures_pkey | btree | id | sim | sim |  |
| public.qa_release_evidences | idx_fk_qa_release_evidences_release_id_fkey | btree | release_id | não | sim |  |
| public.qa_release_evidences | idx_fk_qa_release_evidences_uploaded_by_fkey | btree | uploaded_by | não | sim |  |
| public.qa_release_evidences | qa_release_evidences_pkey | btree | id | sim | sim |  |
| public.qa_releases | idx_fk_qa_releases_approved_by_fkey | btree | approved_by | não | sim |  |
| public.qa_releases | qa_releases_pkey | btree | id | sim | sim |  |
| public.qa_releases | qa_releases_version_tag_key | btree | version_tag | sim | sim |  |
| public.qa_rls_audits | qa_rls_audits_pkey | btree | id | sim | sim |  |
| public.qa_run_steps | idx_fk_qa_run_steps_run_id_fkey | btree | run_id | não | sim |  |
| public.qa_run_steps | qa_run_steps_pkey | btree | id | sim | sim |  |
| public.qa_runs | idx_fk_qa_runs_executed_by_fkey | btree | executed_by | não | sim |  |
| public.qa_runs | qa_runs_pkey | btree | id | sim | sim |  |
| public.query_telemetry | idx_query_telemetry_cache_hit_created | btree | cache_hit, created_at | não | sim | `(cache_hit = true)` |
| public.query_telemetry | idx_query_telemetry_created | btree | created_at | não | sim |  |
| public.query_telemetry | idx_query_telemetry_error_kind_created | btree | error_kind, created_at | não | sim | `(error_kind IS NOT NULL)` |
| public.query_telemetry | idx_query_telemetry_op_table_created | btree | operation, table_name, created_at | não | sim |  |
| public.query_telemetry | idx_query_telemetry_platform_failures | btree | created_at | não | sim | `((is_503 = true) OR (is_cold_start = true))` |
| public.query_telemetry | idx_query_telemetry_request_id | btree | request_id | não | sim |  |
| public.query_telemetry | idx_query_telemetry_retry_count_created | btree | retry_count, created_at | não | sim | `(retry_count > 0)` |
| public.query_telemetry | idx_query_telemetry_severity | btree | severity, created_at | não | sim |  |
| public.query_telemetry | query_telemetry_pkey | btree | id | sim | sim |  |
| public.quote_approval_evidence_keys | quote_approval_evidence_keys_pkey | btree | id | sim | sim |  |
| public.quote_approval_evidence_keys | quote_approval_evidence_keys_vault_secret_name_key | btree | vault_secret_name | sim | sim |  |
| public.quote_approval_evidence_keys | quote_approval_evidence_one_active_key | btree | is_active | sim | sim | `is_active` |
| public.quote_approval_tokens | idx_approval_tokens_quote | btree | quote_id | não | sim |  |
| public.quote_approval_tokens | idx_approval_tokens_token_status | btree | token, status | não | sim | `(status = 'active'::text)` |
| public.quote_approval_tokens | idx_quote_approval_tokens_quote | btree | quote_id, status | não | sim |  |
| public.quote_approval_tokens | idx_quote_approval_tokens_seller_id | btree | seller_id | não | sim |  |
| public.quote_approval_tokens | idx_quote_approval_tokens_signature_key_id | btree | signature_key_id | não | sim |  |
| public.quote_approval_tokens | quote_approval_tokens_pkey | btree | id | sim | sim |  |
| public.quote_approval_tokens | quote_approval_tokens_token_key | btree | token | sim | sim |  |
| public.quote_audit_logs | idx_fk_quote_audit_logs_quote_id_fkey | btree | quote_id | não | sim |  |
| public.quote_audit_logs | idx_fk_quote_audit_logs_user_id_fkey | btree | user_id | não | sim |  |
| public.quote_audit_logs | quote_audit_logs_pkey | btree | id | sim | sim |  |
| public.quote_comments | idx_quote_comments_created_at | btree | created_at | não | sim |  |
| public.quote_comments | idx_quote_comments_parent_id | btree | parent_id | não | sim |  |
| public.quote_comments | idx_quote_comments_quote_id | btree | quote_id | não | sim |  |
| public.quote_comments | idx_quote_comments_user_id | btree | user_id | não | sim |  |
| public.quote_comments | quote_comments_pkey | btree | id | sim | sim |  |
| public.quote_consolidations | idx_fk_quote_consolidations_consolidated_by_fkey | btree | consolidated_by | não | sim |  |
| public.quote_consolidations | idx_fk_quote_consolidations_singular_id_fkey | btree | singular_id | não | sim |  |
| public.quote_consolidations | quote_consolidations_pkey | btree | id | sim | sim |  |
| public.quote_history | idx_quote_history_quote_created | btree | quote_id, created_at | não | sim |  |
| public.quote_history | idx_quote_history_user_id | btree | user_id | não | sim |  |
| public.quote_history | quote_history_pkey | btree | id | sim | sim |  |
| public.quote_item_personalizations | idx_quote_item_personalizations_quote_item_id | btree | quote_item_id | não | sim |  |
| public.quote_item_personalizations | quote_item_personalizations_pkey | btree | id | sim | sim |  |
| public.quote_items | idx_quote_items_quote_id | btree | quote_id | não | sim |  |
| public.quote_items | quote_items_pkey | btree | id | sim | sim |  |
| public.quote_save_idempotency | idx_quote_save_idempotency_quote_id | btree | quote_id | não | sim |  |
| public.quote_save_idempotency | quote_save_idempotency_pkey | btree | actor_id, idempotency_key | sim | sim |  |
| public.quote_templates | idx_fk_quote_templates_created_by_fkey | btree | created_by | não | sim |  |
| public.quote_templates | idx_quote_templates_seller_id | btree | seller_id | não | sim |  |
| public.quote_templates | quote_templates_pkey | btree | id | sim | sim |  |
| public.quotes | idx_fk_quotes_approved_by_fkey | btree | approved_by | não | sim |  |
| public.quotes | idx_fk_quotes_consolidation_id_fkey | btree | consolidation_id | não | sim |  |
| public.quotes | idx_fk_quotes_pa_id_fkey | btree | pa_id | não | sim |  |
| public.quotes | idx_fk_quotes_singular_id_fkey | btree | singular_id | não | sim |  |
| public.quotes | idx_quotes_created_at | btree | created_at | não | sim |  |
| public.quotes | idx_quotes_one_latest_version_per_family | btree |  | sim | sim | `(is_latest_version AND (deleted_at IS NULL))` |
| public.quotes | idx_quotes_organization_id | btree | organization_id | não | sim |  |
| public.quotes | idx_quotes_parent_quote_id | btree | parent_quote_id | não | sim |  |
| public.quotes | idx_quotes_reorder_source_order | btree | reorder_source_order_id | não | sim | `(reorder_source_order_id IS NOT NULL)` |
| public.quotes | idx_quotes_reorder_source_quote | btree | reorder_source_quote_id | não | sim | `(reorder_source_quote_id IS NOT NULL)` |
| public.quotes | idx_quotes_seller_org | btree | seller_id, organization_id | não | sim |  |
| public.quotes | idx_quotes_seller_status | btree | seller_id, status | não | sim |  |
| public.quotes | idx_quotes_seller_status_updated_at | btree | seller_id, status, updated_at | não | sim |  |
| public.quotes | idx_quotes_seller_updated_at | btree | seller_id, updated_at | não | sim |  |
| public.quotes | idx_quotes_tags | gin | tags | não | sim |  |
| public.quotes | idx_quotes_version | btree | parent_quote_id, version | não | sim |  |
| public.quotes | quotes_pkey | btree | id | sim | sim |  |
| public.request_rate_limits | idx_rate_limits_blocked_until | btree | blocked_until | não | sim | `(blocked_until IS NOT NULL)` |
| public.request_rate_limits | idx_rate_limits_identifier_endpoint | btree | identifier, endpoint | sim | sim |  |
| public.request_rate_limits | idx_rate_limits_window_start | btree | window_start | não | sim |  |
| public.request_rate_limits | request_rate_limits_pkey | btree | id | sim | sim |  |
| public.rls_denial_log | idx_rls_denial_created | btree | created_at | não | sim |  |
| public.rls_denial_log | idx_rls_denial_table | btree | table_name, created_at | não | sim |  |
| public.rls_denial_log | idx_rls_denial_user | btree | user_id, created_at | não | sim |  |
| public.rls_denial_log | rls_denial_log_pkey | btree | id | sim | sim |  |
| public.role_migration_batches | idx_role_mig_batches_created_at | btree | created_at | não | sim |  |
| public.role_migration_batches | idx_role_mig_batches_initiated_by | btree | initiated_by | não | sim |  |
| public.role_migration_batches | role_migration_batches_pkey | btree | id | sim | sim |  |
| public.role_migration_items | idx_role_mig_items_batch | btree | batch_id | não | sim |  |
| public.role_migration_items | idx_role_mig_items_status | btree | status | não | sim |  |
| public.role_migration_items | idx_role_mig_items_user | btree | user_id | não | sim |  |
| public.role_migration_items | role_migration_items_pkey | btree | id | sim | sim |  |
| public.role_permissions | role_permissions_pkey | btree | id | sim | sim |  |
| public.role_permissions | role_permissions_role_permission_code_key | btree | role, permission_code | sim | sim |  |
| public.sales_goals | idx_sales_goals_user_date | btree | user_id, start_date, end_date | não | sim |  |
| public.sales_goals | sales_goals_pkey | btree | id | sim | sim |  |
| public.saved_filters | idx_saved_filters_user_context | btree | user_id, context | não | sim |  |
| public.saved_filters | saved_filters_pkey | btree | id | sim | sim |  |
| public.saved_trends_views | idx_saved_trends_views_user | btree | user_id | não | sim |  |
| public.saved_trends_views | saved_trends_views_pkey | btree | id | sim | sim |  |
| public.scheduled_exports | idx_fk_scheduled_exports_user_id_fkey | btree | user_id | não | sim |  |
| public.scheduled_exports | scheduled_exports_pkey | btree | id | sim | sim |  |
| public.scheduled_notifications | idx_fk_scheduled_notifications_user_id_fkey | btree | user_id | não | sim |  |
| public.scheduled_notifications | idx_scheduled_notif_status_time | btree | status, scheduled_for | não | sim |  |
| public.scheduled_notifications | scheduled_notifications_pkey | btree | id | sim | sim |  |
| public.scheduled_reports | idx_scheduled_reports_next_run | btree | next_run_at | não | sim | `(is_active = true)` |
| public.scheduled_reports | scheduled_reports_pkey | btree | id | sim | sim |  |
| public.search_analytics | idx_search_analytics_created_at | btree | created_at | não | sim |  |
| public.search_analytics | idx_search_analytics_created_id | btree | created_at, id | não | sim |  |
| public.search_analytics | idx_search_analytics_term_lower | btree |  | não | sim |  |
| public.search_analytics | idx_search_analytics_user_created_id | btree | user_id, created_at, id | não | sim |  |
| public.search_analytics | idx_search_analytics_zero_results | btree | created_at | não | sim | `(results_count = 0)` |
| public.search_analytics | idx_search_analytics_zero_results_created_id | btree | created_at, id | não | sim | `(results_count = 0)` |
| public.search_analytics | search_analytics_pkey | btree | id | sim | sim |  |
| public.secret_rotation_log | idx_secret_rotation_log_name_time | btree | secret_name, rotated_at | não | sim |  |
| public.secret_rotation_log | idx_secret_rotation_log_secret_action | btree | secret_name, action_type, rotated_at | não | sim |  |
| public.secret_rotation_log | secret_rotation_log_pkey | btree | id | sim | sim |  |
| public.seller_cart_items | idx_seller_cart_items_cart_id | btree | cart_id | não | sim |  |
| public.seller_cart_items | seller_cart_items_pkey | btree | id | sim | sim |  |
| public.seller_carts | idx_seller_carts_seller_id | btree | seller_id | não | sim |  |
| public.seller_carts | seller_carts_pkey | btree | id | sim | sim |  |
| public.seller_discount_limits | idx_seller_discount_limits_user_id | btree | user_id | não | sim |  |
| public.seller_discount_limits | seller_discount_limits_pkey | btree | id | sim | sim |  |
| public.seller_discount_limits | seller_discount_limits_user_id_key | btree | user_id | sim | sim |  |
| public.sensitive_access_logs | idx_fk_sensitive_access_logs_user_id_fkey | btree | user_id | não | sim |  |
| public.sensitive_access_logs | sensitive_access_logs_pkey | btree | id | sim | sim |  |
| public.sicoob_approval_delegations | idx_sicoob_approval_delegations_pa_id | btree | pa_id | não | sim |  |
| public.sicoob_approval_delegations | idx_sicoob_approval_delegations_revoked_by | btree | revoked_by | não | sim |  |
| public.sicoob_approval_delegations | sicoob_approval_delegations_delegate_active_idx | btree | delegate_id, starts_at, ends_at | não | sim | `(revoked_at IS NULL)` |
| public.sicoob_approval_delegations | sicoob_approval_delegations_delegator_idx | btree | delegator_id, created_at | não | sim |  |
| public.sicoob_approval_delegations | sicoob_approval_delegations_pkey | btree | id | sim | sim |  |
| public.sicoob_approval_delegations | sicoob_approval_delegations_scope_idx | btree | cooperative_id, pa_id | não | sim | `(revoked_at IS NULL)` |
| public.sicoob_approval_deliveries | idx_sicoob_approval_deliveries_supersedes_delivery | btree | supersedes_delivery_id | não | sim |  |
| public.sicoob_approval_deliveries | idx_sicoob_approval_delivery_expired_lease | btree | lease_expires_at | não | sim | `(state = 'sending'::text)` |
| public.sicoob_approval_deliveries | idx_sicoob_approval_delivery_pending | btree | available_at, id | não | sim | `(state = ANY (ARRAY['pending'::text, 'retry'::text]))` |
| public.sicoob_approval_deliveries | idx_sicoob_approval_delivery_request_event | btree | request_id, event_kind, channel, generation | não | sim |  |
| public.sicoob_approval_deliveries | idx_sicoob_approval_delivery_setting | btree | setting_id | não | sim |  |
| public.sicoob_approval_deliveries | sicoob_approval_deliveries_event_generation_key | btree | request_id, event_kind, channel, generation | sim | sim |  |
| public.sicoob_approval_deliveries | sicoob_approval_deliveries_pkey | btree | id | sim | sim |  |
| public.sicoob_approval_delivery_archive | sicoob_approval_delivery_archive_delivery_id_key | btree | delivery_id | sim | sim |  |
| public.sicoob_approval_delivery_archive | sicoob_approval_delivery_archive_pkey | btree | archive_id | sim | sim |  |
| public.sicoob_approval_policies | idx_sicoob_approval_policies_lookup | btree | cooperative_id, is_active, effective_from | não | sim |  |
| public.sicoob_approval_policies | sicoob_approval_policies_pkey | btree | id | sim | sim |  |
| public.sicoob_approval_policies | ux_sicoob_approval_policy_version | btree | cooperative_id, version | sim | sim |  |
| public.sicoob_approval_requests | idx_fk_sicoob_approval_requests_approver_id_fkey | btree | approver_id | não | sim |  |
| public.sicoob_approval_requests | idx_fk_sicoob_approval_requests_requester_id_fkey | btree | requester_id | não | sim |  |
| public.sicoob_approval_requests | idx_sicoob_approval_requests_delegation | btree | approval_delegation_id | não | sim |  |
| public.sicoob_approval_requests | idx_sicoob_approval_requests_delegator | btree | authority_delegator_id | não | sim |  |
| public.sicoob_approval_requests | sicoob_approval_requests_pkey | btree | id | sim | sim |  |
| public.sicoob_approval_requests | ux_sicoob_approval_one_pending_per_order | btree | order_id | sim | sim | `(status = 'pending'::text)` |
| public.sicoob_approval_worker_dispatches | idx_sicoob_approval_worker_dispatch_state | btree | state, requested_at | não | sim |  |
| public.sicoob_approval_worker_dispatches | idx_sicoob_approval_worker_queued_request | btree | request_id, requested_at | não | sim | `(state = 'queued'::text)` |
| public.sicoob_approval_worker_dispatches | sicoob_approval_worker_dispatches_pkey | btree | id | sim | sim |  |
| public.sicoob_centrais | sicoob_centrais_code_key | btree | code | sim | sim |  |
| public.sicoob_centrais | sicoob_centrais_pkey | btree | id | sim | sim |  |
| public.sicoob_delivery_allocations | idx_delivery_allocations_destination | btree | destination_id | não | sim |  |
| public.sicoob_delivery_allocations | idx_sicoob_delivery_allocations_order_item_id | btree | order_item_id | não | sim |  |
| public.sicoob_delivery_allocations | sicoob_delivery_allocations_destination_id_order_item_id_key | btree | destination_id, order_item_id | sim | sim |  |
| public.sicoob_delivery_allocations | sicoob_delivery_allocations_pkey | btree | id | sim | sim |  |
| public.sicoob_delivery_destinations | idx_delivery_destinations_group | btree | consolidation_id | não | sim |  |
| public.sicoob_delivery_destinations | idx_sicoob_delivery_destinations_pa_id | btree | pa_id | não | sim |  |
| public.sicoob_delivery_destinations | sicoob_delivery_destinations_consolidation_id_pa_id_key | btree | consolidation_id, pa_id | sim | sim |  |
| public.sicoob_delivery_destinations | sicoob_delivery_destinations_pkey | btree | id | sim | sim |  |
| public.sicoob_delivery_receipt_events | idx_delivery_receipts_allocation | btree | allocation_id, received_at | não | sim |  |
| public.sicoob_delivery_receipt_events | idx_sicoob_delivery_receipts_received_by | btree | received_by | não | sim |  |
| public.sicoob_delivery_receipt_events | sicoob_delivery_receipt_events_pkey | btree | id | sim | sim |  |
| public.sicoob_delivery_receipt_events | ux_sicoob_delivery_receipt_idempotency | btree | idempotency_key | sim | sim |  |
| public.sicoob_document_registry | idx_sicoob_document_registry_order_id | btree | order_id | não | sim |  |
| public.sicoob_document_registry | idx_sicoob_document_registry_uploaded_by | btree | uploaded_by | não | sim |  |
| public.sicoob_document_registry | sicoob_document_registry_final_path_key | btree | final_path | sim | sim |  |
| public.sicoob_document_registry | sicoob_document_registry_pkey | btree | id | sim | sim |  |
| public.sicoob_document_registry | sicoob_document_registry_quarantine_path_key | btree | quarantine_path | sim | sim |  |
| public.sicoob_invitation_events | idx_sicoob_invitation_events_actor_id | btree | actor_id | não | sim |  |
| public.sicoob_invitation_events | idx_sicoob_invitation_events_cooperative_id | btree | cooperative_id | não | sim |  |
| public.sicoob_invitation_events | idx_sicoob_invitation_events_invitation_id | btree | invitation_id | não | sim |  |
| public.sicoob_invitation_events | idx_sicoob_invitation_events_target_user_id | btree | target_user_id | não | sim |  |
| public.sicoob_invitation_events | sicoob_invitation_events_pkey | btree | id | sim | sim |  |
| public.sicoob_invitations | idx_sicoob_invitations_accepted_by | btree | accepted_by | não | sim |  |
| public.sicoob_invitations | idx_sicoob_invitations_access_revoked_by | btree | access_revoked_by | não | sim |  |
| public.sicoob_invitations | idx_sicoob_invitations_cooperative_id | btree | cooperative_id | não | sim |  |
| public.sicoob_invitations | idx_sicoob_invitations_invited_by | btree | invited_by | não | sim |  |
| public.sicoob_invitations | idx_sicoob_invitations_pa_id | btree | pa_id | não | sim |  |
| public.sicoob_invitations | idx_sicoob_invitations_pending_expiry | btree | expires_at | não | sim | `(status = 'pending'::text)` |
| public.sicoob_invitations | idx_sicoob_invitations_revoked_by | btree | revoked_by | não | sim |  |
| public.sicoob_invitations | idx_sicoob_invitations_superseded_by | btree | superseded_by | não | sim |  |
| public.sicoob_invitations | sicoob_invitations_invited_by_idempotency_key_key | btree | invited_by, idempotency_key | sim | sim |  |
| public.sicoob_invitations | sicoob_invitations_one_pending_scope | btree | email, cooperative_id, role | sim | sim | `(status = 'pending'::text)` |
| public.sicoob_invitations | sicoob_invitations_pkey | btree | id | sim | sim |  |
| public.sicoob_invitations | sicoob_invitations_token_hash_key | btree | token_hash | sim | sim |  |
| public.sicoob_kit_quote_requests | idx_fk_sicoob_kit_quote_requests_quote_id_fkey | btree | quote_id | não | sim |  |
| public.sicoob_kit_quote_requests | sicoob_kit_quote_requests_actor_id_idempotency_key_key | btree | actor_id, idempotency_key | sim | sim |  |
| public.sicoob_kit_quote_requests | sicoob_kit_quote_requests_pkey | btree | id | sim | sim |  |
| public.sicoob_manager_audit | idx_fk_sicoob_manager_audit_manager_id_fkey | btree | manager_id | não | sim |  |
| public.sicoob_manager_audit | sicoob_manager_audit_pkey | btree | id | sim | sim |  |
| public.sicoob_order_artwork_versions | idx_fk_sicoob_order_artwork_versions_created_by_fkey | btree | created_by | não | sim |  |
| public.sicoob_order_artwork_versions | idx_fk_sicoob_order_artwork_versions_decided_by_fkey | btree | decided_by | não | sim |  |
| public.sicoob_order_artwork_versions | idx_sicoob_order_artwork_order | btree | order_id, version | não | sim |  |
| public.sicoob_order_artwork_versions | sicoob_order_artwork_versions_order_id_version_key | btree | order_id, version | sim | sim |  |
| public.sicoob_order_artwork_versions | sicoob_order_artwork_versions_pkey | btree | id | sim | sim |  |
| public.sicoob_order_artwork_versions | ux_sicoob_order_artwork_latest | btree | order_id | sim | sim | `is_latest` |
| public.sicoob_order_artwork_versions | ux_sicoob_order_artwork_path | btree | order_id, file_path | sim | sim |  |
| public.sicoob_order_history | idx_fk_sicoob_order_history_user_id_fkey | btree | user_id | não | sim |  |
| public.sicoob_order_history | idx_sicoob_order_history_created_at | btree | created_at | não | sim |  |
| public.sicoob_order_history | idx_sicoob_order_history_order_id | btree | order_id | não | sim |  |
| public.sicoob_order_history | sicoob_order_history_pkey | btree | id | sim | sim |  |
| public.sicoob_order_invoices | idx_fk_sicoob_order_invoices_created_by_fkey | btree | created_by | não | sim |  |
| public.sicoob_order_invoices | idx_sicoob_order_invoices_order | btree | order_id, created_at | não | sim |  |
| public.sicoob_order_invoices | sicoob_order_invoices_document_id_key | btree | document_id | sim | sim |  |
| public.sicoob_order_invoices | sicoob_order_invoices_order_id_invoice_number_file_type_key | btree | order_id, invoice_number, file_type | sim | sim |  |
| public.sicoob_order_invoices | sicoob_order_invoices_pkey | btree | id | sim | sim |  |
| public.sicoob_order_invoices | ux_sicoob_order_invoice_file_path | btree | file_path | sim | sim |  |
| public.sicoob_order_item_logs | idx_fk_sicoob_order_item_logs_user_id_fkey | btree | user_id | não | sim |  |
| public.sicoob_order_item_logs | idx_sicoob_order_item_logs_item_id | btree | item_id | não | sim |  |
| public.sicoob_order_item_logs | idx_sicoob_order_item_logs_order_id | btree | order_id | não | sim |  |
| public.sicoob_order_item_logs | sicoob_order_item_logs_pkey | btree | id | sim | sim |  |
| public.sicoob_order_items | idx_sicoob_order_items_order_id | btree | order_id | não | sim |  |
| public.sicoob_order_items | sicoob_order_items_pkey | btree | id | sim | sim |  |
| public.sicoob_order_payments | idx_fk_sicoob_order_payments_created_by_fkey | btree | created_by | não | sim |  |
| public.sicoob_order_payments | idx_fk_sicoob_order_payments_invoice_id_fkey | btree | invoice_id | não | sim |  |
| public.sicoob_order_payments | idx_fk_sicoob_order_payments_refunded_by_fkey | btree | refunded_by | não | sim |  |
| public.sicoob_order_payments | idx_fk_sicoob_order_payments_updated_by_fkey | btree | updated_by | não | sim |  |
| public.sicoob_order_payments | idx_sicoob_order_payments_order | btree | order_id, due_date | não | sim |  |
| public.sicoob_order_payments | sicoob_order_payments_order_id_installment_number_key | btree | order_id, installment_number | sim | sim |  |
| public.sicoob_order_payments | sicoob_order_payments_pkey | btree | id | sim | sim |  |
| public.sicoob_order_payments | ux_sicoob_order_payment_external_reference | btree | order_id, external_reference | sim | sim | `(external_reference IS NOT NULL)` |
| public.sicoob_order_shipments | idx_fk_sicoob_order_shipments_created_by_fkey | btree | created_by | não | sim |  |
| public.sicoob_order_shipments | idx_sicoob_order_shipments_order_id | btree | order_id | não | sim |  |
| public.sicoob_order_shipments | idx_sicoob_order_shipments_tracking_code | btree | tracking_code | não | sim | `(tracking_code IS NOT NULL)` |
| public.sicoob_order_shipments | idx_sicoob_shipments_photo_uploaded_by | btree | delivery_photo_uploaded_by | não | sim |  |
| public.sicoob_order_shipments | sicoob_order_shipments_delivery_document_id_key | btree | delivery_document_id | sim | sim |  |
| public.sicoob_order_shipments | sicoob_order_shipments_order_id_key | btree | order_id | sim | sim |  |
| public.sicoob_order_shipments | sicoob_order_shipments_pkey | btree | id | sim | sim |  |
| public.sicoob_order_shipments | ux_sicoob_order_shipment_delivery_photo | btree | delivery_photo_path | sim | sim | `(delivery_photo_path IS NOT NULL)` |
| public.sicoob_orders | idx_fk_sicoob_orders_approved_by_fkey | btree | approved_by | não | sim |  |
| public.sicoob_orders | idx_sicoob_orders_cooperative_id | btree | cooperative_id | não | sim |  |
| public.sicoob_orders | idx_sicoob_orders_created_by | btree | created_by | não | sim |  |
| public.sicoob_orders | idx_sicoob_orders_id_text | btree | id | não | sim |  |
| public.sicoob_orders | idx_sicoob_orders_pa_id | btree | pa_id | não | sim |  |
| public.sicoob_orders | idx_sicoob_orders_status | btree | status | não | sim |  |
| public.sicoob_orders | sicoob_orders_pkey | btree | id | sim | sim |  |
| public.sicoob_orders | ux_sicoob_orders_one_consolidation | btree | consolidation_id, id | sim | sim | `(consolidation_id IS NOT NULL)` |
| public.sicoob_orders | ux_sicoob_orders_order_number | btree | order_number | sim | sim |  |
| public.sicoob_orders | ux_sicoob_orders_source_quote | btree | source_quote_id | sim | sim | `(source_quote_id IS NOT NULL)` |
| public.sicoob_performance_reports | sicoob_performance_reports_pkey | btree | id | sim | sim |  |
| public.sicoob_quote_reorder_requests | idx_sicoob_quote_reorder_requests_source | btree | source_quote_id, created_at | não | sim |  |
| public.sicoob_quote_reorder_requests | idx_sicoob_reorder_requests_quote_id | btree | quote_id | não | sim |  |
| public.sicoob_quote_reorder_requests | sicoob_quote_reorder_requests_actor_id_source_quote_id_idem_key | btree | actor_id, source_quote_id, idempotency_key | sim | sim |  |
| public.sicoob_quote_reorder_requests | sicoob_quote_reorder_requests_pkey | btree | id | sim | sim |  |
| public.sicoob_reorder_requests | idx_fk_sicoob_reorder_requests_quote_id_fkey | btree | quote_id | não | sim |  |
| public.sicoob_reorder_requests | idx_sicoob_reorder_requests_source | btree | source_order_id, created_at | não | sim |  |
| public.sicoob_reorder_requests | sicoob_reorder_requests_actor_id_source_order_id_idempotenc_key | btree | actor_id, source_order_id, idempotency_key | sim | sim |  |
| public.sicoob_reorder_requests | sicoob_reorder_requests_pkey | btree | id | sim | sim |  |
| public.sicoob_rls_audit_logs | sicoob_rls_audit_logs_pkey | btree | id | sim | sim |  |
| public.sicoob_temas | sicoob_temas_pkey | btree | id | sim | sim |  |
| public.simulator_wizard_drafts | simulator_wizard_drafts_pkey | btree | id | sim | sim |  |
| public.singulares | singulares_code_key | btree | code | sim | sim |  |
| public.singulares | singulares_pkey | btree | id | sim | sim |  |
| public.step_up_audit_log | idx_step_up_audit_action | btree | action, created_at | não | sim |  |
| public.step_up_audit_log | idx_step_up_audit_user | btree | user_id, created_at | não | sim |  |
| public.step_up_audit_log | step_up_audit_log_pkey | btree | id | sim | sim |  |
| public.step_up_challenges | idx_step_up_challenges_expires | btree | expires_at | não | sim | `(consumed = false)` |
| public.step_up_challenges | idx_step_up_challenges_user | btree | user_id, created_at | não | sim |  |
| public.step_up_challenges | step_up_challenges_pkey | btree | id | sim | sim |  |
| public.step_up_tokens | idx_step_up_tokens_challenge_id | btree | challenge_id | não | sim |  |
| public.step_up_tokens | idx_step_up_tokens_hash | btree | token_hash | não | sim | `(consumed = false)` |
| public.step_up_tokens | idx_step_up_tokens_user | btree | user_id, created_at | não | sim |  |
| public.step_up_tokens | step_up_tokens_pkey | btree | id | sim | sim |  |
| public.step_up_tokens | step_up_tokens_token_hash_key | btree | token_hash | sim | sim |  |
| public.system_settings | system_settings_pkey | btree | key | sim | sim |  |
| public.telemetry_events | idx_fk_telemetry_events_user_id_fkey | btree | user_id | não | sim |  |
| public.telemetry_events | telemetry_events_pkey | btree | id | sim | sim |  |
| public.telemetry_logs | idx_telemetry_logs_created_at | btree | created_at | não | sim |  |
| public.telemetry_logs | idx_telemetry_logs_user_id | btree | user_id | não | sim |  |
| public.telemetry_logs | telemetry_logs_pkey | btree | id | sim | sim |  |
| public.test_suites_runs | test_suites_runs_pkey | btree | id | sim | sim |  |
| public.user_comparisons | idx_user_comparisons_public | btree | is_public, share_expires_at | não | sim | `(is_public = true)` |
| public.user_comparisons | idx_user_comparisons_token | btree | share_token | não | sim | `(share_token IS NOT NULL)` |
| public.user_comparisons | idx_user_comparisons_user | btree | user_id, updated_at | não | sim |  |
| public.user_comparisons | user_comparisons_pkey | btree | id | sim | sim |  |
| public.user_comparisons | user_comparisons_share_token_key | btree | share_token | sim | sim |  |
| public.user_known_devices | user_known_devices_pkey | btree | id | sim | sim |  |
| public.user_known_devices | user_known_devices_user_id_device_fingerprint_key | btree | user_id, device_fingerprint | sim | sim |  |
| public.user_onboarding | user_onboarding_pkey | btree | id | sim | sim |  |
| public.user_onboarding | user_onboarding_user_id_key | btree | user_id | sim | sim |  |
| public.user_preferences | user_preferences_pkey | btree | id | sim | sim |  |
| public.user_preferences | user_preferences_user_id_key | btree | user_id | sim | sim |  |
| public.user_roles | idx_user_roles_user_id | btree | user_id | não | sim |  |
| public.user_roles | user_roles_pkey | btree | id | sim | sim |  |
| public.user_roles | user_roles_user_id_role_key | btree | user_id, role | sim | sim |  |
| public.video_variant_links | video_variant_links_pkey | btree | id | sim | sim |  |
| public.video_variant_links | video_variant_links_video_id_variant_id_key | btree | video_id, variant_id | sim | sim |  |
| public.voice_command_logs | idx_voice_command_logs_user_created | btree | user_id, created_at | não | sim |  |
| public.voice_command_logs | voice_command_logs_pkey | btree | id | sim | sim |  |
| public.webhook_configs | idx_fk_webhook_configs_user_id_fkey | btree | user_id | não | sim |  |
| public.webhook_configs | webhook_configs_pkey | btree | id | sim | sim |  |
| public.webhook_deliveries | idx_webhook_deliveries_event_time | btree | event, delivered_at | não | sim |  |
| public.webhook_deliveries | idx_webhook_deliveries_webhook_time | btree | webhook_id, delivered_at | não | sim |  |
| public.webhook_deliveries | webhook_deliveries_pkey | btree | id | sim | sim |  |
| public.webhook_delivery_metrics | idx_webhook_metrics_failures | btree | occurred_at | não | sim | `(success = false)` |
| public.webhook_delivery_metrics | idx_webhook_metrics_occurred_at | btree | occurred_at | não | sim |  |
| public.webhook_delivery_metrics | idx_webhook_metrics_request_id | btree | request_id | não | sim |  |
| public.webhook_delivery_metrics | idx_webhook_metrics_source_status | btree | source, http_status, occurred_at | não | sim |  |
| public.webhook_delivery_metrics | webhook_delivery_metrics_pkey | btree | id | sim | sim |  |
| public.webhook_logs | idx_webhook_logs_webhook | btree | webhook_id, created_at | não | sim |  |
| public.webhook_logs | webhook_logs_pkey | btree | id | sim | sim |  |
| public.webhook_retry_claims | webhook_retry_claims_attempt_unique_idx | btree | webhook_id, event, attempt | sim | sim |  |
| public.webhook_retry_claims | webhook_retry_claims_claimed_at_idx | btree | claimed_at | não | sim |  |
| public.webhook_retry_claims | webhook_retry_claims_pkey | btree | id | sim | sim |  |
| public.workspace_notifications | idx_notifications_created | btree | created_at | não | sim |  |
| public.workspace_notifications | idx_workspace_notifications_user_unread | btree | user_id, is_read, created_at | não | sim |  |
| public.workspace_notifications | workspace_notifications_pkey | btree | id | sim | sim |  |
