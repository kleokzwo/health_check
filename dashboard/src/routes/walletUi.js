import express from "express";
import { layout } from "../views/layout.js";
import { mainNav } from "../views/nav.js";
import { walletLoginPage } from "../views/pages/wallet/login.js";
import { walletRegisterPage } from "../views/pages/wallet/register.js";
import { walletDashboardPage } from "../views/pages/wallet/dashboard.js";
import { walletReceivePage } from "../views/pages/wallet/receive.js";
import { walletSendPage } from "../views/pages/wallet/send.js";
import { walletSettingsPage } from "../views/pages/wallet/settings.js";



function pageShell({ title, active, user, pills = "", body, scripts = "" }) {
  return layout({
    title,
    nav: mainNav({ active, user }),
    pills,
    content: body,
    scripts,
  });
}

function requireUiLogin(req, res, next) {
  if (!req.session?.user) return res.redirect("/wallet/login");
  next();
}

export function walletUiRouter() {
  const r = express.Router();

  r.get("/dashboard", (req, res) => {
    res.type("html").send(pageShell({
        title: "Wallet",
        active: "wallet",
        user: res.locals.user,
        body: walletDashboardPage(),
    }));
   });


  // PUBLIC: login/register
  r.get("/login", (req, res) => {
    if (res.locals.user) return res.redirect("/wallet");
    res.type("html").send(pageShell({
      title: "Wallet Login",
      active: "wallet",
      user: null,
      body:walletLoginPage(),
      scripts: `<script>
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
            await jfetch("/api/auth/login", {method:"POST", body: JSON.stringify({username,password})});
            location.href="/wallet";
          } catch(e){ msg.textContent="Error: "+e.message; }
        };
      </script>`
    }));
  });

  r.get("/register", (req, res) => {
    if (res.locals.user) return res.redirect("/wallet");
    res.type("html").send(pageShell({
      title: "Wallet Register",
      active: "wallet",
      user: null,
      body: walletRegisterPage(),
      scripts: `<script>
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
            await jfetch("/api/auth/register", {method:"POST", body: JSON.stringify({username,password})});
            location.href="/wallet";
          } catch(e){ msg.textContent="Error: "+e.message; }
        };
      </script>`
    }));
  });

  // Logout (GET convenience)
  r.get("/logout", (req, res) => {
    req.session?.destroy(() => res.redirect("/wallet/login"));
  });

  // PROTECTED ROUTES BELOW
  r.use(requireUiLogin);

  r.get("/", (_req, res) => res.redirect("/wallet/dashboard"));

  // Dashboard
  r.get("/dashboard", (req, res) => {
    res.type("html").send(pageShell({
      title: "Wallet",
      active: "wallet",
      user: res.locals.user,
      body: walletDashboardPage(),
      scripts: `<script>
        async function jfetch(url, opts){
          const res = await fetch(url, Object.assign({headers:{"content-type":"application/json"}}, opts));
          const data = await res.json().catch(()=>({}));
          if(!res.ok) throw new Error(data.error || ("HTTP "+res.status));
          return data;
        }
        function renderTxs(txs){
          if(!txs.length) return "<div class='sub'>No transactions yet.</div>";
          return "<div class='kvs'>" + txs.slice(0,15).map(t =>
            "<div class='kv'>" +
              "<div class='k mono'>"+ new Date((t.time||0)*1000).toLocaleString() +"</div>" +
              "<div class='v mono'>"+(t.category||"")+" "+(t.amount??"")+" (conf: "+(t.confirmations??"")+")</div>" +
              "<div class='sub mono'>"+(t.txid||"")+"</div>" +
            "</div>"
          ).join("") + "</div>";
        }
        async function load(){
          const sum = await jfetch("/api/wallet/summary", {method:"GET"});
          document.getElementById("overview").classList.remove("loading");
          document.getElementById("overview").innerHTML =
            "<div class='kvs'>" +
              "<div class='kv'><div class='k'>Wallet</div><div class='v mono'>"+sum.wallet+"</div></div>" +
              "<div class='kv'><div class='k'>Balance</div><div class='v mono'>"+sum.balance+"</div></div>" +
              "<div class='kv'><div class='k'>Unconfirmed</div><div class='v mono'>"+sum.unconfirmed+"</div></div>" +
              "<div class='kv'><div class='k'>Tx count</div><div class='v mono'>"+sum.txcount+"</div></div>" +
            "</div>";
          const tx = await jfetch("/api/wallet/txs?n=25", {method:"GET"});
          document.getElementById("txs").classList.remove("loading");
          document.getElementById("txs").innerHTML = renderTxs(tx.txs || []);
        }
        document.getElementById("refreshBtn").onclick = () => load().catch(e => {
          document.getElementById("msg").textContent = "Error: "+e.message;
        });
        document.getElementById("createWalletBtn").onclick = async () => {
          const msg = document.getElementById("msg");
          msg.textContent = "Creating wallet…";
          try {
            await jfetch("/api/wallet/create", {method:"POST", body:"{}"});
            msg.textContent = "OK";
            await load();
          } catch(e){ msg.textContent="Error: "+e.message; }
        };
        load().catch(e => document.getElementById("msg").textContent = "Error: "+e.message);

        // idle logout client helper (server also enforces)
        let last = Date.now();
        ["mousemove","keydown","click","touchstart"].forEach(ev => window.addEventListener(ev, () => last = Date.now()));
        setInterval(() => { if(Date.now()-last > 15*60_000) location.href="/wallet/logout"; }, 5000);
      </script>`
    }));
  });

  // Receive
  r.get("/receive", (req, res) => {
    res.type("html").send(pageShell({
      title: "Wallet Receive",
      active: "wallet",
      user: res.locals.user,
      body: walletReceivePage(),
      scripts: `<script>
        async function jfetch(url, opts){
          const res = await fetch(url, Object.assign({headers:{"content-type":"application/json"}}, opts));
          const data = await res.json().catch(()=>({}));
          if(!res.ok) throw new Error(data.error || ("HTTP "+res.status));
          return data;
        }
        async function refresh(){
          const sum = await jfetch("/api/wallet/summary", {method:"GET"});
          document.getElementById("status").classList.remove("loading");
          document.getElementById("status").innerHTML =
            "<div class='kvs'>" +
              "<div class='kv'><div class='k'>Wallet</div><div class='v mono'>"+sum.wallet+"</div></div>" +
              "<div class='kv'><div class='k'>Balance</div><div class='v mono'>"+sum.balance+"</div></div>" +
              "<div class='kv'><div class='k'>Tx count</div><div class='v mono'>"+sum.txcount+"</div></div>" +
            "</div>";
        }
        document.getElementById("newBtn").onclick = async () => {
          const msg = document.getElementById("msg");
          msg.textContent = "Generating…";
          try {
            const r = await jfetch("/api/wallet/receive/new", {method:"POST", body:"{}"});
            document.getElementById("addr").textContent = r.address;
            msg.textContent = "OK";
          } catch(e){ msg.textContent = "Error: " + e.message; }
        };
        document.getElementById("refreshBtn").onclick = () => refresh().catch(e => {
          document.getElementById("msg").textContent = "Error: " + e.message;
        });
        refresh().catch(()=>{});
        let last = Date.now();
        ["mousemove","keydown","click","touchstart"].forEach(ev => window.addEventListener(ev, () => last = Date.now()));
        setInterval(() => { if(Date.now()-last > 15*60_000) location.href="/wallet/logout"; }, 5000);
      </script>`
    }));
  });

  // Send
  r.get("/send", (req, res) => {
    res.type("html").send(pageShell({
      title: "Wallet Send",
      active: "wallet",
      user: res.locals.user,
      body: walletSendPage(),
      scripts: `<script>
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
        async function refresh(){
          const tx = await jfetch("/api/wallet/txs?n=20", {method:"GET"});
          document.getElementById("txs").classList.remove("loading");
          document.getElementById("txs").innerHTML = renderTxs(tx.txs || []);
        }
        document.getElementById("unlockBtn").onclick = async () => {
          const msg = document.getElementById("msg");
          msg.textContent = "Unlocking…";
          try {
            await jfetch("/api/wallet/unlock", {method:"POST", body:"{}"});
            msg.textContent = "Unlocked for ~5 minutes.";
          } catch(e){ msg.textContent = "Error: " + e.message; }
        };
        document.getElementById("sendBtn").onclick = async () => {
          const msg = document.getElementById("msg");
          msg.textContent = "Sending…";
          try {
            const address = document.getElementById("to").value.trim();
            const amount = document.getElementById("amt").value.trim();
            const r = await jfetch("/api/wallet/send", {method:"POST", body: JSON.stringify({address, amount})});
            msg.textContent = "TXID: " + r.txid;
            await refresh();
          } catch(e){ msg.textContent = "Error: " + e.message + (String(e.message).includes("locked") ? " (unlock first)" : ""); }
        };
        refresh().catch(()=>{});
        let last = Date.now();
        ["mousemove","keydown","click","touchstart"].forEach(ev => window.addEventListener(ev, () => last = Date.now()));
        setInterval(() => { if(Date.now()-last > 15*60_000) location.href="/wallet/logout"; }, 5000);
      </script>`
    }));
  });

  // Settings
  r.get("/settings", (req, res) => {
    res.type("html").send(pageShell({
      title: "Wallet Settings",
      active: "wallet",
      user: res.locals.user,
      body: walletSettingsPage(),
      scripts: `<script>
        let last = Date.now();
        ["mousemove","keydown","click","touchstart"].forEach(ev => window.addEventListener(ev, () => last = Date.now()));
        setInterval(() => { if(Date.now()-last > 15*60_000) location.href="/wallet/logout"; }, 5000);
      </script>`
    }));
  });

  return r;
}
