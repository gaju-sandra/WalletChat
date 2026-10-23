# WalletChat server

The API and PostgreSQL database for the WalletChat app.

```
iPhone (WalletChat app)  ──HTTP──►  this server (Node.js + Express)  ──SQL──►  PostgreSQL
```

The app never talks to PostgreSQL directly: the database password would have to live inside the app,
where anyone could pull it out. The server holds the password and enforces the rules (like "you can't
send more than your balance").

## Folder layout

| Path | What it is |
|---|---|
| `db/migrations/` | The tables, as numbered SQL files. Each runs once, in order. |
| `db/seed.sql` | Development data (Sandra, Aline, Eric, Grace, Kevin and their history). |
| `scripts/` | `migrate`, `seed` and `reset` commands. |
| `src/db.js` | The connection to PostgreSQL. |
| `src/index.js` | Starts the API. |
| `src/routes/` | The API's addresses (`/users/...`, `/transfers`). |

## First-time setup

**1. Create the database.** In **pgAdmin**: right-click *Databases* → *Create* → *Database…* → name it
`walletchat` → *Save*. Or from a terminal:

```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE walletchat;"
```

**2. Tell the server how to connect.** Copy `.env.example` to `.env` and put your PostgreSQL password in
`DATABASE_URL`. `.env` is in `.gitignore`, so the password never goes into Git.

**3. Install, create the tables, add the starting data:**

```bash
npm install
npm run db:migrate
npm run db:seed
```

**4. Start the API** (restarts by itself when you save a file):

```bash
npm run dev
```

**5. Check it works.** Open these in your browser:

- http://localhost:3000/health → `{"ok":true,...}` means the server reached the database
- http://localhost:3000/users/1 → Sandra
- http://localhost:3000/users/1/contacts → her chats, most recent first
- http://localhost:3000/users/1/messages/2 → her chat with Aline
- http://localhost:3000/users/1/transactions → her money in and out

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Start the API, restarting on every save |
| `npm run db:migrate` | Run any new files in `db/migrations/` |
| `npm run db:seed` | Clear the tables and reload the development data |
| `npm run db:reset` | **Delete every table**, then migrate and seed again (development only!) |

## Changing the tables later

Never edit `001_create_tables.sql` once it has run. Add a new file instead, e.g.
`db/migrations/002_add_avatar.sql` containing `ALTER TABLE users ADD COLUMN avatar_url TEXT;`,
then run `npm run db:migrate`. While learning, `npm run db:reset` rebuilds everything from scratch.

## Sending money (API example)

```bash
curl -X POST http://localhost:3000/transfers -H "Content-Type: application/json" -d "{\"fromUserId\":1,\"toUserId\":2,\"amount\":5000}"
```

It updates both balances, adds a transaction for each person and a payment message in their chat, all in
one SQL transaction: everything happens, or nothing does.

## Reaching the API from your iPhone

`localhost` on the iPhone means the iPhone itself. Use your computer's Wi-Fi address instead (run
`ipconfig` and look for *IPv4 Address*, e.g. `http://192.168.1.20:3000`). Both devices must be on the same
Wi-Fi, and Windows Firewall may ask you to allow Node.js the first time.

## Not done yet

- **Login.** For now any request can act as any user (`/users/1`). Before real use, people must log in
  and the server must check *who* is asking.
- **The app still uses its own data.** Next step: make WalletChat call this API instead of `mock.ts`.
