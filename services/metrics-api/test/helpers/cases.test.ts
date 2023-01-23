import { createStatusCollection, removeEmptyMetricsValues } from '../../src/helpers/cases';
import type { CaseItem } from '../../src/helpers/query/cases/types';
import type { StatusCollection } from '../../src/helpers/cases';

describe('createStatusCollection', () => {
  it(`should return status collection`, async () => {
    const cases: CaseItem[] = [
      { status: { type: 'notStarted:viva' } },
      { status: { type: 'closed:approved:viva' } },
      { status: { type: 'closed:rejected:viva' } },
      { status: { type: 'closed:partiallyApproved' } },
      { status: { type: 'newApplication:viva' } },
      { status: { type: 'newApplication:viva' } },
      { status: { type: 'newApplication:viva' } },
      { status: { type: 'active:ongoing' } },
      { status: { type: 'active:signature:pending' } },
      { status: { type: 'active:signature:completed' } },
      { status: { type: 'active:completionRequired' } },
      { status: { type: 'active:completionRequired' } },
      { status: { type: 'active:completionRequired' } },
      { status: { type: 'active:completionRequired' } },
      { status: { type: 'active:submitted:completion:viva' } },
      { status: { type: 'active:ongoing:completion' } },
      { status: { type: 'active:submitted:randomCheck' } },
      { status: { type: 'active:randomCheckRequired' } },
      { status: { type: 'active:processing' } },
      { status: { type: 'active:submitted' } },
      { status: { type: 'active:ongoing:newApplication' } },
    ];

    const expectedResult: StatusCollection = {
      ekb_cases_open_total: {
        'notStarted:viva': 1,
        'newApplication:viva': 3,
        'active:ongoing': 1,
        'active:signature:pending': 1,
        'active:signature:completed': 1,
        'active:completionRequired': 4,
        'active:submitted:completion:viva': 1,
        'active:ongoing:completion': 1,
        'active:submitted:randomCheck': 1,
        'active:randomCheckRequired': 1,
        'active:processing': 1,
        'active:submitted': 1,
        'active:ongoing:newApplication': 1,
      },
      ekb_cases_closed_total: {
        'closed:approved:viva': 1,
        'closed:rejected:viva': 1,
        'closed:partiallyApproved': 1,
      },
    };

    const result = createStatusCollection(cases);
    expect(result).toEqual(expectedResult);
  });

  it(`should return status collection with only open cases`, async () => {
    const cases: CaseItem[] = [{ status: { type: 'notStarted:viva' } }];

    const expectedResult: StatusCollection = {
      ekb_cases_open_total: {
        'notStarted:viva': 1,
      },
      ekb_cases_closed_total: {},
    };

    const result = createStatusCollection(cases);
    expect(result).toEqual(expectedResult);
  });
});

describe('removeEmptyMetricsValues', () => {
  it(`should remove empty status collection object`, async () => {
    const statusCollection: StatusCollection = {
      ekb_cases_open_total: {
        'notStarted:viva': 10,
      },
      ekb_cases_closed_total: {},
    };

    const expectedResult = {
      ekb_cases_open_total: {
        'notStarted:viva': 10,
      },
    };

    const result = removeEmptyMetricsValues(statusCollection);
    expect(result).toEqual(expectedResult);
  });
});

removeEmptyMetricsValues;
