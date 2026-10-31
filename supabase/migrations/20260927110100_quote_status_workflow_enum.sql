-- O fluxo Sicoob usa etapas adicionais à proposta comercial genérica.
-- O tipo enum é a fonte de verdade; sem esses valores, a tela aparenta aceitar
-- a transição, mas o PostgreSQL a rejeita no momento da gravação.
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'pending_singular_approval';
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'approved_singular';
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'rejected_singular';
