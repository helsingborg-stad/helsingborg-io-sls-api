import log from '../libs/logs';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import { CaseItem } from '../types/caseItem';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import { VivaWorkflow } from '../types/vivaWorkflow';

type GetCaseResult = Promise<{ Items: CaseItem[] }>;
interface GetWorkflowParams {
  personalNumber: string;
  workflowId: string | null;
}

export interface GetWorkflowResult {
  attributes: VivaWorkflow;
}

export interface Dependencies {
  getSubmittedOrProcessingOrOngoingCases: (personalNumber: string) => GetCaseResult;
  updateCaseDetailsWorkflow: (caseKeys: CaseKeys, newWorkflow: VivaWorkflow) => Promise<void>;
  syncWorkflowSuccess: (detail: Record<string, unknown>) => Promise<void>;
  getWorkflow: (payload: GetWorkflowParams) => Promise<GetWorkflowResult>;
}

interface User {
  personalNumber: string;
}

interface LambdaDetails {
  user: User;
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

interface CaseKeys {
  PK: string;
  SK: string;
}

function getSubmittedOrProcessingOrOngoingCases(personalNumber: string): GetCaseResult {
  const PK = `USER#${personalNumber}`;

  const queryParams = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression:
      '(begins_with(#status.#type, :statusTypeSubmitted) or begins_with(#status.#type, :statusTypeProcessing) or begins_with(#status.#type, :statusTypeOngoing)) and provider = :provider',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': PK,
      ':statusTypeSubmitted': 'active:submitted',
      ':statusTypeProcessing': 'active:processing',
      ':statusTypeOngoing': 'active:ongoing',
      ':provider': 'VIVA',
    },
  };

  return dynamoDb.call('query', queryParams);
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

  const userCases = await dependencies.getSubmittedOrProcessingOrOngoingCases(personalNumber);

  const caseList = userCases.Items;

  const isEmptyCaseList = caseList?.length === 0;

  if (isEmptyCaseList) {
    return true;
  }

  const caseListHasWorkflowId = caseList.filter(caseItem => !!caseItem.details.workflowId);

  const syncPromises = caseListHasWorkflowId.map(async caseItem => {
    const caseKeys = {
      PK: caseItem.PK,
      SK: caseItem.SK,
    };

    const { workflowId } = caseItem.details;

    const workflow = await dependencies.getWorkflow({ personalNumber, workflowId });

    await dependencies.updateCaseDetailsWorkflow(caseKeys, workflow.attributes);
    await dependencies.syncWorkflowSuccess({ caseKeys, workflow: workflow.attributes });
  });

  await Promise.all(syncPromises);

  return true;
}

export const main = log.wrap(event =>
  syncWorkflow(event, {
    updateCaseDetailsWorkflow,
    getSubmittedOrProcessingOrOngoingCases,
    syncWorkflowSuccess: putVivaMsEvent.syncWorkflowSuccess,
    getWorkflow: vivaAdapter.workflow.get,
  })
);
