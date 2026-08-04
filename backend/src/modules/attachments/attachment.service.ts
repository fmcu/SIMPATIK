import { basename, extname } from "node:path";
import { open, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { AppError } from "../../middleware/error.js";
import type { PrivateStorageAdapter } from "../../services/private-storage.service.js";
import type {
  AttachmentRepository,
  AttachmentRecord,
  PrivateAttachmentRecord,
} from "./attachment.repository.js";

const editableStatuses = new Set(["DRAFT", "REVISION_REQUIRED"]);

const allowedFileTypes = {
  "application/pdf": { extensions: [".pdf"], signature: Buffer.from("%PDF-") },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extensions: [".docx"],
    signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    extensions: [".xlsx"],
    signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  },
  "image/png": { extensions: [".png"], signature: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
  "image/jpeg": { extensions: [".jpg", ".jpeg"], signature: Buffer.from([0xff, 0xd8, 0xff]) },
} as const;

type AllowedMimeType = keyof typeof allowedFileTypes;

export type UploadAttachmentInput = {
  reportId: string;
  uptScopeId: string;
  actorId: string;
  reportItemId?: string;
  requirementId?: string;
  file: {
    filepath: string;
    originalFilename: string | null;
    mimetype: string | null;
    size: number;
  };
};

function sanitizeOriginalName(value: string | null): string {
  const sanitized = basename(value ?? "dokumen")
    .normalize("NFKC")
    .split("")
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 31 && code !== 127;
    })
    .join("")
    .replace(/[\\/]/g, "_")
    .trim()
    .slice(0, 255);
  return sanitized || "dokumen";
}

function isAllowedMimeType(value: string | null): value is AllowedMimeType {
  return value !== null && Object.hasOwn(allowedFileTypes, value);
}

async function hasExpectedSignature(filepath: string, signature: Buffer): Promise<boolean> {
  const handle = await open(filepath, "r");
  try {
    const chunk = Buffer.alloc(signature.length);
    const { bytesRead } = await handle.read(chunk, 0, signature.length, 0);
    return bytesRead === signature.length && chunk.equals(signature);
  } finally {
    await handle.close();
  }
}

async function isOfficeDocument(filepath: string): Promise<boolean> {
  const contents = await readFile(filepath);
  const content = contents.toString("latin1");
  return content.includes("[Content_Types].xml") && (content.includes("word/") || content.includes("xl/"));
}

function validateOptionalId(value: string | undefined, field: string): void {
  if (value === undefined) return;
  if (!value.trim()) {
    throw new AppError(400, "ATTACHMENT_INVALID", "Data lampiran tidak valid.", [
      { field, message: "ID referensi tidak valid." },
    ]);
  }
}

export class AttachmentService {
  constructor(
    private readonly repository: AttachmentRepository,
    private readonly storage: PrivateStorageAdapter,
    private readonly maxUploadSize: number,
  ) {}

