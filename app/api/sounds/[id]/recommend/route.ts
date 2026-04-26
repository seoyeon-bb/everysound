import type { NextRequest } from "next/server";
import { supabaseServerAdmin, supabaseServerAnon } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readCount(supabase: NonNullable<ReturnType<typeof supabaseServerAdmin>>, id: string) {
  const { data } = await supabase
    .from("sounds")
    .select("recommend_count")
    .eq("id", id)
    .maybeSingle();
  return (data?.recommend_count as number | undefined) ?? 0;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  const supabase = supabaseServerAnon();
  if (!supabase) {
    return Response.json({ error: "server not configured" }, { status: 503 });
  }

  const deviceId = req.headers.get("x-device-id");
  const count = await readCount(supabase, id);

  let recommended = false;
  if (deviceId && UUID_RE.test(deviceId)) {
    const { data } = await supabase
      .from("recommendations")
      .select("device_id")
      .eq("sound_id", id)
      .eq("device_id", deviceId)
      .maybeSingle();
    recommended = !!data;
  }
  return Response.json({ count, recommended });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId || !UUID_RE.test(deviceId)) {
    return Response.json({ error: "invalid device id" }, { status: 400 });
  }
  const supabase = supabaseServerAdmin();
  if (!supabase) {
    return Response.json({ error: "server not configured" }, { status: 503 });
  }

  const { error } = await supabase
    .from("recommendations")
    .upsert(
      { sound_id: id, device_id: deviceId },
      { onConflict: "sound_id,device_id", ignoreDuplicates: true },
    );
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  const count = await readCount(supabase, id);
  return Response.json({ recommended: true, count });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId || !UUID_RE.test(deviceId)) {
    return Response.json({ error: "invalid device id" }, { status: 400 });
  }
  const supabase = supabaseServerAdmin();
  if (!supabase) {
    return Response.json({ error: "server not configured" }, { status: 503 });
  }

  const { error } = await supabase
    .from("recommendations")
    .delete()
    .eq("sound_id", id)
    .eq("device_id", deviceId);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  const count = await readCount(supabase, id);
  return Response.json({ recommended: false, count });
}
