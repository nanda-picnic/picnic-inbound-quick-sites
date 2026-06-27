# Implementation Plan

## Overview

A private file manager where authenticated `@teampicnic.com` users can upload HTML files, organise them in folders, and share them via links — backed by Vercel Blob storage.

---

## Data Model

### User Manifest (`manifest/{username}.json`)
One private blob per user, created on first login. Stores the full state of their file tree.

```json
{
  "folders": [
    { "name": "campaigns", "path": "/campaigns", "createdAt": "..." }
  ],
  "files": [
    {
      "name": "landing.html",
      "path": "/campaigns/landing.html",
      "uniqueName": "<base64>",
      "blobUrl": "<vercel-internal-url>",
      "access": "public" | "restricted",
      "allowedUsers": ["nanda", "jan", "sophie"],
      "uploadedAt": "..."
    }
  ]
}
```

- `access: "public"` — any logged-in `@teampicnic.com` user can view
- `access: "restricted"` — only usernames listed in `allowedUsers` can view (usernames are the part before `@` in their Picnic email)

### File Blobs (`files/{uniqueName}`)
Each uploaded file stored as a private blob. The unique name is `base64(username + ":" + fullPath)`, e.g. `base64("nanda:/campaigns/landing.html")`.

---

## App Routes

| Route | Description |
|---|---|
| `/` | File manager root (protected) |
| `/s/[uniqueName]` | File serving route |
| `/api/manifest` | Read/write user manifest |
| `/api/upload` | Handle file upload to blob |

Folder navigation is handled client-side within `/` (no separate route per folder).

---

## Implementation Steps

### 1. Dependencies
- Install `@vercel/blob`
- Add `BLOB_READ_WRITE_TOKEN` to env vars

### 2. Types (`lib/types.ts`)
TypeScript types for `Manifest`, `FileEntry`, `FolderEntry`.

### 3. Manifest helpers (`lib/manifest.ts`)
Server-only functions:
- `getManifest(username)` — fetch and parse the user's manifest blob; create empty one if first login
- `saveManifest(username, manifest)` — write updated manifest back to blob

### 4. Server Actions (`lib/actions.ts`)
- `uploadFile(formData)` — upload HTML to blob, update manifest
- `createFolder(path)` — add folder entry to manifest
- `deleteFile(uniqueName)` — delete blob, remove from manifest
- `deleteFolder(path)` — delete all child blobs and folder from manifest
- `updateAccess(uniqueName, access)` — toggle public/restricted in manifest

### 5. File Manager UI (`app/page.tsx`)
- Breadcrumb navigation for current folder
- Table listing folders and files in the current folder
- Per-row actions: copy link, toggle access, delete
- "New folder" and "Upload file" buttons
- State managed via URL search params (`?path=/campaigns`)

### 6. Upload Modal
- File picker (HTML files only)
- Access toggle: Public / Restricted
- If Restricted: text input to add Picnic usernames to the allowlist (e.g. type `nanda` and press Enter to add)
- Beta disclaimer banner: _"Do not share sensitive information — this project is in beta."_

### 7. File Serving Route (`app/s/[uniqueName]/route.ts`)
1. Decode `uniqueName` → extract uploader's username and file path
2. Fetch uploader's manifest, find the file entry
3. **If `access: "restricted"`** — check viewer's username (before `@`) is in `allowedUsers`; return 403 otherwise
4. **If `access: "public"`** — any logged-in `@teampicnic.com` user can view
5. Fetch the private blob server-side, stream its HTML content to the response

### 8. First-login Manifest Init
In the auth callback (or a server action called on first page load), check if a manifest blob exists for the user; create an empty one if not.

---

## Decisions

**Q1 — Public file access scope:**
"Public" means any logged-in `@teampicnic.com` user with the link. No unauthenticated access.

**Q2 — Duplicate file names:**
Prompt the user to confirm replacement. If confirmed, overwrite the existing blob and update the manifest entry in place.

**Q3 — File serving URL:**
Base64 unique name in the URL is acceptable for now. Example: `/s/bmFuZGE6L2NhbXBhaWducy9sYW5kaW5nLmh0bWw=`

**Q4 — Restricted access:**
"Restricted" means the uploader specifies a list of Picnic usernames (the part before `@` in their email, e.g. `nanda` for `nanda@teampicnic.com`) who are allowed to view the file. The file serving route checks the viewer's username against this list.
