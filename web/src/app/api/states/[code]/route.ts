import { NextResponse } from "next/server";

import { getState } from "@/lib/data";
import { DISCLAIMER } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  const state = await getState(params.code);
  if (!state) {
    return NextResponse.json(
      { error: `Unknown state code: ${params.code}` },
      { status: 404 },
    );
  }
  return NextResponse.json({ disclaimer: DISCLAIMER, state });
}
