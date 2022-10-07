import config from '../libs/config';

import params from '../libs/params';
import log from '../libs/logs';
import { getStatusByType } from '../libs/caseStatuses';

import { cases } from '../helpers/query';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import completionsHelper from '../helpers/completions';
import resetPersonSignature from '../helpers/resetPersonSignature';
import { updateCaseCompletionStatus } from '../helpers/dynamoDb';

import type { VivaParametersResponse } from '../types/ssmParameters';
import type { CaseItem, CaseStatus, CasePerson } from '../types/caseItem';

interface CaseKeys {
  PK: string;
  SK: string;
}
interface LambdaDetail {
  caseKeys: CaseKeys;
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
  putSuccessEvent: (params: LambdaDetail) => Promise<void>;
  updateCase: (keys: CaseKeys, params: UpdateCaseParams) => Promise<void>;
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
    (newApplicationFormId || newApplicationRandomCheckFormId || newApplicationCompletionFormId);

  const completionsFormIds = {
    randomCheckFormId: isNewApplication ? newApplicationRandomCheckFormId : randomCheckFormId,
    completionFormId: isNewApplication ? newApplicationCompletionFormId : completionFormId,
  };

  const { statusType, state } = completionsHelper.createCompletionsResult({
    isNewApplication,
    completions,
  });

  const caseUpdateAttributes = {
    newStatus: getStatusByType(statusType),
    newState: state,
    newCurrentFormId: completionsHelper.get.formId(completionsFormIds, completions),
    newPersons: caseItem.persons.map(resetPersonSignature),
  };

  await dependencies.updateCase(caseKeys, caseUpdateAttributes);
  await dependencies.putSuccessEvent(input.detail);

  return true;
}

export const main = log.wrap(event => {
  return setCaseCompletions(event, {
    getCase: cases.get,
    readParams: params.read,
    putSuccessEvent: putVivaMsEvent.setCaseCompletionsSuccess,
    updateCase: updateCaseCompletionStatus,
  });
});
