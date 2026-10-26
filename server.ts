import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd()); // tsx does not read .env by itself
const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const parseCookie = (h = "") => Object.fromEntries(h.split(";").map((c) => c.trim().split("=").map(decodeURIComponent) as [string, string]));

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer);
  (globalThis as any).__io = io;

  // Staff sockets must carry a valid session cookie. Customers join only their own order room by secret token.
  io.on("connection", async (socket) => {
    const { wr_session } = parseCookie(socket.handshake.headers.cookie);
    if (wr_session) {
      const s = await prisma.session.findUnique({ where: { tokenHash: sha(wr_session) }, include: { user: true } });
      if (s && s.expiresAt > new Date() && s.user.active) socket.join(`staff:${s.user.restaurantId}`);
    }
    socket.on("track", async (token: string) => {
      if (typeof token !== "string") return;
      const o = await prisma.order.findUnique({ where: { publicToken: token }, select: { publicToken: true } });
      if (o) socket.join(`order:${o.publicToken}`);
    });
  });

  httpServer.listen(port, () => console.log(`> WhiteRose SmartDine ready on http://localhost:${port}`));
});
