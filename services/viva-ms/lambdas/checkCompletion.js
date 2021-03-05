/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import params from '../../../libs/params';
import * as dynamoDb from '../../../libs/dynamoDb';
import { getApplicationStatus, isApplicationStatusCorrect } from '../helpers/applicationStatus';
import { getStatusByType } from '../../../libs/caseStatuses';

const VADA_SSM_PARAMS = params.read(config.vada.envsKeyName);
const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);

export async function main(event) {
  const { personalNumberHashEncoded, caseKeys } = event.detail;

  const vadaSSMParams = await VADA_SSM_PARAMS;
  const [applicationStatusRequestError, applicationStatusList] = await to(
    getApplicationStatus(personalNumberHashEncoded, vadaSSMParams)
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

  const vivaCaseSSMParams = await VIVA_CASE_SSM_PARAMS;
  const [updateCaseError, caseItem] = await to(
    updateCaseCompletionAttributes(caseKeys, vivaCaseSSMParams.completionFormId)
  );
  if (updateCaseError) {
    throw updateCaseError;
  }

  console.log(
    '(viva-ms: checkCompletion): updated case with completion data successfully',
    caseItem
  );
  return true;
}

async function updateCaseCompletionAttributes(keys, currentFormId) {
  const completionStatus = getStatusByType('active:completionRequired:viva');

  const params = {
    TableName: config.cases.tableName,
    Key: keys,
    UpdateExpression: 'set currentFormId = :currentFormId, #status = :completionStatus',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':currentFormId': currentFormId,
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
