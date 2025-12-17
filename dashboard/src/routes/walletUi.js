import express from "express";
import { layout } from "../views/layout.js";
import { mainNav } from "../views/nav.js";

import { walletLoginPage } from "../views/pages/wallet/login.js";
import { walletRegisterPage } from "../views/pages/wallet/register.js";
import { walletDashboardPage } from "../views/pages/wallet/dashboard.js";
import { walletReceivePage } from "../views/pages/wallet/receive.js";
import { walletSendPage } from "../views/pages/wallet/send.js";
import { walletSettingsPage } from "../views/pages/wallet/settings.js";
import { walletTotpPage } from "../views/pages/wallet/totp.js";

function pageShell({ title, active, user, body }) {
  return layout({
    title,
    head: ``,
    nav: mainNav({ active, user }),
    pills: ``,
    content: body,
    scripts: ``,
  });
}

// ✅ login required (but NOT totp required)
function requireSession(req, res, next) {
  if (!req.session?.user) return res.redirect("/wallet/login");
  next();
}

// ✅ login + totp required (used for dashboard/receive/send/settings)
function requireTotp(req, res, next) {
  if (!req.session?.user) return res.redirect("/wallet/login");
  if (req.session.totpOk === false) return res.redirect("/wallet/totp");
  next();
}

export function walletUiRouter() {
  const r = express.Router();

  r.get("/", (_req, res) => res.redirect("/wallet/dashboard"));

  r.get("/login", (req, res) => {
    // if already logged in and verified, go to dashboard
    if (req.session?.user && req.session.totpOk !== false) return res.redirect("/wallet/dashboard");
    res.type("html").send(pageShell({ title: "Login", active: "wallet", user: res.locals.user, body: walletLoginPage() }));
  });

  r.get("/register", (req, res) => {
    if (req.session?.user && req.session.totpOk !== false) return res.redirect("/wallet/dashboard");
    res.type("html").send(pageShell({ title: "Register", active: "wallet", user: res.locals.user, body: walletRegisterPage() }));
  });

  // ✅ This must NOT use requireTotp, or it loops.
  r.get("/totp", requireSession, (req, res) => {
    if (req.session.totpOk !== false) return res.redirect("/wallet/dashboard"); // already verified
    res.type("html").send(pageShell({ title: "2FA", active: "wallet", user: res.locals.user, body: walletTotpPage() }));
  });

  r.get("/logout", (req, res) => {
    req.session?.destroy?.(() => res.redirect("/wallet/login"));
  });

  // Wallet pages (need TOTP)
  r.get("/dashboard", requireTotp, (_req, res) => {
    res.type("html").send(pageShell({ title: "Wallet", active: "wallet", user: res.locals.user, body: walletDashboardPage() }));
  });

  r.get("/receive", requireTotp, (_req, res) => {
    res.type("html").send(pageShell({ title: "Receive", active: "wallet", user: res.locals.user, body: walletReceivePage() }));
  });

  r.get("/send", requireTotp, (_req, res) => {
    res.type("html").send(pageShell({ title: "Send", active: "wallet", user: res.locals.user, body: walletSendPage() }));
  });

  r.get("/settings", requireTotp, (_req, res) => {
    res.type("html").send(pageShell({ title: "Settings", active: "wallet", user: res.locals.user, body: walletSettingsPage() }));
  });

  return r;
}
