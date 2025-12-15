import express from "express";
import { createNodeService } from "../services/nodeService.js";

export function streamRouter() {
  const router = express.Router();
  const node = createNodeService();

  router.get("/api/stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let closed = false;
    req.on("close", () => (closed = true));

    const send = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send("hello", { ok: true });

    const timer = setInterval(async () => {
      if (closed) return clearInterval(timer);

      try {
        const [bc, mem, net] = await Promise.all([
          node.getBlockchainInfo(),
          node.getMempoolInfo(),
          node.getNetworkInfo(),
        ]);

        send("stats", {
          tip: bc.blocks,
          headers: bc.headers,
          chain: bc.chain,
          ibd: !!bc.initialblockdownload,
          peers: net.connections,
          mempool: {
            size: mem.size,
            usage: mem.usage,
            bytes: mem.bytes,
            total_fee: mem.total_fee,
            maxmempool: mem.maxmempool,
            mempoolminfee: mem.mempoolminfee,
          },
          t: Date.now(),
        });
      } catch (e) {
        send("error", { message: e.message, t: Date.now() });
      }
    }, 2500);

    const ka = setInterval(() => {
      if (closed) return clearInterval(ka);
      res.write(": keep-alive\n\n");
    }, 15000);
  });

  return router;
}
