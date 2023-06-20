import type { VivaOfficer } from '../types/vivaMyPages';
import type { CaseAdministrator } from '../types/caseItem';

export default function createAdministrators(
  vivaOfficer: VivaOfficer | VivaOfficer[]
): CaseAdministrator[] {
  const officers: VivaOfficer[] = [];

  Array.isArray(vivaOfficer) ? officers.push(...vivaOfficer) : officers.push(vivaOfficer);

  return officers.map(officer => {
    const { name: complexName, title, mail: email, phone, type } = officer;
    const name = complexName.replace(/^CN=(.+)\/OU.*$/, `$1`);

    return {
      name,
      title,
      email,
      phone,
      type,
    } as CaseAdministrator;
  });
}
