import booking from '../../helpers/booking';
let mapAdminDetails;

jest.mock('../../helpers/booking');

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
  jest.isolateModules(() => {
    mapAdminDetails = require('../../helpers/mapAdminDetails').default;
  });
});

it('returns AD details when lookup is successful', async () => {
  expect.assertions(2);

  const expectedResult = mockMappings;

  booking.getAdministratorDetails.mockResolvedValueOnce(mockLookupResponse);

  const result = await mapAdminDetails(mockInput);

  expect(result).toEqual(expectedResult);
  expect(booking.getAdministratorDetails).toHaveBeenCalledTimes(1);
});

it('returns fallback when lookup is unsuccessful', async () => {
  expect.assertions(2);

  const expectedResult = mockBadMappings;

  booking.getAdministratorDetails.mockRejectedValueOnce();

  const result = await mapAdminDetails(mockInput);

  expect(result).toEqual(expectedResult);
  expect(booking.getAdministratorDetails).toHaveBeenCalledTimes(1);
});

it('caches AD details between calls', async () => {
  expect.assertions(3);

  const expectedResult = mockMappings;

  booking.getAdministratorDetails.mockResolvedValueOnce(mockLookupResponse);

  const result1 = await mapAdminDetails(mockInput);
  const result2 = await mapAdminDetails(mockInput);

  expect(result1).toEqual(expectedResult);
  expect(result2).toEqual(expectedResult);
  expect(booking.getAdministratorDetails).toHaveBeenCalledTimes(1);
});
