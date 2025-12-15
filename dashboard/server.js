import express from "express";
import fs from "fs";

const app = express();

const RPC_HOST = process.env.RPC_HOST || "bitcoinii";
const RPC_PORT = process.env.RPC_PORT || "8337";

// Fallback auth (only used if RPC_COOKIE is not present/readable)
const RPC_USER = process.env.RPC_USER || "bc2";
const RPC_PASS = process.env.RPC_PASS || "_4rm4D1%%";

// Preferred auth: cookie file (e.g. /data/.cookie mounted from the node datadir)
const RPC_COOKIE = process.env.RPC_COOKIE || "";

/**
 * Returns a value suitable for the HTTP "Authorization" header (Basic ...)
 * Prefers cookie auth, falls back to RPC_USER/RPC_PASS.
 */
function getAuthorizationHeader() {
  // Cookie content format: "user:password"
  if (RPC_COOKIE) {
    try {
      if (fs.existsSync(RPC_COOKIE)) {
        const cookie = fs.readFileSync(RPC_COOKIE, "utf8").trim();
        if (cookie.includes(":")) {
          return "Basic " + Buffer.from(cookie).toString("base64");
        }
      }
    } catch (e) {
      // ignore and fall back
    }
  }

  if (RPC_USER && RPC_PASS) {
    return "Basic " + Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString("base64");
  }

  return null;
}

async function rpc(method, params = []) {
  const url = `http://${RPC_HOST}:${RPC_PORT}/`;
  const body = JSON.stringify({
    jsonrpc: "1.0",
    id: "dash",
    method,
    params,
  });

  const auth = getAuthorizationHeader();
  if (!auth) {
    throw new Error("No RPC auth available (set RPC_COOKIE or RPC_USER/RPC_PASS).");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": auth,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`RPC HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(`RPC error: ${JSON.stringify(data.error)}`);
  return data.result;
}

function fmtBytes(n) {
  if (n == null) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let x = Number(n);
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  return `${x.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

app.get("/", async (req, res) => {
  try {
    const [bc, net, mem] = await Promise.all([
      rpc("getblockchaininfo"),
      rpc("getnetworkinfo"),
      rpc("getmempoolinfo"),
    ]);

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BitcoinII Node Dashboard</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 24px; max-width: 900px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
    .card { border: 1px solid #ddd; border-radius: 14px; padding: 14px 16px; }
    h1 { margin: 0 0 10px; }
    .k { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .v { font-size: 22px; margin-top: 6px; }
    .ok { color: #0a7; }
    code { background:#f6f6f6; padding:2px 6px; border-radius:8px; }
  </style>
</head>
<body>
  <h1>BitcoinII Dashboard</h1>
  <p>Status: <span class="ok"><b>online</b></span> • RPC: <code>${RPC_HOST}:${RPC_PORT}</code></p>

  <div class="grid">
    <div class="card">
      <div class="k">Chain</div>
      <div class="v">${bc.chain}</div>
    </div>
    <div class="card">
      <div class="k">Blocks</div>
      <div class="v">${bc.blocks}</div>
    </div>
    <div class="card">
      <div class="k">Headers</div>
      <div class="v">${bc.headers}</div>
    </div>
    <div class="card">
      <div class="k">Initial Block Download</div>
      <div class="v">${bc.initialblockdownload ? "yes" : "no"}</div>
    </div>

    <div class="card">
      <div class="k">Peers</div>
      <div class="v">${net.connections}</div>
    </div>
    <div class="card">
      <div class="k">Version</div>
      <div class="v">${net.subversion || "-"}</div>
    </div>

    <div class="card">
      <div class="k">Mempool TX</div>
      <div class="v">${mem.size}</div>
    </div>
    <div class="card">
      <div class="k">Mempool Usage</div>
      <div class="v">${fmtBytes(mem.usage)}</div>
    </div>
  </div>

  <p style="margin-top:16px;color:#777;font-size:13px;">
    Tip: cookie auth is preferred. Mount the node datadir and set <code>RPC_COOKIE=/data/.cookie</code>.
  </p>
</body>
</html>`;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    res.status(500).send(`Dashboard error: ${e.message}`);
  }
});

