// Lazily-instantiated Prisma client.
//
// IMPORTANT: importing @prisma/client does NOT open a connection, but we still
// guard creation so the client is only constructed when DATABASE_URL is present
// and a data function actually needs it. This keeps `next build` working with
// DATABASE_URL unset (the JSON fallback path).

import type { PrismaClient } from "@prisma/client";

import { getEnv } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __gunlawPrisma: PrismaClient | undefined;
}

export function getPrisma(): PrismaClient {
  if (!getEnv(process.env).DATABASE_URL) {
    throw new Error(
      "getPrisma() called without DATABASE_URL set. Use the JSON fallback instead.",
    );
  }
  if (!global.__gunlawPrisma) {
    // Required lazily so the module graph never pulls the engine in at build
    // time on the no-DB path.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient: Client } = require("@prisma/client") as typeof import("@prisma/client");
    global.__gunlawPrisma = new Client();
  }
  return global.__gunlawPrisma;
}

export function hasDatabase(): boolean {
  return Boolean(getEnv(process.env).DATABASE_URL);
}
