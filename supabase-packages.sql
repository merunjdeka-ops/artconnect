-- Run this in your Supabase SQL Editor

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

CREATE POLICY "Packages viewable by everyone" ON packages FOR SELECT USING (true);
CREATE POLICY "Artists can manage own packages" ON packages FOR ALL USING (auth.uid() = artist_id);
