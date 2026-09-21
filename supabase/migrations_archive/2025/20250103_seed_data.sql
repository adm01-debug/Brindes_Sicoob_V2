-- ============================================================
-- GIFTS STORE - SEED DATA
-- Dados iniciais para o sistema
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- 1. CATEGORIAS PADRÃO
-- ============================================================

INSERT INTO public.categories (name, slug, description, display_order, is_active) VALUES
('Canecas', 'canecas', 'Canecas personalizadas de diversos materiais', 1, true),
('Camisetas', 'camisetas', 'Camisetas e vestuário personalizado', 2, true),
('Bonés', 'bones', 'Bonés e chapéus personalizados', 3, true),
('Squeezes', 'squeezes', 'Garrafas e squeezes personalizados', 4, true),
('Pen Drives', 'pen-drives', 'Pen drives e dispositivos USB personalizados', 5, true),
('Cadernos', 'cadernos', 'Cadernos e agendas personalizadas', 6, true),
('Ecobags', 'ecobags', 'Sacolas e ecobags personalizadas', 7, true),
('Mochilas', 'mochilas', 'Mochilas e bolsas personalizadas', 8, true),
('Chaveiros', 'chaveiros', 'Chaveiros personalizados diversos modelos', 9, true),
('Power Banks', 'power-banks', 'Carregadores portáteis personalizados', 10, true),
('Mousepads', 'mousepads', 'Mousepads personalizados', 11, true),
('Adesivos', 'adesivos', 'Adesivos personalizados', 12, true),
('Calendários', 'calendarios', 'Calendários personalizados', 13, true),
('Porta-retratos', 'porta-retratos', 'Porta-retratos personalizados', 14, true),
('Kits Executivos', 'kits-executivos', 'Kits corporativos personalizados', 15, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. TÉCNICAS DE PERSONALIZAÇÃO
-- ============================================================

INSERT INTO public.personalization_techniques (name, code, description, prompt_suffix, requires_color_count, base_cost_multiplier, is_active) VALUES
(
  'Bordado',
  'embroidery',
  'Técnica de bordado tradicional com fios coloridos',
  'com bordado de alta qualidade, mostrando os detalhes das linhas e textura do bordado',
  true,
  1.5,
  true
),
(
  'Silk Screen',
  'silk',
  'Serigrafia tradicional, ideal para grandes volumes',
  'com serigrafia nítida e uniforme, mostrando a qualidade da impressão',
  true,
  1.0,
  true
),
(
  'DTF (Direct to Film)',
  'dtf',
  'Impressão direta no filme, cores vibrantes',
  'com impressão DTF de alta resolução, cores vibrantes e brilhantes',
  false,
  1.3,
  true
),
(
  'Laser CO2',
  'laser_co2',
  'Gravação a laser em materiais orgânicos (madeira, couro, acrílico)',
  'com gravação a laser precisa e elegante, mostrando os detalhes gravados',
  false,
  1.4,
  true
),
(
  'Laser Fibra',
  'laser_fiber',
  'Gravação a laser em metais',
  'com gravação a laser em metal, acabamento profissional e duradouro',
  false,
  1.6,
  true
),
(
  'Sublimação',
  'sublimation',
  'Impressão por sublimação, ideal para tecidos claros e canecas',
  'com sublimação full color, cores vivas e duráveis',
  false,
  1.2,
  true
),
(
  'Tampografia',
  'pad_printing',
  'Impressão tampográfica, ideal para superfícies irregulares',
  'com tampografia de precisão, adaptada à superfície do produto',
  true,
  1.3,
  true
),
(
  'Hot Stamping',
  'hot_stamp',
  'Aplicação de folha metálica com calor',
  'com hot stamping dourado/prateado, acabamento premium e luxuoso',
  false,
  1.5,
  true
),
(
  'Adesivo',
  'sticker',
  'Aplicação de adesivo personalizado',
  'com adesivo de alta qualidade, cores nítidas e acabamento profissional',
  false,
  0.8,
  true
),
(
  'UV',
  'uv_print',
  'Impressão UV direta, cores vibrantes e resistente',
  'com impressão UV de alta definição, cores vibrantes e resistente a riscos',
  false,
  1.4,
  true
),
(
  'Transfer',
  'transfer',
  'Impressão por transfer térmico',
  'com transfer de qualidade, cores vivas e boa durabilidade',
  false,
  1.1,
  true
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. ACHIEVEMENTS (CONQUISTAS)
-- ============================================================

INSERT INTO public.achievements (code, name, description, icon, points_reward, category, is_active) VALUES
-- Vendas
('first_sale', 'Primeira Venda', 'Fechou sua primeira venda!', '🎉', 100, 'sales', true),
('sales_10', '10 Vendas', 'Alcançou 10 vendas!', '🎯', 250, 'sales', true),
('sales_50', '50 Vendas', 'Alcançou 50 vendas!', '🌟', 500, 'sales', true),
('sales_100', '100 Vendas', 'Alcançou 100 vendas!', '🏆', 1000, 'sales', true),
('sales_10k', 'Venda 10k', 'Fechou uma venda acima de R$ 10.000!', '💰', 500, 'sales', true),
('sales_50k', 'Venda 50k', 'Fechou uma venda acima de R$ 50.000!', '💎', 1500, 'sales', true),

-- Orçamentos
('quotes_10', '10 Orçamentos', 'Criou 10 orçamentos!', '📄', 100, 'quotes', true),
('quotes_50', '50 Orçamentos', 'Criou 50 orçamentos!', '📊', 250, 'quotes', true),
('quotes_approved', 'Orçamento Aprovado', 'Primeiro orçamento aprovado pelo cliente!', '✅', 150, 'quotes', true),
('conversion_50', 'Conversão 50%', 'Atingiu 50% de conversão de orçamentos!', '🎯', 500, 'quotes', true),
('conversion_80', 'Conversão 80%', 'Atingiu 80% de conversão de orçamentos!', '🔥', 1000, 'quotes', true),

-- Atendimento
('happy_client', 'Cliente Feliz', 'Recebeu avaliação 5 estrelas!', '⭐', 200, 'service', true),
('quick_response', 'Resposta Rápida', 'Respondeu cliente em menos de 1 hora', '⚡', 50, 'service', true),
('streak_7', 'Sequência 7 dias', 'Trabalhou 7 dias seguidos!', '📅', 300, 'engagement', true),
('streak_30', 'Sequência 30 dias', 'Trabalhou 30 dias seguidos!', '🔥', 1000, 'engagement', true),

-- Mockups
('mockup_master', 'Mestre dos Mockups', 'Criou 50 mockups com IA!', '🎨', 300, 'mockups', true),
('creative_genius', 'Gênio Criativo', 'Mockup aprovado pelo cliente na primeira!', '✨', 400, 'mockups', true),

-- Conhecimento
('product_expert', 'Expert em Produtos', 'Cadastrou 100 produtos no sistema!', '📦', 500, 'knowledge', true),
('training_complete', 'Treinamento Completo', 'Completou todos os treinamentos!', '🎓', 1000, 'knowledge', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. REWARDS (RECOMPENSAS)
-- ============================================================

INSERT INTO public.rewards (name, description, points_cost, stock_quantity, is_active, category) VALUES
-- Pequenas recompensas
('Vale Café', 'Vale para um café no Starbucks', 500, 100, true, 'food'),
('Vale Lanche', 'Vale para lanche no McDonald''s', 800, 100, true, 'food'),
('Chocolate Premium', 'Caixa de chocolates finos', 600, 50, true, 'food'),

-- Recompensas médias
('Fone Bluetooth', 'Fone de ouvido Bluetooth JBL', 3000, 20, true, 'tech'),
('Mouse Gamer', 'Mouse Gamer RGB', 2500, 20, true, 'tech'),
('Teclado Mecânico', 'Teclado Mecânico RGB', 5000, 10, true, 'tech'),
('Webcam Full HD', 'Webcam Full HD para trabalho', 4000, 15, true, 'tech'),

-- Grandes recompensas
('Smartwatch', 'Smartwatch Samsung/Xiaomi', 8000, 5, true, 'tech'),
('Tablet', 'Tablet Samsung Galaxy Tab', 15000, 3, true, 'tech'),
('Notebook', 'Notebook para trabalho', 50000, 1, true, 'tech'),

-- Experiências
('Cinema', 'Ingresso de cinema + pipoca', 1500, 50, true, 'experience'),
('Jantar', 'Vale jantar para 2 pessoas', 5000, 10, true, 'experience'),
('Spa', 'Dia de spa relaxante', 10000, 5, true, 'experience'),

-- Benefícios
('Dia de Folga', 'Um dia de folga extra', 7500, 20, true, 'benefit'),
('Home Office', '3 dias de home office', 5000, 30, true, 'benefit'),
('Estacionamento', '1 mês de estacionamento grátis', 6000, 10, true, 'benefit')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. FEATURE FLAGS
-- ============================================================

INSERT INTO public.feature_flags (flag_name, is_enabled, description, rollout_percentage) VALUES
('enable_ai_mockups', true, 'Habilita geração de mockups com IA', 100),
('enable_gamification', true, 'Habilita sistema de gamificação', 100),
('enable_public_approval', true, 'Habilita aprovação pública de orçamentos', 100),
('enable_bitrix_sync', true, 'Habilita sincronização com Bitrix24', 100),
('enable_analytics', true, 'Habilita tracking de analytics', 100),
('enable_notifications', true, 'Habilita sistema de notificações', 100),
('enable_favorites', true, 'Habilita sistema de favoritos', 100),
('enable_comparisons', true, 'Habilita comparação de produtos', 100),
('maintenance_mode', false, 'Modo de manutenção', 0),
('new_product_editor', false, 'Novo editor de produtos (em desenvolvimento)', 10)
ON CONFLICT (flag_name) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  rollout_percentage = EXCLUDED.rollout_percentage;

-- ============================================================
-- 6. SYSTEM SETTINGS
-- ============================================================

INSERT INTO public.system_settings (setting_key, setting_value, description, is_public) VALUES
('company_name', '"Pink e Cerébro"', 'Nome da empresa', true),
('company_email', '"contato@pinkcerebro.com.br"', 'Email de contato', true),
('company_phone', '"+55 11 99999-9999"', 'Telefone de contato', true),

('max_quote_items', '50', 'Máximo de itens por orçamento', false),
('max_mockups_per_job', '20', 'Máximo de mockups por job', false),
('default_quote_validity_days', '30', 'Validade padrão de orçamentos (dias)', false),

('enable_email_notifications', 'true', 'Habilitar notificações por email', false),
('enable_push_notifications', 'true', 'Habilitar push notifications', false),

('points_per_sale', '100', 'Pontos por venda', false),
('points_per_quote', '10', 'Pontos por orçamento', false),
('points_per_mockup', '5', 'Pontos por mockup criado', false),

('ai_model_default', '"pro"', 'Modelo de IA padrão (standard/pro)', false),
('ai_max_retries', '3', 'Máximo de tentativas para geração de IA', false),

('currency', '"BRL"', 'Moeda padrão', true),
('timezone', '"America/Sao_Paulo"', 'Timezone padrão', false),
('language', '"pt-BR"', 'Idioma padrão', true)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value;

-- ============================================================
-- 7. NOTIFICATION TEMPLATES
-- ============================================================

-- Nota: Esta tabela será criada se não existir
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  body_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.notification_templates (code, name, subject, body_template, variables, is_active) VALUES
(
  'quote_approved',
  'Orçamento Aprovado',
  'Orçamento {{quote_number}} aprovado!',
  'Parabéns! O cliente aprovou o orçamento {{quote_number}} no valor de {{total}}.',
  '["quote_number", "total", "client_name"]',
  true
),
(
  'new_order',
  'Novo Pedido',
  'Novo pedido {{order_number}}',
  'Um novo pedido {{order_number}} foi criado no valor de {{total}}.',
  '["order_number", "total", "client_name"]',
  true
),
(
  'mockup_ready',
  'Mockup Pronto',
  'Seus mockups estão prontos!',
  'Os mockups do job {{job_id}} foram gerados com sucesso. Total: {{count}} mockups.',
  '["job_id", "count", "product_name"]',
  true
),
(
  'achievement_unlocked',
  'Conquista Desbloqueada',
  'Nova conquista: {{achievement_name}}!',
  'Parabéns! Você desbloqueou a conquista "{{achievement_name}}" e ganhou {{points}} pontos!',
  '["achievement_name", "points"]',
  true
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- MENSAGEM DE SUCESSO
-- ============================================================

SELECT 'Seed data inserido com sucesso! ✅' as message,
       'Categorias, técnicas, achievements, rewards, feature flags e configurações criados' as info;
