import Database from "better-sqlite3";

export function openUserDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY,
        spend_mode TEXT NOT NULL DEFAULT 'password',
        idle_timeout_minutes INTEGER NOT NULL DEFAULT 15,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY,
        spend_mode TEXT NOT NULL DEFAULT 'password',
        idle_timeout_minutes INTEGER NOT NULL DEFAULT 15,
        totp_enabled INTEGER NOT NULL DEFAULT 0,
        totp_secret TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

    // migrations
    try { db.exec(`ALTER TABLE user_settings ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;`); } catch {}
    try { db.exec(`ALTER TABLE user_settings ADD COLUMN totp_secret TEXT;`); } catch {}


  return db;
}
