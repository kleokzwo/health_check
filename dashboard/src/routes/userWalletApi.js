import express from "express";
import { walletNameForUser } from "../services/session.js";

function requireSpendUnlocked(req, res, next) {
  const until = req.session?.spendUnlockedUntil || 0;
  if (Date.now() > until) return res.status(403).json({ error: "spend_locked" });
  next();
}


function isRpcCode(err, code) {
  const msg = String(err?.message || err || "");
  // your rpc() throws "RPC error: {...}" or "RPC HTTP 500: {...}"
  return msg.includes(`"code":${code}`) || msg.includes(`code":${code}`) || msg.includes(`code: ${code}`);
}

async function ensureWalletLoaded(rpc, w) {
  // Fast path: already loaded
  try {
    const loaded = await rpc("listwallets");
    if (Array.isArray(loaded) && loaded.includes(w)) return { ok: true, loaded: true };
  } catch {
    // ignore
  }

  // If it's on disk, load it
  try {
    await rpc("loadwallet", [w]);
    return { ok: true, loaded: true };
  } catch (e) {
    if (isRpcCode(e, -18)) {
      // wallet does not exist on disk OR verification failed. Distinguish by listwalletdir.
      try {
        const dir = await rpc("listwalletdir");
        const names = (dir?.wallets || []).map(x => x.name);
        const existsOnDisk = names.includes(w);
        if (!existsOnDisk) return { ok: false, missing: true };
        return { ok: false, error: "wallet_exists_but_failed_to_load" };
      } catch {
        return { ok: false, missing: true };
      }
    }
    if (isRpcCode(e, -35)) return { ok: true, loaded: true }; // already loaded
    return { ok: false, error: String(e.message || e) };
  }
}


export function userWalletApiRoutes({ rpc }) {
  const r = express.Router();
  const wname = (req) => walletNameForUser(req.session.user.id);

r.post("/create", async (req, res) => {
  const w = wname(req);

  try {
    // If it loads, we're done
    const st = await ensureWalletLoaded(rpc, w);
    if (st.loaded) return res.json({ ok: true, wallet: w, loaded: true });

    // If missing on disk, create it
    const created = await rpc("createwallet", [w, false, false, "", false, true, true, false]);
    await ensureWalletLoaded(rpc, w);
    return res.json({ ok: true, wallet: w, created });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});


  // GET /api/wallet/summary
r.get("/summary", async (req, res) => {
  const w = wname(req);

  try {
    const st = await ensureWalletLoaded(rpc, w);
    if (st.missing) return res.status(404).json({ error: "wallet_missing", wallet: w });
    if (!st.ok) return res.status(500).json({ error: st.error || "wallet_load_failed", wallet: w });

    const [balances, info] = await Promise.all([
      rpc("getbalances", [], { wallet: w }),
      rpc("getwalletinfo", [], { wallet: w }),
    ]);

    res.json({
      wallet: w,
      balance: balances?.mine?.trusted ?? 0,
      unconfirmed: balances?.mine?.untrusted_pending ?? 0,
      txcount: info?.txcount ?? 0,
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});



r.post("/receive/new", async (req, res) => {
  const w = wname(req);

  try {
    const st = await ensureWalletLoaded(rpc, w);
    if (st.missing) return res.status(404).json({ error: "wallet_missing", wallet: w });

    const address = await rpc("getnewaddress", [], { wallet: w });
    res.json({ address });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

r.get("/_debug", async (req, res) => {
  const w = wname(req);

  try {
    const walletsLoaded = await rpc("listwallets");
    const walletDir = await rpc("listwalletdir").catch(() => null);

    return res.json({
      user: req.session?.user || null,
      totpOk: req.session?.totpOk,
      walletExpected: w,
      walletsLoaded,
      walletDir,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e), walletExpected: w });
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
    const w = wname(req);
    await ensureWalletLoaded(rpc, w);

    const { address, amount } = req.body || {};
    const amt = Number(amount);
    if (!address || !Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: "invalid_address_or_amount" });
    }

    const txid = await rpc("sendtoaddress", [address, amt], { wallet: w });
    res.json({ txid });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});


// GET /api/wallet/descriptors/export
r.get("/descriptors/export", async (req, res) => {
  const w = wname(req);

  // Require TOTP for backups
  if (req.session?.totpOk !== true) return res.status(403).json({ error: "totp_required" });

  try {
    const st = await ensureWalletLoaded(rpc, w);
    if (st?.missing) return res.status(404).json({ error: "wallet_missing", wallet: w });
    if (st && st.ok === false) return res.status(500).json({ error: st.error || "wallet_load_failed", wallet: w });

    const r1 = await rpc("listdescriptors", [], { wallet: w });

    // r1 usually: { wallet_name, descriptors: [...] }
    const descriptors = Array.isArray(r1?.descriptors) ? r1.descriptors : [];

    // A safe backup blob for copy/paste
    const backup = {
      wallet: w,
      createdAt: new Date().toISOString(),
      descriptors,
    };

    res.json({ ok: true, wallet: w, descriptors, backup });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});


// POST /api/wallet/descriptors/import
// body: { backup } where backup is the object returned by export (or at least {descriptors:[...]}).
r.post("/descriptors/import", async (req, res) => {
  const w = wname(req);

  if (req.session?.totpOk !== true) return res.status(403).json({ error: "totp_required" });

  const { backup, rescan = true } = req.body || {};
  const descriptors = backup?.descriptors;

  if (!Array.isArray(descriptors) || descriptors.length === 0) {
    return res.status(400).json({ error: "missing_descriptors" });
  }

  try {
    const st = await ensureWalletLoaded(rpc, w);
    if (st?.missing) return res.status(404).json({ error: "wallet_missing", wallet: w });
    if (st && st.ok === false) return res.status(500).json({ error: st.error || "wallet_load_failed", wallet: w });

    // importdescriptors expects [{desc,timestamp,active,internal,label}, ...]
    const payload = descriptors.map(d => ({
      desc: d.desc,
      active: true,
      internal: !!d.internal,
      // Use original timestamp if present, otherwise "now"
      timestamp: d.timestamp ?? "now",
      label: d.label || "",
    }));

    const result = await rpc("importdescriptors", [payload], { wallet: w });

    // optional: rescanblockchain, but importdescriptors with timestamp is usually enough
    // If you want explicit scan when rescan=true:
    // if (rescan) await rpc("rescanblockchain", [0], { wallet: w });

    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});


  return r;
}
