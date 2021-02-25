/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import caseStatuses from '../../../libs/caseStatuses';
import params from '../../../libs/params';
import * as dynamoDb from '../../../libs/dynamoDb';
import { getApplicationStatus, isApplicationStatusCorrect } from '../helpers/applicationStatus';

const VADA_SSM_PARAMS = params.read(config.vada.envsKeyName);
const CASE_SSM_PARAMS = params.read(config.cases.envsKeyName);

export async function main(event) {
  const { hashedPersonalNumber, caseKeys } = event.detail;

  const vadaSSMParams = await VADA_SSM_PARAMS;
  const [applicationStatusRequestError, applicationStatusList] = await to(
    getApplicationStatus(hashedPersonalNumber, vadaSSMParams)
  );
  if (applicationStatusRequestError) {
    throw applicationStatusRequestError;
  }

  /**
   * The Combination of Status Codes 64, 128, 256, 512
   * determines if a VIVA Application Workflow requires completion
   * 64 - Completion is required,
   * 128 - Case exsits in VIVA
   * 256 - An active e-application is activated in VIVA
   * 512 - Application allows e-application
   */
  const completionStatusCodes = [64, 128, 256, 512];
  if (!isApplicationStatusCorrect(applicationStatusList, completionStatusCodes)) {
    throw 'no completion status found in viva adapter response';
  }

  const caseSSMParams = await CASE_SSM_PARAMS;
  const [updateCaseError, caseItem] = await to(
    updateCaseCompletionAttributes(caseKeys, caseSSMParams.recurringFormId)
  );
  if (updateCaseError) {
    throw updateCaseError;
  }

  console.log(caseItem);
}

async function updateCaseCompletionAttributes(keys, formId) {
  // TODO: use utility function for getting status
  const completionStatus = caseStatuses.find(
    status => status.type === 'active:completionRequired:viva'
  );
  const params = {
    TableName: config.cases.tableName,
    Key: keys,
    UpdateExpression: 'set currentFormId = :formId, #status=:completionStatus',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':formId': formId,
      ':completionStatus': completionStatus,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  const [updateCaseError, caseItem] = await to(dynamoDb.call('update', params));
  if (updateCaseError) {
    throw updateCaseError;
  }

  return caseItem;
}
