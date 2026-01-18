-- User Theme Preferences
-- Stores user's selected theme choice

CREATE TABLE IF NOT EXISTS user_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    theme_name TEXT NOT NULL DEFAULT 'indigo-luxury',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_themes ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own theme
CREATE POLICY "Users can manage their own theme" ON user_themes
    FOR ALL USING (auth.uid() = user_id);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_user_theme_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_themes_updated_at
    BEFORE UPDATE ON user_themes
    FOR EACH ROW
    EXECUTE FUNCTION update_user_theme_timestamp();

-- Comment
COMMENT ON TABLE user_themes IS 'Stores user theme preferences for the admin portal';
