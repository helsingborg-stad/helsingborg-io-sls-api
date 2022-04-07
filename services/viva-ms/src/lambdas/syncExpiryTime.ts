import to from 'await-to-js';

import { getFutureTimestamp, millisecondsToSeconds } from '../libs/timestampHelper';
import { getItem as getStoredUserCase } from '../libs/queries';
import config from '../libs/config';
import log from '../libs/logs';

import { updateCaseExpirationTime } from '../helpers/dynamoDb';
import caseExpiryTime from '../helpers/caseExpiryTime';

interface LambdaContext {
  awsRequestId: string;
}
interface LambdaEvent {
  detail: {
    caseKeys: {
      PK: string;
      SK: string;
    };
  };
}
export async function main(event: LambdaEvent, context: LambdaContext): Promise<boolean> {
  const { caseKeys } = event.detail;
  const { PK, SK } = caseKeys;

  const [getStoredUserCaseError, storedUserCase] = await getStoredUserCase(
    config.cases.tableName,
    PK,
    SK
  );
  if (getStoredUserCaseError) {
    log.error(
      'Error getting stored case from the cases table.',
      context.awsRequestId,
      'service-viva-ms-syncExpiryTime-001',
      getStoredUserCaseError
    );
    return false;
  }

  const expireHours = caseExpiryTime.getHoursOnStatusType(storedUserCase.Item.status.type);
  const newExpirationTime = millisecondsToSeconds(getFutureTimestamp(expireHours));

  const [updateCaseError] = await to(
    updateCaseExpirationTime({
      caseKeys,
      newExpirationTime,
    })
  );
  if (updateCaseError) {
    log.error(
      'Update case error.',
      context.awsRequestId,
      'service-viva-ms-syncExpiryTime-002',
      updateCaseError
    );
    return false;
  }

  return true;
}
