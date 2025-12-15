import { el, clear } from "./dom.js";

function shortHex(h, n = 10) {
  if (!h) return "-";
  return h.length <= n ? h : h.slice(0, n) + "…";
}

function kv(label, value, sub = "") {
  const box = el("div", { class: "kv" }, [
    el("div", { class: "k", text: label }),
    el("div", { class: "v", text: String(value) }),
  ]);
  if (sub) box.append(el("div", { class: "sub", text: sub }));
  return box;
}

function renderVinTable(vin) {
  const table = el("table", { style: "margin-top:6px" });
  table.append(el("thead", {}, [el("tr", {}, [
    el("th", { text: "Prevout" }),
    el("th", { text: "Vout" }),
  ])]));
  const tbody = el("tbody");

  if (!vin.length) {
    tbody.append(el("tr", {}, [el("td", { class: "sub", colspan: "2", text: "No inputs" })]));
  } else {
    for (const x of vin) {
      tbody.append(el("tr", {}, [
        el("td", { class: "mono", text: shortHex(x.txid || "coinbase", 24) }),
        el("td", { text: String(x.vout ?? "-") }),
      ]));
    }
  }

  table.append(tbody);
  return table;
}

function renderVoutTable(vout) {
  const table = el("table", { style: "margin-top:6px" });
  table.append(el("thead", {}, [el("tr", {}, [
    el("th", { text: "N" }),
    el("th", { text: "Value" }),
    el("th", { text: "Address" }),
  ])]));
  const tbody = el("tbody");

  if (!vout.length) {
    tbody.append(el("tr", {}, [el("td", { class: "sub", colspan: "3", text: "No outputs" })]));
  } else {
    for (const o of vout) {
      const addr =
        o?.scriptPubKey?.address ||
        (o?.scriptPubKey?.addresses && o.scriptPubKey.addresses[0]) ||
        "-";

      tbody.append(el("tr", {}, [
        el("td", { text: String(o.n) }),
        el("td", { text: String(o.value ?? "-") }),
        el("td", { class: "mono", text: shortHex(addr, 28) }),
      ]));
    }
  }

  table.append(tbody);
  return table;
}

export function renderLatest(live, data, { onOpenBlock }) {
  clear(live);

  const table = el("table");
  table.append(el("thead", {}, [el("tr", {}, [
    el("th", { text: "Height" }),
    el("th", { text: "Hash" }),
    el("th", { text: "TX" }),
    el("th", { text: "Time" }),
  ])]));

  const tbody = el("tbody");
  for (const b of data.blocks || []) {
    const link = el("a", {
      href: "#",
      class: "mono",
      onClick: (e) => { e.preventDefault(); onOpenBlock(String(b.height)); },
    }, [el("b", { text: String(b.height) })]);

    tbody.append(el("tr", {}, [
      el("td", { class: "mono" }, [link]),
      el("td", { class: "mono", text: shortHex(b.hash, 18) }),
      el("td", { text: String(b.tx_count ?? "-") }),
      el("td", { text: new Date((b.time || 0) * 1000).toLocaleString() }),
    ]));
  }

  table.append(tbody);
  live.append(table);
}

export function renderMempool(live, data, { onOpenTx, fmtBytes }) {
  clear(live);

  live.append(el("div", { class: "sub", style: "margin-bottom:10px" }, [
    document.createTextNode("TX count: "),
    el("b", { text: String(data.info?.size ?? "-") }),
    document.createTextNode(" • Usage: "),
    el("b", { text: fmtBytes(data.info?.usage) }),
  ]));

  const table = el("table");
  table.append(el("thead", {}, [el("tr", {}, [el("th", { text: "Recent TXIDs (sample)" })])]));
  const tbody = el("tbody");

  const sample = data.sample || [];
  if (!sample.length) {
    tbody.append(el("tr", {}, [el("td", { class: "sub", text: "Mempool empty" })]));
  } else {
    for (const txid of sample) {
      const link = el("a", {
        href: "#",
        class: "mono",
        onClick: (e) => { e.preventDefault(); onOpenTx(txid); },
        text: shortHex(txid, 24),
      });
      tbody.append(el("tr", {}, [el("td", { class: "mono" }, [link])]));
    }
  }

  table.append(tbody);
  live.append(table);
}

export function renderInspectEmpty(live) {
  clear(live);
  live.append(el("div", { class: "sub" }, [
    document.createTextNode("Use the search bar above. Try: "),
    el("code", { text: "0" }),
    document.createTextNode(" (height), a block hash/txid, or an address."),
  ]));
}

