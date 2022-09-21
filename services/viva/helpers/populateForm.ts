import {
  getFormFieldsWithLoadPreviousAttribute,
  formatAnswer,
  mergeAnswers,
} from '../libs/formAnswers';

import type { CaseForm, CaseFormAnswer, CasePerson } from '../types/caseItem';

export interface FormField {
  id: string;
  loadPrevious: string[];
  tags: string[];
  type: string;
}

export function populateChildrenAnswers(
  repeaterInputList: FormField[],
  childrenList: CasePerson[]
): CaseFormAnswer[] {
  const answers = childrenList.reduce((answers, child, index) => {
    const childAnswers = Object.keys(child)
      .map(key => {
        const childAnswerList = repeaterInputList
          .map(input => {
            if (input.tags.includes(key)) {
              const inputId = input.id.replace('[*]', index.toString());
              return formatAnswer(
                inputId,
                input.tags,
                child[key as keyof CasePerson]
              ) as CaseFormAnswer;
            }
            return undefined;
          })
          .filter(Boolean) as CaseFormAnswer[];

        const [childAnswer] = childAnswerList;
        return childAnswer;
      })
      .filter(Boolean);

    return [...answers, ...childAnswers];
  }, [] as CaseFormAnswer[]);

  return answers;
}

export default function populateFormWithVivaChildren(
  form: CaseForm,
  formTemplate: unknown,
  vivaChildrenList: CasePerson[]
): CaseForm {
  const formFields = getFormFieldsWithLoadPreviousAttribute(formTemplate) as FormField[];
  const childrenRepeaterInputList = formFields.filter(field =>
    field.tags.includes('children')
  ) as FormField[];
  const childrenAnswers = populateChildrenAnswers(childrenRepeaterInputList, vivaChildrenList);
  const mergedChildrenAnswers = mergeAnswers(childrenAnswers, form.answers) as CaseFormAnswer[];

  return { ...form, answers: mergedChildrenAnswers };
}
