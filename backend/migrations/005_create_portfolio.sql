-- 15. Provider Portfolio (Before & After Images)
-- =============================================================================
CREATE TABLE provider_portfolio (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    image_url   TEXT NOT NULL,
    title       VARCHAR(255),
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_profile ON provider_portfolio(profile_id);

CREATE TRIGGER trg_provider_portfolio_updated_at
    BEFORE UPDATE ON provider_portfolio
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
