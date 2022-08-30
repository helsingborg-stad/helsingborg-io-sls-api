import to from 'await-to-js';

import config from '../libs/config';
import log from '../libs/logs';
import * as dynamoDb from '../libs/dynamoDb';
import { getStatusByType } from '../libs/caseStatuses';
import {
  COMPLETIONS_DUE_DATE_PASSED,
  ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA,
} from '../libs/constants';
import { getItem as getCase } from '../libs/queries';

import {
  VIVA_STATUS_CASE_EXISTS,
  VIVA_STATUS_WEB_APPLICATION_ACTIVE,
  VIVA_STATUS_WEB_APPLICATION_ALLOWED,
} from '../helpers/constants';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

export async function main(event, context) {
  const { caseKeys, vivaApplicantStatusCodeList } = event.detail;

  const requiredStatusCodes = [
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];
  if (!validateApplicationStatus(vivaApplicantStatusCodeList, requiredStatusCodes)) {
    return true;
  }

  const [getCaseError, { Item: caseItem }] = await getCase(
    config.cases.tableName,
    caseKeys.PK,
    caseKeys.SK
  );
  if (getCaseError) {
    log.error(
      'Get case failed',
      context.awsRequestId,
      'service-viva-ms-checkCompletionsDueDate-010',
      getCaseError
    );
    return false;
  }

  if (!caseItem.details.completions.isDueDateExpired) {
    return true;
  }

  const caseUpdateAttributes = {
    newStatus: getStatusByType(ACTIVE_PROCESSING_COMPLETIONS_DUE_DATE_PASSED_VIVA),
    newState: COMPLETIONS_DUE_DATE_PASSED,
  };
  const [updateCaseError, { Attributes: updatedCaseItem }] = await to(
    updateCase(caseKeys, caseUpdateAttributes)
  );
  if (updateCaseError) {
    log.error(
      'Failed to update case',
      context.awsRequestId,
      'service-viva-ms-checkCompletionsDueDate-030',
      updateCaseError
    );
    return false;
  }

  log.info(
    'Successfully updated case',
    context.awsRequestId,
    'service-viva-ms-checkCompletionsDueDate-040',
    updatedCaseItem.id
  );

  return true;
}

function updateCase(keys, caseUpdateAttributes) {
  const { newStatus, newState } = caseUpdateAttributes;
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression:
      'SET #status = :newStatus, #state = :newState, details.completions.requested = :completionsRequested, details.completions.dueDate = :completionsDueDate',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newStatus': newStatus,
      ':newState': newState,
      ':completionsRequested': [],
      ':completionsDueDate': null,
    },
    ProjectionExpression: 'id',
    ReturnValues: 'ALL_NEW',
  };

  return dynamoDb.call('update', updateParams);
}
