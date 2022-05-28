import { VIVA_COMPLETION_RECEIVED, VIVA_RANDOM_CHECK_RECEIVED } from '../libs/constants';
import { getItem as getStoredUserCase } from '../libs/queries';
import * as dynamoDb from '../libs/dynamoDb';
import params from '../libs/params';
import config from '../libs/config';
import log from '../libs/logs';

import caseHelper from '../helpers/createCase';
import attachment from '../helpers/attachment';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import { CaseAttachment } from '../helpers/attachment';

import type { CaseItem, CaseForm } from '../types/caseItem';
import type { EventDetailCaseKeys } from '../types/eventDetail';

interface LambdaDetail {
  readonly caseKeys: EventDetailCaseKeys;
  readonly status?: Record<string, unknown>;
  readonly state?: string;
}

export interface LambdaRequest {
  readonly detail: LambdaDetail;
}

interface PostCompletionResponse {
  readonly status: string;
}

interface PostCompletionRequest {
  personalNumber: string;
  workflowId: string | null | undefined;
  attachments: CaseAttachment[];
}

interface GetStoredUserCaseResponse {
  readonly Item: CaseItem | null;
}

interface SSMParamsReadResponse {
  readonly randomCheckFormId: string;
  readonly completionFormId: string;
}

export interface UpdateCaseResponse {
  readonly Attributes: unknown;
}

interface UpdateCaseParameters {
  caseKeys: EventDetailCaseKeys;
  newState: typeof VIVA_COMPLETION_RECEIVED | typeof VIVA_RANDOM_CHECK_RECEIVED;
  currentFormId: string;
  initialCompletionForm: Record<string, CaseForm>;
}

export interface Dependencies {
  getStoredUserCase: (
    TableName: string,
    PK: string,
    SK: string
  ) => Promise<[Error | null, GetStoredUserCaseResponse]>;
  readParams: (name: string) => Promise<SSMParamsReadResponse>;
  postCompletion: (payload: PostCompletionRequest) => Promise<PostCompletionResponse>;
  updateCase: (params: UpdateCaseParameters) => Promise<UpdateCaseResponse | null>;
}

function getReceivedState(currentFormId: string, randomCheckFormId: string) {
  return currentFormId === randomCheckFormId
    ? VIVA_RANDOM_CHECK_RECEIVED
    : VIVA_COMPLETION_RECEIVED;
}

function updateCase(params: UpdateCaseParameters): Promise<UpdateCaseResponse> {
  const { caseKeys, currentFormId, initialCompletionForm, newState } = params;
  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: caseKeys.PK,
      SK: caseKeys.SK,
    },
    UpdateExpression: 'SET #state = :newState, forms.#formId = :resetedCompletionForm',
    ExpressionAttributeNames: {
      '#state': 'state',
      '#formId': currentFormId,
    },
    ExpressionAttributeValues: {
      ':newState': newState,
      ':resetedCompletionForm': initialCompletionForm[currentFormId],
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export async function submitCompletion(input: LambdaRequest, dependencies: Dependencies) {
  const { caseKeys } = input.detail;
  const { getStoredUserCase, readParams, postCompletion, updateCase } = dependencies;

  const [, { Item: caseItem }] = await getStoredUserCase(
    config.cases.tableName,
    caseKeys.PK,
    caseKeys.SK
  );

  if (!caseItem) {
    log.writeWarn(`Requested case item with SK: ${caseKeys.SK}, was not found in the cases table`);
    return true;
  }

  const { currentFormId } = caseItem;
  const { randomCheckFormId, completionFormId } = await readParams(
    config.cases.providers.viva.envsKeyName
  );
  const isCompletionForm = [randomCheckFormId, completionFormId].includes(currentFormId);
  if (!isCompletionForm) {
    return true;
  }

  const personalNumber = caseItem.PK.substring(5);
  const caseAnswers = caseItem.forms?.[currentFormId].answers ?? [];
  const attachmentList = await attachment.createFromAnswers(personalNumber, caseAnswers);

  const postCompletionResponse = await postCompletion({
    personalNumber,
    workflowId: caseItem.details?.workflowId,
    attachments: attachmentList ?? [],
  });

  const isCompletionReceived = postCompletionResponse?.status.toLowerCase() === 'ok';
  if (!isCompletionReceived) {
    log.writeError('Viva completion receive failed', postCompletionResponse);
    return false;
  }

  const isCoApplicant = false;
  const initialCompletionFormEncryption = caseHelper.getFormEncryptionAttributes(isCoApplicant);
  const initialCompletionForm = caseHelper.getInitialFormAttributes(
    [currentFormId],
    initialCompletionFormEncryption
  );

  const updateCaseParams: UpdateCaseParameters = {
    caseKeys,
    currentFormId,
    initialCompletionForm,
    newState: getReceivedState(currentFormId, randomCheckFormId),
  };
  await updateCase(updateCaseParams);

  return true;
}

export const main = log.wrap(async event => {
  return submitCompletion(event, {
    getStoredUserCase,
    readParams: params.read,
    postCompletion: vivaAdapter.completion.post,
    updateCase,
  });
});
