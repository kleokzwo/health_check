export function walletLoginPage() {
  return `
  <div class="wallet-auth">
    <div class="grid" style="grid-template-columns:1fr;">
      <div class="card auth-card" style="max-width:520px; margin:0 auto;">
      <h2>Login</h2>
      <span>Local/NAS wallet UI</span>

      <div style="margin-top:12px;">
        <label class="sub" for="username">Username</label>
        <input id="username" class="mono" autocomplete="username" />

        <label class="sub" for="password" style="margin-top:10px;">Password</label>
        <input id="password" type="password" autocomplete="current-password" />

      </div>

      <div style="display:flex; gap:10px; margin-top:12px;">
        <button class="btn" id="loginBtn">Login</button>
        <a class="btn" href="/wallet/register" style="text-decoration:none; display:inline-flex; align-items:center;">Register</a>
      </div>

      <div id="msg" class="sub" style="margin-top:10px;"></div>
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

    document.getElementById("loginBtn").onclick = async () => {
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;
      const msg = document.getElementById("msg");
      msg.textContent = "…";
      try {
        const r = await jfetch("/api/auth/login", { method:"POST", body: JSON.stringify({ username, password }) });
        if (r.needs_totp) location.href = "/wallet/totp";
        else location.href = "/wallet/dashboard";
      } catch (e) {
        msg.textContent = "Error: " + e.message;
      }
    };
  </script>
  `;
}
