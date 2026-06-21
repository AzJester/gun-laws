import { NextResponse } from "next/server";

import { getStates } from "@/lib/data";
import { DISCLAIMER } from "@/lib/types";

// Always run on the server at request time (the data layer touches fs / DB).
export const dynamic = "force-dynamic";

export async function GET() {
  const states = await getStates();
  return NextResponse.json({ disclaimer: DISCLAIMER, states });
}
