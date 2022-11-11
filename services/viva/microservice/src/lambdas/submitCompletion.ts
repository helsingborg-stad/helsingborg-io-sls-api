import { VIVA_COMPLETION_RECEIVED, VIVA_RANDOM_CHECK_RECEIVED } from '../libs/constants';
import { cases } from '../helpers/query';

import * as dynamoDb from '../libs/dynamoDb';
import S3 from '../libs/S3';
import params from '../libs/params';
import config from '../libs/config';
import log from '../libs/logs';

import caseHelper from '../helpers/createCase';
import attachment from '../helpers/attachment';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import type { VivaAttachment } from '../types/vivaAttachment';

import type { PostCompletionsPayload } from '../helpers/vivaAdapterRequestClient';
import type { CaseItem, CaseForm, CaseFormAnswer } from '../types/caseItem';
import type { EventDetailCaseKeys } from '../types/eventDetail';

interface LambdaDetail {
  readonly caseKeys: EventDetailCaseKeys;
  readonly status?: Record<string, unknown>;
  readonly state?: string;
}

export interface LambdaRequest {
  readonly detail: LambdaDetail;
}

interface SSMParamsReadResponse {
  readonly randomCheckFormId: string;
  readonly completionFormId: string;
}

interface UpdateCaseParameters {
  caseKeys: EventDetailCaseKeys;
  newState: typeof VIVA_COMPLETION_RECEIVED | typeof VIVA_RANDOM_CHECK_RECEIVED;
  currentFormId: string;
  initialCompletionForm: Record<string, CaseForm>;
}
interface PostCompletionsResponse {
  status: string;
}

export interface Dependencies {
  getCase: (keys: EventDetailCaseKeys) => Promise<CaseItem>;
  readParams: (name: string) => Promise<SSMParamsReadResponse>;
  postCompletions: (payload: PostCompletionsPayload) => Promise<PostCompletionsResponse>;
  updateCase: (params: UpdateCaseParameters) => Promise<void>;
  getAttachments: (
    personalNumber: string,
    answerList: CaseFormAnswer[]
  ) => Promise<VivaAttachment[]>;
  deleteAttachments: (attachments: VivaAttachment[]) => Promise<void>;
}

function getReceivedState(currentFormId: string, randomCheckFormId: string) {
  return currentFormId === randomCheckFormId
    ? VIVA_RANDOM_CHECK_RECEIVED
    : VIVA_COMPLETION_RECEIVED;
}

async function updateCase(params: UpdateCaseParameters): Promise<void> {
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

  await dynamoDb.call('update', updateParams);
}

function deleteS3Attachments(attachments: VivaAttachment[]) {
  const keys = attachments.map(({ id }) => ({ Key: id }));

  return S3.deleteFiles(process.env.BUCKET_NAME as string, keys);
}

export async function submitCompletion(input: LambdaRequest, dependencies: Dependencies) {
  const { caseKeys } = input.detail;

  const caseItem = await dependencies.getCase(caseKeys);
  if (!caseItem) {
    log.writeWarn(`Requested case item with SK: ${caseKeys.SK}, was not found in the cases table`);
    return true;
  }

  const { currentFormId } = caseItem;
  const { randomCheckFormId, completionFormId } = await dependencies.readParams(
    config.cases.providers.viva.envsKeyName
  );
  const isCompletionForm = [randomCheckFormId, completionFormId].includes(currentFormId);
  if (!isCompletionForm) {
    return true;
  }

  const personalNumber = caseItem.PK.substring(5);
  const caseAnswers = caseItem.forms?.[currentFormId]?.answers ?? [];
  const attachments = await dependencies.getAttachments(personalNumber, caseAnswers);
  const workflowId = caseItem.details.workflowId ?? '';

  const postCompletionResponse = await dependencies.postCompletions({
    personalNumber,
    workflowId,
    attachments,
  });

  const isCompletionReceived = postCompletionResponse?.status.toLowerCase() === 'ok';
  if (!isCompletionReceived) {
    log.writeError('Viva completion receive failed', postCompletionResponse);
    return false;
  }

  const initialCompletionFormEncryption = caseHelper.getFormEncryptionAttributes();
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

  await dependencies.updateCase(updateCaseParams);
  await dependencies.deleteAttachments(attachments);

  return true;
}

export const main = log.wrap(async event => {
  return submitCompletion(event, {
    getCase: cases.get,
    readParams: params.read,
    postCompletions: vivaAdapter.completions.post,
    updateCase,
    getAttachments: attachment.createFromAnswers,
    deleteAttachments: deleteS3Attachments,
  });
});
