-- Migration: Date-based slot availability system
-- Fixes: slots booked on one date no longer block other dates
-- Adds: slot_id on bookings, lock expiry, date-aware availability

-- 1. Add slot_id column to bookings table for date-based slot tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES parking_slots(id) ON DELETE SET NULL;

-- 2. Ensure parking_slots has locked_until for timed soft locks
ALTER TABLE parking_slots ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- 3. Index for fast slot+date lookups
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_parking_date ON bookings(parking_id, start_time);

-- 4. Updated lock_slot: now sets a 60-second expiry (locked_until)
-- Only locks if slot is available or its previous lock has expired
CREATE OR REPLACE FUNCTION lock_slot(slot_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_status TEXT;
  current_locked_by UUID;
  current_locked_until TIMESTAMPTZ;
BEGIN
  SELECT status, locked_by, locked_until
  INTO current_status, current_locked_by, current_locked_until
  FROM parking_slots WHERE id = slot_uuid FOR UPDATE;

  -- Already locked by this user
  IF current_status = 'locked' AND current_locked_by = user_uuid THEN
    UPDATE parking_slots
    SET locked_until = now() + INTERVAL '60 seconds'
    WHERE id = slot_uuid;
    RETURN TRUE;
  END IF;

  -- Available, or lock expired
  IF current_status = 'available'
     OR (current_status = 'locked' AND current_locked_until IS NOT NULL AND current_locked_until < now()) THEN
    UPDATE parking_slots
    SET status = 'locked',
        locked_by = user_uuid,
        locked_until = now() + INTERVAL '60 seconds'
    WHERE id = slot_uuid;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 5. Updated unlock_slot: clears lock fields
CREATE OR REPLACE FUNCTION unlock_slot(slot_uuid UUID, user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE parking_slots
  SET status = 'available',
      locked_by = NULL,
      locked_until = NULL
  WHERE id = slot_uuid
    AND locked_by = user_uuid
    AND status = 'locked';
END;
$$ LANGUAGE plpgsql;

-- 6. Updated book_slot: marks slot as booked and clears lock
-- Note: With date-based system, the physical slot stays 'available'
-- after booking because availability is determined per date via bookings table.
-- We clear the lock but keep the slot as 'available' for other dates.
CREATE OR REPLACE FUNCTION book_slot(slot_uuid UUID, user_uuid UUID, b_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Clear the temporary lock — slot is physically available for other dates
  UPDATE parking_slots
  SET status = 'available',
      locked_by = NULL,
      locked_until = NULL
  WHERE id = slot_uuid;

  -- Link the booking to the slot
  UPDATE bookings
  SET slot_id = slot_uuid
  WHERE id = b_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Auto-expire stale locks (run periodically or use a cron)
-- This function clears any locks that have passed their locked_until time
CREATE OR REPLACE FUNCTION expire_stale_locks()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE parking_slots
  SET status = 'available',
      locked_by = NULL,
      locked_until = NULL
  WHERE status = 'locked'
    AND locked_until IS NOT NULL
    AND locked_until < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;
