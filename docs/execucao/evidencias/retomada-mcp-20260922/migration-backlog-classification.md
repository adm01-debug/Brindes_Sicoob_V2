# Classificação do backlog de migrations

Projeto `cfmzkthhgliqelozlmwu`; evidência de ledger de 2026-09-22.

Esta classificação é estática e conservadora. Ela organiza a revisão; não autoriza aplicar SQL nem reparar o ledger. O inventário completo, com hash e objetos por arquivo, está em [`migration-backlog-classification.json`](migration-backlog-classification.json).

## Cobertura

- Versões locais fora do ledger: **468**.
- Arquivos classificados: **468**.

| Disposição | Quantidade |
|---|---:|
| `bloqueada_por_dependencia_ausente` | 10 |
| `bloquear_aplicacao_automatica` | 51 |
| `candidata_dry_run_dependencias` | 143 |
| `possivelmente_aplicada_fora_ledger` | 72 |
| `revisao_manual_prioritaria` | 192 |

## Sinais encontrados

| Sinal | Arquivos |
|---|---:|
| `carga_de_dados` | 106 |
| `delete_dados` | 20 |
| `drop_estrutura` | 8 |
| `drop_objeto` | 19 |
| `grant_publico_ou_anon` | 3 |
| `infraestrutura_ou_storage` | 50 |
| `policy_check_true` | 30 |
| `policy_using_true` | 55 |
| `referencia_catalogo_externo` | 16 |
| `security_definer_sem_search_path_explicito` | 21 |
| `truncate` | 5 |
| `update_dados` | 36 |

## Bloqueios de aplicação automática

