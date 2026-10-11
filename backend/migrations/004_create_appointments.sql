-- Replace the old appointments table with the simplified booking model.
-- The new design uses provider_id (references users) so any role can be a
-- provider, and patient_id also references users directly.

DROP TABLE IF EXISTS payments      CASCADE;
DROP TABLE IF EXISTS reviews       CASCADE;
DROP TABLE IF EXISTS appointments  CASCADE;
DROP FUNCTION IF EXISTS appointment_timerange CASCADE;

CREATE TABLE appointments (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    patient_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id        UUID REFERENCES services(id) ON DELETE SET NULL,
    appointment_date  DATE NOT NULL,
    appointment_time  TIME NOT NULL,
    status            appointment_status NOT NULL DEFAULT 'pending',
    patient_notes     TEXT,
    provider_notes    TEXT,
    cancellation_reason TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_patient_not_provider CHECK (patient_id <> provider_id)
);

CREATE INDEX idx_appt_patient   ON appointments(patient_id);
CREATE INDEX idx_appt_provider  ON appointments(provider_id);
CREATE INDEX idx_appt_date      ON appointments(appointment_date);
CREATE INDEX idx_appt_status    ON appointments(status);

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Recreate reviews (simplified, linked to new appointments)
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    appointment_id  UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment_ar      TEXT,
    comment_en      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_appointment ON reviews(appointment_id);

-- Recreate payments (simplified)
CREATE TABLE payments (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    appointment_id    UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    amount            DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method    VARCHAR(50),
    payment_status    payment_status NOT NULL DEFAULT 'pending',
    transaction_ref   VARCHAR(255),
    paid_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_appointment ON payments(appointment_id);

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
