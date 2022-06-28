import { addCasePerson, LambdaRequest, Dependencies } from '../../src/lambdas/addCasePerson';

function createDependencies(
  caseToUse: CaseItem,
  partialDependencies: Partial<Dependencies> = {}
): Dependencies {
  return {
    decodeToken: (params: httpEvent) => Token;
    updateCaseAddPerson: (params) => Promise.resolve(),
    ...partialDependencies,
  };
}
