import createRecurringCaseTemplate from '../../src/helpers/createRecurringCaseTemplate';
import { EncryptionType, CasePersonRole } from '../../src/types/caseItem';
import type { CaseFormAnswer, CaseItem, CasePerson } from '../../src/types/caseItem';

function createPersons(): CasePerson[] {
  return [
    {
      personalNumber: '197501015544',
      firstName: 'Hasse',
      lastName: 'Frasse',
      role: CasePersonRole.Applicant,
    },
    {
      personalNumber: '197201022524',
      firstName: 'Lolo',
      lastName: 'Ostsson',
      role: CasePersonRole.CoApplicant,
    },
  ];
}

function createAnswers(): CaseFormAnswer[] {
  return [
    {
      field: {
        id: 'salaryWithCoapplicant.0.amount',
        tags: ['incomes', 'lon', 'amount', 'group:applicant:salary:0', 'applicant'],
      },
      value: '23401',
    },
    {
      field: {
        id: '789',
        tags: ['incomes', 'lon', 'date', 'group:applicant:salary:0', 'applicant'],
      },
      value: '',
    },
  ];
}

function createCaseItem(): Partial<CaseItem> {
  return {
    forms: {
      '123': {
        answers: [...createAnswers()],
        encryption: {
          type: EncryptionType.Decrypted,
        },
        currentPosition: {
          currentMainStep: 0,
          currentMainStepIndex: 0,
          index: 0,
          level: 0,
          numberOfMainSteps: 0,
        },
      },
    },
    persons: [...createPersons()],
  };
}

function createExpectedResult() {
  return {
    assets: [undefined, undefined, undefined, undefined, undefined, undefined],
    notes: [],
    period: undefined,
    persons: [
      ...createPersons().map(person => ({
        ...person,
        email: undefined,
        occupation: undefined,
        phone: undefined,
      })),
    ],
    children: [],
    housing: {},
    financials: {
      expenses: {
        applicant: [],
        coApplicant: [],
        children: [],
        housing: [],
      },
      incomes: {
        applicant: [
          {
            belongsTo: 'APPLICANT',
            currency: 'kr',
            date: '',
            description: '',
            group: 'group:applicant:salary:0',
            title: 'Lön',
            type: 'income',
            value: '23401',
          },
        ],
        coApplicant: [],
        resident: [],
      },
    },
  };
}

describe('createRecurringCaseTemplate', () => {
  it('successfully create Viva case template', () => {
    const result = createRecurringCaseTemplate(createCaseItem(), createAnswers());

    expect(result).toEqual(createExpectedResult());
  });
});
