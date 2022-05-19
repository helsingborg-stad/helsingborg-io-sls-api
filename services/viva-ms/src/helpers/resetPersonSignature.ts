import { CasePerson } from '../types/caseItem';

export default function resetPersonSignature(person: CasePerson) {
  const personCopy = { ...person };

  if (personCopy.role === 'applicant' && personCopy.hasSigned) {
    personCopy.hasSigned = false;
  }

  return personCopy;
}
