export function walletSendPage() {
  return `
  <div class="wallet-dashboard">
    <div class="grid-2col">
      <div class="card dashboard">
        <div class="row">
          <h2 style="margin:0">Send</h2>
          <div class="tabs">
            <a class="tab" href="/wallet/dashboard" style="text-decoration:none;">Overview</a>
            <a class="tab" href="/wallet/receive" style="text-decoration:none;">Receive</a>
            <a class="tab active" href="/wallet/send" style="text-decoration:none;">Send</a>
            <a class="tab" href="/wallet/settings" style="text-decoration:none;">Settings</a>
          </div>
        </div>

        <div class="sub" style="margin-top:10px;">
          Spending is locked by default. Click “Unlock spending (5 min)” first.
        </div>

        <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
          <button class="btn" id="unlockBtn">Unlock spending (5 min)</button>
        </div>

        <div style="margin-top:12px;">
          <label class="sub" for="to">To address</label>
          <input id="to" class="mono" placeholder="BC2 address" autocomplete="off" />

          <label for="amt" class="sub" style="margin-top:10px;">Amount</label>
          <input id="amt" class="mono" placeholder="e.g. 0.01" autocomplete="off" />

          <div style="display:flex; gap:10px; margin-top:12px;">
            <button class="btn" id="sendBtn">Send</button>
          </div>
          <div id="msg" class="sub" style="margin-top:10px;"></div>
        </div>
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
      return "<div class='kvs'>" + txs.slice(0,10).map(t =>
        "<div class='kv'><div class='k mono'>"+ new Date((t.time||0)*1000).toLocaleString() +
        "</div><div class='v mono'>"+(t.category||"")+" "+(t.amount??"")+" (conf: "+(t.confirmations??"")+
        ")</div><div class='sub mono'>"+(t.txid||"")+"</div></div>"
      ).join("") + "</div>";
    }

    async function refreshTxs(){
      try {
        const tx = await jfetch("/api/wallet/txs?n=20", { method:"GET" });
        document.getElementById("txs").classList.remove("loading");
        document.getElementById("txs").innerHTML = renderTxs(tx.txs || []);
      } catch (e) {
        const m = String(e.message || e);
        if (m.includes("not_logged_in") || m.includes("session_expired")) { location.href="/wallet/login"; return; }
        document.getElementById("txs").classList.remove("loading");
        document.getElementById("txs").innerHTML = "<div class='sub'>Error: "+e.message+"</div>";
      }
    }

    document.getElementById("unlockBtn").onclick = async () => {
      const msg = document.getElementById("msg");
      msg.textContent = "Unlocking…";
      try {
        await jfetch("/api/wallet/unlock", { method:"POST", body:"{}" });
        msg.textContent = "Unlocked for ~5 minutes.";
      } catch (e) {
        const m = String(e.message || e);
        if (m.includes("not_logged_in") || m.includes("session_expired")) { location.href="/wallet/login"; return; }
        msg.textContent = "Error: " + e.message;
      }
    };

    document.getElementById("sendBtn").onclick = async () => {
      const msg = document.getElementById("msg");
      msg.textContent = "Sending…";
      try {
        const address = document.getElementById("to").value.trim();
        const amount = document.getElementById("amt").value.trim();
        const r = await jfetch("/api/wallet/send", { method:"POST", body: JSON.stringify({ address, amount }) });
        msg.textContent = "TXID: " + r.txid;
        await refreshTxs();
      } catch (e) {
        const m = String(e.message || e);
        if (m.includes("not_logged_in") || m.includes("session_expired")) { location.href="/wallet/login"; return; }
        msg.textContent = "Error: " + e.message + (m.includes("locked") ? " (unlock first)" : "");
      }
    };

    let last = Date.now();
    ["mousemove","keydown","click","touchstart"].forEach(ev => window.addEventListener(ev, () => last = Date.now()));
    setInterval(() => { if(Date.now()-last > 15*60_000) location.href="/wallet/logout"; }, 5000);

    refreshTxs();
  </script>
  `;
}
