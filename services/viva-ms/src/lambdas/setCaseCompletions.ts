import config from '../libs/config';

import * as dynamoDb from '../libs/dynamoDb';
import params from '../libs/params';
import log from '../libs/logs';
import { cases } from '../libs/query';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import completionsHelper from '../helpers/completions';
import resetPersonSignature from '../helpers/resetPersonSignature';

import { CaseItem } from '../types/caseItem';

type CaseKeys = Pick<CaseItem, 'PK' | 'SK'>;

interface ParamsReadResponse {
  randomCheckFormId: string;
  completionFormId: string;
}

interface LambdaDetails {
  caseKeys: CaseKeys;
}

interface LambdaRequest {
  detail: LambdaDetails;
}

interface Dependencies {
  log: typeof log;
  getCase: (keys: { PK: string; SK?: string }) => Promise<CaseItem>;
  readParams: (envsKeyName: string) => Promise<ParamsReadResponse>;
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

  const vivaCaseSSMParams = await readParams(config.cases.providers.viva.envsKeyName);

  const completions = caseItem?.details?.completions;

  const caseUpdateAttributes = {
    newStatus: completionsHelper.get.status(completions),
    newState: completionsHelper.get.state(completions),
    newCurrentFormId: completionsHelper.get.formId(vivaCaseSSMParams, completions),
    newPersons: caseItem.persons.map(resetPersonSignature),
  };

  await updateCase(caseKeys, caseUpdateAttributes);
  await putSuccessEvent(event.detail);

  log.writeInfo('Successfully updated case', caseItem.id);

  return true;
}

function updateCase(keys, caseUpdateAttributes) {
  const { newStatus, newState, newCurrentFormId, newPersons } = caseUpdateAttributes;

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
    ProjectionExpression: 'id',
    ReturnValues: 'ALL_NEW',
  };

  return dynamoDb.call('update', updateParams);
}
