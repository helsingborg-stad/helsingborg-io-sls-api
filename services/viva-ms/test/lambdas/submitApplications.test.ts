import { lambda, LambdaContext, LambdaEvent } from '../../src/lambdas/submitApplication';

import { EncryptionType } from '../../src/types/caseItem';

const newApplicationFormId = 'newApplicationFormId';
const recurrentFormId = 'recurrentFormId';
const PK = 'mockPK';
const SK = 'mockSK';
const postVivaResponseId = 'mockPostResponseId';

const form = {
  encryption: {
    type: EncryptionType.Decrypted,
  },
  answers: [1],
  currentPosition: {
    currentMainStep: 0,
    currentMainStepIndex: 0,
    index: 0,
    level: 0,
  },
};
const details = {
  workflowId: 'workflowId',
};

let event: LambdaEvent;
let context: LambdaContext;
beforeEach(() => {
  context = {
    requestId: 'requestId',
    postVivaApplication: () => Promise.resolve({ status: 'OK', id: postVivaResponseId }),
    putSuccessEvent: () => Promise.resolve(null),
    readParams: () => Promise.resolve({ newApplicationFormId, recurringFormId: recurrentFormId }),
    updateVivaCase: () => Promise.resolve(null),
  };

  event = {
    messageId: 'messageId',
    caseItem: {
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
  const result = await lambda(event, context);

  expect(result).toBe(true);
});

it('throws if failing reading SSM parameters', async () => {
  context.readParams = () => Promise.reject('Failing');

  await expect(lambda(event, context)).rejects.toThrow();
});

it('returns true if `currentFormId` does not match `newApplicationFormId` or `recurringFormId`', async () => {
  event.caseItem.currentFormId = 'No matching form id';

  const result = await lambda(event, context);

  expect(result).toBe(true);
});

it('returns true if `postVivaApplication` returns `1014` error code', async () => {
  context.postVivaApplication = () =>
    Promise.reject({ vadaResponse: { error: { details: { errorCode: '1014' } } } });

  const result = await lambda(event, context);

  expect(result).toBe(true);
});

it('throws if `postVivaApplication` fails', async () => {
  context.postVivaApplication = () => Promise.reject({});

  await expect(lambda(event, context)).rejects.toThrow();
});

it('throws if `postVivaApplication` is successful but `status` is not `OK`', async () => {
  context.postVivaApplication = () => Promise.resolve({ status: 'NOT_OK' });

  await expect(lambda(event, context)).rejects.toThrow();
});

test.each([
  { currentFormId: newApplicationFormId, expectedResult: 'new' },
  { currentFormId: recurrentFormId, expectedResult: 'recurrent' },
])(
  'calls `postVivaApplication` with $expectedResult `applicationType` for formId $currentFormId',
  async ({ currentFormId, expectedResult }) => {
    event.caseItem.currentFormId = currentFormId;

    const postVivaApplicationSpy = jest.spyOn(context, 'postVivaApplication');

    await lambda(event, context);

    expect(postVivaApplicationSpy).toHaveBeenCalledWith(
      expect.objectContaining({ applicationType: expectedResult })
    );
  }
);

it('throws if `updateVivaCase` fails', async () => {
  context.updateVivaCase = () => Promise.reject({});

  await expect(lambda(event, context)).rejects.toThrow();
});

it('calls `updateVivaCase` with correct parameters', async () => {
  const updateVivaCaseSpy = jest.spyOn(context, 'updateVivaCase');

  await lambda(event, context);

  expect(updateVivaCaseSpy).toHaveBeenCalledWith({ PK, SK }, postVivaResponseId);
});

it('throws if `putSuccessEvent` fails', async () => {
  context.putSuccessEvent = () => Promise.reject({});

  await expect(lambda(event, context)).rejects.toThrow();
});
