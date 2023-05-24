import log from '../libs/logs';
import * as dynamoDb from '../libs/dynamoDb';
import config from '../libs/config';
import params from '../libs/params';
import { getStatusByType } from '../libs/caseStatuses';
import { cases } from '../helpers/query';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import completionsHelper from '../helpers/completions';
import resetPersonSignature from '../helpers/resetPersonSignature';

import type { VivaParametersResponse } from '../types/ssmParameters';
import type { CaseItem, CaseStatus, CasePerson } from '../types/caseItem';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';

type SuccessEvent = LambdaDetail;

interface CaseKeys {
  PK: string;
  SK: string;
}

export interface LambdaDetail {
  vivaApplicantStatusCodeList: VivaApplicationsStatusItem[];
  workflowCompletions: VadaWorkflowCompletions;
  caseKeys: CaseKeys;
  caseState: string;
  caseStatusType: string;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

interface UpdateCaseParams {
  newStatus: CaseStatus;
  newState: string;
  newCurrentFormId: string;
  newPersons: CasePerson[];
}

export interface Dependencies {
  getCase: (keys: CaseKeys) => Promise<CaseItem>;
  readParams: (envsKeyName: string) => Promise<VivaParametersResponse>;
  triggerSuccessEvent: (params: SuccessEvent) => Promise<void>;
  updateCase: (keys: CaseKeys, params: UpdateCaseParams) => Promise<void>;
}

function updateCase(keys: CaseKeys, params: UpdateCaseParams): Promise<void> {
  const { newStatus, newState, newCurrentFormId, newPersons } = params;

  const updateParams = {
    TableName: config.cases.tableName,
    Key: {
      PK: keys.PK,
      SK: keys.SK,
    },
    UpdateExpression:
      'SET #currentFormId = :newCurrentFormId, #status = :newStatus, #persons = :newPersons, #state = :newState',
    ExpressionAttributeNames: {
      '#currentFormId': 'currentFormId',
      '#status': 'status',
      '#persons': 'persons',
      '#state': 'state',
    },
    ExpressionAttributeValues: {
      ':newCurrentFormId': newCurrentFormId,
      ':newPersons': newPersons,
      ':newStatus': newStatus,
      ':newState': newState,
    },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', updateParams);
}

export async function setCaseCompletions(input: LambdaRequest, dependencies: Dependencies) {
  const { caseKeys, caseState, caseStatusType } = input.detail;

  const caseItem = await dependencies.getCase(caseKeys);

  const { completions } = caseItem.details;
  if (!completions) {
    log.writeWarn('Completions not found in case with id:', caseItem.id);
    return true;
  }

  const forms = await dependencies.readParams(config.cases.providers.viva.envsKeyName);
  const { statusType, state, formId } = completionsHelper.createCompletionsResult({
    completions,
    forms,
  });

  const caseUpdateParams: UpdateCaseParams = {
    newStatus: getStatusByType(statusType ?? caseStatusType),
    newState: state ?? caseState,
    newCurrentFormId: formId ?? caseItem.currentFormId,
    newPersons: caseItem.persons.map(resetPersonSignature),
  };

  await dependencies.updateCase(caseKeys, caseUpdateParams);
  await dependencies.triggerSuccessEvent(input.detail);

  return true;
}

export const main = log.wrap(event =>
  setCaseCompletions(event, {
    getCase: cases.get,
    readParams: params.read,
    triggerSuccessEvent: putVivaMsEvent.setCaseCompletionsSuccess,
    updateCase,
  })
);
