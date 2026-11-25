-- Like a bank statement: two columns, money in and money out, instead of one amount and a direction.
-- Each row fills exactly one of them; the other is 0.
--   Salary          amount_in 180000   amount_out 0
--   Sent to Diane   amount_in 0        amount_out 1000
ALTER TABLE transactions
  ADD COLUMN amount_in  BIGINT NOT NULL DEFAULT 0 CHECK (amount_in >= 0),
  ADD COLUMN amount_out BIGINT NOT NULL DEFAULT 0 CHECK (amount_out >= 0);

UPDATE transactions
   SET amount_in  = CASE WHEN direction = 'in'  THEN amount ELSE 0 END,
       amount_out = CASE WHEN direction = 'out' THEN amount ELSE 0 END;

-- Exactly one of the two is filled: money came in OR went out, never both, never neither
ALTER TABLE transactions ADD CONSTRAINT transactions_in_or_out_check CHECK ((amount_in > 0) <> (amount_out > 0));

-- The old columns aren't needed any more (their rules go with them)
ALTER TABLE transactions DROP COLUMN amount, DROP COLUMN direction;
