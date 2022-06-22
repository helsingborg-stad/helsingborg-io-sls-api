import { describe } from 'jest-circus';
import populateFormWithVivaChildren, {
  populateChildrenAnswers,
} from '../../src/helpers/populateForm';
import formTemplate from '../mock/formTemplate.json';

import { DEFAULT_CURRENT_POSITION } from '../../src/helpers/constants';

const caseRecurringForm = {
  answers: [],
  encryption: {
    type: 'decrypted',
  },
  currentPosition: DEFAULT_CURRENT_POSITION,
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
    role: 'children',
  },
  {
    firstName: 'Olle',
    lastName: 'Backman',
    personalNumber: '200701282397',
    role: 'children',
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
  currentPosition: DEFAULT_CURRENT_POSITION,
};

describe('populateChildrenAnswers', () => {
  it('populate answers with children from Viva according to recurring form template', () => {
    const results = populateChildrenAnswers(repeaterInputFields, vivaChildrenList);
    expect(results).toEqual(expectedChildrenAnswers);
  });
});

describe('populateFormWithVivaChildren', () => {
  it('filter data map on tag "children" and prepending recurring form with children from Viva', () => {
    const results = populateFormWithVivaChildren(caseRecurringForm, formTemplate, vivaChildrenList);
    expect(results).toEqual(expectedPopulatedFormWithChildren);
  });
});
