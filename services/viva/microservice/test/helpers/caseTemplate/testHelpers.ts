import type { ValidTags } from '../../../src/helpers/caseTemplate/shared';
import type { CaseFormAnswer, CaseFormAnswerValue } from '../../../src/types/caseItem';

export function makeAnswer(
  tags: ValidTags | ValidTags[],
  value: CaseFormAnswerValue
): CaseFormAnswer {
  const tagsToUse = Array.isArray(tags) ? tags : [tags];
  return {
    field: { id: '', tags: tagsToUse },
    value,
  };
}
