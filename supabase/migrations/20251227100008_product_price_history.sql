CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_product ON product_price_history(product_id);
CREATE INDEX idx_price_history_date ON product_price_history(changed_at DESC);

CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO product_price_history (product_id, old_price, new_price, changed_by)
    VALUES (NEW.id, OLD.price, NEW.price, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_price ON products;
CREATE TRIGGER trigger_log_price
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();
