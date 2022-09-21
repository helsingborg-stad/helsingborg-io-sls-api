import log from '../libs/logs';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import { ACTIVE_ONGOING, ACTIVE_SUBMITTED, ACTIVE_PROCESSING, CLOSED } from '../libs/constants';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import putVivaMsEvent from '../helpers/putVivaMsEvent';

import type { CaseItem } from '../types/caseItem';
import type { VivaWorkflow } from '../types/vivaWorkflow';

type GetCaseResult = Promise<CaseItem[]>;

interface GetWorkflowParams {
  personalNumber: string;
  workflowId: string | null;
}

export interface GetWorkflowResult {
  attributes: VivaWorkflow;
}

interface User {
  personalNumber: string;
}

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetails {
  user: User;
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

export interface Dependencies {
  getCasesByStatusType: (personalNumber: string, statusTypeList: string[]) => GetCaseResult;
  updateCase: (caseKeys: CaseKeys, newWorkflow: VivaWorkflow) => Promise<void>;
  syncWorkflowSuccess: (detail: Record<string, unknown>) => Promise<void>;
  getWorkflow: (payload: GetWorkflowParams) => Promise<GetWorkflowResult>;
}

function createAttributeValueName(statusType: string): string {
  const name = statusType.includes(':') ? statusType.split(':')[1] : statusType;
  return `:statusType${name.charAt(0).toUpperCase() + name.slice(1)}`;
}

export function createAttributeValues(statusType: string) {
  return { [createAttributeValueName(statusType)]: statusType };
}

export function filterExpressionMapper(statusType: string): string {
  const valueName = createAttributeValueName(statusType);
  return `begins_with(#status.#type, ${valueName})`;
}

async function getCasesByStatusType(
  personalNumber: string,
  statusTypeList: string[]
): GetCaseResult {
  const PK = `USER#${personalNumber}`;

  const filterExpression = statusTypeList.map(filterExpressionMapper).join(' or ');
  const expressionAttributeValues = statusTypeList.reduce((acc, statusType) => {
    return { ...acc, ...createAttributeValues(statusType) };
  }, {});

  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: `(${filterExpression}) and provider = :provider`,
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': PK,
      ':provider': 'VIVA',
      ...expressionAttributeValues,
    },
  };

  const result = await dynamoDb.call('query', queryParams);

  return (result.Items ?? []) as CaseItem[];
}

function updateCaseDetailsWorkflow(keys: CaseKeys, newWorkflow: VivaWorkflow) {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET details.workflow = :newWorkflow',
    ExpressionAttributeValues: {
      ':newWorkflow': newWorkflow,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export async function syncWorkflow(input: LambdaRequest, dependencies: Dependencies) {
  const { personalNumber } = input.detail.user;

  const caseList = await dependencies.getCasesByStatusType(personalNumber, [
    ACTIVE_ONGOING,
    ACTIVE_SUBMITTED,
    ACTIVE_PROCESSING,
    CLOSED,
  ]);
  const isEmptyCaseList = caseList.length === 0;
  if (isEmptyCaseList) {
    return true;
  }

  const caseListWithWorkflowId = caseList.filter(caseItem => !!caseItem.details.workflowId);

  await Promise.all(
    caseListWithWorkflowId.map(async caseItem => {
      const workflow = await dependencies.getWorkflow({
        personalNumber,
        workflowId: caseItem.details.workflowId,
      });

      const caseKeys = { PK: caseItem.PK, SK: caseItem.SK };
      await dependencies.updateCase(caseKeys, workflow.attributes);
      await dependencies.syncWorkflowSuccess({ caseKeys, workflow: workflow.attributes });
    })
  );

  return true;
}

export const main = log.wrap(event =>
  syncWorkflow(event, {
    updateCase: updateCaseDetailsWorkflow,
    getCasesByStatusType,
    syncWorkflowSuccess: putVivaMsEvent.syncWorkflowSuccess,
    getWorkflow: vivaAdapter.workflow.get,
  })
);
