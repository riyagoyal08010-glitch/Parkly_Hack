-- Reviews table schema and supporting functions for Parkly review system
-- Run this migration against your InsForge/Supabase database

-- 1. Reviews table (if not already created)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parking_id UUID NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  host_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'flagged', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Unique constraint: one review per booking
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_booking_unique;
ALTER TABLE reviews ADD CONSTRAINT reviews_user_booking_unique UNIQUE (user_id, booking_id);

-- 3. Unique constraint: one review per user per parking (prevents spam across bookings)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_parking_unique;
ALTER TABLE reviews ADD CONSTRAINT reviews_user_parking_unique UNIQUE (user_id, parking_id);

-- 4. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_reviews_parking_id ON reviews(parking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_host_id ON reviews(host_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);

-- 5. RPC: Get average rating and review count for a parking location (visible reviews only)
CREATE OR REPLACE FUNCTION get_parking_rating(p_id UUID)
RETURNS TABLE(avg_rating NUMERIC, review_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(COALESCE(AVG(r.rating), 0)::numeric, 1) AS avg_rating,
    COUNT(r.id) AS review_count
  FROM reviews r
  WHERE r.parking_id = p_id AND r.status = 'visible';
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. RPC: Get average rating and review count for a host (visible reviews only)
CREATE OR REPLACE FUNCTION get_host_ratings(h_id UUID)
RETURNS TABLE(avg_rating NUMERIC, review_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(COALESCE(AVG(r.rating), 0)::numeric, 1) AS avg_rating,
    COUNT(r.id) AS review_count
  FROM reviews r
  WHERE r.host_id = h_id AND r.status = 'visible';
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reviews_updated_at ON reviews;
CREATE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_reviews_updated_at();

-- 8. Row Level Security (RLS) policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users can read visible reviews
DROP POLICY IF EXISTS "Anyone can read visible reviews" ON reviews;
CREATE POLICY "Anyone can read visible reviews" ON reviews
  FOR SELECT USING (status = 'visible');

-- Admins can read all reviews
DROP POLICY IF EXISTS "Admins can read all reviews" ON reviews;
CREATE POLICY "Admins can read all reviews" ON reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Hosts can read reviews for their parking spots
DROP POLICY IF EXISTS "Hosts can read own reviews" ON reviews;
CREATE POLICY "Hosts can read own reviews" ON reviews
  FOR SELECT USING (host_id = auth.uid());

-- Users can read their own reviews
DROP POLICY IF EXISTS "Users can read own reviews" ON reviews;
CREATE POLICY "Users can read own reviews" ON reviews
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert reviews for their completed bookings only
DROP POLICY IF EXISTS "Users can insert reviews for completed bookings" ON reviews;
CREATE POLICY "Users can insert reviews for completed bookings" ON reviews
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
        AND bookings.user_id = auth.uid()
        AND bookings.payment_status = 'completed'
    )
  );

-- Admins can update review status (moderation)
DROP POLICY IF EXISTS "Admins can moderate reviews" ON reviews;
CREATE POLICY "Admins can moderate reviews" ON reviews
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
