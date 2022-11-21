import S3 from '../libs/S3';
import log from '../libs/logs';
import { VivaAttachmentCategory } from '../types/vivaAttachment';
import type { VivaAttachment } from '../types/vivaAttachment';
import type { PersonalNumber, CaseFormAnswer, CaseFormAnswerAttachment } from '../types/caseItem';

export enum ValidAttachmentCategoryTag {
  Viva = 'viva',
  Attachment = 'attachment',
  Category = 'category',
}

function createS3Key(prefix: PersonalNumber, name: string): string {
  return `${prefix}/${name}`;
}

function getAttachmentCategory(
  tags: string[],
  attachmentCategories = [
    VivaAttachmentCategory.Expenses,
    VivaAttachmentCategory.Incomes,
    VivaAttachmentCategory.Completion,
  ]
): VivaAttachmentCategory {
  const validAttachmentCategoryTags: ValidAttachmentCategoryTag[] = [
    ValidAttachmentCategoryTag.Viva,
    ValidAttachmentCategoryTag.Attachment,
    ValidAttachmentCategoryTag.Category,
  ];
  const isValidTags = validAttachmentCategoryTags.every(tag => tags.includes(tag));
  if (!isValidTags) {
    return VivaAttachmentCategory.Unknown;
  }

  return attachmentCategories.reduce((allCategories, category) => {
    if (tags.includes(category)) {
      return category;
    }
    return allCategories;
  }, VivaAttachmentCategory.Unknown);
}

function getFulfilled(
  previous: VivaAttachment[],
  current: PromiseSettledResult<VivaAttachment>
): VivaAttachment[] {
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
): Promise<VivaAttachment[]> {
  const answerAttachmentList = answerList.filter(isAnswerAttachmentFilter);

  const attachmentPromiseList = answerAttachmentList.flatMap(answer => {
    const vivaAttachmentCategory = getAttachmentCategory(answer.field.tags);

    return answer.value.map(async attachment => {
      const s3AttachmentFileKey = createS3Key(personalNumber, attachment.uploadedId);
      const file = await S3.getFile(process.env.BUCKET_NAME, s3AttachmentFileKey);

      const VivaAttachment: VivaAttachment = {
        id: s3AttachmentFileKey,
        name: attachment.externalDisplayName,
        category: vivaAttachmentCategory,
        fileBase64: file.Body.toString('base64'),
      };
      return VivaAttachment;
    });
  });

  const attachmentPromiseResultList = await Promise.allSettled(attachmentPromiseList);
  return attachmentPromiseResultList.reduce(getFulfilled, []);
}

export default {
  createFromAnswers: createAttachmentFromAnswers,
  isAnswerAttachment: isAnswerAttachmentFilter,
};
