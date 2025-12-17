export function requireLogin(req, res, next) {
  if (!req.session?.user) return res.redirect("/wallet/login");
  next();
}

export function requireLoginApi(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: "not_logged_in" });
  next();
}

export function idleTimeoutGuard() {
  return (req, res, next) => {
    const s = req.session;
    if (!s?.user) return next();

    const now = Date.now();
    const last = s.lastSeen || now;
    const idleMin = s.idleMinutes ?? 15;

    if (now - last > idleMin * 60_000) {
      req.session.destroy(() => {
        // for UI routes redirect, for API return JSON
        if ((req.path || "").startsWith("/api/")) return res.status(401).json({ error: "session_expired" });
        return res.redirect("/wallet/login");
      });
      return;
    }

    s.lastSeen = now;
    next();
  };
}

export function walletNameForUser(userId) {
  return `u_${userId}`;
}
