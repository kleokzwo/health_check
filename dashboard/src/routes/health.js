import express from "express";
import { createNodeService } from "../services/nodeService.js";

export function healthRouter() {
  const router = express.Router();
  const node = createNodeService();

  router.get("/health", async (req, res) => {
    try {
      await node.getBlockchainInfo();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
