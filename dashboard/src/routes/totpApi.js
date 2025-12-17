import express from "express";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export function totpApiRoutes({ db }) {
  const r = express.Router();

  function getSettings(userId) {
    return db.prepare("SELECT totp_enabled, totp_secret FROM user_settings WHERE user_id=?").get(userId);
  }

  r.get("/status", (req, res) => {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ error: "not_logged_in" });

    const s = getSettings(user.id);
    res.json({ enabled: !!s?.totp_enabled });
  });

  // Start enrollment: create secret + return otpauth + QR
  r.post("/enroll", async (req, res) => {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ error: "not_logged_in" });

    const secret = authenticator.generateSecret();
    db.prepare("UPDATE user_settings SET totp_secret=?, totp_enabled=0 WHERE user_id=?").run(secret, user.id);

    const issuer = req.body?.issuer || "BitcoinII";
    const label = `${issuer}:${user.username}`;
    const otpauth = authenticator.keyuri(user.username, issuer, secret);

    const qrDataUrl = await QRCode.toDataURL(otpauth);

    res.json({ otpauth, qrDataUrl });
  });

  // Verify code and enable
  r.post("/enable", (req, res) => {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ error: "not_logged_in" });

    const code = String(req.body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "invalid_code" });

    const s = getSettings(user.id);
    if (!s?.totp_secret) return res.status(400).json({ error: "not_enrolled" });

    const ok = authenticator.check(code, s.totp_secret);
    if (!ok) return res.status(400).json({ error: "wrong_code" });

    db.prepare("UPDATE user_settings SET totp_enabled=1 WHERE user_id=?").run(user.id);
    res.json({ ok: true });
  });

  // Disable (requires valid code)
  r.post("/disable", (req, res) => {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ error: "not_logged_in" });

    const code = String(req.body?.code || "").trim();
    const s = getSettings(user.id);
    if (!s?.totp_secret || !s?.totp_enabled) return res.status(400).json({ error: "not_enabled" });

    const ok = authenticator.check(code, s.totp_secret);
    if (!ok) return res.status(400).json({ error: "wrong_code" });

    db.prepare("UPDATE user_settings SET totp_enabled=0, totp_secret=NULL WHERE user_id=?").run(user.id);
    res.json({ ok: true });
  });

  return r;
}
