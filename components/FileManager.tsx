"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { deleteFile, deleteFolder } from "@/lib/actions";
import type { FileEntry, FolderEntry } from "@/lib/types";
import UploadModal from "./UploadModal";
import CreateFolderModal from "./CreateFolderModal";
import AccessModal from "./AccessModal";

interface Props {
  folders: FolderEntry[];
  files: FileEntry[];
  currentPath: string;
  email: string;
}

export default function FileManager({
  folders,
  files,
  currentPath,
  email,
}: Props) {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [accessFile, setAccessFile] = useState<FileEntry | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const segments =
    currentPath === "/" ? [] : currentPath.split("/").filter(Boolean);

  function navigateTo(path: string) {
    router.push(path === "/" ? "/" : `/?path=${encodeURIComponent(path)}`);
  }

  async function handleDeleteFile(uniqueName: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteFile(uniqueName);
    router.refresh();
  }

  async function handleDeleteFolder(path: string, name: string) {
    if (
      !confirm(
        `Delete folder "${name}" and all its contents? This cannot be undone.`
      )
    )
      return;
    await deleteFolder(path);
    router.refresh();
  }

  function copyLink(uniqueName: string) {
    const url = `${window.location.origin}/s/${uniqueName}`;
    navigator.clipboard.writeText(url);
    setCopied(uniqueName);
    setTimeout(() => setCopied(null), 2000);
  }

  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
        <span className="text-sm font-semibold text-zinc-900">
          Picnic QuikSites
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">{email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-600"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1 text-sm">
          <button
            onClick={() => navigateTo("/")}
            className="text-zinc-500 hover:text-zinc-900"
          >
            Home
          </button>
          {segments.map((seg, i) => {
            const segPath = "/" + segments.slice(0, i + 1).join("/");
            const isLast = i === segments.length - 1;
            return (
              <span key={segPath} className="flex items-center gap-1">
                <span className="text-zinc-300">/</span>
                {isLast ? (
                  <span className="font-medium text-zinc-900">{seg}</span>
                ) : (
                  <button
                    onClick={() => navigateTo(segPath)}
                    className="text-zinc-500 hover:text-zinc-900"
                  >
                    {seg}
                  </button>
                )}
              </span>
            );
          })}
        </nav>

        {/* Action bar */}
        <div className="mb-4 flex items-center justify-end gap-2">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            + New folder
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Upload file
          </button>
        </div>

        {/* File list */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <p className="text-sm">No files or folders yet.</p>
            <p className="mt-1 text-xs">Upload an HTML file to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                <th className="py-2 text-left font-medium">Name</th>
                <th className="py-2 text-left font-medium">Access</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {folders.map((folder) => (
                <tr key={folder.path} className="group">
                  <td className="py-3">
                    <button
                      onClick={() => navigateTo(folder.path)}
                      className="flex items-center gap-2 text-zinc-800 hover:text-zinc-900"
                    >
                      <FolderIcon />
                      <span>{folder.name}</span>
                    </button>
                  </td>
                  <td className="py-3 text-zinc-400">—</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() =>
                        handleDeleteFolder(folder.path, folder.name)
                      }
                      className="text-xs text-zinc-400 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {files.map((file) => (
                <tr key={file.uniqueName} className="group">
                  <td className="py-3">
                    <span className="flex items-center gap-2 text-zinc-800">
                      <FileIcon />
                      <span>{file.name}</span>
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        file.access === "public"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {file.access}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => copyLink(file.uniqueName)}
                        className="text-xs text-zinc-400 hover:text-zinc-700"
                      >
                        {copied === file.uniqueName ? "Copied!" : "Copy link"}
                      </button>
                      <button
                        onClick={() => setAccessFile(file)}
                        className="text-xs text-zinc-400 hover:text-zinc-700"
                      >
                        Access
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteFile(file.uniqueName, file.name)
                        }
                        className="text-xs text-zinc-400 hover:text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>

      {showUpload && (
        <UploadModal
          currentPath={currentPath}
          onClose={() => setShowUpload(false)}
        />
      )}
      {showCreateFolder && (
        <CreateFolderModal
          currentPath={currentPath}
          onClose={() => setShowCreateFolder(false)}
        />
      )}
      {accessFile && (
        <AccessModal
          file={accessFile}
          onClose={() => setAccessFile(null)}
        />
      )}
    </div>
  );
}

function FolderIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-zinc-400"
    >
      <path
        d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6l1.5 1.5H13.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V3.5z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-zinc-400"
    >
      <path
        d="M4 2h5.5L12 4.5V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        fill="currentColor"
        opacity="0.5"
      />
      <path d="M9.5 2 12 4.5H9.5V2z" fill="currentColor" opacity="0.8" />
    </svg>
  );
}
