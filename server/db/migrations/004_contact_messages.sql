-- A new kind of chat message: a shared contact (a name and a phone number), like a contact card on WhatsApp
ALTER TABLE messages ADD COLUMN contact_name  TEXT;
ALTER TABLE messages ADD COLUMN contact_phone TEXT;

-- Replace the old rules (which only knew text, payment and request) with ones that include "contact"
ALTER TABLE messages DROP CONSTRAINT messages_kind_check;
ALTER TABLE messages DROP CONSTRAINT messages_check;

ALTER TABLE messages ADD CONSTRAINT messages_kind_check
  CHECK (kind IN ('text', 'payment', 'request', 'contact'));

-- Each kind fills in only its own columns:
--   text    → text
--   payment / request → amount
--   contact → contact_name + contact_phone
ALTER TABLE messages ADD CONSTRAINT messages_fields_check CHECK (
  (kind = 'text' AND text IS NOT NULL AND amount IS NULL AND contact_phone IS NULL)
  OR (kind IN ('payment', 'request') AND amount > 0 AND text IS NULL AND contact_phone IS NULL)
  OR (kind = 'contact' AND contact_name IS NOT NULL AND contact_phone IS NOT NULL AND text IS NULL AND amount IS NULL)
);
