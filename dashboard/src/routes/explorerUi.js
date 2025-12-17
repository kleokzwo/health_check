import express from "express";
import path from "path";
import { layout } from "../views/layout.js";
import { mainNav } from "../views/nav.js";
import { explorerPage } from "../views/pages/explorer.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export function explorerRouter() {
  const router = express.Router();

  // keep your existing static assets
  router.use("/assets", express.static(path.resolve(__dirname, "../public/explorer")));
  router.get("/config.js", (_req, res) => {
    res.type("application/javascript").send(`window.EXPLORER_BASE="/explorer";`);
  });

  router.get("/", (req, res) => {
    const html = layout({
      title: "BitcoinII Explorer",
      head: `<link rel="stylesheet" href="/explorer/assets/explorer.css" />`,
      nav: mainNav({ active: "explorer", user: res.locals.user }),
      pills: `
        <div class="pill"><span class="dot" id="dot"></span><span id="statusText">connecting…</span></div>
        <div class="pill">Tip <b id="tip">-</b></div>
        <div class="pill">Peers <b id="peers">-</b></div>
        <div class="pill">Mempool <b id="mp">-</b></div>
      `,

      content: explorerPage(),
      scripts: `
        <script src="/explorer/config.js"></script>
        <script type="module" src="/explorer/assets/explorer.js"></script>
      `,
    });

    res.type("html").send(html);
  });

  return router;
}
