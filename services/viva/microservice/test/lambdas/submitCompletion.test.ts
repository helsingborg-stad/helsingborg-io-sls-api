import { submitCompletion } from '../../src/lambdas/submitCompletion';
import { EncryptionType } from '../../src/types/caseItem';
import { VivaAttachmentCategory } from '../../src/types/vivaAttachment';
import { DEFAULT_CURRENT_POSITION } from '../../src/helpers/constants';
import type { CaseItem, CaseForm } from '../../src/types/caseItem';
import type { VivaAttachment } from '../../src/types/vivaAttachment';
import type { LambdaDetail, Dependencies } from '../../src/lambdas/submitCompletion';

const recurringFormId = 'recurringFormId';
const randomCheckFormId = 'randomCheckFormId';
const completionFormId = 'completionFormId';
const newApplicationFormId = 'newApplicationFormId';
const newApplicationRandomCheckFormId = 'newApplicationRandomCheckFormId';
const newApplicationCompletionFormId = 'newApplicationCompletionFormId';

const PK = 'USER#199492921234';
const SK = 'CASE#123';

const mockUuid = '00000000-0000-0000-0000-000000000000';
jest.mock('uuid', () => ({ v4: () => mockUuid }));

function createCase(partialCase: Partial<CaseItem> = {}): CaseItem {
  return {
    id: '123',
    PK,
    SK,
    state: 'SOME STRING',
    expirationTime: 0,
    createdAt: 0,
    updatedAt: 0,
    status: {
      type: 'myStatusType',
      name: 'myStatusName',
      description: 'myStatusDescription',
    },
    forms: {
      randomCheckFormId: {},
      completionFormId: {},
      newApplicationCompletionFormId: {},
    } as unknown as Record<string, CaseForm>,
    provider: 'VIVA',
    persons: [],
    contacts: [],
    details: {
      vivaCaseId: '123',
      period: {
        endDate: 1,
        startDate: 2,
      },
      completions: null,
      workflowId: '123',
    },
    currentFormId: completionFormId,
    ...partialCase,
  };
}

function createInput(partialInput: Partial<LambdaDetail> = {}): LambdaDetail {
  return {
    messageId: '123abc',
    caseKeys: {
      PK,
      SK,
    },
    status: {
      type: 'myStatusType',
      name: 'myStatusName',
      description: 'myStatusDescription',
    },
    state: 'SOME STRING',
    ...partialInput,
  };
}

function createDependencies(
  caseTest: CaseItem,
  partialDependencies: Partial<Dependencies> = {}
): Dependencies {
  return {
    requestId: '123',
    getCase: () => Promise.resolve(caseTest),
    readParams: () =>
      Promise.resolve({
        recurringFormId,
        randomCheckFormId,
        completionFormId,
        newApplicationFormId,
        newApplicationRandomCheckFormId,
        newApplicationCompletionFormId,
      }),
    postCompletions: () => Promise.resolve({ status: 'OK' }),
    updateCase: () => Promise.resolve(),
    triggerSubmitWithError: () => Promise.resolve(),
    getAttachments: () => Promise.resolve([]),
    deleteAttachments: () => Promise.resolve(undefined),
    ...partialDependencies,
  };
}

it('successfully submits completions', async () => {
  expect.assertions(4);

  const updateCaseMock = jest.fn().mockResolvedValueOnce(undefined);
  const deleteAttachmentsMock = jest.fn().mockResolvedValueOnce(undefined);

  const attachments = [{ id: '1' }, { id: '2' }, { id: '3' }] as VivaAttachment[];
  const getAttachmentsMock = jest.fn().mockResolvedValueOnce(attachments);

  const result = await submitCompletion(
    createInput(),
    createDependencies(createCase(), {
      updateCase: updateCaseMock,
      deleteAttachments: deleteAttachmentsMock,
      getAttachments: getAttachmentsMock,
    })
  );

  expect(updateCaseMock).toHaveBeenCalledTimes(1);
  expect(deleteAttachmentsMock).toHaveBeenCalledTimes(1);
  expect(deleteAttachmentsMock).toHaveBeenCalledWith(attachments);
  expect(result).toBe(true);
});

it('returns true if `currentFormId` does not match `randomCheckFormId` or `completionFormId` or `newApplicationCompletionFormId`', async () => {
  const result = await submitCompletion(
    createInput(),
    createDependencies(createCase({ currentFormId: 'No matching form id' }))
  );
  expect(result).toBe(true);
});

it('returns false if VADA `postCompletionResponse` is successful but `status` is ERROR`', async () => {
  await expect(
    submitCompletion(
      createInput(),
      createDependencies(createCase({ currentFormId: randomCheckFormId }), {
        postCompletions: () => Promise.resolve({ status: 'ERROR' }),
      })
    )
  ).rejects.toThrow();
});

it('calls postCompletion with form answer containing attachment', async () => {
  const form: CaseForm = {
    answers: [],
    currentPosition: DEFAULT_CURRENT_POSITION,
    encryption: {
      symmetricKeyName: mockUuid,
      encryptionKeyId: mockUuid,
      type: EncryptionType.Decrypted,
    },
  };

  const attachments: VivaAttachment[] = [
    {
      id: '199492921234/uploadedFileNameA_0.png',
      name: 'uploadedFileNameA_0.png',
      category: VivaAttachmentCategory.Incomes,
      fileBase64: 'Some body here',
    },
  ];

  const dependencies = createDependencies(
    createCase({
      forms: {
        [randomCheckFormId]: form,
      },
      currentFormId: randomCheckFormId,
    }),
    { getAttachments: () => Promise.resolve(attachments) }
  );

  const postCompletionSpy = jest.spyOn(dependencies, 'postCompletions');
  await submitCompletion(createInput(), dependencies);

  expect(postCompletionSpy).toHaveBeenCalledWith(expect.objectContaining({ attachments }));
});

it('calls `updateCase` with correct parameters for form id: completionFormId', async () => {
  const form: CaseForm = {
    answers: [],
    currentPosition: DEFAULT_CURRENT_POSITION,
    encryption: {
      symmetricKeyName: mockUuid,
      encryptionKeyId: mockUuid,
      type: EncryptionType.Decrypted,
    },
  };

  const updateCaseParams = {
    keys: {
      PK,
      SK,
    },
    newState: 'VIVA_COMPLETION_RECEIVED',
    currentFormId: completionFormId,
    initialCompletionForm: {
      [completionFormId]: form,
    },
  };

  const updateCaseMock = jest.fn();

  const dependencies = createDependencies(createCase({ currentFormId: completionFormId }), {
    updateCase: updateCaseMock,
  });

  await submitCompletion(createInput(), dependencies);

  expect(updateCaseMock).toHaveBeenCalledWith(updateCaseParams);
});
