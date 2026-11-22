-- Read ticks (✓✓): when each person last opened their chat with someone.
-- A message I sent is "seen" if it was sent before the receiver's read_at for our chat.
ALTER TABLE contacts ADD COLUMN read_at TIMESTAMPTZ;

-- Chats with nothing unread right now have been read: count everything sent so far as seen
UPDATE contacts SET read_at = now() WHERE unread = 0;
