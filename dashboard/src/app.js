import express from "express";
import path from "path";
import session from "express-session";
import livereload from "livereload";
import connectLiveReload from "connect-livereload";

const isDev = process.env.NODE_ENV !== "production";

import { explorerRouter } from "./routes/explorerUi.js";
import { healthRouter } from "./routes/health.js";
import { apiRouter } from "./routes/api.js";
import { streamRouter } from "./routes/stream.js";
import { dashboardRouter } from "./routes/dashboard.js";


import { rpc } from "./rpc/client.js";

import { attachLocals } from "./middleware/locals.js";
import { openUserDb } from "./services/userStore.js";
import { idleTimeoutGuard, requireLogin, requireLoginApi } from "./services/session.js";
import { authApiRoutes } from "./routes/authApi.js";
import { userWalletApiRoutes } from "./routes/userWalletApi.js";
import { walletUiRouter } from "./routes/walletUi.js";
import { totpApiRoutes } from "./routes/totpApi.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export function createApp() {
  if (isDev) {
    const lrServer = livereload.createServer({
      exts: ["css", "js", "html"],
      delay: 150
    });

    lrServer.watch([
      "/app/public",
      "/app/views"
    ]);
  }
  const app = express();
  const db = openUserDb(process.env.AUTH_DB_PATH || path.resolve(__dirname, "../db/wallet-ui.sqlite"));

  app.use(express.json());

  app.use(session({
    secret: process.env.SESSION_SECRET || "dev-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  }));

  app.use(attachLocals());
  app.use(idleTimeoutGuard());

  app.use("/public", express.static(path.resolve(__dirname, "public")));

  // UI
  app.use(dashboardRouter());              // /
  app.use("/explorer", explorerRouter());
  app.use("/wallet", walletUiRouter());

  // Auth + 2FA
  app.use("/api/auth", authApiRoutes({ db }));
  app.use("/api/totp", totpApiRoutes({ db }));

  // Wallet API
  app.use("/api/wallet", requireLoginApi, userWalletApiRoutes({ rpc }));

  // existing APIs
  app.use(apiRouter());
  app.use(streamRouter());
  app.use(healthRouter());
  app.use(connectLiveReload());

  return app;
}
