-- 002: link each WalletChat user to their Clerk account (Clerk handles signing in).
-- clerk_user_id is Clerk's id for the person, e.g. "user_2abc...".
-- NULL means the person hasn't signed up in the app yet: for example someone you added as a contact
-- by phone number. When they sign up with that number, their existing row is claimed (see POST /me).
ALTER TABLE users ADD COLUMN clerk_user_id TEXT UNIQUE;
