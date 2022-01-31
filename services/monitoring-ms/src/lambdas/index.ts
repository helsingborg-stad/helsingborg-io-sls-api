if (require.main === module) {
  process.env.resourcesStage = 'dev';
}
import validateCases from '../helpers/validateCases';
import * as dynamoDb from '../../../../libs/dynamoDb';
import log from '../../../../libs/logs';
import { CaseResponse, CaseValidatorContext } from '../helpers/types';
import validatorList from 'validators';

export async function main(): Promise<boolean> {
  const validatorContext: CaseValidatorContext = {
    getAge: time => new Date().getTime() - time,
    getTests: () => validatorList,
    getCases: async (): Promise<CaseResponse> =>
      dynamoDb.call('scan', {
        TableName: 'cases',
      }),
    log: (data, userCase) =>
      log.log(data.level, data.message, null, null, {
        testId: data.testId,
        caseId: userCase.SK,
      }),
  };
  await validateCases(validatorContext);
  return true;
}

if (require.main === module) {
  main();
}
