import createRecurringCaseTemplate from '../../src/helpers/createRecurringCaseTemplate';
import { CasePersonRole } from '../../src/types/caseItem';
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

function createCaseItem(): Partial<CaseItem> {
  return {
    persons: [...createPersons()],
  };
}

function createExpectedResult(params: Record<string, unknown>) {
  return {
    assets: [undefined, undefined, undefined, undefined, undefined, undefined],
    notes: [],
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
    financials: {},
    ...params,
  };
}

describe('createRecurringCaseTemplate', () => {
  it('successfully create template if date is not set', () => {
    const answers: CaseFormAnswer[] = [
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

    const result = createRecurringCaseTemplate(createCaseItem(), answers);

    expect(result).toEqual(
      createExpectedResult({
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
      })
    );
  });

  it('successfully create template if date is set', () => {
    const answers: CaseFormAnswer[] = [
      {
        field: {
          id: 'salaryWithCoapplicant.0.amount',
          tags: ['incomes', 'lon', 'amount', 'group:applicant:salary:0', 'applicant'],
        },
        value: '23401',
      },
      {
        field: {
          id: '123',
          tags: ['incomes', 'lon', 'date', 'group:applicant:salary:0', 'applicant'],
        },
        value: 1695138316311,
      },
    ];

    const result = createRecurringCaseTemplate(createCaseItem(), answers);

    expect(result).toEqual(
      createExpectedResult({
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
                date: '2023-09-19',
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
      })
    );
  });
});
