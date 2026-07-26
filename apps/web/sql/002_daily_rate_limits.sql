CREATE TABLE IF NOT EXISTS feedback_rate_limits (
  day DATE NOT NULL,
  ip_hash TEXT NOT NULL,
  post_count SMALLINT NOT NULL CHECK (post_count BETWEEN 1 AND 2),
  PRIMARY KEY (day, ip_hash)
);

CREATE INDEX IF NOT EXISTS feedback_rate_limits_day_idx
  ON feedback_rate_limits (day);
