import express from "express";
import bcrypt from "bcrypt";

export function authApiRoutes({ db }) {
  const r = express.Router();

  r.post("/register", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "missing_fields" });

    const hash = await bcrypt.hash(password, 12);
    const now = Math.floor(Date.now() / 1000);

    try {
      const ins = db.prepare(
        "INSERT INTO users(username, password_hash, created_at) VALUES(?,?,?)"
      ).run(username, hash, now);

      const userId = Number(ins.lastInsertRowid);
      db.prepare("INSERT INTO user_settings(user_id, created_at) VALUES(?,?)").run(userId, now);

      req.session.user = { id: userId, username };
      req.session.lastSeen = Date.now();
      req.session.idleMinutes = 15;

      res.json({ ok: true, user: req.session.user });
    } catch (e) {
      if (String(e).includes("UNIQUE")) return res.status(409).json({ error: "username_taken" });
      res.status(500).json({ error: "register_failed" });
    }
  });
  
    r.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).json({ error: "missing_fields" });

        const row = db
        .prepare("SELECT id, username, password_hash FROM users WHERE username=?")
        .get(username);
        if (!row) return res.status(401).json({ error: "invalid_login" });

        const ok = await bcrypt.compare(password, row.password_hash);
        if (!ok) return res.status(401).json({ error: "invalid_login" });

        const s = db
        .prepare("SELECT totp_enabled, idle_timeout_minutes FROM user_settings WHERE user_id=?")
        .get(row.id);

        req.session.user = { id: row.id, username: row.username };
        req.session.lastSeen = Date.now();
        req.session.idleMinutes = s?.idle_timeout_minutes ?? 15;

        if (s?.totp_enabled) {
        req.session.totpOk = false;
        return req.session.save((err) => {
            if (err) return res.status(500).json({ error: "session_save_failed" });
            return res.json({ ok: true, needs_totp: true });
        });
        }

        req.session.totpOk = true;
        return req.session.save((err) => {
        if (err) return res.status(500).json({ error: "session_save_failed" });
        return res.json({ ok: true });
        });
    } catch (e) {
        return res.status(500).json({ error: String(e.message || e) });
    }
    });


  r.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));

  });

  r.get("/me", (req, res) => res.json({ user: req.session?.user || null }));

  return r;
}
