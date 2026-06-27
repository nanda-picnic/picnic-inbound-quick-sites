"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/actions";

interface Props {
  currentPath: string;
  onClose: () => void;
}

export default function UploadModal({ currentPath, onClose }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [access, setAccess] = useState<"public" | "restricted">("public");
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(force = false) {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Please select a file.");

    if (file.size > 25 * 1024 * 1024) {
      return setError(
        "This file is larger than 25 MB. Please optimise it before uploading — try minifying the HTML/CSS/JS or compressing any embedded images."
      );
    }

    setLoading(true);
    setError("");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("currentPath", currentPath);
    fd.append("access", access);
    fd.append("allowedUsers", JSON.stringify(allowedUsers));
    if (force) fd.append("force", "true");

    const result = await uploadFile(fd);

    if (result?.conflict) {
      setLoading(false);
      if (
        confirm(
          `A file named "${file.name}" already exists here. Replace it?`
        )
      ) {
        await submit(true);
      }
      return;
    }

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  }

  function addUser() {
    const u = userInput.trim().toLowerCase().replace(/@teampicnic\.com$/, "");
    if (u && !allowedUsers.includes(u)) {
      setAllowedUsers((prev) => [...prev, u]);
    }
    setUserInput("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-1 text-base font-semibold text-zinc-900">
          Upload HTML file
        </h2>

        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Beta: do not upload sensitive information. This project is still in
          beta.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-700">File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".html,.htm"
              className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-xs file:font-medium"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-700">Access</label>
            <div className="flex gap-4">
              {(["public", "restricted"] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="access"
                    value={opt}
                    checked={access === opt}
                    onChange={() => setAccess(opt)}
                  />
                  <span className="capitalize">{opt}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {access === "public"
                ? "Any logged-in @teampicnic.com user with the link can view."
                : "Only the Picnic users you specify can view."}
            </p>
          </div>

          {access === "restricted" && (
            <div>
              <label className="mb-1 block text-sm text-zinc-700">
                Allowed users
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUser()}
                  placeholder="username or email"
                  className="flex-1 rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-zinc-400"
                />
                <button
                  type="button"
                  onClick={addUser}
                  className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium hover:bg-zinc-200"
                >
                  Add
                </button>
              </div>
              {allowedUsers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {allowedUsers.map((u) => (
                    <span
                      key={u}
                      className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                    >
                      {u}
                      <button
                        onClick={() =>
                          setAllowedUsers((prev) => prev.filter((x) => x !== u))
                        }
                        className="text-zinc-400 hover:text-zinc-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={() => submit(false)}
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
