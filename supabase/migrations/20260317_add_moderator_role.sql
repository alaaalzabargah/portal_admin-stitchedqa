-- Add 'moderator' to the user_role enum
-- Replaces the unused 'editor' role with a purpose-built review moderation role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';

-- Migrate any existing 'editor' users to 'moderator'
UPDATE portal_users SET role = 'moderator' WHERE role = 'editor';
