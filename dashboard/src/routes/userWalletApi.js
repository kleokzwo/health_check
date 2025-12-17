import express from "express";
import { walletNameForUser } from "../services/session.js";

const unlockedUntil = new Map();
const unlock = (sid, minutes=5) => unlockedUntil.set(sid, Date.now() + minutes * 60_000);
const isUnlocked = (sid) => (unlockedUntil.get(sid) || 0) > Date.now();

function requireSpendUnlocked(req, res, next) {
  const until = req.session?.spendUnlockedUntil || 0;
  if (Date.now() > until) return res.status(403).json({ error: "spend_locked" });
  next();
}


export function userWalletApiRoutes({ rpc }) {
  const r = express.Router();
  const wname = (req) => walletNameForUser(req.session.user.id);

  r.post("/create", async (req, res) => {
    const w = wname(req);
    try {
      const result = await rpc("createwallet", [w, false, false, "", false, true, true, false]);
      res.json({ ok: true, result, wallet: w });
    } catch (e) {
      const msg = String(e.message || e);
      return res.status(500).json({ error: msg });
    }
  });

  // GET /api/wallet/summary
  r.get("/summary", async (req, res) => {
    const w = wname(req);

    try {
      const info = await rpc("getwalletinfo", [], { wallet: w });
      res.json({
        wallet: w,
        balance: info.balance,
        unconfirmed: info.unconfirmed_balance,
        txcount: info.txcount,
        descriptors: info.descriptors,
      });
    } catch (e) {
      const msg = String(e.message || e);
      if (msg.includes('"code":-18')) {
        return res.status(404).json({ error: "wallet_missing", wallet: w });
      }
      return res.status(500).json({ error: msg });
    }
  });

  r.post("/receive/new", async (req, res) => {
    try {
      const w = wname(req);
      const address = await rpc("getnewaddress", [], { wallet: w });
      res.json({ address });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  r.get("/txs", async (req, res) => {
    try {
      const w = wname(req);
      const n = Math.min(parseInt(req.query.n || "50", 10), 500);
      const txs = await rpc("listtransactions", ["*", n, 0, true], { wallet: w });
      res.json({ txs });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  r.post("/unlock", (req, res) => {
    req.session.spendUnlockedUntil = Date.now() + 5 * 60_000;
    res.json({ ok: true, until: req.session.spendUnlockedUntil });
  });

  r.post("/send", requireSpendUnlocked, async (req, res) => {
    try {
      if (!isUnlocked(req.session.id)) return res.status(403).json({ error: "locked" });

      const { address, amount } = req.body || {};
      const amt = Number(amount);
      if (!address || !Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "invalid_address_or_amount" });

      const w = wname(req);
      const txid = await rpc("sendtoaddress", [address, amt], { wallet: w });
      res.json({ txid });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  return r;
}
