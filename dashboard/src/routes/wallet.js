import express from "express";

export function walletRoutes({ rpc, env }) {
  const router = express.Router();
  const WALLET = env.WALLET_NAME || "merchant_hot";

  // helper to call wallet-scoped RPC
  const w = (method, params=[]) => rpc(method, params, { wallet: WALLET });

  router.get("/info", async (_req, res) => {
    try {
      const [info, net] = await Promise.all([
        w("getwalletinfo"),
        rpc("getnetworkinfo"),
      ]);

      res.json({
        wallet: WALLET,
        balance: info.balance,
        unconfirmed: info.unconfirmed_balance,
        txcount: info.txcount,
        descriptors: info.descriptors,
        private_keys_enabled: info.private_keys_enabled,
        node: net.subversion,
        blocks: net.blocks,
      });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  router.post("/create", async (_req, res) => {
    try {
      const result = await rpc("createwallet", [WALLET, false, false, "", false, true, true, false]);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  router.post("/receive", async (_req, res) => {
    try {
      const address = await w("getnewaddress");
      res.json({ address });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  router.get("/txs", async (req, res) => {
    try {
      const n = Math.min(parseInt(req.query.n || "25", 10), 200);
      const txs = await w("listtransactions", ["*", n, 0, true]);
      res.json({ txs });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  // Optional: you can disable this route until you add auth
  router.post("/send", async (req, res) => {
    try {
      const { address, amount } = req.body || {};
      if (!address || !amount) return res.status(400).json({ error: "address and amount required" });
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "invalid amount" });

      const txid = await w("sendtoaddress", [address, amt]);
      res.json({ txid });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  return router;
}
