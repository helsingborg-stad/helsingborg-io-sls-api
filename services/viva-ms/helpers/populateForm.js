/* eslint-disable no-console */
import { generateDataMap, formatAnswer } from '../../../libs/formAnswers';

function populateChildren(fieldList, childrenList) {
  const answers = childrenList.map(child => {
    const childAnswers = fieldList.inputs.map(input => {
      let value = '';
      if (input.tags.includes('firstName')) {
        value = child.firstName;
      }

      if (input.tags.includes('lastName')) {
        value = child.lastName;
      }

      if (input.tags.includes('personalNumber')) {
        value = child.personalNumber;
      }

      const answer = formatAnswer(input.id, input.tags, value);
      return answer;
    });

    return childAnswers;
  });

  return answers;
}

export default function populateFormWithVivaChildren(forms, vivaChildrenList, formTemplates) {
  Object.keys(forms).forEach(formId => {
    const caseFormTemplate = formTemplates?.[formId] || {};

    const dataMap = generateDataMap(caseFormTemplate);
    console.log('dataMap', dataMap);

    const childrenRepeaterFieldList = dataMap.filter((field, index) =>
      field[index].tags.includes('children')
    );
    console.log('childrenRepeaterFieldList', childrenRepeaterFieldList);

    const answers = populateChildren(childrenRepeaterFieldList, vivaChildrenList);
    console.log('answers', answers);
  });
}
