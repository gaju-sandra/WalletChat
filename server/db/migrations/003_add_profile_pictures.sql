-- Profile pictures. The image itself is stored by Clerk; we keep a copy of its address (URL) here,
-- so contact lists can show everyone's picture without asking Clerk about each person.
-- NULL = no picture: the app shows initials instead.
ALTER TABLE users ADD COLUMN image_url TEXT;
