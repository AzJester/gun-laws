import { NextResponse } from "next/server";

import { getStates } from "@/lib/data";
import { intFromEnv, rateLimitOrResponse } from "@/lib/rate-limit";
import { DISCLAIMER } from "@/lib/types";

// Always run on the server at request time (the data layer touches fs / DB).
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Generous read limit (default 120 / min per client) — guards against scraping
  // bursts without affecting normal map use. Env-tunable.
  const limited = rateLimitOrResponse(req, "states", {
    limit: intFromEnv(process.env.RATE_LIMIT_STATES, 120),
    windowMs: intFromEnv(process.env.RATE_LIMIT_STATES_WINDOW_MS, 60_000),
  });
  if (limited) return limited;

  const states = await getStates();
  return NextResponse.json({ disclaimer: DISCLAIMER, states });
}
