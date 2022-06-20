import {
  submitApplication,
  LambdaRequest,
  Dependencies,
} from '../../src/lambdas/submitApplication';

import { EncryptionType } from '../../src/types/caseItem';
import { VivaApplicationType } from '../../src/types/vivaMyPages';

const newApplicationFormId = 'newApplicationFormId';
const recurrentFormId = 'recurrentFormId';
const PK = 'mockPK';
const SK = 'mockSK';
const id = 'mockCaseId';
const postVivaResponseId = 'mockPostResponseId';

const form = {
  answers: [],
  currentPosition: {
    currentMainStep: 0,
    currentMainStepIndex: 0,
    index: 0,
    level: 0,
    numberOfMainSteps: 0,
  },
  encryption: {
    type: EncryptionType.Decrypted,
  },
};

const details = {
  workflowId: 'workflowId',
  period: {
    startDate: 123,
    endDate: 456,
  },
};

let input: LambdaRequest;
let context: Dependencies;
beforeEach(() => {
  context = {
    requestId: 'requestId',
    postVivaApplication: () => Promise.resolve({ status: 'OK', id: postVivaResponseId }),
    putSuccessEvent: () => Promise.resolve(null),
    readParams: () => Promise.resolve({ newApplicationFormId, recurringFormId: recurrentFormId }),
    updateVivaCase: () => Promise.resolve(null),
  };

  input = {
    messageId: 'messageId',
    caseItem: {
      id,
      PK,
      SK,
      currentFormId: newApplicationFormId,
      pdf: Buffer.alloc(1),
      forms: {
        [newApplicationFormId]: form,
        [recurrentFormId]: form,
      },
      details,
    },
  };
});

it('successfully submits application', async () => {
  const result = await submitApplication(input, context);

  expect(result).toBe(true);
});

it('returns true if `currentFormId` does not match `newApplicationFormId` or `recurringFormId`', async () => {
  input.caseItem.currentFormId = 'No matching form id';

  const result = await submitApplication(input, context);

  expect(result).toBe(true);
});

it('returns true if `postVivaApplication` returns `1014` error code', async () => {
  context.postVivaApplication = () =>
    Promise.reject({ vadaResponse: { error: { details: { errorCode: '1014' } } } });

  const result = await submitApplication(input, context);

  expect(result).toBe(true);
});

it('throws if `postVivaApplication` fails', async () => {
  context.postVivaApplication = () => Promise.reject({});

  await expect(submitApplication(input, context)).rejects.toThrow();
});

it('throws if `postVivaApplication` is successful but `status` is not `OK`', async () => {
  context.postVivaApplication = () => Promise.resolve({ status: 'NOT_OK' });

  await expect(submitApplication(input, context)).rejects.toThrow();
});

test.each([
  { currentFormId: newApplicationFormId, expectedResult: VivaApplicationType.New },
  { currentFormId: recurrentFormId, expectedResult: VivaApplicationType.Recurring },
])(
  'calls `postVivaApplication` with $expectedResult `applicationType` for formId $currentFormId',
  async ({ currentFormId, expectedResult }) => {
    input.caseItem.currentFormId = currentFormId;

    const postVivaApplicationSpy = jest.spyOn(context, 'postVivaApplication');

    await submitApplication(input, context);

    expect(postVivaApplicationSpy).toHaveBeenCalledWith(
      expect.objectContaining({ applicationType: expectedResult })
    );
  }
);

it('calls `updateVivaCase` with correct parameters', async () => {
  const updateVivaCaseSpy = jest.spyOn(context, 'updateVivaCase');

  await submitApplication(input, context);

  expect(updateVivaCaseSpy).toHaveBeenCalledWith({ PK, SK }, postVivaResponseId);
});
