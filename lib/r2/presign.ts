import { AwsClient } from "aws4fetch";

function client() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }
  return new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

export async function presignPutUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 60,
): Promise<string> {
  const endpoint = process.env.R2_S3_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  if (!endpoint || !bucket) {
    throw new Error("R2 endpoint or bucket not configured");
  }
  const url = new URL(`${endpoint}/${bucket}/${encodeURI(key)}`);
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));

  const signed = await client().sign(url.toString(), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    aws: { signQuery: true },
  });
  return signed.url;
}

export function publicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) throw new Error("R2_PUBLIC_URL not configured");
  return `${base.replace(/\/$/, "")}/${encodeURI(key)}`;
}
