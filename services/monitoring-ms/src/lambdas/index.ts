if (require.main === module) {
  process.env.resourcesStage = 'dev';
}
import validateCases from '../helpers/validateCases';
import * as dynamoDb from '../../../../libs/dynamoDb';
import log from '../../../../libs/logs';

function getCases() {
  const queryParams = {
    TableName: 'cases',
  };
  return dynamoDb.call('scan', queryParams);
}

export async function main(): Promise<boolean> {
  const { Items: userCaseList } = await getCases();

  validateCases(userCaseList, {
    getAge: time => new Date().getTime() - time,
    log: (data, userCase) =>
      data &&
      log.log(data.level, data.message, null, null, {
        testId: data.testId,
        caseId: userCase.SK,
      }),
  });
  return true;
}

if (require.main === module) {
  main();
}
