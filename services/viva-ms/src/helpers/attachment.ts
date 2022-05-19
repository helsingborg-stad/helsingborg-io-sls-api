import to from 'await-to-js';
import S3 from '../libs/S3';
import log from '../libs/logs';
import { VivaAttachmentCategory } from '../types/vivaMyPages';
import type { CaseFormAnswer, CaseFormAnswerAttachment } from '../types/caseItem';

export enum RequiredTags {
  Viva = 'viva',
  Attachment = 'attachment',
  Category = 'category',
}

export type PersonalNumber = string;

export interface CaseAttachment {
  id: string;
  name: string;
  category: VivaAttachmentCategory;
  fileBase64: string;
}

function createFileKey(keyPrefix: PersonalNumber, filename: string): string {
  return `${keyPrefix}/${filename}`;
}

function getAttachmentCategory(
  tags: string[],
  attachmentCategories = [
    VivaAttachmentCategory.Expenses,
    VivaAttachmentCategory.Incomes,
    VivaAttachmentCategory.Completion,
  ]
): VivaAttachmentCategory {
  const vivaAttachmentCategoryTags: RequiredTags[] = [
    RequiredTags.Viva,
    RequiredTags.Attachment,
    RequiredTags.Category,
  ];
  const hasAttachmentCategoryTag = vivaAttachmentCategoryTags.every(tag => tags.includes(tag));

  if (!hasAttachmentCategoryTag) {
    return VivaAttachmentCategory.Unknown;
  }

  return attachmentCategories.reduce((allCategories, category) => {
    if (tags.includes(category)) {
      return category;
    }
    return allCategories;
  }, VivaAttachmentCategory.Unknown);
}

async function createAttachmentFromAnswers(
  personalNumber: PersonalNumber,
  answerList: CaseFormAnswer[]
): Promise<CaseAttachment[]> {
  const attachmentList: CaseAttachment[] = [];

  for (const answer of answerList) {
    if (!isAnswerAttachment(answer)) {
      continue;
    }
    const attachmentCategory = getAttachmentCategory(answer.field.tags);

    for (const valueItem of answer.value) {
      const s3FileKey = createFileKey(personalNumber, valueItem.uploadedFileName);

      const [getFileError, file] = await to(S3.getFile(process.env.BUCKET_NAME, s3FileKey));
      if (getFileError) {
        // Throwing the error for a single file would prevent all files from being retrived, since the loop would exit.
        // Instead we log the error and continue the loop iteration.
        log.writeError(getFileError.message, s3FileKey);
        continue;
      }

      const attachment: CaseAttachment = {
        id: s3FileKey,
        name: valueItem.uploadedFileName,
        category: attachmentCategory,
        fileBase64: file.Body.toString('base64'),
      };

      attachmentList.push(attachment);
    }
  }

  return attachmentList;
}

function isAnswerAttachment(answer: CaseFormAnswer): answer is CaseFormAnswerAttachment {
  return Array.isArray(answer.value);
}

export default {
  getCategory: getAttachmentCategory,
  createFromAnswers: createAttachmentFromAnswers,
};