export function renderInspectBlock(live, block, { onOpenTx }) {
  clear(live);

  live.append(el("div", { class: "sub", text: "Block" }));
  live.append(el("div", { class: "mono", style: "font-size:18px; margin:6px 0 10px" }, [
    el("b", { text: block.hash || "-" }),
  ]));

  live.append(el("div", {
    class: "kvs",
    style: "grid-template-columns:repeat(3,minmax(0,1fr));"
  }, [
    kv("Height", block.height ?? "-"),
    kv("Confirmations", block.confirmations ?? "-"),
    kv("TX Count", Array.isArray(block.tx) ? block.tx.length : "-"),
  ]));

  live.append(el("div", { class: "sub", style: "margin-top:10px", text: "TX preview (first 20)" }));

  const table = el("table", { style: "margin-top:6px" });
  table.append(el("thead", {}, [el("tr", {}, [el("th", { text: "Txid" })])]));
  const tbody = el("tbody");

  const txs = Array.isArray(block.tx) ? block.tx.slice(0, 20) : [];
  if (!txs.length) {
    tbody.append(el("tr", {}, [el("td", { class: "sub", text: "No tx list available" })]));
  } else {
    for (const txid of txs) {
      const link = el("a", {
        href: "#",
        class: "mono",
        onClick: (e) => { e.preventDefault(); onOpenTx(txid); },
        text: shortHex(txid, 30),
      });
      tbody.append(el("tr", {}, [el("td", { class: "mono" }, [link])]));
    }
  }

  table.append(tbody);
  live.append(table);
}

export function renderInspectTx(live, tx) {
  clear(live);

  live.append(el("div", { class: "sub", text: "Transaction" }));
  live.append(el("div", { class: "mono", style: "font-size:18px; margin:6px 0 10px" }, [
    el("b", { text: tx.txid || "-" }),
  ]));

  live.append(el("div", {
    class: "kvs",
    style: "grid-template-columns:repeat(3,minmax(0,1fr));"
  }, [
    kv("Size", tx.size ?? "-"),
    kv("Confirmations", tx.confirmations ?? "-"),
    kv("Blockhash", shortHex(tx.blockhash, 18)),
  ]));

  live.append(el("div", { class: "sub", style: "margin-top:12px", text: "Inputs (first 10)" }));
  live.append(renderVinTable((tx.vin || []).slice(0, 10)));

  live.append(el("div", { class: "sub", style: "margin-top:12px", text: "Outputs (first 10)" }));
  live.append(renderVoutTable((tx.vout || []).slice(0, 10)));
}

export function renderInspectAddress(live, a, { onOpenTx }) {
  clear(live);

  live.append(el("div", { class: "sub", text: "Address (UTXO scan)" }));
  live.append(el("div", { class: "mono", style: "font-size:18px; margin:6px 0 10px" }, [
    el("b", { text: a.address || "-" }),
  ]));

  live.append(el("div", {
    class: "kvs",
    style: "grid-template-columns:repeat(3,minmax(0,1fr));"
  }, [
    kv("Height", a.height ?? "-"),
    kv("UTXOs", a.txouts ?? (a.unspents?.length ?? "-")),
    kv("Total", a.total_amount ?? "-", "RPC scan result"),
  ]));

  live.append(el("div", { class: "sub", style: "margin-top:12px", text: "Unspents (up to 50)" }));

  const table = el("table", { style: "margin-top:6px" });
  table.append(el("thead", {}, [el("tr", {}, [
    el("th", { text: "Txid" }),
    el("th", { text: "Vout" }),
    el("th", { text: "Amount" }),
  ])]));

  const tbody = el("tbody");
  const unspents = (a.unspents || []).slice(0, 50);

  if (!unspents.length) {
    tbody.append(el("tr", {}, [el("td", { class: "sub", colspan: "3", text: "No UTXOs found" })]));
  } else {
    for (const u of unspents) {
      const link = el("a", {
        href: "#",
        class: "mono",
        onClick: (e) => { e.preventDefault(); onOpenTx(u.txid); },
        text: shortHex(u.txid, 22),
      });

      tbody.append(el("tr", {}, [
        el("td", { class: "mono" }, [link]),
        el("td", { text: String(u.vout) }),
        el("td", { text: String(u.amount ?? u.value ?? "-") }),
      ]));
    }
  }

  table.append(tbody);
  live.append(table);

  live.append(el("div", { class: "sub", style: "margin-top:10px", text: "Note: full address history requires an indexer." }));
}
