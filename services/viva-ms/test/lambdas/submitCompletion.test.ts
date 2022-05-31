import { submitCompletion, LambdaRequest, Dependencies } from '../../src/lambdas/submitCompletion';
import { EncryptionType } from '../../src/types/caseItem';
import { VivaAttachmentCategory } from '../../src/types/vivaMyPages';
import type { CaseItem, CaseForm } from '../../src/types/caseItem';
import type { CaseAttachment } from '../../src/helpers/attachment';

const randomCheckFormId = 'randomCheckFormId';
const completionFormId = 'completionFormId';
const PK = 'USER#199492921234';
const SK = 'CASE#123';
const postVivaResponseId = 'mockPostResponseId';

const attachments: CaseAttachment[] = [
  {
    id: '199492921234/uploadedFileNameA_0.png',
    name: 'uploadedFileNameA_0.png',
    category: VivaAttachmentCategory.Incomes,
    fileBase64: 'Some body here',
  },
];

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

function createDependencies(
  caseToUse: CaseItem,
  partialDependencies: Partial<Dependencies> = {}
): Dependencies {
  return {
    getStoredUserCase: () => Promise.resolve([null, { Item: caseToUse }]),
    readParams: () => Promise.resolve({ randomCheckFormId, completionFormId }),
    postCompletion: () => Promise.resolve({ status: 'OK', id: postVivaResponseId }),
    updateCase: () => Promise.resolve(),
    getAttachments: () => Promise.resolve(attachments),
    ...partialDependencies,
  };
}

it('successfully submits completions', async () => {
  const myCase = createCase();
  const input = createInput();
  const dependencies = createDependencies(myCase);

  const result = await submitCompletion(input, dependencies);
  expect(result).toBe(true);
});

it('returns true if `currentFormId` does not match `randomCheckFormId` or `completionFormId`', async () => {
  const myCase = createCase();
  const input = createInput();
  myCase.currentFormId = 'No matching form id';
  const dependencies = createDependencies(myCase);

  const result = await submitCompletion(input, dependencies);
  expect(result).toBe(true);
});

it('returns false if VADA `postCompletionResponse` is successful but `status` is ERROR`', async () => {
  const myCase = createCase();
  const input = createInput();
  const dependencies = createDependencies(myCase, {
    postCompletion: () => Promise.resolve({ status: 'ERROR', id: postVivaResponseId }),
  });

  const result = await submitCompletion(input, dependencies);
  expect(result).toBe(false);
});

it('calls postCompletion with form answer containing attachment', async () => {
  const myCase = createCase();
  const input = createInput();
  const myAnswers = [
    {
      field: {
        id: '123',
        tags: ['viva', 'attachment', 'category', 'incomes'],
      },
      value: [
        {
          uploadedFileName: 'uploadedFileNameA_0.png',
        },
      ],
    },
  ];

  const initForm: CaseForm = {
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

  myCase.forms = { [completionFormId]: initForm };
  myCase.forms.completionFormId.answers = myAnswers;
  const dependencies = createDependencies(myCase);

  const postCompletionSpy = jest.spyOn(dependencies, 'postCompletion');
  await submitCompletion(input, dependencies);

  expect(postCompletionSpy).toHaveBeenCalledWith(expect.objectContaining({ attachments }));
});

it('calls `updateCase` with correct parameters for formId: completionFormId', async () => {
  const myCase = createCase();
  const input = createInput();
  const dependencies = createDependencies(myCase);
  const initForm: CaseForm = {
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
    currentFormId: myCase.currentFormId,
    initialCompletionForm: {
      [myCase.currentFormId]: initForm,
    },
  };

  const updateCaseSpy = jest.spyOn(dependencies, 'updateCase');

  await submitCompletion(input, dependencies);

  expect(updateCaseSpy).toHaveBeenCalledWith(updateCaseParams);
});
