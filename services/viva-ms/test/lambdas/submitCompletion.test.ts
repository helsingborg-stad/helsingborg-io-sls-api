import { submitCompletion, LambdaRequest, Dependencies } from '../../src/lambdas/submitCompletion';
import { EncryptionType } from '../../src/types/caseItem';
import type { CaseItem } from '../../src/types/caseItem';

const randomCheckFormId = 'randomCheckFormId';
const completionFormId = 'completionFormId';
const PK = 'mockPK';
const SK = 'mockSK';
const postVivaResponseId = 'mockPostResponseId';

// const form = {
//   answers: [],
// };

const myCase: CaseItem = {
  id: '123',
  PK: '1',
  SK: '2',
  state: 'SOME STATE',
  expirationTime: 0,
  createdAt: 0,
  updatedAt: 0,
  status: {
    type: 'myStatusType',
    name: 'myName',
    description: 'myDescription',
  },
  forms: {
    abc: {
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
    },
  },
  provider: 'VIVA',
  persons: [],
  details: {
    period: {
      startDate: 0,
      endDate: 0,
    },
    workflowId: '321',
  },
  currentFormId: '1234',
};

let input: LambdaRequest;
let dependencies: Dependencies;

beforeEach(() => {
  dependencies = {
    getStoredUserCase: () => Promise.resolve([null, { Item: null }]),
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
