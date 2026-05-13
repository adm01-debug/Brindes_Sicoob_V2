CREATE OR REPLACE FUNCTION public.handle_row_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.row_version := OLD.row_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
