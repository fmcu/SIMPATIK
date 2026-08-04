import assert from "node:assert/strict";
import test from "node:test";

import { ReportCompletenessService } from "./report-completeness.service.js";

test("report completeness maps required indicator and document errors to frontend fields", async () => {
  const service = new ReportCompletenessService({
    missingForReport: async () => [{ id: "document-1", name: "Surat Pernyataan" }],
  });

  const fields = await service.validate({
    id: "report-1",
    periodId: "period-1",
    items: [
      { value: "", narrative: null, indicator: { required: true } },
      { value: null, narrative: null, indicator: { required: false } },
    ],
  });

  assert.deepEqual(fields, [
    { field: "items.0.value", message: "Nilai atau capaian indikator wajib diisi." },
    { field: "items.0.narrative", message: "Narasi indikator wajib diisi." },
    {
      field: "attachments.requirements.document-1",
      message: "Dokumen wajib Surat Pernyataan belum diunggah.",
    },
  ]);
});

test("report completeness accepts complete required indicators and documents", async () => {
  const service = new ReportCompletenessService({ missingForReport: async () => [] });

  assert.deepEqual(
    await service.validate({
      id: "report-1",
      periodId: "period-1",
      items: [{ value: "10", narrative: "Narasi lengkap", indicator: { required: true } }],
    }),
    [],
  );
});
