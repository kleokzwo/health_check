// src/rpc/client.js
import fs from "fs";

const RPC_HOST = process.env.RPC_HOST || "bitcoinii";
const RPC_PORT = process.env.RPC_PORT || "8337";

const RPC_USER = process.env.RPC_USER || "bc2";
const RPC_PASS = process.env.RPC_PASS || "strong_password";

const RPC_COOKIE = process.env.RPC_COOKIE || "";

function getAuthorizationHeader() {
  if (RPC_COOKIE) {
    try {
      if (fs.existsSync(RPC_COOKIE)) {
        const cookie = fs.readFileSync(RPC_COOKIE, "utf8").trim();
        if (cookie.includes(":")) {
          return "Basic " + Buffer.from(cookie).toString("base64");
        }
      }
    } catch {
      // fall back
    }
  }

  if (RPC_USER && RPC_PASS) {
    return "Basic " + Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString("base64");
  }

  return null;
}

export async function rpc(method, params = [], opts = {}) {
  // opts.wallet -> call /wallet/<name>
  const walletPath = opts.wallet ? `/wallet/${encodeURIComponent(opts.wallet)}` : "";
  const url = `http://${RPC_HOST}:${RPC_PORT}${walletPath}`;

  const body = JSON.stringify({
    jsonrpc: "1.0",
    id: "dash",
    method,
    params,
  });

  const auth = getAuthorizationHeader();
  if (!auth) throw new Error("No RPC auth available (RPC_COOKIE or RPC_USER/RPC_PASS).");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": auth,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`RPC HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(`RPC error: ${JSON.stringify(data.error)}`);
  return data.result;
}