  async upload(input: UploadAttachmentInput): Promise<AttachmentRecord> {
    validateOptionalId(input.reportItemId, "reportItemId");
    validateOptionalId(input.requirementId, "requirementId");

    const report = await this.repository.findReportForUpload(input.reportId, input.uptScopeId);
    if (!report) throw new AppError(404, "NOT_FOUND", "Laporan tidak ditemukan.");
    if (!editableStatuses.has(report.status)) {
      throw new AppError(
        409,
        "REPORT_LOCKED",
        "Lampiran hanya dapat diubah saat laporan berstatus DRAFT atau REVISION_REQUIRED.",
      );
    }
    if (input.file.size < 1 || input.file.size > this.maxUploadSize) {
      throw new AppError(
        400,
        "ATTACHMENT_TOO_LARGE",
        "Ukuran file melebihi batas unggahan.",
        [{ field: "file", message: "Ukuran file tidak valid." }],
      );
    }

    const originalName = sanitizeOriginalName(input.file.originalFilename);
    if (!input.file.originalFilename) {
      throw new AppError(400, "ATTACHMENT_INVALID", "Nama file tidak valid.", [
        { field: "file", message: "Nama file wajib tersedia." },
      ]);
    }
    if (!isAllowedMimeType(input.file.mimetype)) {
      throw new AppError(400, "ATTACHMENT_INVALID", "Tipe file tidak diizinkan.", [
        { field: "file", message: "Tipe file tidak diizinkan." },
      ]);
    }

    const allowed = allowedFileTypes[input.file.mimetype];
    if (!allowed.extensions.includes(extname(originalName).toLowerCase() as never)) {
      throw new AppError(400, "ATTACHMENT_INVALID", "Nama file tidak sesuai dengan tipe file.", [
        { field: "file", message: "Ekstensi file tidak sesuai dengan tipe file." },
      ]);
    }
    if (!(await hasExpectedSignature(input.file.filepath, allowed.signature))) {
      throw new AppError(400, "ATTACHMENT_INVALID", "Isi file tidak sesuai dengan tipe file.", [
        { field: "file", message: "Isi file tidak sesuai dengan tipe file." },
      ]);
    }
    if (
      (input.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        input.file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") &&
      !(await isOfficeDocument(input.file.filepath))
    ) {
      throw new AppError(400, "ATTACHMENT_INVALID", "Isi file Office tidak valid.", [
        { field: "file", message: "Isi file Office tidak valid." },
      ]);
    }

    if (input.reportItemId && !report.items.some((item) => item.id === input.reportItemId)) {
      throw new AppError(400, "ATTACHMENT_INVALID", "Item laporan tidak valid.", [
        { field: "reportItemId", message: "Item bukan bagian dari laporan." },
      ]);
    }
    if (input.reportItemId && !input.requirementId) {
      throw new AppError(400, "ATTACHMENT_INVALID", "Item laporan harus memiliki dokumen wajib terkait.", [
        { field: "requirementId", message: "Pilih dokumen wajib terkait." },
      ]);
    }

    const requirement = input.requirementId
      ? await this.repository.findRequirement(input.requirementId)
      : null;
    if (input.requirementId && !requirement) {
      throw new AppError(400, "ATTACHMENT_INVALID", "Dokumen wajib tidak ditemukan.", [
        { field: "requirementId", message: "Dokumen wajib tidak ditemukan." },
      ]);
    }
    if (requirement) {
      const requirementPeriodId = requirement.periodId ?? requirement.indicator?.periodId;
      if (requirement.approvalStatus !== "APPROVED" || requirementPeriodId !== report.periodId) {
        throw new AppError(400, "ATTACHMENT_INVALID", "Dokumen wajib bukan bagian dari laporan.", [
          { field: "requirementId", message: "Dokumen wajib bukan bagian dari periode laporan." },
        ]);
      }
      if (input.file.size > requirement.maxSize) {
        throw new AppError(400, "ATTACHMENT_TOO_LARGE", "Ukuran file melebihi batas dokumen wajib.", [
          { field: "file", message: "Ukuran file melebihi batas dokumen wajib." },
        ]);
      }
      if (!requirement.allowedMimeTypes.includes(input.file.mimetype)) {
        throw new AppError(400, "ATTACHMENT_INVALID", "Tipe file tidak sesuai dokumen wajib.", [
          { field: "file", message: "Tipe file tidak sesuai dokumen wajib." },
        ]);
      }
      if (requirement.indicatorId) {
        const reportItem = report.items.find((item) => item.id === input.reportItemId);
        if (!reportItem || reportItem.indicatorId !== requirement.indicatorId) {
          throw new AppError(400, "ATTACHMENT_INVALID", "Dokumen wajib harus dihubungkan ke indikator terkait.", [
            { field: "reportItemId", message: "Pilih indikator yang sesuai untuk dokumen wajib ini." },
          ]);
        }
      }
    }

    const storageKey = `attachments/${randomUUID()}`;
    try {
      await this.storage.write(storageKey, input.file.filepath);
      try {
        return await this.repository.create({
          reportId: report.id,
          ...(input.reportItemId === undefined ? {} : { reportItemId: input.reportItemId }),
          ...(input.requirementId === undefined ? {} : { requirementId: input.requirementId }),
          storageKey,
          originalName,
          mimeType: input.file.mimetype,
          size: input.file.size,
          uploadedById: input.actorId,
        });
      } catch (error) {
        await this.storage.delete(storageKey);
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, "INTERNAL_ERROR", "Lampiran belum dapat disimpan.");
    }
  }

  async download(id: string, uptScopeId?: string): Promise<{
    attachment: PrivateAttachmentRecord;
    stream: Awaited<ReturnType<PrivateStorageAdapter["read"]>>;
  }> {
    const attachment = await this.repository.findById(id, uptScopeId);
    if (!attachment) throw new AppError(404, "NOT_FOUND", "Lampiran tidak ditemukan.");
    try {
      return { attachment, stream: await this.storage.read(attachment.storageKey) };
    } catch {
      throw new AppError(404, "NOT_FOUND", "File lampiran tidak tersedia.");
    }
  }

  async delete(id: string, uptScopeId: string, actorId: string): Promise<void> {
    const attachment = await this.repository.findById(id, uptScopeId);
    if (!attachment) throw new AppError(404, "NOT_FOUND", "Lampiran tidak ditemukan.");
    if (!editableStatuses.has(attachment.report.status)) {
      throw new AppError(
        409,
        "REPORT_LOCKED",
        "Lampiran hanya dapat dihapus saat laporan berstatus DRAFT atau REVISION_REQUIRED.",
      );
    }

    if (!(await this.repository.delete(id, attachment.report.id, actorId))) {
      throw new AppError(
        409,
        "REPORT_LOCKED",
        "Lampiran hanya dapat dihapus saat laporan berstatus DRAFT atau REVISION_REQUIRED.",
      );
    }
    try {
      await this.storage.delete(attachment.storageKey);
    } catch {
      throw new AppError(500, "INTERNAL_ERROR", "Lampiran sudah dihapus, tetapi file privat belum dapat dibersihkan.");
    }
  }
}
