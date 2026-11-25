-- Money in and out without negative numbers: every amount is positive, and `direction` says which way
-- the money went. Before: -5000 = sent 5000. Now: amount 5000, direction 'out'.
ALTER TABLE transactions ADD COLUMN direction TEXT;

-- The existing rows: the sign tells us the direction, then the amount loses its minus
UPDATE transactions SET direction = CASE WHEN amount < 0 THEN 'out' ELSE 'in' END, amount = abs(amount);

ALTER TABLE transactions ALTER COLUMN direction SET NOT NULL;
ALTER TABLE transactions ADD CONSTRAINT transactions_direction_check CHECK (direction IN ('in', 'out'));

-- From now on an amount must be more than 0 (was: anything but 0)
ALTER TABLE transactions DROP CONSTRAINT transactions_amount_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check CHECK (amount > 0);
