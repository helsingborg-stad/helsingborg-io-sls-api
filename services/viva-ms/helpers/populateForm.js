import {
  getFormFieldsWithLoadPreviousAttribute,
  formatAnswer,
  mergeAnswers,
} from '../../../libs/formAnswers';

export function populateChildrenAnswers(repeaterInputList, childrenList) {
  const answers = childrenList.reduce((answers, child, index) => {
    const childAnswers = Object.keys(child)
      .map(key => {
        const childAnswerList = repeaterInputList
          .map(input => {
            if (input.tags.includes(key)) {
              const inputId = input.id.replace('[*]', index);
              return formatAnswer(inputId, input.tags, child[key]);
            }
          })
          .filter(Boolean);

        const [childAnswer] = childAnswerList;
        return childAnswer;
      })
      .filter(Boolean);

    return [...answers, ...childAnswers];
  }, []);

  return answers;
}

export default function populateFormWithVivaChildren(form, formTemplate, vivaChildrenList) {
  const formFields = getFormFieldsWithLoadPreviousAttribute(formTemplate);

  const childrenRepeaterInputList = formFields.filter(field => field.tags?.includes('children'));

  const childrenAnswers = populateChildrenAnswers(childrenRepeaterInputList, vivaChildrenList);

  const mergedChildrenAnswers = mergeAnswers(childrenAnswers, form.answers);

  return { ...form, answers: mergedChildrenAnswers };
}