| Versão | Arquivo | Sinais |
|---|---|---|
| 004 | `supabase/migrations/004_notification_functions.sql` | `delete_dados`, `security_definer_sem_search_path_explicito`, `update_dados` |
| 20260102 | `supabase/migrations/20260102_20260102205635_add_soft_delete_support.sql` | `delete_dados`, `referencia_catalogo_externo`, `security_definer_sem_search_path_explicito` |
| 20260109154850 | `supabase/migrations/20260109154850_3e05ac1c-3b6e-49dc-9498-0db657489478.sql` | `carga_de_dados`, `drop_objeto` |
| 20260211135257 | `supabase/migrations/20260211135257_4a3fb7a6-12f6-4264-a3b6-8e6ce61f3196.sql` | `drop_estrutura` |
| 20260213150342 | `supabase/migrations/20260213150342_fb0c03d7-78ea-4edb-86df-03ae8602023c.sql` | `drop_estrutura` |
| 20260213150532 | `supabase/migrations/20260213150532_8a696311-255e-4f67-8d75-2b9fac8e3c8a.sql` | `drop_estrutura` |
| 20260213151101 | `supabase/migrations/20260213151101_94d6d973-d58b-4b64-8c7f-5c53d4c919aa.sql` | `drop_estrutura` |
| 20260213151403 | `supabase/migrations/20260213151403_776e2d66-2b6f-42e2-ad99-02cdd5d39567.sql` | `drop_estrutura` |
| 20260219133353 | `supabase/migrations/20260219133353_4495e564-cec8-44b1-a590-1fb18ca8c91d.sql` | `carga_de_dados`, `drop_objeto`, `update_dados` |
| 20260301143055 | `supabase/migrations/20260301143055_d99c9eef-647f-418c-968d-2145d6659af8.sql` | `drop_estrutura` |
| 20260312110229 | `supabase/migrations/20260312110229_71c6cfbf-a5f2-4dc2-9e64-e8417272a070.sql` | `delete_dados`, `update_dados` |
| 20260326160831 | `supabase/migrations/20260326160831_980fd4e0-cc49-496a-bcee-4bb009313444.sql` | `drop_objeto` |
| 20260405222509 | `supabase/migrations/20260405222509_610eaeb7-2cad-4cf8-aaf9-f4a4be5b9e55.sql` | `drop_objeto` |
| 20260411210929 | `supabase/migrations/20260411210929_9736ba78-4ddb-466f-b54d-c1c5f9d0d35f.sql` | `drop_objeto` |
| 20260416181632 | `supabase/migrations/20260416181632_ba3b340a-3933-4c6b-b896-89e351c06b32.sql` | `drop_objeto` |
| 20260416182003 | `supabase/migrations/20260416182003_e5a541e3-0aa0-4171-9b1a-67d364e3f869.sql` | `drop_objeto` |
| 20260416183342 | `supabase/migrations/20260416183342_786cf75e-5ec6-4c53-a314-9b622e8b7027.sql` | `carga_de_dados`, `delete_dados`, `policy_check_true`, `policy_using_true` |
| 20260416190742 | `supabase/migrations/20260416190742_b0ea9bfc-96ba-4eda-9dd0-22ef4fb7d1f8.sql` | `carga_de_dados`, `delete_dados`, `update_dados` |
| 20260417170948 | `supabase/migrations/20260417170948_67cd6faf-1e9e-42a0-b4a6-610f43face11.sql` | `drop_objeto` |
| 20260417171441 | `supabase/migrations/20260417171441_83bb6a48-4d55-4495-a23b-4539e6ed5707.sql` | `drop_objeto` |
| 20260417174309 | `supabase/migrations/20260417174309_81d5d176-b034-40c0-abb0-12c6ffc8f6c9.sql` | `drop_objeto` |
| 20260419024928 | `supabase/migrations/20260419024928_74dafaf0-67e3-42ef-83f5-1634b4a26328.sql` | `drop_objeto` |
| 20260419120255 | `supabase/migrations/20260419120255_fabedf0c-c79b-4592-90a7-7a95419763c1.sql` | `delete_dados`, `infraestrutura_ou_storage` |
| 20260419132122 | `supabase/migrations/20260419132122_f0173d5d-9d5c-4974-bf22-bfb2f22f7000.sql` | `delete_dados`, `infraestrutura_ou_storage` |
| 20260419185334 | `supabase/migrations/20260419185334_4b0780a3-f1c4-4f99-aaf2-5597e820d8e6.sql` | `delete_dados`, `policy_check_true` |
| 20260420123931 | `supabase/migrations/20260420123931_cfdf94d4-a89e-4f3a-bd30-2a7f43cc62df.sql` | `carga_de_dados`, `delete_dados` |
| 20260420142509 | `supabase/migrations/20260420142509_3657c725-d2da-43e4-9c02-36993a7e02f4.sql` | `carga_de_dados`, `delete_dados` |
| 20260425203103 | `supabase/migrations/20260425203103_eec2662c-3ad4-48ca-8fcb-f3cbf6be16bc.sql` | `carga_de_dados`, `delete_dados`, `infraestrutura_ou_storage`, `update_dados` |
| 20260425203612 | `supabase/migrations/20260425203612_2b1ed5ce-0518-4d5e-9041-3511b5c8ba13.sql` | `carga_de_dados`, `drop_estrutura` |
| 20260425205426 | `supabase/migrations/20260425205426_5eacced4-9096-4fa6-9962-5408341f9d11.sql` | `carga_de_dados`, `delete_dados` |
| 20260426010557 | `supabase/migrations/20260426010557_27a64407-f199-43c2-87b2-e8aeaec63f40.sql` | `carga_de_dados`, `delete_dados` |
| 20260426123111 | `supabase/migrations/20260426123111_389cc935-b988-47b5-8296-1d3a8214ece2.sql` | `carga_de_dados`, `drop_objeto`, `update_dados` |
| 20260426124745 | `supabase/migrations/20260426124745_a1de9fd9-f880-4613-8aa4-9a0684805b7b.sql` | `carga_de_dados`, `delete_dados`, `update_dados` |
| 20260426130701 | `supabase/migrations/20260426130701_c4f052a8-c32c-4b3d-8c6c-23687b247332.sql` | `drop_objeto` |
| 20260426135521 | `supabase/migrations/20260426135521_227101ce-6c81-415d-9006-5c0f8545fc74.sql` | `drop_objeto` |
| 20260426145642 | `supabase/migrations/20260426145642_948756c0-6c4a-4be4-8757-9533bd4e291a.sql` | `carga_de_dados`, `delete_dados` |
| 20260502145232 | `supabase/migrations/20260502145232_86747c54-c6cf-4246-9562-63da27801045.sql` | `drop_objeto` |
| 20260502164733 | `supabase/migrations/20260502164733_7883e946-b986-45df-b95e-5e3ca3bf5874.sql` | `delete_dados` |
| 20260502171158 | `supabase/migrations/20260502171158_7ea9ee93-2113-4790-a662-95b4275f9918.sql` | `delete_dados` |
| 20260502175334 | `supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql` | `carga_de_dados`, `drop_estrutura`, `infraestrutura_ou_storage`, `policy_using_true`, `security_definer_sem_search_path_explicito` |
| 20260503151554 | `supabase/migrations/20260503151554_c98e739b-b86f-42f6-9afa-19f4c8243298.sql` | `carga_de_dados`, `drop_objeto`, `security_definer_sem_search_path_explicito` |
| 20260503202526 | `supabase/migrations/20260503202526_04bbe53b-8c4a-47f0-b554-51879ba82595.sql` | `delete_dados`, `drop_objeto` |
| 20260504134352 | `supabase/migrations/20260504134352_30005eb7-f434-4d18-bcc4-176da441dd58.sql` | `delete_dados` |
| 20260504182837 | `supabase/migrations/20260504182837_a8f0e9b4-6252-49e6-818a-1402151ba81a.sql` | `carga_de_dados`, `drop_objeto` |
| 20260504221011 | `supabase/migrations/20260504221011_e1ce4e59-35af-4b99-8f3d-83b2f344e307.sql` | `carga_de_dados`, `delete_dados` |
| 20260509142451 | `supabase/migrations/20260509142451_8a453ac2-c5f5-40f1-8aaa-d7002a567896.sql` | `drop_objeto`, `grant_publico_ou_anon`, `infraestrutura_ou_storage` |
| 20260916140000 | `supabase/migrations/20260916140000_sicoob_history_and_view_hardening.sql` | `truncate` |
| 20260916160000 | `supabase/migrations/20260916160000_revoke_truncate_schema_wide.sql` | `truncate` |
| 20260916170000 | `supabase/migrations/20260916170000_fix_ensure_admin_audit_log_partitions_rls.sql` | `truncate` |
| 20260916180000 | `supabase/migrations/20260916180000_create_password_reset_requests.sql` | `truncate` |
| 20260916190000 | `supabase/migrations/20260916190000_create_audit_log.sql` | `truncate` |

