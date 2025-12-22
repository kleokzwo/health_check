export function walletDashboardPage() {
  return `
  <div class="wallet-dashboard">
  <div class="grid-2col">
    <div class="card dashboard">
      <div class="row">
        <h2 style="margin:0">Wallet</h2>
        <div class="tabs">
          <a class="tab active" href="/wallet/dashboard" style="text-decoration:none;">Overview</a>
          <a class="tab" href="/wallet/receive" style="text-decoration:none;">Receive</a>
          <a class="tab" href="/wallet/send" style="text-decoration:none;">Send</a>
          <a class="tab" href="/wallet/settings" style="text-decoration:none;">Settings</a>
        </div>
      </div>

      <div id="overview" class="loading" style="margin-top:10px;">Loading…</div>

      <div style="display:flex; gap:10px; margin-top:12px;">
        <button class="btn" id="createWalletBtn">Create Wallet (once)</button>
        <button class="btn" id="refreshBtn">Refresh</button>
      </div>

      <div id="msg" class="sub" style="margin-top:10px;"></div>
    </div>

    <div class="card">
      <h2>Latest Transactions</h2>
      <div id="txs" class="loading">Loading…</div>
    </div>
  </div>
  </div>

  <script>
    async function jfetch(url, opts){
      const res = await fetch(url, Object.assign({headers:{"content-type":"application/json"}}, opts));
      const data = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error || ("HTTP "+res.status));
      return data;
    }

    function renderTxs(txs){
      if(!txs.length) return "<div class='sub'>No transactions yet.</div>";
      return "<div class='kvs'>" + txs.slice(0,15).map(t =>
        "<div class='v mono'>" +
          "<span class='tx-cat'>"+ new Date((t.time||0)*1000).toLocaleString() +"</span>" +
          "<span class='tx-amt'>"+(t.category||"")+" "+(t.amount??"")+" (conf: "+(t.confirmations??"")+")</span>" +
          "<span class='tx-conf'>"+(t.txid||"")+"</span>" +
        "</div>"
      ).join("") + "</div>";
    }

    function showWalletMissing(){
      document.getElementById("overview").classList.remove("loading");
      document.getElementById("overview").innerHTML =
        "<div class='sub'>Wallet not created yet. Click <b>Create Wallet (once)</b>.</div>";
      document.getElementById("txs").classList.remove("loading");
      document.getElementById("txs").innerHTML = "<div class='sub'>No wallet yet.</div>";
    }

    async function load(){
      const msg = document.getElementById("msg");
      msg.textContent = "";

      let sum;
      try {
        sum = await jfetch("/api/wallet/summary", { method:"GET" });
      } catch (e) {
        const m = String(e.message || e);
        if (m.includes("not_logged_in") || m.includes("session_expired")) {
          location.href = "/wallet/login";
          return;
        }
        if (m.includes("wallet_missing")) {
          showWalletMissing();
          return;
        }
        throw e;
      }

      document.getElementById("overview").classList.remove("loading");
      document.getElementById("overview").innerHTML =
        "<div class='kvs'>" +
          "<div class='kv'><div class='k'>Wallet</div><div class='v mono'>"+sum.wallet+"</div></div>" +
          "<div class='kv'><div class='k'>Balance</div><div class='v mono'>"+sum.balance+"</div></div>" +
          "<div class='kv'><div class='k'>Unconfirmed</div><div class='v mono'>"+sum.unconfirmed+"</div></div>" +
          "<div class='kv'><div class='k'>Tx count</div><div class='v mono'>"+sum.txcount+"</div></div>" +
        "</div>";

      const tx = await jfetch("/api/wallet/txs?n=25", { method:"GET" });
      document.getElementById("txs").classList.remove("loading");
      document.getElementById("txs").innerHTML = renderTxs(tx.txs || []);
    }

    document.getElementById("refreshBtn").onclick = () => load().catch(e => {
      document.getElementById("msg").textContent = "Error: " + e.message;
    });

    document.getElementById("createWalletBtn").onclick = async () => {
      const msg = document.getElementById("msg");
      msg.textContent = "Creating wallet…";
      try {
        await jfetch("/api/wallet/create", { method:"POST", body:"{}" });
        msg.textContent = "Wallet created.";
        await load();
      } catch (e) {
        const m = String(e.message || e);
        if (m.includes("not_logged_in") || m.includes("session_expired")) {
          location.href = "/wallet/login";
          return;
        }
        msg.textContent = "Error: " + e.message;
      }
    };

    // client idle logout helper (server should enforce too)
    let last = Date.now();
    ["mousemove","keydown","click","touchstart"].forEach(ev => window.addEventListener(ev, () => last = Date.now()));
    setInterval(() => { if(Date.now()-last > 15*60_000) location.href="/wallet/logout"; }, 5000);

    load().catch(e => document.getElementById("msg").textContent = "Error: " + e.message);
  </script>
  `;
}
