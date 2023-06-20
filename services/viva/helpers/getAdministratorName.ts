import vivaAdapter from './vivaAdapterRequestClient';
import createAdministrators from './createAdministrators';

export default async function getAdministratorName(personalNumber: string): Promise<string> {
  const officers = await vivaAdapter.officers.get(personalNumber);
  const [administrator] = createAdministrators(officers);
  return administrator.name;
}
