import type { NextRequest } from "next/server";
import { presignPutUrl } from "@/lib/r2/presign";

const MAX_BYTES = 200 * 1024;
const ALLOWED_TYPES = new Set([
  "audio/mpeg",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId || !UUID_RE.test(deviceId)) {
    return Response.json({ error: "invalid device id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.fileName !== "string" ||
    typeof body.contentType !== "string" ||
    typeof body.contentLength !== "number"
  ) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const { fileName, contentType, contentLength } = body;
  if (!/^[\w.\-]{1,80}$/.test(fileName)) {
    return Response.json({ error: "invalid filename" }, { status: 400 });
  }
  if (contentLength > MAX_BYTES) {
    return Response.json({ error: "file too large (max 200KB)" }, { status: 413 });
  }
  if (!ALLOWED_TYPES.has(contentType)) {
    return Response.json({ error: "unsupported content type" }, { status: 415 });
  }

  const key = `sounds/${deviceId}/${fileName}`;
  try {
    const url = await presignPutUrl(key, contentType, 60);
    return Response.json({ url, key });
  } catch (e) {
    const message = e instanceof Error ? e.message : "presign failed";
    return Response.json({ error: message }, { status: 503 });
  }
}
