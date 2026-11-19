# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-19 01:13 UTC

- **colunas** adicionado (9): `private.quote_price_attestations.actor_id`, `private.quote_price_attestations.consumed_at`, `private.quote_price_attestations.consumed_transaction_id`, `private.quote_price_attestations.created_at`, `private.quote_price_attestations.expected_row_version`, `private.quote_price_attestations.expires_at`, `private.quote_price_attestations.id`, `private.quote_price_attestations.payload_hash`, `private.quote_price_attestations.quote_id`
- **constraints** adicionado (4): `private.quote_price_attestations.quote_price_attestations_consumption_check`, `private.quote_price_attestations.quote_price_attestations_payload_hash_check`, `private.quote_price_attestations.quote_price_attestations_pkey`, `private.quote_price_attestations.quote_price_attestations_version_check`
- **functions** adicionado (7): `private.quote_price_payload_hash(p_quote jsonb, p_items jsonb, p_history jsonb)`, `public.consume_quote_price_attestation(p_attestation_id uuid, p_actor_id uuid, p_quote_id uuid, p_expected_row_version integer, p_quote jsonb, p_items jsonb, p_history jsonb)`, `public.get_quote_save_idempotent_replay(p_idempotency_key uuid, p_quote jsonb, p_items jsonb, p_history jsonb)`, `public.guard_quote_price_attestation()`, `public.register_quote_price_attestation(p_actor_id uuid, p_quote_id uuid, p_expected_row_version integer, p_quote jsonb, p_items jsonb, p_history jsonb)`, `public.save_quote_atomic_attested(p_quote jsonb, p_items jsonb, p_quote_id uuid, p_expected_row_version integer, p_history jsonb)`, `public.save_quote_atomic_idempotent_attested(p_quote jsonb, p_items jsonb, p_idempotency_key uuid, p_history jsonb)`
- **functions** alterado (2): `public.save_quote_atomic(p_quote jsonb, p_items jsonb, p_quote_id uuid, p_expected_row_version integer, p_history jsonb)`, `public.save_quote_atomic_idempotent(p_quote jsonb, p_items jsonb, p_idempotency_key uuid, p_history jsonb)`
- **indexes** adicionado (2): `private.quote_price_attestations_expiration_idx`, `private.quote_price_attestations_pkey`
- **migrations** adicionado (1): `20261117092000_quote_price_attestation_gate`
- **tabelas** adicionado (1): `private.quote_price_attestations`
- **triggers** adicionado (3): `public.quote_item_personalizations.zzz_guard_quote_personalization_price_attestation`, `public.quote_items.zzz_guard_quote_item_price_attestation`, `public.quotes.zzz_guard_quote_price_attestation`

## 2026-11-18 23:15 UTC

- **functions** alterado (2): `public.save_quote_atomic(p_quote jsonb, p_items jsonb, p_quote_id uuid, p_expected_row_version integer, p_history jsonb)`, `public.save_quote_atomic_idempotent(p_quote jsonb, p_items jsonb, p_idempotency_key uuid, p_history jsonb)`

## 2026-11-18 18:19 UTC

- **functions** adicionado (1): `public.connections_auto_test_interval_from_schedule(p_schedule text)`
- **functions** alterado (1): `public.get_connections_auto_test_interval()`
- **migrations** adicionado (1): `20261118150000_fix_connections_auto_test_interval_hourly`

## 2026-11-18 16:17 UTC

- Snapshot inicial.

