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

app.listen(3000, "0.0.0.0", () => {
  console.log("Dashboard listening on :3000");
});
