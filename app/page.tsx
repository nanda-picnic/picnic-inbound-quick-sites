import { auth } from "@/auth";
import { getManifest, saveManifest } from "@/lib/manifest";
import { usernameFromEmail } from "@/lib/utils";
import { Manifest, FolderEntry, FileEntry } from "@/lib/types";
import FileManager from "@/components/FileManager";

function getItemsAtPath(
  manifest: Manifest,
  currentPath: string
): { folders: FolderEntry[]; files: FileEntry[] } {
  const prefix = currentPath === "/" ? "" : currentPath;

  const folders = manifest.folders.filter((f) => {
    if (!f.path.startsWith(prefix + "/")) return false;
    const rest = f.path.slice(prefix.length + 1);
    return !rest.includes("/");
  });

  const files = manifest.files.filter((f) => {
    if (!f.path.startsWith(prefix + "/")) return false;
    const rest = f.path.slice(prefix.length + 1);
    return !rest.includes("/");
  });

  return { folders, files };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ path?: string }>;
}) {
  const session = await auth();
  const email = session!.user!.email!;
  const username = usernameFromEmail(email);

  const { path } = await searchParams;
  const currentPath = path && path.startsWith("/") ? path : "/";

  let manifest = await getManifest(username);

  // First login: manifest is empty, save it to initialise the user's blob
  if (manifest.folders.length === 0 && manifest.files.length === 0) {
    await saveManifest(username, manifest);
  }

  const { folders, files } = getItemsAtPath(manifest, currentPath);

  return (
    <FileManager
      folders={folders}
      files={files}
      currentPath={currentPath}
      email={email}
    />
  );
}
