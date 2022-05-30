import officers from '../../src/helpers/officers';

import { CaseAdministrator } from '../../src/types/caseItem';

function getAdministratorObject({
  email = 'email',
  name = 'name',
  type = 'type',
  title = 'title',
  phone = null,
}: Partial<CaseAdministrator>) {
  return {
    email,
    name,
    phone,
    title,
    type,
  };
}

describe('parseVivaOfficers', () => {
  it('successfully parses a viva officers array to `CaseAdministrator` format', () => {
    const expectedResult = [getAdministratorObject({})];

    const result = officers.parseVivaOfficers([
      {
        mail: 'email',
        name: 'name',
        phone: null,
        title: 'title',
        type: 'type',
        typeenclair: '',
      },
    ]);

    expect(result).toEqual(expectedResult);
  });

  it('successfully parses a viva officer object to case `CaseAdministrator` format', () => {
    const expectedResult = [getAdministratorObject({})];

    const result = officers.parseVivaOfficers({
      mail: 'email',
      name: 'name',
      phone: null,
      title: 'title',
      type: 'type',
      typeenclair: '',
    });

    expect(result).toEqual(expectedResult);
  });
});
