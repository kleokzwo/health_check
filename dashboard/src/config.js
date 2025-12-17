// src/config.js
export const config = Object.freeze({
  rpcHost: process.env.RPC_HOST || "bitcoinii",
  rpcPort: process.env.RPC_PORT || "8337",

  // Fallback auth (only used if RPC_COOKIE is not present/readable)
  rpcUser: process.env.RPC_USER || "bc2",
  rpcPass: process.env.RPC_PASS || "UseYour_StrongPassword%%",

  // Preferred auth: cookie file (e.g. /data/.cookie mounted from the node datadir)
  rpcCookiePath: process.env.RPC_COOKIE || "",

  listenHost: process.env.LISTEN_HOST || "0.0.0.0",
  listenPort: Number(process.env.LISTEN_PORT || 3000),

  // Safety limits
  blocksListLimitMax: Number(process.env.BLOCKS_LIST_LIMIT_MAX || 50),
  mempoolSampleLimitMax: Number(process.env.MEMPOOL_SAMPLE_LIMIT_MAX || 200),
});
