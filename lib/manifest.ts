import "server-only";
import { Redis } from "@upstash/redis";
import type { Manifest } from "./types";

const redis = new Redis({
  url: process.env.STORAGE_KV_REST_API_URL!,
  token: process.env.STORAGE_KV_REST_API_TOKEN!,
});

const EMPTY: Manifest = { folders: [], files: [] };

function manifestKey(username: string) {
  return `manifest:${username}`;
}

export async function getManifest(username: string): Promise<Manifest> {
  const t0 = Date.now();
  console.log(`[getManifest] start username=${username}`);

  const data = await redis.get<Manifest>(manifestKey(username));
  console.log(
    `[getManifest] done in ${Date.now() - t0}ms result=${data ? `folders=${data.folders?.length ?? 0} files=${data.files?.length ?? 0}` : "null"}`
  );

  if (!data) return structuredClone(EMPTY);
  return data;
}

export async function saveManifest(
  username: string,
  manifest: Manifest
): Promise<void> {
  const t0 = Date.now();
  console.log(
    `[saveManifest] start username=${username} folders=${manifest.folders.length} files=${manifest.files.length}`
  );

  await redis.set(manifestKey(username), manifest);
  console.log(`[saveManifest] done in ${Date.now() - t0}ms`);
}
