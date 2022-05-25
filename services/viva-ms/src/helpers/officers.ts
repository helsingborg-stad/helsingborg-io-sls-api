import { VivaOfficer } from '../types/vivaMyPages';

interface ParsedVivaOfficer {
  name: string;
  title: string;
  email: string;
  phone: string | null;
}

function parseVivaOfficers(vivaOfficer: VivaOfficer | VivaOfficer[]): ParsedVivaOfficer[] {
  let vivaOfficers: VivaOfficer[] = [];

  if (Array.isArray(vivaOfficer)) {
    vivaOfficers = [...vivaOfficer];
  } else {
    // vivaOfficer is an object when viva applicant has only one officer
    vivaOfficers.push(vivaOfficer);
  }

  const vivaAdministrators = vivaOfficers.map(officer => {
    const { name: complexName, title, mail: email, phone } = officer;
    const name = complexName.replace(/^CN=(.+)\/OU.*$/, `$1`);

    return {
      name,
      title,
      email,
      phone,
    };
  });

  return vivaAdministrators;
}

function filterVivaOfficerByTitle(vivaOfficer: ParsedVivaOfficer, allowedTitles: string[]) {
  return allowedTitles.includes(vivaOfficer.title.toLowerCase());
}

export default {
  parseVivaOfficers,
  filterVivaOfficerByTitle,
};
