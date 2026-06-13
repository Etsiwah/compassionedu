-- Update all pending accounts to active
-- Run this in Supabase SQL Editor

UPDATE users 
SET status = 'active', is_active = TRUE 
WHERE status = 'pending' OR is_active = FALSE;

-- Verify the update
SELECT id, name, email, role, status, is_active 
FROM users 
WHERE email = 'obbigyboss@gmail.com';
