-- ============================================================
-- ARTCONNECT — COMPLETE DATABASE FIX (v2)
-- Run this entire script in Supabase SQL Editor → New Query
-- ============================================================

-- 1. ADD MISSING COLUMNS TO PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_bookings BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_reviews BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_marketing BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN DEFAULT false;

-- 2. FIX PROFILES RLS — drop every possible name variant then recreate
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile." ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Profiles viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. PACKAGES TABLE
CREATE TABLE IF NOT EXISTS packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration_hours NUMERIC,
  description TEXT,
  includes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Packages viewable by everyone" ON packages;
CREATE POLICY "Packages viewable by everyone"
  ON packages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Artists can manage own packages" ON packages;
CREATE POLICY "Artists can manage own packages"
  ON packages FOR ALL USING (auth.uid() = artist_id);

-- 4. PORTFOLIO + REVIEWS (public read)
DROP POLICY IF EXISTS "Portfolio viewable by everyone" ON portfolio_items;
CREATE POLICY "Portfolio viewable by everyone"
  ON portfolio_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Reviews viewable by everyone" ON reviews;
CREATE POLICY "Reviews viewable by everyone"
  ON reviews FOR SELECT USING (true);

SELECT 'Done!' AS status;
