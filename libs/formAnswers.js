const getLatestCase = {
  createdAt: 1615989505899,
  currentFormId: 'bf0ce700-8633-11eb-aeb9-891ddc9690af',
  details: {},
  expirationTime: 1616248996,
  forms: {
    'bf0ce700-8633-11eb-aeb9-891ddc9690af': {
      answers: [
        {
          field: {
            id: 'name',
            tags: ['nametag', 'someothertag'],
          },
          value: 'Hanna',
        },
        {
          field: {
            id: 'id1234',
            tags: [],
          },
          value: 'Vanligt textfält',
        },
        {
          field: {
            id: 'addressid123',
            tags: [],
          },
          value: 'RINGVÄGEN 29',
        },
        {
          field: {
            id: 'emailid123',
            tags: [],
          },
          value: 'Email@test.se',
        },
        {
          field: {
            id: 'editablelistid123.editinput1',
            tags: ['editabletag', 'moretag'],
          },
          value: 'Test input 1',
        },
        {
          field: {
            id: 'editablelistid123.editinput2',
            tags: [],
          },
          value: 'Test input 2',
        },
        {
          field: {
            id: 'check1',
            tags: [],
          },
          value: true,
        },
        {
          field: {
            id: 'repeid97646.0.id111',
            tags: ['taghere'],
          },
          value: 'Text here',
        },
        {
          field: {
            id: 'repeid97646.0.id22',
            tags: ['heheh'],
          },
          value: '99',
        },
        {
          field: {
            id: 'repeid97646.1.id111',
            tags: ['taghere'],
          },
          value: 'More text',
        },
        {
          field: {
            id: 'repeid97646.1.id22',
            tags: ['heheh'],
          },
          value: '1337',
        },
      ],
      currentPosition: {
        currentMainStep: 1,
        currentMainStepIndex: 0,
        index: 0,
        level: 0,
      },
    },
  },
  id: '90ac096d-66b5-4aa3-9bd4-762763f52e9e',
  PK: 'USER#195405272260',
  provider: 'VIVA',
  SK: 'USER#195405272260#CASE#90ac096d-66b5-4aa3-9bd4-762763f52e9e',
  status: {
    description:
      'Du har påbörjat en ansökan. Du kan öppna din ansökan och fortsätta där du slutade.',
    name: 'Pågående',
    type: 'active:ongoing',
  },
  updatedAt: 1615989795048,
};

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

const formatAnswer = (id, tags, value) => ({ field: { id, tags }, value });

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

const getInitialRepeaterValues = (field, previousFormAnswers) => {
  const repeaterAnswers = [];
  field.loadPrevious.forEach(matchString => {
    const repeaterRegex = new RegExp('.+.[*]..+');
    if (repeaterRegex.test(matchString)) {
      const strArray = matchString.split('.[*].');
      const repeaterIdRegex = new RegExp(`${strArray[0]}.[0-9]+.${strArray[1]}`);
      const previousRepeaterAnswers = previousFormAnswers.filter(obj =>
        repeaterIdRegex.test(obj.field.id)
      );
      if (previousRepeaterAnswers.length > 0) {
        previousRepeaterAnswers.map(answer => formatAnswer(answer.id, field.tags, answer.value));
        repeaterAnswers.push(...previousRepeaterAnswers);
      }
    }
  });

  return repeaterAnswers;
};

const getInitialValue = (field, user, previousFormAnswers) => {
  let initialValue;

  field.loadPrevious.forEach(matchString => {
    const strArray = matchString.split('.');
    if (strArray[0] === 'user' && (initialValue = getUserInfo(user, strArray.slice(1)))) {
      return initialValue;
    }

    initialValue = getCaseAnswer(previousFormAnswers, matchString) || initialValue;
  });

  return initialValue ? formatAnswer(field.id, field.tags, initialValue) : undefined;
};

const populateAnswers = (dataMap, user, previousFormAnswers) => {
  const answers = [];

  dataMap.forEach(field => {
    if (field.type === 'repeaterField') {
      const repeaterAnswers = getInitialRepeaterValues(field, previousFormAnswers);
      if (repeaterAnswers.length > 0) {
        answers.push(...repeaterAnswers);
      }

      return;
    }

    const initialFieldValue = getInitialValue(field, user, previousFormAnswers);
    if (initialFieldValue) {
      answers.push(initialFieldValue);
    }
  });

  return answers;
};

export const populateFormAnswers = (forms, user, formTemplates) => {
  const initialForms = { ...forms };
  Object.keys(initialForms).forEach(formId => {
    const formTemplate = formTemplates[formId] || {};
    // MOCK
    const latestCase = getLatestCase;
    const previousFormAnswers = latestCase.forms[formId].answers || [];

    const dataMap = generateDataMap(formTemplate);

    const answers = populateAnswers(dataMap, user, previousFormAnswers);
    initialForms[formId].answers = answers;
  });

  return initialForms;
};
