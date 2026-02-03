-- =====================================================
-- TAILOR MANAGEMENT SYSTEM - SIMPLIFIED
-- Track tailors, assignments, payments, and performance
-- Admin-only system (no contractor portal)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. EXTEND EXISTING TAILORS TABLE
-- Production system already created: id, full_name, phone, specialty, status, commission_rate
-- We're adding: email, location, specialties array, metrics, financials
-- =====================================================

-- Add new columns if they don't exist
ALTER TABLE tailors 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expert_in TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS current_load INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 0.00 CHECK (quality_score >= 0 AND quality_score <= 100),
  ADD COLUMN IF NOT EXISTS total_jobs_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_turnaround_days DECIMAL(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS on_time_delivery_rate DECIMAL(5,2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS total_earnings_minor INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ytd_earnings_minor INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_payout_minor INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.portal_users(id);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tailors_rating ON tailors(rating DESC);
CREATE INDEX IF NOT EXISTS idx_tailors_quality_score ON tailors(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_tailors_email ON tailors(email);
CREATE INDEX IF NOT EXISTS idx_tailors_location ON tailors(location);

-- =====================================================
-- 2. TAILOR ASSIGNMENTS
-- Orders assigned to tailors
-- =====================================================
CREATE TABLE tailor_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  tailor_id UUID NOT NULL REFERENCES tailors(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Item Details
  item_type TEXT NOT NULL,
  item_description TEXT,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  fabric_code TEXT,
  
  -- Pricing
  piece_rate_minor INTEGER NOT NULL CHECK (piece_rate_minor > 0),
  total_amount_minor INTEGER NOT NULL, -- piece_rate * quantity
  
  -- Timeline
  assigned_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  started_date DATE,
  completed_date DATE,
  qc_date DATE,
  paid_date DATE,
  
  -- Status
  status TEXT DEFAULT 'assigned' CHECK (status IN (
    'assigned',     -- Assigned but not started
    'in_progress',  -- Work in progress
    'completed',    -- Tailor says done
    'qc_review',    -- Under QC
    'qc_passed',    -- QC approved
    'qc_failed',    -- QC rejected
    'rework',       -- Being reworked
    'paid'          -- Payment completed
  )),
  
  -- Quality Control
  qc_passed BOOLEAN,
  qc_notes TEXT,
  qc_issues JSONB, -- [{type: string, severity: string, description: string}]
  
  -- Customer Feedback (optional)
  customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
  customer_feedback TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.portal_users(id)
);

CREATE INDEX idx_tailor_assignments_tailor_id ON tailor_assignments(tailor_id);
CREATE INDEX idx_tailor_assignments_order_id ON tailor_assignments(order_id);
CREATE INDEX idx_tailor_assignments_status ON tailor_assignments(status);
CREATE INDEX idx_tailor_assignments_due_date ON tailor_assignments(due_date);
CREATE INDEX idx_tailor_assignments_assigned_date ON tailor_assignments(assigned_date DESC);

-- =====================================================
-- 3. TAILOR PAYMENTS
-- =====================================================
CREATE TABLE tailor_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  tailor_id UUID NOT NULL REFERENCES tailors(id) ON DELETE CASCADE,
  assignment_ids UUID[], -- Which assignments this payment covers
  
  -- Payment Details
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT DEFAULT 'QAR',
  payment_method TEXT DEFAULT 'bank_transfer',
  
  -- Period
  period_start DATE,
  period_end DATE,
  payment_date DATE DEFAULT CURRENT_DATE,
  
  -- Transaction
  transaction_id TEXT,
  transaction_proof_url TEXT, -- Receipt/screenshot
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.portal_users(id)
);

CREATE INDEX idx_tailor_payments_tailor_id ON tailor_payments(tailor_id);
CREATE INDEX idx_tailor_payments_payment_date ON tailor_payments(payment_date DESC);

-- =====================================================
-- 4. TAILOR RATES
-- Piece rates per item type
-- =====================================================
CREATE TABLE tailor_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  tailor_id UUID NOT NULL REFERENCES tailors(id) ON DELETE CASCADE,
  
  -- Rate Details
  item_type TEXT NOT NULL,
  piece_rate_minor INTEGER NOT NULL CHECK (piece_rate_minor > 0),
  
  -- Validity
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- History
  previous_rate_minor INTEGER,
  change_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.portal_users(id),
  
  UNIQUE(tailor_id, item_type, effective_from)
);

CREATE INDEX idx_tailor_rates_tailor_id ON tailor_rates(tailor_id);
CREATE INDEX idx_tailor_rates_item_type ON tailor_rates(item_type);
CREATE INDEX idx_tailor_rates_is_active ON tailor_rates(is_active);

-- =====================================================
-- 5. TAILOR COMMUNICATION LOG (Optional)
-- =====================================================
CREATE TABLE tailor_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  tailor_id UUID NOT NULL REFERENCES tailors(id) ON DELETE CASCADE,
  
  -- Communication
  type TEXT CHECK (type IN ('call', 'whatsapp', 'visit', 'email', 'other')),
  subject TEXT,
  notes TEXT,
  
  -- Metadata
  communication_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.portal_users(id)
);

