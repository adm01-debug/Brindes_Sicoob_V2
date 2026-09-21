-- Migration: Audit Log Universal
-- Data: 2025-12-27

-- 1. Tabela universal de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- 2. Função genérica de auditoria
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[];
  user_id_val UUID;
BEGIN
  -- Pegar user_id atual
  user_id_val := auth.uid();

  -- Preparar dados antigos e novos
  IF TG_OP = 'DELETE' THEN
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
    
    -- Detectar campos alterados
    SELECT array_agg(key)
    INTO changed_fields
    FROM jsonb_each(old_data)
    WHERE old_data->key IS DISTINCT FROM new_data->key;
  ELSE -- INSERT
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  END IF;

  -- Inserir no audit log
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    changed_fields,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    old_data,
    new_data,
    changed_fields,
    user_id_val
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aplicar triggers em tabelas críticas

-- Quotes
DROP TRIGGER IF EXISTS audit_quotes ON quotes;
CREATE TRIGGER audit_quotes
  AFTER INSERT OR UPDATE OR DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Orders
DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Products
DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Bitrix Clients
DROP TRIGGER IF EXISTS audit_bitrix_clients ON bitrix_clients;
CREATE TRIGGER audit_bitrix_clients
  AFTER INSERT OR UPDATE OR DELETE ON bitrix_clients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Sales Goals
DROP TRIGGER IF EXISTS audit_sales_goals ON sales_goals;
CREATE TRIGGER audit_sales_goals
  AFTER INSERT OR UPDATE OR DELETE ON sales_goals
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- 4. RLS para audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admins podem ver tudo
CREATE POLICY "Admins can view all audit logs"
  ON audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users podem ver apenas seus próprios registros
CREATE POLICY "Users can view own audit logs"
  ON audit_log
  FOR SELECT
  USING (user_id = auth.uid());

-- 5. Função helper para buscar histórico
CREATE OR REPLACE FUNCTION get_record_history(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS TABLE (
  id UUID,
  action TEXT,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  user_email TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.old_values,
    al.new_values,
    al.changed_fields,
    au.email AS user_email,
    al.created_at
  FROM audit_log al
  LEFT JOIN auth.users au ON al.user_id = au.id
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Comentários
COMMENT ON TABLE audit_log IS 'Registro universal de auditoria para todas as tabelas críticas';
COMMENT ON COLUMN audit_log.changed_fields IS 'Array com nomes dos campos que foram alterados (apenas para UPDATE)';
