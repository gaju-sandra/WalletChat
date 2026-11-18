-- Photos in chats. The picture file is saved in the server's uploads/ folder; the database keeps its
-- file name. Only the two people in the chat can download it (see GET /messages/:id/photo).
ALTER TABLE messages ADD COLUMN photo_file TEXT;

ALTER TABLE messages DROP CONSTRAINT messages_kind_check;
ALTER TABLE messages DROP CONSTRAINT messages_fields_check;

ALTER TABLE messages ADD CONSTRAINT messages_kind_check
  CHECK (kind IN ('text', 'payment', 'request', 'contact', 'photo'));

-- Each kind fills in only its own columns:
--   text    → text
--   payment / request → amount
--   contact → contact_name + contact_phone
--   photo   → photo_file
ALTER TABLE messages ADD CONSTRAINT messages_fields_check CHECK (
  (kind = 'text' AND text IS NOT NULL AND amount IS NULL AND contact_phone IS NULL AND photo_file IS NULL)
  OR (kind IN ('payment', 'request') AND amount > 0 AND text IS NULL AND contact_phone IS NULL AND photo_file IS NULL)
  OR (kind = 'contact' AND contact_name IS NOT NULL AND contact_phone IS NOT NULL AND text IS NULL AND amount IS NULL
      AND photo_file IS NULL)
  OR (kind = 'photo' AND photo_file IS NOT NULL AND text IS NULL AND amount IS NULL AND contact_phone IS NULL)
);
