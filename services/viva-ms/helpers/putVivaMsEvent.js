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
  checkCompletionsStatusRequired: {
    source: 'vivaMs.checkCompletionsStatus',
    detailType: 'checkCompletionsStatusRequired',
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
  applicationStatusSuccess: {
    source: 'vivaMs.applicationStatus',
    detailType: 'applicationStatusSuccess',
  },
};

function putUserEvent(detail, type, typeCollection = eventTypeCollection) {
  const { detailType, source } = typeCollection[type];
  return putEvent(detail, detailType, source);
}

export default {
  checkOpenPeriodSuccess: (detail) =>
    putUserEvent(detail, 'checkOpenPeriodSuccess'),
  personDetailSuccess: (detail) => putUserEvent(detail, 'personDetailSuccess'),
  applicationReceivedSuccess: (detail) =>
    putUserEvent(detail, 'applicationReceivedSuccess'),
  checkCompletionSuccess: (detail) =>
    putUserEvent(detail, 'checkCompletionSuccess'),
  checkCompletionsStatusRequired: (detail) =>
    putUserEvent(detail, 'checkCompletionsStatusRequired'),
  decideCaseStatusSuccess: (detail) =>
    putUserEvent(detail, 'decideCaseStatusSuccess'),
  syncWorkflowSuccess: (detail) => putUserEvent(detail, 'syncWorkflowSuccess'),
  htmlGeneratedSuccess: (detail) =>
    putUserEvent(detail, 'htmlGeneratedSuccess'),
  applicationStatusSuccess: (detail) =>
    putUserEvent(detail, 'applicationStatusSuccess'),
};
