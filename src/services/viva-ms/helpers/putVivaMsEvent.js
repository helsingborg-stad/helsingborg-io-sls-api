import { putEvent } from '../../../libs/awsEventBridge';

export const eventTypeCollection = {
    checkOpenPeriodSuccess: {
        source: 'vivaMs.personApplicationStatus',
        detailType: 'checkOpenPeriodSuccess',
    },
    personDetailSuccess: {
        source: 'vivaMs.personApplication',
        detailType: 'personDetailSuccess',
    },
    applicationReceivedSuccess: {
        source: 'vivaMs.submitApplication',
        detailType: 'applicationReceivedSuccess',
    },
    checkCompletionSuccess: {
        source: 'vivaMs.checkCompletion',
        detailType: 'checkCompletionSuccess',
    },
    decideCaseStatusSuccess: {
        source: 'vivaMs.decideCaseStatus',
        detailType: 'decideCaseStatusSuccess',
    },
    syncWorkflowSuccess: {
        source: 'vivaMs.syncWorkflow',
        detailType: 'syncWorkflowSuccess',
    },
    htmlGeneratedSuccess: {
        source: 'vivaMs.generateRecurringCaseHtml',
        detailType: 'htmlGeneratedSuccess',
    },
};

function putUserEvent(user, type, typeCollection = eventTypeCollection) {
    const { detailType, source } = typeCollection[type];
    return putEvent(user, detailType, source);
}

export default {
    checkOpenPeriodSuccess: (userDetail) => putUserEvent(userDetail, 'checkOpenPeriodSuccess'),
    personDetailSuccess: (userDetail) => putUserEvent(userDetail, 'personDetailSuccess'),
    applicationReceivedSuccess: (userDetail) => putUserEvent(userDetail, 'applicationReceivedSuccess'),
    checkCompletionSuccess: (userDetail) => putUserEvent(userDetail, 'checkCompletionSuccess'),
    decideCaseStatusSuccess: (userDetail) => putUserEvent(userDetail, 'decideCaseStatusSuccess'),
    syncWorkflowSuccess: (userDetail) => putUserEvent(userDetail, 'syncWorkflowSuccess'),
    htmlGeneratedSuccess: (userDetail) => putUserEvent(userDetail, 'htmlGeneratedSuccess'),
};
