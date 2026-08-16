"use client";

import { useRef, useState } from "react";
import { Download, FileUp, LoaderCircle, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadedFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export interface FileUploadProps {
  id?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeBytes?: number;
  disabled?: boolean;
  files?: File[];
  uploadedFiles?: UploadedFile[];
  onFilesChange?: (files: File[]) => void;
  onUpload?: (file: File, onProgress: (progress: number) => void) => Promise<void>;
  onDownload?: (file: UploadedFile) => Promise<void> | void;
  onDelete?: (file: UploadedFile) => Promise<void>;
  onError?: (message: string) => void;
  label?: string;
  description?: string;
  className?: string;
}

function fileKey(file: File, index: number): string {
  return `${file.name}-${file.lastModified}-${index}`;
}

export function FileUpload({
  id = "file-upload",
  accept,
  multiple = false,
  maxSizeBytes = 10 * 1024 * 1024,
  disabled = false,
  files = [],
  uploadedFiles = [],
  onFilesChange,
  onUpload,
  onDownload,
  onDelete,
  onError,
  label = "Unggah dokumen",
  description = "PDF, DOCX, XLSX, PNG, atau JPG. Maksimal 10 MB per file.",
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadFiles(nextFiles: File[]) {
    if (!onUpload) return;
    setUploading(true);
    setMessage(null);
    try {
      for (let index = 0; index < nextFiles.length; index += 1) {
        const file = nextFiles[index];
        if (!file) continue;
        const key = fileKey(file, index);
        await onUpload(file, (value) => setProgress((current) => ({ ...current, [key]: value })));
        setPendingFiles((current) => current.filter((item) => item !== file));
        onFilesChange?.(files.filter((item) => item !== file));
        setMessage(`${file.name} berhasil diunggah.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "File belum dapat diunggah.";
      setMessage(errorMessage);
      onError?.(errorMessage);
    } finally {
      setUploading(false);
      setProgress({});
    }
  }

  function addFiles(selectedFiles: FileList | null) {
    if (!selectedFiles) return;
    const nextFiles = Array.from(selectedFiles);
    const invalidFile = nextFiles.find((file) => file.size > maxSizeBytes);
    if (invalidFile) {
      const errorMessage = `Ukuran ${invalidFile.name} melebihi batas ${Math.round(maxSizeBytes / 1024 / 1024)} MB.`;
      setMessage(errorMessage);
      onError?.(errorMessage);
      return;
    }
    const selected = multiple ? [...files, ...nextFiles] : nextFiles.slice(0, 1);
    onFilesChange?.(selected);
    if (onUpload) {
      setPendingFiles((current) => (multiple ? [...current, ...nextFiles] : nextFiles.slice(0, 1)));
      void uploadFiles(nextFiles);
    }
  }

  async function removeUploadedFile(file: UploadedFile) {
    if (!onDelete) return;
    setDeleting(file.id);
    setMessage(null);
    try {
      await onDelete(file);
      setMessage(`${file.originalName} dihapus.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "File belum dapat dihapus.";
      setMessage(errorMessage);
      onError?.(errorMessage);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "rounded-xl border-2 border-dashed bg-muted/20 p-6 text-center transition-colors",
          dragActive && "border-primary bg-primary/5",
          (disabled || uploading) && "cursor-not-allowed opacity-60",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !uploading) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (!disabled && !uploading) addFiles(event.dataTransfer.files);
        }}
      >
        <FileUp className="mx-auto size-7 text-primary" aria-hidden="true" />
        <p className="mt-3 font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          disabled={disabled || uploading}
          onChange={(event) => {
            addFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />
        <Button
          id={`${id}-trigger`}
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? <LoaderCircle className="animate-spin" /> : null}
          {uploading ? "Mengunggah..." : "Pilih file"}
        </Button>
      </div>
      {message ? (
        <p className="text-sm" aria-live="polite" role="status">
          {message}
        </p>
      ) : null}
      {(onUpload ? pendingFiles : files).length ? (
        <ul className="space-y-2" aria-label="Daftar file yang sedang diunggah">
          {(onUpload ? pendingFiles : files).map((file, index) => {
            const key = fileKey(file, index);
            return (
              <li key={key} className="rounded-lg border bg-card px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Batalkan ${file.name}`}
                    disabled={disabled || uploading}
                    onClick={() => {
                      setPendingFiles((current) => current.filter((item) => item !== file));
                      onFilesChange?.(files.filter((_, fileIndex) => fileIndex !== index));
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                {uploading ? (
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                    aria-label={`Progress ${file.name}`}
                  >
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress[key] ?? 0}%` }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {uploadedFiles.length ? (
        <ul className="space-y-2" aria-label="Daftar lampiran">
          {uploadedFiles.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{file.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {file.mimeType} · {file.size.toLocaleString("id-ID")} byte
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {onDownload ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Unduh ${file.originalName}`}
                    disabled={disabled}
                    onClick={() => void onDownload(file)}
                  >
                    <Download className="size-4" />
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus ${file.originalName}`}
                    disabled={disabled || deleting === file.id}
                    onClick={() => void removeUploadedFile(file)}
                  >
                    {deleting === file.id ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
