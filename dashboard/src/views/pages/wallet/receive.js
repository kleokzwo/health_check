export function walletReceivePage() {
  return `
  <div class="wallet-dashboard">
    <div class="grid-2col">
      <div class="card dashboard">
        <div class="row">
          <h2 style="margin:0">Receive</h2>
          <div class="tabs">
            <a class="tab" href="/wallet/dashboard" style="text-decoration:none;">Overview</a>
            <a class="tab active" href="/wallet/receive" style="text-decoration:none;">Receive</a>
            <a class="tab" href="/wallet/send" style="text-decoration:none;">Send</a>
            <a class="tab" href="/wallet/settings" style="text-decoration:none;">Settings</a>
          </div>
        </div>

        <div class="sub" style="margin-top:10px;">Generate a fresh receiving address.</div>

        <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
          <button class="btn" id="newBtn">New address</button>
          <button class="btn" id="refreshBtn">Refresh</button>
        </div>

        <div class="card" style="margin-top:12px;">
          <div class="sub">Current address</div>
          <div id="addr" class="mono" style="margin-top:8px; word-break:break-all;">-</div>
          <div id="msg" class="sub" style="margin-top:10px;"></div>
        </div>
      </div>

      <div class="card">
        <h2>Status</h2>
        <div id="status" class="loading">Loading…</div>
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

    async function refresh(){
      try {
        const sum = await jfetch("/api/wallet/summary", { method:"GET" });
        document.getElementById("status").classList.remove("loading");
        document.getElementById("status").innerHTML =
          "<div class='kvs'>" +
            "<div class='kv'><div class='k'>Wallet</div><div class='v mono'>"+sum.wallet+"</div></div>" +
            "<div class='kv'><div class='k'>Balance</div><div class='v mono'>"+sum.balance+"</div></div>" +
            "<div class='kv'><div class='k'>Tx count</div><div class='v mono'>"+sum.txcount+"</div></div>" +
          "</div>";
      } catch (e) {
        const m = String(e.message || e);
        if (m.includes("not_logged_in") || m.includes("session_expired")) { location.href="/wallet/login"; return; }
        if (m.includes("wallet_missing")) {
          document.getElementById("status").classList.remove("loading");
          document.getElementById("status").innerHTML =
            "<div class='sub'>Wallet not created yet. Go to Overview and click Create Wallet.</div>";
          return;
        }
        document.getElementById("status").classList.remove("loading");
        document.getElementById("status").innerHTML = "<div class='sub'>Error: "+e.message+"</div>";
      }
    }

    document.getElementById("newBtn").onclick = async () => {
      const msg = document.getElementById("msg");
      msg.textContent = "Generating…";
      try {
        const r = await jfetch("/api/wallet/receive/new", { method:"POST", body:"{}" });
        document.getElementById("addr").textContent = r.address;
        msg.textContent = "OK";
      } catch (e) {
        const m = String(e.message || e);
        if (m.includes("not_logged_in") || m.includes("session_expired")) { location.href="/wallet/login"; return; }
        if (m.includes("wallet_missing")) { msg.textContent = "Wallet not created yet."; return; }
        msg.textContent = "Error: " + e.message;
      }
    };

    document.getElementById("refreshBtn").onclick = () => refresh();

    let last = Date.now();
    ["mousemove","keydown","click","touchstart"].forEach(ev => window.addEventListener(ev, () => last = Date.now()));
    setInterval(() => { if(Date.now()-last > 15*60_000) location.href="/wallet/logout"; }, 5000);

    refresh();
  </script>
  `;
}
