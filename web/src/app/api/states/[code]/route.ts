import { NextResponse } from "next/server";

import { getState } from "@/lib/data";
import { reportError } from "@/lib/observability";
import { DISCLAIMER } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  try {
    const state = await getState(params.code);
    if (!state) {
      return NextResponse.json(
        { error: `Unknown state code: ${params.code}` },
        { status: 404 },
      );
    }
    return NextResponse.json({ disclaimer: DISCLAIMER, state });
  } catch (err) {
    reportError(err, { route: "GET /api/states/[code]", code: params.code });
    return NextResponse.json(
      { error: "Could not load state." },
      { status: 500 },
    );
  }
}
