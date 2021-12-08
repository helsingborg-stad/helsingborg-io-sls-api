/* eslint-disable no-console */
import { generateDataMap, formatAnswer, mergeAnswers } from '../../../libs/formAnswers';

export function populateChildrenAnswers(repeaterInputList, childrenList) {
  const answers = [];

  childrenList.forEach((child, childrenListIndex) => {
    for (const [childKey, childValue] of Object.entries(child)) {
      const childAnswer = repeaterInputList
        .map(input => {
          if (input.tags.includes(childKey)) {
            const inputId = input.id.replace('[*]', childrenListIndex);
            return formatAnswer(inputId, input.tags, childValue);
          }
        })
        .filter(Boolean);

      answers.push(...childAnswer);
    }
  });

  return answers;
}

export default function populateFormWithVivaChildren(form, formTemplate, vivaChildrenList) {
  const dataMap = generateDataMap(formTemplate);

  const childrenRepeaterInputList = dataMap.filter(field => field.tags?.includes('children'));

  const childrenAnswers = populateChildrenAnswers(childrenRepeaterInputList, vivaChildrenList);

  const mergedChildrenAnswers = mergeAnswers(childrenAnswers, form.answers);

  return { ...form, answers: mergedChildrenAnswers };
}
