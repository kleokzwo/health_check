export function walletTotpPage() {
  return `
  <div class="grid" style="grid-template-columns:1fr;">
    <div class="card" style="max-width:520px; margin:0 auto;">
      <h2>2FA Verification</h2>
      <div class="sub">Enter the 6-digit code from your authenticator app.</div>

      <div style="margin-top:12px;">
        <div class="sub">TOTP Code</div>
        <input id="code" class="mono" placeholder="123456" autocomplete="one-time-code" />
      </div>

      <div style="display:flex; gap:10px; margin-top:12px;">
        <button class="btn" id="verifyBtn">Verify</button>
        <a class="btn" href="/wallet/logout" style="text-decoration:none; display:inline-flex; align-items:center;">Cancel</a>
      </div>

      <div id="msg" class="sub" style="margin-top:10px;"></div>
    </div>
  </div>

  <script>
    async function jfetch(url, opts){
      const res = await fetch(url, Object.assign({headers:{"content-type":"application/json"}}, opts));
      const data = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error || ("HTTP "+res.status));
      return data;
    }

    document.getElementById("verifyBtn").onclick = async () => {
      const msg = document.getElementById("msg");
      msg.textContent = "Verifying…";
      try {
        const code = document.getElementById("code").value.trim();
        await jfetch("/api/totp/verify-login", { method:"POST", body: JSON.stringify({ code }) });
        location.href = "/wallet/dashboard";
      } catch (e) {
        msg.textContent = "Error: " + e.message;
      }
    };
  </script>
  `;
}
