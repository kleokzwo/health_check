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

      <!-- Danger Zone -->
      <div class="card" style="margin-top:12px;">
        <h2 style="margin-top:0;">Danger Zone</h2>
        <div class="sub">
          Descriptor backup is the correct backup for modern (descriptor) wallets.
          Keep it private. If someone gets this, they may be able to recover your wallet.
          TOTP is required.
        </div>

        <div style="display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); margin-top:12px;">
          <div class="card" style="margin:0;">
            <div class="sub">Export wallet descriptors (Backup)</div>

            <div id="descExportMsg" class="sub" style="margin-top:8px;"></div>

            <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
              <button class="btn" id="btnDescExport">Export</button>
              <button class="btn" id="btnDescDownload" disabled>Download</button>
              <button class="btn" id="btnDescCopy" disabled>Copy</button>
              <button class="btn" id="btnDescClear">Clear</button>
            </div>

            <pre id="descOut" class="mono"
              style="white-space:pre-wrap; margin-top:10px; max-height:360px; overflow:auto; padding:10px; border-radius:12px; background:rgba(0,0,0,0.25);"></pre>
          </div>

          <div class="card" style="margin:0;">
            <div class="sub">Import wallet descriptors (Backup JSON)</div>
            <textarea id="descIn" class="mono" placeholder='Paste backup JSON here…'
              style="width:100%; margin-top:8px; min-height:200px; resize:vertical;"></textarea>

            <label class="sub" style="display:flex; gap:8px; align-items:center; margin-top:8px">
              <input type="checkbox" id="descRescan" checked />
              Rescan (recommended)
            </label>

            <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
              <button class="btn" id="btnDescImport">Import</button>
              <button class="btn" id="btnDescClearIn">Clear</button>
            </div>

            <pre id="descMsg" class="mono"
              style="white-space:pre-wrap; margin-top:10px; max-height:220px; overflow:auto; padding:10px; border-radius:12px; background:rgba(0,0,0,0.25);"></pre>
          </div>
        </div>
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

    function downloadTextFile(filename, text) {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function loadStatus(){
      const s = await jfetch("/api/totp/status", { method:"GET" });
      document.getElementById("totpStatus").textContent = s.enabled ? "TOTP is ENABLED" : "TOTP is DISABLED";
    }

    // ---- TOTP UI ----
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

    // ---- Descriptor Export/Import UI ----
    const descOut = document.getElementById("descOut");
    const descExportMsg = document.getElementById("descExportMsg");
    const btnDescCopy = document.getElementById("btnDescCopy");
    const btnDescDownload = document.getElementById("btnDescDownload");

    let lastExportTxt = "";
    let lastExportWallet = "wallet";

    document.getElementById("btnDescExport").onclick = async () => {
      descExportMsg.textContent = "";
      descOut.textContent = "Working…";
      btnDescCopy.disabled = true;
      btnDescDownload.disabled = true;
      lastExportTxt = "";
      lastExportWallet = "wallet";

      try {
        const r = await jfetch("/api/wallet/descriptors/export", { method: "GET" });
        const backup = r.backup || r;

        lastExportWallet = backup.wallet || backup.wallet_name || "wallet";
        const txt = JSON.stringify(backup, null, 2);

        lastExportTxt = txt;
        descOut.textContent = txt;

        btnDescCopy.disabled = false;
        btnDescDownload.disabled = false;

        // auto-download immediately (still keep "Download" button)
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        downloadTextFile(\`bc2-\${lastExportWallet}-descriptors-\${ts}.json\`, txt);

        descExportMsg.textContent = "Exported ✅ Backup downloaded.";
      } catch (e) {
        descOut.textContent = "Error: " + (e?.message || e);
        descExportMsg.textContent = "Export failed ❌";
      }
    };

    document.getElementById("btnDescDownload").onclick = () => {
      if (!lastExportTxt) return;
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      downloadTextFile(\`bc2-\${lastExportWallet}-descriptors-\${ts}.json\`, lastExportTxt);
    };

    document.getElementById("btnDescCopy").onclick = async () => {
      try {
        const text = (descOut.textContent || "").trim();
        if (!text || text.startsWith("Error") || text === "Working…") return;
        await navigator.clipboard.writeText(text);
        descExportMsg.textContent = "Copied ✅";
        setTimeout(() => { descExportMsg.textContent = ""; }, 1200);
      } catch {
        descExportMsg.textContent = "Copy failed (browser permissions).";
      }
    };

    document.getElementById("btnDescClear").onclick = () => {
      descOut.textContent = "";
      descExportMsg.textContent = "";
      btnDescCopy.disabled = true;
      btnDescDownload.disabled = true;
      lastExportTxt = "";
      lastExportWallet = "wallet";
    };

    const descIn = document.getElementById("descIn");
    const descMsg = document.getElementById("descMsg");
    const descRescan = document.getElementById("descRescan");

    document.getElementById("btnDescImport").onclick = async () => {
      descMsg.textContent = "Working…";
      try {
        const raw = descIn.value.trim();
        if (!raw) throw new Error("missing_backup_json");
        const backup = JSON.parse(raw);

        const r = await jfetch("/api/wallet/descriptors/import", {
          method: "POST",
          body: JSON.stringify({ backup, rescan: !!descRescan.checked })
        });

        descMsg.textContent = "Imported ✅\\n" + JSON.stringify(r.result || r, null, 2);
      } catch (e) {
        descMsg.textContent = "Error: " + (e?.message || e);
      }
    };

    document.getElementById("btnDescClearIn").onclick = () => {
      descIn.value = "";
      descMsg.textContent = "";
    };

    // ---- Idle logout ----
    let last = Date.now();
    ["mousemove","keydown","click","touchstart"].forEach(ev => window.addEventListener(ev, () => last = Date.now()));
    setInterval(() => { if(Date.now()-last > 15*60_000) location.href="/wallet/logout"; }, 5000);
  </script>
  `;
}
