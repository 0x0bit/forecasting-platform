INSERT OR IGNORE INTO users (id, username, initial_balance, balance, created_at)
VALUES
  (1, 'alice', 1000, 1000, CURRENT_TIMESTAMP),
  (2, 'bob', 500, 500, CURRENT_TIMESTAMP),
  (3, 'charlie', 0, 0, CURRENT_TIMESTAMP);
