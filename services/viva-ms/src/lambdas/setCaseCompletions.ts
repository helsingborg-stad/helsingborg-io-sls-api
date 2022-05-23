import config from '../libs/config';

import params from '../libs/params';
import log from '../libs/logs';
import { cases } from '../libs/query';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import completionsHelper from '../helpers/completions';
import resetPersonSignature from '../helpers/resetPersonSignature';
import { updateCaseCompletionStatus } from '../helpers/dynamoDb';

import { CaseItem } from '../types/caseItem';
import { VivaParametersResponse } from '../types/ssmParameters';

type CaseKeys = Pick<CaseItem, 'PK' | 'SK'>;
type UserCase = Pick<CaseItem, 'details' | 'persons' | 'currentFormId' | 'id'>;

interface LambdaDetails {
  caseKeys: CaseKeys;
}

export interface LambdaRequest {
  detail: LambdaDetails;
}

export interface Dependencies {
  getCase: (keys: CaseKeys) => Promise<UserCase>;
  readParams: (envsKeyName: string) => Promise<VivaParametersResponse>;
  putSuccessEvent: (params: LambdaDetails) => Promise<null>;
  updateCase: (keys: CaseKeys, caseUpdateAttributes: unknown) => Promise<void>;
}

export async function setCaseCompletions(input: LambdaRequest, dependencies: Dependencies) {
  const { caseKeys } = input.detail;
  const { getCase, readParams, putSuccessEvent, updateCase } = dependencies;

  const caseItem = await getCase(caseKeys);

  const {
    completionFormId,
    randomCheckFormId,
    newApplicationFormId,
    newApplicationCompletionFormId,
    newApplicationRandomCheckFormId,
  } = await readParams(config.cases.providers.viva.envsKeyName);

  const completions = caseItem?.details?.completions;
  const persons = caseItem.persons ?? [];

  const isNewApplication = caseItem.currentFormId === newApplicationFormId;

  const formIds = {
    randomCheckFormId: isNewApplication ? newApplicationRandomCheckFormId : randomCheckFormId,
    completionFormId: isNewApplication ? newApplicationCompletionFormId : completionFormId,
  };

  const caseUpdateAttributes = {
    newStatus: completionsHelper.get.status(completions),
    newState: completionsHelper.get.state(completions),
    newCurrentFormId: completionsHelper.get.formId(formIds, completions),
    newPersons: persons.map(resetPersonSignature),
  };

  await updateCase(caseKeys, caseUpdateAttributes);
  await putSuccessEvent(input.detail);

  return true;
}

export const main = log.wrap(async event => {
  return setCaseCompletions(event, {
    getCase: cases.get,
    readParams: params.read,
    putSuccessEvent: putVivaMsEvent.setCaseCompletionsSuccess,
    updateCase: updateCaseCompletionStatus,
  });
});
