import { $ , clear } from "./dom.js";
import {
  renderLatest,
  renderMempool,
  renderInspectEmpty,
  renderInspectBlock,
  renderInspectTx,
  renderInspectAddress,
} from "./renderers.js";

const cfg = window.__APP_CONFIG__ || { apiBase: "" };

const live = $("live");
const dot = $("dot");
const statusText = $("statusText");

function fmtBytes(n){
  if(n == null) return "-";
  const units = ["B","KB","MB","GB","TB"];
  let i=0, x=Number(n);
  while(x>=1024 && i<units.length-1){ x/=1024; i++; }
  return (i===0? x.toFixed(0) : x.toFixed(2)) + " " + units[i];
}

function setConnected(ok){
  dot.className = "dot " + (ok ? "ok" : "");
  statusText.textContent = ok ? "live" : "offline";
}

function classify(q){
  if(!q) return { type:"none" };
  if(/^[0-9]+$/.test(q)) return { type:"height", value:Number(q) };
  if(/^[0-9a-fA-F]{64}$/.test(q)) return { type:"hashOrTx", value:q.toLowerCase() };
  return { type:"address", value:q };
}

async function api(url){
  const r = await fetch((cfg.apiBase || "") + url);
  const txt = await r.text();
  let data;
  try { data = JSON.parse(txt); } catch { data = txt; }
  if(!r.ok) throw new Error(typeof data === "string" ? data : (data.error || JSON.stringify(data)));
  return data;
}

// state
let currentView = "latest";
let lastInspect = null;

function setView(view){
  currentView = view;
  document.querySelectorAll("#tabs .tab").forEach(x =>
    x.classList.toggle("active", x.dataset.view === view)
  );
}

document.querySelectorAll("#tabs .tab").forEach(btn => {
  btn.addEventListener("click", async () => {
    setView(btn.dataset.view);
    await render();
  });
});

$("go").addEventListener("click", () => search($("q").value.trim()));
$("q").addEventListener("keydown", (e) => {
  if(e.key === "Enter") search($("q").value.trim());
});

async function search(q){
  const c = classify(q);
  if(c.type === "none") return;

  live.className = "loading";
  live.textContent = "Searching…";
  lastInspect = null;
  setView("inspect");

  try{
    if(c.type === "height"){
      lastInspect = { kind:"block", data: await api("/api/block/" + c.value) };
    } else if(c.type === "hashOrTx"){
      try{
        lastInspect = { kind:"block", data: await api("/api/block/" + c.value) };
      } catch {
        lastInspect = { kind:"tx", data: await api("/api/tx/" + c.value) };
      }
    } else {
      lastInspect = { kind:"address", data: await api("/api/address/" + encodeURIComponent(c.value)) };
    }
    await render();
  } catch(e){
    clear(live);
    live.className = "err";
    live.textContent = String(e.message || e);
  }
}

async function render(){
  live.className = "loading";

  if(currentView === "latest"){
    const data = await api("/api/blocks?limit=12");
    renderLatest(live, data, {
      onOpenBlock: (id) => { $("q").value = id; search(id); }
    });
    return;
  }

  if(currentView === "mempool"){
    const data = await api("/api/mempool?limit=40");
    renderMempool(live, data, {
      onOpenTx: (txid) => { $("q").value = txid; search(txid); },
      fmtBytes
    });
    return;
  }

  // inspect
  if(!lastInspect){
    renderInspectEmpty(live);
    return;
  }

  if(lastInspect.kind === "block"){
    renderInspectBlock(live, lastInspect.data, {
      onOpenTx: (txid) => { $("q").value = txid; search(txid); }
    });
    return;
  }

  if(lastInspect.kind === "tx"){
    renderInspectTx(live, lastInspect.data);
    return;
  }

  renderInspectAddress(live, lastInspect.data, {
    onOpenTx: (txid) => { $("q").value = txid; search(txid); }
  });
}

// live stats via SSE
function startStream(){
  const es = new EventSource((cfg.apiBase || "") + "/api/stream");
  es.addEventListener("stats", (ev) => {
    setConnected(true);
    const s = JSON.parse(ev.data);

    $("tip").textContent = s.tip ?? "-";
    $("headers").textContent = s.headers ?? "-";
    $("chain").textContent = s.chain ?? "-";
    $("ibd").textContent = s.ibd ? "yes" : "no";
    $("peers").textContent = s.peers ?? "-";
    $("mp").textContent = s.mempool?.size ?? "-";
    $("mpUsage").textContent = fmtBytes(s.mempool?.usage);
    $("mpFee").textContent = "min relay: " + (s.mempool?.mempoolminfee ?? "-");
  });

  es.addEventListener("error", () => setConnected(false));
}

render().catch(e => {
  live.className = "err";
  live.textContent = String(e.message || e);
});

startStream();
