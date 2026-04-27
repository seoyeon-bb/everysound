import type { NextRequest } from "next/server";
import { supabaseServerAdmin } from "@/lib/supabase/server";

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

  const { id, title, summary, audio_key, duration_ms, uploader_nickname } = body;

  if (typeof title !== "string" || !title.trim() || title.length > 40) {
    return Response.json({ error: "invalid title" }, { status: 400 });
  }
  if (typeof summary !== "string" || !summary.trim() || summary.length > 80) {
    return Response.json({ error: "invalid summary" }, { status: 400 });
  }
  if (typeof audio_key !== "string" || !audio_key.startsWith(`stage/${deviceId}/`)) {
    return Response.json({ error: "invalid audio_key" }, { status: 400 });
  }
  if (id !== undefined && (typeof id !== "string" || !UUID_RE.test(id))) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const supabase = supabaseServerAdmin();
  if (!supabase) {
    return Response.json({ error: "server not configured" }, { status: 503 });
  }

  const finalNickname =
    typeof uploader_nickname === "string" && uploader_nickname.trim()
      ? uploader_nickname.trim().slice(0, 20)
      : null;

  const { data, error } = await supabase
    .from("stage_recordings")
    .insert({
      ...(id ? { id } : {}),
      device_id: deviceId,
      uploader_nickname: finalNickname,
      title: title.trim(),
      summary: summary.trim(),
      audio_key,
      duration_ms:
        typeof duration_ms === "number" && Number.isFinite(duration_ms)
          ? Math.min(Math.round(duration_ms), 60_000)
          : null,
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ recording: data });
}
