import type { DocumentRepository } from "./document.repository.js";

export type RequiredDocumentRequirement = {
  id: string;
  code: string;
  name: string;
};

export class ReportDocumentValidator {
  constructor(private readonly repository: DocumentRepository) {}

  async missingForReport(
    periodId: string,
    reportId: string,
  ): Promise<RequiredDocumentRequirement[]> {
    const [requirements, attachmentRequirementIds] = await Promise.all([
      this.repository.requiredForReport(periodId),
      this.repository.attachmentRequirementIds(reportId),
    ]);
    return findMissingRequiredDocuments(requirements, attachmentRequirementIds);
  }
}

export function findMissingRequiredDocuments(
  requirements: RequiredDocumentRequirement[],
  attachmentRequirementIds: Iterable<string>,
): RequiredDocumentRequirement[] {
  const attachedIds = new Set(attachmentRequirementIds);
  return requirements.filter((requirement) => !attachedIds.has(requirement.id));
}
