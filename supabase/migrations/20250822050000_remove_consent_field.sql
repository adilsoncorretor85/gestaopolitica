/*
  # Remove consent field from people table
  
  This migration removes the 'consent' field from the people table
  as it's no longer needed in the system.
  
  The field was used for data usage consent but has been removed
  from the application requirements.
*/

-- Remove the consent column if it exists
ALTER TABLE IF EXISTS public.people DROP COLUMN IF EXISTS consent;

-- Log the removal for audit purposes
DO $$
BEGIN
    RAISE NOTICE 'Field consent has been removed from people table successfully';
END $$;

