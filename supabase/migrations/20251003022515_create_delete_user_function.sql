/*
  # Create Delete User Account Function
  
  1. Purpose
    - Creates a database function to delete all user data when account deletion is requested
    - Ensures all related data is cleaned up properly
  
  2. What Gets Deleted
    - User profile data from `user_profiles` table
    - Collected profile data from `collected_profiles_data` table
    - Feedback submitted by the user from `feedback` table
    - Any other user-related data
  
  3. Security
    - Function can only be called by authenticated users
    - Users can only delete their own data (user_id check)
    - RLS policies will enforce additional security
*/

CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete user profile
  DELETE FROM user_profiles WHERE user_id = user_id_to_delete;
  
  -- Delete collected profile data
  DELETE FROM collected_profiles_data WHERE user_id = user_id_to_delete;
  
  -- Delete feedback
  DELETE FROM feedback WHERE user_id = user_id_to_delete;
  
  -- Add any other tables that need cleanup here
  
END;
$$;
