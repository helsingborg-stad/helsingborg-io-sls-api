import type { Token } from '../../src/libs/token';
import type { LambdaRequest, Dependencies } from '../../src/lambdas/addCasePerson';
import { addCasePerson } from '../../src/lambdas/addCasePerson';

function createInput(partialInput: Partial<LambdaRequest> = {}): LambdaRequest {
  return {
    body: {
      message: 'SOME MESSAGE',
    },
    headers: {
      Authorization: 'SOME AUTHORIZATION',
    },
    ...partialInput,
  };
}

function createDependencies(
  tokenToUse: Token,
  partialDependencies: Partial<Dependencies> = {}
): Dependencies {
  return {
    decodeToken: () => tokenToUse,
    updateCaseAddPerson: () => Promise.resolve(),
    ...partialDependencies,
  };
}

it('successfully add person to case', async () => {
  const result = await addCasePerson(
    createInput(),
    createDependencies({ personalNumber: 'SOME AUTHORIZATION' })
  );

  expect(result).toEqual({
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '{"jsonapi":{"version":"1.0"},"data":{"type":"addCasePerson","attributes":{"caseId":"123"}}}',
  });
});
