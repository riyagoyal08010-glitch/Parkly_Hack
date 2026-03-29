-- Migration: Add vehicle number plate to bookings
-- Enables plate detection system to verify parked vehicles against bookings

-- 1. Add number_plate column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS number_plate VARCHAR(20);

-- 2. Index for fast plate lookups (used by detection system)
CREATE INDEX IF NOT EXISTS idx_bookings_number_plate ON bookings(number_plate);

-- 3. Composite index for active booking plate lookups
CREATE INDEX IF NOT EXISTS idx_bookings_plate_status ON bookings(number_plate, status, start_time, end_time);

-- 4. RPC: Look up active bookings by number plate
-- Used by the plate detection API to verify if a vehicle has a valid booking
CREATE OR REPLACE FUNCTION get_booking_by_plate(plate TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  parking_id UUID,
  slot_id UUID,
  number_plate VARCHAR,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_amount NUMERIC,
  payment_status TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.user_id, b.parking_id, b.slot_id,
    b.number_plate, b.start_time, b.end_time,
    b.total_amount, b.payment_status, b.status, b.created_at
  FROM bookings b
  WHERE UPPER(REPLACE(b.number_plate, ' ', '')) = UPPER(REPLACE(plate, ' ', ''))
    AND b.payment_status = 'completed'
    AND b.status = 'active'
  ORDER BY b.start_time DESC;
END;
$$ LANGUAGE plpgsql;
