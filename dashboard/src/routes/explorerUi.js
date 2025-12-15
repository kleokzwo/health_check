import express from "express";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export function explorerRouter() {
  const router = express.Router();

  // Folder: src/public/explorer/*
  const explorerDir = path.resolve(__dirname, "..", "public", "explorer");

  // Serve static explorer assets under /explorer/assets/*
  router.use("/assets", express.static(explorerDir));

  // Small runtime config for the frontend (optional but useful)
  router.get("/config.js", (req, res) => {
    res.setHeader("content-type", "application/javascript; charset=utf-8");
    res.send(
      `window.__APP_CONFIG__ = ${JSON.stringify({
        apiBase: "", // same origin
      })};`
    );
  });

  // Serve the explorer page at /explorer
  router.get("/", (req, res) => {
    res.sendFile(path.join(explorerDir, "index.html"));
  });

  return router;
}
