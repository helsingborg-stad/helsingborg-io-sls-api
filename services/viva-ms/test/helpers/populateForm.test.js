import { describe } from 'jest-circus';
import populateFormWithVivaChildren, { populateChildrenAnswers } from '../../helpers/populateForm';
import formTemplate from '../mock/formTemplate.json';

const caseRecurringForm = {
  answers: [],
  encryption: {
    type: 'decrypted',
  },
  currentPosition: {
    currentMainStepIndex: 0,
    index: 0,
    level: 0,
    currentMainStep: 1,
  },
};

const repeaterInputFields = [
  {
    id: 'childrenInfo.[*].childrenPersonalID',
    loadPrevious: ['childrenInfo.[*].childrenPersonalID'],
    tags: ['children', 'personalNumber', 'group:children:info:x'],
    type: 'repeaterField',
  },
  {
    id: 'childrenInfo.[*].childrenFirstname',
    loadPrevious: ['childrenInfo.[*].childrenFirstname'],
    tags: ['children', 'firstName', 'group:children:info:x'],
    type: 'repeaterField',
  },
  {
    id: 'childrenInfo.[*].childrenLastname',
    loadPrevious: ['childrenInfo.[*].childrenLastname'],
    tags: ['children', 'lastName', 'group:children:info:x'],
    type: 'repeaterField',
  },
];

const vivaChildrenList = [
  {
    firstName: 'Sanna',
    lastName: 'Backman',
    personalNumber: '200605282383',
  },
  {
    firstName: 'Olle',
    lastName: 'Backman',
    personalNumber: '200701282397',
  },
];

const expectedChildrenAnswers = [
  {
    field: {
      id: 'childrenInfo.0.childrenFirstname',
      tags: ['children', 'firstName', 'group:children:info:x'],
    },
    value: 'Sanna',
  },
  {
    field: {
      id: 'childrenInfo.0.childrenLastname',
      tags: ['children', 'lastName', 'group:children:info:x'],
    },
    value: 'Backman',
  },
  {
    field: {
      id: 'childrenInfo.0.childrenPersonalID',
      tags: ['children', 'personalNumber', 'group:children:info:x'],
    },
    value: '200605282383',
  },
  {
    field: {
      id: 'childrenInfo.1.childrenFirstname',
      tags: ['children', 'firstName', 'group:children:info:x'],
    },
    value: 'Olle',
  },
  {
    field: {
      id: 'childrenInfo.1.childrenLastname',
      tags: ['children', 'lastName', 'group:children:info:x'],
    },
    value: 'Backman',
  },
  {
    field: {
      id: 'childrenInfo.1.childrenPersonalID',
      tags: ['children', 'personalNumber', 'group:children:info:x'],
    },
    value: '200701282397',
  },
];

const expectedPopulatedFormWithChildren = {
  answers: [
    {
      field: {
        id: 'childrenInfo.0.childrenFirstname',
        tags: ['children', 'firstName', 'group:children:info:x'],
      },
      value: 'Sanna',
    },
    {
      field: {
        id: 'childrenInfo.0.childrenLastname',
        tags: ['children', 'lastName', 'group:children:info:x'],
      },
      value: 'Backman',
    },
    {
      field: {
        id: 'childrenInfo.0.childrenPersonalID',
        tags: ['children', 'personalNumber', 'group:children:info:x'],
      },
      value: '200605282383',
    },
    {
      field: {
        id: 'childrenInfo.1.childrenFirstname',
        tags: ['children', 'firstName', 'group:children:info:x'],
      },
      value: 'Olle',
    },
    {
      field: {
        id: 'childrenInfo.1.childrenLastname',
        tags: ['children', 'lastName', 'group:children:info:x'],
      },
      value: 'Backman',
    },
    {
      field: {
        id: 'childrenInfo.1.childrenPersonalID',
        tags: ['children', 'personalNumber', 'group:children:info:x'],
      },
      value: '200701282397',
    },
  ],
  encryption: {
    type: 'decrypted',
  },
  currentPosition: {
    currentMainStepIndex: 0,
    index: 0,
    level: 0,
    currentMainStep: 1,
  },
};

describe('populateChildrenAnswers', () => {
  it('populate answers with children from Viva according to recurring form template', () => {
    const results = populateChildrenAnswers(repeaterInputFields, vivaChildrenList);
    expect(results).toEqual(expectedChildrenAnswers);
  });
});

describe('populateFormWithVivaChildren', () => {
  it('testing', () => {
    const results = populateFormWithVivaChildren(caseRecurringForm, formTemplate, vivaChildrenList);
    expect(results).toEqual(expectedPopulatedFormWithChildren);
  });
});
