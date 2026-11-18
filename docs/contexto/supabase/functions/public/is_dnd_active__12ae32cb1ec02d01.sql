CREATE OR REPLACE FUNCTION public.is_dnd_active()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  dnd_enabled BOOLEAN;
  dnd_start TIME;
  dnd_end TIME;
  current_t TIME;
BEGIN
  SELECT 
    COALESCE((preferences->>'dnd_enabled')::boolean, false),
    (preferences->>'dnd_start')::time,
    (preferences->>'dnd_end')::time
  INTO dnd_enabled, dnd_start, dnd_end
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  IF NOT dnd_enabled OR dnd_start IS NULL OR dnd_end IS NULL THEN
    RETURN FALSE;
  END IF;
  
  current_t := LOCALTIME;
  
  IF dnd_start <= dnd_end THEN
    RETURN current_t BETWEEN dnd_start AND dnd_end;
  ELSE
    RETURN current_t >= dnd_start OR current_t <= dnd_end;
  END IF;
END;
$function$
