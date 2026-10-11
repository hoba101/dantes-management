-- =============================================================================
-- Dental Marketplace & Educational Platform — MVP Database Schema
-- Target: PostgreSQL 16+
-- Market: Egypt (Arabic / English bilingual design)
-- =============================================================================
-- Table relationships (high-level):
--
--   users (base auth, one row per person)
--     ├── profiles (shared fields: name, DOB, avatar, etc.)
--     │     ├── doctor_profiles   (license, clinic info, consultation fee)
--     │     ├── student_profiles  (university, academic year, supervisor)
--     │     └── patient_profiles  (emergency contact, medical notes)
--     │
--     ├── appointments (booking record; references one provider per role)
--     │     ├── reviews           (1:1, submitted after completion)
--     │     └── payments          (transaction log)
--     │
--     ├── services (catalog of dental procedures)
--     │     ├── doctor_service_prices  (per-doctor pricing)
--     │     └── student_service_offerings (materials-fee, supervising doctor)
--     │
--     ├── specialties
--     │     └── doctor_specialties     (M:N junction)
--     │
--     └── education_history  (degrees for both doctors & students)
--
--   clinic_locations (a doctor may have multiple branches)
--     └── availability_slots (weekly recurring time windows)
--
-- =============================================================================

-- 0. Extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";          -- for exclusion constraints

-- 1. ENUM types
-- =============================================================================
CREATE TYPE user_role          AS ENUM ('student', 'doctor', 'patient');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'in_progress',
                                        'completed', 'cancelled', 'no_show');
CREATE TYPE gender             AS ENUM ('male', 'female');
CREATE TYPE booking_type       AS ENUM ('student_free', 'doctor_paid');
CREATE TYPE day_of_week        AS ENUM ('sunday', 'monday', 'tuesday',
                                        'wednesday', 'thursday', 'friday',
                                        'saturday');
CREATE TYPE payment_status     AS ENUM ('pending', 'paid', 'refunded',
                                        'partially_refunded', 'failed');
CREATE TYPE payment_method     AS ENUM ('cash', 'card', 'wallet', 'bank_transfer');

-- 2. Helper: auto-update updated_at columns
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Users (base authentication table)
-- =============================================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_role         ON users(role) WHERE is_active = TRUE;
CREATE INDEX idx_users_email_lookup ON users(email);

-- 4. Profiles (shared fields across all roles — 1:1 with users)
-- =============================================================================
CREATE TABLE profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name_ar    VARCHAR(255) NOT NULL,
    full_name_en    VARCHAR(255) NOT NULL,
    gender          gender,
    date_of_birth   DATE,
    avatar_url      TEXT,
    phone_secondary VARCHAR(20),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_dob_past CHECK (date_of_birth IS NULL OR date_of_birth < CURRENT_DATE)
);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. Egyptian governorates reference table
-- =============================================================================
CREATE TABLE governorates (
    id      SMALLSERIAL PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL
);

-- 6. Role-specific profile extensions (all 1:1 with profiles)
-- =============================================================================

-- 6a. Doctor profiles
CREATE TABLE doctor_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    profile_id          UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    license_number      VARCHAR(100) UNIQUE NOT NULL,
    license_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    years_of_experience SMALLINT CHECK (years_of_experience >= 0),
    bio_ar              TEXT,
    bio_en              TEXT,
    consultation_fee    DECIMAL(10,2) CHECK (consultation_fee >= 0),
    is_accepting_patients BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_doctor_profiles_updated_at
    BEFORE UPDATE ON doctor_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6b. Student profiles
CREATE TABLE student_profiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    profile_id              UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    university              VARCHAR(255) NOT NULL,
    faculty                 VARCHAR(255) NOT NULL,
    academic_year           SMALLINT NOT NULL CHECK (academic_year BETWEEN 1 AND 6),
    graduation_year         SMALLINT CHECK (graduation_year >= 2025),
    student_id_number       VARCHAR(100),
    supervising_doctor_id   UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
    bio_ar                  TEXT,
    bio_en                  TEXT,
    is_available            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6c. Patient profiles
