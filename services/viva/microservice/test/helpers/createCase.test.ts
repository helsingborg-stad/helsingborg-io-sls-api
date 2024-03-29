import caseHelper from '../../src/helpers/createCase';
import { VivaPersonType } from '../../src/types/vivaMyPages';
import { EncryptionType } from '../../src/types/caseItem';
import type {
  VivaClient,
  VivaMyPagesVivaApplication,
  VivaMyPagesVivaCase,
  VivaOfficer,
  VivaOfficersOfficer,
  VivaPerson,
  VivaPersonsPerson,
} from '../../src/types/vivaMyPages';
import type { CasePerson, CasePeriod, CaseFormEncryption } from '../../src/types/caseItem';

import { DEFAULT_CURRENT_POSITION } from '../../src/helpers/constants';

const vivaApplication: VivaMyPagesVivaApplication = {
  workflowid: '123',
  period: {
    start: '2022-01-01',
    end: '2022-01-31',
  },
};

const vivaClient: VivaClient = {
  pnumber: '19860213-2394',
  fname: 'Bror',
  lname: 'Christiansson',
};

const vivaPersonChild: VivaPerson = {
  pnumber: '20000201-4233',
  fname: 'Lisa',
  lname: 'Nilsson',
  type: VivaPersonType.Child,
};

const vivaPersonPartner: VivaPerson = {
  pnumber: '19790412-3241',
  fname: 'Ulla',
  lname: 'Christiansson',
  type: VivaPersonType.Partner,
};

const vivaOfficer: VivaOfficer = {
  name: 'CN=Some Name/OU=extern/O=UVNHBG',
  mail: 'some.name@helsingborg.se',
  phone: '0733442266',
  title: 'HBG Works',
  type: 'officer',
  typeenclair: 'Handläggare',
};

const vivaPersonList: VivaPersonsPerson = {
  person: [vivaPersonPartner, vivaPersonChild],
};

const vivaOfficerSingle: VivaOfficersOfficer = {
  officer: vivaOfficer,
};

const vivaCaseClientOnly: VivaMyPagesVivaCase = {
  idenclair: '123',
  client: vivaClient,
  officers: vivaOfficerSingle,
  persons: {
    person: { ...vivaPersonChild },
  },
};

const vivaCaseWithPersonList: VivaMyPagesVivaCase = {
  idenclair: '123',
  client: vivaClient,
  officers: vivaOfficerSingle,
  persons: vivaPersonList,
};

describe('stripNonNumericalCharacters', () => {
  it('Results in a string without any non numeric characters', () => {
    const someStringIncludingNonNumericChars = '19660201-1212';
    const result = caseHelper.stripNonNumericalCharacters(someStringIncludingNonNumericChars);
    expect(result).toBe('196602011212');
  });
});

describe('getPeriodInMilliseconds', () => {
  it('Returns an CasePeriod object with UTC timestamps', () => {
    const result: CasePeriod = caseHelper.getPeriodInMilliseconds(vivaApplication.period);
    expect(result).toEqual({
      endDate: 1643587200000,
      startDate: 1640995200000,
    });
  });
});

describe('getCasePersonList', () => {
  it('Returns an list with CasePerson objects', () => {
    const result: CasePerson[] = caseHelper.getCasePersonList(vivaCaseWithPersonList);
    expect(result).toEqual([
      {
        personalNumber: '198602132394',
        firstName: 'Bror',
        lastName: 'Christiansson',
        role: 'applicant',
        hasSigned: false,
      },
      {
        personalNumber: '197904123241',
        firstName: 'Ulla',
        lastName: 'Christiansson',
        role: 'coApplicant',
        hasSigned: false,
      },
      {
        personalNumber: '200002014233',
        firstName: 'Lisa',
        lastName: 'Nilsson',
        role: 'children',
      },
    ]);
  });

  it('Returns an list with the client only as a single CasePerson object', () => {
    const result: CasePerson[] = caseHelper.getCasePersonList(vivaCaseClientOnly);
    expect(result).toEqual([
      {
        personalNumber: '198602132394',
        firstName: 'Bror',
        lastName: 'Christiansson',
        role: 'applicant',
        hasSigned: false,
      },
      {
        personalNumber: '200002014233',
        firstName: 'Lisa',
        lastName: 'Nilsson',
        role: 'children',
      },
    ]);
  });
});

describe('getInitialFormAttributes', () => {
  it('returns initial form attributes', () => {
    const formIds = ['1', '2'];

    const caseEncryption: CaseFormEncryption = {
      type: EncryptionType.Decrypted,
      encryptionKeyId: 'encryptionKeyId',
      symmetricKeyName: 'encryptionKeyId',
    };

    const expectedDefaultValue = {
      encryption: caseEncryption,
      answers: [],
      currentPosition: DEFAULT_CURRENT_POSITION,
    };

    const result = caseHelper.getInitialFormAttributes(formIds, caseEncryption);

    expect(result).toEqual({
      [formIds[0]]: expectedDefaultValue,
      [formIds[1]]: expectedDefaultValue,
    });
  });
});
