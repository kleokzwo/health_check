import express from "express";
import { createNodeService } from "../services/nodeService.js";
import { layout } from "../views/layout.js";
import { mainNav } from "../views/nav.js";
import { healthPage } from "../views/pages/health.js";

export function dashboardRouter() {
  const router = express.Router();
  const node = createNodeService();

  router.get("/", async (req, res) => {
    try {
      const [bc, net, mem] = await Promise.all([
        node.getBlockchainInfo(),
        node.getNetworkInfo(),
        node.getMempoolInfo(),
      ]);

      const html = layout({
        title: "BitcoinII Dashboard",
        nav: mainNav({ active: "health", user: res.locals.user }),
        pills: `
          <div class="pill"><span class="dot ok"></span><span>online</span></div>
          <div class="pill">Peers <b>${net.connections ?? "-"}</b></div>
          <div class="pill">Mempool <b>${mem.size ?? "-"}</b></div>
        `,
        content: healthPage({ bc, net, mem }),
      });

      res.type("html").send(html);
    } catch (e) {
      res.status(500).send(`Dashboard error: ${e.message}`);
    }
  });

  return router;
}
