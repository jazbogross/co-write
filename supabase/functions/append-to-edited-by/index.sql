
-- This function appends a user ID to the edited_by field if not already present
CREATE OR REPLACE FUNCTION public.append_to_edited_by(content_id uuid, user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  current_edited_by jsonb;
BEGIN
  -- Get the current edited_by array
  SELECT edited_by INTO current_edited_by FROM scripts WHERE id = content_id;
  
  -- If null, initialize as empty array
  IF current_edited_by IS NULL THEN
    current_edited_by := '[]'::jsonb;
  END IF;
  
  -- Check if user_id is already in the array
  IF NOT current_edited_by @> jsonb_build_array(user_id::text)::jsonb THEN
    -- Append the user_id
    current_edited_by := current_edited_by || jsonb_build_array(user_id::text)::jsonb;
  END IF;
  
  RETURN current_edited_by;
END;
$$;