app.get("/health", async (req, res) => {
  try {
    await rpc("getblockchaininfo");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Explorer helpers ---
async function getBestHeight() {
  const bc = await rpc("getblockchaininfo");
  return bc.blocks;
}

async function getBlockHashByHeight(height) {
  return rpc("getblockhash", [height]);
}

async function getBlockByHash(hash) {
  // verbosity=2 includes tx decoded (can be heavy for large blocks)
  return rpc("getblock", [hash, 2]);
}

async function getBlockHeaderByHash(hash) {
  return rpc("getblockheader", [hash, true]);
}

async function getTxVerbose(txid) {
  // verbose=true -> decoded JSON
  // requires txindex=1 for arbitrary historical txs (typical)
  return rpc("getrawtransaction", [txid, true]);
}

// --- Explorer API ---
app.get("/api/blocks", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
    const tip = await getBestHeight();

    const heights = [];
    for (let h = tip; h > tip - limit && h >= 0; h--) heights.push(h);

    // Fetch headers quickly (lighter than full blocks)
    const out = [];
    for (const h of heights) {
      const hash = await getBlockHashByHeight(h);
      const hdr = await getBlockHeaderByHash(hash);
      out.push({
        height: h,
        hash,
        time: hdr.time,
        mediantime: hdr.mediantime,
        confirmations: hdr.confirmations,
        difficulty: hdr.difficulty,
        tx_count: hdr.nTx,
        previousblockhash: hdr.previousblockhash,
        nextblockhash: hdr.nextblockhash,
        size: hdr.size, // may be undefined on some forks; harmless
      });
    }

    res.json({ tip, blocks: out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/block/:id", async (req, res) => {
  try {
    const id = req.params.id;

    let hash;
    if (/^\d+$/.test(id)) {
      const height = Number(id);
      hash = await getBlockHashByHeight(height);
    } else {
      hash = id;
    }

    const block = await rpc("getblock", [hash, 1]);

    // Trim response a bit (blocks can be huge). Keep tx list but remove scripts if you want later.
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
      tx: block.tx, // decoded txs (verbosity=2). If too heavy, switch getblock verbosity to 1 and only return txids.
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/tx/:txid", async (req, res) => {
  try {
    const txid = req.params.txid;

    const tx = await getTxVerbose(txid);
    res.json(tx);
  } catch (e) {
    // Helpful hint when txindex is missing
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

app.get("/api/mempool", async (req, res) => {
  try {
    const info = await rpc("getmempoolinfo");
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));

    // This returns txids; lightweight and useful for “recent mempool”
    const txids = await rpc("getrawmempool", [false]);
    res.json({
      info,
      sample: txids.slice(0, limit),
      total_txids: txids.length,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Optional simple HTML explorer pages ---
app.get("/explorer", async (req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(`
    <h1>Explorer</h1>
    <ul>
      <li><a href="/api/blocks?limit=10">/api/blocks?limit=10</a></li>
      <li>Block: <code>/api/block/&lt;height-or-hash&gt;</code></li>
      <li>Tx: <code>/api/tx/&lt;txid&gt;</code> (best with <code>-txindex=1</code>)</li>
      <li><a href="/api/mempool?limit=50">/api/mempool?limit=50</a></li>
    </ul>
  `);
});

app.get("/b/:id", async (req, res) => {
  // simple redirect to JSON (easy start)
  res.redirect(`/api/block/${encodeURIComponent(req.params.id)}`);
});

app.get("/t/:txid", async (req, res) => {
  res.redirect(`/api/tx/${encodeURIComponent(req.params.txid)}`);
});

// --- Address (UTXO scan) ---
// Note: This does NOT provide full address history without an indexer.
// It returns current UTXOs and total amount for that address via scantxoutset.
app.get("/api/address/:addr", async (req, res) => {
  try {
    const addr = req.params.addr;

    // Bitcoin Core-style descriptor
    const descriptor = `addr(${addr})`;

    // action="start"
    const result = await rpc("scantxoutset", ["start", [descriptor]]);

    // result example (Core-like):
    // { success, txouts, height, bestblock, unspents:[{txid,vout,scriptPubKey,amount, ...}] }
    res.json({
      address: addr,
      height: result.height,
      bestblock: result.bestblock,
      txouts: result.txouts,
      total_amount: result.total_amount ?? result.total_amount, // some forks differ; keep raw too
      unspents: result.unspents || [],
      raw: result,
      note:
        "This is a UTXO scan (current unspent outputs). Full transaction history requires an indexer.",
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let closed = false;
  req.on("close", () => (closed = true));

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // initial ping
  send("hello", { ok: true });

  const timer = setInterval(async () => {
    if (closed) return clearInterval(timer);
    try {
      const [bc, mem, net] = await Promise.all([
        rpc("getblockchaininfo"),
        rpc("getmempoolinfo"),
        rpc("getnetworkinfo"),
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

  // keep alive
  const ka = setInterval(() => {
    if (closed) return clearInterval(ka);
    res.write(": keep-alive\n\n");
  }, 15000);
});

app.get("/explorer-ui", (req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BitcoinII Explorer</title>
<style>
  :root{
    --bg:#0b1020;
    --card:#101a33;
    --card2:#0f1730;
    --text:#e7ecff;
    --muted:#98a6d6;
    --line:rgba(255,255,255,.08);
    --good:#38d39f;
    --warn:#ffcc66;
    --bad:#ff6b6b;
    --accent:#7aa2ff;
    --shadow: 0 12px 30px rgba(0,0,0,.35);
    --radius: 18px;
  }
  *{box-sizing:border-box}
  body{
    margin:0;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    background: radial-gradient(1200px 800px at 25% 0%, #182a66 0%, transparent 55%),
                radial-gradient(1000px 700px at 90% 10%, #2a1466 0%, transparent 50%),
                linear-gradient(180deg, var(--bg), #070a14 100%);
    color:var(--text);
  }
  a{color:inherit; text-decoration:none}
  .wrap{max-width:1180px; margin:0 auto; padding:26px 18px 60px;}
  .top{
    display:flex; gap:14px; align-items:center; justify-content:space-between; flex-wrap:wrap;
    margin-bottom:14px;
  }
  .brand{
    display:flex; align-items:center; gap:12px;
  }
  .logo{
    width:44px; height:44px; border-radius:14px;
    background: linear-gradient(135deg, rgba(122,162,255,.9), rgba(56,211,159,.9));
    box-shadow: var(--shadow);
  }
  .title{
    display:flex; flex-direction:column;
  }
  .title b{font-size:16px; letter-spacing:.3px}
  .title span{color:var(--muted); font-size:12px; margin-top:2px}
  .pillrow{display:flex; gap:10px; flex-wrap:wrap; align-items:center}
  .pill{
    background: rgba(255,255,255,.06);
    border: 1px solid var(--line);
    padding:8px 10px;
    border-radius: 999px;
    font-size:12px;
    color:var(--muted);
    display:flex; gap:8px; align-items:center;
  }
  .dot{width:8px; height:8px; border-radius:999px; background:var(--warn)}
  .dot.ok{background:var(--good)}
  .dot.bad{background:var(--bad)}
  .search{
    display:flex; gap:10px; align-items:center; flex: 1 1 420px;
    background: rgba(255,255,255,.06);
    border:1px solid var(--line);
    border-radius: 999px;
    padding:10px 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,.25);
  }
  .search input{
    width:100%;
    background:transparent;
    border:none;
    outline:none;
    color:var(--text);
    font-size:14px;
  }
  .btn{
    background: linear-gradient(135deg, rgba(122,162,255,.95), rgba(56,211,159,.95));
    border:none;
    color:#0a1020;
    font-weight:700;
    padding:10px 14px;
    border-radius: 999px;
    cursor:pointer;
  }
  .grid{
    display:grid;
    grid-template-columns: 1.2fr .8fr;
    gap:14px;
    margin-top:14px;
  }
  @media (max-width: 940px){
    .grid{grid-template-columns: 1fr}
  }
  .card{
    background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
    border:1px solid var(--line);
    border-radius: var(--radius);
    padding:14px;
    box-shadow: var(--shadow);
  }
  .card h2{
    margin: 0 0 10px;
    font-size: 14px;
    letter-spacing:.35px;
    color: var(--muted);
    text-transform: uppercase;
  }
  .kvs{
    display:grid;
    grid-template-columns: repeat(4, minmax(0,1fr));
    gap:12px;
  }
  @media (max-width: 700px){
    .kvs{grid-template-columns: repeat(2, minmax(0,1fr))}
  }
  .kv{
    padding:12px;
    border-radius: 14px;
    background: rgba(0,0,0,.18);
    border:1px solid rgba(255,255,255,.06);
  }
  .kv .k{font-size:11px; color:var(--muted); letter-spacing:.3px; text-transform:uppercase}
  .kv .v{font-size:20px; margin-top:6px}
  .sub{font-size:12px; color:var(--muted); margin-top:6px}
  table{
    width:100%;
    border-collapse: collapse;
    overflow:hidden;
    border-radius:14px;
  }
  th, td{
    text-align:left;
    padding:10px 10px;
    border-bottom:1px solid rgba(255,255,255,.06);
    font-size:13px;
  }
  th{color:var(--muted); font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.35px}
  tr:hover td{background: rgba(255,255,255,.03)}
  code{
    background: rgba(0,0,0,.25);
    border:1px solid rgba(255,255,255,.08);
    padding:2px 6px;
    border-radius:10px;
    color: #d6ddff;
  }
  .row{
    display:flex; gap:12px; flex-wrap:wrap; align-items:center; justify-content:space-between;
  }
  .tabs{display:flex; gap:8px; flex-wrap:wrap}
  .tab{
    padding:8px 10px;
    border-radius: 999px;
    border:1px solid var(--line);
    background: rgba(255,255,255,.04);
    color: var(--muted);
    cursor:pointer;
    user-select:none;
    font-size:12px;
  }
  .tab.active{color: var(--text); background: rgba(122,162,255,.18); border-color: rgba(122,162,255,.35)}
  .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace}
  .loading{color: var(--muted); font-size:13px}
  .err{color: var(--bad); font-size:13px; white-space:pre-wrap}
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="brand">
        <div class="logo"></div>
        <div class="title">
          <b>BitcoinII Explorer</b>
          <span class="mono">RPC: ${RPC_HOST}:${RPC_PORT} • UI: /explorer-ui</span>
        </div>
      </div>

      <div class="pillrow">
        <div class="pill"><span class="dot" id="dot"></span><span id="statusText">connecting…</span></div>
        <div class="pill">Tip <b id="tip">-</b></div>
        <div class="pill">Peers <b id="peers">-</b></div>
        <div class="pill">Mempool <b id="mp">-</b></div>
      </div>
    </div>

    <div class="search">
      <input id="q" class="mono" placeholder="Search block height / block hash / txid / address…" autocomplete="off" />
      <button class="btn" id="go">Search</button>
    </div>

    <div class="grid">
      <div class="card">
        <div class="row">
          <h2 style="margin:0">Live</h2>
          <div class="tabs">
            <div class="tab active" data-view="latest">Latest Blocks</div>
            <div class="tab" data-view="mempool">Mempool</div>
            <div class="tab" data-view="inspect">Inspect</div>
          </div>
        </div>
        <div id="live" class="loading" style="margin-top:10px;">Loading…</div>
      </div>

      <div class="card">
        <h2>Chain Stats</h2>
        <div class="kvs">
          <div class="kv"><div class="k">Chain</div><div class="v" id="chain">-</div></div>
          <div class="kv"><div class="k">Headers</div><div class="v" id="headers">-</div></div>
          <div class="kv"><div class="k">IBD</div><div class="v" id="ibd">-</div></div>
          <div class="kv"><div class="k">Mempool Usage</div><div class="v" id="mpUsage">-</div><div class="sub" id="mpFee">-</div></div>
        </div>
        <div style="margin-top:12px" class="sub">
          Tip: address view here is UTXO-only (RPC scan). Full address history needs an indexer.
        </div>
      </div>
    </div>
  </div>

<script>
  const $ = (id) => document.getElementById(id);
  const live = $("live");
  const dot = $("dot");
  const statusText = $("statusText");

  function fmtBytes(n){
    if(n == null) return "-";
    const units = ["B","KB","MB","GB","TB"];
    let i=0, x=Number(n);
    while(x>=1024 && i<units.length-1){ x/=1024; i++; }
    return (i===0? x.toFixed(0) : x.toFixed(2)) + " " + units[i];
  }

  function shortHex(h, n=10){
    if(!h) return "-";
    return h.length <= n ? h : (h.slice(0, n) + "…");
  }

  function setConnected(ok){
    dot.className = "dot " + (ok ? "ok" : "bad");
    statusText.textContent = ok ? "live" : "offline";
  }

  let currentView = "latest";
  let lastInspect = null;

  document.querySelectorAll(".tab").forEach(t => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      currentView = t.dataset.view;
      render();
    });
  });

  $("go").addEventListener("click", () => search($("q").value.trim()));
  $("q").addEventListener("keydown", (e) => { if(e.key === "Enter") search($("q").value.trim()); });

  function classify(q){
    if(!q) return { type:"none" };
    if(/^[0-9]+$/.test(q)) return { type:"height", value:Number(q) };
    if(/^[0-9a-fA-F]{64}$/.test(q)) return { type:"hashOrTx", value:q.toLowerCase() };
    // fallback: treat as address
    return { type:"address", value:q };
  }

  async function api(url){
    const r = await fetch(url);
    const txt = await r.text();
    let data;
    try { data = JSON.parse(txt); } catch { data = txt; }
    if(!r.ok) throw new Error(typeof data === "string" ? data : (data.error || JSON.stringify(data)));
    return data;
  }

  async function search(q){
    const c = classify(q);
    if(c.type === "none") return;

    live.innerHTML = "<div class='loading'>Searching…</div>";
    lastInspect = null;
    currentView = "inspect";
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    document.querySelector(".tab[data-view='inspect']").classList.add("active");

    try{
      if(c.type === "height"){
        const b = await api("/api/block/" + c.value);
        lastInspect = { kind:"block", data:b };
      } else if(c.type === "hashOrTx"){
        // try block first; if fails, try tx
        try{
          const b = await api("/api/block/" + c.value);
          lastInspect = { kind:"block", data:b };
        } catch(e1){
          const t = await api("/api/tx/" + c.value);
          lastInspect = { kind:"tx", data:t };
        }
      } else if(c.type === "address"){
        const a = await api("/api/address/" + encodeURIComponent(c.value));
        lastInspect = { kind:"address", data:a };
      }
      render();
    } catch(e){
      live.innerHTML = "<div class='err'>"+ String(e.message || e) +"</div>";
    }
  }

  async function renderLatest(){
    const data = await api("/api/blocks?limit=12");
    const rows = data.blocks.map(b => \`
      <tr>
        <td class="mono"><a href="#" onclick="window.__openBlock('\${b.height}');return false;"><b>\${b.height}</b></a></td>
        <td class="mono">\${shortHex(b.hash, 18)}</td>
        <td>\${b.tx_count ?? "-"}</td>
        <td>\${new Date((b.time||0)*1000).toLocaleString()}</td>
      </tr>\`
    ).join("");

    live.innerHTML = \`
      <table>
        <thead><tr><th>Height</th><th>Hash</th><th>TX</th><th>Time</th></tr></thead>
        <tbody>\${rows}</tbody>
      </table>\`;
  }

  async function renderMempool(){
    const data = await api("/api/mempool?limit=40");
    const rows = (data.sample || []).map(txid => \`
      <tr>
        <td class="mono"><a href="#" onclick="window.__openTx('\${txid}');return false;">\${shortHex(txid, 24)}</a></td>
      </tr>\`
    ).join("");

    live.innerHTML = \`
      <div class="sub" style="margin-bottom:10px">
        TX count: <b>\${data.info?.size ?? "-"}</b> • Usage: <b>\${fmtBytes(data.info?.usage)}</b>
      </div>
      <table>
        <thead><tr><th>Recent TXIDs (sample)</th></tr></thead>
        <tbody>\${rows || "<tr><td class='sub'>Mempool empty</td></tr>"}</tbody>
      </table>\`;
  }

  function renderInspect(){
    if(!lastInspect){
      live.innerHTML = "<div class='sub'>Use the search bar above. Try: <code>0</code> (height), a block hash/txid, or an address.</div>";
      return;
    }
    const { kind, data } = lastInspect;

    if(kind === "block"){
      const txCount = Array.isArray(data.tx) ? data.tx.length : (data.tx_count ?? "-");
      const txPreview = Array.isArray(data.tx) ? data.tx.slice(0, 20) : [];
      const txRows = txPreview.map(t => {
        const txid = typeof t === "string" ? t : t.txid;
        return \`<tr><td class="mono"><a href="#" onclick="window.__openTx('\${txid}');return false;">\${shortHex(txid, 30)}</a></td></tr>\`;
      }).join("");

      live.innerHTML = \`
        <div class="sub">Block</div>
        <div style="font-size:18px; margin:6px 0 10px" class="mono"><b>\${data.hash}</b></div>
        <div class="kvs" style="grid-template-columns:repeat(3,minmax(0,1fr));">
          <div class="kv"><div class="k">Height</div><div class="v">\${data.height ?? "-"}</div></div>
          <div class="kv"><div class="k">Confirmations</div><div class="v">\${data.confirmations ?? "-"}</div></div>
          <div class="kv"><div class="k">TX Count</div><div class="v">\${txCount}</div></div>
        </div>
        <div class="sub" style="margin-top:10px">TX preview (first 20)</div>
        <table style="margin-top:6px">
          <thead><tr><th>Txid</th></tr></thead>
          <tbody>\${txRows || "<tr><td class='sub'>No tx list available</td></tr>"}</tbody>
        </table>
      \`;
    }

    if(kind === "tx"){
      const vin = (data.vin || []).slice(0, 10);
      const vout = (data.vout || []).slice(0, 10);
      live.innerHTML = \`
        <div class="sub">Transaction</div>
        <div style="font-size:18px; margin:6px 0 10px" class="mono"><b>\${data.txid || "-"}</b></div>
        <div class="kvs" style="grid-template-columns:repeat(3,minmax(0,1fr));">
          <div class="kv"><div class="k">Size</div><div class="v">\${data.size ?? "-"}</div></div>
          <div class="kv"><div class="k">Confirmations</div><div class="v">\${data.confirmations ?? "-"}</div></div>
          <div class="kv"><div class="k">Blockhash</div><div class="v mono">\${shortHex(data.blockhash, 18)}</div></div>
        </div>

        <div class="sub" style="margin-top:12px">Inputs (first 10)</div>
        <table style="margin-top:6px">
          <thead><tr><th>Prevout</th><th>Vout</th></tr></thead>
          <tbody>\${vin.map(x => \`
            <tr><td class="mono">\${shortHex(x.txid || "coinbase", 24)}</td><td>\${x.vout ?? "-"}</td></tr>\`).join("") || "<tr><td colspan=2 class='sub'>No inputs</td></tr>"}
          </tbody>
        </table>

        <div class="sub" style="margin-top:12px">Outputs (first 10)</div>
        <table style="margin-top:6px">
          <thead><tr><th>N</th><th>Value</th><th>Address</th></tr></thead>
          <tbody>\${vout.map(o => {
            const addr = o.scriptPubKey?.address || (o.scriptPubKey?.addresses && o.scriptPubKey.addresses[0]) || "-";
            return \`<tr><td>\${o.n}</td><td>\${o.value ?? "-"}</td><td class="mono">\${shortHex(addr, 28)}</td></tr>\`;
          }).join("") || "<tr><td colspan=3 class='sub'>No outputs</td></tr>"}
          </tbody>
        </table>
      \`;
    }

    if(kind === "address"){
      const unspents = (data.unspents || []).slice(0, 50);
      const rows = unspents.map(u => \`
        <tr>
          <td class="mono"><a href="#" onclick="window.__openTx('\${u.txid}');return false;">\${shortHex(u.txid, 22)}</a></td>
          <td>\${u.vout}</td>
          <td>\${u.amount ?? "-"}</td>
        </tr>\`).join("");

      live.innerHTML = \`
        <div class="sub">Address (UTXO scan)</div>
        <div style="font-size:18px; margin:6px 0 10px" class="mono"><b>\${data.address}</b></div>

        <div class="kvs" style="grid-template-columns:repeat(3,minmax(0,1fr));">
          <div class="kv"><div class="k">Height</div><div class="v">\${data.height ?? "-"}</div></div>
          <div class="kv"><div class="k">UTXOs</div><div class="v">\${data.txouts ?? (data.unspents?.length ?? "-")}</div></div>
          <div class="kv"><div class="k">Total</div><div class="v">\${data.total_amount ?? "-"}</div><div class="sub">RPC scan result</div></div>
        </div>

        <div class="sub" style="margin-top:12px">Unspents (up to 50)</div>
        <table style="margin-top:6px">
          <thead><tr><th>Txid</th><th>Vout</th><th>Amount</th></tr></thead>
          <tbody>\${rows || "<tr><td colspan=3 class='sub'>No UTXOs found</td></tr>"}</tbody>
        </table>

        <div class="sub" style="margin-top:10px">
          Note: full address history requires an indexer (Esplora/Electrum server/custom DB).
        </div>
      \`;
    }
  }

  async function render(){
    try{
      if(currentView === "latest") return await renderLatest();
      if(currentView === "mempool") return await renderMempool();
      return renderInspect();
    } catch(e){
      live.innerHTML = "<div class='err'>"+ String(e.message || e) +"</div>";
    }
  }

  // Deep-link helpers (from tables)
  window.__openBlock = (id) => { $("q").value = id; search(id); };
  window.__openTx = (txid) => { $("q").value = txid; search(txid); };

  // Real-time stats (SSE)
  function startStream(){
    const es = new EventSource("/api/stream");
    es.addEventListener("stats", (ev) => {
      setConnected(true);
      const s = JSON.parse(ev.data);
      $("tip").textContent = s.tip ?? "-";
      $("headers").textContent = s.headers ?? "-";
      $("chain").textContent = s.chain ?? "-";
      $("ibd").textContent = s.ibd ? "yes" : "no";
      $("peers").textContent = s.peers ?? "-";
      $("mp").textContent = s.mempool?.size ?? "-";
      $("mpUsage").textContent = fmtBytes(s.mempool?.usage);
      $("mpFee").textContent = "min relay: " + (s.mempool?.mempoolminfee ?? "-");
    });
    es.addEventListener("error", () => {
      setConnected(false);
    });
  }

  // initial render + stream
  render();
  startStream();
</script>
</body>
</html>`);
});


app.listen(3000, "0.0.0.0", () => {
  console.log("Dashboard listening on :3000");
});
