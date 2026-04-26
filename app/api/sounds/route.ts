import type { NextRequest } from "next/server";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { isCategoryKey } from "@/lib/categories";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId || !UUID_RE.test(deviceId)) {
    return Response.json({ error: "invalid device id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const {
    id,
    title,
    summary,
    description,
    category,
    tags,
    audio_key,
    duration_ms,
    pitch,
    pitch_hz,
    uploader_nickname,
  } = body;

  if (typeof title !== "string" || !title.trim() || title.length > 40) {
    return Response.json({ error: "invalid title" }, { status: 400 });
  }
  if (typeof summary !== "string" || !summary.trim() || summary.length > 60) {
    return Response.json({ error: "invalid summary" }, { status: 400 });
  }
  if (!isCategoryKey(category)) {
    return Response.json({ error: "invalid category" }, { status: 400 });
  }
  if (typeof audio_key !== "string" || !audio_key.startsWith(`sounds/${deviceId}/`)) {
    return Response.json({ error: "invalid audio_key" }, { status: 400 });
  }
  const safeTags = Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [];
  if (safeTags.length > 3) {
    return Response.json({ error: "max 3 tags" }, { status: 400 });
  }
  if (id !== undefined && (typeof id !== "string" || !UUID_RE.test(id))) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const finalNickname =
    typeof uploader_nickname === "string" && uploader_nickname.trim()
      ? uploader_nickname.trim().slice(0, 20)
      : null;

  const supabase = supabaseServerAdmin();
  const { data, error } = await supabase
    .from("sounds")
    .insert({
      ...(id ? { id } : {}),
      device_id: deviceId,
      uploader_nickname: finalNickname,
      title: title.trim(),
      summary: summary.trim(),
      description:
        typeof description === "string" && description.trim()
          ? description.trim().slice(0, 500)
          : null,
      audio_key,
      duration_ms: typeof duration_ms === "number" ? Math.min(duration_ms, 3000) : null,
      category,
      tags: safeTags.slice(0, 3),
      pitch: typeof pitch === "string" ? pitch : null,
      pitch_hz: typeof pitch_hz === "number" ? pitch_hz : null,
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await Promise.all([
    supabase
      .from("sounds")
      .update({ uploader_nickname: finalNickname })
      .eq("device_id", deviceId),
    supabase
      .from("stage_recordings")
      .update({ uploader_nickname: finalNickname })
      .eq("device_id", deviceId),
  ]);

  return Response.json({ sound: data });
}
