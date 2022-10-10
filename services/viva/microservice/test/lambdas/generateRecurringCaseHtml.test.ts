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

function createGetCaseReponse(): [unknown, { Item: CaseItem }] {
  return [
    undefined,
    {
      Item: {
        PK: caseKeys.PK,
        SK: caseKeys.SK,
        currentFormId: 'recurringFormId',
        forms: {
          recurringFormId: {
            answers: [
              {
                field: {
                  id: 'myFieldId',
                  tags: ['myTag'],
                },
                value: 'myValue',
              },
            ],
          },
        },
      } as unknown as CaseItem,
    },
  ];
}

function createDependencies(partialDependencies?: Partial<Dependencies>): Dependencies {
  return {
    getCase: jest.fn().mockResolvedValue(createGetCaseReponse()),
    readParams: () =>
      Promise.resolve({
        recurringFormId: 'recurringFormId',
        randomCheckFormId: 'randomCheckFormId',
        completionFormId: 'completionFormId',
        newApplicationFormId: 'newApplicationFormId',
        newApplicationRandomCheckFormId: 'newApplicationRandomCheckFormId',
        newApplicationCompletionFormId: 'newApplicationCompletionFormId',
      }),
    getClosedCases: jest.fn().mockResolvedValue({ Items: [] }),
    getFile: jest.fn().mockResolvedValue({ Body: 'myTemplate' }),
    storeFile: jest.fn().mockResolvedValue({}),
    updateCaseState: jest.fn().mockResolvedValue({}),
    generateSuccess: () => Promise.resolve(undefined),
    getCaseTemplateFunction: () => () => ({} as Template),
    ...partialDependencies,
  };
}

it(`generates html using handlebar template: ${S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED}`, async () => {
  const dependencies = createDependencies();

  const result = await generateRecurringCaseHtml(input, dependencies);

  expect(result).toBe(true);
  expect(dependencies.getFile).toHaveBeenCalledWith('', S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED);
});

it(`generates html using handlebar template: ${S3_HANDLEBAR_TEMPLATE_V2_DEPRECATED} - if closed case was found and it is of type new application`, async () => {
  const dependencies = createDependencies({
    getClosedCases: jest.fn().mockResolvedValue({
      Items: [
        {
          currentFormId: 'newApplicationFormId',
          forms: {
            newApplicationFormId: {
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
