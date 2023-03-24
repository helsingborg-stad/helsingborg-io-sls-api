import createCaseUser from './cases';
import { getNavetPersonInfo, requestNavet } from './navet';
import type { CivilRegistrationProvider, CaseUser } from '../helpers/types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockProvider: CivilRegistrationProvider = {
  getUserInfo(personalNumber: string): Promise<CaseUser> {
    return Promise.resolve({
      personalNumber,
      firstName: 'Petronella',
      lastName: 'Malteskog',
      address: {
        street: 'Testgatan 1',
        postalCode: '12345',
        city: 'Teststaden',
      },
      civilStatus: 'OG',
    });
  },
};

const navetProvider: CivilRegistrationProvider = {
  async getUserInfo(personalNumber: string): Promise<CaseUser> {
    const navet = await requestNavet(personalNumber);
    const navetPerson = await getNavetPersonInfo(navet);
    return createCaseUser(navetPerson);
  },
};

export default navetProvider;
