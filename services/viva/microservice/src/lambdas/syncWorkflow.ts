import log from '../libs/logs';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import { CLOSED_REJECTED_VIVA, CLOSED_PARTIALLY_APPROVED_VIVA } from '../libs/constants';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import putVivaMsEvent from '../helpers/putVivaMsEvent';

import type { CaseItem } from '../types/caseItem';
import type { VivaWorkflow } from '../types/vivaWorkflow';

interface GetWorkflowParams {
  personalNumber: string;
  workflowId: string;
}

interface User {
  personalNumber: string;
}

interface CaseKeys {
  PK: string;
  SK: string;
}

interface LambdaDetail {
  user: User;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface Dependencies {
  getCasesByStatusType: (personalNumber: string, statusTypeList: string[]) => Promise<CaseItem[]>;
  updateCase: (caseKeys: CaseKeys, newWorkflow: VivaWorkflow) => Promise<void>;
  syncWorkflowSuccess: (detail: Record<string, unknown>) => Promise<void>;
  getWorkflow: (params: GetWorkflowParams) => Promise<VivaWorkflow>;
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
): Promise<CaseItem[]> {
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

function updateCaseDetailsWorkflow(keys: CaseKeys, newWorkflow: VivaWorkflow): Promise<void> {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression: 'SET details.workflow = :newWorkflow, updatedAt = :newUpdatedAt',
    ExpressionAttributeValues: {
      ':newWorkflow': newWorkflow,
      ':newUpdatedAt': Date.now(),
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

function isSetWorkflowId(caseItem: CaseItem) {
  return !!caseItem.details.workflowId;
}

export async function syncWorkflow(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { personalNumber } = input.detail.user;

  const caseList = await dependencies.getCasesByStatusType(personalNumber, [
    'active',
    CLOSED_REJECTED_VIVA,
    CLOSED_PARTIALLY_APPROVED_VIVA,
  ]);

  const isEmptyCaseList = caseList.length === 0;
  if (isEmptyCaseList) {
    return true;
  }

  const caseListWithWorkflowId = caseList.filter(isSetWorkflowId);

  await Promise.allSettled(
    caseListWithWorkflowId.map(async caseItem => {
      const workflowId = caseItem.details.workflowId as string;
      const workflow = await dependencies.getWorkflow({
        personalNumber,
        workflowId,
      });

      const caseKeys = {
        PK: caseItem.PK,
        SK: caseItem.SK,
      };
      await dependencies.updateCase(caseKeys, workflow);
      await dependencies.syncWorkflowSuccess({ caseKeys, workflow });
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
