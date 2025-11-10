-- Fix auth.users columns to use NULL instead of empty strings
-- This resolves the "Database error querying schema" authentication issue

UPDATE auth.users
SET 
  email_change = NULL,
  email_change_token_new = NULL,
  confirmation_token = NULL,
  recovery_token = NULL
WHERE email IN ('staff@test.com', 'admin@test.com', 'customer@test.com')
AND (
  email_change_token_new = '' OR
  confirmation_token = '' OR
  recovery_token = ''
);