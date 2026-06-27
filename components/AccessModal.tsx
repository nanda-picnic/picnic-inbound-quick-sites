"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAccess } from "@/lib/actions";
import type { FileEntry } from "@/lib/types";

interface Props {
  file: FileEntry;
  onClose: () => void;
}

export default function AccessModal({ file, onClose }: Props) {
  const router = useRouter();
  const [access, setAccess] = useState<"public" | "restricted">(file.access);
  const [allowedUsers, setAllowedUsers] = useState<string[]>(
    file.allowedUsers ?? []
  );
  const [userInput, setUserInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done && !isPending) onClose();
  }, [done, isPending, onClose]);

  function addUser() {
    const u = userInput.trim().toLowerCase().replace(/@teampicnic\.com$/, "");
    if (u && !allowedUsers.includes(u)) {
      setAllowedUsers((prev) => [...prev, u]);
    }
    setUserInput("");
  }

  async function save() {
    setError("");
    const result = await updateAccess(file.uniqueName, access, allowedUsers);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    startTransition(() => router.refresh());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-1 text-base font-semibold text-zinc-900">
          Access settings
        </h2>
        <p className="mb-4 text-sm text-zinc-500">{file.name}</p>

        <div className="space-y-4">
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
              onClick={save}
              disabled={isPending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
