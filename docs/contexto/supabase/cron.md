# Cron (pg_cron)

Horários em UTC. Execuções recentes em `cron-runs.md`.

| id | nome | schedule | ativo | database | usuário | comando |
|---|---|---|---|---|---|---|
| 1 | ensure-admin-audit-log-partitions | `0 3 1 * *` | sim | postgres | postgres | `SELECT public.ensure_admin_audit_log_partitions(3)` |
| 2 | cleanup-rate-limits | `0 * * * *` | sim | postgres | postgres | `SELECT public.cleanup_rate_limits()` |
| 3 | cleanup-expired-step-up | `*/15 * * * *` | sim | postgres | postgres | `SELECT public.cleanup_expired_step_up()` |
| 5 | cleanup-expired-collection-trash | `0 3 * * *` | sim | postgres | postgres | `SELECT public.cleanup_expired_collection_trash()` |
| 6 | cleanup-expired-favorite-trash | `10 3 * * *` | sim | postgres | postgres | `SELECT public.cleanup_expired_favorite_trash()` |
| 7 | cleanup-expired-public-comparisons | `20 3 * * *` | sim | postgres | postgres | `SELECT public.cleanup_expired_public_comparisons()` |
| 8 | cleanup-old-notifications | `30 3 * * *` | sim | postgres | postgres | `SELECT public.cleanup_old_notifications()` |
| 9 | cleanup-security-logs | `40 3 * * *` | sim | postgres | postgres | `SELECT public.cleanup_security_logs()` |
| 10 | cleanup-webhook-logs | `50 3 * * *` | sim | postgres | postgres | `SELECT public.cleanup_webhook_logs()` |
| 12 | cleanup-discount-test-data | `10 4 * * *` | sim | postgres | postgres | `SELECT public.cleanup_discount_test_data()` |
| 17 | sicoob-approval-outbox-worker | `* * * * *` | sim | postgres | postgres | `SELECT public.dispatch_sicoob_approval_worker();` |
| 18 | sicoob-materialize-overdue-payments | `17 * * * *` | sim | postgres | postgres | `SELECT public.mark_overdue_sicoob_payments();` |
| 19 | sicoob-approval-outbox-retention | `23 3 * * *` | sim | postgres | postgres | `SELECT public.archive_sicoob_approval_deliveries();` |
| 20 | sicoob-approval-outbox-monitor | `*/2 * * * *` | sim | postgres | postgres | `SELECT public.monitor_sicoob_approval_worker();` |
| 23 | process-export-queue | `* * * * *` | sim | postgres | postgres | `SELECT public.dispatch_sicoob_export_worker();` |
| 26 | external-db-bridge-keepalive | `*/4 * * * *` | sim | postgres | postgres | `SELECT public.dispatch_sicoob_external_db_keepalive();` |
| 27 | connections-auto-test | `*/15 * * * *` | sim | postgres | postgres | `SELECT public.dispatch_sicoob_connections_auto_test();` |
| 36 | scheduled-reports-worker | `*/10 * * * *` | sim | postgres | postgres | `SELECT public.dispatch_scheduled_reports();` |
| 37 | prune-cron-job-run-details | `17 3 * * *` | sim | postgres | postgres | `     DELETE FROM cron.job_run_details     WHERE end_time < now() - interval '7 days';   ` |
| 38 | sicoob-refresh-order-sla | `*/15 * * * *` | sim | postgres | postgres | `SELECT public.refresh_sicoob_order_sla_status();` |
| 39 | connections-health-check | `7,22,37,52 * * * *` | sim | postgres | postgres | `SELECT public.dispatch_sicoob_connections_health_check();` |
