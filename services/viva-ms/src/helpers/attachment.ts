import to from 'await-to-js';
import S3 from '../libs/S3';
import log from '../libs/logs';
import { VivaAttachmentCategory } from '../types/vivaMyPages';
import { CaseFormAnswerAttachment } from '../types/caseItem';

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
): VivaAttachmentCategory | undefined {
  const vivaAttachmentCatagoryTags: RequiredTags[] = [
    RequiredTags.Viva,
    RequiredTags.Attachment,
    RequiredTags.Category,
  ];
  const hasVivaAttachmentCatagory = vivaAttachmentCatagoryTags.every(tag => tags.includes(tag));

  if (hasVivaAttachmentCatagory) {
    return attachmentCategories.reduce(
      (allCategories: VivaAttachmentCategory | undefined, category) => {
        if (tags.includes(category)) {
          return category;
        }
        return allCategories;
      },
      undefined
    );
  }

  return undefined;
}

async function createAttachmentFromAnswers(
  personalNumber: PersonalNumber,
  answerList: CaseFormAnswerAttachment[]
): Promise<CaseAttachment[]> {
  const attachmentList: CaseAttachment[] = [];

  for (const answer of answerList) {
    const attachmentCategory = getAttachmentCategory(answer.field.tags);
    if (!attachmentCategory) {
      continue;
    }

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

export default {
  getCategory: getAttachmentCategory,
  createFromAnswers: createAttachmentFromAnswers,
};
