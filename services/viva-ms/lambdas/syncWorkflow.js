/* eslint-disable no-console */
import to from 'await-to-js';
import deepEqual from 'deep-equal';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import log from '../../../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

export async function main(event, context) {
    const { personalNumber } = event.detail.user;

    const [getCasesError, userCases] = await to(getCasesSumbittedOrProcessing(personalNumber));
    if (getCasesError) {
        log.error(
            'Could not get closed or submitted cases',
            context.awsRequestId,
            'service-viva-ms-syncWorkflow-001',
            getCasesError
        );
        return false;
    }

    const caseList = userCases.Items;
    if (caseList === undefined || caseList.length === 0) {
        log.info('No active:submitted or active:processing case(s) found', context.awsRequestId, null);
        return true;
    }

    for (const caseItem of caseList) {
        const caseKeys = {
            PK: caseItem.PK,
            SK: caseItem.SK,
        };

        const { workflowId } = caseItem.details;

        const [adapterWorkflowGetError, workflow] = await to(vivaAdapter.workflow.get({ personalNumber, workflowId }));
        if (adapterWorkflowGetError) {
            log.error(
                'Could not get workflow information from Vada request',
                context.awsRequestId,
                'service-viva-ms-syncWorkflow-002',
                adapterWorkflowGetError
            );
            continue;
        }

        if (deepEqual(workflow.attributes, caseItem.details?.workflow)) {
            log.info('Case workflow is in sync with Viva', context.awsRequestId, null);
            continue;
        }

        const [updateDbWorkflowError] = await to(updateCaseWorkflow(caseKeys, workflow.attributes));
        if (updateDbWorkflowError) {
            log.error(
                'Could not update case workflow details',
                context.awsRequestId,
                'service-viva-ms-syncWorkflow-003',
                updateDbWorkflowError
            );
            return false;
        }

        const [putEventError] = await to(putVivaMsEvent.syncWorkflowSuccess({ caseKeys, workflow }));
        if (putEventError) {
            log.error(
                'Could not put sync workflow success event',
                context.awsRequestId,
                'service-viva-ms-syncWorkflow-004',
                putEventError
            );
            return false;
        }
    }

    return true;
}

async function getCasesSumbittedOrProcessing(personalNumber) {
    const TableName = config.cases.tableName;
    const PK = `USER#${personalNumber}`;

    const params = {
        TableName,
        KeyConditionExpression: 'PK = :pk',
        FilterExpression:
            '(begins_with(#status.#type, :statusTypeSubmitted) or begins_with(#status.#type, :statusTypeProcessing)) and provider = :provider',
        ExpressionAttributeNames: {
            '#status': 'status',
            '#type': 'type',
        },
        ExpressionAttributeValues: {
            ':pk': PK,
            ':statusTypeSubmitted': 'active:submitted',
            ':statusTypeProcessing': 'active:processing',
            ':provider': 'VIVA',
        },
    };

    return dynamoDb.call('query', params);
}

async function updateCaseWorkflow(caseKeys, workflow) {
    const TableName = config.cases.tableName;

    const params = {
        TableName,
        Key: caseKeys,
        UpdateExpression: 'SET details.workflow = :newWorkflow',
        ExpressionAttributeValues: { ':newWorkflow': workflow },
        ReturnValues: 'NONE',
    };

    return dynamoDb.call('update', params);
}
