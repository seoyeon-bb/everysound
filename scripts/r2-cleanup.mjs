import { AwsClient } from "aws4fetch";

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_S3_ENDPOINT,
  R2_BUCKET,
} = process.env;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_S3_ENDPOINT || !R2_BUCKET) {
  console.error("Missing R2 env vars");
  process.exit(1);
}

const aws = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

async function listAll() {
  const keys = [];
  let token = null;
  while (true) {
    const url = new URL(`${R2_S3_ENDPOINT}/${R2_BUCKET}/`);
    url.searchParams.set("list-type", "2");
    if (token) url.searchParams.set("continuation-token", token);
    const r = await aws.fetch(url, { method: "GET" });
    if (!r.ok) throw new Error(`list HTTP ${r.status}: ${await r.text()}`);
    const xml = await r.text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(m[1]);
    if (!xml.includes("<IsTruncated>true</IsTruncated>")) break;
    const tk = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    if (!tk) break;
    token = tk[1];
  }
  return keys;
}

async function del(key) {
  const url = new URL(`${R2_S3_ENDPOINT}/${R2_BUCKET}/${encodeURI(key)}`);
  const r = await aws.fetch(url, { method: "DELETE" });
  if (!r.ok && r.status !== 204) throw new Error(`delete ${key}: HTTP ${r.status}`);
}

console.log("Listing objects in", R2_BUCKET, "...");
const keys = await listAll();
console.log(`Found ${keys.length} objects.`);

if (keys.length > 0) {
  console.log("Sample (first 5):");
  for (const k of keys.slice(0, 5)) console.log("  ", k);
}

if (process.argv.includes("--delete") && keys.length > 0) {
  console.log("\nDeleting...");
  let done = 0;
  for (const key of keys) {
    await del(key);
    done++;
    if (done % 10 === 0 || done === keys.length) console.log(`  ${done}/${keys.length}`);
  }
  console.log("Done.");
} else if (keys.length > 0) {
  console.log("\n(dry run — pass --delete to actually delete)");
}
