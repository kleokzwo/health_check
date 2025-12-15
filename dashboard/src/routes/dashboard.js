import express from "express";
import { createNodeService } from "../services/nodeService.js";



export function dashboardRouter() {
  const router = express.Router();
  const node = createNodeService();

  router.get("/", async (req, res) => {
    try {
      const [bc, net, mem] = await Promise.all([
        node.getBlockchainInfo(),
        node.getNetworkInfo(),
        node.getMempoolInfo(),
      ]);

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BitcoinII Dashboard</title>
  <link rel="stylesheet" href="/public/shared/app.css" />
</head>
<body>
  <div class="wrap">
    <div class="nav">
      <div class="brand">
        <div class="logo"></div>
        <div class="title">
          <b>BitcoinII</b>
          <span class="mono">Health + Explorer • RPC: ${process.env.RPC_HOST || "bitcoinii"}:${process.env.RPC_PORT || "8337"}</span>
        </div>
      </div>

      <div class="navlinks">
        <a class="active" href="/">Health</a>
        <a href="/explorer">Explorer</a>
      </div>

      <div class="pillrow">
        <div class="pill"><span class="dot ok"></span><span>online</span></div>
        <div class="pill">Peers <b>${net.connections ?? "-"}</b></div>
        <div class="pill">Mempool <b>${mem.size ?? "-"}</b></div>
      </div>
    </div>

    <div class="card">
      <div class="grid">
        <div class="kv"><div class="k">Chain</div><div class="v">${bc.chain ?? "-"}</div></div>
        <div class="kv"><div class="k">Blocks</div><div class="v">${bc.blocks ?? "-"}</div></div>
        <div class="kv"><div class="k">Headers</div><div class="v">${bc.headers ?? "-"}</div></div>

        <div class="kv"><div class="k">Initial Block Download</div><div class="v">${bc.initialblockdownload ? "yes" : "no"}</div></div>
        <div class="kv"><div class="k">Peers</div><div class="v">${net.connections ?? "-"}</div></div>
        <div class="kv"><div class="k">Version</div><div class="v mono">${net.subversion || "-"}</div></div>

        <div class="kv"><div class="k">Mempool TX</div><div class="v">${mem.size ?? "-"}</div></div>
        <div class="kv"><div class="k">Mempool Usage</div><div class="v">${formatBytes(mem.usage)}</div></div>
        <div class="kv"><div class="k">Min Relay Fee</div><div class="v mono">${mem.mempoolminfee ?? "-"}</div></div>
      </div>

      <div class="sub" style="margin-top:12px">
        Tip: <span class="mono">/health</span> returns JSON for probes, and later Grafana/Prometheus.
      </div>
    </div>
  </div>
</body>
</html>`;

      res.setHeader("content-type", "text/html; charset=utf-8");
      res.send(html);
    } catch (e) {
      res.status(500).send(`Dashboard error: ${e.message}`);
    }
  });

  return router;
}

function formatBytes(n) {
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
