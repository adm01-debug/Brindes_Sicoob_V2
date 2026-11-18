# public.kit_variants

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `kit_master_id` | `uuid` | não |  |  |  |
| 3 | `label` | `text` | não |  |  |  |
| 4 | `sort_order` | `integer` | não | `0` |  |  |
| 5 | `box_data` | `jsonb` | sim |  |  |  |
| 6 | `items_data` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 7 | `personalization_data` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 8 | `kit_quantity` | `integer` | não | `1` |  |  |
| 9 | `total_price` | `numeric` | não | `0` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_variants_kit_master_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_master_id) REFERENCES custom_kits(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kit_variants_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kit_variants_master | btree | kit_master_id | não | sim |  | `CREATE INDEX idx_kit_variants_master ON public.kit_variants USING btree (kit_master_id)` |
| kit_variants_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_variants_pkey ON public.kit_variants USING btree (id)` |


## Policies (RLS)

### `Owner can delete variants`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM custom_kits k   WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |

### `Owner can insert variants`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM custom_kits k   WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid() AS uid)))))` |

### `Owner can update variants`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM custom_kits k   WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |

### `Owner can view variants`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated, service_role |
| USING | `((EXISTS ( SELECT 1    FROM custom_kits k   WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = ( SELECT auth.uid() AS uid))))) OR is_admin(( SELECT auth.uid() AS uid)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_kit_variants_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
