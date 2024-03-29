import { describe } from 'jest-circus';
import populateFormWithVivaChildren, {
  populateChildrenAnswers,
} from '../../src/helpers/populateForm';
import formRecurring from '../mock/formRecurring.json';

import { DEFAULT_CURRENT_POSITION } from '../../src/helpers/constants';

import type { FormField } from '../../src/helpers/populateForm';
import type { CaseForm, CasePerson } from '../../src/types/caseItem';
import { EncryptionType, CasePersonRole } from '../../src/types/caseItem';

const caseRecurringForm: CaseForm = {
  answers: [],
  encryption: {
    symmetricKeyName: '',
    type: EncryptionType.Decrypted,
  },
  currentPosition: DEFAULT_CURRENT_POSITION,
};

const repeaterInputFields: FormField[] = [
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

const vivaChildrenList: CasePerson[] = [
  {
    firstName: 'Sanna',
    lastName: 'Backman',
    personalNumber: '200605282383',
    role: CasePersonRole.Children,
  },
  {
    firstName: 'Olle',
    lastName: 'Backman',
    personalNumber: '200701282397',
    role: CasePersonRole.Children,
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

const expectedPopulatedFormWithChildren: CaseForm = {
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
    symmetricKeyName: '',
    type: EncryptionType.Decrypted,
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
    const results = populateFormWithVivaChildren(
      caseRecurringForm,
      formRecurring,
      vivaChildrenList
    );
    expect(results).toEqual(expectedPopulatedFormWithChildren);
  });
});
