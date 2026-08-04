import { rm } from "node:fs/promises";
import type { Request } from "express";
import formidable, { type File } from "formidable";

import { AppError } from "../../middleware/error.js";

export type ParsedAttachmentUpload = {
  reportItemId?: string;
  requirementId?: string;
  file: Pick<File, "filepath" | "originalFilename" | "mimetype" | "size">;
  cleanup: () => Promise<void>;
};

function singleValue(value: string[] | undefined, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (value.length !== 1) {
    throw new AppError(400, "ATTACHMENT_INVALID", "Data lampiran tidak valid.", [
      { field, message: "Field hanya boleh memiliki satu nilai." },
    ]);
  }
  return value[0];
}

function singleFile(value: File[] | undefined): File {
  if (!value || value.length !== 1) {
    throw new AppError(400, "ATTACHMENT_INVALID", "Satu file wajib diunggah.", [
      { field: "file", message: "Pilih tepat satu file untuk diunggah." },
    ]);
  }
  const [file] = value;
  if (!file) throw new AppError(400, "ATTACHMENT_INVALID", "Satu file wajib diunggah.");
  return file;
}

export async function parseAttachmentUpload(
  request: Request,
  maxUploadSize: number,
): Promise<ParsedAttachmentUpload> {
  if (!request.is("multipart/form-data")) {
    throw new AppError(400, "ATTACHMENT_INVALID", "Request unggahan harus menggunakan multipart/form-data.", [
      { field: "file", message: "File belum dikirim." },
    ]);
  }

  const form = formidable({
    allowEmptyFiles: false,
    maxFiles: 1,
    maxFileSize: maxUploadSize,
    maxTotalFileSize: maxUploadSize,
    maxFields: 2,
    maxFieldsSize: 2_048,
    multiples: false,
  });

  const files: File[] = [];
  form.on("file", (_field, file) => files.push(file));
  try {
    const [fields, parsedFiles] = await form.parse(request);
    const file = singleFile(parsedFiles.file);
    const reportItemId = singleValue(fields.reportItemId, "reportItemId");
    const requirementId = singleValue(fields.requirementId, "requirementId");
    return {
      ...(reportItemId === undefined ? {} : { reportItemId }),
      ...(requirementId === undefined ? {} : { requirementId }),
      file,
      cleanup: async () => {
        await Promise.all(files.map((item) => rm(item.filepath, { force: true })));
      },
    };
  } catch (error) {
    await Promise.all(files.map((file) => rm(file.filepath, { force: true })));
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "";
    if (message.includes("maxFileSize") || message.includes("maxTotalFileSize")) {
      throw new AppError(400, "ATTACHMENT_TOO_LARGE", "Ukuran file melebihi batas unggahan.", [
        { field: "file", message: "Ukuran file melebihi batas unggahan." },
      ]);
    }
    throw new AppError(400, "ATTACHMENT_INVALID", "File unggahan tidak dapat diproses.", [
      { field: "file", message: "File unggahan tidak valid." },
    ]);
  }
}
