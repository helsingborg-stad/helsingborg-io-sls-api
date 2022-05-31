import { CaseAdministrator } from '../types/caseItem';
import { VivaOfficer } from '../types/vivaMyPages';

function parseVivaOfficers(vivaOfficer: VivaOfficer | VivaOfficer[]): CaseAdministrator[] {
  let vivaOfficers: VivaOfficer[] = [];

  if (Array.isArray(vivaOfficer)) {
    vivaOfficers = [...vivaOfficer];
  } else {
    // vivaOfficer is an object when viva applicant has only one officer
    vivaOfficers.push(vivaOfficer);
  }

  const vivaAdministrators = vivaOfficers.map(officer => {
    const { name: complexName, title, mail: email, phone, type } = officer;
    const name = complexName.replace(/^CN=(.+)\/OU.*$/, `$1`);

    return {
      name,
      title,
      email,
      phone,
      type,
    };
  });

  return vivaAdministrators;
}

export default {
  parseVivaOfficers,
};
