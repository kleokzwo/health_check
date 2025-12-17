import { formatBytes } from "../utils.js";

export function healthPage({ bc, net, mem }) {
  return `
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
      Tip: <span class="mono">/health</span> returns JSON for probes.
    </div>
  </div>`;
}
