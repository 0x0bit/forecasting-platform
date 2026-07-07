CREATE TABLE IF NOT EXISTS "users" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "initial_balance" INTEGER NOT NULL,
  "balance" INTEGER NOT NULL,
  "created_at" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

CREATE TABLE IF NOT EXISTS "bets" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER NOT NULL,
  "game_id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "result" TEXT,
  "payout_amount" INTEGER,
  "created_at" TEXT NOT NULL,
  "settled_at" TEXT,
  "canceled_at" TEXT,
  CONSTRAINT "bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "bets_user_id_idx" ON "bets"("user_id");

CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER NOT NULL,
  "bet_id" INTEGER,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "idempotency_key" TEXT,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ledger_entries_bet_id_fkey" FOREIGN KEY ("bet_id") REFERENCES "bets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ledger_entries_user_id_idx" ON "ledger_entries"("user_id");
CREATE INDEX IF NOT EXISTS "ledger_entries_bet_id_type_idx" ON "ledger_entries"("bet_id", "type");

CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "response_status" INTEGER NOT NULL,
  "response_body" TEXT NOT NULL,
  "created_at" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_scope_key_key" ON "idempotency_keys"("scope", "key");
