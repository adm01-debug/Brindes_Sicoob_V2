-- Fixture mínima derivada das migrações; usada exclusivamente em PostgreSQL descartável.
CREATE TABLE public.pa_budgets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pa_id uuid NOT NULL,
 ano int NOT NULL, mes int NOT NULL,
 verba_total numeric(14,2) NOT NULL, verba_consumida numeric(14,2) NOT NULL DEFAULT 0 CHECK(verba_consumida >= 0),
 limite_alcada numeric(14,2), updated_at timestamptz DEFAULT now(), UNIQUE(pa_id, ano, mes)
);
CREATE TABLE public.sicoob_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pa_id uuid NOT NULL, cooperative_id uuid,
 status text NOT NULL DEFAULT 'draft', total_amount numeric(12,2), approved_by uuid,
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), audit_remaining_budget numeric(12,2)
);
INSERT INTO pa_budgets (pa_id,ano,mes,verba_total,limite_alcada)
VALUES ('00000000-0000-4000-8000-000000000001',extract(year from now()),extract(month from now()),1000,1000);
INSERT INTO sicoob_orders (id,pa_id,total_amount)
VALUES ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',100);