## Dependências ausentes no inventário

| Versão | Arquivo | Relações ausentes |
|---|---|---|
| 005 | `supabase/migrations/005_push_subscriptions.sql` | `push_subscriptions` |
| 20251220141234 | `supabase/migrations/20251220141234_12ce9efd-dc19-41da-81d7-e7cd50562473.sql` | `order_history` |
| 20251227100003 | `supabase/migrations/20251227100003_push_subscriptions.sql` | `push_subscriptions` |
| 20251227100005 | `supabase/migrations/20251227100005_sync_jobs.sql` | `sync_jobs` |
| 20251227100007 | `supabase/migrations/20251227100007_user_filter_presets.sql` | `user_filter_presets` |
| 20251231124614 | `supabase/migrations/20251231124614_527fd53c-cfd4-4106-b454-fdc2ed3a708e.sql` | `user_passkeys` |
| 20260109210025 | `supabase/migrations/20260109210025_03cd391c-5ccc-4995-a775-3a820e35dddb.sql` | `roles` |
| 20260323225021 | `supabase/migrations/20260323225021_544d47f7-3124-4c33-9ea0-cc6cd8ab9652.sql` | `web_vitals` |
| 20260513184540 | `supabase/migrations/20260513184540_a02c1c29-7939-4784-9014-5e1412ce3053.sql` | `public` |
| 20260515134426 | `supabase/migrations/20260515134426_4dc3d203-992e-4952-86de-3fc18bf3b8a9.sql` | `public` |

## Limites obrigatórios

- Triagem estática não comprova equivalência entre o SQL local e o objeto remoto.
- Objeto existente pode ter sido criado fora do ledger ou por outra migration.
- Candidata a dry-run ainda exige ordem de dependências, revisão humana e rollback.
- Nenhum item desta saída autoriza aplicação ou reparo automático do ledger.
