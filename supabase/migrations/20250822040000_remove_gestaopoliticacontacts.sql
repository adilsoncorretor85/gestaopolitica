/*
  # Remove incorrect table gestaopoliticacontacts
  
  This migration removes the incorrectly created table 'gestaopoliticacontacts'
  which was created by mistake and should not exist in the system.
  
  The correct table structure is already defined in other migrations:
  - 'people' table for contact management
  - 'contacts' table as alternative (if needed)
*/

-- Drop the incorrect table if it exists
DROP TABLE IF EXISTS public.gestaopoliticacontacts CASCADE;

-- Also drop any related sequences, indexes, or constraints that might exist
-- (PostgreSQL will automatically handle this with CASCADE, but being explicit)

-- Log the removal for audit purposes
DO $$
BEGIN
    RAISE NOTICE 'Table gestaopoliticacontacts has been removed successfully';
END $$;

