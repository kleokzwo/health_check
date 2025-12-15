import express from "express";

// We expect you already have an rpc() helper somewhere.
// If you don't: paste the rpc client from your old server.js into src/rpc/client.js and import it here.
// For now, we import from ../services/node.js (we'll create that next).
import { createNodeService } from "../services/nodeService.js";

export function apiRouter() {
  const router = express.Router();
  const node = createNodeService();

  router.get("/api/blocks", async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
      const tip = await node.getBestHeight();

      const blocks = [];
      for (let h = tip; h > tip - limit && h >= 0; h--) {
        const hash = await node.getBlockHashByHeight(h);
        const hdr = await node.getBlockHeaderByHash(hash);
        blocks.push({
          height: h,
          hash,
          time: hdr.time,
          confirmations: hdr.confirmations,
          difficulty: hdr.difficulty,
          tx_count: hdr.nTx ?? hdr.tx_count ?? hdr.txcount,
          previousblockhash: hdr.previousblockhash,
          nextblockhash: hdr.nextblockhash,
        });
      }
      res.json({ tip, blocks });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/api/block/:id", async (req, res) => {
    try {
      const id = req.params.id;

      let hash = id;
      if (/^\d+$/.test(id)) {
        hash = await node.getBlockHashByHeight(Number(id));
      }

      // Use verbosity=1 (txids only) -> faster + safer
      const block = await node.getBlockByHash(hash, 1);

      res.json({
        hash: block.hash,
        height: block.height,
        confirmations: block.confirmations,
        time: block.time,
        mediantime: block.mediantime,
        difficulty: block.difficulty,
        previousblockhash: block.previousblockhash,
        nextblockhash: block.nextblockhash,
        size: block.size,
        weight: block.weight,
        tx: block.tx, // txids
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/api/tx/:txid", async (req, res) => {
    try {
      const tx = await node.getRawTransaction(req.params.txid, true);
      res.json(tx);
    } catch (e) {
      res.status(404).json({ ok: false, error: e.message });
    }
  });

  router.get("/api/mempool", async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
      const info = await node.getMempoolInfo();
      const txids = await node.getRawMempool();
      res.json({ info, sample: txids.slice(0, limit), total_txids: txids.length });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/api/address/:addr", async (req, res) => {
    try {
      const addr = req.params.addr;
      const result = await node.scanAddressUtxo(addr);

      // normalize fork differences: amount vs value
      const unspents = (result.unspents || []).map((u) => ({
        ...u,
        amount: u.amount ?? u.value ?? 0,
      }));

      const total_amount =
        result.total_amount ?? result.totalamount ?? result.total ?? 0;

      res.json({
        address: addr,
        height: result.height,
        bestblock: result.bestblock,
        txouts: result.txouts,
        total_amount,
        unspents,
        note: "UTXO scan only. Full address history requires an indexer.",
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
