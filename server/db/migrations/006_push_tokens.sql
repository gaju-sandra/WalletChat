-- Push notifications: each phone that allowed notifications gets an address from Expo
-- ("ExponentPushToken[…]"). We keep which user is signed in on that phone, so we know where to send
-- "Diane sent you RWF 5,000". One phone = one token, so if someone else signs in on it, the row moves to them.
CREATE TABLE push_tokens (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX push_tokens_user_id ON push_tokens (user_id);
