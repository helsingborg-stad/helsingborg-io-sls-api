import mapAdminDetails from '../../src/helpers/mapAdminDetails';
import booking from '../../src/helpers/booking';

jest.mock('../../src/helpers/booking');
const { getAdministratorDetails } = jest.mocked(booking);

const mockAD = {
  Email: 'outlook_1@helsingborg.se',
  DisplayName: 'Display Name 1',
  Department: 'Department 1',
  JobTitle: 'Job Title 1',
};

const mockInput = [mockAD.Email];

const mockLookupResponse = {
  data: {
    data: {
      type: 'userdetails',
      id: 'id',
      attributes: mockAD,
    },
  },
};

const mockMappings = {
  [mockAD.Email]: mockAD,
};

beforeEach(() => {
  jest.resetAllMocks();
});

it('returns AD details when lookup is successful', async () => {
  expect.assertions(2);

  const expectedResult = mockMappings;

  getAdministratorDetails.mockResolvedValueOnce(mockLookupResponse);

  const result = await mapAdminDetails(mockInput);

  expect(result).toEqual(expectedResult);
  expect(getAdministratorDetails).toHaveBeenCalledTimes(1);
});

it('returns value from the cache', async () => {
  expect.assertions(2);

  const expectedResult = mockMappings;

  getAdministratorDetails.mockResolvedValueOnce(mockLookupResponse);

  const result1 = await mapAdminDetails(mockInput);

  expect(result1).toEqual(expectedResult);
  expect(getAdministratorDetails).toHaveBeenCalledTimes(0);
});

it('returns fallback when lookup is unsuccessful', async () => {
  expect.assertions(2);

  const badResponseEmail = 'email';
  const expectedResult = {
    [mockAD.Email]: mockAD,
    [badResponseEmail]: { Email: badResponseEmail },
  };

  getAdministratorDetails.mockRejectedValueOnce(undefined);

  const result = await mapAdminDetails([badResponseEmail]);

  expect(result).toEqual(expectedResult);
  expect(getAdministratorDetails).toHaveBeenCalledTimes(1);
});
