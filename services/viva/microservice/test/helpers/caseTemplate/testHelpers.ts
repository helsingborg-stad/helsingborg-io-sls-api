import type { CaseFormAnswer, CaseFormAnswerValue } from '../../../src/types/caseItem';
import type { ValidTags } from '../../../src/helpers/caseTemplate/shared';

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
