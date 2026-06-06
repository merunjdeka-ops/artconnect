-- Allow anyone (including logged-out visitors) to read artist profiles, portfolio, packages and reviews
-- Run this in Supabase SQL Editor

-- Profiles: public read for everyone
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON profiles;
CREATE POLICY "Profiles viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Portfolio: public read for everyone
DROP POLICY IF EXISTS "Portfolio viewable by everyone" ON portfolio_items;
CREATE POLICY "Portfolio viewable by everyone" ON portfolio_items
  FOR SELECT USING (true);

-- Packages: public read for everyone
DROP POLICY IF EXISTS "Packages viewable by everyone" ON packages;
CREATE POLICY "Packages viewable by everyone" ON packages
  FOR SELECT USING (true);

-- Reviews: public read for everyone
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON reviews;
CREATE POLICY "Reviews viewable by everyone" ON reviews
  FOR SELECT USING (true);
