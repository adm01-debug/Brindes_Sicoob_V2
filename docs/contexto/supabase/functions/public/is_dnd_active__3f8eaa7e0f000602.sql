CREATE OR REPLACE FUNCTION public.is_dnd_active(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_prefs RECORD;
  v_now TIME;
  v_day INT;
BEGIN
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  IF NOT FOUND OR NOT v_prefs.dnd_enabled THEN
    RETURN false;
  END IF;
  
  v_now := CURRENT_TIME;
  v_day := EXTRACT(DOW FROM NOW());
  
  IF v_prefs.dnd_days IS NOT NULL AND v_day = ANY(v_prefs.dnd_days) THEN
    RETURN true;
  END IF;
  
  IF v_prefs.dnd_start_time IS NOT NULL AND v_prefs.dnd_end_time IS NOT NULL THEN
    IF v_prefs.dnd_start_time < v_prefs.dnd_end_time THEN
      RETURN v_now >= v_prefs.dnd_start_time OR v_now <= v_prefs.dnd_end_time;
    ELSE
      RETURN v_now >= v_prefs.dnd_start_time AND v_now <= v_prefs.dnd_end_time;
    END IF;
  END IF;
  
  RETURN false;
END;
$function$
