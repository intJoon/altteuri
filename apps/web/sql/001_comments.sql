CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  version TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX comments_created_at_desc_idx ON comments (created_at DESC);
