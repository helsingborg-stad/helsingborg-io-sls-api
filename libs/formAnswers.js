export function getFormFieldsWithLoadPreviousAttribute(form) {
  const dataMap = [];
  if (!form.steps) {
    return dataMap;
  }

  form.steps.forEach(({ questions }) => {
    if (!questions) {
      return;
    }

    questions.forEach(question => {
      if (question.type === 'editableList' && question.inputs) {
        question.inputs.forEach(input => {
          if (input.loadPrevious) {
            const inputId = `${question.id}.${input.key}`;
            const loadPrevious = input.loadPrevious.map(value =>
              value === input.key ? inputId : value
            );

            dataMap.push({
              id: inputId,
              loadPrevious: loadPrevious,
              tags: input.tags,
              type: question.type,
            });
          }
        });

        return;
      }

      if (question.type === 'repeaterField' && question.inputs) {
        question.inputs.forEach(input => {
          if (question.loadPrevious) {
            const inputId = `${question.id}.[*].${input.id}`;
            const loadPrevious = question.loadPrevious.map(value =>
              value === question.id ? inputId : value
            );

            dataMap.push({
              id: inputId,
              loadPrevious: loadPrevious,
              tags: input.tags,
              type: question.type,
            });
          }
        });

        return;
      }

      if (question.loadPrevious) {
        dataMap.push({
          id: question.id,
          loadPrevious: question.loadPrevious,
          tags: question.tags,
          type: question.type,
        });
      }
    });
  });

  return dataMap;
}

export function formatAnswer(id, tags, value) {
  return { field: { id, tags: tags || [] }, value };
}

function getPersonInfo(person, strArray) {
  return strArray.reduce((prev, current) => {
    if (prev && prev[current]) {
      return prev[current];
    }
    return undefined;
  }, person);
}

function getCaseAnswer(answers, matchString) {
  const result = answers.find(obj => obj.field.id === matchString);
  return result?.value || undefined;
}

function getMultipleFieldAnswers(field, previousAnswers) {
  const answers = [];
  if (!field.loadPrevious) {
    return answers;
  }
  field.loadPrevious.forEach(matchString => {
    const multipleFieldRegex = new RegExp('.+.[*]..+');
    if (multipleFieldRegex.test(matchString)) {
      const strArray = matchString.split('.[*].');
      const idRegex = new RegExp(`${strArray?.[0] || ''}.[0-9]+.${strArray?.[1] || ''}`);
      const previousAnswersMatches = previousAnswers.filter(obj => idRegex.test(obj.field.id));
      if (previousAnswersMatches.length > 0) {
        previousAnswersMatches.map(answer => formatAnswer(answer.id, field.tags, answer.value));
        answers.push(...previousAnswersMatches);
      }
    }
  });

  return answers;
}

function getInitialValue(field, applicants, previousAnswers) {
  const applicantRoles = ['applicant', 'coApplicant'];
  let initialValue;

  field.loadPrevious.forEach(matchPattern => {
    const patternParts = matchPattern.split('.');
    if (applicantRoles.includes(patternParts[0])) {
      const applicantRole = patternParts[0];
      const person = applicants.find(applicant => applicant.role === applicantRole);
      initialValue = getPersonInfo(person, patternParts.slice(1)) || initialValue;
      return;
    }

    initialValue = getCaseAnswer(previousAnswers, matchPattern) || initialValue;
  });

  return initialValue ? formatAnswer(field.id, field.tags, initialValue) : undefined;
}

function populateAnswers(dataMap, applicants, previousAnswers) {
  const answers = [];

  dataMap.forEach(field => {
    if (field.type === 'repeaterField') {
      const repeaterAnswers = getMultipleFieldAnswers(field, previousAnswers);
      if (repeaterAnswers.length > 0) {
        answers.push(...repeaterAnswers);
      }

      return;
    }

    const initialFieldValue = getInitialValue(field, applicants, previousAnswers);
    if (initialFieldValue) {
      answers.push(initialFieldValue);
    }
  });

  return answers;
}

export function mergeAnswers(previousAnswers, newAnswers) {
  return Object.values(
    [...previousAnswers, ...newAnswers].reduce((result, current) => {
      result[current.field.id] = {
        ...(result[current.field.id] || {}),
        ...current,
      };
      return result;
    }, {})
  );
}

export function populateFormWithPreviousCaseAnswers(
  forms,
  applicants,
  formTemplates,
  previousForms
) {
  const populatedForms = {};

  Object.keys(forms).forEach(formId => {
    const caseFormTemplate = formTemplates?.[formId] || {};

    const previousAnswers = previousForms?.[formId]?.answers || [];

    const formFields = getFormFieldsWithLoadPreviousAttribute(caseFormTemplate);

    const answers = populateAnswers(formFields, applicants, previousAnswers);
    const mergedAnswers = mergeAnswers(answers, forms[formId].answers);

    const form = forms[formId];
    populatedForms[formId] = { ...form, answers: mergedAnswers };
  });

  return populatedForms;
}
