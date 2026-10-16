import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const connectionUrl = process.env.DATABASE_URL || "";

function createAdapter(urlStr: string) {
  try {
    const parsed = new URL(urlStr);
    const isRemote = parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1";
    return new PrismaMariaDb({
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, "") || "defaultdb",
      connectionLimit: 15,
      connectTimeout: 30000,
      acquireTimeout: 30000,
      idleTimeout: 60000,
      ...(isRemote && {
        ssl: { rejectUnauthorized: false },
      }),
    });
  } catch {
    return new PrismaMariaDb(urlStr);
  }
}

const adapter = createAdapter(connectionUrl);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