CREATE TABLE patient_profiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    profile_id              UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emergency_contact_name  VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    medical_notes           TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_patient_profiles_updated_at
    BEFORE UPDATE ON patient_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. Education history (shared between doctors and students)
-- =============================================================================
CREATE TABLE education_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    institution     VARCHAR(255) NOT NULL,
    degree          VARCHAR(255),
    field_of_study  VARCHAR(255),
    start_year      SMALLINT,
    end_year        SMALLINT,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_year_range CHECK (end_year IS NULL OR start_year IS NULL OR end_year >= start_year)
);

CREATE INDEX idx_education_profile ON education_history(profile_id);

-- 8. Dental specialties catalog
-- =============================================================================
CREATE TABLE specialties (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name_ar     VARCHAR(255) NOT NULL,
    name_en     VARCHAR(255) NOT NULL,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- 8a. Doctor ↔ Specialties (M:N)
CREATE TABLE doctor_specialties (
    doctor_id    UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,

    PRIMARY KEY (doctor_id, specialty_id)
);

CREATE INDEX idx_doc_specialties_specialty ON doctor_specialties(specialty_id);

-- 9. Dental services / treatments catalog
-- =============================================================================
CREATE TABLE services (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name_ar                 VARCHAR(255) NOT NULL,
    name_en                 VARCHAR(255) NOT NULL,
    description_ar          TEXT,
    description_en          TEXT,
    category                VARCHAR(100) NOT NULL,
    estimated_duration_mins SMALLINT CHECK (estimated_duration_mins > 0),
    requires_supervision    BOOLEAN NOT NULL DEFAULT FALSE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_category ON services(category);

-- 9a. Doctor service pricing (per-doctor, variable price)
-- =============================================================================
CREATE TABLE doctor_service_prices (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    doctor_id     UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    price         DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    is_available  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (doctor_id, service_id)
);

CREATE INDEX idx_dsp_doctor  ON doctor_service_prices(doctor_id);
CREATE INDEX idx_dsp_service ON doctor_service_prices(service_id);

CREATE TRIGGER trg_doctor_service_prices_updated_at
    BEFORE UPDATE ON doctor_service_prices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 9b. Student service offerings (free / materials-only)
-- =============================================================================
CREATE TABLE student_service_offerings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    student_id          UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    service_id          UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    materials_fee       DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (materials_fee >= 0),
    supervising_doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
    is_available        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (student_id, service_id)
);

CREATE INDEX idx_sso_student ON student_service_offerings(student_id);
CREATE INDEX idx_sso_service ON student_service_offerings(service_id);

CREATE TRIGGER trg_student_service_offerings_updated_at
    BEFORE UPDATE ON student_service_offerings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 10. Clinic locations (a doctor can have multiple clinics)
-- =============================================================================
CREATE TABLE clinic_locations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    doctor_id       UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    name_ar         VARCHAR(255),
    name_en         VARCHAR(255),
    address         TEXT NOT NULL,
    governorate_id  SMALLINT REFERENCES governorates(id),
    lat             DECIMAL(10,7),
    lng             DECIMAL(10,7),
    phone           VARCHAR(20),
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clinic_doctor     ON clinic_locations(doctor_id);
CREATE INDEX idx_clinic_governorate ON clinic_locations(governorate_id);

CREATE TRIGGER trg_clinic_locations_updated_at
    BEFORE UPDATE ON clinic_locations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 11. Availability slots (weekly recurring windows for each clinic)
-- =============================================================================
CREATE TABLE availability_slots (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    clinic_id     UUID NOT NULL REFERENCES clinic_locations(id) ON DELETE CASCADE,
    day_of_week   day_of_week NOT NULL,
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_times CHECK (end_time > start_time),
    UNIQUE (clinic_id, day_of_week, start_time, end_time)
);

CREATE INDEX idx_avail_clinic_day ON availability_slots(clinic_id, day_of_week);

CREATE TRIGGER trg_availability_slots_updated_at
    BEFORE UPDATE ON availability_slots
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 12. Appointments / Matches (core booking table)
-- =============================================================================
-- booking_type determines which provider column applies:
--   'doctor_paid'  → doctor_id is set, student_id is NULL
--   'student_free' → student_id is set, doctor_id is NULL
-- Exclusion constraint (tstzrange && tstzrange) prevents double-booking
-- the same provider in overlapping time windows.
-- =============================================================================

-- Convert a (date, time, duration) window into a tstzrange for the exclusion
-- constraint. The range is [start, start + duration) — inclusive start,
-- exclusive end so adjacent bookings don't conflict.
CREATE OR REPLACE FUNCTION appointment_timerange(p_date DATE, p_time TIME, p_duration INT)
RETURNS TSTZRANGE AS $$
BEGIN
    RETURN TSTZRANGE(
        (p_date + p_time)::TIMESTAMPTZ,
        (p_date + p_time + (p_duration || ' minutes')::INTERVAL)::TIMESTAMPTZ,
        '[)'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE appointments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    patient_id          UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    doctor_id           UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
    student_id          UUID REFERENCES student_profiles(id) ON DELETE SET NULL,
    clinic_id           UUID REFERENCES clinic_locations(id) ON DELETE SET NULL,
    service_id          UUID NOT NULL REFERENCES services(id),
    booking_type        booking_type NOT NULL,
    status              appointment_status NOT NULL DEFAULT 'pending',
    scheduled_date      DATE NOT NULL,
    scheduled_time      TIME NOT NULL,
    duration_minutes    SMALLINT NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
    price               DECIMAL(10,2) CHECK (price >= 0),
    materials_fee       DECIMAL(10,2) DEFAULT 0 CHECK (materials_fee >= 0),
    patient_notes       TEXT,
    provider_notes      TEXT,
    cancellation_reason TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Enforce correct provider-role assignment
    CONSTRAINT chk_correct_provider_role CHECK (
        (booking_type = 'doctor_paid'  AND doctor_id IS NOT NULL AND student_id IS NULL) OR
        (booking_type = 'student_free' AND student_id IS NOT NULL AND doctor_id IS NULL)
    ),

    -- Prevent double-booking the same provider at the same time
    EXCLUDE USING GIST (
        COALESCE(doctor_id::TEXT, student_id::TEXT) WITH =,
        TSTZRANGE(scheduled_date + scheduled_time,
                  scheduled_date + scheduled_time + (duration_minutes || ' minutes')::INTERVAL,
                  '[)') WITH &&
    ) WHERE (status NOT IN ('cancelled', 'no_show'))
);

CREATE INDEX idx_appt_patient        ON appointments(patient_id);
CREATE INDEX idx_appt_doctor         ON appointments(doctor_id);
CREATE INDEX idx_appt_student        ON appointments(student_id);
CREATE INDEX idx_appt_clinic         ON appointments(clinic_id);
CREATE INDEX idx_appt_date           ON appointments(scheduled_date);
CREATE INDEX idx_appt_status         ON appointments(status);
CREATE INDEX idx_appt_booking_type   ON appointments(booking_type);

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 13. Reviews & ratings (1:1 with completed appointments)
-- =============================================================================
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    appointment_id  UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment_ar      TEXT,
    comment_en      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Only allow reviews on completed appointments
    CONSTRAINT chk_completed_appointment CHECK (
        EXISTS (SELECT 1 FROM appointments a
                 WHERE a.id = appointment_id AND a.status = 'completed')
    )
);

-- Deferrable so we can insert review + update status in same transaction
ALTER TABLE reviews ALTER CONSTRAINT chk_completed_appointment DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_reviews_appointment ON reviews(appointment_id);

-- 14. Payments transaction log
-- =============================================================================
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    appointment_id      UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    amount              DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    platform_fee        DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
    provider_payout     DECIMAL(10,2) NOT NULL CHECK (provider_payout >= 0),
    payment_method      payment_method NOT NULL,
    payment_status      payment_status NOT NULL DEFAULT 'pending',
    transaction_ref     VARCHAR(255),
    paid_at             TIMESTAMPTZ,
    refunded_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_amount_breakdown CHECK (amount = platform_fee + provider_payout)
);

CREATE INDEX idx_payment_appointment ON payments(appointment_id);
CREATE INDEX idx_payment_status      ON payments(payment_status);

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
