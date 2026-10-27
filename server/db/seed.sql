-- Starting data for development: the same people and history as WalletChat/src/data/mock.ts.
-- Run with: npm run db:seed   (it clears these tables first, so you can run it again any time)

TRUNCATE users, contacts, messages, transactions RESTART IDENTITY CASCADE;

INSERT INTO users (id, name, phone, email, balance, monthly_budget) VALUES
  (1, 'Sandra Gaju',      '0788000000', 'sandra@example.com', 250000, 150000),
  (2, 'Aline Mutoni',     '0788111111', NULL,                 120000, 150000),
  (3, 'Eric Niyonzima',   '0788222222', NULL,                  80000, 150000),
  (4, 'Grace Uwase',      '0788333333', NULL,                  95000, 150000),
  (5, 'Kevin Iradukunda', '0788444444', NULL,                  60000, 150000);

-- We inserted ids by hand, so tell the id counter to continue after the highest one
SELECT setval('users_id_seq', (SELECT max(id) FROM users));

-- Sandra's contact list (and each of them has Sandra, so chats work both ways)
INSERT INTO contacts (owner_id, contact_id, unread, added_at) VALUES
  (1, 2, 2, now() - interval '30 days'),
  (1, 3, 0, now() - interval '30 days'),
  (1, 4, 1, now() - interval '30 days'),
  (1, 5, 0, now() - interval '30 days'),
  (2, 1, 0, now() - interval '30 days'),
  (3, 1, 0, now() - interval '30 days'),
  (4, 1, 0, now() - interval '30 days'),
  (5, 1, 0, now() - interval '30 days');

INSERT INTO messages (sender_id, receiver_id, kind, text, amount, sent_at) VALUES
  (2, 1, 'text',    'Hey! Can you send me 5k for the tickets?', NULL, now() - interval '60 minutes'),
  (1, 2, 'text',    'Sure, sending now',                        NULL, now() - interval '52 minutes'),
  (1, 2, 'payment', NULL,                                       5000, now() - interval '50 minutes'),
  (2, 1, 'text',    'Thanks for the 5k! 🙏',                    NULL, now() - interval '49 minutes'),
  (3, 1, 'text',    'Are we splitting lunch?',                  NULL, now() - interval '180 minutes'),
  (3, 1, 'request', NULL,                                       4000, now() - interval '179 minutes'),
  (4, 1, 'payment', NULL,                                        600, now() - interval '1 day'),
  (4, 1, 'text',    'Sent you the bus fare',                    NULL, now() - interval '1 day' + interval '1 minute'),
  (1, 5, 'text',    'See you tomorrow',                         NULL, now() - interval '4 days');

INSERT INTO transactions (user_id, title, subtitle, amount, category, created_at) VALUES
  (1, 'Aline Mutoni', 'Sent in chat', -5000,  'transfer',  now() - interval '50 minutes'),
  (1, 'Salary',       'Income',       180000, 'income',    date_trunc('day', now()) + interval '8 hours'),
  (1, 'Grace Uwase',  'Received in chat', 600, 'transfer', now() - interval '1 day'),
  (1, 'Bus fare',     'Transport',    -600,   'transport', now() - interval '1 day'),
  (1, 'Electricity',  'Bills',        -10000, 'bills',     now() - interval '2 days'),
  (1, 'Groceries',    'Shopping',     -8500,  'shopping',  now() - interval '3 days'),
  (1, 'Moto',         'Transport',    -1500,  'transport', now() - interval '4 days'),
  (1, 'Eric N.',      'Sent in chat', -3000,  'transfer',  now() - interval '5 days'),
  (1, 'Internet',     'Bills',        -15000, 'bills',     now() - interval '6 days'),
  (2, 'Sandra Gaju',  'Received in chat', 5000, 'transfer', now() - interval '50 minutes'),
  (4, 'Sandra Gaju',  'Sent in chat', -600,   'transfer',  now() - interval '1 day');
