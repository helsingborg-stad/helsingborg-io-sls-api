import config from '../libs/config';

import params from '../libs/params';
import log from '../libs/logs';
import { cases } from '../helpers/query';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import completionsHelper from '../helpers/completions';
import resetPersonSignature from '../helpers/resetPersonSignature';
import { updateCaseCompletionStatus } from '../helpers/dynamoDb';

import { VivaParametersResponse } from '../types/ssmParameters';
import type { CaseItem, CaseStatus, CaseCompletions } from '../types/caseItem';

type CaseKeys = Pick<CaseItem, 'PK' | 'SK'>;
type UserCase = Pick<CaseItem, 'details' | 'persons' | 'currentFormId' | 'id'>;

interface LambdaDetail {
  caseKeys: CaseKeys;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface Dependencies {
  getCase: (keys: CaseKeys) => Promise<UserCase>;
  readParams: (envsKeyName: string) => Promise<VivaParametersResponse>;
  putSuccessEvent: (params: LambdaDetail) => Promise<void>;
  updateCase: (keys: CaseKeys, caseUpdateAttributes: unknown) => Promise<void>;
  getNewStatus: (completions: CaseCompletions, isNewApplication: boolean) => CaseStatus;
  getNewState: (completions: CaseCompletions) => string;
}

export async function setCaseCompletions(input: LambdaRequest, dependencies: Dependencies) {
  const { caseKeys } = input.detail;

  const caseItem = await dependencies.getCase(caseKeys);
  const { completions } = caseItem.details;
  if (!completions) {
    return true;
  }

  const {
    completionFormId,
    randomCheckFormId,
    newApplicationFormId,
    newApplicationCompletionFormId,
    newApplicationRandomCheckFormId,
  } = await dependencies.readParams(config.cases.providers.viva.envsKeyName);

  const isNewApplication =
    caseItem.currentFormId ===
    (newApplicationFormId || newApplicationCompletionFormId || newApplicationRandomCheckFormId);

  const formIds = {
    randomCheckFormId: isNewApplication ? newApplicationRandomCheckFormId : randomCheckFormId,
    completionFormId: isNewApplication ? newApplicationCompletionFormId : completionFormId,
  };

  const caseUpdateAttributes = {
    newStatus: dependencies.getNewStatus(completions, isNewApplication),
    newState: dependencies.getNewState(completions),
    newCurrentFormId: completionsHelper.get.formId(formIds, completions),
    newPersons: caseItem.persons.map(resetPersonSignature),
  };

  await dependencies.updateCase(caseKeys, caseUpdateAttributes);
  await dependencies.putSuccessEvent(input.detail);

  return true;
}

export const main = log.wrap(async event => {
  return setCaseCompletions(event, {
    getCase: cases.get,
    readParams: params.read,
    putSuccessEvent: putVivaMsEvent.setCaseCompletionsSuccess,
    updateCase: updateCaseCompletionStatus,
    getNewStatus: completionsHelper.get.status,
    getNewState: completionsHelper.get.state,
  });
});
