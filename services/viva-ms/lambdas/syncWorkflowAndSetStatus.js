/* eslint-disable no-console */
import to from 'await-to-js';
import deepEqual from 'deep-equal';

import config from '../../../config';
import * as dynamoDb from '../../../libs/dynamoDb';
import { getStatusByType } from '../../../libs/caseStatuses';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

export async function main(event) {
  const personalNumber = event.detail.user.personalNumber;

  const [getCasesError, userCases] = await to(
    getCasesWithStatusSumbittedOrProcessing(personalNumber)
  );
  if (getCasesError) {
    throw getCasesError;
  }

  const casesItems = userCases.Items;
  if (casesItems === undefined || casesItems.length === 0) {
    return console.info(
      '(Viva-ms) DynamoDB query did not fetch any active:submitted or active:processing case(s)'
    );
  }

  for (const userCase of casesItems) {
    const userCasePrimaryKey = {
      PK: userCase.PK,
      SK: userCase.SK,
    };

    const workflowId = userCase.details.workflowId;
    const [adapterGetWorkflowError, vivaWorkflow] = await to(
      vivaAdapter.workflow.get({ personalNumber, workflowId })
    );
    if (adapterGetWorkflowError) {
      console.error('(Viva-ms) Adapter get workflow', adapterGetWorkflowError);
      continue;
    }

    const [syncCaseWorkflowDetailsError] = await to(
      syncCaseWorkflowDetails(userCasePrimaryKey, vivaWorkflow.attributes)
    );
    if (syncCaseWorkflowDetailsError) {
      throw syncCaseWorkflowDetailsError;
    }

    if (!deepEqual(vivaWorkflow.attributes, userCase.details?.workflow)) {
      const [setStatusException] = await to(setStatus(userCasePrimaryKey, vivaWorkflow.attributes));
      if (setStatusException) {
        console.log('(Viva-ms) setStatus exception', setStatusException);
      }
    }
  }

  return true;
}

async function getCasesWithStatusSumbittedOrProcessing(personalNumber) {
  const TableName = config.cases.tableName;
  const PK = `USER#${personalNumber}`;

  const params = {
    TableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression:
      'begins_with(#status.#type, :statusTypeSubmitted) or begins_with(#status.#type, :statusTypeProcessing)',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': PK,
      ':statusTypeSubmitted': 'active:submitted:viva',
      ':statusTypeProcessing': 'active:processing',
    },
  };

  return dynamoDb.call('query', params);
}

async function syncCaseWorkflowDetails(casePrimaryKey, workflow) {
  const TableName = config.cases.tableName;

  const params = {
    TableName,
    Key: casePrimaryKey,
    UpdateExpression: 'SET details.workflow = :newWorkflow',
    ExpressionAttributeValues: { ':newWorkflow': workflow },
    ReturnValues: 'NONE',
  };

  const [updateWorkflowDetailsError] = await to(dynamoDb.call('update', params));
  if (updateWorkflowDetailsError) {
    throw updateWorkflowDetailsError;
  }

  return true;
}

async function setStatus(casePrimaryKey, workflow) {
  const TableName = config.cases.tableName;

  const vivaWorkflowDecisionList = makeArray(workflow.decision?.decisions?.decision);
  const vivaWorkflowCalculation = workflow.calculations?.calculation;
  const vivaWorkflowJournalList = makeArray(workflow.journals?.journal);

  let decisionStatus = 0;
  let newStatusType = '';

  if (
    vivaWorkflowDecisionList != undefined &&
    vivaWorkflowDecisionList.length > 0 &&
    vivaWorkflowJournalList != undefined &&
    vivaWorkflowJournalList.length > 0
  ) {
    vivaWorkflowDecisionList.forEach(decision => {
      const decisionTypeCode = decision.typecode;
      decisionStatus = decisionStatus | parseInt(decisionTypeCode, 10);
    });

    if (decisionStatus === 1) {
      newStatusType = 'closed:approved:viva';
    } else if (decisionStatus === 2) {
      newStatusType = 'closed:rejected:viva';
    } else if (decisionStatus === 3) {
      newStatusType = 'closed:partiallyApproved:viva';
    }
  } else if (vivaWorkflowCalculation !== undefined) {
    newStatusType = 'active:processing';
  } else {
    throw 'Nothing to update';
  }

  const params = {
    TableName,
    Key: casePrimaryKey,
    UpdateExpression: 'SET #status = :newStatusType',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':newStatusType': getStatusByType(newStatusType) },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', params);
}

function makeArray(value) {
  let list = [];

  if (Array.isArray(value)) {
    list = [...value];
  }

  if (value !== undefined) {
    list.push(value);
  }

  return list;
}
