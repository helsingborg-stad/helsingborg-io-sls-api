import config from '../libs/config';

import params from '../libs/params';
import log from '../libs/logs';
import { cases } from '../libs/query';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import completionsHelper from '../helpers/completions';
import resetPersonSignature from '../helpers/resetPersonSignature';
import { updateCaseCompletionStatus } from '../helpers/dynamoDb';

import { CaseItem } from '../types/caseItem';
import { SSMParameters } from '../types/ssmParameters';

type CaseKeys = Pick<CaseItem, 'PK' | 'SK'>;

interface LambdaDetails {
  caseKeys: CaseKeys;
}

interface LambdaRequest {
  detail: LambdaDetails;
}

interface Dependencies {
  log: typeof log;
  getCase: (keys: { PK: string; SK?: string }) => Promise<CaseItem>;
  readParams: (envsKeyName: string) => Promise<SSMParameters>;
  putSuccessEvent: (params: LambdaDetails) => Promise<null>;
}

export const main = log.wrap(async event => {
  return setCaseCompletions(event, {
    log,
    getCase: cases.get,
    readParams: params.read,
    putSuccessEvent: putVivaMsEvent.setCaseCompletionsSuccess,
  });
});

export async function setCaseCompletions(event: LambdaRequest, dependencies: Dependencies) {
  const { caseKeys } = event.detail;
  const { log, getCase, readParams, putSuccessEvent } = dependencies;

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

  const isNewApplication = [newApplicationFormId].includes(caseItem.currentFormId);

  const forms = {
    randomCheckFormId: isNewApplication ? newApplicationRandomCheckFormId : randomCheckFormId,
    completionFormId: isNewApplication ? newApplicationCompletionFormId : completionFormId,
  };

  const caseUpdateAttributes = {
    newStatus: completionsHelper.get.status(completions),
    newState: completionsHelper.get.state(completions),
    newCurrentFormId: completionsHelper.get.formId(forms, completions),
    newPersons: persons.map(resetPersonSignature),
  };

  await updateCaseCompletionStatus(caseKeys, caseUpdateAttributes);
  await putSuccessEvent(event.detail);

  log.writeInfo('Successfully updated case', caseItem.id);

  return true;
}
