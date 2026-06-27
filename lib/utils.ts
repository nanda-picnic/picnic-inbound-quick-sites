export function usernameFromEmail(email: string) {
  return email.split("@")[0];
}

export function encodeUniqueName(username: string, path: string) {
  return Buffer.from(`${username}:${path}`).toString("base64url");
}

export function decodeUniqueName(uniqueName: string): {
  username: string;
  path: string;
} {
  const decoded = Buffer.from(uniqueName, "base64url").toString("utf-8");
  const colonIdx = decoded.indexOf(":");
  return {
    username: decoded.slice(0, colonIdx),
    path: decoded.slice(colonIdx + 1),
  };
}
