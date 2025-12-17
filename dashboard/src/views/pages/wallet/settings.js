export function walletSettingsPage() {
  return `
  <div class="grid">
    <div class="card">
      <div class="row">
        <h2 style="margin:0">Settings</h2>
        <div class="tabs">
          <a class="tab" href="/wallet/dashboard" style="text-decoration:none;">Overview</a>
          <a class="tab" href="/wallet/receive" style="text-decoration:none;">Receive</a>
          <a class="tab" href="/wallet/send" style="text-decoration:none;">Send</a>
          <a class="tab active" href="/wallet/settings" style="text-decoration:none;">Settings</a>
        </div>
      </div>

      <div class="card" style="margin-top:12px;">
        <h2 style="margin-top:0;">TOTP / 2FA</h2>

        <div id="totpStatus" class="sub">Loading…</div>

        <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
          <button class="btn" id="enrollBtn">Enable TOTP</button>
          <button class="btn" id="disableBtn">Disable TOTP</button>
        </div>

        <div id="enrollBox" style="display:none; margin-top:12px;">
          <div class="sub">Scan QR in Google Authenticator / Aegis / Authy:</div>
          <img id="qr" alt="TOTP QR" style="margin-top:10px; max-width:220px; border-radius:12px;" />
          <div class="sub" style="margin-top:10px;">Then enter 6-digit code to confirm:</div>
          <input id="code" class="mono" placeholder="123456" autocomplete="one-time-code" />
          <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="btn" id="confirmBtn">Confirm</button>
          </div>
        </div>

        <div id="msg" class="sub" style="margin-top:10px;"></div>
      </div>

      <div class="sub" style="margin-top:12px;">
        If you deploy on a VPS, treat it like a hot wallet.
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

    async function loadStatus(){
      const s = await jfetch("/api/totp/status", { method:"GET" });
      document.getElementById("totpStatus").textContent = s.enabled ? "TOTP is ENABLED" : "TOTP is DISABLED";
    }

    document.getElementById("enrollBtn").onclick = async () => {
      const msg = document.getElementById("msg");
      msg.textContent = "Starting enrollment…";
      try {
        const r = await jfetch("/api/totp/enroll", { method:"POST", body:"{}" });
        document.getElementById("qr").src = r.qrDataUrl;
        document.getElementById("enrollBox").style.display = "block";
        msg.textContent = "Scan QR and confirm.";
      } catch(e){ msg.textContent = "Error: " + e.message; }
    };

    document.getElementById("confirmBtn").onclick = async () => {
      const msg = document.getElementById("msg");
      msg.textContent = "Confirming…";
      try {
        const code = document.getElementById("code").value.trim();
        await jfetch("/api/totp/enable", { method:"POST", body: JSON.stringify({ code }) });
        document.getElementById("enrollBox").style.display = "none";
        msg.textContent = "TOTP enabled.";
        await loadStatus();
      } catch(e){ msg.textContent = "Error: " + e.message; }
    };

    document.getElementById("disableBtn").onclick = async () => {
      const msg = document.getElementById("msg");
      const code = prompt("Enter your 6-digit TOTP code to disable:");
      if (!code) return;
      msg.textContent = "Disabling…";
      try {
        await jfetch("/api/totp/disable", { method:"POST", body: JSON.stringify({ code: String(code).trim() }) });
        msg.textContent = "TOTP disabled.";
        await loadStatus();
      } catch(e){ msg.textContent = "Error: " + e.message; }
    };

    loadStatus().catch(e => {
      if (String(e.message).includes("not_logged_in")) location.href="/wallet/login";
      else document.getElementById("totpStatus").textContent = "Error: " + e.message;
    });

    let last = Date.now();
    ["mousemove","keydown","click","touchstart"].forEach(ev => window.addEventListener(ev, () => last = Date.now()));
    setInterval(() => { if(Date.now()-last > 15*60_000) location.href="/wallet/logout"; }, 5000);
  </script>
  `;
}
