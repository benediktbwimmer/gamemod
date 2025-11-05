CREATE TABLE IF NOT EXISTS ticket_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ticket_topics_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE OR REPLACE FUNCTION set_ticket_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_topics_updated_at
BEFORE UPDATE ON ticket_topics
FOR EACH ROW
EXECUTE FUNCTION set_ticket_topics_updated_at();

ALTER TABLE tickets
    ADD COLUMN topic_id UUID REFERENCES ticket_topics(id) ON DELETE SET NULL;

ALTER TABLE tickets
    DROP COLUMN category;

ALTER TABLE tickets
    ADD CONSTRAINT tickets_status_valid CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'));

INSERT INTO ticket_topics (name, description)
VALUES
    ('Account Support', 'Authentication, billing, and account management'),
    ('Gameplay', 'Core gameplay mechanics and balance questions'),
    ('Moderation Appeal', 'Appeals and policy clarifications'),
    ('Technical Support', 'Crashes, performance, and other technical issues')
ON CONFLICT (name) DO NOTHING;
