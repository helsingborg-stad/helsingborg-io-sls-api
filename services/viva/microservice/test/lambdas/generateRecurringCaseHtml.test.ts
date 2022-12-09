import {
  generateRecurringCaseHtml,
  S3_HANDLEBAR_TEMPLATE_V3,
  S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED,
} from '../../src/lambdas/generateRecurringCaseHtml';

import type { Dependencies, LambdaRequest } from '../../src/lambdas/generateRecurringCaseHtml';
import type { Template } from '../../src/helpers/createCaseTemplate';
import type { CaseItem } from '../../src/types/caseItem';

const PK = 'USER#199001011234';
const SK = 'CASE#11111111-2222-3333-4444-555555555555';

const caseKeys = {
  PK,
  SK,
};

const input: LambdaRequest = {
  detail: {
    caseKeys,
  },
};

const MOCK_FORMIDS = {
  recurringFormId: 'ae3724d6-cde6-4a3f-ae4b-e023d9ab9e27',
  randomCheckFormId: '7e9f5ac7-1c5e-48f8-86d9-4cc2bc380266',
  completionFormId: '890b23bf-5178-478d-b4c9-cbec92111ac6',
  newApplicationFormId: 'bf17e004-1e7b-4054-a94f-c96c84be563f',
  newApplicationRandomCheckFormId: '000c8d99-d81a-46e3-9fee-51f1877b6abd',
  newApplicationCompletionFormId: '5a95c3e2-10e1-4d93-b106-ce63bf39b99f',
};

function createGetCaseReponse(partialCaseItem?: Partial<CaseItem>): CaseItem {
  return {
    PK: caseKeys.PK,
    SK: caseKeys.SK,
    ...partialCaseItem,
  } as CaseItem;
}

function createDependencies(partialDependencies?: Partial<Dependencies>): Dependencies {
  return {
    getCase: jest.fn().mockResolvedValue(undefined),
    getFormIds: () => Promise.resolve(MOCK_FORMIDS),
    getClosedCases: jest.fn().mockResolvedValue({ Items: [] }),
    getFile: jest.fn().mockResolvedValue({ Body: 'myTemplate' }),
    storeFile: jest.fn().mockResolvedValue({}),
    updateCaseState: jest.fn().mockResolvedValue({}),
    generateSuccess: () => Promise.resolve(undefined),
    getCaseTemplateFunction: () => () => ({} as Template),
    ...partialDependencies,
  };
}

it(`generates html using handlebar template: ${S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED} - if recurring application`, async () => {
  const dependencies = createDependencies({
    getCase: jest.fn().mockResolvedValue(
      createGetCaseReponse({
        currentFormId: MOCK_FORMIDS.recurringFormId,
        forms: {
          [MOCK_FORMIDS.recurringFormId]: {
            answers: [],
          },
        },
      } as unknown as CaseItem)
    ),
  });

  const result = await generateRecurringCaseHtml(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.getFile).toHaveBeenCalledWith('', S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED);
});

it(`generates html using handlebar template: ${S3_HANDLEBAR_TEMPLATE_V3} - if new application`, async () => {
  const dependencies = createDependencies({
    getCase: jest.fn().mockResolvedValue(
      createGetCaseReponse({
        currentFormId: MOCK_FORMIDS.newApplicationFormId,
        forms: {
          [MOCK_FORMIDS.newApplicationFormId]: {
            answers: [],
          },
        },
      } as unknown as CaseItem)
    ),
  });

  const result = await generateRecurringCaseHtml(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.getFile).toHaveBeenCalledWith('', S3_HANDLEBAR_TEMPLATE_V3);
});

it(`generates html using handlebar template: ${S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED} - if closed case was found and it is of type new application`, async () => {
  const dependencies = createDependencies({
    getCase: jest.fn().mockResolvedValue(
      createGetCaseReponse({
        currentFormId: MOCK_FORMIDS.recurringFormId,
        forms: {
          [MOCK_FORMIDS.recurringFormId]: {
            answers: [],
          },
        },
      } as unknown as CaseItem)
    ),
    getClosedCases: jest.fn().mockResolvedValue({
      Items: [
        {
          currentFormId: MOCK_FORMIDS.newApplicationFormId,
          forms: {
            [MOCK_FORMIDS.newApplicationFormId]: {
              answers: [],
            },
          },
        },
      ],
    }),
  });

  const result = await generateRecurringCaseHtml(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.getFile).toHaveBeenCalledWith('', S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED);
});

it(`generates html using handlebar template: ${S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED} - if closed case was found and it is of type recurring application`, async () => {
  const dependencies = createDependencies({
    getCase: jest.fn().mockResolvedValue(
      createGetCaseReponse({
        currentFormId: MOCK_FORMIDS.recurringFormId,
        forms: {
          [MOCK_FORMIDS.recurringFormId]: {
            answers: [],
          },
        },
      } as unknown as CaseItem)
    ),
    getClosedCases: jest.fn().mockResolvedValue({
      Items: [
        {
          currentFormId: MOCK_FORMIDS.recurringFormId,
          forms: {
            [MOCK_FORMIDS.recurringFormId]: {
              answers: [],
            },
          },
        },
      ],
    }),
  });

  const result = await generateRecurringCaseHtml(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.getFile).toHaveBeenCalledWith('', S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED);
});

it('returns false if template files was not found', async () => {
  const dependencies = createDependencies({
    getCase: jest.fn().mockResolvedValue(
      createGetCaseReponse({
        currentFormId: MOCK_FORMIDS.recurringFormId,
        forms: {
          [MOCK_FORMIDS.recurringFormId]: {
            answers: [],
          },
        },
      } as unknown as CaseItem)
    ),
    getFile: jest.fn().mockReturnValue(undefined),
  });

  const result = await generateRecurringCaseHtml(input, dependencies);

  expect(result).toBe(false);
});

it('returns false if getCase was not found', async () => {
  const dependencies = createDependencies();

  const result = await generateRecurringCaseHtml(input, dependencies);

  expect(result).toBe(false);
});
