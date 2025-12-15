import { rpc } from "../rpc/client.js";

export function createNodeService() {
  return {
    getBlockchainInfo: () => rpc("getblockchaininfo"),
    getNetworkInfo: () => rpc("getnetworkinfo"),
    getMempoolInfo: () => rpc("getmempoolinfo"),

    getBestHeight: async () => {
      const bc = await rpc("getblockchaininfo");
      return bc.blocks;
    },

    getBlockHashByHeight: (h) => rpc("getblockhash", [h]),
    getBlockHeaderByHash: (hash) => rpc("getblockheader", [hash, true]),
    getBlockByHash: (hash, verbosity = 1) => rpc("getblock", [hash, verbosity]),

    getRawMempool: () => rpc("getrawmempool", [false]),
    getRawTransaction: (txid, verbose = true) =>
      rpc("getrawtransaction", [txid, !!verbose]),

    scanAddressUtxo: (addr) =>
      rpc("scantxoutset", ["start", [`addr(${addr})`]]),
  };
}
