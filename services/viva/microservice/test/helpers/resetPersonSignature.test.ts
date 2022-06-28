import resetPersonSignature from '../../src/helpers/resetPersonSignature';

import { CasePersonRole } from '../../src/types/caseItem';

test.each([
  {
    role: CasePersonRole.Applicant,
    hasSigned: false,
    expected: false,
  },
  {
    role: CasePersonRole.Children,
    hasSigned: false,
    expected: false,
  },
  {
    role: CasePersonRole.CoApplicant,
    hasSigned: false,
    expected: false,
  },
  {
    role: CasePersonRole.Unknown,
    hasSigned: false,
    expected: false,
  },
  {
    role: CasePersonRole.Applicant,
    hasSigned: true,
    expected: false,
  },
  {
    role: CasePersonRole.Children,
    hasSigned: true,
    expected: true,
  },
  {
    role: CasePersonRole.CoApplicant,
    hasSigned: true,
    expected: true,
  },
  {
    role: CasePersonRole.Unknown,
    hasSigned: true,
    expected: true,
  },
])('role: $role, hasSigned: $hasSigned, expected: $expected', ({ role, hasSigned, expected }) => {
  const person = {
    personalNumber: '19900102-1234',
    firstName: 'firstName',
    lastName: 'lastName',
    role,
    hasSigned,
  };

  const result = resetPersonSignature(person);

  expect(result.hasSigned).toBe(expected);
});
