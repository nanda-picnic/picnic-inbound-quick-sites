"use server";

import { auth } from "@/auth";
import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { getManifest, saveManifest } from "./manifest";
import { usernameFromEmail, encodeUniqueName } from "./utils";

async function getSession() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return {
    email: session.user.email,
    username: usernameFromEmail(session.user.email),
  };
}

export async function createFolder(path: string) {
  const { username } = await getSession();
  const manifest = await getManifest(username);

  if (manifest.folders.some((f) => f.path === path)) {
    return { error: "A folder with that name already exists." };
  }

  manifest.folders.push({
    name: path.split("/").pop()!,
    path,
    createdAt: new Date().toISOString(),
  });

  await saveManifest(username, manifest);
  revalidatePath("/");
  return { success: true };
}

export async function uploadFile(formData: FormData) {
  const { username } = await getSession();

  const file = formData.get("file") as File;
  const currentPath = formData.get("currentPath") as string;
  const access = formData.get("access") as "public" | "restricted";
  const allowedUsersRaw = formData.get("allowedUsers") as string;
  const force = formData.get("force") === "true";
  const allowedUsers: string[] = allowedUsersRaw
    ? JSON.parse(allowedUsersRaw)
    : [];

  const filePath =
    currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
  const uniqueName = encodeUniqueName(username, filePath);

  const manifest = await getManifest(username);
  const existing = manifest.files.find((f) => f.path === filePath);

  if (existing && !force) {
    return { conflict: true, error: undefined };
  }

  const blob = await put(`files/${uniqueName}`, file, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "text/html",
  });

  if (existing) {
    manifest.files = manifest.files.filter((f) => f.path !== filePath);
  }

  manifest.files.push({
    name: file.name,
    path: filePath,
    uniqueName,
    blobUrl: blob.url,
    access,
    allowedUsers,
    uploadedAt: new Date().toISOString(),
  });

  await saveManifest(username, manifest);
  revalidatePath("/");
  return { success: true };
}

export async function deleteFile(uniqueName: string) {
  const { username } = await getSession();
  const manifest = await getManifest(username);

  const file = manifest.files.find((f) => f.uniqueName === uniqueName);
  if (!file) return { error: "File not found." };

  await del(file.blobUrl);
  manifest.files = manifest.files.filter((f) => f.uniqueName !== uniqueName);
  await saveManifest(username, manifest);
  revalidatePath("/");
  return { success: true };
}

export async function deleteFolder(path: string) {
  const { username } = await getSession();
  const manifest = await getManifest(username);

  const filesToDelete = manifest.files.filter(
    (f) => f.path === path || f.path.startsWith(path + "/")
  );

  if (filesToDelete.length > 0) {
    await del(filesToDelete.map((f) => f.blobUrl));
  }

  manifest.files = manifest.files.filter(
    (f) => f.path !== path && !f.path.startsWith(path + "/")
  );
  manifest.folders = manifest.folders.filter(
    (f) => f.path !== path && !f.path.startsWith(path + "/")
  );

  await saveManifest(username, manifest);
  revalidatePath("/");
  return { success: true };
}

export async function updateAccess(
  uniqueName: string,
  access: "public" | "restricted",
  allowedUsers: string[]
) {
  const { username } = await getSession();
  const manifest = await getManifest(username);

  const file = manifest.files.find((f) => f.uniqueName === uniqueName);
  if (!file) return { error: "File not found." };

  file.access = access;
  file.allowedUsers = allowedUsers;

  await saveManifest(username, manifest);
  revalidatePath("/");
  return { success: true };
}
