import { CasePerson, CasePersonRole } from '../types/caseItem';

export default function resetPersonSignature(person: CasePerson) {
  const personCopy = { ...person };

  if (personCopy.role === CasePersonRole.Applicant && personCopy.hasSigned) {
    personCopy.hasSigned = false;
  }

  return personCopy;
}
