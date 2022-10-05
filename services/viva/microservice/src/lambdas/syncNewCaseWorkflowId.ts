import params from '../libs/params';
import log from '../libs/logs';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import {
  VIVA_STATUS_COMPLETION,
  VIVA_STATUS_CASE_EXISTS,
  VIVA_STATUS_WEB_APPLICATION_ACTIVE,
  VIVA_STATUS_WEB_APPLICATION_ALLOWED,
} from '../helpers/constants';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

import type { CaseItem } from '../types/caseItem';
import type { VivaWorkflow } from '../types/vivaWorkflow';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';
import type { VivaParametersResponse } from '../types/ssmParameters';

interface CaseKeys {
  PK: string;
  SK: string;
}

interface User {
  personalNumber: string;
}

interface LambdaDetails {
  user: User;
  status: VivaApplicationsStatusItem[];
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

interface SuccessEvent {
  vivaApplicantStatusCodeList: VivaApplicationsStatusItem[];
  caseKeys: CaseKeys;
  user: User;
  workflowId: string;
}

export interface GetCaseResponse {
  Count: number;
  Items: CaseItem[];
  ScannedCount: number;
}

export interface Dependencies {
  getCase: (personalNumber: string) => Promise<GetCaseResponse>;
  updateCase: (caseKeys: CaseKeys, newWorkflowId: string) => Promise<void>;
  syncSuccess: (detail: SuccessEvent) => Promise<void>;
  getLatestWorkflow: (personalNumber: string) => Promise<VivaWorkflow>;
  readParams: (envsKeyName: string) => Promise<VivaParametersResponse>;
}

function updateCaseWorkflowId(keys: CaseKeys, newWorkflowId: string): Promise<void> {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET details.workflowId = :newWorkflowId, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':newWorkflowId': newWorkflowId,
      ':updatedAt': Date.now(),
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

function getUserApplicantCase(personalNumber: string): Promise<GetCaseResponse> {
  const PK = `USER#${personalNumber}`;
  const SK = 'CASE#';

  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': PK,
      ':sk': SK,
    },
  };

  return dynamoDb.call('query', queryParams);
}

export async function syncNewCaseWorkflowId(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { user, status } = input.detail;

  const getCaseResponse = await dependencies.getCase(user.personalNumber);
  if (getCaseResponse?.Count !== 1) {
    return true;
  }
  const [userCase] = getCaseResponse.Items;

  const completionsStatusCodeList = [
    VIVA_STATUS_COMPLETION,
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];
  const applicationReceivedStatusCodeList = [
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];

  const isApprovedStatusCode =
    validateApplicationStatus(status, completionsStatusCodeList) ||
    validateApplicationStatus(status, applicationReceivedStatusCodeList);
  if (!isApprovedStatusCode) {
    return true;
  }

  const { newApplicationFormId } = await dependencies.readParams(
    config.cases.providers.viva.envsKeyName
  );

  const isNewApplication = userCase.currentFormId === newApplicationFormId;
  if (isNewApplication) {
    const workflow = await dependencies.getLatestWorkflow(user.personalNumber);
    await dependencies.updateCase(
      {
        PK: userCase.PK,
        SK: userCase.SK,
      },
      workflow.workflowid
    );
  }

  return true;
}

export const main = log.wrap(event => {
  return syncNewCaseWorkflowId(event, {
    getCase: getUserApplicantCase,
    updateCase: updateCaseWorkflowId,
    syncSuccess: putVivaMsEvent.syncWorkflowIdSuccess,
    getLatestWorkflow: vivaAdapter.workflow.getLatest,
    readParams: params.read,
  });
});
