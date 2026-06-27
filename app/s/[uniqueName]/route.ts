import { auth } from "@/auth";
import { get } from "@vercel/blob";
import { decodeUniqueName, usernameFromEmail } from "@/lib/utils";
import { getManifest } from "@/lib/manifest";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uniqueName: string }> }
) {
  const { uniqueName } = await params;

  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const viewerUsername = usernameFromEmail(session.user.email);

  let decoded: { username: string; path: string };
  try {
    decoded = decodeUniqueName(uniqueName);
  } catch {
    return new Response("Invalid file identifier", { status: 400 });
  }

  const manifest = await getManifest(decoded.username);
  const file = manifest.files.find((f) => f.uniqueName === uniqueName);

  if (!file) {
    return new Response("File not found", { status: 404 });
  }

  if (
    file.access === "restricted" &&
    !file.allowedUsers.includes(viewerUsername)
  ) {
    return new Response("You don't have access to this file", { status: 403 });
  }

  const result = await get(file.blobUrl, { access: "private" });
  if (!result) {
    return new Response("File content not found", { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
