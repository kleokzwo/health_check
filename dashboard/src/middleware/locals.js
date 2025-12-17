export function attachLocals() {
  return (req, res, next) => {
    res.locals.user = req.session?.user || null;
    next();
  };
}

export function requireLoginApi(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: "not_logged_in" });
  if (req.session.totpOk === false) return res.status(401).json({ error: "totp_required" });
  next();
}

