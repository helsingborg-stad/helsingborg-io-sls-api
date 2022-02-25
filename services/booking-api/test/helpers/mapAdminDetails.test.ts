import booking from '../../src/helpers/booking';
let mapAdminDetails;

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

const mockBadMappings = {
  [mockAD.Email]: { Email: mockAD.Email },
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

it('returns fallback when lookup is unsuccessful', async () => {
  expect.assertions(2);

  const expectedResult = mockBadMappings;

  getAdministratorDetails.mockRejectedValueOnce(undefined);

  const result = await mapAdminDetails(mockInput);

  expect(result).toEqual(expectedResult);
  expect(getAdministratorDetails).toHaveBeenCalledTimes(1);
});

it('caches AD details between calls', async () => {
  expect.assertions(3);

  const expectedResult = mockMappings;

  getAdministratorDetails.mockResolvedValueOnce(mockLookupResponse);

  const result1 = await mapAdminDetails(mockInput);
  const result2 = await mapAdminDetails(mockInput);

  expect(result1).toEqual(expectedResult);
  expect(result2).toEqual(expectedResult);
  expect(getAdministratorDetails).toHaveBeenCalledTimes(1);
});
