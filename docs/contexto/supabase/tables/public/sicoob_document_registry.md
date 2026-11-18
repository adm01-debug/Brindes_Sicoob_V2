# public.sicoob_document_registry

> Registro imutável da inspeção por bytes e antimalware antes da promoção ao bucket final privado.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não |  |  |  |
| 2 | `order_id` | `uuid` | não |  |  |  |
| 3 | `purpose` | `text` | não |  |  |  |
| 4 | `quarantine_path` | `text` | não |  |  |  |
| 5 | `final_path` | `text` | não |  |  |  |
| 6 | `status` | `text` | não |  |  |  |
| 7 | `uploaded_by` | `uuid` | não |  |  |  |
| 8 | `sha256` | `text` | não |  |  |  |
| 9 | `detected_mime` | `text` | não |  |  |  |
| 10 | `byte_size` | `bigint` | não |  |  |  |
| 11 | `scanner_name` | `text` | não |  |  |  |
| 12 | `scanner_version` | `text` | sim |  |  |  |
| 13 | `scan_evidence` | `jsonb` | não |  |  |  |
| 14 | `scanned_at` | `timestamp with time zone` | não | `clock_timestamp()` |  |  |
| 15 | `linked_at` | `timestamp with time zone` | sim |  |  |  |
| 16 | `linked_entity` | `text` | sim |  |  |  |
| 17 | `linked_record_id` | `uuid` | sim |  |  |  |
| 18 | `created_at` | `timestamp with time zone` | não | `clock_timestamp()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sicoob_document_registry_byte_size_check | CHECK | `CHECK (byte_size > 0 AND byte_size <= 10485760)` |  |  | sim |
| sicoob_document_registry_final_path_key | UNIQUE | `UNIQUE (final_path)` |  |  | sim |
| sicoob_document_registry_linked_entity_check | CHECK | `CHECK (linked_entity = ANY (ARRAY['invoice'::text, 'shipment'::text]))` |  |  | sim |
| sicoob_document_registry_order_id_fkey | FOREIGN KEY | `FOREIGN KEY (order_id) REFERENCES sicoob_orders(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| sicoob_document_registry_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sicoob_document_registry_purpose_check | CHECK | `CHECK (purpose = ANY (ARRAY['invoice_pdf'::text, 'invoice_xml'::text, 'delivery_proof'::text]))` |  |  | sim |
| sicoob_document_registry_quarantine_path_key | UNIQUE | `UNIQUE (quarantine_path)` |  |  | sim |
| sicoob_document_registry_scan_evidence_check | CHECK | `CHECK (jsonb_typeof(scan_evidence) = 'object'::text AND scan_evidence @> '{"clean": true}'::jsonb)` |  |  | sim |
| sicoob_document_registry_scan_evidence_sha256_match | CHECK | `CHECK (NOT jsonb_typeof(scan_evidence -> 'sha256'::text) IS DISTINCT FROM 'string'::text AND NOT lower(scan_evidence ->> 'sha256'::text) IS DISTINCT FROM sha256) NOT VALID` |  |  | não |
| sicoob_document_registry_sha256_check | CHECK | `CHECK (sha256 ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| sicoob_document_registry_status_check | CHECK | `CHECK (status = 'clean'::text)` |  |  | sim |
| sicoob_document_registry_uploaded_by_fkey | FOREIGN KEY | `FOREIGN KEY (uploaded_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sicoob_order_invoices | sicoob_order_invoices_document_id_fkey | document_id | RESTRICT |
| public.sicoob_order_shipments | sicoob_order_shipments_delivery_document_id_fkey | delivery_document_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sicoob_document_registry_order_id | btree | order_id | não | sim |  | `CREATE INDEX idx_sicoob_document_registry_order_id ON public.sicoob_document_registry USING btree (order_id)` |
| idx_sicoob_document_registry_uploaded_by | btree | uploaded_by | não | sim |  | `CREATE INDEX idx_sicoob_document_registry_uploaded_by ON public.sicoob_document_registry USING btree (uploaded_by)` |
| sicoob_document_registry_final_path_key | btree | final_path | sim | sim |  | `CREATE UNIQUE INDEX sicoob_document_registry_final_path_key ON public.sicoob_document_registry USING btree (final_path)` |
| sicoob_document_registry_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sicoob_document_registry_pkey ON public.sicoob_document_registry USING btree (id)` |
| sicoob_document_registry_quarantine_path_key | btree | quarantine_path | sim | sim |  | `CREATE UNIQUE INDEX sicoob_document_registry_quarantine_path_key ON public.sicoob_document_registry USING btree (quarantine_path)` |


## Policies (RLS)

### `sicoob_document_registry_read_in_order_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `sicoob_current_actor_can_manage_fulfillment(order_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
