export function walletRegisterPage() {
  return `
  <div class="grid" style="grid-template-columns:1fr;">
    <div class="card" style="max-width:520px; margin:0 auto;">
      <h2>Create account</h2>
      <div class="sub">Stored locally on this machine</div>

      <div style="margin-top:12px;">
        <div class="sub">Username</div>
        <input id="username" class="mono" autocomplete="username" />
        <div class="sub" style="margin-top:10px;">Password</div>
        <input id="password" type="password" autocomplete="new-password" />
      </div>

      <div style="display:flex; gap:10px; margin-top:12px;">
        <button class="btn" id="regBtn">Register</button>
        <a class="btn" href="/wallet/login" style="text-decoration:none; display:inline-flex; align-items:center;">Back to login</a>
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

    document.getElementById("regBtn").onclick = async () => {
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;
      const msg = document.getElementById("msg");
      msg.textContent = "…";
      try {
        await jfetch("/api/auth/register", { method:"POST", body: JSON.stringify({ username, password }) });
        location.href = "/wallet/dashboard";
      } catch (e) {
        msg.textContent = "Error: " + e.message;
      }
    };
  </script>
  `;
}
