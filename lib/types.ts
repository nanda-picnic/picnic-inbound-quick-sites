export interface FileEntry {
  name: string;
  path: string;
  uniqueName: string;
  blobUrl: string;
  access: "public" | "restricted";
  allowedUsers: string[];
  uploadedAt: string;
}

export interface FolderEntry {
  name: string;
  path: string;
  createdAt: string;
}

export interface Manifest {
  folders: FolderEntry[];
  files: FileEntry[];
}
