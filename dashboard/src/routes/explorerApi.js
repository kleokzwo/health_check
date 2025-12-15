// src/routes/explorerApi.js
import express from "express";
import { clampInt } from "../utils/format.js";

export function explorerApiRouter({ node, config }) {
  const r = express.Router();

  r.get("/api/blocks", async (req, res) => {
    try {
      const limit = clampInt(req.query.limit, 1, config.blocksListLimitMax, 10);
      const bc = await node.getBlockchainInfo();
      const tip = bc.blocks;

      const heights = [];
      for (let h = tip; h > tip - limit && h >= 0; h--) heights.push(h);

      const blocks = [];
      for (const h of heights) {
        const hash = await node.getBlockHash(h);
        const hdr = await node.getBlockHeader(hash);
        blocks.push({
          height: h,
          hash,
          time: hdr.time,
          mediantime: hdr.mediantime,
          confirmations: hdr.confirmations,
          difficulty: hdr.difficulty,
          tx_count: hdr.nTx,
          previousblockhash: hdr.previousblockhash,
          nextblockhash: hdr.nextblockhash,
          size: hdr.size,
        });
      }

      res.json({ tip, blocks });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  r.get("/api/block/:id", async (req, res) => {
    try {
      const id = req.params.id;

      let hash;
      if (/^\d+$/.test(id)) {
        const height = Number(id);
        hash = await node.getBlockHash(height);
      } else {
        hash = id;
      }

      // Keep it light (txids). Switch to 2 if you want decoded txs.
      const block = await node.getBlock(hash, 1);

      res.json({
        hash: block.hash,
        height: block.height,
        confirmations: block.confirmations,
        time: block.time,
        mediantime: block.mediantime,
        version: block.version,
        merkleroot: block.merkleroot,
        difficulty: block.difficulty,
        previousblockhash: block.previousblockhash,
        nextblockhash: block.nextblockhash,
        size: block.size,
        weight: block.weight,
        tx: block.tx,
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  r.get("/api/tx/:txid", async (req, res) => {
    try {
      const tx = await node.getRawTransaction(req.params.txid, true);
      res.json(tx);
    } catch (e) {
      const msg = String(e.message || "");
      const likelyNoIndex =
        msg.includes("No such mempool or blockchain transaction") ||
        msg.includes("No such mempool transaction") ||
        msg.includes("not found");

      res.status(404).json({
        ok: false,
        error: e.message,
        hint: likelyNoIndex
          ? "If this tx is confirmed and not in mempool, enable -txindex=1 on the node and reindex."
          : undefined,
      });
    }
  });

  r.get("/api/mempool", async (req, res) => {
    try {
      const limit = clampInt(req.query.limit, 1, config.mempoolSampleLimitMax, 50);
      const [info, txids] = await Promise.all([
        node.getMempoolInfo(),
        node.getRawMempool(false),
      ]);
      res.json({ info, sample: txids.slice(0, limit), total_txids: txids.length });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  r.get("/api/address/:addr", async (req, res) => {
    try {
      const addr = req.params.addr;
      const result = await node.scanUtxoSetByAddress(addr);
      res.json({
        address: addr,
        height: result.height,
        bestblock: result.bestblock,
        txouts: result.txouts,
        total_amount: result.total_amount,
        unspents: result.unspents || [],
        raw: result,
        note:
          "This is a UTXO scan (current unspent outputs). Full transaction history requires an indexer.",
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Optional convenience HTML entry
  r.get("/explorer", (req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(`
      <h1>Explorer</h1>
      <ul>
        <li><a href="/api/blocks?limit=10">/api/blocks?limit=10</a></li>
        <li>Block: <code>/api/block/&lt;height-or-hash&gt;</code></li>
        <li>Tx: <code>/api/tx/&lt;txid&gt;</code> (best with <code>-txindex=1</code>)</li>
        <li><a href="/api/mempool?limit=50">/api/mempool?limit=50</a></li>
        <li>Address (UTXO scan): <code>/api/address/&lt;address&gt;</code></li>
      </ul>
    `);
  });

  r.get("/b/:id", (req, res) => res.redirect(`/api/block/${encodeURIComponent(req.params.id)}`));
  r.get("/t/:txid", (req, res) => res.redirect(`/api/tx/${encodeURIComponent(req.params.txid)}`));

  return r;
}
