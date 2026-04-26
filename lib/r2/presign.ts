import { AwsClient } from "aws4fetch";

function client() {
  return new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });
}

export async function presignPutUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 60,
): Promise<string> {
  const endpoint = process.env.R2_S3_ENDPOINT!;
  const bucket = process.env.R2_BUCKET!;
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
  const base = process.env.R2_PUBLIC_URL!;
  return `${base.replace(/\/$/, "")}/${encodeURI(key)}`;
}
