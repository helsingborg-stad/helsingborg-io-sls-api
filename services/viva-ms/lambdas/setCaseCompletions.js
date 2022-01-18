import to from 'await-to-js';

import config from '../../../config';

import * as dynamoDb from '../../../libs/dynamoDb';
import params from '../../../libs/params';
import log from '../../../libs/logs';

import completionsHelper from '../helpers/completions';

export async function main(event, context) {
    const { personalNumber } = event.detail.user;

    const [getLatestWorkflowIdError, latestWorkflowId] = await to(
        completionsHelper.get.workflow.latest(personalNumber)
    );
    if (getLatestWorkflowIdError) {
        log.error(
            'Error getting the latest Viva workflow',
            context.awsRequestId,
            'service-viva-ms-setCaseCompletions-001',
            getLatestWorkflowIdError
        );
        return false;
    }

    const [getWorkflowCompletionsError, workflowCompletions] = await to(
        completionsHelper.get.workflow.completions(personalNumber, latestWorkflowId)
    );
    if (getWorkflowCompletionsError) {
        log.error(
            'Error getting Viva workflow completions',
            context.awsRequestId,
            'service-viva-ms-setCaseCompletions-002',
            getWorkflowCompletionsError
        );
        return false;
    }

    const [getCaseError, userCase] = await to(completionsHelper.get.caseOnWorkflowId(personalNumber, latestWorkflowId));
    if (getCaseError) {
        log.error(
            'Get case from cases table failed',
            context.awsRequestId,
            'service-viva-ms-setCaseCompletions-003',
            getCaseError
        );
        return false;
    }

    const [paramsReadError, vivaCaseSSMParams] = await to(params.read(config.cases.providers.viva.envsKeyName));
    if (paramsReadError) {
        log.error(
            'Read ssm params [config.cases.providers.viva.envsKeyName] failed',
            context.awsRequestId,
            'service-viva-ms-setCaseCompletions-004',
            paramsReadError
        );
        return false;
    }

    const caseKeys = {
        PK: userCase.PK,
        SK: userCase.SK,
    };
    const caseUpdateAttributes = {
        newStatus: completionsHelper.get.status(workflowCompletions),
        newState: completionsHelper.get.state(workflowCompletions),
        newCurrentFormId: completionsHelper.get.formId(vivaCaseSSMParams, workflowCompletions),
        newPersons: resetCasePersonsApplicantSignature(userCase),
        workflowCompletions,
    };
    const [updateCaseError, updatedCaseItem] = await to(updateCase(caseKeys, caseUpdateAttributes));
    if (updateCaseError) {
        log.error(
            'Update case completion attributes failed',
            context.awsRequestId,
            'service-viva-ms-setCaseCompletions-005',
            updateCaseError
        );
        return false;
    }

    log.info(
        'Successfully updated completion attributes on case',
        context.awsRequestId,
        'service-viva-ms-setCaseCompletions-006',
        updatedCaseItem
    );

    return true;
}

async function updateCase(keys, caseUpdateAttributes) {
    const { newStatus, newState, newCurrentFormId, newPersons, workflowCompletions } = caseUpdateAttributes;

    const updateParams = {
        TableName: config.cases.tableName,
        Key: {
            PK: keys.PK,
            SK: keys.SK,
        },
        UpdateExpression:
            'SET #currentFormId = :newCurrentFormId, #status = :newStatus, #persons = :newPersons, #state = :newState, details.completions = :workflowCompletions',
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
            ':workflowCompletions': workflowCompletions,
        },
        ReturnValues: 'UPDATED_NEW',
    };

    return dynamoDb.call('update', updateParams);
}

function resetCasePersonsApplicantSignature(caseItem) {
    const { persons = [] } = caseItem;
    return persons.map((person) => {
        if (person.role === 'applicant' && person.hasSigned) {
            person.hasSigned = false;
        }
        return person;
    });
}
