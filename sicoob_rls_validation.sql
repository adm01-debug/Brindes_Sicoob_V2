-- Script de Validação de RLS Sicoob
-- Este script simula diferentes papéis e verifica se a visibilidade dos dados está correta.
-- Ele usa uma transação que é revertida ao final (ROLLBACK) para não sujar o banco.

BEGIN;

-- 1. Setup de Dados de Teste
DO $$
DECLARE
    coop1_id UUID := gen_random_uuid();
    coop2_id UUID := gen_random_uuid();
    pa1_id UUID := gen_random_uuid();
    pa2_id UUID := gen_random_uuid();
    pa3_id UUID := gen_random_uuid();
    
    admin_user_id UUID := gen_random_uuid();
    vendedor_pa1_id UUID := gen_random_uuid();
    gerente_pa1_id UUID := gen_random_uuid();
    gestor_coop1_id UUID := gen_random_uuid();
    vendedor_pa3_id UUID := gen_random_uuid(); -- PA3 pertence à Coop 2
BEGIN
    -- Criar Cooperativas
    INSERT INTO public.cooperativas (id, nome, codigo) VALUES 
    (coop1_id, 'Coop A (Test)', '001'),
    (coop2_id, 'Coop B (Test)', '002');

    -- Criar PAs
    INSERT INTO public.postos_atendimento (id, cooperativa_id, nome, codigo) VALUES 
    (pa1_id, coop1_id, 'PA 01 - Coop A', '01'),
    (pa2_id, coop1_id, 'PA 02 - Coop A', '02'),
    (pa3_id, coop2_id, 'PA 01 - Coop B', '01');

    -- Criar Perfis
    INSERT INTO public.profiles (id, user_id, role, cooperativa_id, pa_id, full_name) VALUES 
    (admin_user_id, admin_user_id, 'admin', NULL, NULL, 'Admin Test'),
    (vendedor_pa1_id, vendedor_pa1_id, 'vendedor', coop1_id, pa1_id, 'Vendedor PA1'),
    (gerente_pa1_id, gerente_pa1_id, 'gerente_pa', coop1_id, pa1_id, 'Gerente PA1'),
    (gestor_coop1_id, gestor_coop1_id, 'gestor_compras', coop1_id, NULL, 'Gestor Coop1'),
    (vendedor_pa3_id, vendedor_pa3_id, 'vendedor', coop2_id, pa3_id, 'Vendedor PA3');

    -- Criar Pedidos
    INSERT INTO public.sicoob_orders (id, cooperative_id, pa_id, status, total_amount) VALUES 
    (gen_random_uuid(), coop1_id, pa1_id, 'draft', 100), -- Pedido PA1
    (gen_random_uuid(), coop1_id, pa1_id, 'draft', 150), -- Pedido PA1
    (gen_random_uuid(), coop1_id, pa2_id, 'draft', 200), -- Pedido PA2
    (gen_random_uuid(), coop2_id, pa3_id, 'draft', 300); -- Pedido PA3 (Coop B)

    -- Função Auxiliar de Verificação
    RAISE NOTICE '--- INICIANDO VALIDAÇÃO DE RLS ---';

    -- Teste Admin
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', admin_user_id), true);
    RAISE NOTICE 'Admin: Esperado 4 pedidos, Visível %', (SELECT count(*) FROM sicoob_orders);

    -- Teste Vendedor PA1
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', vendedor_pa1_id), true);
    RAISE NOTICE 'Vendedor PA1: Esperado 2 pedidos, Visível %', (SELECT count(*) FROM sicoob_orders);

    -- Teste Gerente PA1
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', gerente_pa1_id), true);
    RAISE NOTICE 'Gerente PA1: Esperado 2 pedidos, Visível %', (SELECT count(*) FROM sicoob_orders);

    -- Teste Gestor Coop1
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', gestor_coop1_id), true);
    RAISE NOTICE 'Gestor Coop1: Esperado 3 pedidos (PA1 e PA2), Visível %', (SELECT count(*) FROM sicoob_orders);

    -- Teste Vendedor PA3
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', vendedor_pa3_id), true);
    RAISE NOTICE 'Vendedor PA3: Esperado 1 pedido, Visível %', (SELECT count(*) FROM sicoob_orders);

    RAISE NOTICE '--- VALIDAÇÃO CONCLUÍDA ---';
END $$;

ROLLBACK;
