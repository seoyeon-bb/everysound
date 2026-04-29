import type { NextRequest } from "next/server";
import { supabaseServerAdmin } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  const supabase = supabaseServerAdmin();
  if (!supabase) {
    return Response.json({ error: "server not configured" }, { status: 503 });
  }
  const { error } = await supabase.rpc("bump_stage_play", { p_id: id });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
