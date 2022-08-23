import S3 from '../libs/S3';
import log from '../libs/logs';
import { VivaAttachmentCategory } from '../types/vivaMyPages';
import type { PersonalNumber, CaseFormAnswer, CaseFormAnswerAttachment } from '../types/caseItem';

export enum ValidAttachmentCategoryTag {
  Viva = 'viva',
  Attachment = 'attachment',
  Category = 'category',
}

export interface CaseAttachment {
  id: string;
  name: string;
  category: VivaAttachmentCategory;
  fileBase64: string;
}

function createS3Key(keyPrefix: PersonalNumber, filename: string): string {
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
  const vivaAttachmentCategoryTags: ValidAttachmentCategoryTag[] = [
    ValidAttachmentCategoryTag.Viva,
    ValidAttachmentCategoryTag.Attachment,
    ValidAttachmentCategoryTag.Category,
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

function getFulfilled(previous: CaseAttachment[], current: PromiseSettledResult<CaseAttachment>) {
  if (current.status !== 'fulfilled') {
    log.writeWarn(`Could not get file with id: ${current.reason.id}`, current.reason);
    return previous;
  }
  return [...previous, current.value];
}

function isAnswerAttachmentFilter(answer: CaseFormAnswer): answer is CaseFormAnswerAttachment {
  return Array.isArray(answer.value);
}

async function createAttachmentFromAnswers(
  personalNumber: PersonalNumber,
  answerList: CaseFormAnswer[]
): Promise<CaseAttachment[]> {
  const answerAttachmentList = answerList.filter(isAnswerAttachmentFilter);

  const attachmentPromiseList = answerAttachmentList.flatMap(answer => {
    const attachmentCategory = getAttachmentCategory(answer.field.tags);

    return answer.value.map(async attachment => {
      const s3AttachmentFileKey = createS3Key(personalNumber, attachment.uploadedFileName);
      const file = await S3.getFile(process.env.BUCKET_NAME, s3AttachmentFileKey);

      const caseAttachment: CaseAttachment = {
        id: s3AttachmentFileKey,
        name: attachment.uploadedFileName,
        category: attachmentCategory,
        fileBase64: file.Body.toString('base64'),
      };
      return caseAttachment;
    });
  });

  const attachmentPromiseResultList = await Promise.allSettled(attachmentPromiseList);
  return attachmentPromiseResultList.reduce(getFulfilled, []);
}

export default {
  createFromAnswers: createAttachmentFromAnswers,
  isAnswerAttachment: isAnswerAttachmentFilter,
};
