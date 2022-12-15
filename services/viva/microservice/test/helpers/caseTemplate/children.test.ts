import { createChildren } from '../../../src/helpers/caseTemplate/children';
import { CasePersonRole } from '../../../src/types/caseItem';
import { makeAnswer } from './testHelpers';

import type { Child } from '../../../src/helpers/caseTemplate/children';
import type { CaseFormAnswer } from '../../../src/types/caseItem';

describe('Case Template - children', () => {
  it('creates Children', () => {
    const answers: CaseFormAnswer[] = [
      makeAnswer(['children', 'firstName', 'group:children:0'], 'Förnamn 1'),
      makeAnswer(['children', 'lastName', 'group:children:0'], 'Efternamn 1'),
      makeAnswer(['children', 'housing', 'group:children:0'], 'Hemma'),
      makeAnswer(['children', 'personalNumber', 'group:children:0'], '202001019999'),
      makeAnswer(['children', 'school', 'group:children:0'], 'Skola 1'),

      makeAnswer(['children', 'firstName', 'group:children:1'], 'Förnamn 2'),
      makeAnswer(['children', 'lastName', 'group:children:1'], 'Efternamn 2'),
      makeAnswer(['children', 'housing', 'group:children:1'], 'Borta'),
      makeAnswer(['children', 'personalNumber', 'group:children:1'], '202001010000'),
      makeAnswer(['children', 'school', 'group:children:1'], 'Skola 2'),

      makeAnswer(['children', 'firstName', 'group:children:0'], 'Does not override'),
      makeAnswer(['children', 'aid', 'group:children:0'], 'ignored'),
    ];

    const expected: Child[] = [
      {
        firstName: 'Förnamn 1',
        lastName: 'Efternamn 1',
        housing: 'Hemma',
        personalNumber: '202001019999',
        role: CasePersonRole.Children,
        school: 'Skola 1',
      },
      {
        firstName: 'Förnamn 2',
        lastName: 'Efternamn 2',
        housing: 'Borta',
        personalNumber: '202001010000',
        role: CasePersonRole.Children,
        school: 'Skola 2',
      },
    ];

    const result = createChildren(answers);

    expect(result).toHaveLength(expected.length);
    expect(result).toStrictEqual(expect.arrayContaining(expected));
  });
});
