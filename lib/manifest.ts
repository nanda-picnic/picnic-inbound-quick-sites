import "server-only";
import { get, put } from "@vercel/blob";
import type { Manifest } from "./types";

const EMPTY: Manifest = { folders: [], files: [] };

export async function getManifest(username: string): Promise<Manifest> {
  const result = await get(`manifests/${username}.json`, { access: "private" });
  if (!result) return structuredClone(EMPTY);
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as Manifest;
}

export async function saveManifest(
  username: string,
  manifest: Manifest
): Promise<void> {
  await put(`manifests/${username}.json`, JSON.stringify(manifest), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
