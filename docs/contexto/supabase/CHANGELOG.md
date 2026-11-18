# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-18 23:15 UTC

- **functions** alterado (2): `public.save_quote_atomic(p_quote jsonb, p_items jsonb, p_quote_id uuid, p_expected_row_version integer, p_history jsonb)`, `public.save_quote_atomic_idempotent(p_quote jsonb, p_items jsonb, p_idempotency_key uuid, p_history jsonb)`

## 2026-11-18 18:19 UTC

- **functions** adicionado (1): `public.connections_auto_test_interval_from_schedule(p_schedule text)`
- **functions** alterado (1): `public.get_connections_auto_test_interval()`
- **migrations** adicionado (1): `20261118150000_fix_connections_auto_test_interval_hourly`

## 2026-11-18 16:17 UTC

- Snapshot inicial.

