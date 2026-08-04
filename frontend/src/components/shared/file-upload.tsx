"use client";

import { useRef, useState } from "react";
import { FileUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FileUploadProps {
  id?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeBytes?: number;
  disabled?: boolean;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  onError?: (message: string) => void;
  label?: string;
  description?: string;
  className?: string;
}

export function FileUpload({ id = "file-upload", accept, multiple = false, maxSizeBytes = 10 * 1024 * 1024, disabled = false, files = [], onFilesChange, onError, label = "Unggah dokumen", description = "PDF, DOCX, XLSX, atau gambar. Maksimal 10 MB per file.", className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const addFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const nextFiles = Array.from(selectedFiles);
    const invalidFile = nextFiles.find((file) => file.size > maxSizeBytes);
    if (invalidFile) {
      onError?.(`Ukuran ${invalidFile.name} melebihi batas ${Math.round(maxSizeBytes / 1024 / 1024)} MB.`);
      return;
    }
    onFilesChange?.(multiple ? [...files, ...nextFiles] : nextFiles.slice(0, 1));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn("rounded-xl border-2 border-dashed bg-muted/20 p-6 text-center transition-colors", dragActive && "border-primary bg-primary/5", disabled && "cursor-not-allowed opacity-60")}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => { event.preventDefault(); setDragActive(false); if (!disabled) addFiles(event.dataTransfer.files); }}
      >
        <FileUp className="mx-auto size-7 text-primary" aria-hidden="true" />
        <p className="mt-3 font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <input ref={inputRef} id={id} type="file" className="sr-only" accept={accept} multiple={multiple} disabled={disabled} onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }} />
        <Button type="button" variant="outline" className="mt-4" onClick={() => inputRef.current?.click()} disabled={disabled}>Pilih file</Button>
      </div>
      {files.length ? <ul className="space-y-2" aria-label="Daftar file terpilih">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm"><span className="min-w-0 truncate">{file.name}</span><Button type="button" variant="ghost" size="icon" aria-label={`Hapus ${file.name}`} disabled={disabled} onClick={() => onFilesChange?.(files.filter((_, fileIndex) => fileIndex !== index))}><X className="size-4" /></Button></li>)}</ul> : null}
    </div>
  );
}
