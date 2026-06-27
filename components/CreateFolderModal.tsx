"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFolder } from "@/lib/actions";

interface Props {
  currentPath: string;
  onClose: () => void;
}

export default function CreateFolderModal({ currentPath, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done && !isPending) onClose();
  }, [done, isPending, onClose]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError("Please enter a folder name.");
    if (/[/\\]/.test(trimmed))
      return setError("Folder name cannot contain slashes.");

    setError("");
    const path =
      currentPath === "/" ? `/${trimmed}` : `${currentPath}/${trimmed}`;
    const result = await createFolder(path);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setDone(true);
    startTransition(() => router.refresh());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">
          New folder
        </h2>

        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Folder name"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-zinc-400"
        />

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
