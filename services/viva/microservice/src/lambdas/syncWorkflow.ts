import log from '../libs/logs';
import config from '../libs/config';
import * as dynamoDb from '../libs/dynamoDb';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import { CaseItem } from '../types/caseItem';
import putVivaMsEvent from '../helpers/putVivaMsEvent';

type GetCaseResult = Promise<{ Items: CaseItem[] }>;

export interface Dependencies {
  getSubmittedOrProcessingOrOngoingCases: (personalNumber: string) => GetCaseResult;
  updateCaseDetailsWorkflow: (caseKeys: CaseKeys, newWorkflow: unknown) => any;
  syncWorkflowSuccess: (detail: Record<string, any>) => any;
  getWorkflow: (payload: any) => any;
}

interface DetailUser {
  personalNumber: string;
}

interface LambdaDetails {
  user: DetailUser;
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

type CaseKeys = {
  PK: string;
  SK: string;
};

async function getSubmittedOrProcessingOrOngoingCases(personalNumber: string): GetCaseResult {
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

function updateCaseDetailsWorkflow(caseKeys: CaseKeys, newWorkflow: any) {
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression: 'SET details.workflow = :newWorkflow',
    ExpressionAttributeValues: {
      ':newWorkflow': newWorkflow,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export async function syncWorkflow(event: LambdaRequest, dependencies: Dependencies) {
  const { personalNumber } = event.detail.user;

  const {
    getSubmittedOrProcessingOrOngoingCases,
    updateCaseDetailsWorkflow,
    syncWorkflowSuccess,
    getWorkflow,
  } = dependencies;

  const userCases = await getSubmittedOrProcessingOrOngoingCases(personalNumber);

  const caseList = userCases.Items;

  const isEmptyCaseList = Array.isArray(caseList) && !caseList.length;

  if (isEmptyCaseList) {
    return true;
  }

  const caseListHasWorkflowId = caseList.filter(caseItem => !!caseItem.details.workflowId);

  async function syncWorkflow(caseItem: CaseItem) {
    const caseKeys = {
      PK: caseItem.PK,
      SK: caseItem.SK,
    };

    const { workflowId } = caseItem.details;

    const workflow = await getWorkflow({ personalNumber, workflowId });

    await updateCaseDetailsWorkflow(caseKeys, workflow.attributes);
    await syncWorkflowSuccess({ caseKeys, workflow });
  }

  const syncPromises = caseListHasWorkflowId.map(syncWorkflow);

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
