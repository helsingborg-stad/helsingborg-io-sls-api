import { getStatus } from '../../src/lambdas/getStatus';
import type { VivaApplicationsStatusItem } from '../../src/types/vivaApplicationsStatus';

describe('viva/status getStatus', () => {
  it("returns the accumulated 'code'", async () => {
    const mockStatuses: VivaApplicationsStatusItem[] = [
      { code: 1, description: '' },
      { code: 2, description: '' },
      { code: 4, description: '' },
    ];

    const result = await getStatus(
      { personalNumber: '' },
      {
        getStatus: () => Promise.resolve(mockStatuses),
      }
    );

    expect(result.code).toBe(7);
  });

  it('returns correct parts', async () => {
    const mockStatuses: VivaApplicationsStatusItem[] = [
      { code: 1, description: 'lorem ipsum dolar sit amet' },
      { code: 2, description: 'åäöÅÄÖ.,!?' },
      { code: 4, description: '' },
    ];

    const expectedParts = [
      { code: 1, message: 'lorem ipsum dolar sit amet' },
      { code: 2, message: 'åäöÅÄÖ.,!?' },
      { code: 4, message: '' },
    ];

    const result = await getStatus(
      { personalNumber: '' },
      {
        getStatus: () => Promise.resolve(mockStatuses),
      }
    );

    expect(result.parts).toStrictEqual(expect.arrayContaining(expectedParts));
  });
});
