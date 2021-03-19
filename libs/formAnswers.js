const generateDataMap = form => {
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
};

const formatAnswer = (id, tags, value) => ({ field: { id, tags: tags || [] }, value });

const getUserInfo = (user, strArray) =>
  strArray.reduce((prev, current) => {
    if (prev && prev[current]) {
      return prev[current];
    }
    return undefined;
  }, user);

const getCaseAnswer = (answers, matchString) => {
  const result = answers.find(obj => obj.field.id === matchString);
  return result?.value || undefined;
};

const getMultipleFieldAnswers = (field, previousAnswers) => {
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
};

const getInitialValue = (field, user, previousAnswers) => {
  let initialValue;

  field.loadPrevious.forEach(matchString => {
    const strArray = matchString.split('.');
    if (strArray[0] === 'user' && (initialValue = getUserInfo(user, strArray.slice(1)))) {
      return initialValue;
    }
    initialValue = getCaseAnswer(previousAnswers, matchString) || initialValue;
  });

  return initialValue ? formatAnswer(field.id, field.tags, initialValue) : undefined;
};

const populateAnswers = (dataMap, user, previousAnswers) => {
  const answers = [];

  dataMap.forEach(field => {
    if (field.type === 'repeaterField') {
      const repeaterAnswers = getMultipleFieldAnswers(field, previousAnswers);
      if (repeaterAnswers.length > 0) {
        answers.push(...repeaterAnswers);
      }

      return;
    }

    const initialFieldValue = getInitialValue(field, user, previousAnswers);
    if (initialFieldValue) {
      answers.push(initialFieldValue);
    }
  });

  return answers;
};

/**
 * Takes a form object and populate it with previous answers and user information
 * @param {Object} forms
 * @param {Object} user
 * @param {Object} formTemplates
 * @param {Object} previousCase
 */
export const populateFormAnswers = (forms, user, formTemplates, previousCase) => {
  const populatedForms = forms;
  Object.keys(forms).forEach(formId => {
    const formTemplate = formTemplates?.[formId] || {};
    const previousAnswers = previousCase?.forms?.[formId]?.answers || [];
    const dataMap = generateDataMap(formTemplate);
    const answers = populateAnswers(dataMap, user, previousAnswers);
    populatedForms[formId].answers = answers;
  });

  return populatedForms;
};
