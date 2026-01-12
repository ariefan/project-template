import type { FileInfo } from "../context/file-manager-context";

export interface LocalFilesResponse {
  files: FileInfo[];
  path?: string;
}

export interface FileApiResponse {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

export interface UploadProgress {
  file: string;
  loaded: number;
  total: number;
}

export interface FileManagerApi {
  fetchLocalFiles: (path?: string) => Promise<LocalFilesResponse>;
  searchFiles: (query: string) => Promise<LocalFilesResponse>;
  fetchAllFiles: () => Promise<FileApiResponse[]>;
  uploadFile: (
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ) => Promise<FileInfo>;
  uploadFiles: (
    files: File[],
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ) => Promise<FileInfo[]>;
  downloadFile: (file: FileInfo) => Promise<void>;
  deleteFiles: (paths: string[]) => Promise<void>;
  createFolder: (name: string, path: string) => Promise<FileInfo>;
  copyFile: (sourcePath: string, destinationPath: string) => Promise<FileInfo>;
  moveFile: (sourcePath: string, destinationPath: string) => Promise<FileInfo>;
  renameFile: (path: string, newName: string) => Promise<FileInfo>;
  getPreviewUrl: (path: string) => string;
}

// Helper for XHR file upload (avoids async/await complexity in the main object)
function uploadSingleFile(
  file: File,
  url: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileInfo> {
  return new Promise<FileInfo>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({ file: file.name, loaded: e.loaded, total: e.total });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.files?.[0]) {
            resolve(response.files[0]);
          } else {
            reject(new Error("Upload failed: no file returned"));
          }
        } catch (_e) {
          reject(new Error("Upload failed: invalid JSON response"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed: network error"));
    });

    xhr.open("POST", url);
    xhr.send(formData);
  });
}

export function createFileManagerApi(baseUrl: string): FileManagerApi {
  const getUrl = (endpoint: string) => `${baseUrl}${endpoint}`;

  return {
    fetchLocalFiles: async (path?: string) => {
      const url = path ? getUrl(`/storage/${path}`) : getUrl("/storage");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }
      return response.json();
    },

    searchFiles: async (query: string) => {
      const url = getUrl(`/storage/search?q=${encodeURIComponent(query)}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to search files: ${response.statusText}`);
      }
      return response.json();
    },

    fetchAllFiles: async () => {
      const url = getUrl("/storage/all");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }
      const data: LocalFilesResponse = await response.json();
      return data.files;
    },

    uploadFile: (
      file: File,
      path: string,
      onProgress?: (progress: UploadProgress) => void
    ) => {
      const url = path
        ? getUrl(`/storage/upload/${path}`)
        : getUrl("/storage/upload/");
      return uploadSingleFile(file, url, onProgress);
    },

    uploadFiles: async (
      files: File[],
      path: string,
      onProgress?: (progress: UploadProgress) => void
    ) => {
      const results: FileInfo[] = [];
      const url = path
        ? getUrl(`/storage/upload/${path}`)
        : getUrl("/storage/upload/");

      for (const file of files) {
        try {
          const uploaded = await uploadSingleFile(file, url, onProgress);
          results.push(uploaded);
        } catch {
          // Ignore error for individual files in batch
        }
      }
      return results;
    },

    downloadFile: async (file: FileInfo) => {
      const url = getUrl(`/storage/download/${file.path}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    },

    deleteFiles: async (paths: string[]) => {
      const url = getUrl("/storage");
      const response = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: paths }),
      });
      if (!response.ok) {
        throw new Error(`Failed to delete files: ${response.statusText}`);
      }
    },

    createFolder: async (name: string, path: string) => {
      const url = path
        ? getUrl(`/storage/folder/${path}`)
        : getUrl("/storage/folder");

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || `Failed to create folder: ${response.statusText}`
        );
      }
      const data = await response.json();
      return data.folder;
    },

    copyFile: async (sourcePath: string, destinationPath: string) => {
      const url = getUrl(`/storage/copy/${sourcePath}`);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: destinationPath }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || `Failed to copy: ${response.statusText}`
        );
      }
      const data = await response.json();
      return data.file;
    },

    moveFile: async (sourcePath: string, destinationPath: string) => {
      const url = getUrl(`/storage/move/${sourcePath}`);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: destinationPath }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || `Failed to move: ${response.statusText}`
        );
      }
      const data = await response.json();
      return data.file;
    },

    renameFile: async (path: string, newName: string) => {
      const url = getUrl(`/storage/rename/${path}`);
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || `Failed to rename: ${response.statusText}`
        );
      }
      const data = await response.json();
      return data.file;
    },

    getPreviewUrl: (path: string) => {
      return getUrl(`/storage/preview/${path}`);
    },
  };
}
