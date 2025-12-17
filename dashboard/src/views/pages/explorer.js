export function explorerPage() {
  return `
  <div class="search">
    <input id="q" class="mono" placeholder="Search block height / block hash / txid / address…" autocomplete="off" />
    <button class="btn" id="go">Search</button>
  </div>

  <div class="grid">
    <div class="card">
      <div class="row">
        <h2 style="margin:0">Live</h2>
        <div class="tabs" id="tabs">
          <button class="tab active" data-view="latest" type="button">Latest Blocks</button>
          <button class="tab" data-view="mempool" type="button">Mempool</button>
          <button class="tab" data-view="inspect" type="button">Inspect</button>
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
  `;
}