CREATE INDEX idx_tailor_communications_tailor_id ON tailor_communications(tailor_id);
CREATE INDEX idx_tailor_communications_date ON tailor_communications(communication_date DESC);

-- =====================================================
-- 6. FUNCTIONS & TRIGGERS
-- =====================================================

-- Update tailor current_load automatically
CREATE OR REPLACE FUNCTION update_tailor_load()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tailors
  SET 
    current_load = (
      SELECT COUNT(*)
      FROM tailor_assignments
      WHERE tailor_id = NEW.tailor_id
      AND status IN ('assigned', 'in_progress', 'completed', 'qc_review', 'rework')
    ),
    updated_at = NOW()
  WHERE id = NEW.tailor_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tailor_load
AFTER INSERT OR UPDATE OF status ON tailor_assignments
FOR EACH ROW
EXECUTE FUNCTION update_tailor_load();

-- Update pending payout when assignment QC passes
CREATE OR REPLACE FUNCTION update_tailor_pending_payout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'qc_passed' AND OLD.status != 'qc_passed' THEN
    UPDATE tailors
    SET 
      pending_payout_minor = pending_payout_minor + NEW.total_amount_minor,
      updated_at = NOW()
    WHERE id = NEW.tailor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pending_payout
AFTER UPDATE OF status ON tailor_assignments
FOR EACH ROW
EXECUTE FUNCTION update_tailor_pending_payout();

-- Update earnings when payment recorded
CREATE OR REPLACE FUNCTION update_tailor_earnings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tailors
  SET 
    total_earnings_minor = total_earnings_minor + NEW.amount_minor,
    ytd_earnings_minor = ytd_earnings_minor + NEW.amount_minor,
    pending_payout_minor = GREATEST(0, pending_payout_minor - NEW.amount_minor),
    updated_at = NOW()
  WHERE id = NEW.tailor_id;
  
  -- Mark assignments as paid
  UPDATE tailor_assignments
  SET 
    status = 'paid',
    paid_date = NEW.payment_date,
    updated_at = NOW()
  WHERE id = ANY(NEW.assignment_ids);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tailor_earnings
AFTER INSERT ON tailor_payments
FOR EACH ROW
EXECUTE FUNCTION update_tailor_earnings();

-- Auto-calculate total_amount_minor
CREATE OR REPLACE FUNCTION calculate_assignment_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount_minor := NEW.piece_rate_minor * NEW.quantity;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_assignment_total
BEFORE INSERT OR UPDATE OF piece_rate_minor, quantity ON tailor_assignments
FOR EACH ROW
EXECUTE FUNCTION calculate_assignment_total();

-- Update quality metrics when assignment completed
CREATE OR REPLACE FUNCTION update_tailor_quality_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'qc_passed' AND OLD.status != 'qc_passed' THEN
    UPDATE tailors
    SET 
      total_jobs_completed = total_jobs_completed + 1,
      quality_score = (
        SELECT AVG(CASE WHEN qc_passed THEN 100 ELSE 0 END)
        FROM tailor_assignments
        WHERE tailor_id = NEW.tailor_id
        AND qc_passed IS NOT NULL
      ),
      average_turnaround_days = (
        SELECT AVG(EXTRACT(DAY FROM (completed_date - assigned_date)))
        FROM tailor_assignments
        WHERE tailor_id = NEW.tailor_id
        AND completed_date IS NOT NULL
      ),
      on_time_delivery_rate = (
        SELECT (COUNT(CASE WHEN completed_date <= due_date THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100
        FROM tailor_assignments
        WHERE tailor_id = NEW.tailor_id
        AND completed_date IS NOT NULL
      ),
      updated_at = NOW()
    WHERE id = NEW.tailor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quality_metrics
AFTER UPDATE OF status ON tailor_assignments
FOR EACH ROW
EXECUTE FUNCTION update_tailor_quality_metrics();

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- Note: tailors table RLS already enabled in production migration
-- =====================================================

-- Enable RLS for new tables only
ALTER TABLE tailor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailor_communications ENABLE ROW LEVEL SECURITY;

-- Policies for new tables (tailors already has policies from production migration)
CREATE POLICY admin_all_assignments ON tailor_assignments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY admin_all_payments ON tailor_payments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY admin_all_rates ON tailor_rates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY admin_all_communications ON tailor_communications
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE tailors IS 'Tailors we work with - contact info and metrics';
COMMENT ON TABLE tailor_assignments IS 'Orders assigned to tailors for completion';
COMMENT ON TABLE tailor_payments IS 'Payment records to tailors';
COMMENT ON TABLE tailor_rates IS 'Piece rates per item type per tailor';
COMMENT ON TABLE tailor_communications IS 'Communication history with tailors';
