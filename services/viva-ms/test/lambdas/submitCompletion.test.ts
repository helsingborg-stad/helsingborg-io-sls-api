import { submitCompletion, LambdaRequest, Dependencies } from '../../src/lambdas/submitCompletion';
import { EncryptionType } from '../../src/types/caseItem';
import type { CaseItem } from '../../src/types/caseItem';

const randomCheckFormId = 'randomCheckFormId';
const completionFormId = 'completionFormId';
const PK = 'mockPK';
const SK = 'mockSK';
const postVivaResponseId = 'mockPostResponseId';

const form = {
  answers: [],
  currentPosition: {
    currentMainStep: 0,
    currentMainStepIndex: 0,
    index: 0,
    level: 0,
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

const myCase: CaseItem = {
  id: '123',
  PK,
  SK,
  state: 'SOME STATE',
  expirationTime: 0,
  createdAt: 0,
  updatedAt: 0,
  status: {
    type: 'myStatusType',
    name: 'myStatusName',
    description: 'myStatusDescription',
  },
  forms: {
    [randomCheckFormId]: form,
    [completionFormId]: form,
  },
  provider: 'VIVA',
  persons: [],
  details,
  currentFormId: completionFormId,
};

let input: LambdaRequest;
let dependencies: Dependencies;

beforeEach(() => {
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

it('returns false if `postCompletionResponse is successful but `status` is ERROR`', async () => {
  myCase.currentFormId = completionFormId;
  dependencies.postCompletion = () => Promise.resolve({ status: 'ERROR', id: postVivaResponseId });
  const result = await submitCompletion(input, dependencies);

  expect(result).toBe(false);
});
             