/*
  # Fix delete_user_account function to handle missing tables

  1. Changes
    - Update delete_user_account function to safely delete from tables only if they exist
    - Use dynamic SQL to check for table existence before attempting deletion
    - Ensures the function works even when user data tables don't exist yet
  
  2. Security
    - Function remains SECURITY DEFINER for admin-level deletions
    - Only deletes data for the specified user_id
*/

CREATE OR REPLACE FUNCTION public.delete_user_account(user_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Delete from user_profiles if table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) THEN
    DELETE FROM user_profiles WHERE user_id = user_id_to_delete;
  END IF;

  -- Delete from collected_profiles_data if table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'collected_profiles_data'
  ) THEN
    DELETE FROM collected_profiles_data WHERE user_id = user_id_to_delete;
  END IF;

  -- Delete from feedback if table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'feedback'
  ) THEN
    DELETE FROM feedback WHERE user_id = user_id_to_delete;
  END IF;

  -- Function completes successfully even if no tables exist
END;
$function$;
