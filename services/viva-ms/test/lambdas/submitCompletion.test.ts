import * as S3 from '../../src/libs/S3';
import { submitCompletion, LambdaRequest, Dependencies } from '../../src/lambdas/submitCompletion';
import { EncryptionType } from '../../src/types/caseItem';
import type { CaseItem } from '../../src/types/caseItem';

const randomCheckFormId = 'randomCheckFormId';
const completionFormId = 'completionFormId';
const PK = 'USER#199492921234';
const SK = 'CASE#123';
const postVivaResponseId = 'mockPostResponseId';

const initForm = {
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

const myCase: CaseItem = {
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
  details: null,
  currentFormId: 'SOME STRING',
};

let input: LambdaRequest;
let dependencies: Dependencies;

beforeEach(() => {
  initForm.answers = [];
  myCase.forms = {
    [completionFormId]: initForm,
    [randomCheckFormId]: initForm,
  };
  myCase.currentFormId = completionFormId;
  dependencies = {
    getStoredUserCase: () => Promise.resolve([null, { Item: myCase }]),
    readParams: () => Promise.resolve({ randomCheckFormId, completionFormId }),
    postCompletion: () => Promise.resolve({ status: 'OK', id: postVivaResponseId }),
    updateCase: () => Promise.resolve(null),
  };

  input = {
    detail: {
      caseKeys: {
        PK,
        SK,
      },
    },
  };
});

it('successfully submits completions', async () => {
  const result = await submitCompletion(input, dependencies);

  expect(result).toBe(true);
});

it('returns true if `currentFormId` does not match `randomCheckFormId` or `completionFormId`', async () => {
  myCase.currentFormId = 'No matching form id';
  const result = await submitCompletion(input, dependencies);

  expect(result).toBe(true);
});

it('returns false if VADA `postCompletionResponse` is successful but `status` is ERROR`', async () => {
  dependencies.postCompletion = () => Promise.resolve({ status: 'ERROR', id: postVivaResponseId });
  const result = await submitCompletion(input, dependencies);

  expect(result).toBe(false);
});

it('calls postCompletion with form answer containing attachment', async () => {
  jest.spyOn(S3.default, 'getFile').mockResolvedValueOnce({
    id: '321',
    Body: 'Some body here',
  });

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

  myCase.forms = { [completionFormId]: initForm };
  myCase.forms.completionFormId.answers = myAnswers;

  const attachments = [
    {
      id: '199492921234/uploadedFileNameA_0.png',
      name: 'uploadedFileNameA_0.png',
      category: 'incomes',
      fileBase64: 'Some body here',
    },
  ];
  const postCompletionSpy = jest.spyOn(dependencies, 'postCompletion');

  await submitCompletion(input, dependencies);

  expect(postCompletionSpy).toHaveBeenCalledWith(expect.objectContaining({ attachments }));
});

it('calls `updateCase` with correct parameters for formId: completionFormId', async () => {
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
