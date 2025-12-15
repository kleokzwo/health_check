import express from "express";
import path from "path";

import { explorerRouter } from "./routes/explorerUi.js";
import { healthRouter } from "./routes/health.js";
import { apiRouter } from "./routes/api.js";
import { streamRouter } from "./routes/stream.js";
import { dashboardRouter } from "./routes/dashboard.js"; // next section

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export function createApp() {
  const app = express();

  // serve static shared + explorer assets
  app.use("/public", express.static(path.resolve(__dirname, "public")));

  // pages
  app.use(dashboardRouter());          // /
  app.use("/explorer", explorerRouter()); // /explorer

  // api
  app.use(apiRouter());
  app.use(streamRouter());
  app.use(healthRouter());

  return app;
}
