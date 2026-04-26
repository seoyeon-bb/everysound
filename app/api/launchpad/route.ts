import type { NextRequest } from "next/server";
import { supabaseServerAdmin, supabaseServerAnon } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PADS = 12;

export async function GET(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId || !UUID_RE.test(deviceId)) {
    return Response.json({ error: "invalid device id" }, { status: 400 });
  }

  const supabase = supabaseServerAnon();
  if (!supabase) {
    return Response.json({ error: "server not configured" }, { status: 503 });
  }
  const { data, error } = await supabase
    .from("launchpad_sounds")
    .select("position, sound:sounds(*)")
    .eq("device_id", deviceId)
    .order("position", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ slots: data ?? [] });
}

export async function POST(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId || !UUID_RE.test(deviceId)) {
    return Response.json({ error: "invalid device id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const soundId = body?.sound_id;
  if (typeof soundId !== "string" || !UUID_RE.test(soundId)) {
    return Response.json({ error: "invalid sound_id" }, { status: 400 });
  }

  const supabase = supabaseServerAdmin();
  if (!supabase) {
    return Response.json({ error: "server not configured" }, { status: 503 });
  }

  const { error: padErr } = await supabase
    .from("launchpads")
    .upsert({ device_id: deviceId }, { onConflict: "device_id" });
  if (padErr) {
    return Response.json({ error: padErr.message }, { status: 500 });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("launchpad_sounds")
    .select("position, sound_id")
    .eq("device_id", deviceId);
  if (fetchErr) {
    return Response.json({ error: fetchErr.message }, { status: 500 });
  }

  if (existing?.some((s) => s.sound_id === soundId)) {
    return Response.json({ error: "already_added" }, { status: 409 });
  }

  const occupied = new Set(existing?.map((s) => s.position) ?? []);
  let position = -1;
  for (let i = 0; i < PADS; i++) {
    if (!occupied.has(i)) {
      position = i;
      break;
    }
  }
  if (position === -1) {
    return Response.json({ error: "launchpad_full" }, { status: 409 });
  }

  const { error: insertErr } = await supabase
    .from("launchpad_sounds")
    .insert({ device_id: deviceId, position, sound_id: soundId });
  if (insertErr) {
    return Response.json({ error: insertErr.message }, { status: 500 });
  }
  return Response.json({ position });
}

export async function DELETE(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId || !UUID_RE.test(deviceId)) {
    return Response.json({ error: "invalid device id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const positionParam = url.searchParams.get("position");
  const position = positionParam === null ? NaN : Number(positionParam);
  if (!Number.isInteger(position) || position < 0 || position >= PADS) {
    return Response.json({ error: "invalid position" }, { status: 400 });
  }

  const supabase = supabaseServerAdmin();
  if (!supabase) {
    return Response.json({ error: "server not configured" }, { status: 503 });
  }
  const { error } = await supabase
    .from("launchpad_sounds")
    .delete()
    .eq("device_id", deviceId)
    .eq("position", position);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
