import { isFormNewApplication } from '../../src/helpers/newApplication';

const MOCK_FORMIDS = {
  recurringFormId: '1',
  randomCheckFormId: '2',
  completionFormId: '3',
  newApplicationFormId: '4',
  newApplicationRandomCheckFormId: '5',
  newApplicationCompletionFormId: '6',
};

describe('newApplication', () => {
  describe('isFormNewApplication', () => {
    test.each([
      {
        formIdKey: 'randomCheckFormId',
        targetId: MOCK_FORMIDS.recurringFormId,
        expected: false,
      },
      {
        formIdKey: 'recurringFormId',
        targetId: MOCK_FORMIDS.randomCheckFormId,
        expected: false,
      },
      {
        formIdKey: 'completionFormId',
        targetId: MOCK_FORMIDS.completionFormId,
        expected: false,
      },
      {
        formIdKey: 'newApplicationFormId',
        targetId: MOCK_FORMIDS.newApplicationFormId,
        expected: true,
      },
      {
        formIdKey: 'newApplicationRandomCheckFormId',
        targetId: MOCK_FORMIDS.newApplicationRandomCheckFormId,
        expected: true,
      },
      {
        formIdKey: 'newApplicationCompletionFormId',
        targetId: MOCK_FORMIDS.newApplicationCompletionFormId,
        expected: true,
      },
    ])('$formIdKey - $expected', ({ targetId, expected }) => {
      const result = isFormNewApplication(MOCK_FORMIDS, targetId);

      expect(result).toBe(expected);
    });
  });
});
