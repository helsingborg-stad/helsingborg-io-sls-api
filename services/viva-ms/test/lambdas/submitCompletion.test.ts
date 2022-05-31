import { submitCompletion, LambdaRequest, Dependencies } from '../../src/lambdas/submitCompletion';
import { EncryptionType } from '../../src/types/caseItem';
import { VivaAttachmentCategory } from '../../src/types/vivaMyPages';
import type { CaseItem, CaseForm } from '../../src/types/caseItem';
import type { CaseAttachment } from '../../src/helpers/attachment';

const randomCheckFormId = 'randomCheckFormId';
const completionFormId = 'completionFormId';
const PK = 'USER#199492921234';
const SK = 'CASE#123';

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
    forms: null,
    provider: 'VIVA',
    persons: [],
    details: {
      period: {
        endDate: 1,
        startDate: 2,
      },
      workflowId: '123',
    },
    currentFormId: 'SOME STRING',
    ...partialCase,
  };
}

function createInput(partialInput: Partial<LambdaRequest> = {}): LambdaRequest {
  return {
    detail: {
      caseKeys: {
        PK,
        SK,
      },
    },
    ...partialInput,
  };
}

function createDependencies(
  caseToUse: CaseItem,
  partialDependencies: Partial<Dependencies> = {}
): Dependencies {
  return {
    getCase: () => Promise.resolve(caseToUse),
    readParams: () => Promise.resolve({ randomCheckFormId, completionFormId }),
    postCompletion: () => Promise.resolve({ status: 'OK' }),
    updateCase: () => Promise.resolve(),
    getAttachments: () => Promise.resolve([]),
    ...partialDependencies,
  };
}

it('successfully submits completions', async () => {
  const result = await submitCompletion(createInput(), createDependencies(createCase()));
  expect(result).toBe(true);
});

it('returns true if `currentFormId` does not match `randomCheckFormId` or `completionFormId`', async () => {
  const result = await submitCompletion(
    createInput(),
    createDependencies(createCase({ currentFormId: 'No matching form id' }))
  );
  expect(result).toBe(true);
});

it('returns false if VADA `postCompletionResponse` is successful but `status` is ERROR`', async () => {
  const result = await submitCompletion(
    createInput(),
    createDependencies(createCase({ currentFormId: randomCheckFormId }), {
      postCompletion: () => Promise.resolve({ status: 'ERROR' }),
    })
  );
  expect(result).toBe(false);
});

it('calls postCompletion with form answer containing attachment', async () => {
  const form: CaseForm = {
    answers: [],
    currentPosition: {
      currentMainStep: 1,
      currentMainStepIndex: 0,
      index: 0,
      level: 0,
    },
    encryption: {
      type: EncryptionType.Decrypted,
    },
  };

  const attachments: CaseAttachment[] = [
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

  const postCompletionSpy = jest.spyOn(dependencies, 'postCompletion');
  await submitCompletion(createInput(), dependencies);

  expect(postCompletionSpy).toHaveBeenCalledWith(expect.objectContaining({ attachments }));
});

it('calls `updateCase` with correct parameters for form id: completionFormId', async () => {
  const form: CaseForm = {
    answers: [],
    currentPosition: {
      currentMainStep: 1,
      currentMainStepIndex: 0,
      index: 0,
      level: 0,
    },
    encryption: {
      type: EncryptionType.Decrypted,
    },
  };

  const updateCaseParams = {
    caseKeys: {
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
