-- Add pricing_type to packages
ALTER TABLE packages ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'session';

-- Add package info to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS package_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS package_price NUMERIC;

SELECT 'Done!' AS status;
