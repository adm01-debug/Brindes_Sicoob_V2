CREATE OR REPLACE FUNCTION public.generate_quote_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  year_short text;
  max_num integer;
  new_number text;
BEGIN
  year_short := to_char(now(), 'YY');
  
  SELECT COALESCE(MAX(
    CASE WHEN split_part(quote_number, '/', 1) ~ '^\d+$'
         THEN split_part(quote_number, '/', 1)::integer
         ELSE 0 END
  ), 10000)
  INTO max_num
  FROM public.quotes
  WHERE quote_number LIKE '%/' || year_short;
  
  new_number := (max_num + 1)::text || '/' || year_short;
  
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := new_number;
  END IF;
  
  RETURN NEW;
END;
$function$
