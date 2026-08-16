import type { ApiFieldError } from "@simpatik/contracts";

export type ReportCompletenessInput = {
  id: string;
  periodId: string;
  items: Array<{
    value: string | null;
    narrative: string | null;
    indicator: { required: boolean };
  }>;
};

export interface ReportDocumentCompletenessLookup {
  missingForReport(
    periodId: string,
    reportId: string,
  ): Promise<Array<{ id: string; name: string }>>;
}

export class ReportCompletenessService {
  constructor(private readonly documents: ReportDocumentCompletenessLookup) {}

  async validate(report: ReportCompletenessInput): Promise<ApiFieldError[]> {
    const fields: ApiFieldError[] = [];

    report.items.forEach((item, index) => {
      if (!item.indicator.required) return;
      if (!item.value?.trim()) {
        fields.push({
          field: `items.${index}.value`,
          message: "Nilai atau capaian indikator wajib diisi.",
        });
      }
      if (!item.narrative?.trim()) {
        fields.push({
          field: `items.${index}.narrative`,
          message: "Narasi indikator wajib diisi.",
        });
      }
    });

    const missingDocuments = await this.documents.missingForReport(report.periodId, report.id);
    missingDocuments.forEach((document) => {
      fields.push({
        field: `attachments.requirements.${document.id}`,
        message: `Dokumen wajib ${document.name} belum diunggah.`,
      });
    });

    return fields;
  }
}
