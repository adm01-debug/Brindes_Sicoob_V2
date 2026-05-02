-- Script de Validação de RLS Sicoob
-- Este script simula diferentes papéis e verifica se a visibilidade dos dados está correta.
-- RECOMENDAÇÃO: Execute no Editor SQL do Supabase.
-- Ele usa uma transação que é revertida ao final (ROLLBACK).

BEGIN;

-- 1. Desativar restrições temporariamente
SET CONSTRAINTS ALL DEFERRED;
ALTER TABLE public.profiles DISABLE TRIGGER ALL;

-- 2. Setup de Dados de Teste
DO $$
DECLARE
    coop1_id UUID := gen_random_uuid();
    coop2_id UUID := gen_random_uuid();
    pa1_id UUID := gen_random_uuid();
    pa2_id UUID := gen_random_uuid();
    pa3_id UUID := gen_random_uuid();
    
    admin_id UUID := gen_random_uuid();
    vendedor_pa1_id UUID := gen_random_uuid();
    gerente_pa1_id UUID := gen_random_uuid();
    gestor_coop1_id UUID := gen_random_uuid();
    vendedor_pa3_id UUID := gen_random_uuid();
BEGIN
    -- Limpar dados anteriores de teste (opcional, mas seguro em transação)
    
    -- Criar Cooperativas
    INSERT INTO public.cooperativas (id, nome, codigo) VALUES 
    (coop1_id, 'Test Coop A', '991'),
    (coop2_id, 'Test Coop B', '992');

    -- Criar PAs
    INSERT INTO public.postos_atendimento (id, cooperativa_id, nome, codigo) VALUES 
    (pa1_id, coop1_id, 'Test PA 01', '01'),
    (pa2_id, coop1_id, 'Test PA 02', '02'),
    (pa3_id, coop2_id, 'Test PA 03', '03');

    -- Criar Perfis (Mockando IDs que seriam do auth.users)
    -- NOTA: Se o RLS falhar por falta de FK em auth.users, este script deve ser rodado como superuser/service_role
    INSERT INTO public.profiles (id, user_id, role, cooperativa_id, pa_id, full_name) VALUES 
    (admin_id, admin_id, 'admin', NULL, NULL, 'Admin Test'),
    (vendedor_pa1_id, vendedor_pa1_id, 'vendedor', coop1_id, pa1_id, 'Vendedor PA1'),
    (gerente_pa1_id, gerente_pa1_id, 'gerente_pa', coop1_id, pa1_id, 'Gerente PA1'),
    (gestor_coop1_id, gestor_coop1_id, 'gestor_compras', coop1_id, NULL, 'Gestor Coop1'),
    (vendedor_pa3_id, vendedor_pa3_id, 'vendedor', coop2_id, pa3_id, 'Vendedor PA3');

    -- Criar Pedidos de Teste
    INSERT INTO public.sicoob_orders (id, cooperative_id, pa_id, status, total_amount) VALUES 
    (gen_random_uuid(), coop1_id, pa1_id, 'draft', 100), -- 1. PA1
    (gen_random_uuid(), coop1_id, pa1_id, 'draft', 150), -- 2. PA1
    (gen_random_uuid(), coop1_id, pa2_id, 'draft', 200), -- 3. PA2
    (gen_random_uuid(), coop2_id, pa3_id, 'draft', 300); -- 4. PA3 (Coop B)

    RAISE NOTICE '--- INICIANDO TESTES DE RLS ---';

    -- Teste 1: Admin (Deve ver tudo)
    EXECUTE 'SET LOCAL request.jwt.claims = ' || quote_literal(format('{"sub": "%s"}', admin_id));
    RAISE NOTICE 'Admin: % pedidos (Esperado: 4)', (SELECT count(*) FROM sicoob_orders);

    -- Teste 2: Vendedor PA1 (Deve ver apenas PA1)
    EXECUTE 'SET LOCAL request.jwt.claims = ' || quote_literal(format('{"sub": "%s"}', vendedor_pa1_id));
    RAISE NOTICE 'Vendedor PA1: % pedidos (Esperado: 2)', (SELECT count(*) FROM sicoob_orders);

    -- Teste 3: Gerente PA1 (Deve ver apenas PA1)
    EXECUTE 'SET LOCAL request.jwt.claims = ' || quote_literal(format('{"sub": "%s"}', gerente_pa1_id));
    RAISE NOTICE 'Gerente PA1: % pedidos (Esperado: 2)', (SELECT count(*) FROM sicoob_orders);

    -- Teste 4: Gestor Coop1 (Deve ver PA1 e PA2)
    EXECUTE 'SET LOCAL request.jwt.claims = ' || quote_literal(format('{"sub": "%s"}', gestor_coop1_id));
    RAISE NOTICE 'Gestor Coop1: % pedidos (Esperado: 3)', (SELECT count(*) FROM sicoob_orders);

    -- Teste 5: Vendedor PA3 (Deve ver apenas PA3)
    EXECUTE 'SET LOCAL request.jwt.claims = ' || quote_literal(format('{"sub": "%s"}', vendedor_pa3_id));
    RAISE NOTICE 'Vendedor PA3: % pedidos (Esperado: 1)', (SELECT count(*) FROM sicoob_orders);

    RAISE NOTICE '--- TESTES CONCLUÍDOS ---';
END $$;

-- O ROLLBACK garante que os dados de teste e alterações de trigger sejam revertidos
ROLLBACK;
