BEGIN;
CREATE TABLE IF NOT EXISTS hackloop.profile_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
 category text NOT NULL CHECK(category IN ('affiliation','authorization','qualification','supporting')),
 filename text NOT NULL,
 media_type text NOT NULL CHECK(media_type IN ('application/pdf','image/jpeg','image/png')),
 content bytea NOT NULL CHECK(octet_length(content) BETWEEN 1 AND 5242880),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_documents_owner_idx ON hackloop.profile_documents(user_id);
CREATE TABLE IF NOT EXISTS hackloop.organizer_application_details (
 request_id uuid PRIMARY KEY REFERENCES hackloop.organizer_verification_requests(id) ON DELETE CASCADE,
 university text NOT NULL, organization_name text NOT NULL, club_name text NOT NULL,
 lead_name text NOT NULL, work_email text NOT NULL, phone_number text NOT NULL,
 address text NOT NULL, city text NOT NULL, region text NOT NULL, postal_code text NOT NULL,
 country_code text NOT NULL, qualifications text NOT NULL
);
CREATE TABLE IF NOT EXISTS hackloop.organizer_application_documents (
 request_id uuid NOT NULL REFERENCES hackloop.organizer_verification_requests(id) ON DELETE CASCADE,
 document_id uuid NOT NULL REFERENCES hackloop.profile_documents(id),
 PRIMARY KEY(request_id,document_id)
);
COMMIT;
