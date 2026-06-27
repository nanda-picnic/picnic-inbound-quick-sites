"use server";

import { auth } from "@/auth";
import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { getManifest, saveManifest } from "./manifest";
import { usernameFromEmail, encodeUniqueName } from "./utils";

function log(action: string, msg: string) {
  console.log(`[${action}] ${msg}`);
}

async function getSession() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return {
    email: session.user.email,
    username: usernameFromEmail(session.user.email),
  };
}

export async function createFolder(path: string) {
  log("createFolder", `start path=${path}`);
  try {
    const { username } = await getSession();
    log("createFolder", `user=${username}`);

    const manifest = await getManifest(username);
    log("createFolder", `manifest read: folders=${manifest.folders.length} files=${manifest.files.length}`);

    if (manifest.folders.some((f) => f.path === path)) {
      log("createFolder", `duplicate folder ${path}`);
      return { error: "A folder with that name already exists." };
    }

    manifest.folders.push({
      name: path.split("/").pop()!,
      path,
      createdAt: new Date().toISOString(),
    });

    log("createFolder", `saving manifest with ${manifest.folders.length} folders`);
    await saveManifest(username, manifest);
    log("createFolder", "manifest saved OK");

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    log("createFolder", `ERROR: ${e instanceof Error ? e.message : e}`);
    return { error: e instanceof Error ? e.message : "Failed to create folder." };
  }
}

export async function uploadFile(formData: FormData) {
  log("uploadFile", "start");
  try {
    const { username } = await getSession();
    log("uploadFile", `user=${username}`);

    const file = formData.get("file") as File;
    const currentPath = formData.get("currentPath") as string;
    const access = formData.get("access") as "public" | "restricted";
    const allowedUsersRaw = formData.get("allowedUsers") as string;
    const force = formData.get("force") === "true";
    const allowedUsers: string[] = allowedUsersRaw ? JSON.parse(allowedUsersRaw) : [];

    log("uploadFile", `file=${file.name} size=${file.size} currentPath=${currentPath} access=${access} force=${force}`);

    const filePath = currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
    const uniqueName = encodeUniqueName(username, filePath);
    log("uploadFile", `filePath=${filePath} uniqueName=${uniqueName}`);

    const manifest = await getManifest(username);
    log("uploadFile", `manifest read: folders=${manifest.folders.length} files=${manifest.files.length}`);

    const existing = manifest.files.find((f) => f.path === filePath);
    if (existing && !force) {
      log("uploadFile", `conflict: file already exists at ${filePath}`);
      return { conflict: true, error: undefined };
    }

    log("uploadFile", `uploading blob to files/${uniqueName}`);
    const blob = await put(`files/${uniqueName}`, file, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "text/html",
    });
    log("uploadFile", `blob uploaded OK url=${blob.url}`);

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

    log("uploadFile", `saving manifest with ${manifest.files.length} files`);
    await saveManifest(username, manifest);
    log("uploadFile", "manifest saved OK");

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    log("uploadFile", `ERROR: ${e instanceof Error ? e.message : e}`);
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function deleteFile(uniqueName: string) {
  log("deleteFile", `start uniqueName=${uniqueName}`);
  try {
    const { username } = await getSession();
    log("deleteFile", `user=${username}`);

    const manifest = await getManifest(username);
    log("deleteFile", `manifest read: files=${manifest.files.length}`);

    const file = manifest.files.find((f) => f.uniqueName === uniqueName);
    if (!file) {
      log("deleteFile", "file not found in manifest");
      return { error: "File not found." };
    }

    log("deleteFile", `deleting blob url=${file.blobUrl}`);
    await del(file.blobUrl);
    log("deleteFile", "blob deleted OK");

    manifest.files = manifest.files.filter((f) => f.uniqueName !== uniqueName);

    log("deleteFile", `saving manifest with ${manifest.files.length} files`);
    await saveManifest(username, manifest);
    log("deleteFile", "manifest saved OK");

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    log("deleteFile", `ERROR: ${e instanceof Error ? e.message : e}`);
    return { error: e instanceof Error ? e.message : "Failed to delete file." };
  }
}

export async function deleteFolder(path: string) {
  log("deleteFolder", `start path=${path}`);
  try {
    const { username } = await getSession();
    log("deleteFolder", `user=${username}`);

    const manifest = await getManifest(username);
    log("deleteFolder", `manifest read: folders=${manifest.folders.length} files=${manifest.files.length}`);

    const filesToDelete = manifest.files.filter(
      (f) => f.path === path || f.path.startsWith(path + "/")
    );
    log("deleteFolder", `files to delete: ${filesToDelete.length}`);

    if (filesToDelete.length > 0) {
      await del(filesToDelete.map((f) => f.blobUrl));
      log("deleteFolder", "blobs deleted OK");
    }

    manifest.files = manifest.files.filter(
      (f) => f.path !== path && !f.path.startsWith(path + "/")
    );
    manifest.folders = manifest.folders.filter(
      (f) => f.path !== path && !f.path.startsWith(path + "/")
    );

    log("deleteFolder", `saving manifest: folders=${manifest.folders.length} files=${manifest.files.length}`);
    await saveManifest(username, manifest);
    log("deleteFolder", "manifest saved OK");

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    log("deleteFolder", `ERROR: ${e instanceof Error ? e.message : e}`);
    return { error: e instanceof Error ? e.message : "Failed to delete folder." };
  }
}

export async function updateAccess(
  uniqueName: string,
  access: "public" | "restricted",
  allowedUsers: string[]
) {
  log("updateAccess", `start uniqueName=${uniqueName} access=${access}`);
  try {
    const { username } = await getSession();
    log("updateAccess", `user=${username}`);

    const manifest = await getManifest(username);
    log("updateAccess", `manifest read: files=${manifest.files.length}`);

    const file = manifest.files.find((f) => f.uniqueName === uniqueName);
    if (!file) {
      log("updateAccess", "file not found in manifest");
      return { error: "File not found." };
    }

    file.access = access;
    file.allowedUsers = allowedUsers;

    log("updateAccess", `saving manifest`);
    await saveManifest(username, manifest);
    log("updateAccess", "manifest saved OK");

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    log("updateAccess", `ERROR: ${e instanceof Error ? e.message : e}`);
    return { error: e instanceof Error ? e.message : "Failed to update access." };
  }
}
